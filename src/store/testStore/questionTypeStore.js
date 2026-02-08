/**
 * Question Type Store - Fetches and caches question types for tests
 * This store handles fetching question types from the question table
 * and mapping them to the 7 grouped types for filtering
 */

import { create } from "zustand";
import supabase from "@/lib/supabase";
import { mapQuestionTypeToGroup } from "./utils/questionTypeUtils";

const DEFAULT_TIMEOUT_MS = 10000;

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

    set({ loading: true, error: null });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Request timeout after ${DEFAULT_TIMEOUT_MS}ms`)), DEFAULT_TIMEOUT_MS);
    });

    try {
      // Fetch distinct question types for the tests
      const queryPromise = supabase
        .from("question")
        .select("test_id, type")
        .in("test_id", uncachedIds);

      const { data, error } = await Promise.race([
        queryPromise,
        timeoutPromise
      ]);

      if (error) {
        console.error('[questionTypeStore] Error fetching question types:', {
          error: error.message,
          code: error.code,
          testIds: uncachedIds
        });
        
        if (error.code === 'PGRST116' || error.message?.includes('permission') || error.message?.includes('policy')) {
          const rlsError = `RLS Policy Denial: Check Row Level Security policies for 'question' table. Error: ${error.message}`;
          console.error('[questionTypeStore] RLS Policy Issue:', rlsError);
          throw new Error(rlsError);
        }
        
        throw error;
      }

      // Process the data: group by test_id and map to grouped types
      const questionTypesMap = {};
      const groupedTypesMap = {};

      // First, collect all question types per test
      if (Array.isArray(data)) {
        data.forEach((row) => {
          if (!row.test_id || !row.type) return;
          
          if (!questionTypesMap[row.test_id]) {
            questionTypesMap[row.test_id] = new Set();
          }
          questionTypesMap[row.test_id].add(row.type);
        });
      }

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

      // Update cache
      const updatedCache = { ...currentState.testQuestionTypes, ...groupedTypesMap };
      
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
        testIds: uncachedIds
      });

      set({
        error: error.message || 'Failed to fetch question types',
        loading: false,
      });

      // Return cached data for test IDs we have, empty sets for others
      const result = {};
      testIds.forEach(id => {
        if (currentState.testQuestionTypes[id]) {
          result[id] = currentState.testQuestionTypes[id];
        } else {
          result[id] = new Set();
        }
      });

      return result;
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

