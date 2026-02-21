/**
 * Orchestrator: loads parts, auto-starts (READING_QUESTION → TTS → RECORDING, or shadowing: WATCHING → Answer → RECORDING),
 * runs recording lifecycle, persists and navigates on finish.
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSpeakingSessionStore, SESSION_STATUS, SPEAKING_RESULT_STORAGE_KEY, getFlatQuestions } from "@/store/speakingSessionStore";
import { getSpeakingPartsFromStore } from "@/pages/dashboard/speaking/speakingtypes/textToSpeach/speakingPartsFromStore";
import { SpeakingSessionContext } from "./SpeakingSessionContext";
import AudioRecorder from "./audio/AudioRecorder";
import SpeakingQuestionTTS from "./SpeakingQuestionTTS";

/** @param {{ children: React.ReactNode, getPartsForTest?: (testId: string) => Promise<unknown[]>, mode?: 'textToSpeech' | 'shadowing' }} props */
export default function SpeakingSessionOrchestrator({ children, getPartsForTest, mode: sessionMode = "textToSpeech" }) {
  const { id: testId } = useParams();
  const navigate = useNavigate();
  const hasNavigatedRef = useRef(false);

  const fetchParts = getPartsForTest ?? getSpeakingPartsFromStore;

  const status = useSpeakingSessionStore((s) => s.status);
  const mode = useSpeakingSessionStore((s) => s.mode);
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
  const setHumanSessionRecordingResult = useSpeakingSessionStore((s) => s.setHumanSessionRecordingResult);

  const isRecording = status === SESSION_STATUS.RECORDING;
  const isHuman = mode === "human";
  const [liveStream, setLiveStream] = useState(null);

  const onStreamReady = useCallback((stream) => {
    setLiveStream(stream);
  }, []);

  const onRecordingResult = useCallback((blob) => {
    const state = useSpeakingSessionStore.getState();
    if (state.mode === "human") {
      setHumanSessionRecordingResult(blob);
      state.clearNextRequested();
      return;
    }
    const { currentStep: step, setRecordingResult: save, clearNextRequested: clearNext } = state;
    save(step, blob);
    clearNext();
  }, [setHumanSessionRecordingResult]);

  useEffect(() => {
    if (!testId) return;
    let cancelled = false;
    const timeoutMs = 15000;
    const timeoutId = setTimeout(() => {
      if (cancelled) return;
      initSession(testId, [], { mode: sessionMode });
      startSession();
    }, timeoutMs);
    fetchParts(testId)
      .then((parts) => {
        if (cancelled) return;
        clearTimeout(timeoutId);
        initSession(testId, Array.isArray(parts) ? parts : [], { mode: sessionMode });
        startSession();
      })
      .catch((err) => {
        if (cancelled) return;
        clearTimeout(timeoutId);
        console.warn("[SpeakingSessionOrchestrator] fetchParts failed:", err);
        initSession(testId, [], { mode: sessionMode });
        startSession();
      });
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [testId, fetchParts, initSession, startSession, sessionMode]);

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
      {mode !== "shadowing" && mode !== "human" && status === SESSION_STATUS.READING_QUESTION && <SpeakingQuestionTTS />}
      {isRecording && isHuman && (
        <AudioRecorder
          key="human-session"
          isActive={true}
          onResult={onRecordingResult}
          maxDurationMs={2 * 60 * 60 * 1000}
          requestStop={nextRequested}
          onStreamReady={onStreamReady}
        />
      )}
      {isRecording && !isHuman && (
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
