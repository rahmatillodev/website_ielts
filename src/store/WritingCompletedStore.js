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
   * @param {number} timeTaken - Time taken in seconds
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

      // Calculate total time taken
      const timeTakenSeconds = timeTaken !== null && timeTaken !== undefined
        ? Math.max(0, Math.floor(timeTaken))
        : 0;

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
          time_taken: timeTakenSeconds,
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
              time_taken: timeTakenSeconds,
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
      // Fetch attempts with writing_id and join with writings table to get writing details
      const { data, error } = await supabase
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

      if (error) {
        // If writing_id column doesn't exist, return empty array
        if (error.message.includes('writing_id') || error.code === '42703') {
          console.warn('writing_id column not found in user_attempts table');
          return [];
        }
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching writing attempts:', error);
      throw error;
    }
  },
}));

