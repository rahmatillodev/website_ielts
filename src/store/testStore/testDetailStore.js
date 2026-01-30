/**
 * Test detail store - handles fetching individual test data by ID
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

export const useTestDetailStore = create((set, get) => ({
  currentTest: null,
  loadingTest: false,
  error: null,

  fetchTestById: async (testId, forceRefresh = false, includeCorrectAnswers = false, userSubscriptionStatus = "free", bypassPremiumCheck = false) => {
    console.log('[fetchTestById] Called with:', { testId, testIdType: typeof testId, forceRefresh, includeCorrectAnswers, userSubscriptionStatus, bypassPremiumCheck });
    
    // GUARD CLAUSE: Validate testId parameter
    if (!testId || (typeof testId !== 'string' && typeof testId !== 'number')) {
      const errorMessage = `Invalid testId: ${testId}. Expected a valid string or number.`;
      console.error('[fetchTestById] Validation Error:', errorMessage);
      set({ 
        error: errorMessage, 
        loadingTest: false, 
        currentTest: null 
      });
      throw new Error(errorMessage);
    }

    const currentState = get();
    
    // Prevent concurrent fetches for the same test
    if (currentState.loadingTest && !forceRefresh) {
      // If already loading and we have data, return it
      if (currentState.currentTest && currentState.currentTest.id === testId) {
        console.log('[fetchTestById] Already have data for this test, returning cached data');
        return currentState.currentTest;
      }
      // Otherwise wait for current fetch to complete
      console.warn('[fetchTestById] Already loading, skipping duplicate request');
      return null;
    }

    // Clear previous test data when fetching a new one
    console.log('[fetchTestById] Setting loading state and starting fetch...');
    set({ loadingTest: true, error: null, currentTest: null });

    try {
      // Use new nested query approach
      console.log('[fetchTestById] Using nested query approach...');
      const nestedTestData = await fetchTestDataNested(testId, includeCorrectAnswers);
      
      if (!nestedTestData) {
        throw new Error(`Test with ID ${testId} not found or not active.`);
      }

      // Check premium access before proceeding (skip if bypassPremiumCheck is true)
      if (!bypassPremiumCheck && nestedTestData.is_premium && userSubscriptionStatus !== "premium") {
        const errorMessage = "This test requires a premium subscription";
        console.error('[fetchTestById] Premium access denied:', { testId, userSubscriptionStatus });
        set({ 
          error: errorMessage, 
          loadingTest: false, 
          currentTest: null 
        });
        throw new Error(errorMessage);
      }

      // Handle case where no parts exist
      if (!nestedTestData.part || nestedTestData.part.length === 0) {
        console.warn('[fetchTestById] No parts found for test:', testId);
        const completeTest = { ...nestedTestData, parts: [] };
        set({ currentTest: completeTest, loadingTest: false, error: null });
        return completeTest;
      }

      console.log('[fetchTestById] Processing nested data structure...', { 
        partsCount: nestedTestData.part?.length || 0 
      });

      // Process nested structure: part -> question -> questions -> options
      const partsWithQuestionGroups = nestedTestData.part.map((part) => {
        // Process question groups (question array) for this part
        const partQuestionGroups = (part.question || [])
          .map((questionGroup) => {
            // Process the nested question group with its nested questions and options
            return processNestedQuestionGroup(questionGroup);
          })
          // Sort question groups by their first child's question_number
          .sort((a, b) => {
            const aFirst = a.questions?.[0]?.question_number ?? 0;
            const bFirst = b.questions?.[0]?.question_number ?? 0;
            return aFirst - bFirst;
          });

        return {
          id: part.id,
          test_id: part.test_id,
          part_number: part.part_number,
          title: part.title,
          content: part.content,
          image_url: part.image_url,
          listening_url: part.listening_url,
          questionGroups: partQuestionGroups,
          // Flatten all individual questions for easy access, sorted by question_number
          questions: partQuestionGroups
            .flatMap((qg) => qg.questions || [])
            .sort((a, b) => {
              const aNum = a.question_number ?? 0;
              const bNum = b.question_number ?? 0;
              return aNum - bNum;
            }),
        };
      });

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

      set({
        currentTest: completeTest,
        loadingTest: false,
        error: null,
      });

      return completeTest;
    } catch (error) {
      // Handle AbortError (cancelled requests)
      if (error.name === "AbortError") {
        console.warn('[fetchTestById] Request aborted:', testId);
        set({ loadingTest: false, currentTest: null });
        return null;
      }

      // Handle timeout errors
      if (error.message?.includes('timeout')) {
        console.error('[fetchTestById] Network Timeout:', {
          testId,
          error: error.message,
          suggestion: 'Check network connection or increase timeout duration'
        });
      } else {
        console.error('[fetchTestById] Error fetching test by ID:', {
          testId,
          errorName: error.name,
          errorMessage: error.message,
          errorStack: error.stack,
          errorCode: error.code,
          suggestion: 'Verify test ID exists, check RLS policies, and ensure Supabase connection is active'
        });
      }

      // Set error state
      set({ 
        error: error.message || 'Failed to fetch test. Please check your connection and try again.',
        currentTest: null
      });
      
      throw error;
    } finally {
      // CRUCIAL: Always set loading to false to prevent infinite loading states
      set({ loadingTest: false });
    }
  },

  clearCurrentTest: (clearTestList = false) => {
    if (clearTestList) {
      // Clear both currentTest and test list data to force refetch
      set({ 
        currentTest: null,
        loadingTest: false,
        error: null
      });
    } else {
      set({ 
        currentTest: null,
        loadingTest: false,
        error: null
      });
    }
  },
}));

