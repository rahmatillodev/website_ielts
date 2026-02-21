/**
 * Finish practice button. Only triggers store action — no navigation (orchestrator handles that).
 */

import React from "react";
import { useSpeakingSessionStore } from "@/store/speakingSessionStore";

export default function SpeakingFinishButton() {
  const finishSession = useSpeakingSessionStore((s) => s.finishSession);
  const status = useSpeakingSessionStore((s) => s.status);

  const isFinished = status === "finished";

  const handleFinish = () => {
    finishSession();
  };

  return (
    <button
      type="button"
      onClick={handleFinish}
      disabled={isFinished}
      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      <span aria-hidden>■</span>
      Finish Exam
    </button>
  );
}
