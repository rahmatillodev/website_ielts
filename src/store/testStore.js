import { create } from "zustand";
import supabase from "@/lib/supabase";

export const useTestStore = create((set, get) => ({
  test_reading: [],
  test_listening: [],
  currentTest: null,
  loading: false, // Loading state for fetchTests
  loadingTest: false, // Separate loading state for fetchTestById
  error: null,
  loaded: false,
  // test_completed: Map of testId -> { isCompleted, attempt }
  test_completed: {},

  fetchTests: async (forceRefresh = false) => {
    const currentState = get();
    
    // Allow refetch if data is empty even if loaded is true
    const hasData = (currentState.test_reading?.length > 0 || currentState.test_listening?.length > 0);
    
    // Return early only if already loaded with data AND not currently loading AND not forcing refresh
    // This prevents race conditions while allowing refetch when data is empty or when forceRefresh is true
    if (currentState.loaded && hasData && !currentState.loading && !forceRefresh) {
      return {
        test_reading: currentState.test_reading || [],
        test_listening: currentState.test_listening || [],
        loaded: currentState.loaded,
      };
    }

    // If loading is stuck, reset it after a reasonable timeout check
    // But proceed with fetch if we don't have data or if forcing refresh
    if (currentState.loading && hasData && !forceRefresh) {
      // If we're loading but have data and not forcing refresh, return current data
      return {
        test_reading: currentState.test_reading || [],
        test_listening: currentState.test_listening || [],
        loaded: currentState.loaded,
      };
    }

    set({ loading: true, error: null });

    // Timeout mechanism: 30 seconds max
    const timeoutMs = 30000;
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs);
    });

    try {
      const testsQueryPromise = supabase
        .from("test")
        .select("id, title, type, difficulty, duration, question_quantity, is_premium, is_active, created_at")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

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

      set({
        test_reading: filtered_data_reading,
        test_listening: filtered_data_listening,
        loaded: true,
        error: null, // Clear any previous errors
      });

      // console.log('[fetchTests] Success:', {
      //   totalTests: tests.length,
      //   readingTests: filtered_data_reading.length,
      //   listeningTests: filtered_data_listening.length
      // });

      return {
        test_reading: filtered_data_reading,
        test_listening: filtered_data_listening,
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
        // Log comprehensive error details
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
        loaded: false, // Reset loaded flag to allow refetch
      });
      
      throw error;
    } finally {
      // CRUCIAL: Always set loading to false to prevent infinite loading states
      set({ loading: false });
    }
  },

  fetchTestById: async (testId) => {
    // GUARD CLAUSE: Validate testId parameter
    if (!testId || typeof testId !== 'string' && typeof testId !== 'number') {
      const errorMessage = `Invalid testId: ${testId}. Expected a valid string or number.`;
      console.error('[fetchTestById] Validation Error:', errorMessage);
      set({ 
        error: errorMessage, 
        loadingTest: false, 
        currentTest: null 
      });
      throw new Error(errorMessage);
    }

    // Clear previous test data when fetching a new one
    // Use separate loadingTest flag to avoid interfering with fetchTests
    set({ loadingTest: true, error: null, currentTest: null });

    // Timeout mechanism: 30 seconds max
    const timeoutMs = 30000;
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs);
    });

    try {
      // Try nested select first (requires proper foreign key relations in Supabase)
      // If this fails, fall back to parallel queries
      let testData, partsData, questionGroupsData, individualQuestionsData, allOptions;
      
      try {
        // Attempt nested select - single query with all relations
        const { data: nestedData, error: nestedError } = await Promise.race([
          supabase
            .from("test")
            .select(`
              *,
              parts:part(
                *,
                questionGroups:question(
                  *,
                  questions:questions(*),
                  options:options(*)
                )
              ),
              options:options(*)
            `)
            .eq("id", testId)
            .single(),
          timeoutPromise
        ]);

        if (!nestedError && nestedData) {
          // Successfully got nested data - extract and structure it
          testData = {
            id: nestedData.id,
            title: nestedData.title,
            type: nestedData.type,
            difficulty: nestedData.difficulty,
            duration: nestedData.duration,
            question_quantity: nestedData.question_quantity,
            is_premium: nestedData.is_premium,
            is_active: nestedData.is_active,
            created_at: nestedData.created_at,
          };
          
          partsData = (nestedData.parts || []).map(part => ({
            ...part,
            questionGroups: part.questionGroups || []
          }));
          
          // Flatten question groups and questions
          questionGroupsData = [];
          individualQuestionsData = [];
          partsData.forEach(part => {
            if (part.questionGroups) {
              part.questionGroups.forEach(qg => {
                questionGroupsData.push(qg);
                if (qg.questions) {
                  individualQuestionsData.push(...qg.questions);
                }
              });
            }
          });
          
          // Collect all options from nested structure
          allOptions = nestedData.options || [];
          partsData.forEach(part => {
            if (part.questionGroups) {
              part.questionGroups.forEach(qg => {
                if (qg.options) {
                  allOptions.push(...qg.options);
                }
              });
            }
          });
        } else {
          throw nestedError || new Error('Nested query returned no data');
        }
      } catch (nestedErr) {
        // Fallback to parallel queries with specific columns
        console.warn('[fetchTestById] Nested select failed, using parallel queries:', nestedErr?.message);
        
        // Parallel fetch: test, parts, and options (options doesn't depend on parts)
        const [testResult, partsResult, optionsResult] = await Promise.all([
          Promise.race([
            supabase
              .from("test")
              .select("id, title, type, difficulty, duration, question_quantity, is_premium, is_active, created_at")
              .eq("id", testId)
              .maybeSingle(),
            timeoutPromise
          ]),
          Promise.race([
            supabase
              .from("part")
              .select("id, test_id, part_number, title, content, image_url, listening_url")
              .eq("test_id", testId)
              .order("part_number", { ascending: true }),
            timeoutPromise
          ]),
          Promise.race([
            supabase
              .from("options")
              .select("id, test_id, question_id, question_number, option_text, letter, is_correct, correct_answer")
              .eq("test_id", testId),
            timeoutPromise
          ])
        ]);

        const { data: testDataResult, error: testError } = testResult;
        const { data: partsDataResult, error: partsError } = partsResult;
        const { data: optionsDataResult, error: optionsError } = optionsResult;

        if (testError) {
          console.error('[fetchTestById] Supabase Error (test table):', {
            table: 'test',
            testId,
            error: testError.message,
            code: testError.code,
          });
          if (testError.code === 'PGRST116' || testError.message?.includes('permission') || testError.message?.includes('policy')) {
            throw new Error(`RLS Policy Denial: Check Row Level Security policies for 'test' table. Error: ${testError.message}`);
          }
          throw testError;
        }

        if (!testDataResult) {
          const errorMessage = `Test with ID ${testId} not found in 'test' table. Verify the ID exists and RLS policies allow access.`;
          set({ error: errorMessage, loadingTest: false, currentTest: null });
          throw new Error(errorMessage);
        }

        testData = testDataResult;
        partsData = partsDataResult || [];
        allOptions = optionsDataResult || [];

        if (partsError) {
          console.error('[fetchTestById] Supabase Error (part table):', partsError);
          if (partsError.code === 'PGRST116') {
            throw new Error(`RLS Policy Denial: Check Row Level Security policies for 'part' table. Error: ${partsError.message}`);
          }
          throw partsError;
        }

        if (optionsError) {
          console.error('[fetchTestById] Supabase Error (options table):', optionsError);
          if (optionsError.code === 'PGRST116') {
            throw new Error(`RLS Policy Denial: Check Row Level Security policies for 'options' table. Error: ${optionsError.message}`);
          }
          throw optionsError;
        }

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

        // Parallel fetch: question groups and questions (questions depends on question groups)
        const [questionGroupsResult, questionsResult] = await Promise.all([
          Promise.race([
            supabase
              .from("question")
              .select("id, part_id, type, instruction, question_text, question_range")
              .in("part_id", partIds),
            timeoutPromise
          ]),
          // We'll fetch questions after we have question group IDs
          Promise.resolve({ data: [], error: null })
        ]);

        const { data: questionGroupsDataResult, error: questionGroupsError } = questionGroupsResult;

        if (questionGroupsError) {
          console.error('[fetchTestById] Supabase Error (question table):', questionGroupsError);
          if (questionGroupsError.code === 'PGRST116') {
            throw new Error(`RLS Policy Denial: Check Row Level Security policies for 'question' table. Error: ${questionGroupsError.message}`);
          }
          throw questionGroupsError;
        }

        questionGroupsData = questionGroupsDataResult || [];
        const questionGroupIds = questionGroupsData.map((qg) => qg.id).filter(Boolean);

        if (questionGroupIds.length > 0) {
          const { data: questionsDataResult, error: questionsError } = await Promise.race([
            supabase
              .from("questions")
              .select("id, question_id, question_number, question_text, correct_answer, image_url")
              .in("question_id", questionGroupIds)
              .order("question_number", { ascending: true }),
            timeoutPromise
          ]);

          if (questionsError) {
            console.error('[fetchTestById] Supabase Error (questions table):', questionsError);
            if (questionsError.code === 'PGRST116') {
              throw new Error(`RLS Policy Denial: Check Row Level Security policies for 'questions' table. Error: ${questionsError.message}`);
            }
            throw questionsError;
          }
          individualQuestionsData = questionsDataResult || [];
        } else {
          individualQuestionsData = [];
        }
      }

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
            const isTableCompletion = groupType === "table_completion";
            const isTableType = groupType.includes("table") && !isTableCompletion;

            // For table_completion: parse HTML table with ___ placeholders (similar to fill_in_blanks)
            if (isTableCompletion) {
              // Get questions from questions table for this question group
              // These represent answers for each ___ placeholder
              const groupQuestions = individualQuestionsData
                .filter((iq) => iq.question_id === questionGroup.id)
                .map((individualQuestion) => {
                  return {
                    id: individualQuestion.id || `q-${questionGroup.id}-${individualQuestion.question_number}`,
                    question_id: questionGroup.id,
                    question_number: individualQuestion.question_number,
                    question_text: individualQuestion.question_text || "",
                    correct_answer: individualQuestion.correct_answer || "",
                  };
                })
                .sort((a, b) => {
                  const aNum = a.question_number ?? 0;
                  const bNum = b.question_number ?? 0;
                  return aNum - bNum;
                });

              // Parse HTML table from question_text to extract structure
              const questionText = questionGroup.question_text || "";
              let columnHeaders = [];
              let parsedTableData = null;

              if (questionText) {
                try {
                  // Use DOMParser to parse HTML table
                  const parser = new DOMParser();
                  const doc = parser.parseFromString(questionText, "text/html");
                  const table = doc.querySelector("table");

                  if (table) {
                    // Extract column headers from thead
                    const thead = table.querySelector("thead");
                    if (thead) {
                      const headerRow = thead.querySelector("tr");
                      if (headerRow) {
                        const thElements = headerRow.querySelectorAll("th");
                        columnHeaders = Array.from(thElements).map((th) => {
                          // Get text content, handling nested elements
                          return th.textContent?.trim() || "";
                        });
                      }
                    }

                    // Extract rows from tbody
                    const tbody = table.querySelector("tbody");
                    if (tbody) {
                      const rows = tbody.querySelectorAll("tr");
                      parsedTableData = {
                        columnHeaders,
                        rows: Array.from(rows).map((row) => {
                          const cells = row.querySelectorAll("td");
                          return Array.from(cells).map((td) => {
                            // Get innerHTML to preserve ___ placeholders
                            return td.innerHTML?.trim() || "";
                          });
                        }),
                      };
                    }
                  }
                } catch (error) {
                  console.error("[fetchTestById] Error parsing table_completion HTML:", error);
                }
              }

              return {
                ...questionGroup,
                questions: groupQuestions,
                options: [], // No options for table_completion
                column_headers: columnHeaders,
                parsed_table_data: parsedTableData, // Store parsed structure for component use
              };
            }

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
        loadingTest: false,
        error: null, // Clear any previous errors on success
      });

      // console.log('[fetchTestById] Success:', {
      //   testId,
      //   partsCount: partsWithQuestionGroups.length,
      //   questionGroupsCount: partsWithQuestionGroups.reduce((sum, p) => sum + (p.questionGroups?.length || 0), 0)
      // });

      return completeTest;
    } catch (error) {
      // Handle AbortError (cancelled requests)
      if (error.name === "AbortError") {
        console.warn('[fetchTestById] Request aborted:', testId);
        set({ loadingTest: false, loading: false });
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
        // Log comprehensive error details
        console.error('[fetchTestById] Error fetching test by ID:', {
          testId,
          errorName: error.name,
          errorMessage: error.message,
          errorStack: error.stack,
          errorCode: error.code,
          suggestion: 'Verify test ID exists, check RLS policies, and ensure Supabase connection is active'
        });
      }

      // Set error state - loading will be set to false in finally block
      set({ 
        error: error.message || 'Failed to fetch test. Please check your connection and try again.',
        currentTest: null
      });
      
      throw error;
    } finally {
      // CRUCIAL: Always set loading to false to prevent infinite loading states
      set({ loadingTest: false, loading: false });
    }
  },

  clearCurrentTest: (clearTestList = false) => {
    if (clearTestList) {
      // Clear both currentTest and test list data to force refetch
      set({ 
        currentTest: null,
        test_reading: [],
        test_listening: [],
        loaded: false
      });
    } else {
      set({ currentTest: null });
    }
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

  // Reset the store state (useful for debugging or when switching contexts)
  resetStore: () => {
    set({
      test_reading: [],
      test_listening: [],
      currentTest: null,
      loading: false,
      loadingTest: false,
      error: null,
      loaded: false,
      test_completed: {},
    });
  },
}));
