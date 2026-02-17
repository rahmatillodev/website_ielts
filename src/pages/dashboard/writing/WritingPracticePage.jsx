import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import parse from "html-react-parser";
import { LuChevronsLeftRight } from "react-icons/lu";
import { toast } from "react-toastify";

import QuestionHeader from "@/components/questions/QuestionHeader";
import TextSelectionTooltip from "@/components/annotations/TextSelectionTooltip";
import NoteSidebar from "@/components/sidebar/NoteSidebar";
import WritingFinishModal from "@/components/modal/WritingFinishModal";
import WritingSuccessModal from "@/components/modal/WritingSuccessModal";
import MockTestExitModal from "@/components/modal/MockTestExitModal";
import { AppearanceProvider, useAppearance } from "@/contexts/AppearanceContext";
import { AnnotationProvider, useAnnotation } from "@/contexts/AnnotationContext";
  import { useWritingStore } from "@/store/testStore/writingStore";
import { useWritingCompletedStore } from "@/store/testStore/writingCompletedStore";
import { useAuthStore } from "@/store/authStore";
import { useMockTestClientStore } from "@/store/mockTestClientStore";
import { useMockTestSecurity } from "@/hooks/useMockTestSecurity";

import {
  saveWritingPracticeData,
  loadWritingPracticeData,
  clearWritingPracticeData,
  saveWritingResultData,
  loadWritingResultData,
  clearAllWritingPracticeData
} from "@/store/LocalStorage/writingStore";

import { saveSectionData, loadSectionData } from "@/store/LocalStorage/mockTestStorage";
import { convertDurationToSeconds } from "@/utils/testDuration";
import { applyHighlight, applyNote, getTextOffsets } from "@/utils/annotationRenderer";
import { generateWritingPDF } from "@/utils/exportOwnWritingPdf";
import { PenSquare } from "lucide-react";

