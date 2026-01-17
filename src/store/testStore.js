import { create } from 'zustand';
import supabase from '@/lib/supabase';

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
        loaded: currentState.loaded
      };
    }
    
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('test')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Ensure data is an array before filtering
      const tests = Array.isArray(data) ? data : [];
      const filtered_data_reading = tests.filter((test) => test.type === "reading");
      const filtered_data_listening = tests.filter((test) => test.type === "listening");
      
      set({ 
        test_reading: filtered_data_reading,
        test_listening: filtered_data_listening, 
        loading: false,
        loaded: true
      });

      return {
        test_reading: filtered_data_reading,
        test_listening: filtered_data_listening
      };
    } catch (error) {
        if (error.name === 'AbortError') {
          set({ loading: false });
          return;
        }

        console.error('Error fetching tests:', error);
        set({ error: error.message, loading: false });
        throw error;
    }
  },

  fetchTestById: async (testId) => {
    set({ loading: true, error: null });
    try {
      // Fetch test
      const { data: testData, error: testError } = await supabase
        .from('test')
        .select('*')
        .eq('id', testId)
        .single();

      if (testError) throw testError;

      // Fetch parts for this test - sorted by part_number ascending
      const { data: partsData, error: partsError } = await supabase
        .from('part')
        .select('*')
        .eq('test_id', testId)
        .order('part_number', { ascending: true });

      if (partsError) throw partsError;

      if (!partsData || partsData.length === 0) {
        const completeTest = {
          ...testData,
          parts: []
        };
        set({ 
          currentTest: completeTest,
          loading: false 
        });
        return completeTest;
      }

      const partIds = partsData.map(p => p.id);

      // Fetch question groups (from 'question' table) for all parts
      // These represent question groups with type, instruction, question_range
      const { data: questionGroupsData, error: questionGroupsError } = await supabase
        .from('question')
        .select('*')
        .in('part_id', partIds);

      if (questionGroupsError) throw questionGroupsError;

      // Fetch individual questions (from 'questions' table) for all question groups
      // These are the actual questions with question_number, question_text, correct_answer
      const questionGroupIds = questionGroupsData.map(qg => qg.id);
      
      let individualQuestionsData = [];
      if (questionGroupIds.length > 0) {
        const { data: questionsData, error: questionsError } = await supabase
          .from('questions')
          .select('*')
          .in('question_id', questionGroupIds)
          .order('question_number', { ascending: true });

        if (questionsError) throw questionsError;
        individualQuestionsData = questionsData || [];
      }

      // Fetch options from the options table for this test
      const { data: optionsData, error: optionsError } = await supabase
        .from('options')
        .select('*')
        .eq('test_id', testId)
        .order('letter', { ascending: true });

      if (optionsError) throw optionsError;
      const allOptions = optionsData || [];

      
      // Structure the data: Parts -> Question Groups -> Individual Questions
      const partsWithQuestionGroups = partsData.map(part => {
        // Get question groups for this part
        const partQuestionGroups = questionGroupsData
          .filter(qg => qg.part_id === part.id)
          .map(questionGroup => {
            // Get individual questions for this question group
            
            const groupQuestions = individualQuestionsData
              .filter(iq => iq.question_id === questionGroup.id)
              .map(individualQuestion => {
                // Get options for this specific question (matching question_id and question_number)
                const questionOptions = allOptions
                  .filter(opt => 
                    opt.question_id === questionGroup.id && 
                    opt.question_number === individualQuestion.question_number
                  )
                  .sort((a, b) => {
                    // Sort by letter (A, B, C, D, etc.)
                    return (a.letter || '').localeCompare(b.letter || '');
                  })
                  .map(opt => ({
                    id: opt.id,
                    option_text: opt.option_text,
                    letter: opt.letter,
                    is_correct: opt.is_correct,
                    question_id: opt.question_id,
                    question_number: opt.question_number
                  }));

                return {
                  ...individualQuestion,
                  options: questionOptions
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
              .filter(opt => 
                opt.question_id === questionGroup.id && 
                opt.question_number === null
              )
              .sort((a, b) => {
                // Sort by letter (A, B, C, D, etc.)
                return (a.letter || '').localeCompare(b.letter || '');
              })
              .map(opt => ({
                id: opt.id,
                option_text: opt.option_text,
                letter: opt.letter,
                is_correct: opt.is_correct,
                question_id: opt.question_id,
                question_number: opt.question_number
              }));

            // For table type questions: if group-level options are empty,
            // collect unique options from all questions in the group
            // (since table questions share the same options across all questions)
            const isTableType = (questionGroup.type || '').toLowerCase().includes('table');
            if (isTableType && groupLevelOptions.length === 0 && groupQuestions.length > 0) {
              // Get options from the first question (all questions have the same options)
              const firstQuestionOptions = groupQuestions[0]?.options || [];
              if (firstQuestionOptions.length > 0) {
                // Use a Map to ensure uniqueness by letter
                const uniqueOptionsMap = new Map();
                firstQuestionOptions.forEach(opt => {
                  const letter = opt.letter || '';
                  if (letter && !uniqueOptionsMap.has(letter)) {
                    uniqueOptionsMap.set(letter, {
                      id: opt.id || `group-opt-${letter}`,
                      option_text: opt.option_text || letter,
                      letter: letter,
                      is_correct: false, // Group-level options are wrong answers for table type
                      question_id: questionGroup.id,
                      question_number: null
                    });
                  }
                });
                groupLevelOptions = Array.from(uniqueOptionsMap.values()).sort((a, b) => {
                  return (a.letter || '').localeCompare(b.letter || '');
                });
              }
            }

            return {
              ...questionGroup,
              questions: groupQuestions,
              options: groupLevelOptions // Add group-level options to question group
            };
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
            .flatMap(qg => qg.questions)
            .sort((a, b) => {
              const aNum = a.question_number ?? 0;
              const bNum = b.question_number ?? 0;
              return aNum - bNum;
            })
        };
      });

      const completeTest = {
        ...testData,
        parts: partsWithQuestionGroups
      };

      set({ 
        currentTest: completeTest,
        loading: false 
      });

      return completeTest;
    } catch (error) {
        if (error.name === 'AbortError') {
          set({ loading: false });
          return;
        }

        console.error('Error fetching test by ID:', error);
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