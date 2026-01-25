import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { LuChevronsLeftRight } from "react-icons/lu";
import { useTestStore } from "@/store/testStore";
import QuestionRenderer from "@/components/questions/QuestionRenderer";
import PrecticeFooter from "@/components/questions/PrecticeFooter";
import { saveListeningPracticeData, loadListeningPracticeData, clearListeningPracticeData } from "@/store/LocalStorage/listeningStorage";
import { submitTestAttempt, fetchLatestAttempt } from "@/lib/testAttempts";
import { useDashboardStore } from "@/store/dashboardStore";
import { useAuthStore } from "@/store/authStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";

import QuestionHeader from "@/components/questions/QuestionHeader";
import FinishModal from "@/components/modal/FinishModal";
import { convertDurationToSeconds } from "@/utils/testDuration";
import AudioPlayer from "@/components/AudioPlayer";
import { AppearanceProvider, useAppearance } from "@/contexts/AppearanceContext";
import { AnnotationProvider, useAnnotation } from "@/contexts/AnnotationContext";
import TextSelectionTooltip from "@/components/annotations/TextSelectionTooltip";
import NoteSidebar from "@/components/sidebar/NoteSidebar";
import { applyHighlight, applyNote, getTextOffsets } from "@/utils/annotationRenderer";


const ListeningPracticePageContent = () => {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentTest, fetchTestById, loadingTest, error: testError } = useTestStore();
  const loading = loadingTest;
  const { authUser } = useAuthStore();
  const fetchDashboardData = useDashboardStore((state) => state.fetchDashboardData);
  const { theme, themeColors, fontSizeValue } = useAppearance();
  const [fetchError, setFetchError] = useState(null);
  // Status: 'taking', 'completed', 'reviewing'
  // Initialize status immediately from URL to prevent flickering
  const [status, setStatus] = useState(() => {
    const mode = new URLSearchParams(window.location.search).get('mode');
    return mode === 'review' ? 'reviewing' : 'taking';
  });
  const [currentPart, setCurrentPart] = useState(1);
  const [timeRemaining, setTimeRemaining] = useState(null); // Will be set from test duration
  const [isStarted, setIsStarted] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
