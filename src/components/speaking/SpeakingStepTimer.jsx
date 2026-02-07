/**
 * Timer for the current step. When recording: countdown. When reading_question: full duration, paused.
 */

import React, { useState, useEffect } from "react";
import { useSpeakingSessionStore, getFlatQuestions } from "@/store/speakingSessionStore";

export default function SpeakingStepTimer() {
  const status = useSpeakingSessionStore((s) => s.status);
  const stepStartedAt = useSpeakingSessionStore((s) => s.stepStartedAt);
  const stepDurationMs = useSpeakingSessionStore((s) => {
    const questions = getFlatQuestions(s.parts);
    const q = questions[s.currentStep];
    const sec = q && typeof q.durationSec === "number" ? q.durationSec : 30;
    return sec * 1000;
  });

  const [remainingSec, setRemainingSec] = useState(0);
  const isPaused = status === "reading_question";

  useEffect(() => {
    if (status !== "recording" || !stepStartedAt || !stepDurationMs) {
      if (!isPaused) setRemainingSec(0);
      return;
    }

    const tick = () => {
      const remainingMs = stepDurationMs - (Date.now() - stepStartedAt);
      const remaining = Math.floor(remainingMs / 1000);
      setRemainingSec(Math.max(0, remaining));
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [status, stepStartedAt, stepDurationMs, isPaused]);

  if (status !== "recording" && status !== "reading_question") return null;

  const totalSec = Math.floor(stepDurationMs / 1000);
  const displaySec = isPaused ? totalSec : remainingSec;
  const mm = Math.floor(displaySec / 60);
  const ss = displaySec % 60;
  const display = `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;

  return (
    <div className="inline-flex flex-col items-center justify-center gap-1">
      <span className="font-mono text-2xl font-bold text-primary">{display}</span>
      {isPaused && (
        <span className="text-xs font-medium text-text-secondary-light">Paused</span>
      )}
    </div>
  );
}
