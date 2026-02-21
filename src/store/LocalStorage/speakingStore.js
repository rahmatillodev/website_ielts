import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";

export const useSpeakingStore = create((set) => ({
  speakings: [],
  loading: false,

  fetchSpeakings: () => {
    set({ loading: true });

    setTimeout(() => {
      set({
        speakings: [
          {
            id: uuidv4(),
            title: "IELTS Speaking Part 1",
            duration: "20 min",
            level: "MEDIUM",
            is_premium: false,
            created_at: "Jan 29 12:21",
            testType: "speaking",
          },
          {
            id: "shadowing",
            title: "IELTS Shadowing Practice",
            duration: "15 min",
            level: "MEDIUM",
            is_premium: false,
            created_at: "Jan 29 12:21",
            testType: "shadowing",
          },
          {
            id: "human",
            title: "Human Speaking Practice",
            duration: "20 min",
            level: "MEDIUM",
            is_premium: false,
            created_at: "Jan 29 12:21",
            testType: "human",
          },
        ],
        loading: false,
      });
    }, 300);
  },
}));

export default useSpeakingStore;