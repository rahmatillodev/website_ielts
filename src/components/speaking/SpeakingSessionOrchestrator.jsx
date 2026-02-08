/**
 * Orchestrator: loads parts, auto-starts (READING_QUESTION → TTS → RECORDING),
 * runs recording lifecycle, persists and navigates on finish.
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSpeakingSessionStore, SESSION_STATUS, SPEAKING_RESULT_STORAGE_KEY, getFlatQuestions } from "@/store/speakingSessionStore";
import { getSpeakingPartsForTest } from "@/pages/dashboard/speaking/speakingtypes/textToSpeach/mockSpeakingQuestions";
import { SpeakingSessionContext } from "./SpeakingSessionContext";
import AudioRecorder from "./audio/AudioRecorder";
import SpeakingQuestionTTS from "./SpeakingQuestionTTS";

export default function SpeakingSessionOrchestrator({ children }) {
  const { id: testId } = useParams();
  const navigate = useNavigate();
  const hasNavigatedRef = useRef(false);

  const status = useSpeakingSessionStore((s) => s.status);
  const currentStep = useSpeakingSessionStore((s) => s.currentStep);
  const stepDurationMs = useSpeakingSessionStore((s) => {
    const questions = getFlatQuestions(s.parts);
    const q = questions[s.currentStep];
    const sec = (q && typeof q.durationSec === "number") ? q.durationSec : 30;
    return sec * 1000;
  });
  const initSession = useSpeakingSessionStore((s) => s.initSession);
  const startSession = useSpeakingSessionStore((s) => s.startSession);
  const nextRequested = useSpeakingSessionStore((s) => s.nextRequested);
  const persistResultForResultPage = useSpeakingSessionStore((s) => s.persistResultForResultPage);
  const resetSession = useSpeakingSessionStore((s) => s.resetSession);

  const isRecording = status === SESSION_STATUS.RECORDING;
  const [liveStream, setLiveStream] = useState(null);

  const onStreamReady = useCallback((stream) => {
    setLiveStream(stream);
  }, []);

  const onRecordingResult = useCallback((blob) => {
    const { currentStep: step, setRecordingResult: save, clearNextRequested: clearNext } = useSpeakingSessionStore.getState();
    save(step, blob);
    clearNext();
  }, []);

  useEffect(() => {
    if (!testId) return;
    let cancelled = false;
    getSpeakingPartsForTest(testId).then((parts) => {
      if (cancelled) return;
      initSession(testId, parts);
      startSession();
    });
    return () => {
      cancelled = true;
    };
  }, [testId, initSession, startSession]);

  useEffect(() => {
    if (status !== SESSION_STATUS.FINISHED || !testId) return;
    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;
    persistResultForResultPage();
    navigate(`/speaking-result/${testId}`, { replace: true });
  }, [status, testId, navigate, persistResultForResultPage]);

  useEffect(() => {
    return () => {
      resetSession();
    };
  }, [resetSession]);

  const sessionContextValue = { liveStream, isRecording };

  return (
    <SpeakingSessionContext.Provider value={sessionContextValue}>
      {children}
      {status === SESSION_STATUS.READING_QUESTION && <SpeakingQuestionTTS />}
      {isRecording && (
        <AudioRecorder
          key={currentStep}
          isActive={true}
          onResult={onRecordingResult}
          maxDurationMs={stepDurationMs}
          requestStop={nextRequested}
          onStreamReady={onStreamReady}
        />
      )}
    </SpeakingSessionContext.Provider>
  );
}

export { SESSION_STATUS, SPEAKING_RESULT_STORAGE_KEY };
