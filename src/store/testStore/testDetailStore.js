/**
 * Test detail store - fixed version
 */

import { create } from "zustand";
import supabase from "@/lib/supabase";
import { processNestedQuestionGroup } from "./utils/questionTransformers";

/**
 * Fetch test data with nested structure
 */
const fetchTestDataNested = async (testId,) => {
  try {
    // Step 1: Fetch test metadata

    const data = await Promise.race([supabase
      .from("test")
      .select("id, title, duration, difficulty, type, is_premium, is_active, question_quantity, created_at")
      .eq("id", testId)
      .eq("is_active", true)
      .maybeSingle(),
    new Promise((reject) => setTimeout(reject, 15000))
    ]);

    const testMetadata = data.data;

    if (!testMetadata) return null;

    // Step 2: Fetch parts
    const { data: parts, error: partsError } = await supabase
      .from("part")
      .select("id, test_id, part_number, title, content, image_url, listening_url")
      .eq("test_id", testId)
      .order("part_number", { ascending: true });

    if (partsError) throw new Error(`Failed to fetch parts: ${partsError.message}`);
    if (!parts || parts.length === 0) return { ...testMetadata, part: [] };

    const partIds = parts.map(p => p.id);

    // Step 3: Fetch question groups
    const { data: questionGroups, error: groupsError } = await supabase
      .from("question")
      .select("id, test_id, part_id, type, question_range, instruction, question_text, image_url")
      .in("part_id", partIds);

    if (groupsError) throw new Error(`Failed to fetch question groups: ${groupsError.message}`);
    if (!questionGroups || questionGroups.length === 0)
      return { ...testMetadata, part: parts.map(p => ({ ...p, question: [] })) };

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

    return {
      ...testMetadata,
      part: nestedParts,
    };
  } catch (error) {
    console.log("errrr");

    console.error("fetchTestDataNested error:", error);
    throw error;
  }
};

/**
 * Zustand store
 */
export const useTestDetailStore = create((set, get) => ({
  currentTest: null,
  loadingTest: false,
  error: null,

  fetchTestById: async (testId, includeCorrectAnswers = false) => {
    set({ loadingTest: true, error: null });

    try {
      const nestedTestData = await fetchTestDataNested(testId, includeCorrectAnswers);

      if (!nestedTestData) throw new Error(`Test not found: ${testId}`);

      // Process nested data
      const sortedParts = [...(nestedTestData.part || [])].sort(
        (a, b) => (a.part_number ?? 0) - (b.part_number ?? 0)
      );

      const parts = sortedParts.map(part => {
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
        id: nestedTestData.id,
        title: nestedTestData.title,
        type: nestedTestData.type,
        difficulty: nestedTestData.difficulty,
        duration: nestedTestData.duration,
        question_quantity: nestedTestData.question_quantity,
        is_premium: nestedTestData.is_premium,
        is_active: nestedTestData.is_active,
        created_at: nestedTestData.created_at,
        parts,
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
