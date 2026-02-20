import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { LuChevronsLeftRight } from "react-icons/lu";
import { useTestStore } from "@/store/testStore";
import QuestionRenderer from "@/components/questions/QuestionRenderer";
import QuestionHeader from "@/components/questions/QuestionHeader";
import { saveReadingPracticeData, loadReadingPracticeData, clearReadingPracticeData } from "@/store/LocalStorage/readingStorage";
import { saveSectionData, loadSectionData, loadMockTestData } from "@/store/LocalStorage/mockTestStorage";
import { submitTestAttempt, fetchLatestAttempt } from "@/lib/testAttempts";
import { useDashboardStore } from "@/store/dashboardStore";
import { useAuthStore } from "@/store/authStore";
import { toast } from "react-toastify";
import FinishModal from "@/components/modal/FinishModal";
import { convertDurationToSeconds } from "@/utils/testDuration";
import { AppearanceProvider, useAppearance } from "@/contexts/AppearanceContext";
import { AnnotationProvider, useAnnotation } from "@/contexts/AnnotationContext";
import TextSelectionTooltip from "@/components/annotations/TextSelectionTooltip";
import NoteSidebar from "@/components/sidebar/NoteSidebar";
import { applyHighlight, applyNote, getTextOffsets } from "@/utils/annotationRenderer";
import parse from "html-react-parser";
import PracticeFooter from "@/components/questions/PracticeFooter";
import { useMockTestSecurity } from "@/hooks/useMockTestSecurity";
import MockTestExitModal from "@/components/modal/MockTestExitModal";



