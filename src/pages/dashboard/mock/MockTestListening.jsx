import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMockTestSecurity } from '@/hooks/useMockTestSecurity';
import MockTestExitModal from '@/components/modal/MockTestExitModal';
import ListeningPracticePage from '../listening/ListeningPracticePage';

/**
 * Mock Test Listening Section Wrapper
 * - 40-minute fixed timer (handled by practice page with URL param)
 * - Security restrictions
 * - Auto-submit on time expiry
 * - Can proceed early
 */
const MockTestListening = ({ testId, mockTestId, mockClientId, onComplete, onBack }) => {
  const navigate = useNavigate();
  const [showExitModal, setShowExitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [urlReady, setUrlReady] = useState(false);

  // Security hook
  const { resetExitModal, forceFullscreen  } = useMockTestSecurity(
    () => {
      setShowExitModal(true);
    },
    true
  );

  // Listen for completion from practice page via localStorage polling
  useEffect(() => {
    const checkCompletion = setInterval(() => {
      const completed = localStorage.getItem(`mock_test_${mockTestId}_listening_completed`);
      if (completed === 'true') {
        const result = localStorage.getItem(`mock_test_${mockTestId}_listening_result`);
        if (result && onComplete) {
          try {
            onComplete(JSON.parse(result));
            localStorage.removeItem(`mock_test_${mockTestId}_listening_completed`);
            localStorage.removeItem(`mock_test_${mockTestId}_listening_result`);
          } catch (e) {
            console.error('Error parsing listening result:', e);
          }
        }
        clearInterval(checkCompletion);
      }
    }, 1000);

    return () => clearInterval(checkCompletion);
  }, [mockTestId, onComplete]);

  const handleExitConfirm = async () => {
    setShowExitModal(false);
    resetExitModal();
    // Trigger submission via custom event
    window.dispatchEvent(new CustomEvent('mockTestForceSubmit', {
      detail: { section: 'listening', mockTestId }
    }));
    setIsSubmitting(true);
  };

  const handleExitCancel = () => {
    setShowExitModal(false);
    resetExitModal();
    forceFullscreen();
  };

  // Update URL to match practice page route - MUST happen before ListeningPracticePage renders
  useEffect(() => {
    if (!testId) return;
    
    const searchParams = new URLSearchParams({
      mockTest: 'true',
      mockTestId: mockTestId || '',
      mockClientId: mockClientId || '',
      duration: '2400'
    });
    
    const newUrl = `/listening-practice/${testId}?${searchParams.toString()}`;
    
    // Update URL immediately
    window.history.replaceState({}, '', newUrl);
    
    // Mark as ready after ensuring URL is updated
    // Use requestAnimationFrame to ensure DOM/React Router has processed the change
    requestAnimationFrame(() => {
      setUrlReady(true);
    });
  }, [testId, mockTestId, mockClientId]);

  // Don't render ListeningPracticePage until URL is ready
  if (!testId || !urlReady) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading test...</p>
        </div>
      </div>
    );
  }

  // Auto-fullscreen after URL is ready
  useEffect(() => {
    if (urlReady && testId) {
      const enterFullscreen = async () => {
        try {
          const el = document.documentElement;
          const requestMethod = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
          if (requestMethod) {
            await requestMethod.call(el);
          }
        } catch (error) {
          console.error('[MockTestListening] Error entering fullscreen:', error);
        }
      };
      // Small delay to ensure page is rendered
      setTimeout(enterFullscreen, 100);
    }
  }, [urlReady, testId]);

  return (
    <>
      <MockTestExitModal
        isOpen={showExitModal}
        onConfirm={handleExitConfirm}
        onCancel={handleExitCancel}
        isSubmitting={isSubmitting}
      />
      <ListeningPracticePage />
    </>
  );
};

export default MockTestListening;

