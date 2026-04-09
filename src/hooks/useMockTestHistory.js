import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import supabase from '@/lib/supabase';

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
      const { data, error: rpcError } = await supabase.rpc('get_mock_history_compact', {
        p_user_id: userProfile.id,
        p_limit: 50,
        p_offset: 0,
      });

      if (rpcError) throw rpcError;

      const historyItems = (data || []).map((row) => {
        const client = {
          id: row.client_id,
          status: row.status,
          total_score: row.total_score,
          created_at: row.created_at,
          full_name: row.full_name,
          email: row.email,
          mock_test_id: row.mock_test_id,
        };

        const results = {
          listening: row.listening_result,
          reading: row.reading_result,
          writing: row.writing_result,
          speaking: row.speaking_result,
        };

        const hasAnyResult = Object.values(results).some((value) => value !== null);

        return {
          client,
          results: hasAnyResult ? results : null,
          completedAt: row.created_at,
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

