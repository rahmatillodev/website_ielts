/**
 * Automatic TTS for the current question. Same API as SpeakingPracticePage (en-US, rate 1).
 * When status is READING_QUESTION, speaks the question; on end calls ttsEndedForCurrentStep().
 */

import { useEffect } from "react";
import { useSpeakingSessionStore, SESSION_STATUS } from "@/store/speakingSessionStore";

function speakQuestionText(text, onEnd) {
  if (!text?.trim()) {
    onEnd();
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text.trim());
  utterance.lang = "en-US";
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.onend = onEnd;
  utterance.onerror = onEnd;
  window.speechSynthesis.speak(utterance);
}

export default function SpeakingQuestionTTS() {
  const status = useSpeakingSessionStore((s) => s.status);
  const ttsEndedForCurrentStep = useSpeakingSessionStore((s) => s.ttsEndedForCurrentStep);
  const currentStep = useSpeakingSessionStore((s) => s.currentStep);

  useEffect(() => {
    if (status !== SESSION_STATUS.READING_QUESTION) return;

    const question = useSpeakingSessionStore.getState().getCurrentQuestion();
    if (!question || !question.question?.trim()) {
      ttsEndedForCurrentStep();
      return;
    }

    const timeoutId = setTimeout(() => {
      speakQuestionText(question.question, () => {
        ttsEndedForCurrentStep();
      });
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      window.speechSynthesis.cancel();
    };
  }, [status, currentStep, ttsEndedForCurrentStep]);

  return null;
}
