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
  
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('feedbacks')
        .insert({ 
          message: feedbackData.message.trim(), // faqat kerakli ustunni oling
          user_id: userId
        })
        .select()
        .single();
  
      if (error) throw error;

      set({ feedbacks: [data, ...get().feedbacks], loading: false });
      return { success: true, data };
    } catch (error) {
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },

  // Get feedback list (optionally scoped to user)

  clearError: () => set({ error: null }),
}));
