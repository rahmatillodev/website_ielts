/**
 * Analytics store for fetching and managing user analytics data
 * 
 * TEMPORARY: Mock data is enabled for testing purposes.
 * Set USE_MOCK_DATA to false before production deployment.
 */

import { create } from 'zustand';
import supabase from '@/lib/supabase';

// TEMPORARY: Mock data flag for testing (set to false to disable)
// TODO: Set USE_MOCK_DATA = false before production deployment
const USE_MOCK_DATA = true;

/**
 * Mock ma'lumotlarni 10 barobar ko'paytirilgan varianti (100 ta attempt)
 */
const generateMockData = (targetBandScore = 7.5) => {
  const allAttempts = [];
  const allAnswers = [];
  const questionTypes = [
    'multiple_choice', 'table', 'matching_information', 
    'fill_in_blanks', 'true_false_not_given', 'drag_drop', 
    'yes_no_not_given', 'map', 'table_completion'
  ];

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  // 1. Attempts yaratish (50 Reading + 50 Listening)
  for (let i = 1; i <= 100; i++) {
    const isReading = i <= 50;
    const type = isReading ? 'reading' : 'listening';
    
    // Tasodifiy ballar (4.0 dan 9.0 gacha)
    const score = Math.round((Math.random() * 5 + 4) * 2) / 2;
    // Tasodifiy vaqt (20 kundan 1 kungacha orqaga)
    const completedAt = new Date(now - Math.floor(Math.random() * 60) * dayMs).toISOString();

    allAttempts.push({
      id: i.toString(),
      score: score,
      completed_at: completedAt,
      // time_taken is in seconds: Reading ~3600s (60 min), Listening ~2100s (35 min)
      time_taken: isReading ? (60 - Math.floor(i / 10)) * 60 : (35 - Math.floor(i / 15)) * 60,
      test: {
        type: type,
        difficulty: score > 7 ? 'hard' : 'medium'
      }
    });

    // 2. Har bir attempt uchun 5-8 tadan tasodifiy javoblar yaratish
    const numAnswers = Math.floor(Math.random() * 4) + 5; 
    for (let j = 0; j < numAnswers; j++) {
      const qType = questionTypes[Math.floor(Math.random() * questionTypes.length)];
      
      allAnswers.push({
        attempt_id: i.toString(),
        question_type: qType,
        // Balga qarab to'g'ri javob ehtimolligini belgilash
        is_correct: Math.random() < (score / 10 + 0.1), 
        part_id: !isReading ? (Math.floor(Math.random() * 4) + 1).toString() : null,
        // Listening uchun savol raqami (Partlarni aniqlash uchun)
        question_id: !isReading ? (Math.floor(Math.random() * 40) + 1).toString() : null
      });
    }
  }

  // Sanalari bo'yicha tartiblab chiqamiz (Newest first)
  allAttempts.sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at));

  return { allAttempts, allAnswers };
};

