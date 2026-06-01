import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation, Navigate } from 'react-router-dom';
import supabase from '@/lib/supabase';
import { loadMockTestSectionResults } from '@/utils/mockTestResults';
import MockTestClientResults from './MockTestClientResults';
import { MdArrowBack } from 'react-icons/md';
import { useMockTestClientStore } from '@/store/mockTestClientStore';

/**
 * Page wrapper for MockTestClientResults
 * Accessible only if the user is in the mock_test_clients table.
 * Fetches client data by clientId and displays results.
 */
const MockTestClientResultsPage = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isMockTestClient = useMockTestClientStore((state) => state.isMockTestClient);
  const fromRegular = pathname.startsWith('/mock-test/results-regular/');
  const [client, setClient] = useState(null);
  const [results, setResults] = useState({
    listening: null,
    reading: null,
    writing: null,
    speaking: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  if (isMockTestClient === false) {
    return <Navigate to="/dashboard" replace />;
  }

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

        // Load profile photo (avatar) from users table for PDF and display
        let clientWithAvatar = { ...clientData };
        if (clientData.user_id) {
          const { data: userRow } = await supabase
            .from('users')
            .select('avatar_image')
            .eq('id', clientData.user_id)
            .maybeSingle();
          if (userRow?.avatar_image) {
            clientWithAvatar = { ...clientData, avatar_image: userRow.avatar_image };
          }
        }
        setClient(clientWithAvatar);

        // Fetch results if client has user_id and mock_test_id
        if (!clientData.user_id || !clientData.mock_test_id) {
          setLoading(false);
          return;
        }

        const resultsData = await loadMockTestSectionResults(
          supabase,
          clientData.user_id,
          clientData,
        );

        setResults(resultsData);
      } catch (err) {
        console.error('Error loading client results:', err);
        setError(err.message || 'Failed to load results');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [clientId]);

  const handleBack = () => {
    navigate(fromRegular ? '/mock-test/history-regular' : '/mock-test/history');
  };

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
            onClick={handleBack}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors"
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
        onClick={handleBack}
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