// Initialize modal state based on URL mode parameter
const [showInitialModal, setShowInitialModal] = useState(() => {
  const mode = new URLSearchParams(window.location.search).get('mode');
  return mode !== 'review' && mode !== 'retake'; // Don't show modal in review or retake mode
});
const [startTime, setStartTime] = useState(null);

  const [answers, setAnswers] = useState({});
  const [reviewData, setReviewData] = useState({});
  const [latestAttemptId, setLatestAttemptId] = useState(null);
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(true);
  const [bookmarks, setBookmarks] = useState(new Set()); // Store bookmarked question IDs/numbers

  // Audio player state
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [volume, setVolume] = useState(0.7);
  const [shouldAutoPlay, setShouldAutoPlay] = useState(false);



  const questionRefs = useRef({});
  const questionsContainerRef = useRef(null);
  const [activeQuestion, setActiveQuestion] = useState(null);

  const [leftWidth, setLeftWidth] = useState(50);
  const containerRef = useRef(null);
  const isResizing = useRef(false);

  // Annotation system
  const { addHighlight, addNote } = useAnnotation();
  const selectableContentRef = useRef(null);
  const universalContentRef = useRef(null); // Universal container for all selectable content

  // Get audio URL from first part - use this for entire session
  const audioUrl = React.useMemo(() => {
    if (!currentTest?.parts || currentTest.parts.length === 0) return null;
    const sortedParts = [...currentTest.parts].sort((a, b) => {
      const aNum = a.part_number ?? 0;
      const bNum = b.part_number ?? 0;
      return aNum - bNum;
    });
    return sortedParts[0]?.listening_url || null;
  }, [currentTest?.parts]);

  // Show toast for store-level errors
  useEffect(() => {
    if (testError && !currentTest) {
      toast.error(testError);
      setFetchError(testError);
    }
  }, [testError, currentTest]);

  useEffect(() => {
    // GUARD CLAUSE: Validate id parameter
    if (!id || (typeof id !== 'string' && typeof id !== 'number')) {
      console.error('[ListeningPracticePage] Invalid test ID:', id);
      setFetchError('Invalid test ID');
      toast.error('Invalid test ID. Please try again.');
      return;
    }

    // Component lifecycle management: Track if component is mounted
    let isMounted = true;
    setFetchError(null);

    const loadTestData = async () => {
      try {
        // Fetch test data
        await fetchTestById(id);

        // Only update state if component is still mounted
        if (!isMounted) return;

        // Validate that test data was loaded
        const state = useTestStore.getState();
        if (!state.currentTest) {
          throw new Error('Test data not found');
        }

        // Validate listening_url exists
        const sortedParts = [...(state.currentTest.parts || [])].sort((a, b) => {
          const aNum = a.part_number ?? 0;
          const bNum = b.part_number ?? 0;
          return aNum - bNum;
        });
        
        const firstPart = sortedParts[0];
        if (!firstPart?.listening_url) {
          console.warn('[ListeningPracticePage] No listening_url found for test:', id);
          toast.error('Audio file not available for this test. Please contact support.');
        }

        // Load saved data from localStorage
        const savedData = loadListeningPracticeData(id);
        if (savedData && isMounted) {
          if (savedData.answers && Object.keys(savedData.answers).length > 0) {
            setAnswers(savedData.answers);
            setHasInteracted(true);
          }
          if (savedData.bookmarks && Array.isArray(savedData.bookmarks)) {
            setBookmarks(new Set(savedData.bookmarks));
          }
          if (savedData.startTime) {
            const savedStartTime = savedData.startTime;
            setStartTime(savedStartTime);
            setIsStarted(true);

            const elapsedSeconds = Math.floor((Date.now() - savedStartTime) / 1000);
            // Use saved timeRemaining if available, otherwise calculate from test duration
            let initialTime = savedData.timeRemaining;
            if (initialTime === undefined || initialTime === null) {
              // Will be set when currentTest loads
              initialTime = 60 * 60; // Fallback to 1 hour
            }
            const remainingTime = Math.max(0, initialTime - elapsedSeconds);
            if (isMounted) {
              setTimeRemaining(remainingTime);
            }
          } else if (savedData.timeRemaining !== undefined && isMounted) {
            setTimeRemaining(savedData.timeRemaining);
          }
        }
      } catch (error) {
        // Only log and show error if component is still mounted
        if (isMounted) {
          const errorMessage = error?.message || 'Failed to load test data. Please check your connection and try again.';
          console.error('[ListeningPracticePage] Error loading test data:', {
            testId: id,
            error: errorMessage,
            errorName: error?.name,
            errorStack: error?.stack
          });
          setFetchError(errorMessage);
          toast.error(errorMessage);
        }
      }
    };

    loadTestData();

    // Cleanup: Clear currentTest when component unmounts and prevent state updates
    // Only clear currentTest, not the test list data, to preserve data when navigating back
    return () => {
      isMounted = false;
      const { clearCurrentTest } = useTestStore.getState();
      clearCurrentTest(false); // Only clear currentTest, preserve test list data
    };
  }, [id, fetchTestById]);

  // Initialize timeRemaining from test duration when currentTest loads
  useEffect(() => {
    // Component lifecycle management: Track if component is mounted
    let isMounted = true;

    if (currentTest && timeRemaining === null && !isStarted && !hasInteracted && isMounted) {
      const durationInSeconds = convertDurationToSeconds(currentTest.duration);
      setTimeRemaining(durationInSeconds);
    } else if (currentTest && timeRemaining !== null && !isStarted && !hasInteracted && isMounted) {
      // If timeRemaining was set from localStorage but we don't have a saved startTime,
      // update it to use the test duration to ensure consistency
      const savedData = loadListeningPracticeData(id);
      if (!savedData?.startTime && isMounted) {
        const durationInSeconds = convertDurationToSeconds(currentTest.duration);
        setTimeRemaining(durationInSeconds);
      }
    }

    return () => {
      isMounted = false;
    };
  }, [currentTest, timeRemaining, isStarted, hasInteracted, id]);

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

  const getSortedParts = React.useCallback(() => {
    if (!currentTest?.parts) return [];
    return [...currentTest.parts].sort((a, b) => {
      const aNum = a.part_number ?? 0;
      const bNum = b.part_number ?? 0;
      return aNum - bNum;
    });
  }, [currentTest?.parts]);

  const currentPartData = currentTest?.parts?.find(part => part.part_number === currentPart);

  const questionGroups = React.useMemo(() => {
    if (!currentPartData?.questionGroups) return [];

    return [...currentPartData.questionGroups]
      .map(questionGroup => {
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

  const getQuestionRange = (questionGroup) => {
    const questions = questionGroup.questions || [];
    if (questions.length === 0) return '';

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

    return first === last ? `${first}` : `${first}-${last}`;
  };

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

  const getPartAnsweredCount = (partQuestions) => {
    if (!partQuestions) return 0;
    return partQuestions.filter(q => {
      const answerKey = q.question_number || q.id;
      return answerKey && answers[answerKey] && answers[answerKey].toString().trim() !== '';
    }).length;
  };

  // Get all questions across all parts, sorted by question_number
  const getAllQuestions = useCallback(() => {
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

    setActiveQuestion(questionNumber);
  };

  useEffect(() => {
    if (!isStarted && !hasInteracted) return;
    if (timeRemaining === null) return; // Wait for timeRemaining to be initialized

    if (!startTime) {
      const now = Date.now();
      setStartTime(now);
    }

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          setIsStarted(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isStarted, hasInteracted, startTime, timeRemaining]);

  // Auto-submit when timer reaches zero
  useEffect(() => {
    // Component lifecycle management: Track if component is mounted
    let isMounted = true;

    if (timeRemaining === 0 && (isStarted || hasInteracted) && status === 'taking' && authUser && id && currentTest && isMounted) {
      // Auto-submit the test when timer reaches zero
      const autoSubmit = async () => {
        try {
          const result = await handleSubmitTest();
          // Only navigate if component is still mounted
          if (isMounted) {
            if (result.success) {
              // Navigate to result page
              navigate(`/listening-result/${id}`);
            } else {
              console.error('[ListeningPracticePage] Auto-submit failed:', result.error);
              // Still navigate to result page even if submission failed
              navigate(`/listening-result/${id}`);
            }
          }
        } catch (error) {
          if (isMounted) {
            console.error('[ListeningPracticePage] Auto-submit error:', error);
            navigate(`/listening-result/${id}`);
          }
        }
      };
      autoSubmit();
    }

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRemaining, status]);


  useEffect(() => {
    if (id && hasInteracted) {
      const elapsedTime = startTime
        ? Math.floor((Date.now() - startTime) / 1000)
        : 0;

      saveListeningPracticeData(id, {
        answers,
        timeRemaining,
        elapsedTime,
        startTime: startTime || (hasInteracted ? Date.now() : null),
        bookmarks,
      });
    }
  }, [answers, id, hasInteracted, timeRemaining, startTime, bookmarks]);

  useEffect(() => {
    if (!id || (!isStarted && !hasInteracted)) return;

    const interval = setInterval(() => {
      if (hasInteracted) {
        const elapsedTime = startTime
          ? Math.floor((Date.now() - startTime) / 1000)
          : 0;

        saveListeningPracticeData(id, {
          answers,
          timeRemaining,
          elapsedTime,
          startTime: startTime || Date.now(),
          bookmarks,
        });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [id, timeRemaining, answers, hasInteracted, isStarted, startTime, bookmarks]);

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

    Object.values(questionRefs.current).forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [currentPart, currentPartData?.questions]);

  const handleAnswerChange = (questionIdOrNumber, answer) => {
    if (status === 'reviewing') return;

    if (!hasInteracted && !isStarted) {
      setHasInteracted(true);
    }

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
  };

  const handleStart = () => {
    const now = Date.now();
    setIsStarted(true);
    setHasInteracted(true);
    setStartTime(now);

    if (id) {
      saveListeningPracticeData(id, {
        answers,
        timeRemaining,
        elapsedTime: 0,
        startTime: now,
        bookmarks,
      });
    }
  };

  const handleBack = () => {
    if (id) {
      clearListeningPracticeData(id);
    }
    navigate("/dashboard");
  };

  const handleSubmitTest = async () => {
    if (isSubmitting) {
      return { success: false, error: 'Submission already in progress' };
    }
    if (!authUser || !id || !currentTest) {
      return { success: false, error: 'Missing required information' };
    }

    setIsSubmitting(true);
    try {
      // Calculate time taken from startTime
      let timeTaken = 0;
      if (startTime) {
        timeTaken = Math.floor((Date.now() - startTime) / 1000);
      }

      // Submit even if answers object is empty - submitTestAttempt handles this
      const result = await submitTestAttempt(id, answers, currentTest, timeTaken, 'listening');

      if (result.success) {
        setLatestAttemptId(result.attemptId);
        setStatus('completed');
        // Clear practice data after successful submission
        if (id) {
          clearListeningPracticeData(id);
        }
        if (authUser?.id) {
          await fetchDashboardData(authUser.id, true);
        }
        // Return success to allow modal to navigate
        return { success: true };
      } else {
        console.error('Failed to submit test:', result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Error submitting test:', error);
      return { success: false, error: error.message };
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReviewTest = async () => {
    if (!authUser || !id) return;

    try {
      const result = await fetchLatestAttempt(authUser.id, id);

      if (result.success && result.attempt && result.answers) {
        const reviewDataObj = {};
        Object.keys(result.answers).forEach((questionId) => {
          const answerInfo = result.answers[questionId];
          reviewDataObj[questionId] = {
            userAnswer: answerInfo.userAnswer || '',
            isCorrect: answerInfo.isCorrect || false,
            correctAnswer: answerInfo.correctAnswer || '',
          };
        });

        setReviewData(reviewDataObj);
        setStatus('reviewing');
        setLatestAttemptId(result.attempt.id);
        setShowCorrectAnswers(true);
        setShowInitialModal(false);

        const answersObj = {};
        Object.keys(reviewDataObj).forEach((questionId) => {
          answersObj[questionId] = reviewDataObj[questionId].userAnswer;
        });
        setAnswers(answersObj);
      } else {
        console.error('Failed to fetch attempt:', result.error);
        alert('Failed to load review data. Please try again.');
        setShowCorrectAnswers(false);
      }
    } catch (error) {
      console.error('Error fetching attempt:', error);
      alert('An error occurred while loading review data.');
      setShowCorrectAnswers(false);
    }
  };

  const handleRetakeTest = () => {
    if (!id) return;
    
    // Remove review mode from URL
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.delete('mode');
    const newUrl = newSearchParams.toString() 
      ? `/listening-practice/${id}?${newSearchParams.toString()}`
      : `/listening-practice/${id}`;
    window.history.replaceState({}, '', newUrl);
    setSearchParams(newSearchParams, { replace: true });

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
    setLatestAttemptId(null);
    setShowInitialModal(true);
    setShouldAutoPlay(false); // Reset autoplay flag
    // Keep persisted audio settings (don't reset to loud defaults)

    clearListeningPracticeData(id);
  };

  const handleFinish = () => {
    setIsModalOpen(true);
  };

  const handleInputInteraction = () => {
    if (!hasInteracted && !isStarted) {
      setHasInteracted(true);
    }
  };

  React.useEffect(() => {
    setCurrentPart(1);
  }, [currentTest]);

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
  const handleHighlight = useCallback((range, text, partId, sectionType = 'passage', testType = 'listening') => {
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

  const handleNote = useCallback((range, text, partId, sectionType = 'passage', testType = 'listening') => {
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
        backgroundColor: themeColors.background,
        color: themeColors.text,
        fontSize: `${baseFontSize}rem`,
        transition: 'font-size 0.3s ease-in-out, background-color 0.3s ease-in-out, color 0.3s ease-in-out'
      }}
    >
      {/* Text Selection Tooltip - Rendered at top level */}
      <TextSelectionTooltip
        universalContentRef={universalContentRef}
        partId={currentPart}
        onHighlight={handleHighlight}
        onNote={handleNote}
        testType="listening"
      />

      {/* Initial Modal - only show on first visit, not in review/retake mode */}
      <Dialog
        open={status === 'taking' && showInitialModal && !hasInteracted && searchParams.get('mode') !== 'review' && searchParams.get('mode') !== 'retake'}
        onOpenChange={() => { }}
      >
        <DialogContent className="sm:max-w-[500px]" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Listening Test Instructions</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
            You will be listening to an audio clip during this test. You will not be permitted to pause or rewind the audio while answering the questions. To continue, click Play.
          </p>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowInitialModal(false);
                handleStart();
                // Trigger audio playback after user interaction
                setShouldAutoPlay(true);
              }}
              className="w-full"
            >
              Play
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>




      <QuestionHeader
        currentTest={currentTest}
        id={id}
        timeRemaining={timeRemaining}
        isStarted={isStarted}
        hasInteracted={hasInteracted}
        handleStart={handleStart}
        onBack={handleBack}
        showCorrectAnswers={showCorrectAnswers}
        onToggleShowCorrect={(checked) => setShowCorrectAnswers(checked)}
        status={status}
        onRetake={handleRetakeTest}
        type="Listening"
      />

      {/* Main Content - Universal Container for all selectable content */}
      <div
        className="flex flex-1 overflow-hidden p-3 transition-all duration-300"
        ref={containerRef}
        style={{
          maxWidth: '100%',
        }}
      >
        <div ref={universalContentRef} className="flex flex-1 overflow-hidden w-full">
          {/* Left Panel - Transcript (only in review mode) */}
          {status === 'reviewing' && currentPartData ? (
            <div
              className="border rounded-2xl overflow-y-auto"
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
              <div
                className="border-b px-6 py-3"
                style={{
                  backgroundColor: theme === 'light' ? '#f3f4f6' : themeColors.background,
                  borderColor: themeColors.border
                }}
              >
                <h2
                  className="text-lg font-semibold"
                  style={{ color: themeColors.text }}
                >
                  Part {currentPart}: Transcript
                </h2>
              </div>
              <div className="p-6">
                <h2
                  className="text-2xl font-semibold mb-6"
                  style={{ color: themeColors.text }}
                >
                  {currentPartData?.title || `Part ${currentPart}`}
                </h2>
                <div className="prose prose-sm max-w-none relative">
                  <div
                    ref={selectableContentRef}
                    data-selectable="true"
                    className="leading-relaxed whitespace-pre-line space-y-4 relative"
                    style={{ color: themeColors.text }}
                  >
                    {currentPartData?.content ? (
                      currentPartData.content.split('\n').map((paragraph, idx) =>
                        paragraph.trim() ? (
                          <p key={idx} className="mb-4" data-selectable="true">{paragraph}</p>
                        ) : null
                      )
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div
              className="border rounded-2xl"
              style={{
                backgroundColor: themeColors.background,
                borderColor: themeColors.border
              }}
            />
          )}

          {/* Resizer - only show in review mode when left panel is visible */}
          {status === 'reviewing' && (
            <div className="px-4">
              <div
                onMouseDown={startResize}
                className="w-0.5 cursor-col-resize bg-gray-600 h-full flex justify-center items-center relative"
                title="Drag to resize"
              >
                <div className="w-6 h-6 rounded-2xl flex items-center justify-center absolute border-2" style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}>
                  <LuChevronsLeftRight />
                </div>
              </div>
            </div>
          )}

          {/* Right Panel - Audio Player + Questions */}
          {questionGroups && questionGroups.length > 0 ? (
            <div
              ref={questionsContainerRef}
              className="space-y-8 overflow-y-auto border rounded-2xl"
              data-part-id={currentPart}
              data-section="questions"
              data-section-type="questions"
              style={{
                width: status === 'reviewing' ? `${100 - leftWidth}%` : '100%',
                backgroundColor: themeColors.background,
                borderColor: themeColors.border,
                transition: 'background-color 0.3s ease-in-out, border-color 0.3s ease-in-out, transform 0.3s ease-in-out'
              }}
            >
              {/* Sticky Audio Player - visible in review mode, hidden but functional in test mode */}
              {audioUrl && (
                <div className={status === 'taking' ? 'hidden' : ''}>
                  <AudioPlayer
                    audioUrl={audioUrl}
                    isTestMode={status === 'taking'}
                    playbackRate={playbackRate}
                    onPlaybackRateChange={setPlaybackRate}
                    volume={volume}
                    onVolumeChange={setVolume}
                    autoPlay={shouldAutoPlay && status === 'taking'}
                    onAudioEnded={status === 'taking' ? () => {
                      // Auto-submit when audio ends in test mode (if timer hasn't already)
                      if (timeRemaining > 0 && status === 'taking') {
                        handleSubmitTest().then((result) => {
                          if (result.success) {
                            navigate(`/listening-result/${id}`);
                          }
                        });
                      }
                    } : undefined}
                  />
                </div>
              )}

              {/* Questions */}
              <div className="p-6 space-y-8">
                {questionGroups.map((questionGroup, groupIdx) => {
                  const questionRange = getQuestionRange(questionGroup);
                  const groupQuestions = questionGroup.questions || [];
                  const groupType = (questionGroup.type || '').toLowerCase();
                  const isFillInTheBlanks = groupType === 'fill_in_blanks';
                  const isDragAndDrop = groupType.includes('drag') || groupType.includes('drop') || groupType.includes('summary_completion');
                  const isTableCompletion = groupType === 'table_completion';
                  const isTable = groupType.includes('table') && !isTableCompletion;
                  const isMap = groupType.includes('map');

                  return (
                    <div key={questionGroup.id || groupIdx} className={`space-y-6 ${status === 'reviewing' ? 'w-full' : 'w-6/12'}`}>
                      <div className="space-y-3">
                        <h3
                          className="text-lg font-semibold"
                          data-selectable="true"
                          data-part-id={currentPart}
                          data-section-type="questions"
                          style={{ color: themeColors.text }}
                        >
                          Questions {questionRange}
                        </h3>
                        {questionGroup.instruction && (
                          <p
                            className="text-sm leading-relaxed"
                            data-selectable="true"
                            data-part-id={currentPart}
                            data-section-type="questions"
                            style={{ color: themeColors.text }}
                          >
                            {questionGroup.instruction}
                          </p>
                        )}
                      </div>

                      {(isFillInTheBlanks || isDragAndDrop || isTableCompletion || isTable || isMap) ? (
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
                          className="p-4"
                        >
                          <div onClick={handleInputInteraction} onFocus={handleInputInteraction}>
                            <QuestionRenderer
                              question={{
                                ...questionGroup,
                                type: questionGroup.type,
                                instruction: questionGroup.instruction,
                                question_text: questionGroup.question_text,
                                options: questionGroup.options || []
                              }}
                              groupQuestions={groupQuestions}
                              answers={answers}
                              onAnswerChange={handleAnswerChange}
                              onInteraction={handleInputInteraction}
                              mode={status === 'reviewing' ? 'review' : 'test'}
                              reviewData={status === 'reviewing' ? (showCorrectAnswers ? reviewData : Object.keys(reviewData).reduce((acc, key) => {
                                acc[key] = {
                                  userAnswer: reviewData[key].userAnswer,
                                  isCorrect: reviewData[key].isCorrect,
                                  correctAnswer: ''
                                };
                                return acc;
                              }, {})) : {}}
                              showCorrectAnswers={showCorrectAnswers}
                              bookmarks={bookmarks}
                              toggleBookmark={toggleBookmark}
                            />
                          </div>
                        </div>
                      ) : (
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
                                className="p-4"
                              >
                                {question.image_url && (
                                  <div className="mb-4">
                                    <img
                                      src={question.image_url}
                                      alt={`Question ${questionNumber} image`}
                                      className="w-full max-w-full h-auto"
                                    />
                                  </div>
                                )}

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
                                      options: (groupType.includes('drag') || groupType.includes('summary') || groupType.includes('table') || groupType.includes('map'))
                                        ? (questionGroup.options || [])
                                        : (question.options || questionGroup.options || [])
                                    }}
                                    groupQuestions={
                                      (groupType.includes('drag') ||
                                        groupType.includes('summary') ||
                                        groupType.includes('table') ||
                                        groupType.includes('map'))
                                        ? groupQuestions
                                        : undefined
                                    }
                                    answer={answers[questionNumber]}
                                    answers={answers}
                                    onAnswerChange={handleAnswerChange}
                                    onInteraction={handleInputInteraction}
                                    mode={status === 'reviewing' ? 'review' : 'test'}
                                    reviewData={status === 'reviewing' ? (showCorrectAnswers ? reviewData : Object.keys(reviewData).reduce((acc, key) => {
                                      acc[key] = {
                                        userAnswer: reviewData[key].userAnswer,
                                        isCorrect: reviewData[key].isCorrect,
                                        correctAnswer: ''
                                      };
                                      return acc;
                                    }, {})) : {}}
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
            </div>
          ) : (
            <div
              className="space-y-8 overflow-y-auto p-6 border rounded-2xl border-gray-300  dark:bg-gray-800 flex items-center justify-center"
              style={{ width: status === 'reviewing' ? `${100 - leftWidth}%` : '100%', backgroundColor: themeColors.background, color: themeColors.text }}
            >
              <div className="text-gray-500">
                {loading ? "Loading questions..." : fetchError ? `Error: ${fetchError}` : testError ? `Error: ${testError}` : "No questions available"}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <PrecticeFooter
        currentTest={currentTest}
        currentPart={currentPart}
        handlePartChange={handlePartChange}
        getPartAnsweredCount={getPartAnsweredCount}
        answers={answers}
        scrollToQuestion={scrollToQuestion}
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
        id={id}
        activeQuestion={activeQuestion}
        onFinish={handleFinish}
        onSubmitTest={handleSubmitTest}
        status={status}
        onReview={handleReviewTest}
        onRetake={handleRetakeTest}
        resultLink={`/listening-result/${id}`}
        getAllQuestions={getAllQuestions}
        bookmarks={bookmarks}
        isSubmitting={isSubmitting}
      />

      {/* Finish Modal */}
        <FinishModal
          loading={isSubmitting}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        link={`/listening-result/${id}`}
        testId={id}
        onSubmit={handleSubmitTest}
      />

      {/* Note Sidebar */}

      <NoteSidebar />
    </div>
  );
};

const ListeningPracticePage = () => {
  return (
    <AppearanceProvider>
      <AnnotationProvider>
        <ListeningPracticePageContent />
      </AnnotationProvider>
    </AppearanceProvider>
  );
};

export default ListeningPracticePage;
