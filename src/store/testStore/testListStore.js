/**
 * Test list store - handles fetching and managing test lists
 */

import { create } from "zustand";
import supabase from "@/lib/supabase";
import { useQuestionTypeStore } from "./questionTypeStore";

const DEFAULT_TIMEOUT_MS = 15000;

export const useTestListStore = create((set, get) => ({
  test_reading: [],
  test_listening: [],
  loading: false,
  error: null,
  loaded: false,

  fetchTests: async (forceRefresh = false) => {
    const currentState = get();
    
    // Allow refetch if data is empty even if loaded is true
    const hasData = (currentState.test_reading?.length > 0 || currentState.test_listening?.length > 0);
    
    // Return early only if already loaded with data AND not currently loading AND not forcing refresh
    if (currentState.loaded && hasData && !currentState.loading && !forceRefresh) {
      return {
        test_reading: currentState.test_reading || [],
        test_listening: currentState.test_listening || [],
        loaded: currentState.loaded,
      };
    }

    // If loading is stuck, return current data if available
    if (currentState.loading && hasData && !forceRefresh) {
      return {
        test_reading: currentState.test_reading || [],
        test_listening: currentState.test_listening || [],
        loaded: currentState.loaded,
      };
    }

    set({ loading: true, error: null });

    // Timeout mechanism: 15 seconds max
    const timeoutMs = DEFAULT_TIMEOUT_MS;
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs);
    });

    try {
      const testsQueryPromise = supabase
        .from("test")
        .select("id, title, type, difficulty, duration, question_quantity, is_premium, is_active, created_at")
        .eq("is_active", true)
        .order("created_at", { ascending: true });
      const { data, error } = await Promise.race([
        testsQueryPromise,
        timeoutPromise
      ]);

      // Explicit error check immediately after query
      if (error) {
        console.error('[fetchTests] Supabase Error (test table):', {
          table: 'test',
          filter: 'is_active = true',
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        
        // Check for RLS policy denial
        if (error.code === 'PGRST116' || error.message?.includes('permission') || error.message?.includes('policy')) {
          const rlsError = `RLS Policy Denial: Check Row Level Security policies for 'test' table. Error: ${error.message}`;
          console.error('[fetchTests] RLS Policy Issue:', rlsError);
          throw new Error(rlsError);
        }
        
        throw error;
      }

      // Ensure data is an array before filtering
      const tests = Array.isArray(data) ? data : [];
      
      // Handle case where query returns null/undefined (no data found)
      if (!tests || tests.length === 0) {
        console.warn('[fetchTests] No active tests found. This may be normal if no tests are marked as active, or check RLS policies.');
      }

      const filtered_data_reading = tests.filter(
        (test) => test.type === "reading"
      );
      const filtered_data_listening = tests.filter(
        (test) => test.type === "listening"
      );

      // Fetch question types for all tests
      const allTestIds = tests.map(test => test.id);
      let questionTypesMap = {};
      
      try {
        questionTypesMap = await useQuestionTypeStore.getState().fetchQuestionTypesForTests(allTestIds);
      } catch (error) {
        console.warn('[testListStore] Error fetching question types, continuing without them:', error);
        // Continue without question types - tests will still work
      }

      // Enrich tests with question types
      const enriched_reading = filtered_data_reading.map(test => ({
        ...test,
        question_types: questionTypesMap[test.id] || new Set(),
      }));

      const enriched_listening = filtered_data_listening.map(test => ({
        ...test,
        question_types: questionTypesMap[test.id] || new Set(),
      }));

      // IMPORTANT: Set loaded to true even if arrays are empty
      // Empty arrays are a valid state (e.g., no listening tests exist)
      // This prevents infinite loading states in the UI
      set({
        test_reading: enriched_reading,
        test_listening: enriched_listening,
        loaded: true, // Always set to true after successful fetch, even with empty data
        error: null,
      });

      return {
        test_reading: enriched_reading,
        test_listening: enriched_listening,
      };
    } catch (error) {
      // Handle AbortError (cancelled requests)
      if (error.name === "AbortError") {
        console.warn('[fetchTests] Request aborted');
        set({ loading: false });
        return {
          test_reading: currentState.test_reading || [],
          test_listening: currentState.test_listening || [],
          loaded: currentState.loaded,
        };
      }

      // Handle timeout errors
      if (error.message?.includes('timeout')) {
        console.error('[fetchTests] Network Timeout:', {
          error: error.message,
          suggestion: 'Check network connection or increase timeout duration'
        });
      } else {
        console.error('[fetchTests] Error fetching tests:', {
          errorName: error.name,
          errorMessage: error.message,
          errorStack: error.stack,
          errorCode: error.code,
          suggestion: 'Check RLS policies for "test" table and ensure Supabase connection is active'
        });
      }

      // Reset loaded flag on error to allow retry
      set({ 
        error: error.message || 'Failed to fetch tests. Please check your connection and try again.',
        loaded: false,
        loading: false, // Ensure loading is false on error
      });
      
      throw error;
    } finally {
      // CRUCIAL: Always set loading to false to prevent infinite loading states
      // This ensures loading is false even if data is empty (which is a valid state)
      // The loaded flag is already set appropriately in the try block
      set({ loading: false });
    }
  },
}));

