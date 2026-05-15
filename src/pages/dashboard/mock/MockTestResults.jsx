import { useEffect, useState, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaTelegramPlane } from 'react-icons/fa';
import { MdSchedule, MdCheckCircleOutline } from 'react-icons/md';
import { clearAllMockTestDataForId } from '@/store/LocalStorage/mockTestStorage';
import { getRun, sanitizeRunForDisplay } from '@/lib/mockTestIndexedArchive';
import MockTestArchiveSections from '@/components/mock/MockTestArchiveSections';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

/**
 * Mock Test Results Page (Pending Evaluation)
 * - No scores shown
 * - IndexedDB archive: staff can open "Show" to review captured answers (same browser)
 */
const MockTestResults = ({ mockTestId, mockRunId, results, onBack }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const effectiveMockTestId =
    mockTestId ?? location.state?.mockTestId ?? searchParams.get('mockTestId') ?? undefined;
  const effectiveMockRunId =
    mockRunId ?? location.state?.mockRunId ?? searchParams.get('mockRunId') ?? undefined;
  const effectiveResults = results ?? location.state?.results;

  const handleBack = onBack ?? (() => navigate('/mock-tests'));

  const [showArchive, setShowArchive] = useState(false);
  const [archive, setArchive] = useState(null);
  const [archiveError, setArchiveError] = useState(null);

  const loadArchive = useCallback(async () => {
    if (!effectiveMockRunId) {
      setArchiveError('No session archive id (mockRunId).');
      setArchive(null);
      return;
    }
    setArchiveError(null);
    try {
      const data = await getRun(effectiveMockRunId);
      setArchive(data ? sanitizeRunForDisplay(data) : null);
      if (!data) {
        setArchiveError('No archived data found for this session.');
      }
    } catch (e) {
      console.error('[MockTestResults] Failed to load archive:', e);
      setArchiveError(e?.message || 'Failed to load archive');
      setArchive(null);
    }
  }, [effectiveMockRunId]);

  useEffect(() => {
    // Clear only this mock test's flow keys in localStorage (do not wipe other users' keys on shared PC)
    if (effectiveMockTestId) {
      clearAllMockTestDataForId(effectiveMockTestId);
    }
  }, [effectiveMockTestId, effectiveResults, effectiveMockRunId]);

  const handleOpenShow = () => {
    setShowArchive(true);
    loadArchive();
  };

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

          {effectiveMockRunId && (
            <div className="mb-8">
              <Button type="button" variant="outline" onClick={handleOpenShow}>
                Show archived answers
              </Button>
              <p className="text-xs text-gray-400 mt-2">Stored on this device for staff review (IndexedDB).</p>
            </div>
          )}

          <div className="mb-6">
            <Button type="button" variant="ghost" onClick={handleBack}>
              Back to mock tests
            </Button>
          </div>

          {/* Info Card */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 mb-8 text-left">
            <div className="flex items-start gap-4">
              <MdCheckCircleOutline className="text-blue-600 shrink-0 mt-1" size={28} />
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
              <FaTelegramPlane className="text-green-600 shrink-0 mt-1" size={26} />
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

        </div>
      </div>

      <Dialog open={showArchive} onOpenChange={setShowArchive}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Archived mock answers</DialogTitle>
          </DialogHeader>
          {archiveError && (
            <p className="text-sm text-red-600 text-left">{archiveError}</p>
          )}
          {archive && (
            <MockTestArchiveSections
              run={archive}
              mockTestIdFallback={effectiveMockTestId}
              listMaxHeightClass="max-h-64"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MockTestResults;
