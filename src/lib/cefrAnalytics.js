/**
 * CEFR-only analytics calculations (A1–C2). Separate from IELTS analyticsStore.
 */

import { resolveIsCefr } from '@/lib/testScoring';

export const CEFR_LEVEL_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
export const DEFAULT_TARGET_CEFR_LEVEL = 'B2';

/** @param {string|null|undefined} level */
export function normalizeCefrLevel(level) {
  if (level == null || level === '') return null;
  const normalized = String(level).trim().toUpperCase();
  return CEFR_LEVEL_ORDER.includes(normalized) ? normalized : null;
}

/** @param {string|null|undefined} level */
export function cefrLevelToOrdinal(level) {
  const normalized = normalizeCefrLevel(level);
  if (!normalized) return null;
  return CEFR_LEVEL_ORDER.indexOf(normalized) + 1;
}

/** @param {number} ordinal 1–6 */
export function ordinalToCefrLevel(ordinal) {
  if (!Number.isFinite(ordinal)) return null;
  const rounded = Math.round(ordinal);
  const clamped = Math.max(1, Math.min(CEFR_LEVEL_ORDER.length, rounded));
  return CEFR_LEVEL_ORDER[clamped - 1];
}

/** @param {string[]} levels */
export function averageCefrLevel(levels) {
  const ordinals = (levels || [])
    .map(cefrLevelToOrdinal)
    .filter((n) => n != null);
  if (ordinals.length === 0) return null;
  const mean = ordinals.reduce((sum, n) => sum + n, 0) / ordinals.length;
  return ordinalToCefrLevel(mean);
}

/** @param {string|null|undefined} a @param {string|null|undefined} b */
export function compareCefrLevels(a, b) {
  const oa = cefrLevelToOrdinal(a) ?? 0;
  const ob = cefrLevelToOrdinal(b) ?? 0;
  return oa - ob;
}

/** @param {object[]} attempts */
export function filterCefrAttempts(attempts) {
  return (attempts || []).filter((attempt) =>
    resolveIsCefr({ attempt, test: attempt?.test })
  );
}

