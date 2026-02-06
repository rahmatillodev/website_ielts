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
          },
        ],
        loading: false,
      });
    }, 300);
  },
}));

export default useSpeakingStore;