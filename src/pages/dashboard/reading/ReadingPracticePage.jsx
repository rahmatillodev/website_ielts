import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { LuChevronsLeftRight } from "react-icons/lu";
import { useTestStore } from "@/store/testStore";
import QuestionRenderer from "@/components/questions/QuestionRenderer";
import PrecticeFooter from "@/components/questions/PrecticeFooter";
import QuestionHeader from "@/components/questions/QuestionHeader";
import { saveReadingPracticeData, loadReadingPracticeData, clearReadingPracticeData } from "@/store/LocalStorage/readingStorage";
import { submitTestAttempt, fetchLatestAttempt } from "@/lib/testAttempts";
import { useAuthStore } from "@/store/authStore";
import FinishModal from "@/components/modal/FinishModal";
import { convertDurationToSeconds } from "@/utils/testDuration";




const ReadingPracticePage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { currentTest, fetchTestById, loading, error } = useTestStore();
  const { authUser } = useAuthStore();
  
  // Status: 'taking', 'completed', 'reviewing'
  const [status, setStatus] = useState('taking');
  const [currentPart, setCurrentPart] = useState(1); // Now represents part_number
  const [currentPage, setCurrentPage] = useState(1);
  const [timeRemaining, setTimeRemaining] = useState(null); // Will be set from test duration
  const [isStarted, setIsStarted] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false); // Track if user has interacted
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [startTime, setStartTime] = useState(null); // Track when test started for elapsed time

  const [answers, setAnswers] = useState({});
  const [reviewData, setReviewData] = useState({}); // Stores review data: { [questionId]: { userAnswer, isCorrect, correctAnswer } }
  const [latestAttemptId, setLatestAttemptId] = useState(null);
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(true); // Toggle for showing correct answers in review mode
  const [bookmarks, setBookmarks] = useState(new Set()); // Store bookmarked question IDs/numbers

  const questionRefs = useRef({});
  const questionsContainerRef = useRef(null);
  const [activeQuestion, setActiveQuestion] = useState(null);

  const [leftWidth, setLeftWidth] = useState(50);
  const containerRef = useRef(null);
  const isResizing = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      fetchTestById(id);
      
      // Load saved data from localStorage
      const savedData = loadReadingPracticeData(id);
      if (savedData) {
        if (savedData.answers && Object.keys(savedData.answers).length > 0) {
          setAnswers(savedData.answers);
          setHasInteracted(true); // User has interacted if there are saved answers
        }
        if (savedData.bookmarks && Array.isArray(savedData.bookmarks)) {
          setBookmarks(new Set(savedData.bookmarks));
        }
        if (savedData.startTime) {
          const savedStartTime = savedData.startTime;
          setStartTime(savedStartTime);
          setIsStarted(true);
          
          // Calculate elapsed time since start
          const elapsedSeconds = Math.floor((Date.now() - savedStartTime) / 1000);
          
          // Use saved timeRemaining if available, otherwise calculate from test duration
          let initialTime = savedData.timeRemaining;
          if (initialTime === undefined || initialTime === null) {
            // Will be set when currentTest loads
            initialTime = 60 * 60; // Fallback to 1 hour
          }
          const remainingTime = Math.max(0, initialTime - elapsedSeconds);
          setTimeRemaining(remainingTime);
        } else if (savedData.timeRemaining !== undefined) {
          // Fallback: use saved timeRemaining if startTime is not available
          setTimeRemaining(savedData.timeRemaining);
        }
      }
    }
    
    // Cleanup: Clear localStorage when component unmounts if user navigates away
    return () => {
      // Only clear if modal is not open (user didn't finish properly)
      // This will be handled by explicit clear calls on back/finish buttons
    };
  }, [id, fetchTestById]);

  // Initialize timeRemaining from test duration when currentTest loads
  useEffect(() => {
    if (currentTest && timeRemaining === null && !isStarted && !hasInteracted) {
      const durationInSeconds = convertDurationToSeconds(currentTest.duration);
      setTimeRemaining(durationInSeconds);
    } else if (currentTest && timeRemaining !== null && !isStarted && !hasInteracted) {
      // If timeRemaining was set from localStorage but we don't have a saved startTime,
      // update it to use the test duration to ensure consistency
      const savedData = loadReadingPracticeData(id);
      if (!savedData?.startTime) {
        const durationInSeconds = convertDurationToSeconds(currentTest.duration);
        setTimeRemaining(durationInSeconds);
      }
    }
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
  // Supports both questions.id (for Fill-in-the-Blanks) and question_number (for other types)
  const getPartAnsweredCount = (partQuestions) => {
    if (!partQuestions) return 0;
    return partQuestions.filter(q => {
      // Match the logic used in question components: question_number || id
      const answerKey = q.question_number || q.id;
      return answerKey && answers[answerKey] && answers[answerKey].toString().trim() !== '';
    }).length;
  };

  // Get all questions across all parts, sorted by question_number
  const getAllQuestions = React.useCallback(() => {
    if (!currentTest?.parts) return [];
    
    const allQuestions = [];
    const sortedParts = getSortedParts();
    
    sortedParts.forEach(part => {
      // Get questions from part.questions
      if (part.questions && Array.isArray(part.questions)) {
        part.questions.forEach(q => {
          if (q.question_number != null) {
            allQuestions.push({
              questionNumber: q.question_number,
              partNumber: part.part_number ?? part.id,
              question: q
            });
          }
        });
      }
      
      // Also get questions from questionGroups
      if (part.questionGroups && Array.isArray(part.questionGroups)) {
        part.questionGroups.forEach(group => {
          if (group.questions && Array.isArray(group.questions)) {
            group.questions.forEach(q => {
              if (q.question_number != null) {
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


  // Smart Timer effect - starts when isStarted OR hasInteracted is true
  useEffect(() => {
    if (!isStarted && !hasInteracted) return;
    if (timeRemaining === null) return; // Wait for timeRemaining to be initialized

    // Set start time if not already set
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
    if (timeRemaining === 0 && (isStarted || hasInteracted) && status === 'taking' && authUser && id && currentTest) {
      // Auto-submit the test when timer reaches zero
      const autoSubmit = async () => {
        const result = await handleSubmitTest();
        if (result.success) {
          // Navigate to result page
          navigate(`/reading-result/${id}`);
        } else {
          console.error('Auto-submit failed:', result.error);
          // Still navigate to result page even if submission failed
          navigate(`/reading-result/${id}`);
        }
      };
      autoSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRemaining, status]);

  // Save answers to localStorage immediately when they change
  useEffect(() => {
    if (id && hasInteracted) {
      // Calculate elapsed time if startTime exists
      const elapsedTime = startTime 
        ? Math.floor((Date.now() - startTime) / 1000)
        : 0;
      
      saveReadingPracticeData(id, {
        answers,
        timeRemaining,
        elapsedTime,
        startTime: startTime || (hasInteracted ? Date.now() : null),
        bookmarks,
      });
    }
  }, [answers, id, hasInteracted, timeRemaining, startTime, bookmarks]);

  // Save time remaining and elapsed time to localStorage periodically (every 5 seconds)
  useEffect(() => {
    if (!id || (!isStarted && !hasInteracted)) return;

    const interval = setInterval(() => {
      if (hasInteracted) {
        // Calculate elapsed time if startTime exists
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
    }, 5000); // Save every 5 seconds

    return () => clearInterval(interval);
  }, [id, timeRemaining, answers, hasInteracted, isStarted, startTime, bookmarks]);

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
    
    // Support both questions.id (for Fill-in-the-Blanks) and question_number (for other types)
    setAnswers((prev) => ({
      ...prev,
      [questionIdOrNumber]: answer,
    }));
  };

  // Toggle bookmark for a question
  const toggleBookmark = (questionIdOrNumber) => {
    console.log('toggleBookmark', questionIdOrNumber);
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
    setStartTime(now);
    
    // Save initial state when starting
    if (id) {
      saveReadingPracticeData(id, {
        answers,
        timeRemaining,
        elapsedTime: 0,
        startTime: now,
        bookmarks,
      });
    }
  };

  // Handler for clearing localStorage when back button is clicked
  const handleBack = () => {
    if (id) {
      clearReadingPracticeData(id);
    }
  };

  // Handler for submitting test
  const handleSubmitTest = async () => {
    if (!authUser || !id || !currentTest) {
      return { success: false, error: 'Missing required information' };
    }

    try {
      // Calculate time taken from startTime
      let timeTaken = 0;
      if (startTime) {
        timeTaken = Math.floor((Date.now() - startTime) / 1000);
      }
      
      // Submit even if answers object is empty - submitTestAttempt handles this
      const result = await submitTestAttempt(id, answers, currentTest, timeTaken);
      
      if (result.success) {
        setLatestAttemptId(result.attemptId);
        setStatus('completed');
        // Clear practice data after successful submission
        if (id) {
          clearReadingPracticeData(id);
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
    }
  };

  // Handler for reviewing test
  const handleReviewTest = async () => {
    if (!authUser || !id) return;

    try {
      const result = await fetchLatestAttempt(authUser.id, id);
      
      if (result.success && result.attempt && result.answers) {
        // Convert answers to review data format
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
        setShowCorrectAnswers(true); // Default to showing correct answers
        
        // Also set answers for display
        const answersObj = {};
        Object.keys(reviewDataObj).forEach((questionId) => {
          answersObj[questionId] = reviewDataObj[questionId].userAnswer;
        });
        setAnswers(answersObj);
      } else {
        console.error('Failed to fetch attempt:', result.error);
        alert('Failed to load review data. Please try again.');
        // If there's an error, turn off "Show Correct Answers"
        setShowCorrectAnswers(false);
      }
    } catch (error) {
      console.error('Error fetching attempt:', error);
      alert('An error occurred while loading review data.');
      // If there's an error, turn off "Show Correct Answers"
      setShowCorrectAnswers(false);
    }
  };

  // Handler for retaking test
  const handleRetakeTest = () => {
    if (!id) return;
    
    // Reset all state
    setAnswers({});
    setReviewData({});
    setStatus('taking');
    // Reset timeRemaining to test duration (will be set by useEffect when currentTest is available)
    setTimeRemaining(currentTest ? convertDurationToSeconds(currentTest.duration) : 60 * 60);
    setIsStarted(false);
    setHasInteracted(false);
    setStartTime(null);
    setCurrentPart(1);
    setCurrentPage(1);
    setLatestAttemptId(null);
    
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
      setHasInteracted(true);
    }
  };

  // Reset to page 1 when part changes
  React.useEffect(() => {
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
    const mode = searchParams.get('mode');
    if (mode === 'review' && authUser && id && currentTest) {
      handleReviewTest();
    } else if (mode === 'retake' && authUser && id) {
      handleRetakeTest();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, authUser, id, currentTest]);

  return (
    <div className="flex flex-col h-screen bg-background-light dark:bg-background-dark">
      {/* Header */}
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
      />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden p-3" ref={containerRef}>
        {/* Left Panel - Reading Passage */}
        {loading ? (
          <div className="w-1/2 border rounded-2xl border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto flex items-center justify-center" style={{ width: `${leftWidth}%` }}>
            <div className="text-gray-500">Loading...</div>
          </div>
        ) : error ? (
          <div className="w-1/2 border rounded-2xl border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto flex items-center justify-center" style={{ width: `${leftWidth}%` }}>
            <div className="text-red-500">Error: {error}</div>
          </div>
        ) : currentPartData ? (
          <div
            key={`passage-${currentPart}`}
            className="w-1/2 border rounded-2xl border-gray-300 bg-white overflow-y-auto transition-opacity duration-300 ease-in-out"
            style={{ width: `${leftWidth}%` }}
          >
            {/* Grey Sub-Header Bar */}
            <div className="bg-gray-100 border-b border-gray-200 px-6 py-3">
              <h2 className="text-lg font-semibold text-gray-800">
                Part {currentPart}: Read the text and answer questions {getPartQuestionRange()}.
              </h2>
            </div>
            
            <div className="p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                {currentPartData?.title || `Part ${currentPart}`}
              </h2>
              
              {/* Display part image if available with click to expand */}
              {currentPartData?.image_url && (
                <div className="mb-6 relative">
                  <img 
                    src={currentPartData.image_url} 
                    alt={currentPartData.title || `Part ${currentPart} image`}
                    className="w-full max-w-full object-contain max-h-[500px] rounded-lg border border-gray-300 dark:border-gray-700"
                     
                  />
                 
                </div>
              )}
              
              <div className="prose prose-sm max-w-none">
                <div className="text-gray-900 leading-relaxed whitespace-pre-line space-y-4">
                  {currentPartData?.content ? (
                    currentPartData.content.split('\n').map((paragraph, idx) => 
                      paragraph.trim() ? (
                        <p key={idx} className="mb-4">{paragraph}</p>
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
            className="w-0.5 cursor-col-resize bg-gray-600 dark:bg-gray-600 h-full flex justify-center items-center relative"
            title="Drag to resize"
          >
            <div className="w-6 h-6 rounded-2xl bg-white flex items-center justify-center absolute border-2">
              <LuChevronsLeftRight />
            </div>
          </div>
        </div>

        {/* Right Panel - Questions */}
        {questionGroups && questionGroups.length > 0 ? (
          <div
            ref={questionsContainerRef}
            className="w-1/2 space-y-8 overflow-y-auto p-6 border rounded-2xl border-gray-300 bg-white dark:bg-gray-800"
            style={{ width: `${100 - leftWidth}%` }}
          >
            {questionGroups.map((questionGroup, groupIdx) => {
              const questionRange = getQuestionRange(questionGroup);
              const groupQuestions = questionGroup.questions || [];
              const groupType = (questionGroup.type || '').toLowerCase();
              const isFillInTheBlanks = groupType === 'fill_in_blanks';
              const isDragAndDrop = groupType.includes('drag') || groupType.includes('drop') || groupType.includes('summary_completion');
              const isTable = groupType.includes('table');
              
              return (
                <div key={questionGroup.id || groupIdx} className="space-y-6">
                  {/* Group Header with Instruction and Range */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Questions {questionRange}
                    </h3>
                    {questionGroup.instruction && (
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {questionGroup.instruction}
                      </p>
                    )}
                  </div>
                
                  {/* For Fill-in-the-Blanks, Drag-and-Drop, and Table: Render as a single group with group-level options */}
                  {(isFillInTheBlanks || isDragAndDrop || isTable) ? (
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
                      className="p-4 rounded-lg border transition-all
                          border-gray-200 dark:border-gray-700
                          dark:hover:bg-gray-800
                          dark:active:bg-gray-700
                          "
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
                              correctAnswer: '' // Hide correct answer when toggle is off
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
                          className="p-4 rounded-lg border transition-all
                              border-gray-200 dark:border-gray-700
                              dark:hover:bg-gray-800
                              dark:active:bg-gray-700
                              "
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
                          <p className="font-medium text-gray-900 mb-3 w-11/12">
                            {questionNumber}. {questionText}
                          </p>

                          <div onClick={handleInputInteraction} onFocus={handleInputInteraction}>
                            <QuestionRenderer
                              question={{
                                ...question,
                                type: questionGroup.type,
                                instruction: questionGroup.instruction,
                                // For drag-drop, summary, and table, use group-level options; otherwise use question-specific options
                                options: (groupType.includes('drag') || groupType.includes('summary') || groupType.includes('table'))
                                  ? (questionGroup.options || [])
                                  : (question.options || questionGroup.options || [])
                              }}
                              groupQuestions={
                                // Pass group questions for drag-drop, summary, and table
                                (groupType.includes('drag') ||
                                 groupType.includes('summary') ||
                                 groupType.includes('table'))
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
                                  correctAnswer: '' // Hide correct answer when toggle is off
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
        ) : (
          <div
            className="w-1/2 space-y-8 overflow-y-auto p-6 border rounded-2xl border-gray-300 bg-white dark:bg-gray-800 flex items-center justify-center"
            style={{ width: `${100 - leftWidth}%` }}
          >
            <div className="text-gray-500">
              {loading ? "Loading questions..." : "No questions available"}
            </div>
          </div>
        )}
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
        getAllQuestions={getAllQuestions}
        bookmarks={bookmarks}
      />

      {/* Finish Modal */}
      <FinishModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        link={`/reading-result/${id}`}
        testId={id}
        onSubmit={handleSubmitTest}
      />
    </div>
  );
};

export default ReadingPracticePage;
