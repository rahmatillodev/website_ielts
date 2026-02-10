import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMockTestSecurity } from '@/hooks/useMockTestSecurity';
import MockTestExitModal from '@/components/modal/MockTestExitModal';
import InstructionalVideo from '@/components/mock/InstructionalVideo';
import ReadingPracticePage from '../reading/ReadingPracticePage';

/**
 * Mock Test Reading Section Wrapper
 * - Shows 30-second intro video
 * - Auto-advances to reading after video
 * - Security restrictions
 * - Auto-submit on time expiry
 */
const MockTestReading = ({ testId, mockTestId, mockClientId, onComplete, onBack }) => {
  const navigate = useNavigate();
  const [showExitModal, setShowExitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVideo, setShowVideo] = useState(true);
  const [videoCompleted, setVideoCompleted] = useState(false);
  const [urlReady, setUrlReady] = useState(false);

  // Security hook
  const { resetExitModal, forceFullscreen } = useMockTestSecurity(
    () => {
      setShowExitModal(true);
    },
    true
  );

  // Listen for completion from practice page
  useEffect(() => {
    const checkCompletion = setInterval(() => {
      const completed = localStorage.getItem(`mock_test_${mockTestId}_reading_completed`);
      if (completed === 'true') {
        const result = localStorage.getItem(`mock_test_${mockTestId}_reading_result`);
        if (result && onComplete) {
          try {
            onComplete(JSON.parse(result));
            localStorage.removeItem(`mock_test_${mockTestId}_reading_completed`);
            localStorage.removeItem(`mock_test_${mockTestId}_reading_result`);
          } catch (e) {
            console.error('Error parsing reading result:', e);
          }
        }
        clearInterval(checkCompletion);
      }
    }, 1000);

    return () => clearInterval(checkCompletion);
  }, [mockTestId, onComplete]);

  const handleVideoComplete = () => {
    setVideoCompleted(true);
    setShowVideo(false);
  };

  const handleExitConfirm = async () => {
    setShowExitModal(false);
    resetExitModal();
    window.dispatchEvent(new CustomEvent('mockTestForceSubmit', {
      detail: { section: 'reading', mockTestId }
    }));
    setIsSubmitting(true);
  };

  const handleExitCancel = () => {
    setShowExitModal(false);
    resetExitModal();
    forceFullscreen();
  };

  // Update URL to match practice page route - MUST happen before ReadingPracticePage renders
  useEffect(() => {
    if (!testId || showVideo) return;
    
    const searchParams = new URLSearchParams({
      mockTest: 'true',
      mockTestId: mockTestId || '',
      mockClientId: mockClientId || '',
      duration: '3600' // 60 minutes for reading
    });
    
    const newUrl = `/reading-practice/${testId}?${searchParams.toString()}`;
    
    // Update URL immediately
    window.history.replaceState({}, '', newUrl);
    
    // Mark as ready after ensuring URL is updated
    // Use requestAnimationFrame to ensure DOM/React Router has processed the change
    requestAnimationFrame(() => {
      setUrlReady(true);
    });
  }, [testId, mockTestId, showVideo]);

  // Early return for video - must be AFTER all hooks
  if (showVideo) {
    return (
      <>
        <MockTestExitModal
          isOpen={showExitModal}
          onConfirm={handleExitConfirm}
          onCancel={handleExitCancel}
          isSubmitting={isSubmitting}
        />
        <InstructionalVideo
          onComplete={handleVideoComplete}
          countdownSeconds={0}
          title="Reading Section Instructions"
          description="You will have 60 minutes to complete the reading section. The test will start automatically after this video."
          autoFullscreen={true}
          videoSrc="/videos/introVideo.mp4"
          onExit={() => {
            setShowVideo(false);
            if (onBack) onBack();
          }}
        />
      </>
    );
  }

  // Don't render ReadingPracticePage until URL is ready
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

  return (
    <>
      <MockTestExitModal
        isOpen={showExitModal}
        onConfirm={handleExitConfirm}
        onCancel={handleExitCancel}
        isSubmitting={isSubmitting}
      />
      {!showVideo && <ReadingPracticePage />}
    </>
  );
};

export default MockTestReading;

