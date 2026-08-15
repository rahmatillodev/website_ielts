/**
 * Question Type Store - Fetches and caches question types for tests
 * This store handles fetching question types from the question table
 * and mapping them to the 7 grouped types for filtering
 */

import { create } from "zustand";
import supabase from "@/lib/supabase";
import { requestTimeoutSignal, isAbortLikeError } from "@/lib/requestTimeout";
import { mapQuestionTypeToGroup } from "./utils/questionTypeUtils";

const REQUEST_TIMEOUT_MS = 15000;

/**
 * Test ids per request. All 213 active tests in one `in.(...)` filter puts a
 * ~8.4 KB URL on the wire, which is at the edge of what the Supabase gateway
 * accepts; batches of 100 keep it comfortably under 4 KB.
 */
const ID_BATCH_SIZE = 100;

const chunk = (items, size) => {
  const batches = [];
  for (let i = 0; i < items.length; i += size) batches.push(items.slice(i, i + size));
  return batches;
};

/** One shared request per distinct id set, so parallel callers cannot duplicate it. */
let inflightByKey = new Map();

export const useQuestionTypeStore = create((set, get) => ({
  // Cache: test_id -> Set of grouped question types
  testQuestionTypes: {},
  loading: false,
  error: null,

  /**
   * Fetch question types for a list of test IDs
   * @param {string[]} testIds - Array of test IDs
   * @returns {Promise<Object>} - Map of test_id -> Set of grouped question types
   */
  fetchQuestionTypesForTests: async (testIds) => {
    if (!testIds || testIds.length === 0) {
      return {};
    }

    const currentState = get();
    
    // Filter out test IDs we already have cached
    const uncachedIds = testIds.filter(id => !currentState.testQuestionTypes[id]);
    
    if (uncachedIds.length === 0) {
      // All test IDs are cached, return cached data
      const result = {};
      testIds.forEach(id => {
        if (currentState.testQuestionTypes[id]) {
          result[id] = currentState.testQuestionTypes[id];
        }
      });
      return result;
    }

    const inflightKey = uncachedIds.join(",");
    const alreadyRunning = inflightByKey.get(inflightKey);
    if (alreadyRunning) return alreadyRunning;

    const request = (async () => {
    set({ loading: true, error: null });

    try {
      // Fetch distinct question types for the tests, in batches small enough
      // to keep the request URL well inside the gateway's limit.
      const batches = await Promise.all(
        chunk(uncachedIds, ID_BATCH_SIZE).map(async (ids) => {
          const { data, error } = await supabase
            .from("question")
            .select("test_id, type")
            .in("test_id", ids)
            .abortSignal(requestTimeoutSignal(REQUEST_TIMEOUT_MS));

          if (error) {
            console.error('[questionTypeStore] Error fetching question types:', {
              error: error.message,
              code: error.code,
              batchSize: ids.length
            });

            if (error.code === 'PGRST116' || error.message?.includes('permission') || error.message?.includes('policy')) {
              throw new Error(`RLS Policy Denial: Check Row Level Security policies for 'question' table. Error: ${error.message}`);
            }

            throw error;
          }

          return Array.isArray(data) ? data : [];
        })
      );

      const data = batches.flat();

      // Process the data: group by test_id and map to grouped types
      const questionTypesMap = {};
      const groupedTypesMap = {};

      // First, collect all question types per test
      data.forEach((row) => {
        if (!row.test_id || !row.type) return;

        if (!questionTypesMap[row.test_id]) {
          questionTypesMap[row.test_id] = new Set();
        }
        questionTypesMap[row.test_id].add(row.type);
      });

      // Then, map to grouped types
      Object.keys(questionTypesMap).forEach((testId) => {
        const types = questionTypesMap[testId];
        const groupedTypes = new Set();
        
        types.forEach((type) => {
          const groupedType = mapQuestionTypeToGroup(type);
          if (groupedType) {
            groupedTypes.add(groupedType);
          }
        });
        
        groupedTypesMap[testId] = groupedTypes;
      });

      // Update cache (re-read: another batch may have landed while we waited)
      const updatedCache = { ...get().testQuestionTypes, ...groupedTypesMap };

      set({
        testQuestionTypes: updatedCache,
        loading: false,
        error: null,
      });

      // Return all requested test IDs (cached + newly fetched)
      const result = {};
      testIds.forEach(id => {
        if (updatedCache[id]) {
          result[id] = updatedCache[id];
        }
      });

      return result;
    } catch (error) {
      console.error('[questionTypeStore] Error in fetchQuestionTypesForTests:', {
        errorName: error.name,
        errorMessage: error.message,
        timedOut: isAbortLikeError(error),
        testCount: uncachedIds.length
      });

      set({
        error: error.message || 'Failed to fetch question types',
        loading: false,
      });

      // Never rejects: question types only feed an optional filter, so the
      // caller gets whatever is cached and empty sets for the rest.
      const cached = get().testQuestionTypes;
      const result = {};
      testIds.forEach(id => {
        result[id] = cached[id] || new Set();
      });

      return result;
    }
    })();

    inflightByKey.set(inflightKey, request);
    try {
      return await request;
    } finally {
      inflightByKey.delete(inflightKey);
    }
  },

  /**
   * Clear the cache (useful for testing or when data might be stale)
   */
  clearCache: () => {
    set({ testQuestionTypes: {} });
  },

  /**
   * Get question types for a single test (from cache)
   * @param {string} testId - Test ID
   * @returns {Set|null} - Set of grouped question types or null if not cached
   */
  getQuestionTypes: (testId) => {
    const state = get();
    return state.testQuestionTypes[testId] || null;
  },
}));

