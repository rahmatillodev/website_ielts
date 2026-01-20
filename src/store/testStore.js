import { create } from "zustand";
import supabase from "@/lib/supabase";

export const useTestStore = create((set, get) => ({
  test_reading: [],
  test_listening: [],
  currentTest: null,
  loading: false,
  error: null,
  loaded: false,
  // test_completed: Map of testId -> { isCompleted, attempt }
  test_completed: {},

  fetchTests: async () => {
    const currentState = get();
    // Return early if already loaded or currently loading to prevent race conditions
    if (currentState.loaded || currentState.loading) {
      // Return the current state data to maintain consistency
      return {
        test_reading: currentState.test_reading || [],
        test_listening: currentState.test_listening || [],
        loaded: currentState.loaded,
      };
    }

    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from("test")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Ensure data is an array before filtering
      const tests = Array.isArray(data) ? data : [];
      const filtered_data_reading = tests.filter(
        (test) => test.type === "reading"
      );
      const filtered_data_listening = tests.filter(
        (test) => test.type === "listening"
      );

      set({
        test_reading: filtered_data_reading,
        test_listening: filtered_data_listening,
        loading: false,
        loaded: true,
      });

      return {
        test_reading: filtered_data_reading,
        test_listening: filtered_data_listening,
      };
    } catch (error) {
      if (error.name === "AbortError") {
        set({ loading: false });
        return;
      }

      console.error("Error fetching tests:", error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  fetchTestById: async (testId) => {
    set({ loading: true, error: null });
    try {
      // Fetch test
      const { data: testData, error: testError } = await supabase
        .from("test")
        .select("*")
        .eq("id", testId)
        .maybeSingle();

      if (testError) throw testError;

      // Handle case where test doesn't exist
      if (!testData) {
        const errorMessage = `Test with ID ${testId} not found`;
        set({ error: errorMessage, loading: false });
        throw new Error(errorMessage);
      }

      // Fetch parts for this test - sorted by part_number ascending
      const { data: partsData, error: partsError } = await supabase
        .from("part")
        .select("*")
        .eq("test_id", testId)
        .order("part_number", { ascending: true });

      if (partsError) throw partsError;

      if (!partsData || partsData.length === 0) {
        const completeTest = {
          ...testData,
          parts: [],
        };
        set({
          currentTest: completeTest,
          loading: false,
        });
        return completeTest;
      }

      const partIds = partsData.map((p) => p.id);

      // Fetch question groups (from 'question' table) for all parts
      // These represent question groups with type, instruction, question_range
      const { data: questionGroupsData, error: questionGroupsError } =
        await supabase.from("question").select("*").in("part_id", partIds);

      if (questionGroupsError) throw questionGroupsError;

      // Fetch individual questions (from 'questions' table) for all question groups
      // These are the actual questions with question_number, question_text, correct_answer
      const questionGroupIds = questionGroupsData.map((qg) => qg.id);

      let individualQuestionsData = [];
      if (questionGroupIds.length > 0) {
        const { data: questionsData, error: questionsError } = await supabase
          .from("questions")
          .select("*")
          .in("question_id", questionGroupIds)
          .order("question_number", { ascending: true });

        if (questionsError) throw questionsError;
        individualQuestionsData = questionsData || [];
      }

      // Fetch options from the options table for this test
      const { data: optionsData, error: optionsError } = await supabase
        .from("options")
        .select("*")
        .eq("test_id", testId);

      if (optionsError) throw optionsError;
      const allOptions = optionsData || [];

      // Helper function to generate letter from index (A, B, C, D, etc.)
      const getLetterFromIndex = (index) => {
        return String.fromCharCode(65 + index); // 65 is 'A' in ASCII
      };

      // Structure the data: Parts -> Question Groups -> Individual Questions
      const partsWithQuestionGroups = partsData.map((part) => {
        // Get question groups for this part
        const partQuestionGroups = questionGroupsData
          .filter((qg) => qg.part_id === part.id)
          .map((questionGroup) => {
            const groupType = (questionGroup.type || "").toLowerCase();
            const isMultipleChoice =
              groupType.includes("multiple") || groupType.includes("choice");
            const isTableType = groupType.includes("table");

            // For table type: use questions table for question_text and correct_answer
            // Options are matched by question_group_id (question_id) AND question_number
            if (isTableType) {
              // Get questions from questions table for this question group
              // Nest options within each question where:
              // - option.question_id === question.question_id (both refer to question group id)
              // - option.question_number === question.question_number (identifies specific question)
              const groupQuestionsFromTable = individualQuestionsData
                .filter((iq) => iq.question_id === questionGroup.id)
                .map((individualQuestion) => {
                  const questionId = individualQuestion.id;
                  const questionNumber = individualQuestion.question_number;

                  // Get options for this specific question
                  // Match on both question_group_id (question_id) AND question_number
                  const questionOptions = allOptions
                    .filter((opt) => {
                      // Match options where:
                      // 1. option.question_id matches the question group id (question.question_id)
                      // 2. option.question_number matches the question's question_number
                      return (
                        opt.question_id === questionGroup.id &&
                        opt.question_number === questionNumber
                      );
                    })
                    .map((opt, optIndex) => {
                      // Calculate letter index based on all options for this question, sorted
                      return {
                        id: opt.id,
                        option_text: opt.option_text,
                        letter: opt.letter || getLetterFromIndex(optIndex), // Use letter if available, otherwise generate
                        is_correct: opt.is_correct || false,
                        correct_answer: opt.correct_answer || "",
                        question_id: opt.question_id,
                      };
                    })
                    .sort((a, b) => {
                      // Sort by letter if available, otherwise by option_text, then by id
                      if (a.letter && b.letter) {
                        return a.letter.localeCompare(b.letter);
                      }
                      if (a.option_text && b.option_text) {
                        return a.option_text.localeCompare(b.option_text);
                      }
                      return (a.id || 0) - (b.id || 0);
                    })
                    .map((opt, sortedIndex) => ({
                      ...opt,
                      // Ensure letter is set after sorting
                      letter: opt.letter || getLetterFromIndex(sortedIndex),
                    }));

                  return {
                    id:
                      questionId ||
                      `q-${questionGroup.id}-${individualQuestion.question_number}`,
                    question_id: questionGroup.id,
                    question_number: individualQuestion.question_number,
                    question_text:
                      individualQuestion.question_text ||
                      `Question ${individualQuestion.question_number}`,
                    correct_answer: individualQuestion.correct_answer || "",
                    options: questionOptions, // Nested options array per question (option.question_id === question.id)
                  };
                })
                .sort((a, b) => {
                  const aNum = a.question_number ?? 0;
                  const bNum = b.question_number ?? 0;
                  return aNum - bNum;
                });

              // For table type, we still provide group-level options for column headers
              // These are collected from all unique options across all questions
              const allUniqueOptions = new Map();
              groupQuestionsFromTable.forEach((q) => {
                if (q.options && Array.isArray(q.options)) {
                  q.options.forEach((opt) => {
                    const optText = opt.option_text || "";
                    if (optText && !allUniqueOptions.has(optText)) {
                      allUniqueOptions.set(optText, opt);
                    }
                  });
                }
              });

              const groupLevelOptions = Array.from(
                allUniqueOptions.values()
              ).sort((a, b) => {
                if (a.letter && b.letter) {
                  return a.letter.localeCompare(b.letter);
                }
                return (a.id || 0) - (b.id || 0);
              });

              return {
                ...questionGroup,
                questions: groupQuestionsFromTable,
                options: groupLevelOptions, // All unique options for column headers
              };
            }

            // For multiple_choice: create questions from options table (keep existing logic)
            if (isMultipleChoice) {
              // Get all options for this question group
              const groupOptions = allOptions
                .filter((opt) => opt.question_id === questionGroup.id)
                .map((opt, index) => ({
                  id: opt.id,
                  option_text: opt.option_text,
                  letter: getLetterFromIndex(index), // Generate letter based on order
                  is_correct: opt.is_correct,
                  question_id: opt.question_id,
                  question_number: opt.question_number,
                }));

              // Group options by question_number to create questions
              const optionsByQuestionNumber = {};
              groupOptions.forEach((opt) => {
                const qNum = opt.question_number;
                if (qNum !== null && qNum !== undefined) {
                  if (!optionsByQuestionNumber[qNum]) {
                    optionsByQuestionNumber[qNum] = [];
                  }
                  optionsByQuestionNumber[qNum].push(opt);
                }
              });

              // Create questions from options (for multiple_choice, questions come from options table)
              const groupQuestions = Object.keys(optionsByQuestionNumber)
                .map((qNum) => {
                  const qNumInt = parseInt(qNum, 10);
                  const questionOptions = optionsByQuestionNumber[qNum].map(
                    (opt, index) => ({
                      ...opt,
                      letter: getLetterFromIndex(index), // Regenerate letters for each question's options
                    })
                  );

                  // Find correct answer for this question (option with is_correct = true)
                  const correctOption = questionOptions.find(
                    (opt) => opt.is_correct === true
                  );
                  const correctAnswer = correctOption
                    ? correctOption.option_text
                    : "";

                  return {
                    id: `q-${questionGroup.id}-${qNum}`,
                    question_id: questionGroup.id,
                    question_number: qNumInt,
                    question_text:
                      questionGroup.question_text || `Question ${qNum}`,
                    options: questionOptions,
                    correct_answer: correctAnswer, // Store correct answer for easy access
                  };
                })
                .sort((a, b) => {
                  const aNum = a.question_number ?? 0;
                  const bNum = b.question_number ?? 0;
                  return aNum - bNum;
                });

              // For multiple_choice: each question has its own options (no group-level)
              return {
                ...questionGroup,
                questions: groupQuestions,
                options: [], // No group-level options for multiple_choice
              };
            }

            // For other question types: use the existing logic with questions table
            // Get individual questions for this question group
            const groupQuestions = individualQuestionsData
              .filter((iq) => iq.question_id === questionGroup.id)
              .map((individualQuestion) => {
                // Get options for this specific question (matching question_id and question_number)
                const questionOptions = allOptions
                  .filter(
                    (opt) =>
                      opt.question_id === questionGroup.id &&
                      opt.question_number === individualQuestion.question_number
                  )
                  .sort((a, b) => {
                    // Sort by letter if available, otherwise by id
                    if (a.letter && b.letter) {
                      return a.letter.localeCompare(b.letter);
                    }
                    return (a.id || 0) - (b.id || 0);
                  })
                  .map((opt, index) => ({
                    id: opt.id,
                    option_text: opt.option_text,
                    letter: opt.letter || getLetterFromIndex(index), // Use letter if available, otherwise generate
                    is_correct: opt.is_correct,
                    question_id: opt.question_id,
                    question_number: opt.question_number,
                  }));

                return {
                  ...individualQuestion,
                  options: questionOptions,
                };
              })
              .sort((a, b) => {
                const aNum = a.question_number ?? 0;
                const bNum = b.question_number ?? 0;
                return aNum - bNum;
              });

            // Get group-level options (where question_number is null)
            // These are options that apply to the entire question group
            let groupLevelOptions = allOptions
              .filter(
                (opt) =>
                  opt.question_id === questionGroup.id &&
                  opt.question_number === null
              )
              .sort((a, b) => {
                // Sort by letter if available, otherwise by id
                if (a.letter && b.letter) {
                  return a.letter.localeCompare(b.letter);
                }
                return (a.id || 0) - (b.id || 0);
              })
              .map((opt, index) => ({
                id: opt.id,
                option_text: opt.option_text,
                letter: opt.letter || getLetterFromIndex(index), // Use letter if available, otherwise generate
                is_correct: opt.is_correct,
                question_id: opt.question_id,
                question_number: opt.question_number,
              }));

            return {
              ...questionGroup,
              questions: groupQuestions,
              options: groupLevelOptions, // Add group-level options to question group
            };

            // return {
            //   ...questionGroup,
            //   questions: groupQuestions,
            //   options: groupLevelOptions // Add group-level options to question group
            // };
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
        loading: false,
      });
      console.log(completeTest);

      return completeTest;
    } catch (error) {
      if (error.name === "AbortError") {
        set({ loading: false });
        return;
      }

      console.error("Error fetching test by ID:", error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  clearCurrentTest: () => {
    set({ currentTest: null });
  },

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
