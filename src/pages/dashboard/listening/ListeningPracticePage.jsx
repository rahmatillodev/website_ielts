import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { LuChevronsLeftRight } from "react-icons/lu";
import { useTestStore } from "@/store/testStore";
import QuestionRenderer from "@/components/questions/QuestionRenderer";
import PrecticeFooter from "@/components/questions/PrecticeFooter";
import { saveListeningPracticeData, loadListeningPracticeData, clearListeningPracticeData, clearAudioPosition } from "@/store/LocalStorage/listeningStorage";
import { submitTestAttempt, fetchLatestAttempt } from "@/lib/testAttempts";
import { useDashboardStore } from "@/store/dashboardStore";
import { useAuthStore } from "@/store/authStore";
import { toast } from "react-toastify";
import parse from "html-react-parser";
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
  const { authUser, userProfile } = useAuthStore();
  const fetchDashboardData = useDashboardStore((state) => state.fetchDashboardData);
  const { theme, themeColors, fontSizeValue } = useAppearance();
  const [fetchError, setFetchError] = useState(null);

  // ====== TIMER/CONTROL STATE ======
  // Status: 'taking', 'completed', 'reviewing'
  const [status, setStatus] = useState(() => {
    const mode = new URLSearchParams(window.location.search).get('mode');
    return mode === 'review' ? 'reviewing' : 'taking';
  });
  const [currentPart, setCurrentPart] = useState(1);
  // "timeRemaining" is always stopped if stored "isPaused" on refresh
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [isStarted, setIsStarted] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [startTime, setStartTime] = useState(null);
  

  const [answers, setAnswers] = useState({});
  const [reviewData, setReviewData] = useState({});
  const [latestAttemptId, setLatestAttemptId] = useState(null);
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(true);
  const [bookmarks, setBookmarks] = useState(new Set());

  // Audio player state
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [volume, setVolume] = useState(0.7);
  const [shouldAutoPlay, setShouldAutoPlay] = useState(true);
  const audioPlayerRef = useRef(null);

  const questionRefs = useRef({});
  const questionsContainerRef = useRef(null);
  const [activeQuestion, setActiveQuestion] = useState(null);

  const [leftWidth, setLeftWidth] = useState(50);
  const containerRef = useRef(null);
  const isResizing = useRef(false);

  // Annotation system
  const { addHighlight, addNote } = useAnnotation();
  const selectableContentRef = useRef(null);
  const universalContentRef = useRef(null);

  // AUDIO URL
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

  // ====== LOAD TEST/DATA & STATE FROM LOCALSTORAGE ======
  useEffect(() => {
    if (!id || (typeof id !== 'string' && typeof id !== 'number')) {
      console.error('[ListeningPracticePage] Invalid test ID:', id);
      setFetchError('Invalid test ID');
      toast.error('Invalid test ID. Please try again.');
      return;
    }

    let isMounted = true;
    setFetchError(null);

    const loadTestData = async () => {
      try {
        if (typeof fetchTestById !== 'function') {
          console.error('[ListeningPracticePage] fetchTestById is not a function:', typeof fetchTestById);
          if (isMounted) setFetchError('fetchTestById is not available');
          return;
        }
        const isReviewMode = searchParams.get('mode') === 'review';
        const includeCorrectAnswers = isReviewMode;
        const userSubscriptionStatus = userProfile?.subscription_status || "free";
        await fetchTestById(id, false, includeCorrectAnswers, userSubscriptionStatus);

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
          const errorMsg = 'Audio file not available for this test. Please contact support.';
          if (isMounted) {
            setFetchError(errorMsg);
            toast.error(errorMsg);
          }
          return;
        }

        // Load/restore progress on refresh
        const savedData = loadListeningPracticeData(id);
        if (savedData && isMounted) {
          if (savedData.answers && Object.keys(savedData.answers).length > 0) {
            setAnswers(savedData.answers);
            setHasInteracted(true);
          }
          if (savedData.bookmarks && Array.isArray(savedData.bookmarks)) {
            setBookmarks(new Set(savedData.bookmarks));
          }
          // If user had started the test previously or interacted:
          // On refresh, the timer should be *paused* (time does not continue)
          // Thus, we load paused state, setIsStarted(false).
          if (savedData.timeRemaining !== undefined && savedData.timeRemaining !== null) {
            setTimeRemaining(savedData.timeRemaining);
            setIsStarted(false);      // timer is stopped after refresh
            setIsPaused(true);        // set paused so start button works
          }
          if (savedData.startTime) {
            setStartTime(savedData.startTime);
          }
        }
      } catch (error) {
        if (isMounted) {
          const errorMessage = error?.message || 'Failed to load test data. Please check your connection and try again.';
          setFetchError(errorMessage);
          toast.error(errorMessage);
        }
      }
    };

    loadTestData();

    return () => {
      isMounted = false;
      const { clearCurrentTest } = useTestStore.getState();
      clearCurrentTest(false);
    };
    // eslint-disable-next-line
  }, [id, fetchTestById]);

  // Initialize timeRemaining from test duration when currentTest loads (if not loaded from storage)
  useEffect(() => {
    let isMounted = true;

    if (
      currentTest &&
      timeRemaining === null &&
      !isStarted &&
      !hasInteracted &&
      isMounted
    ) {
      const durationInSeconds = convertDurationToSeconds(currentTest.duration);
      setTimeRemaining(durationInSeconds);
    } else if (
      currentTest &&
      timeRemaining !== null &&
      !isStarted &&
      !hasInteracted &&
      isMounted
    ) {
      const savedData = loadListeningPracticeData(id);
      if (!savedData?.startTime && isMounted) {
        const durationInSeconds = convertDurationToSeconds(currentTest.duration);
        setTimeRemaining(durationInSeconds);
      }
    }

    return () => { isMounted = false; };
  }, [currentTest, timeRemaining, isStarted, hasInteracted, id]);

  // ========== TIMER LOGIC ==========
  // Timer counts down only if not paused and started (and not after refresh until re-enabled)
  useEffect(() => {
    if (!isStarted || isPaused) return;
    if (!hasInteracted) return;
    if (timeRemaining === null) return;

    // Set startTime if not set
    if (!startTime) setStartTime(Date.now());

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 1) {
          setIsStarted(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isStarted, hasInteracted, isPaused, startTime, timeRemaining]);

  // Auto-submit when timer reaches zero
  useEffect(() => {
    let isMounted = true;
    if (
      timeRemaining === 0 &&
      (isStarted || hasInteracted) &&
      status === 'taking' &&
      authUser &&
      id &&
      currentTest &&
      isMounted
    ) {
      const autoSubmit = async () => {
        try {
          if (id) {
            clearAudioPosition(id);
            if (audioPlayerRef.current && audioPlayerRef.current.clearPosition) {
              audioPlayerRef.current.clearPosition();
            }
          }
          const result = await handleSubmitTest();
          if (isMounted) {
            navigate(`/listening-result/${id}`);
          }
        } catch (error) {
          if (isMounted) {
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

  // persist data on change
  useEffect(() => {
    if (id && hasInteracted) {
      saveListeningPracticeData(id, {
        answers,
        timeRemaining,
        startTime,
        bookmarks,
      });
    }
  }, [answers, id, hasInteracted, timeRemaining, startTime, bookmarks]);

  // persist data every 5s if interacting
  useEffect(() => {
    if (!id || (!isStarted && !hasInteracted)) return;

    const interval = setInterval(() => {
      if (hasInteracted) {
        saveListeningPracticeData(id, {
          answers,
          timeRemaining,
          startTime,
          bookmarks,
        });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [id, timeRemaining, answers, hasInteracted, isStarted, startTime, bookmarks]);

  // Question scroll and intersection observer
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
  }, [currentPart, currentTest?.parts]);

  // === UI HANDLERS ===
  const handleAnswerChange = (questionIdOrNumber, answer) => {
    if (status === 'reviewing') return;
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
    setIsStarted(true);
    setIsPaused(false);
    setStartTime(Date.now());
    setHasInteracted(true);
    // persist resumed state
    if (id) {
      saveListeningPracticeData(id, {
        answers,
        timeRemaining,
        startTime: Date.now(),
        bookmarks,
      });
    }
  };

  const handlePause = () => {
    if (isPaused) {
      setIsPaused(false);
      setIsStarted(true);
      // Resume audio if it exists
      if (audioPlayerRef.current) {
        audioPlayerRef.current.play();
      }
    } else {
      setIsPaused(true);
      setIsStarted(false);
      // Pause audio if it exists
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
    }
  };

  const handleBack = () => {
    if (id) {
      clearListeningPracticeData(id);
      clearAudioPosition(id);
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
      let timeTaken = 0;
      if (startTime && timeRemaining != null) {
        const dur = convertDurationToSeconds(currentTest.duration);
        timeTaken = dur - timeRemaining;
      }
      const result = await submitTestAttempt(id, answers, currentTest, timeTaken, 'listening');

      if (result.success) {
        setLatestAttemptId(result.attemptId);
        setStatus('completed');
        if (id) {
          clearListeningPracticeData(id);
          clearAudioPosition(id);
          if (audioPlayerRef.current && audioPlayerRef.current.clearPosition) {
            audioPlayerRef.current.clearPosition();
          }
        }
        if (authUser?.id) {
          await fetchDashboardData(authUser.id, true);
        }
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
    if (!authUser || !id || !currentTest) {
      return;
    }
    // if (status === 'reviewing') return;
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
        setShowCorrectAnswers(true);

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
        setStatus('taking');
        setShowCorrectAnswers(false);
      }
    } catch (error) {
      setStatus('taking');
      setShowCorrectAnswers(false);
    }
  };

  const handleRetakeTest = () => {
    if (!id) return;

    if (audioPlayerRef.current && audioPlayerRef.current.pause) {
      audioPlayerRef.current.pause();
    }
    setIsPaused(true);
    setIsStarted(false);
    setStartTime(null);

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
    setShowCorrectAnswers(false);
    setTimeRemaining(currentTest ? convertDurationToSeconds(currentTest.duration) : 60 * 60);
    setHasInteracted(false);
    setCurrentPart(1);
    setLatestAttemptId(null);
    setShouldAutoPlay(true);

    clearListeningPracticeData(id);
    clearAudioPosition(id);
    if (audioPlayerRef.current && audioPlayerRef.current.clearPosition) {
      audioPlayerRef.current.clearPosition();
    }

    handleStart();
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

  // Auto-start test when page loads (if not in review/retake mode and no saved progress)
  useEffect(() => {
    const mode = searchParams.get('mode');
    const isReviewOrRetake = mode === 'review' || mode === 'retake';

    // Only auto-start if:
    // 1. Test is loaded
    // 2. Not in review/retake mode
    // 3. Not already started
    // 4. Not already interacted
    // 5. No saved data (meaning fresh start)
    // 6. No startTime set (which would indicate saved progress was loaded)
    if (
      currentTest &&
      !isReviewOrRetake &&
      !isStarted &&
      !hasInteracted &&
      !startTime &&
      !loadListeningPracticeData(id)
    ) {
      handleStart();
      setShouldAutoPlay(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTest, searchParams, isStarted, hasInteracted, startTime]);

  // ========== Annotation handlers ==========
  const handleHighlight = useCallback((range, text, partId, sectionType = 'passage', testType = 'listening') => {
    let container = null;
    if (sectionType === 'passage') {
      container = selectableContentRef.current;
    } else {
      container = range.commonAncestorContainer;
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
    applyHighlight(range, highlightId);
    window.getSelection().removeAllRanges();
  }, [addHighlight]);

  const handleNote = useCallback((range, text, partId, sectionType = 'passage', testType = 'listening') => {
    let container = null;
    if (sectionType === 'passage') {
      container = selectableContentRef.current;
    } else {
      container = range.commonAncestorContainer;
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
    applyNote(range, noteId);
    window.getSelection().removeAllRanges();
  }, [addNote]);

  // Other helpers...
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

  const getPartAnsweredCount = (partQuestions) => {
    if (!partQuestions) return 0;
    return partQuestions.filter(q => {
      // Use questions.id as primary key, fallback to question_number for backward compatibility
      const answerKey = q.id || q.question_number;
      return answerKey && answers[answerKey] && answers[answerKey].toString().trim() !== '';
    }).length;
  };

  // Get all questions across all parts, sorted by question_number
  const getAllQuestions = useCallback(() => {
    if (!currentTest?.parts) return [];
    const allQuestions = [];
    const seenQuestionNumbers = new Set();
    const sortedParts = getSortedParts();
    sortedParts.forEach(part => {
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

  // Resize panel handlers
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

  // Calculate font size in rem (base 16px = 1rem)
  const baseFontSize = fontSizeValue.base / 16;

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

      <QuestionHeader
        currentTest={currentTest}
        id={id}
        timeRemaining={timeRemaining}
        isStarted={isStarted}
        hasInteracted={hasInteracted}
        isPaused={isPaused}
        handleStart={handleStart}
        handlePause={handlePause}
        onBack={handleBack}
        showCorrectAnswers={showCorrectAnswers}
        onToggleShowCorrect={(checked) => setShowCorrectAnswers(checked)}
        status={status}
        onRetake={handleRetakeTest}
        type="Listening"
      />

      <div
        className="flex flex-1 overflow-hidden p-3 transition-all duration-300"
        ref={containerRef}
        style={{
          maxWidth: '100%',
        }}
      >
        <div ref={universalContentRef} className="flex flex-1 overflow-hidden w-full">
          {/* ===== Error Panel ===== */}
          {fetchError ? (
            <div
              className="flex flex-1 items-center justify-center p-6 w-full"
              style={{
                backgroundColor: themeColors.background,
                color: themeColors.text,
              }}
            >
              <div
                className="max-w-md w-full border rounded-2xl p-6 text-center shadow-sm"
                style={{
                  borderColor: themeColors.border,
                  backgroundColor: theme === "light" ? "#fff5f5" : "rgba(255,0,0,0.05)",
                }}
              >
                <div className="text-red-500 text-lg font-semibold mb-2">
                  ⚠️ Xatolik yuz berdi
                </div>

                <p className="text-sm opacity-80 mb-4 break-words">
                  {fetchError}
                </p>

                <div className="flex gap-3 justify-center">
                  {/* Refresh */}
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 rounded-lg text-sm border transition-all hover:scale-[1.02]"
                    style={{
                      borderColor: themeColors.border,
                      backgroundColor: themeColors.background,
                      color: themeColors.text,
                    }}
                  >
                    🔄 Refresh
                  </button>

                  {/* Back to Dashboard */}
                  <button
                    onClick={() => {
                      toast.error(fetchError);
                      navigate("/dashboard");
                    }}
                    className="px-4 py-2 rounded-lg text-sm border transition-all hover:scale-[1.02]"
                    style={{
                      borderColor: themeColors.border,
                      backgroundColor: themeColors.background,
                      color: themeColors.text,
                    }}
                  >
                    ⬅ Back to Dashboard
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
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
                  backgroundColor: theme === 'light' ? '#e5e7eb' : 'rgba(255,255,255,0.1)',
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
                  {currentPartData?.title}
                </h2>
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
                className="w-0.5 cursor-col-resize  dark:bg-gray-600 h-full flex justify-center items-center relative"
                title="Drag to resize"
                style={{ backgroundColor: themeColors.border }}
              >
                <div className="w-6 h-6 rounded-2xl flex items-center justify-center absolute border-2" style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}>
                  <LuChevronsLeftRight style={{ color: themeColors.text }} />
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
              {audioUrl && (
                <div className={status === 'taking' ? 'hidden' : ''}>
                  <AudioPlayer
                    ref={audioPlayerRef}
                    audioUrl={audioUrl}
                    isTestMode={status === 'taking'}
                    playbackRate={playbackRate}
                    onPlaybackRateChange={setPlaybackRate}
                    volume={volume}
                    onVolumeChange={setVolume}
                    autoPlay={shouldAutoPlay && status === 'taking' && !isPaused}
                    testId={id}
                    onAudioEnded={status === 'taking' ? () => {
                      if (id) {
                        clearAudioPosition(id);
                        if (audioPlayerRef.current && audioPlayerRef.current.clearPosition) {
                          audioPlayerRef.current.clearPosition();
                        }
                      }
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
                  const isMatching = groupType.includes('matching_information');
                  const isMultipleAnswers = groupType === 'multiple_answers';
                  

                  return (
                    <div key={questionGroup.id || groupIdx} className={`space-y-6 ${status === 'reviewing' ? 'w-full' : 'w-6/12'}`}>
                      <div className="space-y-3">
                        <div
                          className="text-lg font-semibold"
                          data-selectable="true"
                          data-part-id={currentPart}
                          data-section-type="questions"
                          style={{ color: themeColors.text }}
                        >
                          <h1>Questions {questionRange}</h1>
                        </div>
                        {questionGroup.instruction && (
                          <p
                            className="text-sm leading-relaxed"
                            data-selectable="true"
                            data-part-id={currentPart}
                            data-section-type="questions"
                            style={{ color: themeColors.text }}
                          >
                            {parse(questionGroup.instruction, { allowDangerousHtml: true })}
                          </p>
                        )}
                      </div>

                      {(isFillInTheBlanks || isDragAndDrop || isTableCompletion || isTable || isMap || isMatching || isMultipleAnswers) ? (
                        <div
                          ref={(el) => {
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
                                // For multiple_answers, options come from group-level options table
                                options: questionGroup.options || []
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
            </div>
          ) : (
            <div
              className="space-y-8 overflow-y-auto p-6 border rounded-2xl border-gray-300  dark:bg-gray-800 flex items-center justify-center"
              style={{ width: status === 'reviewing' ? `${100 - leftWidth}%` : '100%', backgroundColor: themeColors.background, color: themeColors.text }}
            >
              <div className="text-gray-500">
                {loading ? "Loading questions..." : "No questions available"}
              </div>
            </div>
          )}
            </>
          )}
        </div>
      </div>

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

      <FinishModal
        loading={isSubmitting}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        link={`/listening-result/${id}`}
        testId={id}
        onSubmit={handleSubmitTest}
      />

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
