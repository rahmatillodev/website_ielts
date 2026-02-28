import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMockTestSecurity } from '@/hooks/useMockTestSecurity';
import MockTestExitModal from '@/components/modal/MockTestExitModal';
import InstructionalVideo from '@/components/mock/InstructionalVideo';
import ListeningPracticePage from '../listening/ListeningPracticePage';

/**
 * Mock Test Listening Section Wrapper
 * - Shows listening video (serves as intro video for entire mock test)
 * - Auto-advances to listening after video
 * - 40-minute fixed timer (handled by practice page with URL param)
 * - Security restrictions
 * - Auto-submit on time expiry
 * - Can proceed early
 */
const MockTestListening = ({ testId, mockTestId, mockClientId, onComplete, onEarlyExit, onBack, videoSrc, onVideoStart }) => {
  const [showExitModal, setShowExitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVideo, setShowVideo] = useState(true);
  const [videoCompleted, setVideoCompleted] = useState(false);
  const [urlReady, setUrlReady] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Security hook
  const { resetExitModal, forceFullscreen  } = useMockTestSecurity(
    () => {
      setShowExitModal(true);
    },
    true
  );

  // Track if this is an early exit submission
  const [isEarlyExit, setIsEarlyExit] = useState(false);

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

  // Listen for completion from practice page via localStorage polling
  useEffect(() => {
    if (!mockTestId) {
      return;
    }
    
 
    
    // Check immediately on mount (in case completion signal was set before component mounted)
    const checkImmediately = () => {
      const completed = localStorage.getItem(`mock_test_${mockTestId}_listening_completed`);
      if (completed === 'true') {
        console.log('[MockTestListening] Completion detected immediately on mount!', { mockTestId, isEarlyExit: isEarlyExitRef.current });
        const result = localStorage.getItem(`mock_test_${mockTestId}_listening_result`);
        if (result) {
          try {
            const parsedResult = JSON.parse(result);
            console.log('[MockTestListening] Parsed result:', parsedResult);
            
            // Reset submitting state when completion is detected
            setIsSubmitting(false);
            
            // If this was an early exit, navigate to results instead of next section
            if (isEarlyExitRef.current && onEarlyExitRef.current) {
              onEarlyExitRef.current(parsedResult, 'listening');
            } else if (onCompleteRef.current) {
              onCompleteRef.current(parsedResult);
            } else {
              console.warn('[MockTestListening] No onComplete or onEarlyExit handler available!', {
                isEarlyExit: isEarlyExitRef.current,
                hasOnComplete: !!onCompleteRef.current,
                hasOnEarlyExit: !!onEarlyExitRef.current
              });
            }
            
            localStorage.removeItem(`mock_test_${mockTestId}_listening_completed`);
            localStorage.removeItem(`mock_test_${mockTestId}_listening_result`);
            return true; // Signal that we handled it
          } catch (e) {
            console.error('[MockTestListening] Error parsing listening result:', e);
            setIsSubmitting(false);
          }
        } else {
          console.warn('[MockTestListening] Completion detected but no result data found');
        }
      }
      return false;
    };
    
    // Check immediately
    if (checkImmediately()) {
      return; // Already handled, no need to set up polling
    }
    
    const checkCompletion = setInterval(() => {
      const completed = localStorage.getItem(`mock_test_${mockTestId}_listening_completed`);
      if (completed === 'true') {
        const result = localStorage.getItem(`mock_test_${mockTestId}_listening_result`);
        if (result) {
          try {
            const parsedResult = JSON.parse(result);
            
            // Reset submitting state when completion is detected
            setIsSubmitting(false);
            
            // If this was an early exit, navigate to results instead of next section
            if (isEarlyExitRef.current && onEarlyExitRef.current) {
              onEarlyExitRef.current(parsedResult, 'listening');
            } else if (onCompleteRef.current) {
              console.log('[MockTestListening] Calling onComplete (normal completion)', parsedResult);
              onCompleteRef.current(parsedResult);
            } else {
              console.warn('[MockTestListening] No onComplete or onEarlyExit handler available!', {
                isEarlyExit: isEarlyExitRef.current,
                hasOnComplete: !!onCompleteRef.current,
                hasOnEarlyExit: !!onEarlyExitRef.current
              });
            }
            
            localStorage.removeItem(`mock_test_${mockTestId}_listening_completed`);
            localStorage.removeItem(`mock_test_${mockTestId}_listening_result`);
            clearInterval(checkCompletion);
          } catch (e) {
            console.error('[MockTestListening] Error parsing listening result:', e);
            setIsSubmitting(false);
          }
        } else {
          console.warn('[MockTestListening] Completion detected but no result data found');
        }
      }
    }, 1000);

    return () => {
      console.log('[MockTestListening] Cleaning up completion polling');
      clearInterval(checkCompletion);
    };
  }, [mockTestId]); // Only depend on mockTestId, not callbacks

  const handleExitConfirm = async () => {
    setShowExitModal(false);
    resetExitModal();
    // Mark as early exit so we navigate to results after submission
    setIsEarlyExit(true);
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


  const handleVideoComplete = () => {
    setVideoCompleted(true);
    setShowVideo(false);
  };

  // Update URL to match practice page route - MUST happen before ListeningPracticePage renders
  // Use location-based detection to ensure React Router has completed navigation
  useEffect(() => {
    if (!testId || showVideo) return;

    const expectedPath = `/listening-practice/${testId}`;
    
    // Check if already on correct route
    if (location.pathname === expectedPath) {
      setUrlReady(true);
      return;
    }
    
    // Navigate to practice route
    const searchParams = new URLSearchParams({
      mockTest: 'true',
      mockTestId: mockTestId || '',
      mockClientId: mockClientId || '',
      duration: '2400' // 40 minutes
    });
    
    navigate(`/listening-practice/${testId}?${searchParams.toString()}`, { replace: true });
  }, [testId, mockTestId, mockClientId, showVideo, location.pathname, navigate]);

  // Set urlReady when location matches expected route
  // This ensures React Router has fully processed the navigation before rendering practice page
  useEffect(() => {
    if (testId && !showVideo && location.pathname === `/listening-practice/${testId}`) {
      setUrlReady(true);
    } else {
      setUrlReady(false);
    }
  }, [location.pathname, testId, showVideo]);

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
          onStart={onVideoStart}
          countdownSeconds={0}
          title="Listening Section Instructions"
          description="You will have 40 minutes to complete the listening section. The test will start automatically after this video."
          autoFullscreen={true}
          videoSrc={videoSrc || "/videos/listeningVideo.mp4"}
          onExit={() => {
            setShowVideo(false);
            if (onBack) onBack();
          }}
        />
      </>
    );
  }

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

  return (
    <>
      <MockTestExitModal
        isOpen={showExitModal}
        onConfirm={handleExitConfirm}
        onCancel={handleExitCancel}
        isSubmitting={isSubmitting}
      />
      {!showVideo && <ListeningPracticePage />}
    </>
  );
};

export default MockTestListening;

