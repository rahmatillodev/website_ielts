import { create } from 'zustand';
import supabase from '@/lib/supabase';

export const useFeedbacksStore = create((set, get) => ({
  feedbacks: [],
  loading: false,
  error: null,

  // Add new feedback
  addFeedback: async (feedbackData) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('feedbacks')
        .insert([feedbackData])
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
  getFeedbacks: async (userId) => {
    set({ loading: true, error: null });
    try {
      let query = supabase
        .from('feedbacks')
        .select('*')
        .order('created_at', { ascending: false });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) throw error;

      set({ feedbacks: Array.isArray(data) ? data : [], loading: false });
      return data || [];
    } catch (error) {
      set({ error: error.message, loading: false });
      return [];
    }
  },

  clearError: () => set({ error: null }),
}));
