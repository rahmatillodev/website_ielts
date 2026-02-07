/**
 * Writing Task Type Store - Fetches and caches task types for writings
 * This store handles fetching task types from the writing_tasks table
 * and mapping them to writings for filtering
 */

import { create } from "zustand";
import supabase from "@/lib/supabase";

const DEFAULT_TIMEOUT_MS = 10000;

export const useWritingTaskTypeStore = create((set, get) => ({
  // Cache: writing_id -> Set of task types
  writingTaskTypes: {},
  loading: false,
  error: null,

  /**
   * Fetch task types for a list of writing IDs
   * @param {string[]} writingIds - Array of writing IDs
   * @returns {Promise<Object>} - Map of writing_id -> Set of task types
   */
  fetchTaskTypesForWritings: async (writingIds) => {
    if (!writingIds || writingIds.length === 0) {
      return {};
    }

    const currentState = get();
    
    // Filter out writing IDs we already have cached
    const uncachedIds = writingIds.filter(id => !currentState.writingTaskTypes[id]);
    
    if (uncachedIds.length === 0) {
      // All writing IDs are cached, return cached data
      const result = {};
      writingIds.forEach(id => {
        if (currentState.writingTaskTypes[id]) {
          result[id] = currentState.writingTaskTypes[id];
        }
      });
      return result;
    }

    set({ loading: true, error: null });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Request timeout after ${DEFAULT_TIMEOUT_MS}ms`)), DEFAULT_TIMEOUT_MS);
    });

    try {
      // Fetch distinct task types for the writings
      const queryPromise = supabase
        .from("writing_tasks")
        .select("writing_id, task_type")
        .in("writing_id", uncachedIds)
        .not("task_type", "is", null);

      const { data, error } = await Promise.race([
        queryPromise,
        timeoutPromise
      ]);

      if (error) {
        console.error('[writingTaskTypeStore] Error fetching task types:', {
          error: error.message,
          code: error.code,
          writingIds: uncachedIds
        });
        
        if (error.code === 'PGRST116' || error.message?.includes('permission') || error.message?.includes('policy')) {
          const rlsError = `RLS Policy Denial: Check Row Level Security policies for 'writing_tasks' table. Error: ${error.message}`;
          console.error('[writingTaskTypeStore] RLS Policy Issue:', rlsError);
          throw new Error(rlsError);
        }
        
        throw error;
      }

      // Process the data: group by writing_id and collect task types
      const taskTypesMap = {};

      if (Array.isArray(data)) {
        data.forEach((row) => {
          if (!row.writing_id || !row.task_type) return;
          
          if (!taskTypesMap[row.writing_id]) {
            taskTypesMap[row.writing_id] = new Set();
          }
          taskTypesMap[row.writing_id].add(row.task_type);
        });
      }

      // Update cache
      const updatedCache = { ...currentState.writingTaskTypes, ...taskTypesMap };
      
      set({
        writingTaskTypes: updatedCache,
        loading: false,
        error: null,
      });

      // Return all requested writing IDs (cached + newly fetched)
      const result = {};
      writingIds.forEach(id => {
        if (updatedCache[id]) {
          result[id] = updatedCache[id];
        }
      });

      return result;
    } catch (error) {
      console.error('[writingTaskTypeStore] Error in fetchTaskTypesForWritings:', {
        errorName: error.name,
        errorMessage: error.message,
        writingIds: uncachedIds
      });

      set({
        error: error.message || 'Failed to fetch task types',
        loading: false,
      });

      // Return cached data for writing IDs we have, empty sets for others
      const result = {};
      writingIds.forEach(id => {
        if (currentState.writingTaskTypes[id]) {
          result[id] = currentState.writingTaskTypes[id];
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
    set({ writingTaskTypes: {} });
  },

  /**
   * Get task types for a single writing (from cache)
   * @param {string} writingId - Writing ID
   * @returns {Set|null} - Set of task types or null if not cached
   */
  getTaskTypes: (writingId) => {
    const state = get();
    return state.writingTaskTypes[writingId] || null;
  },
}));

