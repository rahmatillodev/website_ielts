/**
 * Right panel: recording indicator, timer, Submit Recording, audio graph, Finish Exam.
 * Shown for both recording and reading_question; when reading_question everything is paused/default.
 */

import React from "react";
import { useSpeakingSessionStore } from "@/store/speakingSessionStore";
import { useSpeakingSessionContext } from "./SpeakingSessionContext";
import SpeakingStepTimer from "./SpeakingStepTimer";
import SpeakingNextButton from "./SpeakingNextButton";
import SpeakingFinishButton from "./SpeakingFinishButton";
import AudioFrequencyGraph from "./audio/AudioFrequencyGraph";

export default function SpeakingSessionSidebar() {
  const status = useSpeakingSessionStore((s) => s.status);
  const mode = useSpeakingSessionStore((s) => s.mode);
  const startRecordingForCurrentStep = useSpeakingSessionStore((s) => s.startRecordingForCurrentStep);
  const { liveStream } = useSpeakingSessionContext();

  const isShadowing = mode === "shadowing";
  const isWatching = status === "watching";
  const showRecordingPanel =
    status === "recording" ||
    status === "reading_question" ||
    (isShadowing && isWatching);
  const isPaused = status === "reading_question" || (isShadowing && isWatching);
  const showAnswerButton = isShadowing && isWatching;
  const showSubmitAndTimer = !isShadowing || status === "recording";

  return (
    <aside className="w-[340px] shrink-0 flex flex-col bg-white border-l border-border">
      {showRecordingPanel ? (
        <>
          <div className="p-6 flex flex-col items-center text-center">
            <div className="relative h-16 w-16 shrink-0 mb-4" aria-hidden>
              <div className="absolute inset-0 rounded-full bg-red-500/75 animate-soft-pulse" />
              <div className="relative z-10 flex h-16 w-16 items-center justify-center text-white">
                <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                </svg>
              </div>
            </div>
            <p className="font-semibold text-text-light text-center">
              {showAnswerButton ? "Your turn" : isPaused ? "Question playing…" : "Recording"}
            </p>
            <p className="text-sm text-text-secondary-light mt-1 text-center">
              {showAnswerButton
                ? "Click Answer to start the microphone and speak."
                : isPaused
                  ? "Timer and recording will start when the question finishes."
                  : "Speak your answer clearly into the microphone."}
            </p>
            {showSubmitAndTimer && (
              <div className="mt-6 w-full flex justify-center">
                <SpeakingStepTimer />
              </div>
            )}
            {showAnswerButton ? (
              <div className="mt-6 w-full">
                <button
                  type="button"
                  onClick={startRecordingForCurrentStep}
                  className="w-full py-3 px-4 rounded-lg bg-primary text-white font-medium hover:bg-primary/90"
                >
                  Answer
                </button>
              </div>
            ) : (
              showSubmitAndTimer && (
                <div className="mt-6 w-full">
                  <SpeakingNextButton />
                </div>
              )
            )}
          </div>
          <div className="flex-1 min-h-[80px] p-4 flex flex-col justify-end">
            <AudioFrequencyGraph
              isActive={!isPaused}
              stream={isPaused ? null : liveStream}
              className="w-full rounded-lg"
            />
          </div>
          <div className="p-4 border-t border-border">
            <SpeakingFinishButton />
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center p-6 text-text-secondary-light text-sm text-center">
          {status === "idle" ? "Loading…" : null}
        </div>
      )}
    </aside>
  );
}
