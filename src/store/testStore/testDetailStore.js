/**
 * Test detail store - handles fetching individual test data by ID
 * Manages state for current test, loading status, and error handling
 */

import { create } from "zustand";
import {
  fetchTestData,
  fetchPartsData,
  fetchOptionsData,
  fetchQuestionGroupsData,
  fetchQuestionsData,
  fetchTestDataNested,
} from "./utils/queryHelpers";
import { processQuestionGroup, processNestedQuestionGroup } from "./utils/questionTransformers";

// Development mode flag for conditional logging
const IS_DEV = process.env.NODE_ENV === 'development';

/**
 * Log a message only in development mode
 * @param {...any} args - Arguments to log
 */
const devLog = (...args) => {
  if (IS_DEV) {
    console.log(...args);
  }
};

/**
 * Log an error (always logged, even in production)
 * @param {...any} args - Arguments to log
 */
const devError = (...args) => {
  console.error(...args);
};

/**
 * Validate and normalize testId
 * @param {any} testId - The test ID to validate
 * @returns {string|number|null} - Normalized test ID or null if invalid
 */
const validateTestId = (testId) => {
  if (testId === null || testId === undefined) {
    return null;
  }
  
  if (typeof testId === 'string' && testId.trim().length > 0) {
    return testId.trim();
  }
  
  if (typeof testId === 'number' && !isNaN(testId) && isFinite(testId)) {
    return testId;
  }
  
  if (typeof testId === 'string') {
    const num = Number(testId);
    if (!isNaN(num) && isFinite(num)) {
      return num;
    }
  }
  
  return null;
};

/**
 * Zustand store for managing test detail state
 */
