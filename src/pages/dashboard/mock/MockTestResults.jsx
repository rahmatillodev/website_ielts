import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaTelegramPlane } from 'react-icons/fa';
import { MdSchedule, MdCheckCircleOutline } from 'react-icons/md';
import { clearAllMockTestDataForId } from '@/store/LocalStorage/mockTestStorage';

/**
 * Mock Test Results Page (Pending Evaluation)
 * - No scores shown
 * - User is informed that results will be available in 2 days
 * - Telegram bot reminder notice
 */
const MockTestResults = ({ mockTestId, results, onBack }) => {
  const navigate = useNavigate();

  // Log when results page is displayed and ensure localStorage is cleared
  useEffect(() => {
    console.log('[MockTestResults] Results page displayed', { mockTestId, results });
    
    // Ensure all localStorage data is cleared when results page loads
    // This is a safety measure in case cleanup didn't happen earlier
    if (mockTestId) {
      console.log('[MockTestResults] Ensuring localStorage cleanup for mock test:', mockTestId);
      clearAllMockTestDataForId(mockTestId);
    }
  }, [mockTestId, results]);

  return (
    <div className="bg-gray-50 py-12 px-4 flex items-center justify-center">
      <div className="max-w-3xl w-full">
        <div className="bg-white rounded-3xl shadow-2xl p-10 text-center">

          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center">
              <MdSchedule className="text-blue-600" size={42} />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">
            Your Mock Test Has Been Submitted
          </h1>

          {/* Main Message */}
          <p className="text-gray-600 text-base md:text-lg mb-8 leading-relaxed">
            Your answers have been successfully recorded. 
            The evaluation process is currently in progress.
          </p>

          {/* Info Card */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 mb-8 text-left">
            <div className="flex items-start gap-4">
              <MdCheckCircleOutline className="text-blue-600 flex-shrink-0 mt-1" size={28} />
              <div>
                <h3 className="text-lg font-bold text-blue-900 mb-2">
                  Results will be available within 2 days
                </h3>
                <p className="text-blue-800 text-sm leading-relaxed">
                  Your mock test will be fully checked by our system and evaluators.
                  Once ready, your results will be published directly on this platform.
                </p>
              </div>
            </div>
          </div>

          {/* Telegram Notice */}
          <div className="bg-green-50 border border-green-100 rounded-2xl p-6 mb-10 text-left">
            <div className="flex items-start gap-4">
              <FaTelegramPlane className="text-green-600 flex-shrink-0 mt-1" size={26} />
              <div>
                <h3 className="text-lg font-bold text-green-900 mb-2">
                  Telegram Notification
                </h3>
                <p className="text-green-800 text-sm leading-relaxed">
                  We will also send you a reminder and notification via our Telegram bot
                  as soon as your results are ready.
                </p>
              </div>
            </div>
          </div>

          {/* Footer Message */}
          <p className="text-gray-500 text-sm mb-8">
            No scores are displayed at this stage. Please wait for the official evaluation.
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/mock-tests')}
              className="px-8 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-all shadow-md"
            >
              Go to Mock Tests
            </button>

            
          </div>

        </div>
      </div>
    </div>
  );
};

export default MockTestResults;