export function formatDateToDayMonth(dateString) {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}`;
}

export function getDateKey(dateString) {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const ANALYTICS_QUESTION_TYPES = [
  'multiple_choice',
  'matching',
  'summary',
  'true_false_not_given',
  'yes_no_not_given',
  'map',
  'table_completion',
];

function analyticsQuestionTypeGroup(type) {
  if (type === 'table' || type === 'matching_information') return 'matching';
  if (type === 'fill_in_blanks' || type === 'drag_drop') return 'summary';
  if (type === 'multiple_answers') return 'multiple_choice';
  if (ANALYTICS_QUESTION_TYPES.includes(type)) return type;
  return 'other';
}

function calculateAnalyticsQuestionTypePerformance(userAnswers) {
  const typeStats = {};
  ANALYTICS_QUESTION_TYPES.forEach((type) => {
    typeStats[type] = { total: 0, correct: 0, accuracy: 0 };
  });

  userAnswers.forEach((answer) => {
    const group = analyticsQuestionTypeGroup(answer.question_type || 'other');
    if (!typeStats[group]) {
      typeStats[group] = { total: 0, correct: 0, accuracy: 0 };
    }
    typeStats[group].total++;
    if (answer.is_correct) {
      typeStats[group].correct++;
    }
  });

  Object.keys(typeStats).forEach((type) => {
    const stats = typeStats[type];
    stats.accuracy = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
  });

  return typeStats;
}

function calculateListeningPartPerformance(listeningAttempts, userAnswers) {
  const partStats = {
    'Part 1': { total: 0, correct: 0, accuracy: 0 },
    'Part 2': { total: 0, correct: 0, accuracy: 0 },
    'Part 3': { total: 0, correct: 0, accuracy: 0 },
    'Part 4': { total: 0, correct: 0, accuracy: 0 },
  };

  const listeningAttemptIds = new Set(listeningAttempts.map((a) => a.id));

  userAnswers.forEach((answer) => {
    if (!listeningAttemptIds.has(answer.attempt_id)) return;

    const questionNum = parseInt(answer.question_id, 10);
    if (Number.isNaN(questionNum)) return;

    let partName = 'Part 1';
    if (questionNum >= 1 && questionNum <= 10) partName = 'Part 1';
    else if (questionNum >= 11 && questionNum <= 20) partName = 'Part 2';
    else if (questionNum >= 21 && questionNum <= 30) partName = 'Part 3';
    else if (questionNum >= 31 && questionNum <= 40) partName = 'Part 4';

    if (partStats[partName]) {
      partStats[partName].total++;
      if (answer.is_correct) {
        partStats[partName].correct++;
      }
    }
  });

  Object.keys(partStats).forEach((part) => {
    const stats = partStats[part];
    stats.accuracy = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
  });

  return partStats;
}

function formatAnalyticsQuestionTypeName(type) {
  const analyticsTypeMap = {
    multiple_choice: 'Multiple Choice',
    matching: 'Matching (Headings & Information)',
    summary: 'Summary Completion (Blanks and Drag & Drop)',
    true_false_not_given: 'True / False / Not Given',
    yes_no_not_given: 'Yes / No / Not Given',
    map: 'Map Labelling',
    table_completion: 'Table Completion',
    other: 'Other',
  };
  return (
    analyticsTypeMap[type] ||
    type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  );
}

function generateInsights(questionTypePerformance, readingBreakdown, listeningBreakdown) {
  const getCategorizedList = (breakdown, categoryName) =>
    Object.keys(breakdown)
      .filter((type) => breakdown[type].total > 0)
      .map((type) => ({
        category: categoryName,
        type,
        displayType: formatAnalyticsQuestionTypeName(type),
        accuracy: breakdown[type].accuracy,
        total: breakdown[type].total,
        correct: breakdown[type].correct,
        status:
          breakdown[type].accuracy >= 75
            ? 'strong'
            : breakdown[type].accuracy < 50
              ? 'weak'
              : 'average',
      }));

  const readingInsights = getCategorizedList(readingBreakdown, 'Reading');
  const listeningInsights = getCategorizedList(listeningBreakdown, 'Listening');
  const all = [...readingInsights, ...listeningInsights].sort(
    (a, b) => b.accuracy - a.accuracy
  );

  return {
    allInsights: [...readingInsights, ...listeningInsights],
    strongestArea: all.length > 0 ? all[0] : null,
    needsFocus: all.length > 0 ? [...all].reverse().find((i) => i.total >= 3) : null,
  };
}

function getCefrScoreTrends(readingAttempts, listeningAttempts, limit = 5) {
  const readingByDay = {};
  readingAttempts.forEach((attempt) => {
    if (!attempt.completed_at) return;
    const dateKey = getDateKey(attempt.completed_at);
    const level = normalizeCefrLevel(attempt.score);
    if (
      !readingByDay[dateKey] ||
      compareCefrLevels(level, readingByDay[dateKey].score) > 0
    ) {
      readingByDay[dateKey] = { date: attempt.completed_at, score: level };
    }
  });

  const listeningByDay = {};
  listeningAttempts.forEach((attempt) => {
    if (!attempt.completed_at) return;
    const dateKey = getDateKey(attempt.completed_at);
    const level = normalizeCefrLevel(attempt.score);
    if (
      !listeningByDay[dateKey] ||
      compareCefrLevels(level, listeningByDay[dateKey].score) > 0
    ) {
      listeningByDay[dateKey] = { date: attempt.completed_at, score: level };
    }
  });

  const allDates = new Set([
    ...Object.keys(readingByDay),
    ...Object.keys(listeningByDay),
  ]);
  const sortedDates = Array.from(allDates).sort((a, b) => a.localeCompare(b));

  const datesToShow =
    limit === 'all' || limit >= sortedDates.length
      ? sortedDates
      : sortedDates.slice(-limit);

  const readingTrends = datesToShow.map((dateKey, index) => {
    const dayData = readingByDay[dateKey];
    return {
      testNumber: index + 1,
      date: dayData?.date || null,
      dateKey,
      dateLabel: formatDateToDayMonth(dayData?.date || dateKey),
      score: dayData?.score || null,
    };
  });

  const listeningTrends = datesToShow.map((dateKey, index) => {
    const dayData = listeningByDay[dateKey];
    return {
      testNumber: index + 1,
      date: dayData?.date || null,
      dateKey,
      dateLabel: formatDateToDayMonth(dayData?.date || dateKey),
      score: dayData?.score || null,
    };
  });

  const combinedTrends = datesToShow.map((dateKey, index) => {
    const readingDayData = readingByDay[dateKey];
    const listeningDayData = listeningByDay[dateKey];
    const date = readingDayData?.date || listeningDayData?.date || dateKey;

    return {
      testNumber: index + 1,
      date,
      dateKey,
      dateLabel: formatDateToDayMonth(date),
      reading: readingDayData?.score || null,
      listening: listeningDayData?.score || null,
    };
  });

  return {
    reading: readingTrends,
    listening: listeningTrends,
    combined: combinedTrends,
  };
}

/**
 * @param {object[]} attempts - CEFR attempts only
 * @param {object[]} userAnswers
 * @param {string} targetCefrLevel
 */
export function calculateCefrAnalytics(
  attempts,
  userAnswers,
  targetCefrLevel = DEFAULT_TARGET_CEFR_LEVEL
) {
  const target = normalizeCefrLevel(targetCefrLevel) || DEFAULT_TARGET_CEFR_LEVEL;

  if (!attempts || attempts.length === 0) {
    return {
      totalTests: 0,
      overallLevel: null,
      readingAvg: null,
      listeningAvg: null,
      totalPracticeHours: 0,
      totalPracticeMinutes: 0,
      scoreTrends: { reading: [], listening: [], combined: [] },
      questionTypePerformance: {},
      listeningPartPerformance: {},
      readingBreakdown: {},
      listeningBreakdown: {},
      insights: { strongestArea: null, needsFocus: null, allInsights: [] },
      targetCefrLevel: target,
    };
  }

  const getAttemptType = (attempt) =>
    attempt?.type || attempt?.test?.type || (attempt?.writing_id ? 'writing' : null);

  const readingAttempts = attempts.filter((a) => getAttemptType(a) === 'reading');
  const listeningAttempts = attempts.filter((a) => getAttemptType(a) === 'listening');

  const readingAvg = averageCefrLevel(
    readingAttempts.map((a) => normalizeCefrLevel(a.score)).filter(Boolean)
  );
  const listeningAvg = averageCefrLevel(
    listeningAttempts.map((a) => normalizeCefrLevel(a.score)).filter(Boolean)
  );

  const latestReading = normalizeCefrLevel(readingAttempts[0]?.score);
  const latestListening = normalizeCefrLevel(listeningAttempts[0]?.score);
  const latestLevels = [latestReading, latestListening].filter(Boolean);
  const overallLevel =
    latestLevels.length > 0 ? averageCefrLevel(latestLevels) : null;

  const totalPracticeSeconds = attempts.reduce(
    (sum, a) => sum + (a.time_taken || 0),
    0
  );
  const totalPracticeMinutes = Math.floor(totalPracticeSeconds / 60);
  const totalPracticeHours = Math.floor(totalPracticeMinutes / 60);
  const remainingMinutes = totalPracticeMinutes % 60;

  const scoreTrends = getCefrScoreTrends(readingAttempts, listeningAttempts, 5);

  const questionTypePerformance =
    calculateAnalyticsQuestionTypePerformance(userAnswers);
  const listeningPartPerformance = calculateListeningPartPerformance(
    listeningAttempts,
    userAnswers
  );

  const readingBreakdown = calculateAnalyticsQuestionTypePerformance(
    userAnswers.filter((a) =>
      readingAttempts.some((rt) => rt.id === a.attempt_id)
    )
  );
  const listeningBreakdown = calculateAnalyticsQuestionTypePerformance(
    userAnswers.filter((a) =>
      listeningAttempts.some((lt) => lt.id === a.attempt_id)
    )
  );

  const insights = generateInsights(
    questionTypePerformance,
    readingBreakdown,
    listeningBreakdown
  );

  return {
    totalTests: attempts.length,
    overallLevel,
    readingAvg,
    listeningAvg,
    totalPracticeHours,
    totalPracticeMinutes: remainingMinutes,
    totalPracticeMinutesTotal: totalPracticeMinutes,
    scoreTrends,
    allAttempts: {
      reading: readingAttempts,
      listening: listeningAttempts,
    },
    questionTypePerformance,
    listeningPartPerformance,
    readingBreakdown,
    listeningBreakdown,
    insights,
    targetCefrLevel: target,
  };
}

export { getCefrScoreTrends };
