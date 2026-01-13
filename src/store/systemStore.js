import { create } from 'zustand';
import supabase from '@/lib/supabase';

export const useSettingsStore = create((set, get) => ({
  settings: {},
  loading: false,
  error: null,

  fetchSettings: async () => {
    if (get().loaded) return;
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .single();
      
      if (error) throw error;
      
      set({ settings: data || {}, loading: false });
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


