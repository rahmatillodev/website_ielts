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
  // Check if video was already completed (persisted in localStorage)
  const [showVideo, setShowVideo] = useState(() => {
    if (!mockTestId) return true;
    const videoKey = `mock_test_${mockTestId}_writing_video_completed`;
    return localStorage.getItem(videoKey) !== 'true';
  });
  const [videoCompleted, setVideoCompleted] = useState(false);
  const [urlReady, setUrlReady] = useState(false);
  const [isEarlyExit, setIsEarlyExit] = useState(false);

  // Security hook - always active in mock test mode
  // WritingPracticePage will also call this hook, but having both active ensures security works
  const { resetExitModal, forceFullscreen } = useMockTestSecurity(
    () => {
      setShowExitModal(true);
    },
    true // Always active in mock test wrapper
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
    // Persist video completion so it doesn't show again on refresh
    if (mockTestId) {
      localStorage.setItem(`mock_test_${mockTestId}_writing_video_completed`, 'true');
    }
  };

  const handleExitConfirm = async () => {
    setShowExitModal(false);
    resetExitModal();
    // Mark as early exit so we navigate to results after submission
    setIsEarlyExit(true);
    window.dispatchEvent(new CustomEvent('mockTestForceSubmit', {
      detail: { section: 'writing', mockTestId, writingId }
    }));
    setIsSubmitting(true);
  };

  const handleExitCancel = () => {
    setShowExitModal(false);
    resetExitModal();
    forceFullscreen();
  };

  // Update URL to match practice page route - MUST happen before WritingPracticePage renders
  // Use React Router's navigate to properly update useParams()
  useEffect(() => {
    if (!writingId || showVideo) return;
    
    const searchParams = new URLSearchParams({
      mockTest: 'true',
      mockTestId: mockTestId || '',
      mockClientId: mockClientId || '',
      duration: '3600' // 60 minutes for writing
    });
    
    const newUrl = `/writing-practice/${writingId}?${searchParams.toString()}`;
    
    // Use React Router's navigate with replace to properly update useParams()
    // This ensures WritingPracticePage can get the id from useParams()
    navigate(newUrl, { replace: true });
    
    // Mark as ready after a short delay to ensure React Router has processed the navigation
    const timer = setTimeout(() => {
      setUrlReady(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [writingId, mockTestId, mockClientId, showVideo, navigate]);

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

