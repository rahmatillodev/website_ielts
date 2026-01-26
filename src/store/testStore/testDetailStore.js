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
} from "./utils/queryHelpers";
import { processQuestionGroup } from "./utils/questionTransformers";

export const useTestDetailStore = create((set, get) => ({
  currentTest: null,
  loadingTest: false,
  error: null,

  fetchTestById: async (testId, forceRefresh = false) => {
    console.log('[fetchTestById] Called with:', { testId, testIdType: typeof testId, forceRefresh });
    
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
      console.log('[fetchTestById] Starting parallel fetch of test, parts, and options...');
      // Fetch test, parts, and options in parallel (they don't depend on each other)
      const [testData, partsData, allOptions] = await Promise.all([
        fetchTestData(testId),
        fetchPartsData(testId),
        fetchOptionsData(testId),
      ]);
      console.log('[fetchTestById] Initial fetch completed:', { 
        hasTestData: !!testData, 
        partsCount: partsData?.length || 0, 
        optionsCount: allOptions?.length || 0 
      });

      // Handle case where no parts exist
      if (!partsData || partsData.length === 0) {
        console.warn('[fetchTestById] No parts found for test:', testId);
        const completeTest = { ...testData, parts: [] };
        set({ currentTest: completeTest, loadingTest: false, error: null });
        return completeTest;
      }

      const partIds = partsData.map((p) => p.id);
      if (!partIds || partIds.length === 0) {
        const completeTest = { ...testData, parts: [] };
        set({ currentTest: completeTest, loadingTest: false, error: null });
        return completeTest;
      }

      // Fetch question groups and questions in parallel (questions depends on question groups)
      const [questionGroupsData, individualQuestionsData] = await Promise.all([
        fetchQuestionGroupsData(partIds),
        // We'll fetch questions after we have question group IDs
        Promise.resolve([]),
      ]);

      const questionGroupIds = questionGroupsData.map((qg) => qg.id).filter(Boolean);

      // Fetch individual questions if we have question groups
      let finalQuestionsData = individualQuestionsData;
      if (questionGroupIds.length > 0) {
        finalQuestionsData = await fetchQuestionsData(questionGroupIds);
      }

      // Structure the data: Parts -> Question Groups -> Individual Questions
      const partsWithQuestionGroups = partsData.map((part) => {
        // Get question groups for this part
        const partQuestionGroups = questionGroupsData
          .filter((qg) => qg.part_id === part.id)
          .map((questionGroup) => {
            return processQuestionGroup(questionGroup, finalQuestionsData, allOptions);
          })
          // Sort question groups by their first child's question_number
          .sort((a, b) => {
            const aFirst = a.questions?.[0]?.question_number ?? 0;
            const bFirst = b.questions?.[0]?.question_number ?? 0;
            return aFirst - bFirst;
          });

        return {
          ...part,
          questionGroups: partQuestionGroups,
          // Flatten all individual questions for easy access, sorted by question_number
          questions: partQuestionGroups
            .flatMap((qg) => qg.questions)
            .sort((a, b) => {
              const aNum = a.question_number ?? 0;
              const bNum = b.question_number ?? 0;
              return aNum - bNum;
            }),
        };
      });

      const completeTest = {
        ...testData,
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

