/**
 * Displays the current question. TTS runs automatically; timer is paused until it finishes.
 */

import React from "react";
import { useSpeakingSessionStore, SESSION_STATUS } from "@/store/speakingSessionStore";

export default function SpeakingQuestionView() {
  const getCurrentQuestion = useSpeakingSessionStore((s) => s.getCurrentQuestion);
  const currentQuestion = getCurrentQuestion();
  const currentStep = useSpeakingSessionStore((s) => s.currentStep);
  const status = useSpeakingSessionStore((s) => s.status);
  const isReadingQuestion = status === SESSION_STATUS.READING_QUESTION;

  if (!currentQuestion) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-text-secondary-light">
        No question
      </div>
    );
  }

  const questionNumber = currentStep + 1;

  return (
    <div className="flex-1 flex flex-col p-8 overflow-y-auto">
      <h2 className="text-3xl font-bold text-primary mb-6">
        Question {questionNumber}
      </h2>
      <p className="text-lg text-text-light">
        {currentQuestion.question}
      </p>
      {isReadingQuestion && (
        <p className="mt-4 text-sm text-primary font-medium">Reading question aloud…</p>
      )}
    </div>
  );
}
