import { create } from "zustand";
import supabase from "@/lib/supabase";
import { toast } from "react-toastify";
// Helper to get user from localStorage (persisted by Zustand in 'auth-storage')
const getUserIdFromLocalStorage = () => {
  try {
    
    const authStore = localStorage.getItem('auth-storage');
    if (authStore) {
      const parsed = JSON.parse(authStore);
      return parsed?.state?.authUser?.id || null;
    }
    return null;
  } catch (err) {
    return null;
  }
};

export const useWritingCompletedStore = create((set) => ({
  loading: false,
  error: null,

  /**
   * Save writing attempt to user_attempts table
   * @param {string} writingId - The writing ID
   * @param {object} answers - User answers object { "Task 1": "...", "Task 2": "..." }
   * @param {number} timeTaken - Time taken in seconds (stored as seconds, minimum 1 second)
   * @param {string} [mockTestId] - Optional mock test ID (mock_test.id) for mock test mode - stored in mock_id field
   * @returns {Promise<{success: boolean, attemptId?: string, error?: string}>}
   */
  submitWritingAttempt: async (writingId, answers, timeTaken, mockTestId = null) => {
    set({ loading: true, error: null });

    try {
      const userId = getUserIdFromLocalStorage();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      if (!writingId) {
        throw new Error('Writing ID is required');
      }

      // Store time_taken in seconds (minimum 1 second)
      const timeTakenSeconds = timeTaken !== null && timeTaken !== undefined
        ? Math.max(1, Math.floor(timeTaken))
        : 1;

      // Fetch writing_tasks to get their IDs for user_answers table
      let writingTasks = null;
      const { data: tasksData, error: tasksError } = await supabase
        .from('writing_tasks')
        .select('id, task_name')
        .eq('writing_id', writingId);

      if (tasksError) {
        // If writing_id doesn't work, try with test_id (fallback)
        const { data: retryTasks, error: retryTasksError } = await supabase
          .from('writing_tasks')
          .select('id, task_name')
          .eq('test_id', writingId);

        if (retryTasksError) {
          throw new Error(`Failed to fetch writing tasks: ${retryTasksError.message}`);
        }
        writingTasks = retryTasks;
      } else {
        writingTasks = tasksData;
      }

      if (!writingTasks || writingTasks.length === 0) {
        throw new Error('No writing tasks found for this writing');
      }

      // Create a map of task_name to task_id
      const taskNameToIdMap = {};
      writingTasks.forEach(task => {
        taskNameToIdMap[task.task_name] = task.id;
      });

      // Prepare attempt data - correct_answers should be null
      const attemptDataToInsert = {
        user_id: userId,
        writing_id: writingId, // Note: This assumes writing_id column exists
        score: null, // Writing doesn't have automated scoring
        total_questions: 1, // Constant as per requirements
        correct_answers: null, // Set to null as per new requirement
        time_taken: timeTakenSeconds, // Store in seconds
        completed_at: new Date().toISOString(),
      };

      // Add mock_id if provided (for mock test mode)
      // mock_id should reference mock_test.id, not mock_test_clients.id
      if (mockTestId) {
        attemptDataToInsert.mock_id = mockTestId;
      }

      // Insert into user_attempts table
      let attemptData = null;
      let attemptError = null;
      
      const { data: insertedAttempt, error: insertError } = await supabase
        .from('user_attempts')
        .insert(attemptDataToInsert)
        .select()
        .single();

      if (insertError) {
        // If writing_id column doesn't exist, try with test_id instead
        if (insertError.message.includes('writing_id') || insertError.code === '42703') {
          const retryDataToInsert = {
            user_id: userId,
            test_id: writingId, // Fallback to test_id
            score: null,
            total_questions: 1,
            correct_answers: null, // Set to null as per new requirement
            time_taken: timeTakenSeconds, // Store in seconds
            completed_at: new Date().toISOString(),
          };

          // Add mock_id if provided
          // mock_id should reference mock_test.id, not mock_test_clients.id
          if (mockTestId) {
            retryDataToInsert.mock_id = mockTestId;
          }

          const { data: retryData, error: retryError } = await supabase
            .from('user_attempts')
            .insert(retryDataToInsert)
            .select()
            .single();

          if (retryError) throw retryError;
          
          attemptData = retryData;
        } else {
          throw insertError;
        }
      } else {
        attemptData = insertedAttempt;
      }

      const attemptId = attemptData.id;

      // Insert individual answers into user_answers table
      const answersToInsert = Object.entries(answers)
        .filter(([taskName, answer]) => answer && answer.trim() && taskNameToIdMap[taskName])
        .map(([taskName, answer]) => ({
          attempt_id: attemptId,
          question_id: taskNameToIdMap[taskName], // Use writing_task.id as question_id
          user_answer: answer.trim(),
          is_correct: false, // Always false for writing
          correct_answer: '', // Empty for writing
          question_type: 'speaking', // As specified by user
        }));

      if (answersToInsert.length > 0) {
        const { error: answersError } = await supabase
          .from('user_answers')
          .insert(answersToInsert);

        if (answersError) {
          throw new Error(`Failed to save user answers: ${answersError.message}`);
        }
      }

      set({ loading: false, error: null });
      return {
        success: true,
        attemptId: attemptId,
      };
    } catch (error) {
      console.error('Error submitting writing attempt:', error);
      const errorMessage = error?.message || 'Failed to save writing attempt';
      set({ loading: false, error: errorMessage });
      toast.error(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  },


  getWritingAttempts: async () => {
    const userId = getUserIdFromLocalStorage();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    try {
      // Fetch attempts with writing_id (regular writings) and join with writings table
      const { data: regularAttempts, error: regularError } = await supabase
        .from('user_attempts')
        .select(`
          *,
          writings (
            id,
            title,
            difficulty,
            duration,
            is_premium
          )
        `)
        .eq('user_id', userId)
        .not('writing_id', 'is', null)
        .order('completed_at', { ascending: false });

      if (regularError && !(regularError.message.includes('writing_id') || regularError.code === '42703')) {
        throw regularError;
      }

      return regularAttempts || [];
    } catch (error) {
      console.error('Error fetching writing attempts:', error);
      throw error;
    }
  },

  /**
   * Fetch writing attempt for review mode
   * @param {string} writingId - The writing ID
   * @param {string} [attemptId] - Optional specific attempt ID to fetch (if not provided, fetches latest)
   * @returns {Promise<{success: boolean, attempt?: object, answers?: object, error?: string}>}
   */
  getLatestWritingAttempt: async (writingId, attemptId = null) => {
    const userId = getUserIdFromLocalStorage();
    if (!userId) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    try {
      let attemptData = null;
      let attemptError = null;

      // If attemptId is provided, fetch that specific attempt
      if (attemptId) {
        const { data, error } = await supabase
          .from('user_attempts')
          .select('id, user_id, writing_id, test_id, score, total_questions, correct_answers, time_taken, completed_at, created_at')
          .eq('id', attemptId)
          .eq('user_id', userId)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }
        attemptData = data;
        attemptError = error;
      } else {
        // Fetch latest attempt - try with writing_id first
        let { data, error } = await supabase
          .from('user_attempts')
          .select('id, user_id, writing_id, test_id, score, total_questions, correct_answers, time_taken, completed_at, created_at')
          .eq('user_id', userId)
          .eq('writing_id', writingId)
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // If writing_id doesn't exist, try with test_id
        if (error && (error.message.includes('writing_id') || error.code === '42703')) {
          const { data: retryData, error: retryError } = await supabase
            .from('user_attempts')
            .select('id, user_id, writing_id, test_id, score, total_questions, correct_answers, time_taken, completed_at, created_at')
            .eq('user_id', userId)
            .eq('test_id', writingId)
            .order('completed_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (retryError && retryError.code !== 'PGRST116') {
            throw retryError;
          }
          data = retryData;
          error = retryError;
        }

        if (error && error.code !== 'PGRST116') {
          throw error;
        }
        attemptData = data;
        attemptError = error;
      }

      if (attemptError && attemptError.code !== 'PGRST116') {
        throw attemptError;
      }

      if (!attemptData) {
        return {
          success: true,
          attempt: null,
          answers: {},
        };
      }

      // Fetch answers from user_answers table
      const { data: userAnswers, error: answersError } = await supabase
        .from('user_answers')
        .select(`
          *,
          writing_tasks!inner (
            id,
            task_name
          )
        `)
        .eq('attempt_id', attemptData.id);

      if (answersError) {
        // If join fails, try fetching without join and then fetch writing_tasks separately
        const { data: answersOnly, error: answersOnlyError } = await supabase
          .from('user_answers')
          .select('*')
          .eq('attempt_id', attemptData.id);

        if (answersOnlyError) {
          console.warn('Error fetching user answers:', answersOnlyError);
          // Return empty answers if fetch fails (backward compatibility)
          return {
            success: true,
            attempt: attemptData,
            answers: {},
          };
        }

        // Fetch writing_tasks separately to map question_id to task_name
        const writingId = attemptData.writing_id || attemptData.test_id;
        const { data: writingTasks, error: tasksError } = await supabase
          .from('writing_tasks')
          .select('id, task_name')
          .eq('writing_id', writingId);

        if (tasksError) {
          // Try with test_id as fallback
          const { data: retryTasks, error: retryTasksError } = await supabase
            .from('writing_tasks')
            .select('id, task_name')
            .eq('test_id', writingId);

          if (retryTasksError || !retryTasks || retryTasks.length === 0) {
            console.warn('Error fetching writing tasks:', retryTasksError);
            return {
              success: true,
              attempt: attemptData,
              answers: {},
            };
          }

          // Map question_id to task_name
          const taskIdToNameMap = {};
          retryTasks.forEach(task => {
            taskIdToNameMap[task.id] = task.task_name;
          });

          // Build answers object
          const answers = {};
          answersOnly.forEach(answer => {
            const taskName = taskIdToNameMap[answer.question_id];
            if (taskName) {
              answers[taskName] = answer.user_answer || '';
            }
          });

          return {
            success: true,
            attempt: attemptData,
            answers,
          };
        }

        // Map question_id to task_name
        const taskIdToNameMap = {};
        writingTasks.forEach(task => {
          taskIdToNameMap[task.id] = task.task_name;
        });

        // Build answers object
        const answers = {};
        answersOnly.forEach(answer => {
          const taskName = taskIdToNameMap[answer.question_id];
          if (taskName) {
            answers[taskName] = answer.user_answer || '';
          }
        });

        return {
          success: true,
          attempt: attemptData,
          answers,
        };
      }

      // Build answers object from joined data
      const answers = {};
      if (userAnswers && userAnswers.length > 0) {
        userAnswers.forEach(answer => {
          const taskName = answer.writing_tasks?.task_name;
          if (taskName) {
            answers[taskName] = answer.user_answer || '';
          }
        });
      }

      return {
        success: true,
        attempt: attemptData,
        answers,
      };
    } catch (error) {
      console.error('Error fetching writing attempt:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  },

}));

