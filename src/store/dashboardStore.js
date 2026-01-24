import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import supabase from '@/lib/supabase';

export const useDashboardStore = create(
  persist(
    (set, get) => ({
      // --- State ---
      attempts: [],
      completions: {}, // { [testId]: { isCompleted: true, attempt: {...} } }
      scores: { listening: null, reading: null, average: null },
      loading: false,
      error: null,
      lastFetched: null,
      cacheTimeout: 5 * 60 * 1000, // 5 minutes

      // Fetch all dashboard data in one optimized query with join
      fetchDashboardData: async (userId, forceRefresh = false) => {
        const state = get();
        
        if (!userId) {
          set({ 
            attempts: [], 
            completions: {},
            scores: { listening: null, reading: null, average: null }, 
            loading: false 
          });
          return;
        }

        // Check cache validity
        const now = Date.now();
        const shouldFetch = 
          forceRefresh || 
          state.attempts.length === 0 || 
          !state.lastFetched || 
          (now - state.lastFetched) > state.cacheTimeout;

        if (!shouldFetch && !state.loading) {
          return {
            attempts: state.attempts,
            completions: state.completions,
            scores: state.scores,
          };
        }

        // Prevent concurrent fetches
        if (state.loading) {
          return {
            attempts: state.attempts,
            completions: state.completions,
            scores: state.scores,
          };
        }

        try {
          set({ loading: true, error: null });

          // Fetch attempts first (join syntax requires FK relationships which may not be configured)
          const { data: attemptsData, error: attemptsError } = await supabase
            .from('user_attempts')
            .select('id, test_id, score, time_taken, total_questions, correct_answers, created_at, completed_at')
            .eq('user_id', userId)
            .order('completed_at', { ascending: false });

          if (attemptsError) {
            console.error('[dashboardStore] Error fetching attempts:', attemptsError);
            set({ 
              attempts: [], 
              completions: {},
              loading: false,
              scores: { listening: null, reading: null, average: null }
            });
            return { attempts: [], completions: {}, scores: { listening: null, reading: null, average: null } };
          }

          const attempts = Array.isArray(attemptsData) ? attemptsData : [];

          // Get unique test IDs and fetch test metadata in parallel
          const testIds = [...new Set(attempts.map(a => a.test_id).filter(Boolean))];
          let testTypesMap = {};
          
          if (testIds.length > 0) {
            const { data: testsData, error: testsError } = await supabase
              .from('test')
              .select('id, title, type, difficulty')
              .in('id', testIds);

            if (testsError) {
              console.warn('[dashboardStore] Error fetching test metadata:', testsError);
              // Continue without test metadata - attempts will still work
            } else if (testsData) {
              testsData.forEach(test => {
                testTypesMap[test.id] = {
                  type: test.type,
                  title: test.title,
                  difficulty: test.difficulty
                };
              });
            }
          }

          // Build completions map: test_id -> latest attempt
          const completions = {};
          attempts.forEach(attempt => {
            const testId = attempt.test_id;
            if (testId) {
              // Keep only the latest attempt per test (already sorted by completed_at DESC)
              if (!completions[testId] || 
                  new Date(attempt.completed_at || attempt.created_at) > 
                  new Date(completions[testId].attempt.completed_at || completions[testId].attempt.created_at)) {
                completions[testId] = {
                  isCompleted: true,
                  attempt: {
                    id: attempt.id,
                    test_id: attempt.test_id,
                    score: attempt.score,
                    correct_answers: attempt.correct_answers,
                    total_questions: attempt.total_questions,
                    time_taken: attempt.time_taken,
                    completed_at: attempt.completed_at,
                    created_at: attempt.created_at,
                  }
                };
              }
            }
          });

          // Add test type and metadata to each attempt
          const attemptsWithType = attempts.map(attempt => ({
            ...attempt,
            testType: testTypesMap[attempt.test_id]?.type || null,
            testTitle: testTypesMap[attempt.test_id]?.title || null,
            testDifficulty: testTypesMap[attempt.test_id]?.difficulty || null,
          }));

          // Calculate latest scores for listening and reading
          const listeningAttempts = attemptsWithType.filter(
            (a) => a.testType === 'listening'
          );
          const readingAttempts = attemptsWithType.filter(
            (a) => a.testType === 'reading'
          );

          const lastListening = listeningAttempts[0]?.score ?? null;
          const lastReading = readingAttempts[0]?.score ?? null;

          const latestScores = [lastListening, lastReading].filter(s => s !== null && s !== undefined);
          const averageScore = latestScores.length > 0
            ? latestScores.reduce((a, b) => a + b, 0) / latestScores.length
            : null;

          const scores = {
            listening: lastListening,
            reading: lastReading,
            average: averageScore ? Number(averageScore.toFixed(1)) : null,
          };

          set({
            attempts: attemptsWithType,
            completions,
            scores,
            loading: false,
            lastFetched: now,
            error: null,
          });

          return { attempts: attemptsWithType, completions, scores };
        } catch (error) {
          console.error('[dashboardStore] Error in fetchDashboardData:', error);
          set({ 
            attempts: [], 
            completions: {},
            loading: false,
            scores: { listening: null, reading: null, average: null },
            error: error.message
          });
          return { 
            attempts: [], 
            completions: {},
            scores: { listening: null, reading: null, average: null } 
          };
        }
      },

      // Get completion status for a specific test
      getCompletion: (testId) => {
        const completions = get().completions || {};
        return completions[testId] || null;
      },

      // Clear dashboard data (useful on logout)
      clearDashboardData: () => {
        set({ 
          attempts: [], 
          completions: {},
          scores: { listening: null, reading: null, average: null },
          lastFetched: null,
          error: null
        });
      },

      // Invalidate cache (force refresh on next fetch)
      invalidateCache: () => {
        set({ lastFetched: null });
      },
    }),
    {
      name: 'dashboard-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        attempts: state.attempts,
        completions: state.completions,
        scores: state.scores,
        lastFetched: state.lastFetched,
      }),
    }
  )
);

