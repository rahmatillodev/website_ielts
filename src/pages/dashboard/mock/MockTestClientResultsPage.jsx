import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation, Navigate } from 'react-router-dom';
import supabase from '@/lib/supabase';
import { loadMockTestSectionResults } from '@/utils/mockTestResults';
import MockTestClientResults from './MockTestClientResults';
import { MdArrowBack, MdOutlineFeedback } from 'react-icons/md';
import { useMockTestClientStore } from '@/store/mockTestClientStore';
import { Button } from '@/components/ui/button';
import ResultFeedbackModal from '@/components/modal/ResultFeedbackModal';

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
  const [feedbackOpen, setFeedbackOpen] = useState(false);

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
        // Mock test sarlavhasi - FAQAT fikr-mulohaza konteksti uchun. Alohida so'rov:
        // `select('*')` ichiga joylashtirilgan bo'lsa, mock_test ustidagi RLS butun
        // qatorni yo'qotib, sahifani buzishi mumkin edi. Bu yerda xato bo'lsa,
        // sarlavha null bo'lib qoladi, xolos.
        if (clientData.mock_test_id) {
          const { data: mockTestRow } = await supabase
            .from('mock_test')
            .select('title')
            .eq('id', clientData.mock_test_id)
            .maybeSingle();
          if (mockTestRow?.title) {
            clientWithAvatar = { ...clientWithAvatar, mock_test_title: mockTestRow.title };
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
          <p className="text-danger-700 mb-4">{error || 'Client not found'}</p>
          <button
            onClick={handleBack}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary-hover transition-colors"
          >
            Back to History
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full max-w-7xl mx-auto p-4 md:p-6 bg-gray-50">
      <div className="flex items-center justify-between gap-4 mb-4">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <MdArrowBack className="text-xl" />
          <span className="font-semibold">Back to History</span>
        </button>
        <Button
          variant="outline"
          className="border-gray-200 text-gray-700 shadow-sm flex gap-2 h-9 px-4 sm:px-6"
          onClick={() => setFeedbackOpen(true)}
          title="Send feedback about this mock test result"
        >
          <MdOutlineFeedback className="text-base" />
          <span className="hidden sm:inline">Feedback</span>
        </Button>
      </div>
      <MockTestClientResults client={client} results={results} />

      <ResultFeedbackModal
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        description="About this mock test result."
        context={{
          testId: client.mock_test_id ?? null,
          testTitle: client.mock_test_title ?? null,
        }}
      />
    </div>
  );
};

export default MockTestClientResultsPage;

