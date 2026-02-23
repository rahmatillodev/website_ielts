import { useNavigate, Link, Navigate } from "react-router-dom";
import { useMockTestHistory } from "@/hooks/useMockTestHistory";
import MockTestHistoryItem from "@/components/mock/MockTestHistoryItem";
import { motion } from "framer-motion";
import { MdArrowBack, MdSchedule } from "react-icons/md";
import { useMockTestClientStore } from "@/store/mockTestClientStore";

/**
 * MockTestHistoryPage - Main page component
 * Accessible only if the user is in the mock_test_clients table (session store does not matter).
 */
const MockTestHistoryPage = ({ from = "mockTest" }) => {
  const navigate = useNavigate();
  const isMockTestClient = useMockTestClientStore((state) => state.isMockTestClient);

  const { history, loading } = useMockTestHistory();

  if (isMockTestClient === false) {
    return <Navigate to="/dashboard" replace />;
  }

  if (isMockTestClient === null || loading) {
    return (
      <div className="w-full h-full max-w-7xl mx-auto p-4 md:p-6 bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full max-w-7xl mx-auto p-4 md:p-6 bg-gray-50">
      {/* Header */}
      <div className="mb-6">
        {from === "mockTest"  ? (
          <button
            onClick={() => navigate('/mock-tests')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <MdArrowBack className="text-xl" />
            <span className="font-semibold">Back to Mock Tests</span>
          </button>
        ) : 
         <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <MdArrowBack className="text-xl" />
            <span className="font-semibold">Back to Dashboard</span>
          </button>
        }
      </div>

      {/* History List */}
      {history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-200">
          <MdSchedule className="text-6xl text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg mb-2">No completed mock tests</p>
          <p className="text-gray-400 text-sm mb-6">
            Complete a mock test to see it here.
          </p>
          <Link
            to="/mock-tests"
            className="px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors"
          >
            Browse Mock Tests
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((item, index) => (
            <motion.div
              key={item.client.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <MockTestHistoryItem
                client={item.client}
                results={item.results}
                completedAt={item.completedAt}
                from={from}
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MockTestHistoryPage;
