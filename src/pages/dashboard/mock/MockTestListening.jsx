import { useState, useEffect, useRef } from 'react';
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
const MockTestListening = ({ testId, mockTestId, mockClientId, onComplete, onEarlyExit, onBack }) => {
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

  // Auto-fullscreen after URL is ready
  useEffect(() => {
    if (!urlReady || !testId) return;

    let fullscreenEntered = false;
    let userInteractionListener = null;

    const enterFullscreen = async () => {
      try {
        const el = document.documentElement;
        const requestMethod = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
        if (requestMethod) {
          await requestMethod.call(el);
          fullscreenEntered = true;
          // Remove listener if fullscreen was successful
          if (userInteractionListener) {
            document.removeEventListener('click', userInteractionListener, true);
            document.removeEventListener('touchstart', userInteractionListener, true);
            document.removeEventListener('keydown', userInteractionListener, true);
            userInteractionListener = null;
          }
        }
      } catch (error) {
        // If fullscreen fails (e.g., no user gesture), set up listener for first user interaction
        if (!fullscreenEntered && !userInteractionListener) {
          userInteractionListener = async () => {
            try {
              const el = document.documentElement;
              const requestMethod = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
              if (requestMethod) {
                await requestMethod.call(el);
                fullscreenEntered = true;
                // Remove listener after successful fullscreen
                document.removeEventListener('click', userInteractionListener, true);
                document.removeEventListener('touchstart', userInteractionListener, true);
                document.removeEventListener('keydown', userInteractionListener, true);
                userInteractionListener = null;
              }
            } catch (err) {
              // Silently fail - user may have already entered fullscreen or browser doesn't support it
            }
          };
          // Listen for first user interaction
          document.addEventListener('click', userInteractionListener, true);
          document.addEventListener('touchstart', userInteractionListener, true);
          document.addEventListener('keydown', userInteractionListener, true);
        }
      }
    };

    // Small delay to ensure page is rendered
    const timeoutId = setTimeout(enterFullscreen, 100);

    return () => {
      clearTimeout(timeoutId);
      if (userInteractionListener) {
        document.removeEventListener('click', userInteractionListener, true);
        document.removeEventListener('touchstart', userInteractionListener, true);
        document.removeEventListener('keydown', userInteractionListener, true);
      }
    };
  }, [urlReady, testId]);

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
      <ListeningPracticePage />
    </>
  );
};

export default MockTestListening;

