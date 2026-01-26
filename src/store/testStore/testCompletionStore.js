/**
 * Test completion store - handles test completion status tracking
 */

import { create } from "zustand";

export const useTestCompletionStore = create((set, get) => ({
  // test_completed: Map of testId -> { isCompleted, attempt }
  test_completed: {},

  // Set test completion status for a specific test
  setTestCompleted: (testId, completionData) => {
    const currentCompleted = get().test_completed || {};
    set({
      test_completed: {
        ...currentCompleted,
        [testId]: completionData,
      },
    });
  },

  // Get test completion status for a specific test
  getTestCompleted: (testId) => {
    const test_completed = get().test_completed || {};
    return test_completed[testId] || null;
  },

  // Clear test completion status for a specific test
  clearTestCompleted: (testId) => {
    const currentCompleted = get().test_completed || {};
    const updated = { ...currentCompleted };
    delete updated[testId];
    set({ test_completed: updated });
  },

  // Clear all test completion statuses
  clearAllTestCompleted: () => {
    set({ test_completed: {} });
  },
}));

