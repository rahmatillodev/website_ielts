import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import supabase from '@/lib/supabase';

const COMPLETED_STATUSES = ['completed', 'checked', 'notified'];

const ATTEMPT_SELECT = `
  id,
  test_id,
  writing_id,
  score,
  feedback,
  correct_answers,
  total_questions,
  time_taken,
  completed_at,
  mock_id,
  type
`;

function organizeSectionResults(attempts, mockTest, testTypeMap) {
  const results = {
    listening: null,
    reading: null,
    writing: null,
    speaking: null,
  };

  if (!attempts?.length || !mockTest) {
    return results;
  }

  attempts.forEach((attempt) => {
    const attemptType =
      attempt.type || (attempt.test_id ? testTypeMap[attempt.test_id] : null);

    if (attempt.writing_id && attempt.writing_id === mockTest.writing_id) {
      results.writing = attempt;
    } else if (attempt.test_id) {
      if (attempt.test_id === mockTest.listening_id) {
        results.listening = attempt;
      } else if (attempt.test_id === mockTest.reading_id) {
        results.reading = attempt;
      } else if (attemptType === 'speaking') {
        results.speaking = attempt;
      }
    }
  });

  return results;
}

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
          mock_test_id
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

      const [
        { data: mockTests, error: mockTestsError },
        { data: attempts, error: attemptsError },
      ] = await Promise.all([
        supabase
          .from('mock_test')
          .select('id, listening_id, reading_id, writing_id')
          .in('id', mockTestIds),
        supabase
          .from('user_attempts')
          .select(ATTEMPT_SELECT)
          .eq('user_id', userProfile.id)
          .in('mock_id', mockTestIds),
      ]);

      if (mockTestsError) throw mockTestsError;
      if (attemptsError) throw attemptsError;

      const mockTestById = Object.fromEntries((mockTests || []).map((mt) => [mt.id, mt]));

      const testIds = [
        ...new Set((attempts || []).filter((a) => a.test_id).map((a) => a.test_id)),
      ];
      const testTypeMap = {};
      if (testIds.length > 0) {
        const { data: testsData, error: testsError } = await supabase
          .from('test')
          .select('id, type')
          .in('id', testIds);

        if (testsError) {
          console.warn('Error fetching test types for mock history:', testsError);
        } else {
          testsData?.forEach((t) => {
            testTypeMap[t.id] = t.type;
          });
        }
      }

      const attemptsByMockId = {};
      (attempts || []).forEach((attempt) => {
        if (!attempt.mock_id) return;
        if (!attemptsByMockId[attempt.mock_id]) {
          attemptsByMockId[attempt.mock_id] = [];
        }
        attemptsByMockId[attempt.mock_id].push(attempt);
      });

      const historyItems = clients.map((client) => {
        const mockTest = mockTestById[client.mock_test_id];
        const sectionResults = organizeSectionResults(
          attemptsByMockId[client.mock_test_id],
          mockTest,
          testTypeMap,
        );
        const hasAnyResult = Object.values(sectionResults).some((value) => value !== null);

        return {
          client,
          results: hasAnyResult ? sectionResults : null,
          completedAt: client.created_at,
        };
      });

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
