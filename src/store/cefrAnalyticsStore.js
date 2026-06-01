/**
 * CEFR-only analytics store. Fetches and caches CEFR test results separately from IELTS analytics.
 */

import { create } from 'zustand';
import supabase from '@/lib/supabase';
import {
  calculateCefrAnalytics,
  filterCefrAttempts,
  DEFAULT_TARGET_CEFR_LEVEL,
} from '@/lib/cefrAnalytics';
import { resolveIsCefr } from '@/lib/testScoring';

const DEFAULT_ATTEMPTS_PAGE_SIZE = 100;
const ANSWERS_BATCH_SIZE = 100;

export const useCefrAnalyticsStore = create((set, get) => ({
  analyticsData: null,
  loading: false,
  error: null,
  lastFetched: null,
  cacheDuration: 5 * 60 * 1000,

  fetchCefrAnalyticsData: async (userId, forceRefresh = false, options = {}) => {
    const state = get();
    const attemptsPage = Number.isFinite(options.page) ? options.page : 0;
    const attemptsPageSize = Number.isFinite(options.pageSize)
      ? options.pageSize
      : DEFAULT_ATTEMPTS_PAGE_SIZE;
    const from = attemptsPage * attemptsPageSize;
    const to = from + attemptsPageSize - 1;
    const lookbackDays = Number.isFinite(options.lookbackDays) ? options.lookbackDays : 90;
    const startDate = new Date(
      Date.now() - lookbackDays * 24 * 60 * 60 * 1000
    ).toISOString();

    if (!userId) {
      set({
        analyticsData: null,
        loading: false,
        error: 'User ID is required',
      });
      return null;
    }

    const now = Date.now();
    const isStale =
      !state.lastFetched || now - state.lastFetched > state.cacheDuration;

    if (!forceRefresh && !isStale && state.analyticsData) {
      return state.analyticsData;
    }

    if (state.loading) {
      return state.analyticsData;
    }

    set({ loading: true, error: null });

    try {
      const { data: attemptsData, error: attemptsError } = await supabase
        .from('user_attempts')
        .select(`
          id,
          test_id,
          writing_id,
          type,
          score,
          total_questions,
          correct_answers,
          time_taken,
          completed_at,
          created_at,
          is_cefr,
          test:test_id (
            id,
            title,
            is_mock,
            type,
            difficulty,
            is_cefr
          )
        `)
        .eq('user_id', userId)
        .or('test_id.not.is.null,writing_id.not.is.null')
        .gte('completed_at', startDate)
        .order('completed_at', { ascending: false })
        .range(from, to);

      if (attemptsError) throw attemptsError;

      const allAttempts = Array.isArray(attemptsData) ? attemptsData : [];
      const attempts = filterCefrAttempts(allAttempts);

      const attemptIds = attempts.map((a) => a.id).filter(Boolean);
      let userAnswersData = [];

      if (attemptIds.length > 0) {
        const chunks = [];
        for (let i = 0; i < attemptIds.length; i += ANSWERS_BATCH_SIZE) {
          chunks.push(attemptIds.slice(i, i + ANSWERS_BATCH_SIZE));
        }

        for (const chunk of chunks) {
          const { data: answersData, error: answersError } = await supabase
            .from('user_answers')
            .select('attempt_id, question_id, is_correct, question_type')
            .in('attempt_id', chunk);

          if (answersError) {
            console.warn('[cefrAnalyticsStore] Error fetching user answers:', answersError);
            continue;
          }

          if (Array.isArray(answersData)) {
            userAnswersData.push(...answersData);
          }
        }
      }

      const analytics = calculateCefrAnalytics(
        attempts,
        userAnswersData,
        DEFAULT_TARGET_CEFR_LEVEL
      );
      analytics.userAnswers = userAnswersData;

      set({
        analyticsData: analytics,
        loading: false,
        error: null,
        lastFetched: now,
      });

      return analytics;
    } catch (error) {
      console.error('[cefrAnalyticsStore] Error fetching analytics:', error);
      set({
        loading: false,
        error: error.message,
        analyticsData: null,
      });
      return null;
    }
  },

  clearCefrAnalyticsData: () => {
    set({
      analyticsData: null,
      loading: false,
      error: null,
      lastFetched: null,
    });
  },
}));

/** Re-export for pages that filter client-side after fetch */
export { resolveIsCefr, filterCefrAttempts };
