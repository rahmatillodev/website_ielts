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
   * @returns {Promise<{success: boolean, attemptId?: string, error?: string}>}
   */
  submitWritingAttempt: async (writingId, answers, timeTaken) => {
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

      // Combine all task answers into a single string for correct_answers field
      // Format: "Task 1: [answer]\n\nTask 2: [answer]"
      const correctAnswersText = Object.entries(answers)
        .filter(([_, answer]) => answer && answer.trim())
        .map(([taskType, answer]) => `${taskType}: ${answer.trim()}`)
        .join('\n\n');

      // Insert into user_attempts table
      const { data: attemptData, error: attemptError } = await supabase
        .from('user_attempts')
        .insert({
          user_id: userId,
          writing_id: writingId, // Note: This assumes writing_id column exists
          score: null, // Writing doesn't have automated scoring
          total_questions: 1, // Constant as per requirements
          correct_answers: correctAnswersText, // User's written text
          time_taken: timeTakenSeconds, // Store in seconds
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (attemptError) {
        // If writing_id column doesn't exist, try with test_id instead
        if (attemptError.message.includes('writing_id') || attemptError.code === '42703') {
          const { data: retryData, error: retryError } = await supabase
            .from('user_attempts')
            .insert({
              user_id: userId,
              test_id: writingId, // Fallback to test_id
              score: null,
              total_questions: 1,
              correct_answers: correctAnswersText,
              time_taken: timeTakenSeconds, // Store in seconds
              completed_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (retryError) throw retryError;
          
          set({ loading: false, error: null });
          return {
            success: true,
            attemptId: retryData.id,
          };
        }
        throw attemptError;
      }

      set({ loading: false, error: null });
      return {
        success: true,
        attemptId: attemptData.id,
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

      // Parse answers from correct_answers field
      // Format: "Task 1: [answer]\n\nTask 2: [answer]"
      // Improved parsing to handle multiple blank lines within answers
      const answers = {};
      if (attemptData.correct_answers) {
        // Use regex to find all "Task X:" patterns
        // This handles cases where answers contain multiple blank lines
        const taskPattern = /(Task \d+):\s*/g;
        const matches = [...attemptData.correct_answers.matchAll(taskPattern)];
        
        if (matches.length > 0) {
          matches.forEach((match, index) => {
            const taskType = match[1];
            const startIndex = match.index + match[0].length;
            // Get the end index (start of next task or end of string)
            const endIndex = index < matches.length - 1 
              ? matches[index + 1].index 
              : attemptData.correct_answers.length;
            
            // Extract the answer text (preserve all whitespace including blank lines)
            // Only trim leading/trailing whitespace, preserve internal blank lines
            let answer = attemptData.correct_answers.substring(startIndex, endIndex);
            // Remove leading whitespace but preserve internal structure
            answer = answer.replace(/^\s+/, '').replace(/\s+$/, '');
            answers[taskType] = answer;
          });
        } else {
          // Fallback: try to parse as single task or old format
          // Check if it starts with "Task" pattern
          const singleTaskMatch = attemptData.correct_answers.match(/^(Task \d+):\s*(.+)$/s);
          if (singleTaskMatch) {
            const taskType = singleTaskMatch[1];
            let answer = singleTaskMatch[2];
            answer = answer.replace(/^\s+/, '').replace(/\s+$/, '');
            answers[taskType] = answer;
          } else {
            // Last resort: try old split method
            const tasks = attemptData.correct_answers.split(/\n\n(?=Task \d+:)/);
            tasks.forEach((task) => {
              const match = task.match(/^(Task \d+):\s*(.+)$/s);
              if (match) {
                const taskType = match[1];
                let answer = match[2];
                answer = answer.replace(/^\s+/, '').replace(/\s+$/, '');
                answers[taskType] = answer;
              }
            });
          }
        }
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