export const useAnalyticsStore = create((set, get) => ({
  // State
  analyticsData: null,
  loading: false,
  error: null,
  lastFetched: null,
  cacheDuration: 5 * 60 * 1000, // 5 minutes

  // Main function to fetch all analytics data
  fetchAnalyticsData: async (userId, forceRefresh = false) => {
    const state = get();

    if (!userId) {
      set({
        analyticsData: null,
        loading: false,
        error: 'User ID is required',
      });
      return null;
    }

    // Check cache
    const now = Date.now();
    const isStale = !state.lastFetched || (now - state.lastFetched) > state.cacheDuration;
    
    if (!forceRefresh && !isStale && state.analyticsData) {
      return state.analyticsData;
    }

    // Prevent concurrent fetches
    if (state.loading) {
      return state.analyticsData;
    }

    set({ loading: true, error: null });

    try {
      // TEMPORARY: Use mock data for testing
      if (!USE_MOCK_DATA) {
        const { allAttempts: mockAttempts, allAnswers: mockAnswers } = generateMockData();
        
        // Fetch user profile for target score
        const { data: userProfile } = await supabase
          .from('users')
          .select('target_band_score')
          .eq('id', userId)
          .maybeSingle();

        const targetBandScore = userProfile?.target_band_score || 7.5;
        
        // Calculate analytics with mock data
        const analytics = calculateAnalytics(mockAttempts, mockAnswers, targetBandScore);
        
        // Store userAnswers for filtering purposes
        analytics.userAnswers = mockAnswers;
        
        set({
          analyticsData: analytics,
          loading: false,
          error: null,
          lastFetched: Date.now(),
        });
        
        return analytics;
      }

      // Fetch all attempts with test metadata
      const { data: attemptsData, error: attemptsError } = await supabase
      .from('user_attempts')
      .select(`
        id,
        test_id,
        score,
        total_questions,
        correct_answers,
        time_taken,
        completed_at,
        created_at,
        test:test_id (
          id,
          title,
          type,
          difficulty
        )
      `)
      .eq('user_id', userId)
      .not('test_id', 'is', null) 
      .order('completed_at', { ascending: false });
    


      if (attemptsError) throw attemptsError;

      const attempts = Array.isArray(attemptsData) ? attemptsData : [];

      // Fetch user answers with question types for all attempts
      const attemptIds = attempts.map(a => a.id).filter(Boolean);
      let userAnswersData = [];

      if (attemptIds.length > 0) {
        const { data: answersData, error: answersError } = await supabase
          .from('user_answers')
          .select('attempt_id, question_id, is_correct, question_type')
          .in('attempt_id', attemptIds);

        if (answersError) {
          console.warn('[analyticsStore] Error fetching user answers:', answersError);
        } else {
          userAnswersData = Array.isArray(answersData) ? answersData : [];
        }
      }

      // Fetch user profile for target score
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('target_band_score')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.warn('[analyticsStore] Error fetching user profile:', profileError);
      }

      // Calculate analytics
      const analytics = calculateAnalytics(attempts, userAnswersData, userProfile?.target_band_score || 7.5);
      
      // Store userAnswers for filtering purposes
      analytics.userAnswers = userAnswersData;

      set({
        analyticsData: analytics,
        loading: false,
        error: null,
        lastFetched: now,
      });

      return analytics;
    } catch (error) {
      console.error('[analyticsStore] Error fetching analytics:', error);
      set({
        loading: false,
        error: error.message,
        analyticsData: null,
      });
      return null;
    }
  },

  // Clear analytics data
  clearAnalyticsData: () => {
    set({
      analyticsData: null,
      loading: false,
      error: null,
      lastFetched: null,
    });
  },
}));

/**
 * Round a score to the nearest 0.5 increment (valid IELTS band score)
 * Examples: 6.3 -> 6.5, 8.1 -> 8.0, 7.25 -> 7.5
 */
function roundToHalf(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return null;
  }
  return Math.round(value * 2) / 2;
}

/**
 * Calculate all analytics metrics from attempts and answers
 * Exported for use in filtering scenarios
 */
export function calculateAnalytics(attempts, userAnswers, targetBandScore = 7.5) {
  if (!attempts || attempts.length === 0) {
    return {
      totalTests: 0,
      overallBand: null,
      readingAvg: null,
      listeningAvg: null,
      totalPracticeHours: 0,
      totalPracticeMinutes: 0,
      scoreTrends: [],
      questionTypePerformance: {},
      listeningPartPerformance: {},
      readingBreakdown: {},
      listeningBreakdown: {},
      insights: {
        strongestArea: null,
        needsFocus: null,
      },
      targetBandScore,
    };
  }

  // Separate reading and listening attempts
  const readingAttempts = attempts.filter(a => a.test?.type === 'reading');
  const listeningAttempts = attempts.filter(a => a.test?.type === 'listening');

  // Calculate averages (rounded to nearest 0.5 for valid IELTS scores)
  const readingAvgRaw = readingAttempts.length > 0
    ? readingAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / readingAttempts.length
    : null;
  const readingAvg = roundToHalf(readingAvgRaw);

  const listeningAvgRaw = listeningAttempts.length > 0
    ? listeningAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / listeningAttempts.length
    : null;
  const listeningAvg = roundToHalf(listeningAvgRaw);

  // Calculate overall band (average of latest reading and listening, rounded to nearest 0.5)
  const latestReading = readingAttempts[0]?.score || null;
  const latestListening = listeningAttempts[0]?.score || null;
  const overallBandRaw = (latestReading !== null && latestListening !== null)
    ? (latestReading + latestListening) / 2
    : (latestReading !== null ? latestReading : latestListening);
  const overallBand = roundToHalf(overallBandRaw);

  // Calculate total practice time (time_taken is in seconds)
  const totalPracticeSeconds = attempts.reduce((sum, a) => sum + (a.time_taken || 0), 0);
  const totalPracticeMinutes = Math.floor(totalPracticeSeconds / 60);
  const totalPracticeHours = Math.floor(totalPracticeMinutes / 60);
  const remainingMinutes = totalPracticeMinutes % 60;

  // Get score trends (default to last 5 tests for each type, but can be filtered in UI)
  const scoreTrends = getScoreTrends(readingAttempts, listeningAttempts, 5);

  // Calculate question type performance (7 analytics types)
  const questionTypePerformance = calculateAnalyticsQuestionTypePerformance(userAnswers);

  // Calculate listening part performance (we'll need to infer from question numbers or use a different approach)
  const listeningPartPerformance = calculateListeningPartPerformance(listeningAttempts, userAnswers);

  // Calculate breakdowns (7 analytics types)
  const readingBreakdown = calculateAnalyticsQuestionTypePerformance(
    userAnswers.filter(a => readingAttempts.some(rt => rt.id === a.attempt_id))
  );
  const listeningBreakdown = calculateAnalyticsQuestionTypePerformance(
    userAnswers.filter(a => listeningAttempts.some(lt => lt.id === a.attempt_id))
  );

  // Generate insights
  const insights = generateInsights(questionTypePerformance, readingBreakdown, listeningBreakdown);

  return {
    totalTests: attempts.length,
    overallBand: overallBand,
    readingAvg: readingAvg,
    listeningAvg: listeningAvg,
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
    targetBandScore,
  };
}

