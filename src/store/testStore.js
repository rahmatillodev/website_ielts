import { create } from 'zustand';
import supabase from '@/lib/supabase';

export const useTestStore = create((set, get) => ({
  test_reading: [],
  test_listening: [],
  loading: false,
  error: null,

  fetchTests: async () => {
    if (get().loaded) return;
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('test')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })


      if (error) throw error;

      const filtered_data_reading = data.filter((type) => type.type == "reading")
      const filtered_data_listening = data.filter((type) => type.type == "listening")
      
      set({ 
        test_reading: filtered_data_reading || [],
        test_listening: filtered_data_listening || [], 
        loading: false 
      });

      return data;
    } catch (error) {
        if (error.name === 'AbortError') {
          set({ loading: false });
          return;
        }

        console.error('Error fetching settings:', error);
        set({ error: error.message, loading: false });
    }
  },

}));