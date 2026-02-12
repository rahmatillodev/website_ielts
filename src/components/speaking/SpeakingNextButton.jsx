/**
 * Submit Recording: enabled only when recording; disabled (and visually) when question is playing.
 */

import React from "react";
import { useSpeakingSessionStore } from "@/store/speakingSessionStore";

export default function SpeakingNextButton() {
  const status = useSpeakingSessionStore((s) => s.status);
  const setNextRequested = useSpeakingSessionStore((s) => s.setNextRequested);

  const isRecording = status === "recording";
  const isPaused = status === "reading_question";

  if (status !== "recording" && status !== "reading_question") return null;

  const handleNext = () => {
    if (!isRecording) return;
    setNextRequested();
  };

  return (
    <button
      type="button"
      onClick={handleNext}
      disabled={isPaused}
      className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-opacity ${
        isPaused
          ? "bg-gray-200 text-gray-500 cursor-not-allowed opacity-70"
          : "bg-primary text-primary-foreground hover:opacity-90"
      }`}
    >
      <span aria-hidden>✓</span>
      Submit Recording
    </button>
  );
}
