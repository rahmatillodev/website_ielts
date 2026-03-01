import { create } from "zustand";
import supabase from "@/lib/supabase";
import { toast } from "react-toastify";
import { useWritingTaskTypeStore } from "./writingTaskTypeStore";

export const useWritingStore = create((set, get) => ({
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
        .eq("is_active", true)
        .or("is_mock.eq.false,is_mock.is.null")
        .order("created_at", { ascending: false });


      /// writings table
      /// columns: id, title, duration, difficulty , created_at, updated_at, feedback, is_active, is_mock

      if (error) throw error;

      // Ensure data is an array
      const writings = Array.isArray(data) ? data : [];

      // Fetch task types for all writings
      const allWritingIds = writings.map(writing => writing.id);
      let taskTypesMap = {};
      
      try {
        taskTypesMap = await useWritingTaskTypeStore.getState().fetchTaskTypesForWritings(allWritingIds);
      } catch (error) {
        console.warn('[WritingStore] Error fetching task types, continuing without them:', error);
        // Continue without task types - writings will still work
      }

      // Enrich writings with task types
      const enrichedWritings = writings.map(writing => ({
        ...writing,
        task_types: taskTypesMap[writing.id] || new Set(),
      }));

      set({ writings: enrichedWritings, loadingWritings: false });
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
      //    This can only be Task 1 or Task 2, sometimes there will be 2.      //     { "id": "task-id-1", 
      //   "writing_tasks": [
      //       "writing_id": "writing-id-1",
      //       "task_name": "Task 1", only Task 1, Task 2 are available
      //       "title": "...",
      //       "task_types": , table , line_graph, bar_chart, pie_chart, map, process_diagram, formal_letter, semi_formal, informal, 
      //       "image_url": "...", only for TASK_1
      //       "content": "...",
      //       "sample": "...",
      //       "created_at": "..."
      //     },
      //     { "id": "task-id-2",
      //       "writing_id": "writing-id-1",
      //       "task_name": "Task 2",
      //       "title": "...",
      //       "content": "...",
      //       "sample": "...",
      //       "created_at": "..."
      //     }
      //   ]
      // }


      if (error) throw error;

      // Validate data structure
      if (!data) {
        throw new Error('Writing not found');
      }

      // Ensure writing_tasks is an array (even if empty)
      if (!Array.isArray(data.writing_tasks)) {
        console.warn('[useWritingStore] writing_tasks is not an array, setting to empty array:', data.writing_tasks);
        data.writing_tasks = [];
      }

      console.log('[useWritingStore] Successfully fetched writing:', {
        id: data.id,
        title: data.title,
        tasksCount: data.writing_tasks?.length || 0,
        is_mock: data.is_mock,
        is_active: data.is_active
      });

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

