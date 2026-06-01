import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import supabase from '@/lib/supabase';
import {
  MOCK_ATTEMPT_SELECT,
  buildSpeakingAttemptsByTestId,
  buildTestTypeMap,
  fetchSpeakingAttemptsByTestIds,
  mergeAttemptsForClient,
  organizeMockTestSectionResults,
  resolveSpeakingAttemptForClient,
} from '@/utils/mockTestResults';

const COMPLETED_STATUSES = ['completed', 'checked', 'notified'];

/**
 * Custom hook for managing mock test history
 * Separates business logic from UI components
 */
export const useMockTestHistory = () => {
  const { userProfile } = useAuthStore();

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadHistory = useCallback(async () => {
    if (!userProfile?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: clients, error: clientError } = await supabase
        .from('mock_test_clients')
        .select(`
          id,
          status,
          total_score,
          created_at,
          full_name,
          email,
          mock_test_id,
          speaking_id
        `)
        .eq('user_id', userProfile.id)
        .in('status', COMPLETED_STATUSES)
        .not('mock_test_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (clientError) throw clientError;

      if (!clients?.length) {
        setHistory([]);
        return;
      }

      const mockTestIds = [...new Set(clients.map((c) => c.mock_test_id).filter(Boolean))];
      const speakingIds = [...new Set(clients.map((c) => c.speaking_id).filter(Boolean))];

      const [
        { data: mockTests, error: mockTestsError },
        { data: attempts, error: attemptsError },
        speakingRows,
      ] = await Promise.all([
        supabase
          .from('mock_test')
          .select('id, listening_id, reading_id, writing_id')
          .in('id', mockTestIds),
        supabase
          .from('user_attempts')
          .select(MOCK_ATTEMPT_SELECT)
          .eq('user_id', userProfile.id)
          .in('mock_id', mockTestIds),
        fetchSpeakingAttemptsByTestIds(supabase, userProfile.id, speakingIds),
      ]);

      if (mockTestsError) throw mockTestsError;
      if (attemptsError) throw attemptsError;

      const mockTestById = Object.fromEntries((mockTests || []).map((mt) => [mt.id, mt]));
      const speakingByTestId = buildSpeakingAttemptsByTestId(speakingRows);
      const testTypeMap = await buildTestTypeMap(supabase, [
        ...(attempts || []),
        ...speakingRows,
      ]);

      const attemptsByMockId = {};
      (attempts || []).forEach((attempt) => {
        if (!attempt.mock_id) return;
        if (!attemptsByMockId[attempt.mock_id]) {
          attemptsByMockId[attempt.mock_id] = [];
        }
        attemptsByMockId[attempt.mock_id].push(attempt);
      });

      const historyItems = await Promise.all(
        clients.map(async (client) => {
          const mockAttempts = attemptsByMockId[client.mock_test_id] || [];
          const speakingAttempt = await resolveSpeakingAttemptForClient(
            supabase,
            userProfile.id,
            {
              speakingId: client.speaking_id,
              mockTestId: client.mock_test_id,
            },
            speakingByTestId,
            mockAttempts,
          );

          const mergedAttempts = mergeAttemptsForClient(mockAttempts, speakingAttempt);
          const mockTest = mockTestById[client.mock_test_id];
          const sectionResults = organizeMockTestSectionResults(
            mergedAttempts,
            mockTest,
            testTypeMap,
          );
          const hasAnyResult = Object.values(sectionResults).some((value) => value !== null);

          return {
            client,
            results: hasAnyResult ? sectionResults : null,
            completedAt: client.created_at,
          };
        }),
      );

      setHistory(historyItems);
    } catch (err) {
      console.error('Failed to load mock test history:', err);
      setError(err.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }, [userProfile?.id]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return {
    history,
    loading,
    error,
    refreshHistory: loadHistory,
  };
};
