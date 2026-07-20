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
        return { success: false, error: "Please enter a message before sending." };
      }

      set({ loading: true, error: null });
      try {
        const { data, error } = await supabase
          .from('feedbacks')
          .insert({
            message: feedbackData.message.trim(),
            user_id: userId,
            type: 'general',
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
          // Ichki DB tafsilotlarini foydalanuvchiga ko'rsatmaymiz (jadval nomi/RLS/postgres xatosi).
          if (error.code === 'PGRST116' || error.message?.includes('permission') || error.message?.includes('policy')) {
            const userMessage = 'Could not send your message. Please try again later.';
            console.error('[addFeedback] RLS policy denied the insert:', error.message);
            set({ error: userMessage, loading: false });
            return { success: false, error: userMessage };
          }
          
          throw error;
        }

        if (!data) {
          console.error('[addFeedback] No data returned from insert for user:', userId);
          const userMessage = 'Could not send your message. Please try again later.';
          set({ error: userMessage, loading: false });
          return { success: false, error: userMessage };
        }

        set({ feedbacks: [data, ...get().feedbacks], loading: false });
        return { success: true, data };
      } catch (error) {
        // Log the real cause, but surface a generic message - raw DB/network errors
        // leak internal details and mean nothing to the user.
        console.error('[addFeedback] Exception caught:', {
          error: error?.message,
          stack: error?.stack,
          userId: userId
        });
        const userMessage = 'Could not send your message. Please try again later.';
        set({ error: userMessage, loading: false });
        return { success: false, error: userMessage };
      }
    },

  // Get feedback list (optionally scoped to user)

  clearError: () => set({ error: null }),

    /**
     * Savol bo'yicha shikoyat yuborish.
     *
     * Foydalanuvchi "qaysi savol" ekanini yozmaydi - kontekst avtomatik biriktiriladi.
     * MUHIM: question_id qattiq FK emas (soft link). Testni tahrirlash savollarni o'chirib,
     * yangi uuid bilan qayta yaratadi - shuning uchun savol matni/raqami SNAPSHOT sifatida
     * saqlanadi va hisobot test tahrirlangandan keyin ham ma'noli bo'lib qoladi.
     */
    addQuestionReport: async ({ message, questionId, questionNumber, questionType,
                                questionText, testId, testTitle, partNumber, attemptId }) => {
      const userProfile = useAuthStore.getState().userProfile;
      const userId = userProfile?.id;

      if (!userId) {
        return { success: false, error: 'You must be logged in to report a question.' };
      }
      if (!message?.trim()) {
        return { success: false, error: 'Please describe the problem.' };
      }

      set({ loading: true, error: null });
      try {
        const { data, error } = await supabase
          .from('feedbacks')
          .insert({
            message: message.trim(),
            user_id: userId,
            type: 'question_report',
            question_id: questionId != null ? String(questionId) : null,
            question_number: questionNumber ?? null,
            question_type: questionType ?? null,
            question_text: questionText ?? null,
            test_id: testId ?? null,
            test_title: testTitle ?? null,
            part_number: partNumber ?? null,
            attempt_id: attemptId ?? null,
          })
          .select()
          .single();

        if (error) {
          console.error('[addQuestionReport] insert failed:', error.message);
          const userMessage = 'Could not send your report. Please try again later.';
          set({ error: userMessage, loading: false });
          return { success: false, error: userMessage };
        }

        set({ loading: false });
        return { success: true, data };
      } catch (error) {
        console.error('[addQuestionReport] exception:', error?.message);
        const userMessage = 'Could not send your report. Please try again later.';
        set({ error: userMessage, loading: false });
        return { success: false, error: userMessage };
      }
    },
}));
