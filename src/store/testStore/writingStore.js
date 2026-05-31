import { create } from "zustand";
import supabase from "@/lib/supabase";
import { toast } from "react-toastify";
import { useWritingTaskTypeStore } from "./writingTaskTypeStore";
import { useTestListStore } from "./testListStore";
import {
  deriveWritingTaskLabel,
  sortWritingTasks,
} from "./utils/writingTaskUtils";

export const useWritingStore = create((set, get) => ({
  writings: [],
  writingsFetchedProgram: null,
  writingsLoaded: false,
  currentWriting: null, // writing + tasks ichma-ich
  loadingWritings: false,
  loadingCurrentWriting: false,
  errorWritings: null,
  errorCurrentWriting: null,

  // Barcha writings ni olish (filtered by sidebar IELTS / CEFR program)
  fetchWritings: async (forceRefresh = false) => {
    const currentState = get();
    const testProgram = useTestListStore.getState().testProgram;
    const hasData = currentState.writings?.length > 0;
    const programMatches = currentState.writingsFetchedProgram === testProgram;

    if (
      currentState.writingsLoaded &&
      hasData &&
      programMatches &&
      !currentState.loadingWritings &&
      !forceRefresh
    ) {
      return currentState.writings;
    }

    if (currentState.loadingWritings && hasData && programMatches && !forceRefresh) {
      return currentState.writings;
    }

    set({ loadingWritings: true, errorWritings: null });
    try {
      let query = supabase
        .from("writings")
        .select("*, writing_tasks(task_name)")
        .eq("is_active", true)
        .or("is_mock.eq.false,is_mock.is.null");

      if (testProgram === "cefr") {
        query = query.eq("is_cefr", true);
      } else {
        query = query.or("is_cefr.eq.false,is_cefr.is.null");
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;

      const rawWritings = Array.isArray(data) ? data : [];

      // Derive taskLabel: IELTS (Task 1 / Task 2 / Both) or CEFR (All / Task 1.1 · …)
      const writingsWithLabel = rawWritings.map((writing) => {
        const rawTasks = writing.writing_tasks;
        const tasks = Array.isArray(rawTasks) ? rawTasks : rawTasks != null ? [rawTasks] : [];
        const names = tasks.map((t) => t?.task_name).filter(Boolean);
        const taskLabel = deriveWritingTaskLabel(writing, names);
        const { writing_tasks: _wt, ...rest } = writing;
        return { ...rest, taskLabel };
      });

      // Fetch task types for all writings
      const allWritingIds = writingsWithLabel.map((w) => w.id);
      let taskTypesMap = {};

      try {
        taskTypesMap = await useWritingTaskTypeStore.getState().fetchTaskTypesForWritings(allWritingIds);
      } catch (err) {
        console.warn("[WritingStore] Error fetching task types, continuing without them:", err);
      }

      const enrichedWritings = writingsWithLabel.map((writing) => ({
        ...writing,
        task_types: taskTypesMap[writing.id] || new Set(),
      }));

      set({
        writings: enrichedWritings,
        writingsFetchedProgram: testProgram,
        writingsLoaded: true,
        loadingWritings: false,
        errorWritings: null,
      });
      return enrichedWritings;
    } catch (err) {
      toast.error(err.message);
      set({
        errorWritings: err.message,
        loadingWritings: false,
        writingsLoaded: false,
      });
      throw err;
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
      //   "writing_tasks": IELTS: Task 1, Task 2 (or both). CEFR: Task 1.1, Task 1.2, Task 2.
      //     { "id": "task-id-1", 
      //   "writing_tasks": [
      //       "writing_id": "writing-id-1",
      //       "task_name": "Task 1" | "Task 1.1" | etc.
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

      data.writing_tasks = sortWritingTasks(data.writing_tasks, data.is_cefr === true);

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

let lastSyncedTestProgram = useTestListStore.getState().testProgram;
useTestListStore.subscribe((state) => {
  if (state.testProgram === lastSyncedTestProgram) return;
  lastSyncedTestProgram = state.testProgram;
  useWritingStore.setState({
    writings: [],
    writingsFetchedProgram: null,
    writingsLoaded: false,
  });
});

