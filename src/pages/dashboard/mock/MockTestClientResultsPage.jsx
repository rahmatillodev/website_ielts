import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMockTestClientStore } from '@/store/mockTestClientStore';
import supabase from '@/lib/supabase';
import MockTestClientResults from './MockTestClientResults';
import { MdArrowBack } from 'react-icons/md';

/**
 * Page wrapper for MockTestClientResults
 * Fetches client data by clientId and displays results
 */
const MockTestClientResultsPage = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { fetchClientAttempts } = useMockTestClientStore();
  const [client, setClient] = useState(null);
  const [results, setResults] = useState({
    listening: null,
    reading: null,
    writing: null,
    speaking: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      if (!clientId) {
        setError('Client ID is required');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Fetch client data by clientId
        const { data: clientData, error: clientError } = await supabase
          .from('mock_test_clients')
          .select('*')
          .eq('id', clientId)
          .maybeSingle();

        if (clientError) throw clientError;
        if (!clientData) {
          throw new Error('Client not found');
        }

        setClient(clientData);

        // Fetch results for this specific client using mock_id
        if (clientData.user_id && clientData.id) {
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
            .eq('user_id', clientData.user_id)
            .eq('mock_id', clientData.id)
            .order('completed_at', { ascending: false });

          if (attemptsError) {
            console.error('Error fetching attempts:', attemptsError);
          }

          // Organize attempts by type
          const resultsData = {
            listening: null,
            reading: null,
            writing: null,
            speaking: null
          };

          if (attempts && attempts.length > 0) {
            // Get test IDs to determine types
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

            // Get mock test to match IDs
            const { data: mockTests } = await supabase
              .from('mock_test')
              .select('id, listening_id, reading_id, writing_id')
              .eq('is_active', true)
              .order('created_at', { ascending: false })
              .limit(10);

            if (mockTests && mockTests.length > 0) {
              // Find matching mock test
              const matchingMockTest = mockTests.find(mt => {
                return attempts.some(attempt => 
                  (mt.listening_id && attempt.test_id === mt.listening_id) ||
                  (mt.reading_id && attempt.test_id === mt.reading_id) ||
                  (mt.writing_id && attempt.writing_id === mt.writing_id)
                );
              });

              if (matchingMockTest) {
                attempts.forEach(attempt => {
                  if (attempt.writing_id && !attempt.test_id) {
                    if (attempt.writing_id === matchingMockTest.writing_id) {
                      resultsData.writing = attempt;
                    }
                  } else if (attempt.test_id) {
                    const testType = testTypeMap[attempt.test_id];
                    
                    if (attempt.test_id === matchingMockTest.listening_id) {
                      resultsData.listening = attempt;
                    } else if (attempt.test_id === matchingMockTest.reading_id) {
                      resultsData.reading = attempt;
                    } else if (testType === 'speaking') {
                      resultsData.speaking = attempt;
                    }
                  }
                });
              }
            }
          }

          setResults(resultsData);
        }
      } catch (err) {
        console.error('Error loading client results:', err);
        setError(err.message || 'Failed to load results');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [clientId, fetchClientAttempts]);

  if (loading) {
    return (
      <div className="w-full h-full max-w-7xl mx-auto p-4 md:p-6 bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading results...</p>
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="w-full h-full max-w-7xl mx-auto p-4 md:p-6 bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || 'Client not found'}</p>
          <button
            onClick={() => navigate('/mock-test/history')}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600"
          >
            Back to History
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full max-w-7xl mx-auto p-4 md:p-6 bg-gray-50">
      <button
        onClick={() => navigate('/mock-test/history')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
      >
        <MdArrowBack className="text-xl" />
        <span className="font-semibold">Back to History</span>
      </button>
      <MockTestClientResults client={client} results={results} />
    </div>
  );
};

export default MockTestClientResultsPage;

