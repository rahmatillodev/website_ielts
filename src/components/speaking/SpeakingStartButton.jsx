/**
 * Start practice button. Calls store.startSession() — only when status is idle.
 */

import React from "react";
import { useSpeakingSessionStore } from "@/store/speakingSessionStore";

export default function SpeakingStartButton() {
  const status = useSpeakingSessionStore((s) => s.status);
  const totalSteps = useSpeakingSessionStore((s) => s.totalSteps);
  const startSession = useSpeakingSessionStore((s) => s.startSession);

  if (status !== "idle" || totalSteps === 0) return null;

  return (
    <button
      type="button"
      onClick={startSession}
      className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-lg hover:opacity-90 transition-opacity shadow-md"
    >
      Start practice
    </button>
  );
}
