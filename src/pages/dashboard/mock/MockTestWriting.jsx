import { useState, useEffect, useRef } from 'react';
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

  // Store callbacks in refs to avoid restarting polling when callbacks change
  const onCompleteRef = useRef(onComplete);
  const onEarlyExitRef = useRef(onEarlyExit);
  const isEarlyExitRef = useRef(isEarlyExit);

  // Update refs when callbacks or isEarlyExit change
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onEarlyExitRef.current = onEarlyExit;
    isEarlyExitRef.current = isEarlyExit;
    
  }, [onComplete, onEarlyExit, isEarlyExit]);

  // Listen for completion from practice page
  useEffect(() => {
    if (!mockTestId) {
      console.log('[MockTestWriting] No mockTestId, skipping completion polling');
      return;
    }
    
   
    
    // Check immediately on mount (in case completion signal was set before component mounted)
    const checkImmediately = () => {
      const completed = localStorage.getItem(`mock_test_${mockTestId}_writing_completed`);
      if (completed === 'true') {
        console.log('[MockTestWriting] Completion detected immediately on mount!', { mockTestId, isEarlyExit: isEarlyExitRef.current });
        const result = localStorage.getItem(`mock_test_${mockTestId}_writing_result`);
        if (result) {
          try {
            const parsedResult = JSON.parse(result);
            
            setIsSubmitting(false);
            
            if (isEarlyExitRef.current && onEarlyExitRef.current) {
              onEarlyExitRef.current(parsedResult, 'writing');
            } else if (onCompleteRef.current) {
              onCompleteRef.current(parsedResult);
            } else {
              console.warn('[MockTestWriting] No onComplete or onEarlyExit handler available!', {
                isEarlyExit: isEarlyExitRef.current,
                hasOnComplete: !!onCompleteRef.current,
                hasOnEarlyExit: !!onEarlyExitRef.current
              });
            }
            
            localStorage.removeItem(`mock_test_${mockTestId}_writing_completed`);
            localStorage.removeItem(`mock_test_${mockTestId}_writing_result`);
            return true;
          } catch (e) {
            console.error('[MockTestWriting] Error parsing writing result:', e);
            setIsSubmitting(false);
          }
        }
      }
      return false;
    };
    
    // Check immediately
    if (checkImmediately()) {
      return;
    }
    
    const checkCompletion = setInterval(() => {
      const completed = localStorage.getItem(`mock_test_${mockTestId}_writing_completed`);
      if (completed === 'true') {
        const result = localStorage.getItem(`mock_test_${mockTestId}_writing_result`);
        if (result) {
          try {
            const parsedResult = JSON.parse(result);
            
            // Reset submitting state when completion is detected
            setIsSubmitting(false);
            
            if (isEarlyExitRef.current && onEarlyExitRef.current) {
              onEarlyExitRef.current(parsedResult, 'writing');
            } else if (onCompleteRef.current) {
              onCompleteRef.current(parsedResult);
            } else {
              console.warn('[MockTestWriting] No onComplete or onEarlyExit handler available!', {
                isEarlyExit: isEarlyExitRef.current,
                hasOnComplete: !!onCompleteRef.current,
                hasOnEarlyExit: !!onEarlyExitRef.current
              });
            }
            
            localStorage.removeItem(`mock_test_${mockTestId}_writing_completed`);
            localStorage.removeItem(`mock_test_${mockTestId}_writing_result`);
            clearInterval(checkCompletion);
          } catch (e) {
            console.error('[MockTestWriting] Error parsing writing result:', e);
            setIsSubmitting(false);
          }
        } else {
          console.warn('[MockTestWriting] Completion detected but no result data found');
        }
      }
    }, 1000);

    return () => {
      console.log('[MockTestWriting] Cleaning up completion polling');
      clearInterval(checkCompletion);
    };
  }, [mockTestId]); // Only depend on mockTestId, not callbacks

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

