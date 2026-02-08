/**
 * Speaking Practice Session Store (state machine).
 * Parts-based: each part has questions; TTS reads question then timer/recording starts.
 * Ready for Supabase: replace mock init with fetch by testId.
 */

import { create } from "zustand";

const SESSION_STATUS = {
  IDLE: "idle",
  READING_QUESTION: "reading_question",
  RECORDING: "recording",
  FINISHED: "finished",
};

const SPEAKING_RESULT_STORAGE_KEY = "speaking_session_result";

/**
 * @typedef {Object} SpeakingQuestion
 * @property {string} id
 * @property {string} question
 * @property {number} [durationSec]
 */

/**
 * @typedef {Object} SpeakingPart
 * @property {string} id
 * @property {string} title
 * @property {SpeakingQuestion[]} questions
 */

/**
 * @typedef {Object} RecordingResult
 * @property {string} questionId
 * @property {string} questionText
 * @property {string} [audioUrl]
 * @property {Blob} [blob]
 */

export function getFlatQuestions(parts) {
  if (!Array.isArray(parts)) return [];
  return parts.flatMap((p) => p.questions || []);
}

export const useSpeakingSessionStore = create((set, get) => ({
  testId: null,
  parts: [],
  currentStep: 0,
  status: SESSION_STATUS.IDLE,
  recordingResults: [],
  stepStartedAt: null,
  nextRequested: false,

  getFlatQuestions: () => getFlatQuestions(get().parts),
  getTotalSteps: () => getFlatQuestions(get().parts).length,
  getCurrentQuestion: () => {
    const questions = getFlatQuestions(get().parts);
    return questions[get().currentStep] ?? null;
  },
  isLastStep: () => {
    const { parts: p, currentStep } = get();
    const total = getFlatQuestions(p).length;
    return total === 0 || currentStep >= total - 1;
  },
  getCurrentStepDurationMs: () => {
    const questions = getFlatQuestions(get().parts);
    const q = questions[get().currentStep];
    const sec = q && typeof q.durationSec === "number" ? q.durationSec : 30;
    return sec * 1000;
  },

  initSession: (testId, parts) => {
    const list = Array.isArray(parts) ? parts : [];
    set({
      testId: testId ?? null,
      parts: list,
      currentStep: 0,
      status: SESSION_STATUS.IDLE,
      recordingResults: [],
      stepStartedAt: null,
      nextRequested: false,
    });
  },

  /** Start session: go to reading_question for first question (TTS will run, then ttsEndedForCurrentStep starts recording). */
  startSession: () => {
    const flat = getFlatQuestions(get().parts);
    if (flat.length === 0) {
      set({ status: SESSION_STATUS.FINISHED });
      return;
    }
    set({ status: SESSION_STATUS.READING_QUESTION, currentStep: 0, stepStartedAt: null });
  },

  /** Called when TTS finished reading the current question; starts timer and recording. */
  ttsEndedForCurrentStep: () => {
    set({ status: SESSION_STATUS.RECORDING, stepStartedAt: Date.now() });
  },

  setRecordingResult: (stepIndex, blob) => {
    const { parts: p, recordingResults } = get();
    const questions = getFlatQuestions(p);
    const question = questions[stepIndex];
    const audioUrl = blob ? URL.createObjectURL(blob) : null;
    const newResult = {
      questionId: question?.id ?? `step-${stepIndex}`,
      questionText: question?.question ?? "",
      audioUrl,
      blob,
    };
    const nextResults = [...recordingResults];
    nextResults[stepIndex] = newResult;
    const total = questions.length;
    const isLast = stepIndex >= total - 1;

    if (isLast) {
      set({
        recordingResults: nextResults,
        currentStep: stepIndex + 1,
        status: SESSION_STATUS.FINISHED,
        stepStartedAt: null,
      });
    } else {
      set({
        recordingResults: nextResults,
        currentStep: stepIndex + 1,
        status: SESSION_STATUS.READING_QUESTION,
        stepStartedAt: null,
      });
    }
  },

  setNextRequested: () => set({ nextRequested: true }),
  clearNextRequested: () => set({ nextRequested: false }),

  goToNextStep: () => {
    const flat = getFlatQuestions(get().parts);
    const { currentStep } = get();
    const isLast = currentStep >= flat.length - 1;
    set({
      currentStep: currentStep + 1,
      status: isLast ? SESSION_STATUS.FINISHED : SESSION_STATUS.READING_QUESTION,
    });
  },

  finishSession: () => {
    const state = get();
    set({ status: SESSION_STATUS.FINISHED });
    const questions = getFlatQuestions(state.parts);
    try {
      const serializableResults = (state.recordingResults || []).map((r) => ({
        questionId: r.questionId,
        questionText: r.questionText,
        audioUrl: r.audioUrl ?? null,
      }));
      const payload = {
        testId: state.testId,
        questions,
        recordingResults: serializableResults,
        completedAt: new Date().toISOString(),
      };
      sessionStorage.setItem(SPEAKING_RESULT_STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn("[speakingSessionStore] persist result failed", e);
    }
  },

  persistResultForResultPage: () => {
    const state = get();
    if (state.status !== SESSION_STATUS.FINISHED) return;
    const questions = getFlatQuestions(state.parts);
    try {
      const serializableResults = (state.recordingResults || []).map((r) => ({
        questionId: r.questionId,
        questionText: r.questionText,
        audioUrl: r.audioUrl ?? null,
      }));
      const payload = {
        testId: state.testId,
        questions,
        recordingResults: serializableResults,
        completedAt: new Date().toISOString(),
      };
      sessionStorage.setItem(SPEAKING_RESULT_STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn("[speakingSessionStore] persist result failed", e);
    }
  },

  resetSession: () => {
    set({
      testId: null,
      parts: [],
      currentStep: 0,
      status: SESSION_STATUS.IDLE,
      recordingResults: [],
      stepStartedAt: null,
      nextRequested: false,
    });
  },
}));

export const SESSION_STATUS_IDLE = SESSION_STATUS.IDLE;
export const SESSION_STATUS_READING_QUESTION = SESSION_STATUS.READING_QUESTION;
export const SESSION_STATUS_RECORDING = SESSION_STATUS.RECORDING;
export const SESSION_STATUS_FINISHED = SESSION_STATUS.FINISHED;
export { SESSION_STATUS };

export { SPEAKING_RESULT_STORAGE_KEY };
export default useSpeakingSessionStore;
