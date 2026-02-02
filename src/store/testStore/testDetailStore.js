/**
 * Test detail store - fixed version
 */

import { create } from "zustand";
import supabase from "@/lib/supabase";
import { processNestedQuestionGroup } from "./utils/questionTransformers";
/**
 * Zustand store
 */
export const useTestDetailStore = create((set, get) => ({
  currentTest: null,
  loadingTest: false,
  error: null,

  fetchTestById: async (testId, forceRefresh = false, includeCorrectAnswers = false) => {
    set({ loadingTest: true, error: null });

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
      console.log("testId", testId);
      

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

        console.log("Executing nested query for testId:", testId);
        console.log("Supabase client:", supabase ? 'available' : 'missing');
        
        // Supabase query builders return thenables (objects with .then() method)
        // which can be awaited, but may not be native Promises
        const queryStartTime = Date.now();

        // Create timeout that can be cancelled
        const timeout = createTimeout(30000, 'Request timeout: Test fetch took longer than 30 seconds');
        
        // Race the query against timeout
        let nestedResult;
        try {
          nestedResult = await Promise.race([nestedQueryPromise, timeout]);
          timeout.cancel(); // Cancel timeout if query completes
          const queryDuration = Date.now() - queryStartTime;
          console.log(`Nested query completed in ${queryDuration}ms`);
        } catch (error) {
          timeout.cancel(); // Always cancel timeout
          const queryDuration = Date.now() - queryStartTime;
          console.error(`Nested query failed after ${queryDuration}ms:`, error.message);
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
        console.log('Using step-by-step approach for testId:', testId);
        
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
          metadataResult = await Promise.race([metadataQuery, metadataTimeout]);
          metadataTimeout.cancel();
        } catch (error) {
          metadataTimeout.cancel();
          throw error;
        }

        // Check if data is valid (not a timeout error)
        if (!metadataResult || typeof metadataResult !== 'object' || !('data' in metadataResult)) {
          throw new Error('Invalid response from test fetch');
        }

        const testMetadata = metadataResult.data;

        if (!testMetadata) {
          set({ currentTest: null, loadingTest: false, error: null });
          return null;
        }

        // Step 2: Fetch parts
        const { data: parts, error: partsError } = await supabase
          .from("part")
          .select("id, test_id, part_number, title, content, image_url, listening_url")
          .eq("test_id", testId)
          .order("part_number", { ascending: true });

        if (partsError) throw new Error(`Failed to fetch parts: ${partsError.message}`);
        if (!parts || parts.length === 0) {
          const emptyTest = { ...testMetadata, part: [] };
          set({ currentTest: emptyTest, loadingTest: false, error: null });
          return emptyTest;
        }

        const partIds = parts.map(p => p.id);

        // Step 3: Fetch question groups
        const { data: questionGroups, error: groupsError } = await supabase
          .from("question")
          .select("id, test_id, part_id, type, question_range, instruction, question_text, image_url")
          .in("part_id", partIds);

        if (groupsError) throw new Error(`Failed to fetch question groups: ${groupsError.message}`);
        if (!questionGroups || questionGroups.length === 0) {
          const testWithEmptyQuestions = { 
            ...testMetadata, 
            part: parts.map(p => ({ ...p, question: [] })) 
          };
          set({ currentTest: testWithEmptyQuestions, loadingTest: false, error: null });
          return testWithEmptyQuestions;
        }

        const groupIds = questionGroups.map(g => g.id);

        // Step 4: Fetch questions
        const { data: questions, error: questionsError } = await supabase
          .from("questions")
          .select(
            "id, test_id, question_id, part_id, question_number, question_text, correct_answer, explanation, is_correct"
          )
          .in("question_id", groupIds)
          .order("question_number", { ascending: true });

        if (questionsError) throw new Error(`Failed to fetch questions: ${questionsError.message}`);

        // Step 5: Fetch options
        const { data: options, error: optionsError } = await supabase
          .from("options")
          .select("id, test_id, question_id, part_id, question_number, option_text, option_key, is_correct")
          .in("question_id", groupIds)
          .order("option_text");

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

      set({ currentTest: completeTest, loadingTest: false, error: null });

      return completeTest;
    } catch (error) {
      set({
        currentTest: null,
        loadingTest: false,
        error: error.message || "Failed to fetch test",
      });
      throw error;
    }
  },

  clearCurrentTest: () => {
    set({ currentTest: null, loadingTest: false, error: null });
  },
}));
