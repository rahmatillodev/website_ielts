import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
const MockTestReading = ({ testId, mockTestId, mockClientId, onComplete, onEarlyExit, onBack, videoSrc }) => {
  const [showExitModal, setShowExitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVideo, setShowVideo] = useState(true);
  const [videoCompleted, setVideoCompleted] = useState(false);
  const [urlReady, setUrlReady] = useState(false);
  const [isEarlyExit, setIsEarlyExit] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Security hook
  const { resetExitModal, forceFullscreen } = useMockTestSecurity(
    () => {
      setShowExitModal(true);
    },
    true
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
      console.log('[MockTestReading] No mockTestId, skipping completion polling');
      return;
    }
    
   
    
    // Check immediately on mount (in case completion signal was set before component mounted)
    const checkImmediately = () => {
      const completed = localStorage.getItem(`mock_test_${mockTestId}_reading_completed`);
      if (completed === 'true') {
        console.log('[MockTestReading] Completion detected immediately on mount!', { mockTestId, isEarlyExit: isEarlyExitRef.current });
        const result = localStorage.getItem(`mock_test_${mockTestId}_reading_result`);
        if (result) {
          try {
            const parsedResult = JSON.parse(result);
            console.log('[MockTestReading] Parsed result:', parsedResult);
            
            setIsSubmitting(false);
            
            if (isEarlyExitRef.current && onEarlyExitRef.current) {
              onEarlyExitRef.current(parsedResult, 'reading');
            } else if (onCompleteRef.current) {
              onCompleteRef.current(parsedResult);
            } else {
              console.warn('[MockTestReading] No onComplete or onEarlyExit handler available!', {
                isEarlyExit: isEarlyExitRef.current,
                hasOnComplete: !!onCompleteRef.current,
                hasOnEarlyExit: !!onEarlyExitRef.current
              });
            }
            
            localStorage.removeItem(`mock_test_${mockTestId}_reading_completed`);
            localStorage.removeItem(`mock_test_${mockTestId}_reading_result`);
            return true;
          } catch (e) {
            console.error('[MockTestReading] Error parsing reading result:', e);
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
      const completed = localStorage.getItem(`mock_test_${mockTestId}_reading_completed`);
      if (completed === 'true') {
        const result = localStorage.getItem(`mock_test_${mockTestId}_reading_result`);
        if (result) {
          try {
            const parsedResult = JSON.parse(result);
            
            // Reset submitting state when completion is detected
            setIsSubmitting(false);
            
            if (isEarlyExitRef.current && onEarlyExitRef.current) {
              onEarlyExitRef.current(parsedResult, 'reading');
            } else if (onCompleteRef.current) {
              onCompleteRef.current(parsedResult);
            } else {
              console.warn('[MockTestReading] No onComplete or onEarlyExit handler available!', {
                isEarlyExit: isEarlyExitRef.current,
                hasOnComplete: !!onCompleteRef.current,
                hasOnEarlyExit: !!onEarlyExitRef.current
              });
            }
            
            localStorage.removeItem(`mock_test_${mockTestId}_reading_completed`);
            localStorage.removeItem(`mock_test_${mockTestId}_reading_result`);
            clearInterval(checkCompletion);
          } catch (e) {
            console.error('[MockTestReading] Error parsing reading result:', e);
            setIsSubmitting(false);
          }
        } else {
          console.warn('[MockTestReading] Completion detected but no result data found');
        }
      }
    }, 1000);

    return () => {
      clearInterval(checkCompletion);
    };
  }, [mockTestId]); // Only depend on mockTestId, not callbacks

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
  // Use location-based detection to ensure React Router has completed navigation
  useEffect(() => {
    if (!testId || showVideo) {
      setUrlReady(false);
      return;
    }
    
    const expectedPath = `/reading-practice/${testId}`;
    const currentPath = location.pathname;
    
    // Check if already on correct route (with or without query params)
    if (currentPath === expectedPath || currentPath.startsWith(`${expectedPath}?`)) {
      // Check if URL params are correct
      const currentSearch = new URLSearchParams(location.search);
      const hasMockTest = currentSearch.get('mockTest') === 'true';
      const hasMockTestId = currentSearch.get('mockTestId') === mockTestId;
      
      if (hasMockTest && hasMockTestId) {
        // URL is already correct, set ready immediately
        setUrlReady(true);
        return;
      }
    }
    
    // Navigate to practice route with correct params
    const searchParams = new URLSearchParams({
      mockTest: 'true',
      mockTestId: mockTestId || '',
      mockClientId: mockClientId || '',
      duration: '3600' // 60 minutes for reading
    });
    
    navigate(`/reading-practice/${testId}?${searchParams.toString()}`, { replace: true });
  }, [testId, mockTestId, mockClientId, showVideo, location.pathname, location.search, navigate]);

  // Set urlReady when location matches expected route
  // This ensures React Router has fully processed the navigation before rendering practice page
  useEffect(() => {
    if (!testId || showVideo) {
      setUrlReady(false);
      return;
    }
    
    const expectedPath = `/reading-practice/${testId}`;
    const currentPath = location.pathname;
    
    // Check if path matches (with or without query params)
    if (currentPath === expectedPath || currentPath.startsWith(`${expectedPath}?`)) {
      // Verify query params are correct
      const currentSearch = new URLSearchParams(location.search);
      const hasMockTest = currentSearch.get('mockTest') === 'true';
      const hasMockTestId = currentSearch.get('mockTestId') === mockTestId;
      
      if (hasMockTest && hasMockTestId) {
        setUrlReady(true);
      } else {
        setUrlReady(false);
      }
    } else {
      setUrlReady(false);
    }
  }, [location.pathname, location.search, testId, mockTestId, showVideo]);

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
          videoSrc={videoSrc || "/videos/readingVideo.mp4"}
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