const ReadingPracticePageContent = () => {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentTest, fetchTestById, loadingTest: LoadingTest, error } = useTestStore();
  const { authUser, userProfile } = useAuthStore();
  const fetchDashboardData = useDashboardStore((state) => state.fetchDashboardData);
  const { theme, themeColors, fontSizeValue } = useAppearance();
  const { isSidebarOpen } = useAnnotation();
  const timerInitializedRef = useRef(false);
  
  // Check if this is a mock test (check both searchParams and window.location.search)
  const urlSearchParams = React.useMemo(() => new URLSearchParams(window.location.search), []);
  const isMockTest = React.useMemo(() => 
    searchParams.get('mockTest') === 'true' || urlSearchParams.get('mockTest') === 'true',
    [searchParams, urlSearchParams]
  );
  const mockTestId = React.useMemo(() => 
    searchParams.get('mockTestId') || urlSearchParams.get('mockTestId'),
    [searchParams, urlSearchParams]
  );
  const mockClientId = React.useMemo(() => 
    searchParams.get('mockClientId') || urlSearchParams.get('mockClientId'),
    [searchParams, urlSearchParams]
  );
  
  // Get effective test ID from URL (handles history.replaceState case)
  const getEffectiveTestId = () => {
    if (id) return id;
    const pathMatch = window.location.pathname.match(/\/reading-practice\/([^\/\?]+)/);
    if (pathMatch && pathMatch[1]) {
      return pathMatch[1];
    }
    return null;
  };
  
  const effectiveTestId = getEffectiveTestId();

  // Status: 'taking', 'completed', 'reviewing'
  // Initialize status immediately from URL to prevent flickering
  const [status, setStatus] = useState(() => {
    const mode = new URLSearchParams(window.location.search).get('mode');
    return mode === 'review' ? 'reviewing' : 'taking';
  });
  const [currentPart, setCurrentPart] = useState(1); // Now represents part_number
  const [currentPage, setCurrentPage] = useState(1);
  const [timeRemaining, setTimeRemaining] = useState(null); // Will be set from test duration
  const [isStarted, setIsStarted] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false); // Track if user has interacted
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startTime, setStartTime] = useState(null); // Track when test started for elapsed time
  const [isPaused, setIsPaused] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [isEarlyExit, setIsEarlyExit] = useState(false);

  const [answers, setAnswers] = useState({});
  const [reviewData, setReviewData] = useState({}); // Stores review data: { [questionId]: { userAnswer, isCorrect, correctAnswer } }
  const [latestAttemptId, setLatestAttemptId] = useState(null);
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(true); // Toggle for showing correct answers in review mode
  const [bookmarks, setBookmarks] = useState(new Set()); // Store bookmarked question IDs/numbers

  const questionRefs = useRef({});
  const questionsContainerRef = useRef(null);
  const [activeQuestion, setActiveQuestion] = useState(null);
  const hasAutoSubmittedRef = useRef(false); // Prevent multiple auto-submissions
  const isSubmittingRef = useRef(false); // Track submission state to prevent race conditions
  const isMountedRef = useRef(true); // Track if component is mounted

  const [leftWidth, setLeftWidth] = useState(50);
  const containerRef = useRef(null);
  const isResizing = useRef(false);
  const navigate = useNavigate();

  // Annotation system
  const { addHighlight, addNote, highlights, notes } = useAnnotation();
  const selectableContentRef = useRef(null);
  const universalContentRef = useRef(null); // Universal container for all selectable content

  // Security hook for mock test mode (applies on refresh too)
  const { resetExitModal, forceFullscreen } = useMockTestSecurity(
    () => {
      if (isMockTest) {
        setShowExitModal(true);
      }
    },
    isMockTest // Only active in mock test mode
  );

  // ====== CHECK IF WE SHOULD REDIRECT TO MOCKTESTFLOW ======
  useEffect(() => {
    if (!isMockTest || !mockTestId) return;
    
    const savedFlowData = loadMockTestData(mockTestId);
    
    if (savedFlowData?.currentSection && savedFlowData.currentSection !== 'reading' && savedFlowData.currentSection !== 'audioCheck' && savedFlowData.currentSection !== 'intro') {
      navigate(`/mock-test/flow/${mockTestId}`, { replace: true });
    }
  }, [isMockTest, mockTestId, navigate]);

  useEffect(() => {
    const testIdToUse = effectiveTestId;
    
    if (!testIdToUse || (typeof testIdToUse !== 'string' && typeof testIdToUse !== 'number')) {
      if (isMockTest) {
        const retryTimeout = setTimeout(() => {
          let retryId = id;
          if (!retryId) {
            const pathMatch = window.location.pathname.match(/\/reading-practice\/([^\/\?]+)/);
            if (pathMatch && pathMatch[1]) {
              retryId = pathMatch[1];
            }
          }
          if (!retryId) {
            console.warn('[ReadingPracticePage] Still waiting for test ID in mock test mode...', {
              id,
              effectiveTestId,
              pathname: window.location.pathname,
              search: window.location.search
            });
          }
        }, 500);
        return () => clearTimeout(retryTimeout);
      }
      console.error('[ReadingPracticePage] Invalid test ID:', testIdToUse);
      return;
    }

    let isMounted = true;

    // Cancel any previous request and clear current test
    const { cancelFetch, clearCurrentTest } = useTestStore.getState();
    cancelFetch();
    clearCurrentTest();

    const loadTestData = async () => {
      try {
        const isReviewMode = status === 'reviewing';
        const includeCorrectAnswers = isReviewMode;

        await fetchTestById(testIdToUse, false, includeCorrectAnswers);

        if (!isMounted) return;

        // Load/restore progress on refresh
        if (isMockTest && mockTestId) {
          // For mock test, use mock test storage
          const savedData = loadSectionData(mockTestId, 'reading');
          if (savedData && isMounted) {
            if (savedData.answers && Object.keys(savedData.answers).length > 0) {
              setAnswers(savedData.answers);
              setHasInteracted(true);
            }
            // For mock test, restore time remaining and let auto-start resume the timer
            if (savedData.timeRemaining !== undefined && savedData.timeRemaining !== null) {
              setTimeRemaining(savedData.timeRemaining);
              
              // If time is already expired (<= 0), trigger auto-submit immediately
              if (savedData.timeRemaining <= 0) {
                setHasInteracted(true);
                setIsStarted(true); // Set started so auto-submit effect can trigger
              }
            }
            if (savedData.startTime) {
              setStartTime(savedData.startTime);
            }
            // Reset submission refs when loading saved data to ensure clean state
            hasAutoSubmittedRef.current = false;
            isSubmittingRef.current = false;
            setIsSubmitting(false);
          }
        } else if (!isMockTest) {
          // For regular practice, use reading storage
          const savedData = loadReadingPracticeData(testIdToUse || effectiveTestId);
          if (savedData) {
            // Restore answers
            if (savedData.answers && Object.keys(savedData.answers).length > 0) {
              setAnswers(savedData.answers);
              setHasInteracted(true);
            }
            // Restore bookmarks (convert array back to Set)
            if (savedData.bookmarks && Array.isArray(savedData.bookmarks)) {
              setBookmarks(new Set(savedData.bookmarks));
            }
            // Restore time remaining and timer state
            if (savedData.timeRemaining !== undefined && savedData.timeRemaining !== null) {
              setTimeRemaining(savedData.timeRemaining);
              // On refresh, timer should be paused (not running)
              setIsStarted(false);
              setIsPaused(true);
            }
            // Restore start time
            if (savedData.startTime) {
              setStartTime(savedData.startTime);
            }
          }
        }
      } catch (e) {
        if (e.name !== 'AbortError') {
          console.error('[ReadingPracticePage] fetch error:', e);
        }
      }
    };

    loadTestData();

    return () => {
      isMounted = false;
      // Cleanup: cancel any active fetch requests
      const { cancelFetch, clearCurrentTest } = useTestStore.getState();
      cancelFetch();
      clearCurrentTest(false);
    };
    // eslint-disable-next-line
  }, [effectiveTestId, fetchTestById, isMockTest, status]);


  // Initialize timeRemaining from test duration when currentTest loads (if not loaded from storage)
  // For mock test: use duration from URL param (3600 seconds = 60 minutes) or test duration
  useEffect(() => {
    if (!currentTest) return;
    
    // Only initialize once per test load - use ref to prevent reset loops
    if (timerInitializedRef.current) return;

    // For mock test, check if we have saved time remaining first
    if (isMockTest && mockTestId) {
      const savedData = loadSectionData(mockTestId, 'reading');
      if (savedData && savedData.timeRemaining !== undefined && savedData.timeRemaining !== null) {
        // Use saved time remaining - don't reset to full duration
        // If time remaining is 0 or negative, it will trigger auto-submit
        setTimeRemaining(savedData.timeRemaining);
        timerInitializedRef.current = true;
        return;
      }
    }

    // If no saved data or not mock test, initialize from duration
    // For mock test, check URL for duration param (in seconds)
    let durationInSeconds;
    if (isMockTest) {
      const durationParam = searchParams.get('duration') || urlSearchParams.get('duration');
      durationInSeconds = durationParam ? parseInt(durationParam, 10) : convertDurationToSeconds(currentTest.duration);
    } else {
      // Check if we have saved data first
      const savedData = loadReadingPracticeData(id);
      if (savedData?.timeRemaining !== undefined && savedData?.timeRemaining !== null) {
        // Use saved time remaining
        setTimeRemaining(savedData.timeRemaining);
        timerInitializedRef.current = true;
        return;
      }
      durationInSeconds = convertDurationToSeconds(currentTest.duration);
    }

    // Set time remaining only if not already set
    setTimeRemaining(durationInSeconds);
    timerInitializedRef.current = true;
  }, [currentTest, isMockTest, searchParams, urlSearchParams, mockTestId, id]);
  
  // Reset initialization flag when test ID changes (new test loaded)
  useEffect(() => {
    timerInitializedRef.current = false;
  }, [effectiveTestId]);

  const startResize = (e) => {
    isResizing.current = true;
  };

  const stopResize = () => {
    isResizing.current = false;
  };

  const handleResize = (e) => {
    if (!isResizing.current || !containerRef.current) return;
    const containerWidth = containerRef.current.offsetWidth;
    const newLeftWidth = (e.clientX / containerWidth) * 100;
    if (newLeftWidth > 20 && newLeftWidth < 80) {
      setLeftWidth(newLeftWidth);
    }
  };

  useEffect(() => {
    window.addEventListener("mousemove", handleResize);
    window.addEventListener("mouseup", stopResize);
    return () => {
      window.removeEventListener("mousemove", handleResize);
      window.removeEventListener("mouseup", stopResize);
    };
  }, []);

  // Utility function to sort parts by part_number
  const getSortedParts = useCallback(() => {
    if (!currentTest?.parts) return [];
    return [...currentTest.parts].sort((a, b) => {
      const aNum = a.part_number ?? 0;
      const bNum = b.part_number ?? 0;
      return aNum - bNum;
    });
  }, [currentTest?.parts]);

  // Get current part data from the fetched test - using part_number
  const currentPartData = currentTest?.parts?.find(part => part.part_number === currentPart);

  // Get question groups from current part (already structured from store)
  // Sort groups by the minimum question_number in each group
  const questionGroups = useMemo(() => {
    if (!currentPartData?.questionGroups) return [];

    return [...currentPartData.questionGroups]
      .map(questionGroup => {
        // Sort questions within each group by question_number first
        const sortedQuestions = [...(questionGroup.questions || [])].sort((a, b) => {
          const aNum = a.question_number ?? Number.MAX_SAFE_INTEGER;
          const bNum = b.question_number ?? Number.MAX_SAFE_INTEGER;
          return aNum - bNum;
        });

        return {
          ...questionGroup,
          questions: sortedQuestions
        };
      })
      .sort((a, b) => {
        // Get minimum question_number from each group (excluding null values)
        const aQuestions = a.questions || [];
        const bQuestions = b.questions || [];

        const aMin = aQuestions
          .map(q => q.question_number)
          .filter(num => num != null)
          .sort((x, y) => x - y)[0] ?? Number.MAX_SAFE_INTEGER;

        const bMin = bQuestions
          .map(q => q.question_number)
          .filter(num => num != null)
          .sort((x, y) => x - y)[0] ?? Number.MAX_SAFE_INTEGER;

        return aMin - bMin;
      });
  }, [currentPartData]);

  // Get question range for a group (calculate from actual question numbers)
  const getQuestionRange = (questionGroup) => {
    const questions = questionGroup.questions || [];
    if (questions.length === 0) return '';

    // Filter out questions with null question_number and sort by question_number
    const questionsWithNumbers = questions
      .filter(q => q.question_number != null)
      .sort((a, b) => {
        const aNum = a.question_number ?? 0;
        const bNum = b.question_number ?? 0;
        return aNum - bNum;
      });

    if (questionsWithNumbers.length === 0) return '';

    const first = questionsWithNumbers[0]?.question_number ?? 0;
    const last = questionsWithNumbers[questionsWithNumbers.length - 1]?.question_number ?? 0;

    // Always show range format: "first-last" or just "first" if single question
    return first === last ? `${first}` : `${first}-${last}`;
  };

  // Get overall question range for current part
  const getPartQuestionRange = () => {
    if (!currentPartData?.questions || currentPartData.questions.length === 0) return '';
    const sorted = [...currentPartData.questions].sort((a, b) => {
      const aNum = a.question_number ?? 0;
      const bNum = b.question_number ?? 0;
      return aNum - bNum;
    });
    const first = sorted[0]?.question_number ?? 0;
    const last = sorted[sorted.length - 1]?.question_number ?? 0;
    return first === last ? `${first}` : `${first}-${last}`;
  };

  // Calculate answered questions for a part
  // Uses questions.id as the answer key (from nested structure)
  const getPartAnsweredCount = (partQuestions) => {
    if (!partQuestions) return 0;
    return partQuestions.filter(q => {
      // Check both question.id (UUID) and question_number for answer
      // Some components use question.id, others use question_number
      const questionId = q.id;
      const questionNumber = q.question_number;
      const groupQuestionId = q.question_id; // For multiple_answers, answer is stored at group level
      
      // First check by question.id (UUID) - this is what most components use
      if (questionId && answers[questionId] && answers[questionId].toString().trim() !== '') {
        return true;
      }
      
      // Then check by question_number - for backward compatibility and matching_information type
      if (questionNumber && answers[questionNumber] && answers[questionNumber].toString().trim() !== '') {
        return true;
      }
      
      // For multiple_answers and other group-based types, check group-level question_id
      // The answer is stored using the group-level question.id (not individual question.id)
      if (groupQuestionId && answers[groupQuestionId] && answers[groupQuestionId].toString().trim() !== '') {
        return true;
      }
      
      return false;
    }).length;
  };

  // Get all questions across all parts, sorted by question_number
  const getAllQuestions = React.useCallback(() => {
    if (!currentTest?.parts) return [];

    const allQuestions = [];
    const seenQuestionNumbers = new Set(); // Track seen question numbers to avoid duplicates
    const sortedParts = getSortedParts();

    sortedParts.forEach(part => {
      // Get questions from part.questions (this is already a flattened list)
      if (part.questions && Array.isArray(part.questions) && part.questions.length > 0) {
        part.questions.forEach(q => {
          if (q.question_number != null && !seenQuestionNumbers.has(q.question_number)) {
            seenQuestionNumbers.add(q.question_number);
            allQuestions.push({
              questionNumber: q.question_number,
              partNumber: part.part_number ?? part.id,
              question: q
            });
          }
        });
      } else {
        // Fallback: get questions from questionGroups if part.questions is empty
        if (part.questionGroups && Array.isArray(part.questionGroups)) {
          part.questionGroups.forEach(group => {
            if (group.questions && Array.isArray(group.questions)) {
              group.questions.forEach(q => {
                if (q.question_number != null && !seenQuestionNumbers.has(q.question_number)) {
                  seenQuestionNumbers.add(q.question_number);
                  allQuestions.push({
                    questionNumber: q.question_number,
                    partNumber: part.part_number ?? part.id,
                    question: q
                  });
                }
              });
            }
          });
        }
      }
    });

    return allQuestions.sort((a, b) => a.questionNumber - b.questionNumber);
  }, [currentTest?.parts, getSortedParts]);

  const scrollToQuestion = (questionNumber) => {
    const el = questionRefs.current[questionNumber];
    if (!el || !questionsContainerRef.current) return;

    const container = questionsContainerRef.current;

    container.scrollTo({
      top: el.offsetTop - container.offsetTop - 20,
      behavior: "smooth",
    });

    setActiveQuestion(questionNumber); // manual focus
  };


  // ========== TIMER AUTO-START LOGIC (Mock Test) ==========
  // For mock test, timer should auto-start immediately when timeRemaining is set
  useEffect(() => {
    // Don't auto-start if submission is in progress
    if (isSubmitting || isSubmittingRef.current) {
      return;
    }
    
    // Don't auto-start if completion signal exists (submission was successful)
    if (isMockTest && mockTestId) {
      const completionKey = `mock_test_${mockTestId}_reading_completed`;
      const isCompleted = localStorage.getItem(completionKey) === 'true';
      if (isCompleted) {
        return;
      }
    }
    
    // In mock test mode, ensure timer starts automatically when timeRemaining is set
    if (isMockTest && currentTest && timeRemaining !== null && timeRemaining > 0 && !isStarted) {
      setIsStarted(true);
      setIsPaused(false);
      if (!startTime) {
        setStartTime(Date.now());
      }
      setHasInteracted(true);
    }
  }, [isMockTest, currentTest, timeRemaining, isStarted, startTime, isSubmitting, mockTestId]);

  // Timer countdown interval - this is the actual timer that decrements
  useEffect(() => {
    // Don't start timer if conditions aren't met
    if (!isStarted || isPaused) return;
    if (!hasInteracted) return;
    if (timeRemaining === null || timeRemaining <= 0) return;
    // Stop timer if already submitting
    if (isSubmitting || isSubmittingRef.current) return;

    // Set startTime if not set (safety check)
    if (!startTime) {
      setStartTime(Date.now());
    }

    // Start the countdown interval
    const interval = setInterval(() => {
      // Stop timer immediately if submission has started (check both ref and state)
      if (isSubmittingRef.current || isSubmitting) {
        setIsStarted(false);
        setIsPaused(true);
        clearInterval(interval);
        return;
      }
      
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          setIsStarted(false);
          setIsPaused(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
    // Remove timeRemaining from dependencies to prevent effect from re-running every second
    // The functional update pattern (prev => ...) ensures we always use the latest value
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStarted, hasInteracted, isPaused, startTime, isSubmitting]);

  // Auto-submit when timer reaches zero
  useEffect(() => {
    // Check if timer has reached zero (allow for <= 0 to catch edge cases)
    if (
      timeRemaining !== null &&
      timeRemaining <= 0 &&
      (isStarted || hasInteracted) &&
      status === 'taking' &&
      authUser &&
      effectiveTestId &&
      currentTest &&
      !hasAutoSubmittedRef.current &&
      !isSubmittingRef.current &&
      isMountedRef.current
    ) {
      // Stop the timer immediately before auto-submitting
      setIsStarted(false);
      setIsPaused(true);
      
      // Auto-submit the test when timer reaches zero
      hasAutoSubmittedRef.current = true;
      const autoSubmit = async () => {
        try {
          const result = await handleSubmitTest();
          console.log('[ReadingPracticePage] Auto-submit result:', result);
          
          // Navigate if submission was successful (navigation is safe even if component is unmounting)
          // Note: handleSubmitTest already navigates for mock tests, but we check here as a fallback
          if (result && result.success) {
            // Double-check isMockTest to ensure we navigate correctly
            const currentIsMockTest = searchParams.get('mockTest') === 'true' || 
                                     new URLSearchParams(window.location.search).get('mockTest') === 'true';
            
            // Only navigate if handleSubmitTest didn't already navigate (for non-mock tests)
            // For mock tests, handleSubmitTest already navigates, so this is just a safety check
            if (currentIsMockTest && mockTestId) {
              // In mock test mode, handleSubmitTest should have already navigated
              // But if it didn't (edge case), navigate here as fallback
              const completionKey = `mock_test_${mockTestId}_reading_completed`;
              const isCompleted = localStorage.getItem(completionKey) === 'true';
              if (!isCompleted) {
                console.warn('[ReadingPracticePage] Completion signal not set, setting it now');
                const resultKey = `mock_test_${mockTestId}_reading_result`;
                const resultData = {
                  success: true,
                  attemptId: result.attemptId,
                  score: result.score,
                  correctCount: result.correctCount,
                  totalQuestions: result.totalQuestions,
                };
                localStorage.setItem(completionKey, 'true');
                localStorage.setItem(resultKey, JSON.stringify(resultData));
              }
              console.log('[ReadingPracticePage] Auto-submit successful, navigating to MockTestFlow', {
                mockTestId,
                result: result.success,
                completionSet: localStorage.getItem(completionKey) === 'true'
              });
              navigate(`/mock-test/flow/${mockTestId}`, { replace: true });
            } else if (!currentIsMockTest && effectiveTestId) {
              console.log('[ReadingPracticePage] Navigating to result page (non-mock test)', {
                effectiveTestId,
                result: result.success,
                isMockTest: currentIsMockTest
              });
              navigate(`/reading-result/${effectiveTestId}`);
            } else {
              console.log('[ReadingPracticePage] Auto-submit successful but skipping navigation', {
                isMockTest: currentIsMockTest,
                effectiveTestId,
                reason: currentIsMockTest ? 'no mockTestId' : 'no test ID'
              });
            }
          } else if (result && !result.success && isMountedRef.current) {
            console.error('[ReadingPracticePage] Auto-submit failed:', result.error);
            // Reset the flag so user can try again
            hasAutoSubmittedRef.current = false;
            isSubmittingRef.current = false;
            setIsSubmitting(false);
          }
        } catch (error) {
          console.error('[ReadingPracticePage] Auto-submit error:', error);
          // Reset the flag on error
          if (isMountedRef.current) {
            hasAutoSubmittedRef.current = false;
            isSubmittingRef.current = false;
            setIsSubmitting(false);
          }
        }
      };
      autoSubmit();
    }
    return () => {
      if (status !== 'taking') {
        hasAutoSubmittedRef.current = false;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRemaining, status, isStarted, hasInteracted, authUser, effectiveTestId, currentTest, isMockTest, mockTestId, searchParams, navigate, ]);

  // Set mounted ref to false when component unmounts
  // Reset submission refs on mount to ensure clean state after refresh
  useEffect(() => {
    isMountedRef.current = true;
    // Reset refs on mount to ensure clean state after refresh
    hasAutoSubmittedRef.current = false;
    isSubmittingRef.current = false;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // persist data on change
  useEffect(() => {
    if (!hasInteracted) return;
    
    if (isMockTest && mockTestId) {
      // For mock test, use mock test storage
      saveSectionData(mockTestId, 'reading', {
        answers,
        timeRemaining,
        startTime,
        completed: false,
      });
    } else if (id) {
      // For regular practice, use reading storage
      const elapsedTime = startTime
        ? Math.floor((Date.now() - startTime) / 1000)
        : 0;

      saveReadingPracticeData(id, {
        answers,
        timeRemaining,
        elapsedTime,
        startTime: startTime || (hasInteracted || isStarted ? Date.now() : null),
        bookmarks,
      });
    }
  }, [answers, id, hasInteracted, isStarted, timeRemaining, startTime, bookmarks, isMockTest, mockTestId]);

  // persist data every 5s if interacting
  useEffect(() => {
    if ((!id && !mockTestId) || (!isStarted && !hasInteracted)) return;

    const interval = setInterval(() => {
      if (hasInteracted) {
        if (isMockTest && mockTestId) {
          // For mock test, use mock test storage
          saveSectionData(mockTestId, 'reading', {
            answers,
            timeRemaining,
            startTime,
            completed: false,
          });
        } else if (id) {
          // For regular practice, use reading storage
          const elapsedTime = startTime
            ? Math.floor((Date.now() - startTime) / 1000)
            : 0;

          saveReadingPracticeData(id, {
            answers,
            timeRemaining,
            elapsedTime,
            startTime: startTime || Date.now(),
            bookmarks,
          });
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [id, mockTestId, timeRemaining, answers, hasInteracted, isStarted, startTime, bookmarks, isMockTest]);

  // Intersection Observer for active question tracking
  useEffect(() => {
    if (!questionsContainerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const questionNumber = Number(entry.target.dataset.questionNumber);
            setActiveQuestion(questionNumber);
          }
        });
      },
      {
        root: questionsContainerRef.current,
        threshold: 0.3,
        rootMargin: '-100px 0px -50% 0px',
      }
    );

    // Observe all question elements
    Object.values(questionRefs.current).forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [currentPart, currentPartData?.questions]);



  const handleAnswerChange = (questionIdOrNumber, answer) => {
    // Don't allow changes in review mode
    if (status === 'reviewing') return;

    // Trigger timer on first interaction
    if (!hasInteracted && !isStarted) {
      setHasInteracted(true);
    }

    // Use questions.id as the answer key (from the nested structure)
    // questionIdOrNumber should now be questions.id from the nested query
    setAnswers((prev) => ({
      ...prev,
      [questionIdOrNumber]: answer,
    }));
  };

  // Toggle bookmark for a question
  const toggleBookmark = (questionIdOrNumber) => {
    setBookmarks((prev) => {
      const newBookmarks = new Set(prev);
      if (newBookmarks.has(questionIdOrNumber)) {
        newBookmarks.delete(questionIdOrNumber);
      } else {
        newBookmarks.add(questionIdOrNumber);
      }
      return newBookmarks;
    });
  };

  const handlePartChange = (partNumber) => {
    setCurrentPart(partNumber);
    setCurrentPage(1); // Reset to first page when switching parts
  };

  const handleStart = () => {
    const now = Date.now();
    setIsStarted(true);
    setHasInteracted(true);
    setIsPaused(false);
    setStartTime(now);

    // Save initial state when starting
    if (isMockTest && mockTestId) {
      saveSectionData(mockTestId, 'reading', {
        answers,
        timeRemaining,
        startTime: now,
        completed: false,
      });
    } else if (id) {
      saveReadingPracticeData(id, {
        answers,
        timeRemaining,
        elapsedTime: 0,
        startTime: now,
        bookmarks,
      });
    }
  };

  const handlePause = () => {
    if (isPaused) {
      // Resume
      setIsPaused(false);
      setIsStarted(true);
    } else {
      // Pause
      setIsPaused(true);
      setIsStarted(false);
    }
  };

  // Handler for clearing localStorage when back button is clicked
  const handleBack = () => {
    // In mock test mode, show exit modal instead of navigating
    if (isMockTest) {
      setShowExitModal(true);
      return;
    }
    if (id && !isMockTest) {
      clearReadingPracticeData(id);
    }
  };

  const handleExitConfirm = async () => {
    setShowExitModal(false);
    resetExitModal();
    // Mark as early exit so we navigate to results after submission
    setIsEarlyExit(true);
    // Trigger submission via custom event
    // Note: Don't set isSubmitting here - let handleSubmitTest manage its own state
    // Setting it here causes a race condition where the event handler sees isSubmitting=true
    // and returns early before calling handleSubmitTest
    window.dispatchEvent(new CustomEvent('mockTestForceSubmit', {
      detail: { section: 'reading', mockTestId }
    }));
  };

  const handleExitCancel = () => {
    setShowExitModal(false);
    resetExitModal();
    forceFullscreen();
  };

  // Handler for submitting test - memoized to prevent unnecessary re-renders
  const handleSubmitTest = useCallback(async () => {
    // Prevent duplicate submissions using ref
    if (isSubmittingRef.current || isSubmitting) {
      return { success: false, error: 'Submission already in progress' };
    }
    
    if (!authUser || !effectiveTestId || !currentTest) {
      return { success: false, error: 'Missing required information' };
    }

    // Stop the timer immediately when submission starts (set ref first to stop timer interval)
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setIsStarted(false);
    setIsPaused(true);

    try {
      // Calculate time taken in seconds
      const timeTaken = startTime
        ? Math.floor((Date.now() - startTime) / 1000)
        : null;

      // Prepare mock test context if in mock test mode
      const mockTestContext = isMockTest && mockTestId ? {
        mockTestId: mockTestId,
        mockClientId: mockClientId,
        section: 'reading'
      } : null;

      // Submit test attempt to backend
      const result = await submitTestAttempt(effectiveTestId, answers, currentTest, timeTaken, 'reading', mockTestContext);

      if (result.success) {
        // Clear practice data on successful submission
        if (effectiveTestId && !isMockTest) {
          clearReadingPracticeData(effectiveTestId);
        }
        
        // If mock test, trigger completion callback via localStorage
        if (isMockTest && mockTestId) {
          const completionKey = `mock_test_${mockTestId}_reading_completed`;
          const resultKey = `mock_test_${mockTestId}_reading_result`;
          const resultData = {
            success: true,
            attemptId: result.attemptId,
            score: result.score,
            correctCount: result.correctCount,
            totalQuestions: result.totalQuestions,
          };
          localStorage.setItem(completionKey, 'true');
          localStorage.setItem(resultKey, JSON.stringify(resultData));
          
          // Navigate back to MockTestFlow so it can detect completion and move to next section
          // This ensures the flow continues even after refresh
          navigate(`/mock-test/flow/${mockTestId}`, { replace: true });
        }
        
        // Reset submission state after successful submission
        // This prevents the component from being stuck in loading state
        isSubmittingRef.current = false;
        setIsSubmitting(false);
        
        return { success: true, attemptId: result.attemptId, score: result.score };
      } else {
        // Reset submission state on failure
        isSubmittingRef.current = false;
        setIsSubmitting(false);
        console.error('[ReadingPracticePage] Submission failed:', result.error);
        toast.error(result.error || 'Failed to submit test attempt');
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('[ReadingPracticePage] Error submitting test:', error);
      // Reset submission state on error
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      toast.error(error.message || 'An error occurred while submitting your test');
      return { success: false, error: error.message };
    }
  }, [isSubmitting, authUser, effectiveTestId, currentTest, answers, startTime, isMockTest, mockTestId]);

  /* ================= FORCE SUBMIT HANDLER (Mock Test) ================= */
  // Listen for forced submission when user confirms exit
  // Only active in mock test mode
  useEffect(() => {
    if (!isMockTest || !mockTestId) return;

    const handleForceSubmit = async (event) => {
      const { section, mockTestId: eventMockTestId } = event.detail || {};
      
      // Only handle if it's for reading section and matches our mockTestId
      if (section === 'reading' && eventMockTestId === mockTestId) {
        // Prevent duplicate submissions - only check ref to avoid stale closure issues
        // The ref is set inside handleSubmitTest, so this accurately reflects submission state
        if (isSubmittingRef.current) {
          console.warn('[ReadingPracticePage] Submission already in progress, ignoring duplicate request');
          return;
        }

        // Validate all required data is available before attempting submission
        // This ensures we only submit when we have all necessary information
        if (!authUser || !effectiveTestId || !currentTest) {
          console.error('[ReadingPracticePage] Cannot force submit: Missing required data', {
            hasAuthUser: !!authUser,
            hasEffectiveTestId: !!effectiveTestId,
            hasCurrentTest: !!currentTest,
            isMockTest,
            mockTestId
          });
          toast.error('Cannot submit: Test data not fully loaded. Please wait and try again.');
          return;
        }

        try {
          // Call handleSubmitTest which handles all the submission logic
          // handleSubmitTest will set both isSubmittingRef and isSubmitting state
          const result = await handleSubmitTest();
          
          if (!result || !result.success) {
            console.error('[ReadingPracticePage] Force submit failed:', result?.error);
            toast.error(result?.error || 'Failed to submit test attempt');
            // handleSubmitTest already resets the state on failure, but ensure it's reset here too
            isSubmittingRef.current = false;
            setIsSubmitting(false);
          }
          // On success, handleSubmitTest manages state and localStorage completion signal
          // The completion will be detected by MockTestReading's polling mechanism
        } catch (error) {
          console.error('[ReadingPracticePage] Error force-submitting reading:', error);
          toast.error('An error occurred while submitting your test');
          // Reset state on unexpected error
          isSubmittingRef.current = false;
          setIsSubmitting(false);
        }
      }
    };

    window.addEventListener('mockTestForceSubmit', handleForceSubmit);

    return () => {
      window.removeEventListener('mockTestForceSubmit', handleForceSubmit);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMockTest, mockTestId, authUser, effectiveTestId, currentTest]);

  // Handler for reviewing test
  const handleReviewTest = async () => {
    // Ensure all required data is available
    if (!authUser || !id || !currentTest) {
      console.warn('[handleReviewTest] Missing required data:', { authUser: !!authUser, id: !!id, currentTest: !!currentTest });
      return;
    }

    try {
      const result = await fetchLatestAttempt(authUser.id, id);
      if (result.success && result.attempt && result.answers) {
        // Build mapping from question.id to question_number for consistent keying
        const questionIdToNumberMap = {};
        if (currentTest?.parts) {

          currentTest.parts.forEach((part) => {
            if (part.questionGroups) {
              part.questionGroups.forEach((questionGroup) => {
                if (questionGroup.questions) {
                  questionGroup.questions.forEach((question) => {
                    if (question.id && question.question_number) {
                      questionIdToNumberMap[question.id] = question.question_number;
                    }
                  });
                }
              });
            }
          });
        }

        // Convert answers to review data format, keyed by both question.id and question_number
        const reviewDataObj = {};
        const reviewDataByNumber = {};
        Object.keys(result.answers).forEach((questionId) => {
          const answerInfo = result.answers[questionId];
          const questionNumber = questionIdToNumberMap[questionId] || questionId;
          const reviewItem = {
            userAnswer: answerInfo.userAnswer || '',
            isCorrect: answerInfo.isCorrect || false,
            correctAnswer: answerInfo.correctAnswer || '',
          };
          // Store by both question.id (UUID) and question_number for compatibility
          reviewDataObj[questionId] = reviewItem;
          if (questionNumber !== questionId) {
            reviewDataByNumber[questionNumber] = reviewItem;
          }
        });

        // Merge both key formats for maximum compatibility
        setReviewData({ ...reviewDataObj, ...reviewDataByNumber });
        setStatus('reviewing');
        setLatestAttemptId(result.attempt.id);
        setShowCorrectAnswers(true); // Default to showing correct answers

        // Also set answers for display, keyed by both question.id and question_number
        const answersObj = {};
        const answersByNumber = {};
        Object.keys(reviewDataObj).forEach((questionId) => {
          const questionNumber = questionIdToNumberMap[questionId] || questionId;
          const userAnswer = reviewDataObj[questionId].userAnswer;
          answersObj[questionId] = userAnswer;
          if (questionNumber !== questionId) {
            answersByNumber[questionNumber] = userAnswer;
          }
        });
        setAnswers({ ...answersObj, ...answersByNumber });
      } else {
        console.error('[handleReviewTest] Failed to fetch attempt:', result.error);
        // Better error handling - don't use alert, use console and set state
        setStatus('taking'); // Reset to taking mode on error
        setShowCorrectAnswers(false);
        // Optionally show toast notification instead of alert
        console.warn('Failed to load review data. Please try again.');
      }
    } catch (error) {
      console.error('[handleReviewTest] Error fetching attempt:', error);
      setStatus('taking'); // Reset to taking mode on error
      setShowCorrectAnswers(false);
      console.warn('An error occurred while loading review data.');
    }
  };

  // Handler for retaking test
  const handleRetakeTest = () => {
    if (!id || isMockTest) return; // Don't allow retake in mock test mode

    // Remove review mode from URL
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.delete('mode');
    const newUrl = newSearchParams.toString()
      ? `/reading-practice/${id}?${newSearchParams.toString()}`
      : `/reading-practice/${id}`;
    navigate(newUrl, { replace: true });
    // window.history.replaceState({}, '', newUrl);
    setSearchParams(newSearchParams, { replace: true });

    // Reset all state
    setAnswers({});
    setReviewData({});
    setStatus('taking');
    setShowCorrectAnswers(false); // Hide the show correct answers toggle
    // Reset timeRemaining to test duration (will be set by useEffect when currentTest is available)
    setTimeRemaining(currentTest ? convertDurationToSeconds(currentTest.duration) : 60 * 60);
    setIsStarted(false);
    setHasInteracted(false);
    setStartTime(null);
    setCurrentPart(1);
    setCurrentPage(1);
    setLatestAttemptId(null);
    setIsPaused(false); // Reset pause state
    setIsSubmitting(false); // Reset submitting state
    hasAutoSubmittedRef.current = false; // Reset auto-submit flag
    isSubmittingRef.current = false; // Reset submission ref

    // Clear localStorage
    clearReadingPracticeData(id);
  };

  // Handler for clearing localStorage when finish is clicked
  const handleFinish = () => {
    // Just open the modal - submission will happen in the modal's submit handler
    setIsModalOpen(true);
  };

  // Handle input interactions to trigger timer
  const handleInputInteraction = () => {
    if (!hasInteracted && !isStarted) {
      const newStartTime = startTime || Date.now();
      setIsStarted(true);
      setIsPaused(false);
      setStartTime(newStartTime);
      setHasInteracted(true);
      // Persist started state
      if (isMockTest && mockTestId) {
        saveSectionData(mockTestId, 'reading', {
          answers,
          timeRemaining,
          startTime: newStartTime,
          completed: false,
        });
      } else if (id) {
        saveReadingPracticeData(id, {
          answers,
          timeRemaining,
          elapsedTime: 0,
          startTime: newStartTime,
          bookmarks,
        });
      }
    }
  };

  // Reset to page 1 when part changes
  useEffect(() => {
    setCurrentPage(1);
  }, [currentPart]);

  // Update currentPart when test data loads and set to first part (by part_number)
  useEffect(() => {
    const sortedParts = getSortedParts();
    if (sortedParts.length > 0) {
      if (!sortedParts.find(p => p.part_number === currentPart)) {
        setCurrentPart(sortedParts[0]?.part_number ?? 1);
      }
    }
  }, [currentTest, getSortedParts, currentPart]);

  // Check URL params for mode (review or retake) - after functions are defined
  useEffect(() => {
    // Component lifecycle management: Track if component is mounted
    let isMounted = true;

    const mode = searchParams.get('mode');
    if (isMounted) {
      if (mode === 'review' && authUser && id && currentTest) {
        handleReviewTest();
      } else if (mode === 'retake' && authUser && id) {
        handleRetakeTest();
      }
    }

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, authUser, id, currentTest]);

  // Annotation handlers - now support sectionType and testType
  const handleHighlight = useCallback((range, text, partId, sectionType = 'passage', testType = 'reading') => {
    // Find the appropriate container based on section type
    let container = null;
    if (sectionType === 'passage') {
      container = selectableContentRef.current;
    } else {
      // For questions section, find the container from the range
      container = range.commonAncestorContainer;
      // Walk up to find a suitable container
      let element = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;
      while (element && element !== universalContentRef.current) {
        if (element.hasAttribute('data-selectable') || element.hasAttribute('data-section')) {
          container = element;
          break;
        }
        element = element.parentElement;
      }
    }

    if (!container) return;

    const offsets = getTextOffsets(container, range);

    // Apply highlight to DOM
    const highlightId = addHighlight({
      text,
      startOffset: offsets.startOffset,
      endOffset: offsets.endOffset,
      containerId: `${sectionType}-part-${partId}`,
      partId,
      sectionType,
      testType,
      range: range.cloneRange(),
    });

    // Apply visual highlight
    applyHighlight(range, highlightId);

    // Clear selection
    window.getSelection().removeAllRanges();
  }, [addHighlight]);

  const handleNote = useCallback((range, text, partId, sectionType = 'passage', testType = 'reading') => {
    // Find the appropriate container based on section type
    let container = null;
    if (sectionType === 'passage') {
      container = selectableContentRef.current;
    } else {
      // For questions section, find the container from the range
      container = range.commonAncestorContainer;
      // Walk up to find a suitable container
      let element = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;
      while (element && element !== universalContentRef.current) {
        if (element.hasAttribute('data-selectable') || element.hasAttribute('data-section')) {
          container = element;
          break;
        }
        element = element.parentElement;
      }
    }

    if (!container) return;

    const offsets = getTextOffsets(container, range);

    // Apply note to DOM
    const noteId = addNote({
      text,
      note: '',
      startOffset: offsets.startOffset,
      endOffset: offsets.endOffset,
      containerId: `${sectionType}-part-${partId}`,
      partId,
      sectionType,
      testType,
      range: range.cloneRange(),
    });

    // Apply visual note
    applyNote(range, noteId);

    // Clear selection
    window.getSelection().removeAllRanges();
  }, [addNote]);

  // Calculate font size in rem (base 16px = 1rem)
  const baseFontSize = fontSizeValue.base / 16; // Convert px to rem

  return (
    <div
      className="flex flex-col h-screen"
      style={{
        backgroundColor: themeColors.backgroundColor,
        color: themeColors.text,
        fontSize: `${baseFontSize}rem`,
        transition: 'font-size 0.3s ease-in-out, background-color 0.3s ease-in-out, color 0.3s ease-in-out'
      }}
    >
      {/* Exit Modal for mock test mode */}
      {isMockTest && (
        <MockTestExitModal
          isOpen={showExitModal}
          onConfirm={handleExitConfirm}
          onCancel={handleExitCancel}
          isSubmitting={isSubmitting}
        />
      )}
      {/* Text Selection Tooltip - Rendered at top level */}
      <TextSelectionTooltip
        universalContentRef={universalContentRef}
        partId={currentPart}
        onHighlight={handleHighlight}
        onNote={handleNote}
        testType="reading"
      />

      {/* Header */}
      <QuestionHeader
        currentTest={currentTest}
        id={effectiveTestId || id}
        timeRemaining={timeRemaining}
        isStarted={isStarted}
        hasInteracted={hasInteracted}
        isPaused={isPaused}
        handleStart={handleStart}
        handlePause={handlePause}
        onBack={isMockTest ? undefined : handleBack}
        showCorrectAnswers={showCorrectAnswers}
        onToggleShowCorrect={(checked) => setShowCorrectAnswers(checked)}
        status={status}
        onRetake={handleRetakeTest}
        type="Reading"
      />

      {/* Main Content - Universal Container for all selectable content */}
      {!isSubmitting ?(
      <div
        className="flex flex-1 overflow-hidden p-3"
        ref={containerRef}
      >
        <div ref={universalContentRef} className="flex flex-1 overflow-hidden w-full">
          {/* Left Panel - Reading Passage */}
          {LoadingTest ? (
            <div className="w-1/2 border rounded-2xl border-gray-300 dark:border-gray-700  dark:bg-gray-800 overflow-y-auto flex items-center justify-center" style={{ width: `${leftWidth}%`, backgroundColor: themeColors.background, color: themeColors.text }}>
              <div className="text-gray-500">LoadingTest...</div>
            </div>
          ) : error ? (
            <div
              className="w-1/2 border rounded-2xl overflow-y-auto flex items-center justify-center"
              style={{
                width: `${leftWidth}%`,
                backgroundColor: themeColors.background,
                borderColor: themeColors.border,
                color: themeColors.text
              }}
            >
              <div className="max-w-xl w-full py-8 px-4 border rounded-xl shadow-sm text-center"
                style={{
                  borderColor: themeColors.border,
                  backgroundColor: theme === 'light' ? '#fff5f5' : 'rgba(255,0,0,0.05)'
                }}
              >
                <p className="text-sm font-semibold text-red-500 mb-2">
                  ⚠️ Reading loading error
                </p>

                <p className="text-base text-gray-500 mb-4 break-words">
                  {typeof error === 'string' ? error : 'Unknown error'}
                </p>

                <button
                  onClick={() => navigate(`/reading`)}
                  className="px-4 py-2 text-sm rounded-md border transition-all"
                  style={{
                    borderColor: themeColors.border,
                    backgroundColor: themeColors.background,
                    color: themeColors.text
                  }}
                >
                  ⬅ Back to Reading
                </button>
              </div>
            </div>
          ) : currentPartData ? (
            <div
              key={`passage-${currentPart}`}
              className="w-1/2 border rounded-2xl overflow-y-auto"
              data-part-id={currentPart}
              data-section="passage"
              data-section-type="passage"
              style={{
                width: `${leftWidth}%`,
                backgroundColor: themeColors.background,
                borderColor: themeColors.border,
                transition: 'background-color 0.3s ease-in-out, border-color 0.3s ease-in-out, transform 0.3s ease-in-out'
              }}
            >
              {/* Sub-Header Bar */}
              <div
                className="border px-6 py-3 m-4 rounded-md"
                style={{
                  backgroundColor: theme === 'light' ? '#e5e7eb' : 'rgba(255,255,255,0.1)',
                  borderColor: themeColors.border
                }}
              >
                <h2
                  className="text-lg font-semibold"
                  style={{ color: themeColors.text }}
                >
                  Part {currentPart}: Read the text and answer questions {getPartQuestionRange()}.
                </h2>
                {/* {description} */}
              </div>

              <div className="p-6">
                <h2
                  className="text-2xl font-semibold mb-6"
                  style={{ color: themeColors.text }}
                >
                  {currentPartData?.title}
                </h2>

                {/* Display part image if available with click to expand */}
                {currentPartData?.image_url && (
                  <div className="mb-6 relative">
                    <img
                      src={currentPartData.image_url}
                      alt={currentPartData.title || `Part ${currentPart} image`}
                      className="w-full max-w-full object-contain max-h-[500px] rounded-lg border"
                      style={{ borderColor: themeColors.border }}
                    />

                  </div>
                )}

                <div className="prose prose-sm max-w-none relative">
                  <div
                    ref={selectableContentRef}
                    data-selectable="true"
                    className="leading-relaxed whitespace-pre-line space-y-4 relative"
                    style={{ color: themeColors.text }}
                  >
                    {currentPartData?.content ? (
                      currentPartData.content.split('<br/>').map((paragraph, idx) =>
                        paragraph.trim() ? (
                          <p key={idx} className="mb-4 whitespace-pre-wrap" data-selectable="true">{paragraph}</p>
                        ) : null
                      )
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-1/2 border rounded-2xl border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto flex items-center justify-center" style={{ width: `${leftWidth}%` }}>
              <div className="text-gray-500">No data available</div>
            </div>
          )}
          <div className="px-4">
            <div
              onMouseDown={startResize}
              className="w-0.5 cursor-col-resize  dark:bg-gray-600 h-full flex justify-center items-center relative"
              title="Drag to resize"
              style={{ backgroundColor: themeColors.border }}
            >
              <div className="w-6 h-6 rounded-2xl bg-white flex items-center justify-center absolute border-2" style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}>
                <LuChevronsLeftRight style={{ color: themeColors.text }} />
              </div>
            </div>
          </div>

          {/* Right Panel - Questions */}
          {questionGroups && questionGroups.length > 0 ? (
            <div
              ref={questionsContainerRef}
              className="w-1/2 space-y-8 overflow-y-auto p-6 border rounded-2xl"
              data-part-id={currentPart}
              data-section="questions"
              data-section-type="questions"
              style={{
                width: `${100 - leftWidth}%`,
                backgroundColor: themeColors.background,
                borderColor: themeColors.border,
                transition: 'background-color 0.3s ease-in-out, border-color 0.3s ease-in-out, transform 0.3s ease-in-out'
              }}
            >
              {questionGroups.map((questionGroup, groupIdx) => {
                const questionRange = getQuestionRange(questionGroup);
                const groupQuestions = questionGroup.questions || [];
                const groupType = (questionGroup.type || '').toLowerCase();
                const isFillInTheBlanks = groupType === 'fill_in_blanks';
                const isDragAndDrop = groupType.includes('drag') || groupType.includes('drop') || groupType.includes('summary_completion');
                const isTableCompletion = groupType === 'table_completion';
                const isTable = groupType.includes('table') && !isTableCompletion;
                const isMap = groupType.includes('map');
                const isMatchingInformation = groupType.includes('matching_information');
                const isMultipleAnswers = groupType === 'multiple_answers';
                let sortedOptions = questionGroup.options || [];

                if (isMultipleAnswers) {
                  // Agar optionlar object bo'lsa, DB da saqlangan 'order' yoki 'id' bo'yicha sort qilamiz
                  sortedOptions = [...sortedOptions].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
                }


                return (
                  <div key={questionGroup.id || groupIdx} className="space-y-6">
                    {/* Group Header with Instruction and Range */}
                    <div className="space-y-3">

                      <h3
                        className="text-lg font-semibold"
                        style={{ color: themeColors.text }}
                      >
                        Questions {questionRange}
                      </h3>
                      {/* {questionGroup.instruction && questionGroup.type !== 'matching_information' && ( */}
                        <p
                          className="text-sm leading-relaxed"
                          data-selectable="true"
                          data-part-id={currentPart}
                          data-section-type="questions"
                          style={{ color: themeColors.text }}
                        >
                          {parse(questionGroup.instruction, { allowDangerousHtml: true })}
                        </p>
                      {/* )} */}
                    </div>
                    {questionGroup.type === 'matching_information' && (
                      <div className="space-y-3">
                        <h3 className="text-lg font-semibold" style={{ color: themeColors.text }}>
                          Matching Information
                        </h3>
                      </div>
                    )}

                    {/* For Fill-in-the-Blanks, Drag-and-Drop, Table Completion, Table, Map, Matching Information, and Multiple Answers: Render as a single group with group-level options */}
                    {(isFillInTheBlanks || isDragAndDrop || isTableCompletion || isTable || isMap || isMatchingInformation || isMultipleAnswers) ? (
                      <div
                        ref={(el) => {
                          // Set ref for all questions in the group for scrolling
                          if (el && groupQuestions.length > 0) {
                            groupQuestions
                              .filter(q => q.question_number != null)
                              .forEach(q => {
                                if (q.question_number) {
                                  questionRefs.current[q.question_number] = el;
                                }
                              });
                          }
                        }}
                        data-question-number={groupQuestions
                          .filter(q => q.question_number != null)
                          .sort((a, b) => {
                            const aNum = a.question_number ?? 0;
                            const bNum = b.question_number ?? 0;
                            return aNum - bNum;
                          })[0]?.question_number}
                        className="p-4 rounded-lg border transition-all"
                        style={{
                          borderColor: themeColors.border,
                          backgroundColor: themeColors.background
                        }}
                      >
                        <div onClick={handleInputInteraction} onFocus={handleInputInteraction}>
                          <QuestionRenderer
                            question={{
                              ...questionGroup,
                              type: questionGroup.type,
                              instruction: questionGroup.instruction,
                              question_text: questionGroup.question_text,
                              options: sortedOptions
                            }}
                            groupQuestions={groupQuestions}
                            answers={answers}
                            onAnswerChange={handleAnswerChange}
                            onInteraction={handleInputInteraction}
                            mode={status === 'reviewing' ? 'review' : 'test'}
                            reviewData={status === 'reviewing' ? reviewData : {}}
                            showCorrectAnswers={showCorrectAnswers}
                            bookmarks={bookmarks}
                            toggleBookmark={toggleBookmark}
                          />

                        </div>
                      </div>
                    ) : (
                      /* For other question types: Render individual questions */
                      [...groupQuestions]
                        .sort((a, b) => {
                          const aNum = a.question_number ?? 0;
                          const bNum = b.question_number ?? 0;
                          return aNum - bNum;
                        })
                        .map((question) => {
                          const questionNumber = question.question_number;
                          if (!questionNumber) return null;

                          const questionText = question.question_text || question.text || '';

                          return (
                            <div
                              key={question.id || questionNumber}
                              ref={(el) => {
                                if (el) questionRefs.current[questionNumber] = el;
                              }}
                              data-question-number={questionNumber}
                              className="p-4 rounded-lg border transition-all"
                              style={{
                                borderColor: themeColors.border,
                                backgroundColor: themeColors.background
                              }}
                            >
                              {/* Question Image if available */}
                              {question.image_url && (
                                <div className="mb-4">
                                  <img
                                    src={question.image_url}
                                    alt={`Question ${questionNumber} image`}
                                    className="w-full max-w-full h-auto rounded-lg border border-gray-300 dark:border-gray-700 cursor-pointer transition-transform hover:scale-105"

                                  />
                                </div>
                              )}

                              {/* Show question number and text */}
                              <p
                                className="font-medium mb-3 w-11/12"
                                data-selectable="true"
                                data-part-id={currentPart}
                                data-section-type="questions"
                                style={{ color: themeColors.text }}
                              >
                                {questionNumber}. {questionText}
                              </p>

                              <div onClick={handleInputInteraction} onFocus={handleInputInteraction}>
                                <QuestionRenderer
                                  question={{
                                    ...question,
                                    type: questionGroup.type,
                                    instruction: questionGroup.instruction,
                                    // For drag-drop, summary, table, and map, use group-level options; otherwise use question-specific options
                                    options: (groupType.includes('drag') || groupType.includes('summary') || groupType.includes('table')
                                      || groupType.includes('map'))
                                      ? (questionGroup.options || [])
                                      : (question.options || questionGroup.options || [])
                                  }}
                                  groupQuestions={
                                    // Pass group questions for drag-drop, summary, table, and map
                                    (groupType.includes('drag') ||
                                      groupType.includes('summary') ||
                                      groupType.includes('table') ||
                                      groupType.includes('map'))
                                      ? groupQuestions
                                      : undefined
                                  }
                                  answer={answers[question.id] || answers[questionNumber]}
                                  answers={answers}
                                  onAnswerChange={handleAnswerChange}
                                  onInteraction={handleInputInteraction}
                                  mode={status === 'reviewing' ? 'review' : 'test'}
                                  reviewData={status === 'reviewing' ? reviewData : {}}
                                  showCorrectAnswers={showCorrectAnswers}
                                  bookmarks={bookmarks}
                                  toggleBookmark={toggleBookmark}
                                />
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              className="w-1/2 space-y-8 overflow-y-auto p-6 border rounded-2xl border-gray-300 bg-white dark:bg-gray-800 flex items-center justify-center"
              style={{ width: `${100 - leftWidth}%`, backgroundColor: themeColors.background, color: themeColors.text }}
            >
              <div className="text-gray-500">
                {LoadingTest ? "LoadingTest questions..." : "No questions available"}
              </div>
            </div>
          )}
        </div>
      </div>
      ): (
        <div className="text-gray-500 flex items-center justify-center h-full">
          {LoadingTest ? "Loading test..." : "No questions available"}
        </div>
      )}

      {/* Footer */}
      <PracticeFooter
        currentTest={currentTest}
        currentPart={currentPart}
        handlePartChange={handlePartChange}
        getPartAnsweredCount={getPartAnsweredCount}
        answers={answers}
        scrollToQuestion={scrollToQuestion}
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
        id={effectiveTestId || id}
        activeQuestion={activeQuestion}
        onFinish={handleFinish}
        onSubmitTest={handleSubmitTest}
        status={status}
        onReview={handleReviewTest}
        onRetake={handleRetakeTest}
        getAllQuestions={getAllQuestions}
        bookmarks={bookmarks}
        isSubmitting={isSubmitting}
        isMockTest={isMockTest}
        mockTestId={mockTestId}
      />

      {/* Finish Modal */}
      <FinishModal
        isOpen={isModalOpen}
        loading={isSubmitting}
        onClose={() => setIsModalOpen(false)}
        link={`/reading-result/${effectiveTestId || id}`}
        testId={effectiveTestId || id}
        onSubmit={handleSubmitTest}
        isMockTest={isMockTest}
      />

      {/* Note Sidebar */}
      <NoteSidebar />
    </div>
  );
};

const ReadingPracticePage = () => {
  return (
    <AppearanceProvider>
      <AnnotationProvider>
        <ReadingPracticePageContent />
      </AnnotationProvider>
    </AppearanceProvider>
  );
};

export default ReadingPracticePage;
