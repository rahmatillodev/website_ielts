import { create } from "zustand";
import supabase from "@/lib/supabase";
import { toast } from "react-toastify";

export const useWritingStore = create((set) => ({
  writings: [],
  currentWriting: null, // writing + tasks ichma-ich
  loadingWritings: false,
  loadingCurrentWriting: false,
  errorWritings: null,
  errorCurrentWriting: null,

  // Barcha writings ni olish
  fetchWritings: async () => {
    set({ loadingWritings: true, errorWritings: null });
    try {
      const { data, error } = await supabase
        .from("writings")
        .select("*")
        .order("created_at", { ascending: false });

      /// writings table
      /// columns: id, title, duration, difficulty , created_at, updated_at, feedback, is_active, is_premium

      if (error) throw error;

      set({ writings: data || [], loadingWritings: false });
    } catch (err) {
      toast.error(err.message);
      set({ errorWritings: err.message, loadingWritings: false });
    }
  },

  // Bitta writing va uning tasks ni ichma-ich olish
  fetchWritingById: async (id) => {
    if (!id) {
      console.error('[useWritingStore] fetchWritingById called with invalid id:', id);
      set({ errorCurrentWriting: 'Invalid writing ID', currentWriting: null });
      return null;
    }

    set({ loadingCurrentWriting: true, errorCurrentWriting: null });

    try {
      const { data, error } = await supabase
        .from('writings')
        .select(`
          *,
          writing_tasks(*)  
        `)
        .eq('id', id)
        .single();

      // {
      //   "id": "writing-id-1",
      //   "title": "My Writing",
      //   "difficulty": "EASY", // EASY, MEDIUM, HARD
      //   "duration": 60, // only for minutes
      //   "created_at": "...",
      //   "updated_at": "...",
      //   "is_active": true,
      //   "is_premium": false,
      //   "writing_tasks": [
      //     { "id": "task-id-1", 
      //       "writing_id": "writing-id-1",
      //       "task_type": "Task 1", only TASK_1, TASK_2 are available
      //       "title": "...",
      //       "image_url": "...", only for TASK_1
      //       "content": "...",
      //       "sample": "...",
      //       "created_at": "..."
      //     },
      //     { "id": "task-id-2",
      //       "writing_id": "writing-id-1",
      //       "task_type": "Task 2",
      //       "title": "...",
      //       "content": "...",
      //       "sample": "...",
      //       "created_at": "..."
      //     }
      //   ]
      // }


      if (error) throw error;

      set({ currentWriting: data, loadingCurrentWriting: false, errorCurrentWriting: null });

      return data;
    } catch (err) {
      toast.error(err.message);
      set({
        currentWriting: null,
        loadingCurrentWriting: false,
        errorCurrentWriting: err.message,
      });
      return null;
    }
  },

  clearCurrentWriting: () => {
    set({
      currentWriting: null,
      loadingCurrentWriting: false,
      errorCurrentWriting: null,
    });
  },

  setWritingList: (list) => {
    set({ writings: list });
  }
}));