export const useTestDetailStore = create((set, get) => ({
  currentTest: null,
  loadingTest: false,
  error: null,
  // Track ongoing fetch operations to prevent race conditions
  _fetchAbortController: null,
  _fetchPromise: null,

  /**
   * Fetch test by ID with comprehensive error handling and race condition prevention
   * @param {string|number} testId - Test ID to fetch
   * @param {boolean} [forceRefresh=false] - Force refresh even if test is already loaded
   * @param {boolean} [includeCorrectAnswers=false] - Include correct answers and explanations (for review mode)
   * @param {string} [userSubscriptionStatus="free"] - User's subscription status
   * @param {boolean} [bypassPremiumCheck=false] - Bypass premium access check
   * @returns {Promise<Object|null>} - Complete test object or null if aborted
   * @throws {Error} - If fetch fails or test is not found
   */
  fetchTestById: async (testId, forceRefresh = false, includeCorrectAnswers = false, userSubscriptionStatus = "free", bypassPremiumCheck = false) => {
    devLog('[fetchTestById] Called with:', { testId, testIdType: typeof testId, forceRefresh, includeCorrectAnswers, userSubscriptionStatus, bypassPremiumCheck });

    // Validate testId parameter
    const normalizedId = validateTestId(testId);
    if (!normalizedId) {
      const errorMessage = `Invalid testId: ${testId}. Expected a valid string or number.`;
      devError('[fetchTestById] Validation Error:', errorMessage);
      set({
        error: errorMessage,
        loadingTest: false,
        currentTest: null
      });
      throw new Error(errorMessage);
    }

    const currentState = get();

    // Prevent concurrent fetches for the same test (unless forceRefresh)
    // Allow refetch even if loadingTest=true
    if (
      currentState.loadingTest &&
      !forceRefresh &&
      currentState.currentTest?.id === normalizedId &&
      currentState._fetchPromise
    ) {
      devLog('[fetchTestById] Fetch already in progress for test:', normalizedId);
      return currentState._fetchPromise;
    }

    // Abort previous fetch if it exists and we're fetching a different test
    if (currentState._fetchAbortController && currentState.currentTest?.id !== normalizedId) {
      devLog('[fetchTestById] Aborting previous fetch for different test');
      currentState._fetchAbortController.abort();
    }

    // Create new abort controller for this fetch
    const abortController = new AbortController();
    const signal = abortController.signal;

    // Clear previous test data when fetching a new one
    devLog('[fetchTestById] Setting loading state and starting fetch...');
    set({ 
      loadingTest: true, 
      error: null,
      _fetchAbortController: abortController,
      _fetchPromise: null
    });

    // Create fetch promise
    const fetchPromise = (async () => {
      try {
        // Use new nested query approach
        devLog('[fetchTestById] Using nested query approach...');
        const nestedTestData = await fetchTestDataNested(normalizedId, includeCorrectAnswers, undefined, signal);

        // Check if aborted
        if (signal.aborted) {
          devLog('[fetchTestById] Fetch aborted');
          return null;
        }

        if (!nestedTestData) {
          throw new Error(`Test with ID ${normalizedId} not found or not active.`);
        }

        // Check premium access before proceeding (skip if bypassPremiumCheck is true)
        if (!bypassPremiumCheck && nestedTestData.is_premium && userSubscriptionStatus !== "premium") {
          const errorMessage = "This test requires a premium subscription";
          devError('[fetchTestById] Premium access denied:', { testId: normalizedId, userSubscriptionStatus });
          set({
            error: errorMessage,
            loadingTest: false,
            currentTest: null,
            _fetchAbortController: null,
            _fetchPromise: null
          });
          throw new Error(errorMessage);
        }

        // Check if aborted after premium check
        if (signal.aborted) {
          devLog('[fetchTestById] Fetch aborted after premium check');
          return null;
        }

        // Handle case where no parts exist
        if (!nestedTestData.part || nestedTestData.part.length === 0) {
          devLog('[fetchTestById] No parts found for test:', normalizedId);
          const completeTest = { ...nestedTestData, parts: [] };
          set({ 
            currentTest: completeTest, 
            loadingTest: false, 
            error: null,
            _fetchAbortController: null,
            _fetchPromise: null
          });
          return completeTest;
        }

        devLog('[fetchTestById] Processing nested data structure...', {
          partsCount: nestedTestData.part?.length || 0
        });

        // Process nested structure: part -> question -> questions -> options
        // Ensure parts are sorted by part_number
        const sortedParts = [...nestedTestData.part].sort((a, b) => {
          const aNum = a.part_number ?? 0;
          const bNum = b.part_number ?? 0;
          return aNum - bNum;
        });

        const partsWithQuestionGroups = sortedParts.map((part) => {
          // Process question groups (question array) for this part
          const partQuestionGroups = (part.question || [])
            .map((questionGroup) => {
              // Process the nested question group with its nested questions and options
              return processNestedQuestionGroup(questionGroup);
            })
            // Sort question groups by their first child's question_number
            .sort((a, b) => {
              const aFirst = a.questions?.[0]?.question_number ?? Number.MAX_SAFE_INTEGER;
              const bFirst = b.questions?.[0]?.question_number ?? Number.MAX_SAFE_INTEGER;
              return aFirst - bFirst;
            });

          // Ensure questions within each group are sorted
          partQuestionGroups.forEach(group => {
            if (group.questions && Array.isArray(group.questions)) {
              group.questions = group.questions.sort((a, b) => {
                const aNum = a.question_number ?? 0;
                const bNum = b.question_number ?? 0;
                return aNum - bNum;
              });
            }
          });

          // Flatten all individual questions for easy access, sorted by question_number
          const allQuestions = partQuestionGroups
            .flatMap((qg) => qg.questions || [])
            .sort((a, b) => {
              const aNum = a.question_number ?? 0;
              const bNum = b.question_number ?? 0;
              return aNum - bNum;
            });

          return {
            id: part.id,
            test_id: part.test_id,
            part_number: part.part_number,
            title: part.title,
            content: part.content, // For reading tests
            image_url: part.image_url,
            listening_url: part.listening_url, // For listening tests
            questionGroups: partQuestionGroups,
            questions: allQuestions,
          };
        });

        // Check if aborted during processing
        if (signal.aborted) {
          devLog('[fetchTestById] Fetch aborted during processing');
          return null;
        }

        const completeTest = {
          id: nestedTestData.id,
          title: nestedTestData.title,
          type: nestedTestData.type,
          difficulty: nestedTestData.difficulty,
          duration: nestedTestData.duration,
          question_quantity: nestedTestData.question_quantity,
          is_premium: nestedTestData.is_premium,
          is_active: nestedTestData.is_active,
          created_at: nestedTestData.created_at,
          parts: partsWithQuestionGroups,
        };

        // Only update state if not aborted
        if (!signal.aborted) {
          set({
            currentTest: completeTest,
            loadingTest: false,
            error: null,
            _fetchAbortController: null,
            _fetchPromise: null
          });
        }

        return completeTest;
      } catch (error) {
        // Handle AbortError (cancelled requests)
        if (error.name === "AbortError" || signal.aborted || error.message?.includes('aborted')) {
          devLog('[fetchTestById] Request aborted:', normalizedId);
          set({ 
            loadingTest: false, 
            currentTest: null,
            _fetchAbortController: null,
            _fetchPromise: null
          });
          return null;
        }

        // Handle timeout errors
        if (error.message?.includes('timeout')) {
          devError('[fetchTestById] Network Timeout:', {
            testId: normalizedId,
            error: error.message,
            suggestion: 'Check network connection or increase timeout duration'
          });
        } else {
          devError('[fetchTestById] Error fetching test by ID:', {
            testId: normalizedId,
            errorName: error.name,
            errorMessage: error.message,
            errorStack: error.stack,
            errorCode: error.code,
            suggestion: 'Verify test ID exists, check RLS policies, and ensure Supabase connection is active'
          });
        }

        // Set error state only if not aborted
        if (!signal.aborted) {
          set({
            error: error.message || 'Failed to fetch test. Please check your connection and try again.',
            currentTest: null,
            loadingTest: false,
            _fetchAbortController: null,
            _fetchPromise: null
          });
        }

        throw error;
      } finally {
        // CRUCIAL: Always set loading to false to prevent infinite loading states
        // Only if this is still the current fetch (not aborted or replaced)
        const currentState = get();
        if (currentState._fetchAbortController === abortController) {
          set({ loadingTest: false });
        }
      }
    })();

    // Store the promise so concurrent calls can await it
    set({ _fetchPromise: fetchPromise });

    return fetchPromise;
  },

  /**
   * Clear current test data
   * @param {boolean} [clearTestList=false] - Whether to also clear test list data
   */
  clearCurrentTest: (clearTestList = false) => {
    // Abort any ongoing fetch
    const currentState = get();
    if (currentState._fetchAbortController) {
      currentState._fetchAbortController.abort();
    }

    if (clearTestList) {
      // Clear both currentTest and test list data to force refetch
      set({
        currentTest: null,
        loadingTest: false,
        error: null,
        _fetchAbortController: null,
        _fetchPromise: null
      });
    } else {
      set({
        currentTest: null,
        loadingTest: false,
        error: null,
        _fetchAbortController: null,
        _fetchPromise: null
      });
    }
  },
}));
