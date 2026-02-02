import { create } from 'zustand';
import supabase from '@/lib/supabase';
import { useAuthStore } from './authStore';

export const useFeedbacksStore = create((set, get) => ({
    feedbacks: [],
    loading: false,
    error: null,
    
    addFeedback: async (feedbackData) => {
      const userProfile = useAuthStore.getState().userProfile;
      const userId = userProfile?.id;

      // Agar foydalanuvchi profilini topa olmasa
      if (!userId) {
        return { success: false, error: "You must be logged in to submit feedback." };
      }

      if (!feedbackData?.message?.trim()) {
        return { success: false, error: "Xabar bo'sh bo'lishi mumkin emas." };
      }

      console.log(feedbackData);
      console.log(userId);
      console.log(userProfile);

      set({ loading: true, error: null });
      try {
        const { data, error } = await supabase
          .from('feedbacks')
          .insert({ 
            message: feedbackData.message.trim(),
            user_id: userId
          })
          .select()
          .single();
        
        // Explicit error check with detailed logging
        if (error) {
          console.error('[addFeedback] Supabase Error:', {
            table: 'feedbacks',
            error: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
            userId: userId
          });
          
          // Check for RLS policy denial
          if (error.code === 'PGRST116' || error.message?.includes('permission') || error.message?.includes('policy')) {
            const rlsError = `Permission denied: Check Row Level Security policies for 'feedbacks' table. Error: ${error.message}`;
            console.error('[addFeedback] RLS Policy Issue:', rlsError);
            set({ error: rlsError, loading: false });
            return { success: false, error: rlsError };
          }
          
          throw error;
        }

        if (!data) {
          const noDataError = 'Feedback was not created. No data returned from database.';
          console.error('[addFeedback] No data returned:', noDataError);
          set({ error: noDataError, loading: false });
          return { success: false, error: noDataError };
        }

        set({ feedbacks: [data, ...get().feedbacks], loading: false });
        return { success: true, data };
      } catch (error) {
        const errorMessage = error?.message || 'An unexpected error occurred while submitting feedback.';
        console.error('[addFeedback] Exception caught:', {
          error: errorMessage,
          stack: error?.stack,
          userId: userId
        });
        set({ error: errorMessage, loading: false });
        return { success: false, error: errorMessage };
      }
    },

  // Get feedback list (optionally scoped to user)

  clearError: () => set({ error: null }),
}));