/**
 * Format date to "day.month" format (e.g., "01.01", "15.03")
 */
export function formatDateToDayMonth(dateString) {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}`;
}

/**
 * Get date key for grouping (YYYY-MM-DD format)
 */
export function getDateKey(dateString) {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get score trends grouped by day
 * For each day, gets the best (highest) score for reading and listening separately
 * Returns data with dates in "day.month" format
 */
function getScoreTrends(readingAttempts, listeningAttempts, limit = 5) {
  // Group reading attempts by day and get best score per day
  const readingByDay = {};
  readingAttempts.forEach(attempt => {
    if (!attempt.completed_at) return;
    const dateKey = getDateKey(attempt.completed_at);
    if (!readingByDay[dateKey] || attempt.score > readingByDay[dateKey].score) {
      readingByDay[dateKey] = {
        date: attempt.completed_at,
        score: attempt.score,
      };
    }
  });

  // Group listening attempts by day and get best score per day
  const listeningByDay = {};
  listeningAttempts.forEach(attempt => {
    if (!attempt.completed_at) return;
    const dateKey = getDateKey(attempt.completed_at);
    if (!listeningByDay[dateKey] || attempt.score > listeningByDay[dateKey].score) {
      listeningByDay[dateKey] = {
        date: attempt.completed_at,
        score: attempt.score,
      };
    }
  });

  // Get all unique dates and sort them (oldest to newest)
  const allDates = new Set([
    ...Object.keys(readingByDay),
    ...Object.keys(listeningByDay),
  ]);
  const sortedDates = Array.from(allDates).sort((a, b) => a.localeCompare(b));

  // Apply limit: take last N days if limit is specified
  const datesToShow = limit === 'all' || limit >= sortedDates.length
    ? sortedDates
    : sortedDates.slice(-limit);

  // Create separate arrays for reading and listening
  const readingTrends = datesToShow.map((dateKey, index) => {
    const dayData = readingByDay[dateKey];
    return {
      testNumber: index + 1,
      date: dayData?.date || null,
      dateKey: dateKey,
      dateLabel: formatDateToDayMonth(dayData?.date || dateKey),
      score: dayData?.score || null,
    };
  });

  const listeningTrends = datesToShow.map((dateKey, index) => {
    const dayData = listeningByDay[dateKey];
    return {
      testNumber: index + 1,
      date: dayData?.date || null,
      dateKey: dateKey,
      dateLabel: formatDateToDayMonth(dayData?.date || dateKey),
      score: dayData?.score || null,
    };
  });

  // Create combined format with dates
  const combinedTrends = datesToShow.map((dateKey, index) => {
    const readingDayData = readingByDay[dateKey];
    const listeningDayData = listeningByDay[dateKey];
    
    // Use the date from whichever exists, or fallback to dateKey
    const date = readingDayData?.date || listeningDayData?.date || dateKey;
    
    return {
      testNumber: index + 1,
      date: date,
      dateKey: dateKey,
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

// ANALYTICS_QUESTION_TYPES: collapsed 7 groups for analytics reporting
const ANALYTICS_QUESTION_TYPES = [
  'multiple_choice',  // multiple_choice + multiple_answers
  'matching',         // 'table' + 'matching_information'
  'summary',          // 'fill_in_blanks' + 'drag_drop'
  'true_false_not_given',
  'yes_no_not_given',
  'map',
  'table_completion',
];

// Maps user answer question_type => analytics group name (for 7 groups)
function analyticsQuestionTypeGroup(type) {
  if (type === 'table' || type === 'matching_information') return 'matching';
  if (type === 'fill_in_blanks' || type === 'drag_drop') return 'summary';
  if (type === 'multiple_answers') return 'multiple_choice';  
  // direct 1:1 for other types:
  if (ANALYTICS_QUESTION_TYPES.includes(type)) return type;
  return 'other';
}

/**
 * Calculate performance by analytics question type (7 grouped types)
 * Collapses 9 enum types into 7 groups for analytics reporting.
 */
function calculateAnalyticsQuestionTypePerformance(userAnswers) {
  // Initialize all analytics types with 0 values
  const typeStats = {};
  ANALYTICS_QUESTION_TYPES.forEach((type) => {
    typeStats[type] = {
      total: 0,
      correct: 0,
      accuracy: 0,
    };
  });

  // Process actual answers
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

  // Calculate accuracy percentages
  Object.keys(typeStats).forEach((type) => {
    const stats = typeStats[type];
    stats.accuracy = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
  });

  return typeStats;
}

/**
 * Calculate listening part performance
 * Note: This is a simplified version. For full implementation, we'd need part_id in user_answers
 */
function calculateListeningPartPerformance(listeningAttempts, userAnswers) {
  // Group answers by attempt and infer parts from question numbers
  // Part 1: questions 1-10, Part 2: 11-20, Part 3: 21-30, Part 4: 31-40
  const partStats = {
    'Part 1': { total: 0, correct: 0, accuracy: 0 },
    'Part 2': { total: 0, correct: 0, accuracy: 0 },
    'Part 3': { total: 0, correct: 0, accuracy: 0 },
    'Part 4': { total: 0, correct: 0, accuracy: 0 },
  };

  const listeningAttemptIds = new Set(listeningAttempts.map(a => a.id));

  userAnswers.forEach((answer) => {
    if (!listeningAttemptIds.has(answer.attempt_id)) return;

    const questionNum = parseInt(answer.question_id);
    if (isNaN(questionNum)) return;

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

  // Calculate accuracy
  Object.keys(partStats).forEach((part) => {
    const stats = partStats[part];
    stats.accuracy = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
  });

  return partStats;
}

/**
 * Generate insights (strongest area and needs focus), using analytics groupings
 */
// analyticsStore.js ichidagi generateInsights funksiyasini almashtiring:

function generateInsights(questionTypePerformance, readingBreakdown, listeningBreakdown) {
  const getCategorizedList = (breakdown, categoryName) => {
    return Object.keys(breakdown)
      .filter(type => breakdown[type].total > 0) // Faqat kamida 1 marta ishlanganlar
      .map(type => ({
        category: categoryName,
        type: type,
        displayType: formatAnalyticsQuestionTypeName(type),
        accuracy: breakdown[type].accuracy,
        total: breakdown[type].total,
        correct: breakdown[type].correct,
        status: breakdown[type].accuracy >= 75 ? 'strong' : (breakdown[type].accuracy < 50 ? 'weak' : 'average')
      }));
  };

  const readingInsights = getCategorizedList(readingBreakdown, 'Reading');
  const listeningInsights = getCategorizedList(listeningBreakdown, 'Listening');

  // Eng kuchli va eng zaifni aniqlash (eski komponentlar buzilmasligi uchun)
  const all = [...readingInsights, ...listeningInsights].sort((a, b) => b.accuracy - a.accuracy);

  return {
    allInsights: [...readingInsights, ...listeningInsights],
    strongestArea: all.length > 0 ? all[0] : null,
    needsFocus: all.length > 0 ? [...all].reverse().find(i => i.total >= 3) : null,
  };
}

/**
 * Format analytics group name for display (7 groups)
 * mapping:
 *   matching:  Matching Headings, Matching Information
 *   summary:   Fill in the Blanks, Drag and Drop
 *   Other groups use singular names
 */
function formatAnalyticsQuestionTypeName(type) {
  const analyticsTypeMap = {
    'multiple_choice': 'Multiple Choice',
    'matching': 'Matching (Headings & Information)', // combined
    'summary': 'Summary Completion (Blanks and Drag & Drop)', // combined
    'true_false_not_given': 'True / False / Not Given',
    'yes_no_not_given': 'Yes / No / Not Given',
    'map': 'Map Labelling',
    'table_completion': 'Table Completion',
    'other': 'Other',
  };
  return analyticsTypeMap[type] || (type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
}