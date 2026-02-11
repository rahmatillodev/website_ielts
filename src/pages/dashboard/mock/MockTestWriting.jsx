import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMockTestSecurity } from '@/hooks/useMockTestSecurity';
import MockTestExitModal from '@/components/modal/MockTestExitModal';
import InstructionalVideo from '@/components/mock/InstructionalVideo';
import WritingPracticePage from '../writing/WritingPracticePage';

/**
 * Mock Test Writing Section Wrapper
 * - Shows 30-second intro video
 * - Auto-advances to writing after video
 * - Security restrictions
 * - Auto-submit on time expiry
 * - Timer starts automatically after intro (no button needed)
 */
const MockTestWriting = ({ writingId, mockTestId, mockClientId, onComplete, onEarlyExit, onBack }) => {
  const navigate = useNavigate();
  const [showExitModal, setShowExitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVideo, setShowVideo] = useState(true);
  const [videoCompleted, setVideoCompleted] = useState(false);
  const [urlReady, setUrlReady] = useState(false);
  const [isEarlyExit, setIsEarlyExit] = useState(false);

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
      const completed = localStorage.getItem(`mock_test_${mockTestId}_writing_completed`);
      if (completed === 'true') {
        const result = localStorage.getItem(`mock_test_${mockTestId}_writing_result`);
        if (result) {
          try {
            const parsedResult = JSON.parse(result);
            console.log('[MockTestWriting] Writing completed, calling onComplete with:', parsedResult);
            
            // Reset submitting state when completion is detected
            setIsSubmitting(false);
            
            // If this was an early exit, navigate to results instead of next section
            if (isEarlyExit && onEarlyExit) {
              // Pass result to onEarlyExit so it can save it and navigate to results
              onEarlyExit(parsedResult, 'writing');
            } else if (onComplete) {
              // Normal completion - proceed to next section (results)
              onComplete(parsedResult);
            }
            
            localStorage.removeItem(`mock_test_${mockTestId}_writing_completed`);
            localStorage.removeItem(`mock_test_${mockTestId}_writing_result`);
          } catch (e) {
            console.error('Error parsing writing result:', e);
            setIsSubmitting(false);
          }
        }
        clearInterval(checkCompletion);
      }
    }, 1000);

    return () => clearInterval(checkCompletion);
  }, [mockTestId, onComplete, onEarlyExit, isEarlyExit]);

  const handleVideoComplete = () => {
    setVideoCompleted(true);
    setShowVideo(false);
  };

  const handleExitConfirm = async () => {
    setShowExitModal(false);
    resetExitModal();
    // Mark as early exit so we navigate to results after submission
    setIsEarlyExit(true);
    window.dispatchEvent(new CustomEvent('mockTestForceSubmit', {
      detail: { section: 'writing', mockTestId }
    }));
    setIsSubmitting(true);
  };

  const handleExitCancel = () => {
    setShowExitModal(false);
    resetExitModal();
    forceFullscreen();
  };

  // Update URL to match practice page route - MUST happen before WritingPracticePage renders
  useEffect(() => {
    if (!writingId || showVideo) return;
    
    const searchParams = new URLSearchParams({
      mockTest: 'true',
      mockTestId: mockTestId || '',
      mockClientId: mockClientId || '',
      duration: '3600' // 60 minutes for writing
    });
    
    const newUrl = `/writing-practice/${writingId}?${searchParams.toString()}`;
    
    // Update URL immediately
    window.history.replaceState({}, '', newUrl);
    
    // Mark as ready after ensuring URL is updated
    // Use requestAnimationFrame to ensure DOM/React Router has processed the change
    requestAnimationFrame(() => {
      setUrlReady(true);
    });
  }, [writingId, mockTestId, mockClientId, showVideo]);

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
          title="Writing Section Instructions"
          description="You will have 60 minutes to complete the writing section. The test will start automatically after this video."
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

  // Don't render WritingPracticePage until URL is ready
  if (!writingId || !urlReady) {
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
      {!showVideo && <WritingPracticePage />}
    </>
  );
};

export default MockTestWriting;

