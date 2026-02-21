/**
 * Speaking Practice Session Store (state machine).
 * Parts-based: each part has questions; TTS reads question then timer/recording starts.
 * Ready for Supabase: replace mock init with fetch by testId.
 */

import { create } from "zustand";

const SESSION_STATUS = {
  IDLE: "idle",
  READING_QUESTION: "reading_question",
  WATCHING: "watching", // shadowing: video shown, user clicks Answer to start recording
  RECORDING: "recording",
  FINISHED: "finished",
  /** Human only: question shown, no TTS; user clicks "Start Test" to begin session (timer + recording start). */
  READY: "ready",
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

/** Flatten parts to steps (questions or shadowing steps). */
export function getFlatQuestions(parts) {
  if (!Array.isArray(parts)) return [];
  return parts.flatMap((p) => p.questions || p.steps || []);
}

export const useSpeakingSessionStore = create((set, get) => ({
  testId: null,
  parts: [],
  /** "textToSpeech" | "shadowing" */
  mode: "textToSpeech",
  currentStep: 0,
  status: SESSION_STATUS.IDLE,
  recordingResults: [],
  stepStartedAt: null,
  nextRequested: false,
  /** When true, next setRecordingResult will save and set FINISHED (deferred finish for Speaking/Shadowing). */
  finishRequested: false,

  getFlatQuestions: () => getFlatQuestions(get().parts),
  getTotalSteps: () => getFlatQuestions(get().parts).length,
  getCurrentQuestion: () => {
    const steps = getFlatQuestions(get().parts);
    const step = steps[get().currentStep];
    if (!step) return null;
    return {
      id: step.id,
      question: step.question ?? step.phrase,
      durationSec: step.durationSec,
      instruction: step.instruction ?? null,
    };
  },
  getCurrentYoutubeUrl: () => {
    const steps = getFlatQuestions(get().parts);
    const step = steps[get().currentStep];
    return step?.youtube_url ?? null;
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

  initSession: (testId, parts, options = {}) => {
    const list = Array.isArray(parts) ? parts : [];
    const mode = options.mode === "shadowing" ? "shadowing" : options.mode === "human" ? "human" : "textToSpeech";
    set({
      testId: testId ?? null,
      parts: list,
      mode,
      currentStep: 0,
      status: SESSION_STATUS.IDLE,
      recordingResults: [],
      stepStartedAt: null,
      nextRequested: false,
      finishRequested: false,
    });
  },

  /** Start session: textToSpeech -> reading_question; shadowing -> watching; human -> ready (no TTS). */
  startSession: () => {
    const flat = getFlatQuestions(get().parts);
    const mode = get().mode;
    if (flat.length === 0) {
      set({ status: SESSION_STATUS.FINISHED });
      return;
    }
    const status =
      mode === "shadowing"
        ? SESSION_STATUS.WATCHING
        : mode === "human"
          ? SESSION_STATUS.READY
          : SESSION_STATUS.READING_QUESTION;
    set({
      currentStep: 0,
      stepStartedAt: null,
      status,
    });
  },

  /** Shadowing only: user clicked Answer -> start recording and timer. */
  startRecordingForCurrentStep: () => {
    set({ status: SESSION_STATUS.RECORDING, stepStartedAt: Date.now() });
  },

  /** Called when TTS finished reading the current question; starts timer and recording. */
  ttsEndedForCurrentStep: () => {
    set({ status: SESSION_STATUS.RECORDING, stepStartedAt: Date.now() });
  },

  setRecordingResult: (stepIndex, blob) => {
    const { parts: p, recordingResults, mode, finishRequested } = get();
    if (mode === "human") return; // Human uses full-session recording; result set via setHumanSessionRecordingResult
    const questions = getFlatQuestions(p);
    const question = questions[stepIndex];
    const audioUrl = blob ? URL.createObjectURL(blob) : null;
    const newResult = {
      questionId: question?.id ?? `step-${stepIndex}`,
      questionText: question?.question ?? question?.phrase ?? "",
      audioUrl,
      blob,
    };
    const nextResults = [...recordingResults];
    nextResults[stepIndex] = newResult;
    const total = questions.length;
    const isLast = stepIndex >= total - 1;

    if (finishRequested || isLast) {
      set({
        recordingResults: nextResults,
        currentStep: stepIndex + 1,
        status: SESSION_STATUS.FINISHED,
        stepStartedAt: null,
        finishRequested: false,
        nextRequested: false,
      });
    } else {
      const nextStatus =
        get().mode === "shadowing"
          ? SESSION_STATUS.WATCHING
          : SESSION_STATUS.READING_QUESTION;
      set({
        recordingResults: nextResults,
        currentStep: stepIndex + 1,
        status: nextStatus,
        stepStartedAt: null,
      });
    }
  },

  /** Human only: save single full-session recording and mark session finished. */
  setHumanSessionRecordingResult: (blob) => {
    const audioUrl = blob ? URL.createObjectURL(blob) : null;
    set({
      recordingResults: [
        {
          questionId: "human-full-session",
          questionText: "Full session recording",
          audioUrl,
          blob,
        },
      ],
      status: SESSION_STATUS.FINISHED,
      stepStartedAt: null,
      nextRequested: false,
    });
  },

  /** Human only: advance to next question without stopping recording. */
  nextQuestionHuman: () => {
    const flat = getFlatQuestions(get().parts);
    const { currentStep } = get();
    if (currentStep >= flat.length - 1) return;
    set({ currentStep: currentStep + 1 });
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
    if (state.mode === "human") {
      set({ nextRequested: true });
      return;
    }
    if (state.status !== SESSION_STATUS.RECORDING) {
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
      return;
    }
    set({ nextRequested: true, finishRequested: true });
    return;
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
      mode: "textToSpeech",
      currentStep: 0,
      status: SESSION_STATUS.IDLE,
      recordingResults: [],
      stepStartedAt: null,
      nextRequested: false,
      finishRequested: false,
    });
  },
}));

export const SESSION_STATUS_IDLE = SESSION_STATUS.IDLE;
export const SESSION_STATUS_READING_QUESTION = SESSION_STATUS.READING_QUESTION;
export const SESSION_STATUS_WATCHING = SESSION_STATUS.WATCHING;
export const SESSION_STATUS_RECORDING = SESSION_STATUS.RECORDING;
export const SESSION_STATUS_FINISHED = SESSION_STATUS.FINISHED;
export const SESSION_STATUS_READY = SESSION_STATUS.READY;
export { SESSION_STATUS };

export { SPEAKING_RESULT_STORAGE_KEY };
export default useSpeakingSessionStore;
