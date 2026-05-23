/**
 * IELTS vs CEFR scoring helpers for reading/listening practice.
 */

export const CEFR_TOTAL_QUESTIONS = 35;
export const IELTS_SCORE_SCALE = 40;

/** @param {object|null|undefined} test */
export function isCefrTest(test) {
  return test?.is_cefr === true;
}

/**
 * Prefer user_attempts.is_cefr when set; otherwise infer from test/writing metadata.
 * @param {{ attempt?: object|null, test?: object|null }} sources
 */
export function resolveIsCefr({ attempt, test } = {}) {
  if (attempt?.is_cefr === true) return true;
  if (attempt?.is_cefr === false) return false;
  return isCefrTest(test);
}

/** @param {object|null|undefined} test */
export function getExamProgramLabel(test) {
  return isCefrTest(test) ? "CEFR" : "IELTS";
}

/** @param {number|string|null|undefined} score */
export function parseIeltsBand(score) {
  if (score == null || score === "") return null;
  const n = parseFloat(score);
  return Number.isFinite(n) ? n : null;
}

/**
 * Format a score for dashboard cards (IELTS band or CEFR level).
 * @param {number|string|null|undefined} score
 * @param {boolean} isCefr
 */
export function formatDashboardScore(score, isCefr = false) {
  if (score == null || score === "") return null;
  if (isCefr) return formatTestScore(score, true);
  const band = parseIeltsBand(score);
  return band != null ? band.toFixed(1) : null;
}

/** @param {object|null|undefined} test */
export function getTestQuestionTotal(test) {
  if (isCefrTest(test)) return CEFR_TOTAL_QUESTIONS;
  const qty = test?.question_quantity;
  return typeof qty === "number" && qty > 0 ? qty : null;
}

/**
 * @param {number|string|null|undefined} score
 * @param {boolean} isCefr
 */
export function formatTestScore(score, isCefr = false) {
  if (score == null || score === "") return isCefr ? "—" : "0.0";
  if (isCefr) return String(score).trim().toUpperCase();
  const n = parseFloat(score);
  return Number.isFinite(n) ? n.toFixed(1) : "0.0";
}

/**
 * @param {number} correctCount
 * @param {number} totalQuestions - stored total (35 for CEFR)
 * @param {boolean} isCefr
 */
export function getCorrectPercentage(correctCount, totalQuestions, isCefr = false) {
  const denominator = isCefr
    ? CEFR_TOTAL_QUESTIONS
    : totalQuestions > 0
      ? totalQuestions
      : 0;
  if (!denominator) return 0;
  return Math.round((correctCount / denominator) * 100);
}

const cefrBandsFromCorrect = [
  { min: 33, level: "C2" },
  { min: 29, level: "C1" },
  { min: 25, level: "B2" },
  { min: 21, level: "B1" },
  { min: 16, level: "A2" },
  { min: 0, level: "A1" },
];

const readingBands = [
  { min: 39, band: 9 },
  { min: 37, band: 8.5 },
  { min: 35, band: 8 },
  { min: 33, band: 7.5 },
  { min: 30, band: 7 },
  { min: 27, band: 6.5 },
  { min: 23, band: 6 },
  { min: 19, band: 5.5 },
  { min: 15, band: 5 },
  { min: 13, band: 4.5 },
  { min: 10, band: 4 },
  { min: 9, band: 3.5 },
  { min: 7, band: 3 },
  { min: 5, band: 2.5 },
  { min: 3, band: 2 },
  { min: 2, band: 1.5 },
  { min: 1, band: 1 },
  { min: 0, band: 0 },
];

const listeningBands = [
  { min: 39, band: 9 },
  { min: 37, band: 8.5 },
  { min: 35, band: 8 },
  { min: 33, band: 7.5 },
  { min: 30, band: 7 },
  { min: 26, band: 6.5 },
  { min: 23, band: 6 },
  { min: 18, band: 5.5 },
  { min: 16, band: 5 },
  { min: 13, band: 4.5 },
  { min: 10, band: 4 },
  { min: 9, band: 3.5 },
  { min: 7, band: 3 },
  { min: 5, band: 2.5 },
  { min: 3, band: 2 },
  { min: 2, band: 1.5 },
  { min: 1, band: 1 },
  { min: 0, band: 0 },
];

/**
 * @param {number} correctCount
 * @param {number} totalQuestions - actual counted questions (IELTS) or 35 (CEFR store total)
 * @param {'reading'|'listening'} type
 * @param {boolean} isCefr
 * @returns {number|string}
 */
export function calculateTestScoreValue(correctCount, totalQuestions, type, isCefr = false) {
  if (isCefr) {
    const capped = Math.min(Math.max(0, correctCount), CEFR_TOTAL_QUESTIONS);
    return cefrBandsFromCorrect.find((b) => capped >= b.min)?.level || "A1";
  }

  if (totalQuestions === 0) return 0.0;

  const normalizedScore = Math.round((correctCount / totalQuestions) * IELTS_SCORE_SCALE);
  const bands = type === "reading" ? readingBands : listeningBands;
  return bands.find((b) => normalizedScore >= b.min)?.band ?? 0.0;
}

/**
 * Merge practice/result payload with program metadata for localStorage.
 * @param {string|number} testId
 * @param {object} data
 * @param {object|null|undefined} testMeta
 */
export function buildPracticeStoragePayload(testId, data, testMeta = {}) {
  const isCefr = isCefrTest(testMeta);
  return {
    testId,
    ...data,
    is_cefr: isCefr,
    total_questions: isCefr
      ? CEFR_TOTAL_QUESTIONS
      : data.total_questions ?? testMeta?.question_quantity ?? null,
  };
}
