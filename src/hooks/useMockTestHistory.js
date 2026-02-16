import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useMockTestClientStore } from '@/store/mockTestClientStore';
import supabase from '@/lib/supabase';

/**
 * Custom hook for managing mock test history
 * Separates business logic from UI components
 */
export const useMockTestHistory = () => {
  const { userProfile } = useAuthStore();
  const { fetchClientAttempts } = useMockTestClientStore();

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
      // Fetch all completed client records for this user
      // Show history for completed, checked, and notified statuses
      const { data, error: clientError } = await supabase
        .from("mock_test_clients")
        .select(`
          id,
          status,
          total_score,
          created_at,
          full_name,
          email
        `)
        .eq("user_id", userProfile.id)
        .in("status", ["completed", "checked", "notified"])
        .order("created_at", { ascending: false })

      if (clientError) throw clientError;

      // For each completed client, fetch the associated results
      // Fetch attempts specifically for each client using mock_id
      const historyItems = await Promise.all(
        (data || []).map(async (client) => {
          try {
            // Fetch attempts for this specific client
            const { data: attempts, error: attemptsError } = await supabase
              .from('user_attempts')
              .select(`
                id,
                test_id,
                writing_id,
                score,
                feedback,
                correct_answers,
                total_questions,
                time_taken,
                completed_at
              `)
              .eq('user_id', userProfile.id)
              .eq('mock_id', client.id)
              .order('completed_at', { ascending: false });

            if (attemptsError) {
              console.error(`Error fetching attempts for client ${client.id}:`, attemptsError);
            }

            // Organize attempts by type (listening, reading, writing, speaking)
            const results = {
              listening: null,
              reading: null,
              writing: null,
              speaking: null
            };

            if (attempts && attempts.length > 0) {
              // Get test IDs from attempts to fetch their types
              const testIds = attempts
                .filter(a => a.test_id)
                .map(a => a.test_id);

              // Create a map of test_id -> test_type
              const testTypeMap = {};
              if (testIds.length > 0) {
                const { data: tests } = await supabase
                  .from('test')
                  .select('id, type')
                  .in('id', testIds);

                if (tests) {
                  tests.forEach(test => {
                    testTypeMap[test.id] = test.type;
                  });
                }
              }

              // Get all active mock tests to match test_ids
              const { data: mockTests } = await supabase
                .from('mock_test')
                .select('id, listening_id, reading_id, writing_id')
                .eq('is_active', true)
                .order('created_at', { ascending: false });

              if (mockTests && mockTests.length > 0) {
                // Find which mock test this client belongs to by matching attempt IDs
                const matchingMockTest = mockTests.find(mt => {
                  return attempts.some(attempt => 
                    (mt.listening_id && attempt.test_id === mt.listening_id) ||
                    (mt.reading_id && attempt.test_id === mt.reading_id) ||
                    (mt.writing_id && attempt.writing_id === mt.writing_id)
                  );
                });

                if (matchingMockTest) {
                  // Match attempts to sections based on the mock test's IDs and test types
                  attempts.forEach(attempt => {
                    if (attempt.writing_id && !attempt.test_id) {
                      // Writing attempt
                      if (attempt.writing_id === matchingMockTest.writing_id) {
                        results.writing = attempt;
                      }
                    } else if (attempt.test_id) {
                      const testType = testTypeMap[attempt.test_id];
                      
                      // Match by exact ID for listening and reading
                      if (attempt.test_id === matchingMockTest.listening_id) {
                        results.listening = attempt;
                      } else if (attempt.test_id === matchingMockTest.reading_id) {
                        results.reading = attempt;
                      } else if (testType === 'speaking') {
                        // Match speaking by type (since there's no speaking_id in mock_test)
                        results.speaking = attempt;
                      }
                    }
                  });
                }
              }
            }

            return {
              client,
              results: Object.keys(results).some(k => results[k] !== null) ? results : null,
              completedAt: client.created_at,
            };
          } catch (err) {
            console.error(`Error loading results for client ${client.id}:`, err);
            return {
              client,
              results: null,
              completedAt: client.created_at,
            };
          }
        })
      );

      setHistory(historyItems);
    } catch (err) {
      console.error('Failed to load mock test history:', err);
      setError(err.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }, [userProfile?.id, fetchClientAttempts]);

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

