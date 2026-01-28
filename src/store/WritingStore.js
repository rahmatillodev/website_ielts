import { create } from "zustand";
import supabase from "@/lib/supabase";

export const useWritingStore = create((set) => ({
  writings: [],
  loading: false,
  error: null,

  fetchWritings: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from("writings")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      console.log("✅ WRITINGS FROM SUPABASE:", data);

      set({ writings: data || [], loading: false });
    } catch (err) {
      console.error("❌ WRITINGS FETCH ERROR:", err);
      set({ error: err.message, loading: false });
    }
  },
}));
