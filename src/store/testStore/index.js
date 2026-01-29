/**
 * Main test store - combines all test-related stores
 * Maintains backward compatibility with original testStore API
 */

import { create } from "zustand";
import { useTestListStore } from "./testListStore";
import { useTestDetailStore } from "./testDetailStore";
import { useTestCompletionStore } from "./testCompletionStore";

/**
 * Combined test store that merges all test-related functionality
 * This maintains backward compatibility with the original testStore API
 * 
 * Note: This store acts as a proxy to the individual stores, ensuring
 * all state changes are properly synchronized.
 */
export const useTestStore = create((set, get) => {
  // Initialize state from individual stores
  const syncState = () => {
    const listState = useTestListStore.getState();
    const detailState = useTestDetailStore.getState();
    const completionState = useTestCompletionStore.getState();

    
    console.log('listState', listState);
    return {
      test_reading: listState.test_reading,
      test_listening: listState.test_listening,
      loading: listState.loading,
      loaded: listState.loaded,
      currentTest: detailState.currentTest,
      loadingTest: detailState.loadingTest,
      test_completed: completionState.test_completed,
      error: detailState.error || listState.error,
    };
  };

  return {
    ...syncState(),

    // Actions from test list store
    fetchTests: async (forceRefresh = false) => {
      const result = await useTestListStore.getState().fetchTests(forceRefresh);
      set(syncState());
      return result;
    },

    // Actions from test detail store
    fetchTestById: async (testId, forceRefresh = false, includeCorrectAnswers = false, userSubscriptionStatus = "free") => {
      const result = await useTestDetailStore.getState().fetchTestById(testId, forceRefresh, includeCorrectAnswers, userSubscriptionStatus);
      set(syncState());
      return result;
    },

    clearCurrentTest: (clearTestList = false) => {
      useTestDetailStore.getState().clearCurrentTest(clearTestList);
      
      if (clearTestList) {
        // Also clear test list data
        useTestListStore.setState({
          test_reading: [],
          test_listening: [],
          loaded: false,
        });
      }
      
      set(syncState());
    },

    // Actions from completion store
    setTestCompleted: (testId, completionData) => {
      useTestCompletionStore.getState().setTestCompleted(testId, completionData);
      set(syncState());
    },

    getTestCompleted: (testId) => {
      return useTestCompletionStore.getState().getTestCompleted(testId);
    },

    clearTestCompleted: (testId) => {
      useTestCompletionStore.getState().clearTestCompleted(testId);
      set(syncState());
    },

    clearAllTestCompleted: () => {
      useTestCompletionStore.getState().clearAllTestCompleted();
      set(syncState());
    },

    // Reset the store state (useful for debugging or when switching contexts)
    resetStore: () => {
      useTestListStore.setState({
        test_reading: [],
        test_listening: [],
        loading: false,
        loaded: false,
        error: null,
      });
      useTestDetailStore.setState({
        currentTest: null,
        loadingTest: false,
        error: null,
      });
      useTestCompletionStore.setState({
        test_completed: {},
      });
      set(syncState());
    },
  };
});

// Subscribe to store changes to keep combined store in sync
useTestListStore.subscribe(() => {
  const listState = useTestListStore.getState();
  const detailState = useTestDetailStore.getState();
  useTestStore.setState({
    test_reading: listState.test_reading,
    test_listening: listState.test_listening,
    loading: listState.loading,
    loaded: listState.loaded,
    error: listState.error || detailState.error,
  });
});

useTestDetailStore.subscribe(() => {
  const listState = useTestListStore.getState();
  const detailState = useTestDetailStore.getState();
  useTestStore.setState({
    currentTest: detailState.currentTest,
    loadingTest: detailState.loadingTest,
    error: detailState.error || listState.error,
  });
});

useTestCompletionStore.subscribe(() => {
  const completionState = useTestCompletionStore.getState();
  useTestStore.setState({
    test_completed: completionState.test_completed,
  });
});

