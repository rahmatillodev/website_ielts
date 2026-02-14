/**
 * Test detail store - fixed version
 */

import { create } from "zustand";
import supabase from "@/lib/supabase";
import { processNestedQuestionGroup } from "./utils/questionTransformers";
/**
 * Zustand store
 */
export const useTestDetailStore = create((set, get) => {
  // Track current abort controller for cancellation
  let currentAbortController = null;

  return {
    currentTest: null,
    loadingTest: false,
    error: null,

    // Cancel any in-flight request
    cancelFetch: () => {
      if (currentAbortController) {
        currentAbortController.abort();
        currentAbortController = null;
      }
    },

    fetchTestById: async (testId, forceRefresh = false, includeCorrectAnswers = false) => {
      // Cancel any previous request
      if (currentAbortController) {
        currentAbortController.abort();
      }

      // Create new abort controller for this request
      const abortController = new AbortController();
      currentAbortController = abortController;

      set({ loadingTest: true, error: null });

      // Helper to check if request was aborted
      const checkAborted = () => {
        if (abortController.signal.aborted) {
          throw new Error('Request cancelled');
        }
      };

      try {
      // Validate inputs
      if (!testId) {
        throw new Error('Test ID is required');
      }

      // Verify Supabase client is available
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }

      // Verify Supabase client has the required methods
      if (typeof supabase.from !== 'function') {
        throw new Error('Supabase client is not properly configured');
      }

      // Helper function to create a timeout that can be cancelled
      const createTimeout = (ms, message) => {
        let timeoutId;
        const promise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error(message)), ms);
        });
        promise.cancel = () => clearTimeout(timeoutId);
        return promise;
      };

      // Try nested query approach first (more efficient if relationships are configured)
      let testData = null;
      let useNestedQuery = false;
      
      checkAborted();

      try {
        // Build the query and execute it immediately
        const nestedQueryPromise = supabase
          .from("test")
          .select(`
            *,
            part (
              *,
              question (
                *,
                questions (*),
                options (*)
              )
            )
          `)
          .eq("id", testId)
          .eq("is_active", true)
          .maybeSingle();

        
        
        // Supabase query builders return thenables (objects with .then() method)
        // which can be awaited, but may not be native Promises
        const queryStartTime = Date.now();

        // Create timeout that can be cancelled
        const timeout = createTimeout(30000, 'Request timeout: Test fetch took longer than 30 seconds');
        
        // Race the query against timeout and abort signal
        let nestedResult;
        try {
          // Check if aborted before starting
          checkAborted();
          
          // Create abort promise that rejects when aborted
          const abortPromise = new Promise((_, reject) => {
            abortController.signal.addEventListener('abort', () => {
              reject(new Error('Request cancelled'));
            });
          });
          
          nestedResult = await Promise.race([nestedQueryPromise, timeout, abortPromise]);
          timeout.cancel(); // Cancel timeout if query completes
          checkAborted(); // Check again after completion
          const queryDuration = Date.now() - queryStartTime;
        } catch (error) {
          timeout.cancel(); // Always cancel timeout
          checkAborted(); // Check if this was an abort
          const queryDuration = Date.now() - queryStartTime;
          // Re-throw the error to be caught by outer catch
          throw error;
        }

        // Check if nested query worked and has valid data
        if (nestedResult && typeof nestedResult === 'object' && 'data' in nestedResult) {
          // Check for Supabase errors
          if (nestedResult.error) {
            // If error indicates relationship not configured, fall back to step-by-step
            if (nestedResult.error.message && nestedResult.error.message.includes('relation')) {
              console.warn('Nested query relationships not configured, falling back to step-by-step approach');
              useNestedQuery = false;
            } else {
              throw new Error(`Nested query error: ${nestedResult.error.message}`);
            }
          } else if (nestedResult.data) {
            testData = nestedResult.data;
            useNestedQuery = true;
          } else {
            // No data found (test doesn't exist or is inactive)
            set({ currentTest: null, loadingTest: false, error: null });
            return null;
          }
        } else {
          // Invalid response structure
          useNestedQuery = false;
        }
      } catch (nestedError) {
        // If nested query fails, fall back to step-by-step approach
        console.warn('Nested query failed, falling back to step-by-step approach:', nestedError);
        useNestedQuery = false;
      }

      // If nested query didn't work or returned no data, use step-by-step approach
      if (!testData || !useNestedQuery) {
        checkAborted();
        
        // Step 1: Fetch test metadata
        const metadataQuery = supabase
          .from("test")
          .select("id, title, duration, difficulty, type, is_premium, is_active, question_quantity, created_at")
          .eq("id", testId)
          .eq("is_active", true)
          .maybeSingle();

        // Supabase query builders return thenables which can be awaited
        const metadataTimeout = createTimeout(30000, 'Request timeout: Metadata fetch took longer than 30 seconds');
        let metadataResult;
        try {
          // Create abort promise
          const abortPromise = new Promise((_, reject) => {
            abortController.signal.addEventListener('abort', () => {
              reject(new Error('Request cancelled'));
            });
          });
          
          metadataResult = await Promise.race([metadataQuery, metadataTimeout, abortPromise]);
          metadataTimeout.cancel();
          checkAborted();
        } catch (error) {
          metadataTimeout.cancel();
          checkAborted();
          throw error;
        }

        // Check if data is valid (not a timeout error)
        if (!metadataResult || typeof metadataResult !== 'object' || !('data' in metadataResult)) {
          throw new Error('Invalid response from test fetch');
        }

        const testMetadata = metadataResult.data;

        if (!testMetadata) {
          set({ currentTest: null, loadingTest: false, error: null });
          currentAbortController = null;
          return null;
        }

        checkAborted();

        // Step 2: Fetch parts
        const partsAbortPromise = new Promise((_, reject) => {
          abortController.signal.addEventListener('abort', () => {
            reject(new Error('Request cancelled'));
          });
        });
        
        const partsQuery = supabase
          .from("part")
          .select("id, test_id, part_number, title, content, image_url, listening_url")
          .eq("test_id", testId)
          .order("part_number", { ascending: true });
        
        const { data: parts, error: partsError } = await Promise.race([
          partsQuery,
          partsAbortPromise
        ]);

        checkAborted();
        if (partsError) throw new Error(`Failed to fetch parts: ${partsError.message}`);
        if (!parts || parts.length === 0) {
          const emptyTest = { ...testMetadata, part: [] };
          set({ currentTest: emptyTest, loadingTest: false, error: null });
          currentAbortController = null;
          return emptyTest;
        }

        const partIds = parts.map(p => p.id);

        checkAborted();

        // Step 3: Fetch question groups
        const groupsAbortPromise = new Promise((_, reject) => {
          abortController.signal.addEventListener('abort', () => {
            reject(new Error('Request cancelled'));
          });
        });
        
        const groupsQuery = supabase
          .from("question")
          .select("id, test_id, part_id, type, question_range, instruction, question_text, image_url")
          .in("part_id", partIds);
        
        const { data: questionGroups, error: groupsError } = await Promise.race([
          groupsQuery,
          groupsAbortPromise
        ]);

        checkAborted();
        if (groupsError) throw new Error(`Failed to fetch question groups: ${groupsError.message}`);
        if (!questionGroups || questionGroups.length === 0) {
          const testWithEmptyQuestions = { 
            ...testMetadata, 
            part: parts.map(p => ({ ...p, question: [] })) 
          };
          set({ currentTest: testWithEmptyQuestions, loadingTest: false, error: null });
          currentAbortController = null;
          return testWithEmptyQuestions;
        }

        const groupIds = questionGroups.map(g => g.id);

        checkAborted();

        // Step 4: Fetch questions
        const questionsAbortPromise = new Promise((_, reject) => {
          abortController.signal.addEventListener('abort', () => {
            reject(new Error('Request cancelled'));
          });
        });
        
        const questionsQuery = supabase
          .from("questions")
          .select(
            "id, test_id, question_id, part_id, question_number, question_text, correct_answer, explanation, is_correct"
          )
          .in("question_id", groupIds)
          .order("question_number", { ascending: true });
        
        const { data: questions, error: questionsError } = await Promise.race([
          questionsQuery,
          questionsAbortPromise
        ]);

        checkAborted();
        if (questionsError) throw new Error(`Failed to fetch questions: ${questionsError.message}`);

        // Step 5: Fetch options
        const optionsAbortPromise = new Promise((_, reject) => {
          abortController.signal.addEventListener('abort', () => {
            reject(new Error('Request cancelled'));
          });
        });
        
        const optionsQuery = supabase
          .from("options")
          .select("id, test_id, question_id, part_id, question_number, option_text, option_key, is_correct")
          .in("question_id", groupIds)
          .order("option_text");
        
        const { data: options, error: optionsError } = await Promise.race([
          optionsQuery,
          optionsAbortPromise
        ]);

        checkAborted();
        if (optionsError) throw new Error(`Failed to fetch options: ${optionsError.message}`);

        // Step 6: Structure nested data
        const questionsByGroup = {};
        (questions || []).forEach(q => {
          if (!questionsByGroup[q.question_id]) questionsByGroup[q.question_id] = [];
          questionsByGroup[q.question_id].push(q);
        });

        const optionsByGroup = {};
        const optionsByQuestion = {};
        (options || []).forEach(opt => {
          if (opt.question_number === null) {
            if (!optionsByGroup[opt.question_id]) optionsByGroup[opt.question_id] = [];
            optionsByGroup[opt.question_id].push(opt);
          } else {
            if (!optionsByQuestion[opt.question_id]) optionsByQuestion[opt.question_id] = [];
            optionsByQuestion[opt.question_id].push(opt);
          }
        });

        const groupsByPart = {};
        questionGroups.forEach(group => {
          if (!groupsByPart[group.part_id]) groupsByPart[group.part_id] = [];
          groupsByPart[group.part_id].push(group);
        });

        // Build nested structure
        const nestedParts = parts.map(part => {
          const groups = (groupsByPart[part.id] || []).map(group => {
            const groupQuestions = questionsByGroup[group.id] || [];
            const groupOptions = optionsByGroup[group.id] || [];
            const questionOptions = optionsByQuestion[group.id] || [];

            return {
              ...group,
              questions: groupQuestions,
              options: [...groupOptions, ...questionOptions],
            };
          });

          return {
            ...part,
            question: groups,
          };
        });

        testData = {
          ...testMetadata,
          part: nestedParts,
        };
      }

      // Process nested data using processNestedQuestionGroup
      // Both nested query and step-by-step approaches result in the same structure
      const sortedParts = (testData.part || []).sort(
        (a, b) => (a.part_number ?? 0) - (b.part_number ?? 0)
      );

      const processedParts = sortedParts.map(part => {
        const questionGroups = (part.question || [])
          .map(qg => processNestedQuestionGroup(qg))
          .sort(
            (a, b) =>
              (a.questions?.[0]?.question_number ?? 0) -
              (b.questions?.[0]?.question_number ?? 0)
          );

        const questions = questionGroups
          .flatMap(qg => qg.questions || [])
          .sort((a, b) => (a.question_number ?? 0) - (b.question_number ?? 0));

        return {
          ...part,
          questionGroups,
          questions,
        };
      });

      const completeTest = {
        id: testData.id,
        title: testData.title,
        type: testData.type,
        difficulty: testData.difficulty,
        duration: testData.duration,
        question_quantity: testData.question_quantity,
        is_premium: testData.is_premium,
        is_active: testData.is_active,
        created_at: testData.created_at,
        parts: processedParts,
      };

      // Clear abort controller on success
      currentAbortController = null;
      set({ currentTest: completeTest, loadingTest: false, error: null });

      return completeTest;
    } catch (error) {
      // Clear abort controller on error
      currentAbortController = null;
      
      // Don't set error state if request was cancelled (user-initiated)
      if (error.message === 'Request cancelled') {
        set({ loadingTest: false });
        return null;
      }
      
      set({
        currentTest: null,
        loadingTest: false,
        error: error.message || "Failed to fetch test",
      });
      throw error;
    }
  },

  clearCurrentTest: () => {
    // Cancel any in-flight request when clearing
    if (currentAbortController) {
      currentAbortController.abort();
      currentAbortController = null;
    }
    set({ currentTest: null, loadingTest: false, error: null });
  },
  };
});