const WritingPracticePageContent = () => {
  const { id: idFromParams } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { themeColors, fontSizeValue, settings, theme } = useAppearance();

  // Extract ID from URL path as fallback when useParams() doesn't work (e.g., after window.history.replaceState)
  // This ensures we can fetch writing data even if React Router hasn't updated useParams() yet
  const id = React.useMemo(() => {
    if (idFromParams) return idFromParams;
    
    // Fallback: extract from URL path
    const pathMatch = window.location.pathname.match(/\/writing-practice\/([^\/\?]+)/);
    if (pathMatch && pathMatch[1]) {
      console.log('[WritingPracticePage] Extracted ID from URL path:', pathMatch[1]);
      return pathMatch[1];
    }
    
    return idFromParams;
  }, [idFromParams]);

  const {
    currentWriting,
    fetchWritingById,
    loadingCurrentWriting,
    errorCurrentWriting,
  } = useWritingStore();

  const { submitWritingAttempt, loading: savingAttempt, getLatestWritingAttempt } = useWritingCompletedStore();
  const { authUser } = useAuthStore();
  const { updateClientStatus } = useMockTestClientStore();

  // Check if this is a mock test (check both searchParams and window.location.search)
  // Use a more reliable check that reads directly from window.location.search
  // This ensures we catch mock test mode even if React Router params haven't updated yet
  const urlSearchParams = React.useMemo(() => new URLSearchParams(window.location.search), []);
  const isMockTest = React.useMemo(() => {
    const fromSearchParams = searchParams.get('mockTest') === 'true';
    const fromUrlSearch = urlSearchParams.get('mockTest') === 'true';
    const fromWindowLocation = new URLSearchParams(window.location.search).get('mockTest') === 'true';
    return fromSearchParams || fromUrlSearch || fromWindowLocation;
  }, [searchParams, urlSearchParams]);
  const mockTestId = React.useMemo(() => 
    searchParams.get('mockTestId') || urlSearchParams.get('mockTestId'),
    [searchParams, urlSearchParams]
  );
  const mockClientId = React.useMemo(() => 
    searchParams.get('mockClientId') || urlSearchParams.get('mockClientId'),
    [searchParams, urlSearchParams]
  );

  const {
    addHighlight,
    addNote,
    highlights,
    notes,
  } = useAnnotation();

  // Security hook for mock test mode (applies on refresh too)
  const [showExitModal, setShowExitModal] = useState(false);
  const { resetExitModal, forceFullscreen } = useMockTestSecurity(
    () => {
      if (isMockTest) {
        setShowExitModal(true);
      }
    },
    isMockTest // Only active in mock test mode
  );

  const [currentTaskType, setCurrentTaskType] = useState(null);
  const [answers, setAnswers] = useState({});
  const [leftWidth, setLeftWidth] = useState(50);

  // Status: 'taking', 'reviewing'
  const [status, setStatus] = useState(() => {
    const mode = new URLSearchParams(window.location.search).get('mode');
    return mode === 'review' ? 'reviewing' : 'taking';
  });

  // Practice flow states
  const [isPracticeMode, setIsPracticeMode] = useState(false); // When user clicks "Try practice"
  const [isStarted, setIsStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Modal states
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoSubmitting, setIsAutoSubmitting] = useState(false);
  const [isLoadingReview, setIsLoadingReview] = useState(false);
  // Note: showExitModal is handled by MockTestWriting wrapper, not here
  const [isEarlyExit, setIsEarlyExit] = useState(false);

  const containerRef = useRef(null);
  const universalContentRef = useRef(null);
  const passageRef = useRef(null);
  const previousIdRef = useRef(null);
  const mockTestInitializedRef = useRef(false);

  /* ================= HANDLERS ================= */
  const handleReviewWriting = useCallback(async () => {
    if (!authUser || !id) {
      return;
    }

    setIsLoadingReview(true);
    try {
      // Fetch the writing data first if not already loaded
      let writing = currentWriting;
      if (!writing) {
        writing = await fetchWritingById(id);
      }
      console.log('[WritingPracticePage] writing', writing);

      if (!writing || !writing.writing_tasks || writing.writing_tasks.length === 0) {
        console.error('Writing not found or has no tasks');
        setStatus('taking');
        setIsLoadingReview(false);
        return;
      }

      // Get attemptId from URL if provided (for specific attempt review)
      const attemptId = searchParams.get('attemptId');
      
      // Get the specific or latest writing attempt
      const result = await getLatestWritingAttempt(id, attemptId);
      console.log('[WritingPracticePage] getLatestWritingAttempt result:', result, 'attemptId:', attemptId);
      
      if (result.success && result.attempt && result.answers) {
        console.log('[WritingPracticePage] Review mode - loaded answers:', result.answers);
        console.log('[WritingPracticePage] Available task names:', writing.writing_tasks.map(t => t.task_name));
        
        // Set answers from attempt (these come from user_answers table)
        setAnswers(result.answers);
        setStatus('reviewing');
        setIsPracticeMode(false); // Don't show practice mode in review
        
        // Set currentTaskType to the first task that has an answer, or first task
        const tasks = writing.writing_tasks || [];
        if (tasks.length > 0) {
          // Find first task with an answer, or default to first task
          const taskWithAnswer = tasks.find(t => result.answers[t.task_name]);
          const taskToSet = taskWithAnswer ? taskWithAnswer.task_name : tasks[0].task_name;
          console.log('[WritingPracticePage] Setting currentTaskType to:', taskToSet, 'Available answers keys:', Object.keys(result.answers));
          setCurrentTaskType(taskToSet);
        }
        setIsLoadingReview(false);
        return;
      }

      // No attempt found, stay in taking mode
      console.log('[WritingPracticePage] No attempt found for review');
      setStatus('taking');
      setIsLoadingReview(false);
    } catch (error) {
      console.error('Error loading review data:', error);
      setStatus('taking');
      setIsLoadingReview(false);
    }
  }, [authUser, id, currentWriting, fetchWritingById, getLatestWritingAttempt, status, searchParams]);

  /* ================= FETCH & INITIALIZE ================= */
  useEffect(() => {
    // Ensure we have a valid ID before proceeding
    if (!id) {
      console.warn('[WritingPracticePage] No writing ID available yet. Waiting...', {
        idFromParams,
        pathname: window.location.pathname,
        search: window.location.search
      });
      
      // For mock test mode, retry after a short delay if ID is not available
      if (isMockTest) {
        const retryTimeout = setTimeout(() => {
          // Re-extract ID from URL path
          const pathMatch = window.location.pathname.match(/\/writing-practice\/([^\/\?]+)/);
          if (pathMatch && pathMatch[1]) {
            console.log('[WritingPracticePage] Retry: Extracted ID from URL path:', pathMatch[1]);
            // Force re-render by updating a state or trigger fetch directly
            // The effect will re-run when id changes
          }
        }, 500);
        return () => clearTimeout(retryTimeout);
      }
      return;
    }

    // Clear all old writing practice data when starting a NEW test (ID changed)
    // This ensures old practice data from other tests doesn't interfere
    // But preserve data if it's the same test (page refresh)
    const isNewTest = previousIdRef.current !== null && previousIdRef.current !== id;
    if (isNewTest) {
      clearAllWritingPracticeData();
      mockTestInitializedRef.current = false; // Reset mock test initialization for new test
    }
    previousIdRef.current = id;
    
    // Always fetch writing data - needed for both normal and review modes
    // Only fetch if we don't already have the data or if it's a different ID
    if (!currentWriting || currentWriting.id !== id) {
      console.log('[WritingPracticePage] Fetching writing with ID:', id);
      fetchWritingById(id)
        .then((writing) => {
          if (writing) {
            console.log('[WritingPracticePage] Successfully fetched writing:', writing.id, 'Tasks:', writing.writing_tasks?.length);
          } else {
            console.warn('[WritingPracticePage] fetchWritingById returned null/undefined');
          }
        })
        .catch(err => {
          console.error('[WritingPracticePage] Error fetching writing:', err);
        });
    } else {
      console.log('[WritingPracticePage] Writing already loaded, skipping fetch:', currentWriting.id);
    }
  }, [id, fetchWritingById, currentWriting, isMockTest, idFromParams]);

  useEffect(() => {
    if (!currentWriting?.writing_tasks?.length) return;

    const tasks = currentWriting.writing_tasks;
    
    // Check URL parameter for review mode
    const isReviewMode = searchParams.get('mode') === 'review';
    const urlPracticeMode = searchParams.get('mode') === 'practice';

    // Always set currentTaskType to first task if not set (needed for initial render)
    if (!currentTaskType && tasks.length > 0) {
      setCurrentTaskType(tasks[0].task_name);
    }

    // If review mode, load attempt data (it will update currentTaskType if needed)
    if (isReviewMode && authUser && id && status === 'reviewing') {
      handleReviewWriting();
      return;
    }

    // Mock test mode: Auto-start timer immediately (no button needed)
    if (isMockTest && !isReviewMode && currentWriting && tasks.length > 0) {
      // Only initialize once per mock test session
      if (!mockTestInitializedRef.current && mockTestId) {
        // Load/restore progress from mock test storage on refresh
        const savedData = loadSectionData(mockTestId, 'writing');
        
        // Get duration from URL param (in seconds) or use writing duration
        const durationParam = searchParams.get('duration') || urlSearchParams.get('duration');
        const durationInSeconds = durationParam 
          ? parseInt(durationParam, 10) 
          : convertDurationToSeconds(currentWriting.duration);
        
       
        
        if (savedData && savedData.timeRemaining !== undefined && savedData.timeRemaining !== null) {
          // Restore from saved data (refresh case)
          // Restore answers if available
          if (savedData.answers && Object.keys(savedData.answers).length > 0) {
            setAnswers(savedData.answers);
          } else {
            // Initialize answers if not set
            const init = {};
            tasks.forEach((t) => (init[t.task_name] = ""));
            setAnswers(init);
          }
          
          // Calculate elapsed time since last save
          const now = Date.now();
          const savedStartTime = savedData.startTime || now;
          const timeSinceSave = Math.floor((now - savedStartTime) / 1000);
          const savedElapsedTime = savedData.elapsedTime || 0;
          const totalElapsed = savedElapsedTime + timeSinceSave;
          
          // Calculate remaining time
          const remaining = Math.max(0, durationInSeconds - totalElapsed);
          setTimeRemaining(remaining);
          setElapsedTime(totalElapsed);
          setStartTime(savedStartTime);
          
          // Auto-resume timer if time remaining > 0
          // If time is already expired (<= 0), trigger auto-submit immediately
          if (remaining <= 0) {
            console.log('[WritingPracticePage] Time already expired, will trigger auto-submit');
            setIsPracticeMode(true);
            setIsStarted(true); // Set started so auto-submit can trigger
            setIsPaused(false);
          } else {
            setIsPracticeMode(true);
            setIsStarted(true);
            setIsPaused(false);
          }
          
          // Reset submission state when loading saved data to ensure clean state
          setIsAutoSubmitting(false);
          setIsSaving(false);
        } else {
          // First time initialization - no saved data
          // Initialize answers if not set
          if (Object.keys(answers).length === 0) {
            const init = {};
            tasks.forEach((t) => (init[t.task_name] = ""));
            setAnswers(init);
          }
          
          // Auto-start timer
          setIsPracticeMode(true);
          setIsStarted(true);
          setIsPaused(false);
          setTimeRemaining(durationInSeconds);
          setElapsedTime(0);
          setStartTime(Date.now());
        }
        
        // Note: Status is set to 'started' when listening section begins (first section)
        // No need to set it again here when writing starts
        
        mockTestInitializedRef.current = true;
      }

      return; // Skip normal localStorage loading for mock test
    }
    
    // Reset initialization flag when not in mock test mode
    if (!isMockTest) {
      mockTestInitializedRef.current = false;
    }
    
    // Load saved data from localStorage (only if not in review mode and not mock test)
    const savedData = loadWritingPracticeData(id);
    const resultData = loadWritingResultData(id);

    // If result data exists and is newer than practice data, clear stale practice data
    // This happens when user submitted writing and visits page again - old practice data should be cleared
    if (resultData && savedData) {
      const resultCompletedAt = resultData.completedAt || 0;
      const practiceLastSaved = savedData.lastSaved || 0;
      
      // If result is newer, practice data is stale (from before submission)
      if (resultCompletedAt > practiceLastSaved) {
        clearWritingPracticeData(id);
        // Don't use savedData, initialize fresh instead
        const init = {};
        tasks.forEach((t) => (init[t.task_name] = ""));
        setAnswers(init);
        setTimeRemaining(convertDurationToSeconds(currentWriting.duration));
        setElapsedTime(0);
        setStartTime(null);
        setIsPracticeMode(false);
        setIsStarted(false);
        setIsPaused(false);

        // Check if URL has practice mode parameter
        if (urlPracticeMode) {
          setIsPracticeMode(true);
          setIsStarted(true);
          setStartTime(Date.now());
        }
        return; // Skip loading stale data
      }
    }

    // Continue with normal loading if data is not stale
    if (savedData) {
      setAnswers(savedData.answers || {});

      // Restore time remaining - if startTime exists and practice was active (not paused), calculate remaining time
      if (savedData.startTime && savedData.isPracticeMode && savedData.isStarted && !savedData.isPaused && savedData.lastSaved) {
        // Calculate time elapsed since last save
        const timeSinceSave = Math.floor((Date.now() - savedData.lastSaved) / 1000);
        const totalElapsed = (savedData.elapsedTime || 0) + timeSinceSave;
        const totalDuration = convertDurationToSeconds(currentWriting.duration);
        const remaining = Math.max(0, totalDuration - totalElapsed);
        setTimeRemaining(remaining);
        setElapsedTime(totalElapsed);
        // Keep original startTime for accurate time calculation
        setStartTime(savedData.startTime);
      } else {
        // If paused or no startTime, use saved values
        setTimeRemaining(savedData.timeRemaining || convertDurationToSeconds(currentWriting.duration));
        setElapsedTime(savedData.elapsedTime || 0);
        setStartTime(savedData.startTime || null);
      }

      // Restore practice mode from URL or localStorage
      const shouldBeInPracticeMode = urlPracticeMode || savedData.isPracticeMode || false;
      setIsPracticeMode(shouldBeInPracticeMode);
      setIsStarted(savedData.isStarted || shouldBeInPracticeMode);
      setIsPaused(savedData.isPaused || false);

      // If practice mode was active, restore it
      if (shouldBeInPracticeMode) {
        setIsStarted(true);
      }
    } else {
      // Initialize fresh
      const init = {};
      tasks.forEach((t) => (init[t.task_name] = ""));
      setAnswers(init);
      setTimeRemaining(convertDurationToSeconds(currentWriting.duration));

      // Check if URL has practice mode parameter
      if (urlPracticeMode) {
        setIsPracticeMode(true);
        setIsStarted(true);
        setStartTime(Date.now());
      }
    }
  }, [currentWriting, id, searchParams, authUser, handleReviewWriting, isMockTest, mockClientId, urlSearchParams, updateClientStatus]);

  // Check URL params for mode (review) - after writing is loaded
  // This is handled in the useEffect above when currentWriting is available
  // No need for a separate useEffect here

  /* ================= FORCE SUBMIT HANDLER (Mock Test) ================= */
  // Listen for forced submission when user confirms exit
  useEffect(() => {
    if (!isMockTest || !mockTestId) return;

    const handleForceSubmit = async (event) => {
      const { section, mockTestId: eventMockTestId, writingId: eventWritingId } = event.detail || {};
      
      // Only handle if it's for writing section and matches our mockTestId
      if (section === 'writing' && eventMockTestId === mockTestId) {
        // Prevent duplicate submissions
        if (isAutoSubmitting || isSaving) return;

        setIsSaving(true);

        try {
          // Get writing ID - use event writingId, then id from params, then from URL path as fallback
          let writingIdToUse = eventWritingId || id;
          if (!writingIdToUse) {
            const pathMatch = window.location.pathname.match(/\/writing-practice\/([^\/]+)/);
            writingIdToUse = pathMatch ? pathMatch[1] : null;
          }

          if (!writingIdToUse) {
            throw new Error('Writing ID is required but not available');
          }

          // Calculate time taken
          const timeTaken = startTime
            ? Math.floor((Date.now() - startTime) / 1000)
            : elapsedTime;

          // Save to database
          const result = await submitWritingAttempt(writingIdToUse, answers, timeTaken, mockClientId);

          if (result.success) {
            // Signal completion via localStorage
            const completionKey = `mock_test_${mockTestId}_writing_completed`;
            const resultKey = `mock_test_${mockTestId}_writing_result`;
            const resultData = {
              success: true,
              attemptId: result.attemptId,
            };
            localStorage.setItem(completionKey, 'true');
            localStorage.setItem(resultKey, JSON.stringify(resultData));

            // Update mock_test_clients status to 'completed'
            if (mockClientId) {
              updateClientStatus(mockClientId, 'completed').catch(err => {
                console.error('Error updating mock test client status to completed:', err);
              });
            }

            setIsSaving(false);
          } else {
            setIsSaving(false);
            toast.error(result.error || 'Failed to save writing attempt');
          }
        } catch (error) {
          console.error('Error force-submitting writing:', error);
          setIsSaving(false);
          toast.error('An error occurred while saving your writing');
        }
      }
    };

    window.addEventListener('mockTestForceSubmit', handleForceSubmit);

    return () => {
      window.removeEventListener('mockTestForceSubmit', handleForceSubmit);
    };
  }, [isMockTest, mockTestId, mockClientId, id, answers, startTime, elapsedTime, isAutoSubmitting, isSaving, submitWritingAttempt, updateClientStatus]);

  /* ================= TIMER ================= */
  useEffect(() => {
    if (!isPracticeMode || !isStarted || isPaused || timeRemaining <= 0 || savingAttempt || isAutoSubmitting || isSaving) return;

    const interval = setInterval(() => {
      // Stop timer immediately if submission has started (check both state variables)
      if (isSaving || isAutoSubmitting || savingAttempt) {
        setIsStarted(false);
        setIsPaused(true);
        clearInterval(interval);
        return;
      }
      
      setTimeRemaining((t) => {
        if (t === null || t <= 1) {
          clearInterval(interval);
          // Stop timer immediately
          setIsStarted(false);
          setIsPaused(true);
          // Auto-submit when time runs out (no loading overlay)
          // Only call if not already submitting
          if (!isAutoSubmitting && !isSaving) {
            handleAutoSubmit();
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPracticeMode, isStarted, isPaused, timeRemaining, savingAttempt, isAutoSubmitting, isSaving, handleAutoSubmit]);

  // Update elapsed time
  useEffect(() => {
    if (!isPracticeMode || !isStarted || isPaused || !startTime || savingAttempt || isAutoSubmitting) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedTime(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [isPracticeMode, isStarted, isPaused, startTime, savingAttempt, isAutoSubmitting]);

  /* ================= LOCALSTORAGE PERSISTENCE ================= */
  useEffect(() => {
    if (!id || !isPracticeMode) return;

    // Calculate current elapsed time for accurate saving
    const currentElapsedTime = startTime && isStarted && !isPaused
      ? Math.floor((Date.now() - startTime) / 1000)
      : elapsedTime;

    // For mock test, save to mock test storage
    if (isMockTest && mockTestId) {
      saveSectionData(mockTestId, 'writing', {
        answers,
        timeRemaining,
        elapsedTime: currentElapsedTime,
        startTime: startTime || Date.now(),
        completed: false,
      });
    } else {
      // For normal practice, save to writing practice storage
      saveWritingPracticeData(id, {
        answers,
        timeRemaining,
        elapsedTime: currentElapsedTime,
        startTime: startTime || Date.now(),
        isPracticeMode: true,
        isStarted,
        isPaused,
      });
    }
  }, [id, answers, timeRemaining, elapsedTime, startTime, isPracticeMode, isStarted, isPaused, isMockTest, mockTestId]);

  // Also save periodically to ensure time updates are captured
  useEffect(() => {
    if (!id || !isPracticeMode) return;

    const interval = setInterval(() => {
      // Calculate current elapsed time for accurate saving
      const currentElapsedTime = startTime && isStarted && !isPaused
        ? Math.floor((Date.now() - startTime) / 1000)
        : elapsedTime;

      if (isMockTest && mockTestId) {
        saveSectionData(mockTestId, 'writing', {
          answers,
          timeRemaining,
          elapsedTime: currentElapsedTime,
          startTime: startTime || Date.now(),
          completed: false,
        });
      } else {
        saveWritingPracticeData(id, {
          answers,
          timeRemaining,
          elapsedTime: currentElapsedTime,
          startTime: startTime || Date.now(),
          isPracticeMode: true,
          isStarted,
          isPaused,
        });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [id, answers, timeRemaining, elapsedTime, startTime, isPracticeMode, isStarted, isPaused, isMockTest, mockTestId]);

  const handleTryPractice = () => {
    // Clear all old writing practice data when starting practice
    // This ensures a clean start and removes old data from other tests
    clearAllWritingPracticeData();
    
    setIsPracticeMode(true);
    setIsStarted(true);
    setStartTime(Date.now());
    setElapsedTime(0);

    // Update URL to include practice mode parameter
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('mode', 'practice');
    setSearchParams(newSearchParams, { replace: true });

    // Save to localStorage
    saveWritingPracticeData(id, {
      answers,
      timeRemaining,
      elapsedTime: 0,
      startTime: Date.now(),
      isPracticeMode: true,
      isStarted: true,
      isPaused: false,
    });
  };

  const handleTextChange = (e) => {
    if (!isPracticeMode) {
      // If not in practice mode, clicking textarea should trigger try practice
      handleTryPractice();
      return;
    }

    if (isPaused) setIsPaused(false);
    
    // Use functional update to get the latest state
    setAnswers((p) => {
      const updatedAnswers = { ...p, [currentTaskType]: e.target.value };
      
      // Save immediately on text change with the updated answers
      if (id) {
        saveWritingPracticeData(id, {
          answers: updatedAnswers,
          timeRemaining,
          elapsedTime,
          startTime: startTime || Date.now(),
          isPracticeMode: true,
          isStarted,
          isPaused: false,
        });
      }
      
      return updatedAnswers;
    });
  };


  const handleFinish = useCallback(() => {
    if (!currentWriting || !currentWriting.writing_tasks) return;

    // Get the latest answers from localStorage to ensure we have the most up-to-date data
    // This prevents issues where state hasn't updated yet after typing
    const savedData = loadWritingPracticeData(id);
    const latestAnswers = savedData?.answers || answers;

    console.log("[WritingPracticePage] answers (state)", answers);
    console.log("[WritingPracticePage] latestAnswers (from localStorage)", latestAnswers);
    console.log("[WritingPracticePage] currentWriting", currentWriting);
    
    const taskWordCounts = currentWriting.writing_tasks.map((task) => {
      const answer = latestAnswers[task.task_name] || "";
      const wordCount = countWords(answer);
      return {
        taskType: task.task_name,
        wordCount: wordCount,
        answer: answer, // Include for debugging
      };
    });

    console.log("[WritingPracticePage] taskWordCounts", taskWordCounts);

    // Check if each task has at least one word
    for (const task of taskWordCounts) {
      if (task.wordCount === 0) {
        console.log(`[WritingPracticePage] Task ${task.taskType} is empty. Answer: "${task.answer}"`);
        toast.error(`Please write at least one word in ${task.taskType} before finishing.`);
        return;
      }
    }

    setIsFinishModalOpen(true);
  }, [answers, currentWriting, id]);

  const handleRetakeTask = useCallback(() => {
    if (!id) return;
  
    /* URL tozalash */
    const newSearchParams = new URLSearchParams(searchParams.toString());
    newSearchParams.delete('mode');
    setSearchParams(newSearchParams, { replace: true });
  
    /* MUHIM: review flag */
    setStatus('taking');
  
    /* Review flowni to'liq o'chirish */
    setIsLoadingReview(false);
    setIsPracticeMode(false);
    setIsStarted(false);
    setIsPaused(false);
  
    /* Javoblarni reset */
    const init = {};
    if (currentWriting?.writing_tasks?.length) {
      currentWriting.writing_tasks.forEach(t => {
        init[t.task_name] = "";
      });
      setCurrentTaskType(currentWriting.writing_tasks[0].task_name);
    }
    setAnswers(init);
  
    /* Timer reset */
    setStartTime(null);
    setElapsedTime(0);
    if (currentWriting) {
      setTimeRemaining(convertDurationToSeconds(currentWriting.duration));
    }
  
    clearWritingPracticeData(id);
  
  }, [id, searchParams, setSearchParams, currentWriting]);

  const handleBack = useCallback(() => {
    // In mock test mode, show exit modal
    if (isMockTest) {
      setShowExitModal(true);
      return;
    }
    // Clear practice data from localStorage when user exits via back button
    if (id) {
      clearWritingPracticeData(id);
    }
    navigate(-1);
  }, [id, navigate, isMockTest]);

  // Exit handlers for mock test mode
  const handleExitConfirm = async () => {
    setShowExitModal(false);
    resetExitModal();
    // Mark as early exit so we navigate to results after submission
    setIsEarlyExit(true);
    window.dispatchEvent(new CustomEvent('mockTestForceSubmit', {
      detail: { section: 'writing', mockTestId, writingId: id }
    }));
    setIsSaving(true);
  };

  const handleExitCancel = () => {
    setShowExitModal(false);
    resetExitModal();
    forceFullscreen();
  };

  // Exit handlers are handled by MockTestWriting wrapper, not here
  // These functions are not used - exit modal is handled in MockTestWriting wrapper
  
  

  // Auto-submit function (no loading overlay, no modal)
  const handleAutoSubmit = useCallback(async () => {
    if (!currentWriting || !currentWriting.writing_tasks || isAutoSubmitting || isSaving) return;

    // Stop timer immediately (set state first to stop timer interval)
    setIsAutoSubmitting(true);
    setIsStarted(false);
    setIsPaused(true);
    
    toast.info("Time is up! Auto-submitting your writing...");

    try {
      // Calculate time taken
      const timeTaken = startTime
        ? Math.floor((Date.now() - startTime) / 1000)
        : elapsedTime;

      // Get writing ID - use id from params, or fallback to URL path
      let writingIdToUse = id;
      if (!writingIdToUse) {
        const pathMatch = window.location.pathname.match(/\/writing-practice\/([^\/]+)/);
        writingIdToUse = pathMatch ? pathMatch[1] : null;
      }

      if (!writingIdToUse) {
        throw new Error('Writing ID is required but not available');
      }

      // Save to database (silently, no loading overlay)
      // Pass mockClientId if in mock test mode
      const result = await submitWritingAttempt(writingIdToUse, answers, timeTaken, isMockTest ? mockClientId : null);

      if (result.success) {
        // If mock test, signal completion via localStorage
        if (isMockTest && mockTestId) {
          const completionKey = `mock_test_${mockTestId}_writing_completed`;
          const resultKey = `mock_test_${mockTestId}_writing_result`;
          const resultData = {
            success: true,
            attemptId: result.attemptId,
          };
          localStorage.setItem(completionKey, 'true');
          localStorage.setItem(resultKey, JSON.stringify(resultData));
        }

        // Update mock_test_clients status to 'completed' if in mock test mode
        if (isMockTest && mockClientId) {
          updateClientStatus(mockClientId, 'completed').catch(err => {
            console.error('Error updating mock test client status to completed:', err);
          });
        }

        // Save result data (only if not mock test, as mock test doesn't use localStorage for results)
        if (!isMockTest) {
          saveWritingResultData(id, {
            answers,
            timeRemaining: 0,
            elapsedTime: timeTaken,
            startTime,
          });

          // Clear practice data
          clearWritingPracticeData(id);

          // Reset to initial state (sample preview mode)
          setIsPracticeMode(false);
          setIsStarted(false);
          setIsPaused(false);
          setStartTime(null);
          setElapsedTime(0);

          // Reset timer to full duration
          if (currentWriting) {
            setTimeRemaining(convertDurationToSeconds(currentWriting.duration));
          }

          // Remove practice mode from URL
          const newSearchParams = new URLSearchParams(searchParams);
          newSearchParams.delete('mode');
          setSearchParams(newSearchParams, { replace: true });

          // Show success modal after saving completes
          setIsAutoSubmitting(false);
          setIsSuccessModalOpen(true);
          toast.success("Your writing has been auto-submitted successfully!");
        } else {
          // For mock test, just mark as submitting - MockTestWriting will handle navigation
          setIsAutoSubmitting(false);
        }
      } else {
        setIsAutoSubmitting(false);
        toast.error(result.error || 'Failed to auto-submit writing attempt');
        // Resume practice mode if save failed
        setIsPaused(false);
        setIsStarted(true);
      }
    } catch (error) {
      console.error('Error auto-submitting writing:', error);
      setIsAutoSubmitting(false);
      toast.error('An error occurred while auto-submitting your writing');
      // Resume practice mode if save failed
      setIsPaused(false);
      setIsStarted(true);
    }
  }, [currentWriting, answers, startTime, elapsedTime, id, searchParams, setSearchParams, submitWritingAttempt, isAutoSubmitting, isMockTest, mockTestId, mockClientId, updateClientStatus]);

  // If all tasks have at least one word, open the finish modal and save the writing

  const handleSubmitFinish = async () => {
    setIsFinishModalOpen(false);
    
    // Stop timer immediately when submission starts (set state first to stop timer interval)
    setIsSaving(true);
    setIsStarted(false);
    setIsPaused(true);

    try {
      // Calculate time taken before resetting state
      const timeTaken = startTime
        ? Math.floor((Date.now() - startTime) / 1000)
        : elapsedTime;

      // Get writing ID - use id from params, or fallback to URL path
      let writingIdToUse = id;
      if (!writingIdToUse) {
        const pathMatch = window.location.pathname.match(/\/writing-practice\/([^\/]+)/);
        writingIdToUse = pathMatch ? pathMatch[1] : null;
      }

      if (!writingIdToUse) {
        throw new Error('Writing ID is required but not available');
      }

      // Save to database
      // Pass mockClientId if in mock test mode
      const result = await submitWritingAttempt(writingIdToUse, answers, timeTaken, isMockTest ? mockClientId : null);

      if (result.success) {
        // If mock test, signal completion via localStorage
        if (isMockTest && mockTestId) {
          const completionKey = `mock_test_${mockTestId}_writing_completed`;
          const resultKey = `mock_test_${mockTestId}_writing_result`;
          const resultData = {
            success: true,
            attemptId: result.attemptId,
          };
          localStorage.setItem(completionKey, 'true');
          localStorage.setItem(resultKey, JSON.stringify(resultData));
        }

        // Update mock_test_clients status to 'completed' if in mock test mode
        if (isMockTest && mockClientId) {
          updateClientStatus(mockClientId, 'completed').catch(err => {
            console.error('Error updating mock test client status to completed:', err);
          });
        }

        // Save result data (only if not mock test, as mock test doesn't use localStorage for results)
        if (!isMockTest) {
          saveWritingResultData(id, {
            answers,
            timeRemaining,
            elapsedTime: timeTaken,
            startTime,
          });

          // Clear practice data
          clearWritingPracticeData(id);

          // Reset to initial state (sample preview mode)
          setIsPracticeMode(false);
          setIsStarted(false);
          setIsPaused(false);
          setStartTime(null);
          setElapsedTime(0);

          // Reset timer to full duration
          if (currentWriting) {
            setTimeRemaining(convertDurationToSeconds(currentWriting.duration));
          }

          // Remove practice mode from URL
          const newSearchParams = new URLSearchParams(searchParams);
          newSearchParams.delete('mode');
          setSearchParams(newSearchParams, { replace: true });

          // Show success modal after saving completes
          setIsSaving(false);
          setIsSuccessModalOpen(true);
        } else {
          // For mock test, just mark as saving - MockTestWriting will handle navigation
          setIsSaving(false);

          navigate('/mock-test/results');
                }
      } else {
        setIsSaving(false);
        toast.error(result.error || 'Failed to save writing attempt');
        // Resume practice mode if save failed
        setIsPaused(false);
        setIsStarted(true);
      }
    } catch (error) {
      console.error('Error finishing writing:', error);
      setIsSaving(false);
      toast.error('An error occurred while saving your writing');
      // Resume practice mode if save failed
      setIsPaused(false);
      setIsStarted(true);
    }
  };

  const handleDownloadPDF = async () => {
    if (!currentWriting) return;

    setIsPdfLoading(true);
    try {
      // Prepare tasks data for PDF
      const tasks = {};

      // Load images if needed
      const loadImage = async (url) => {
        if (!url) return null;
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          return new Promise((resolve, reject) => {
            img.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0);
              resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = reject;
            img.src = url;
          });
        } catch (error) {
          console.warn('Failed to load image for PDF:', error);
          return null;
        }
      };

      for (const task of currentWriting.writing_tasks) {
        const taskKey = task.task_name === "Task 1" ? "task1" : "task2";
        const imageData = task.image_url ? await loadImage(task.image_url) : null;

        tasks[taskKey] = {
          question: task.content || "",
          answer: answers[task.task_name] || "",
          image: imageData,
        };
      }

      const totalTime = formatTime(elapsedTime);
      await generateWritingPDF(tasks, totalTime, settings);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsPdfLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  // Word count function
  const countWords = (text) => {
    if (!text || text.trim() === '') return 0;

    const cleaned = text.replace(/[\u2018\u2019']/g, "'");
    const words = cleaned
      .trim()
      .split(/\s+/)
      .flatMap(word => {
        if (word.includes('-')) return word.split('-');
        return [word];
      });

    return words.filter(w => /[a-zA-Z0-9]/.test(w)).length;
  };

  /* ================= RESIZE ================= */
  const startResize = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = leftWidth;

    const onMove = (ev) => {
      const delta = ((ev.clientX - startX) / window.innerWidth) * 100;
      setLeftWidth(Math.min(Math.max(startWidth + delta, 20), 80));
    };

    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  /* ================= ANNOTATION ================= */
  const handleHighlight = useCallback((range, text, partId, sectionType = 'passage', testType = 'writing') => {
    const container = passageRef.current;
    if (!container) return;

    const offsets = getTextOffsets(container, range);
    const id = addHighlight({
      text,
      startOffset: offsets.startOffset,
      endOffset: offsets.endOffset,
      containerId: `passage-${partId}`,
      partId,
      sectionType,
      testType,
      range: range.cloneRange(),
    });

    applyHighlight(range, id);
    window.getSelection().removeAllRanges();
  }, [addHighlight]);

  const handleNote = useCallback((range, text, partId, sectionType = 'passage', testType = 'writing') => {
    const container = passageRef.current;
    if (!container) return;

    const offsets = getTextOffsets(container, range);
    const id = addNote({
      text,
      note: "",
      startOffset: offsets.startOffset,
      endOffset: offsets.endOffset,
      containerId: `passage-${partId}`,
      partId,
      sectionType,
      testType,
      range: range.cloneRange(),
    });

    applyNote(range, id);
    window.getSelection().removeAllRanges();
  }, [addNote]);

  const displayWriting = currentWriting;

  // Ensure currentTaskType is set (use first task as fallback)
  const effectiveTaskType = currentTaskType || currentWriting?.writing_tasks?.[0]?.task_name;
  const currentTask = displayWriting?.writing_tasks?.find(
    (t) => t.task_name === effectiveTaskType
  );
  
  // If we have a currentTaskType but no matching task, try to use the first task
  const taskToDisplay = currentTask || currentWriting?.writing_tasks?.find(t => t.task_name === effectiveTaskType) || currentWriting?.writing_tasks?.[0];
  
  // Calculate font size in rem (base 16px = 1rem) for consistent scaling
  const baseFontSize = fontSizeValue.base / 16;
  
  /* ================= RENDER ================= */
  return (
    <div 
      className="flex flex-col h-screen" 
      style={{ 
        background: themeColors.background,
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
          isSubmitting={isSaving}
        />
      )}
      <TextSelectionTooltip
        universalContentRef={universalContentRef}
        partId={taskToDisplay?.task_name || effectiveTaskType || 'task'}
        onHighlight={handleHighlight}
        onNote={handleNote}
        testType="writing"
      />

      <QuestionHeader
        currentTest={displayWriting}
        id={id}
        timeRemaining={isPracticeMode ? timeRemaining : null} // Hide timer if not in practice mode
        isStarted={isStarted}
        isPaused={isPaused}
        handleStart={handleTryPractice}
        handlePause={() => setIsPaused((p) => !p)}
        onBack={handleBack}
        type="Writing"
        status={status}
        showTryPractice={!isMockTest && !isPracticeMode && !isStarted && status === 'taking'}
        showCorrectAnswers={false}
        onToggleShowCorrect={() => {}}
        handleRedoTask={status === 'reviewing' ? handleRetakeTask : undefined}
        isPracticeMode={isPracticeMode}
      />

      <div className="flex flex-1 overflow-hidden" ref={containerRef}>
        <div className="flex w-full items-stretch p-4 gap-2 overflow-hidden" ref={universalContentRef}>
          {/* LEFT - Show question content in all modes including review */}
          <div
            className="border overflow-y-auto rounded-2xl px-4 pt-1 pb-10 h-full scrollbar-hide"
            style={{ width: `${leftWidth}%`, borderColor: themeColors.border, backgroundColor: themeColors.background }}
          >
            {loadingCurrentWriting ? (
              <div className="flex items-center justify-center h-full">
                <div style={{ color: themeColors.text, fontSize: `${fontSizeValue.base}px` }}>
                  Loading writing...
                </div>
              </div>
            ) : errorCurrentWriting ? (
              <div className="flex items-center justify-center h-full p-6">
                <div 
                  className="max-w-xl w-full py-8 px-4 border rounded-xl shadow-sm text-center"
                  style={{
                    borderColor: themeColors.border,
                    backgroundColor: theme === 'light' ? '#fff5f5' : 'rgba(255,0,0,0.05)'
                  }}
                >
                  <p className="text-sm font-semibold text-red-500 mb-2">
                    ⚠️ Writing loading error
                  </p>
                  <p className="text-base mb-4 break-words" style={{ color: themeColors.text, opacity: 0.7 }}>
                    {typeof errorCurrentWriting === 'string' ? errorCurrentWriting : 'Unknown error'}
                  </p>
                </div>
              </div>
            ) : !currentWriting ? (
              <div className="flex items-center justify-center h-full">
                <div style={{ color: themeColors.text, fontSize: `${fontSizeValue.base}px` }}>
                  {loadingCurrentWriting ? 'Loading writing...' : 'No writing data available'}
                </div>
              </div>
            ) : !currentWriting.writing_tasks || currentWriting.writing_tasks.length === 0 ? (
              <div className="flex items-center justify-center h-full p-6">
                <div 
                  className="max-w-xl w-full py-8 px-4 border rounded-xl shadow-sm text-center"
                  style={{
                    borderColor: themeColors.border,
                    backgroundColor: theme === 'light' ? '#fff5f5' : 'rgba(255,0,0,0.05)'
                  }}
                >
                  <p className="text-sm font-semibold text-red-500 mb-2">
                    ⚠️ No tasks found
                  </p>
                  <p className="text-base mb-4 break-words" style={{ color: themeColors.text, opacity: 0.7 }}>
                    This writing doesn't have any tasks. Please contact support if this is unexpected.
                  </p>
                  <p className="text-xs" style={{ color: themeColors.text, opacity: 0.5 }}>
                    Writing ID: {currentWriting.id}
                  </p>
                </div>
              </div>
            ) : !taskToDisplay ? (
              <div className="flex items-center justify-center h-full">
                <div style={{ color: themeColors.text, fontSize: `${fontSizeValue.base}px` }}>
                  Task not found
                </div>
              </div>
            ) : (
              <>
                <div
                  className="m-5 p-4 border rounded-lg"
                  style={{
                    backgroundColor: theme === 'light' ? '#e5e7eb' : 'rgba(255,255,255,0.1)',
                    borderColor: themeColors.border
                  }}
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <PenSquare
                        className="w-5 h-5 shrink-0 mb-0.5"
                        style={{ color: themeColors.text }}
                      />
                      <span
                        className="text-base font-bold"
                        style={{ 
                          color: themeColors.text,
                          fontSize: `${fontSizeValue.base}px`
                        }}
                      >
                        IELTS Writing Practice - {taskToDisplay.title}
                      </span>
                    </div>

                  </div>
                </div>
                <div className="border rounded-lg text-justify" ref={passageRef} style={{ borderColor: themeColors.border }}>
                  <div className="p-6 m-5">
                  <h1 
                    className="text-2xl font-bold"
                    style={{ 
                      color: themeColors.text,
                      fontSize: `${fontSizeValue.base * 1.5}px`
                    }}
                  >
                    {taskToDisplay.title}
                  </h1>
                  <div 
                    className="text-sm my-4"
                    style={{ 
                      color: themeColors.text,
                      opacity: 0.7,
                      fontSize: `${fontSizeValue.base}px`
                    }}
                  >
                    {parse(taskToDisplay.content || "")}
                  </div>
                  {/* IMAGE */}
                  {taskToDisplay.image_url && (
                    <div 
                      className="p-6 border-t w-full"
                      style={{ borderColor: themeColors.border }}
                    >
                      <img
                        src={taskToDisplay.image_url}
                        alt={taskToDisplay.title}
                        className="w-full max-h-[500px] object-contain rounded-2xl"
                        />
                    </div>
                  )}
                  </div>

                  {/* feedback */}
                  {/* Hide feedback in mock test mode */}
                  {!isMockTest && !isPracticeMode ? (
                    taskToDisplay.feedback && (
                      <div 
                        className="p-6 border-t w-full"
                        style={{ borderColor: themeColors.border }}
                      >
                        <h3 
                          className="text-xl font-semibold mb-4"
                          style={{ 
                            color: themeColors.text,
                            fontSize: `${fontSizeValue.base * 1.25}px`
                          }}
                        >
                          Feedback
                        </h3>
                        <div
                          style={{ 
                            color: themeColors.text,
                            fontSize: `${fontSizeValue.base}px`
                          }}
                        >
                          {parse(taskToDisplay.feedback || "")}
                        </div>
                      </div>
                    )
                  ) : !isMockTest && isPracticeMode ? (
                    <div 
                      className="p-6 border-t w-full"
                      style={{ borderColor: themeColors.border }}
                    >
                    <p 
                      style={{ 
                        color: themeColors.text,
                        opacity: 0.7,
                        fontSize: `${fontSizeValue.base}px`
                      }}
                    >
                      Feedback is not available yet. In the future, you will receive personalized feedback for every piece of writing you submit.
                    </p>
                  </div>
                  ) : null}
                </div>
              </>
            )}
          </div>

          {/* RESIZER */}
          <div className="relative w-[14px] flex justify-center">
            <div
              onMouseDown={startResize}
              className="absolute inset-y-0 w-[4px] cursor-col-resize"
              style={{ backgroundColor: themeColors.border }}
            />
            <div
              onMouseDown={startResize}
              className="absolute top-1/2 left-1/2 w-6 h-6 rounded-2xl flex items-center justify-center border-2 cursor-col-resize"
              style={{
                backgroundColor: themeColors.background,
                borderColor: themeColors.border,
                transform: "translate(-50%, -50%)",
              }}
            >
              <LuChevronsLeftRight />
            </div>
          </div>

          {/* RIGHT */}
          <div
            className="border flex flex-col rounded-2xl overflow-hidden h-full"
            style={{ width: `${100 - leftWidth}%`, borderColor: themeColors.border, backgroundColor: themeColors.background }}
          >
            {loadingCurrentWriting ? (
              <div className="flex items-center justify-center h-full">
                <div style={{ color: themeColors.text, fontSize: `${fontSizeValue.base}px` }}>
                  Loading writing...
                </div>
              </div>
            ) : errorCurrentWriting ? (
              <div className="flex items-center justify-center h-full p-6">
                <div 
                  className="max-w-xl w-full py-8 px-4 border rounded-xl shadow-sm text-center"
                  style={{
                    borderColor: themeColors.border,
                    backgroundColor: theme === 'light' ? '#fff5f5' : 'rgba(255,0,0,0.05)'
                  }}
                >
                  <p className="text-sm font-semibold text-red-500 mb-2">
                    ⚠️ Writing loading error
                  </p>
                  <p className="text-base mb-4 break-words" style={{ color: themeColors.text, opacity: 0.7 }}>
                    {typeof errorCurrentWriting === 'string' ? errorCurrentWriting : 'Unknown error'}
                  </p>
                </div>
              </div>
            ) : !currentWriting ? (
              <div className="flex items-center justify-center h-full">
                <div style={{ color: themeColors.text, fontSize: `${fontSizeValue.base}px` }}>
                  {loadingCurrentWriting ? 'Loading writing...' : 'No writing data available'}
                </div>
              </div>
            ) : !currentWriting.writing_tasks || currentWriting.writing_tasks.length === 0 ? (
              <div className="flex items-center justify-center h-full p-6">
                <div 
                  className="max-w-xl w-full py-8 px-4 border rounded-xl shadow-sm text-center"
                  style={{
                    borderColor: themeColors.border,
                    backgroundColor: theme === 'light' ? '#fff5f5' : 'rgba(255,0,0,0.05)'
                  }}
                >
                  <p className="text-sm font-semibold text-red-500 mb-2">
                    ⚠️ No tasks found
                  </p>
                  <p className="text-base mb-4 break-words" style={{ color: themeColors.text, opacity: 0.7 }}>
                    This writing doesn't have any tasks. Please contact support if this is unexpected.
                  </p>
                  <p className="text-xs" style={{ color: themeColors.text, opacity: 0.5 }}>
                    Writing ID: {currentWriting.id}
                  </p>
                </div>
              </div>
            ) : !taskToDisplay ? (
              <div className="flex items-center justify-center h-full">
                <div style={{ color: themeColors.text, fontSize: `${fontSizeValue.base}px` }}>
                  Task not found
                </div>
              </div>
            ) : (
              <>
                {isPracticeMode ? (
                  // Practice mode: show textarea for user input
                  <>
                    <textarea
                      spellCheck="false"
                      className="flex-1 p-8 resize-none outline-none"
                      placeholder="Write your answer here..."
                      value={answers[effectiveTaskType] || ""}
                      onChange={handleTextChange}
                      disabled={isPaused || status === 'reviewing'}
                      style={{
                        fontSize: `${fontSizeValue.base}px`,
                        backgroundColor: themeColors.background,
                        color: themeColors.text,
                      }}
                    />

                  </>
                ) : status === 'reviewing' ? (
                  // Review mode: show user's saved answer from user_answers table
                  <div className="flex-1 p-8 overflow-y-auto">
                    {isLoadingReview ? (
                      <div className="flex items-center justify-center h-full">
                        <div 
                          style={{ 
                            color: themeColors.text,
                            fontSize: `${fontSizeValue.base}px`
                          }}
                        >
                          Loading your answer...
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          fontSize: `${fontSizeValue.base}px`,
                          color: themeColors.text,
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {answers[effectiveTaskType] ? answers[effectiveTaskType] : "No answer submitted for this task."}
                      </div>
                    )}
                  </div>
                ) : (
                  // Preview mode: show sample
                  <div className="flex-1 p-8 overflow-y-auto">
                    <div
                      style={{
                        fontSize: `${fontSizeValue.base}px`,
                        color: themeColors.text,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {taskToDisplay.sample || "Sample answer will appear here..."}
                    </div>
                  </div>
                )}
                <div 
                  className="px-6 py-4 border-t flex justify-between text-sm font-semibold"
                  style={{ 
                    borderColor: themeColors.border,
                    color: themeColors.text,
                    fontSize: `${fontSizeValue.base}px`
                  }}
                >
                  <span>WORD COUNT: {
                    isPracticeMode
                      ? countWords(answers[effectiveTaskType] || "")
                      : status === 'reviewing'
                        ? countWords(answers[effectiveTaskType] || "")
                        : countWords(taskToDisplay?.sample || "")
                  }</span>
                  <span style={{ color: '#ef4444' }}>
                    MINIMUM: {effectiveTaskType === "Task 1" ? 150 : 250} WORDS
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* WRITING FOOTER */}
      <footer
        className="relative h-14 border-t flex items-center shrink-0"
        style={{
          borderColor: themeColors.border,
          backgroundColor: themeColors.background,
        }}
      >
        {/* TASK SWITCHER */}
        <div className="flex justify-center items-center w-full h-full">
          {displayWriting?.writing_tasks && displayWriting.writing_tasks.length > 1 ? (
            displayWriting.writing_tasks.map((task) => {
              const isActive = effectiveTaskType === task.task_name;
              
              // Theme-aware active background color
              const getActiveBackground = () => {
                if (theme === 'light') return '#e5e7eb'; // gray-200
                if (theme === 'dark') return 'rgba(255,255,255,0.15)';
                return 'rgba(255, 215, 0, 0.15)'; // yellow overlay for high-contrast
              };

              return (
                <div
                  key={task.id}
                  onClick={() => setCurrentTaskType(task.task_name)}
                  className={`relative flex flex-col items-center justify-center gap-1 h-full transition-all transform w-full cursor-pointer`}
                  style={{
                    backgroundColor: isActive ? getActiveBackground() : themeColors.background,
                    color: themeColors.text,
                  }}
                >
                  <span
                    className="text-base font-semibold transition-all whitespace-nowrap"
                    style={{
                      opacity: isActive ? 1 : 0.5,
                      color: themeColors.text,
                      fontSize: `${fontSizeValue.base}px`
                    }}
                  >
                    {task.task_name}
                  </span>
                </div>
              );
            })
          ) : (
            <div
              className="px-4 py-2 text-xs font-bold uppercase tracking-widest"
              style={{ 
                color: themeColors.text, 
                opacity: 0.5,
                fontSize: `${fontSizeValue.base * 0.75}px`
              }}
            >
              {effectiveTaskType}
            </div>
          )}
        </div>

        {/* FINISH BUTTON - Only show in practice mode and not in review */}
        {isPracticeMode && status === 'taking' && !isAutoSubmitting && (
          <div className="flex justify-end ml-auto fixed right-5 bottom-1">
            <button
              onClick={handleFinish}
              disabled={savingAttempt || isSaving || isAutoSubmitting}
              className="bg-black p-2 text-white rounded-lg font-bold hover:bg-black/80 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Finish Writing
            </button>
          </div>
        )}

        {/* RETAKE BUTTON - Show in review mode */}
        {status === 'reviewing' && (
          <div className="flex justify-end ml-auto fixed right-5 bottom-1">
            <button
              onClick={handleRetakeTask}
              className="bg-blue-600 p-2 text-white rounded-lg font-bold hover:bg-blue-700 transition-all shadow-lg"
            >
              Retake Task
            </button>
          </div>
        )}
      </footer>

      {/* LOADING OVERLAY - Exclude auto-submit */}
      {(savingAttempt || isSaving) && !isAutoSubmitting && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="rounded-2xl p-12 flex flex-col items-center gap-6 shadow-2xl"
            style={{
              minWidth: '420px',
              maxWidth: '520px',
              backgroundColor: themeColors.background,
              border: `2px solid ${themeColors.border}`,
            }}
          >
            <div className="relative">
              <div
                className="animate-spin rounded-full h-24 w-24 border-4"
                style={{
                  borderColor: `${themeColors.border}40`,
                  borderTopColor: '#3b82f6',
                }}
              ></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <div className="text-center space-y-3">
              <h3
                className="text-2xl font-bold"
                style={{ color: themeColors.text }}
              >
                Saving Your Writing
              </h3>
              <p
                className="text-lg font-medium"
                style={{ color: themeColors.text, opacity: 0.8 }}
              >
                Please wait while we save your work...
              </p>
              <div className="space-y-2 mt-4">
                <p
                  className="text-sm font-semibold text-red-500"
                  style={{ color: '#ef4444' }}
                >
                  ⚠️ Do not close or refresh this page!
                </p>
                <p
                  className="text-sm"
                  style={{ color: themeColors.text, opacity: 0.7 }}
                >
                  Your writing is being securely saved to the database.
                </p>
                <p
                  className="text-sm"
                  style={{ color: themeColors.text, opacity: 0.7 }}
                >
                  You'll see your results in just a moment!
                </p>
              </div>
            </div>
            <div
              className="w-full rounded-full h-2.5 overflow-hidden mt-2"
              style={{ backgroundColor: `${themeColors.border}40` }}
            >
              <div
                className="h-2.5 rounded-full animate-pulse"
                style={{
                  width: '100%',
                  backgroundColor: '#3b82f6',
                }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* FINISH MODAL */}
      <WritingFinishModal
        isOpen={isFinishModalOpen}
        onClose={() => setIsFinishModalOpen(false)}
        onConfirm={handleSubmitFinish}
        loading={savingAttempt || isSaving}
        isMockTest={isMockTest}
      />

      {/* SUCCESS MODAL */}
      <WritingSuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        onDownloadPDF={handleDownloadPDF}
        pdfLoading={isPdfLoading}
        writingId={id}
        onGoToHistory={() => navigate("/writing/writing-history")}
      />

      <NoteSidebar />
    </div>
  );
};

/* ================= PROVIDER ================= */
const WritingPracticePage = () => (
  <AppearanceProvider>
    <AnnotationProvider>
      <WritingPracticePageContent />
    </AnnotationProvider>
  </AppearanceProvider>
);

export default WritingPracticePage;
