import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { LuChevronsLeftRight } from "react-icons/lu";
import { FaPlay, FaPause, FaVolumeUp, FaVolumeMute, FaArrowLeft } from "react-icons/fa";
import { useTestStore } from "@/store/testStore";
import QuestionRenderer from "@/components/questions/QuestionRenderer";
import PrecticeFooter from "@/components/questions/PrecticeFooter";
import { saveListeningPracticeData, loadListeningPracticeData, clearListeningPracticeData } from "@/store/LocalStorage/listeningStorage";
import { submitTestAttempt, fetchLatestAttempt } from "@/lib/testAttempts";
import { useAuthStore } from "@/store/authStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@radix-ui/react-switch";
import { Label } from "@/components/ui/label";
import QuestionHeader from "@/components/questions/QuestionHeader";
import FinishModal from "@/components/modal/FinishModal";
import { convertDurationToSeconds } from "@/utils/testDuration";
import AudioPlayer from "@/components/AudioPlayer";

// Audio Player Component


const ListeningPracticePage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentTest, fetchTestById, loading } = useTestStore();
  const { authUser } = useAuthStore();
  // Status: 'taking', 'completed', 'reviewing'
  const [status, setStatus] = useState('taking');
  const [currentPart, setCurrentPart] = useState(1);
  const [timeRemaining, setTimeRemaining] = useState(null); // Will be set from test duration
  const [isStarted, setIsStarted] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showInitialModal, setShowInitialModal] = useState(true);
  const [startTime, setStartTime] = useState(null);

  const [answers, setAnswers] = useState({});
  const [reviewData, setReviewData] = useState({});
  const [latestAttemptId, setLatestAttemptId] = useState(null);
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(true);
  const [bookmarks, setBookmarks] = useState(new Set()); // Store bookmarked question IDs/numbers

  // Audio player state
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [volume, setVolume] = useState(1.0);

  const questionRefs = useRef({});
  const questionsContainerRef = useRef(null);
  const [activeQuestion, setActiveQuestion] = useState(null);

  const [leftWidth, setLeftWidth] = useState(50);
  const containerRef = useRef(null);
  const isResizing = useRef(false);

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

  useEffect(() => {
    if (id) {
      fetchTestById(id);
      
      // Load saved data from localStorage
      const savedData = loadListeningPracticeData(id);
      if (savedData) {
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
          setTimeRemaining(remainingTime);
        } else if (savedData.timeRemaining !== undefined) {
          setTimeRemaining(savedData.timeRemaining);
        }
      }
    }
  }, [id, fetchTestById]);

  // Initialize timeRemaining from test duration when currentTest loads
  useEffect(() => {
    if (currentTest && timeRemaining === null && !isStarted && !hasInteracted) {
      const durationInSeconds = convertDurationToSeconds(currentTest.duration);
      setTimeRemaining(durationInSeconds);
    } else if (currentTest && timeRemaining !== null && !isStarted && !hasInteracted) {
      // If timeRemaining was set from localStorage but we don't have a saved startTime,
      // update it to use the test duration to ensure consistency
      const savedData = loadListeningPracticeData(id);
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
    if (timeRemaining === 0 && (isStarted || hasInteracted) && status === 'taking' && authUser && id && currentTest) {
      // Auto-submit the test when timer reaches zero
      const autoSubmit = async () => {
        const result = await handleSubmitTest();
        if (result.success) {
          // Navigate to result page
          navigate(`/listening-result/${id}`);
        } else {
          console.error('Auto-submit failed:', result.error);
          // Still navigate to result page even if submission failed
          navigate(`/listening-result/${id}`);
        }
      };
      autoSubmit();
    }
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
          clearListeningPracticeData(id);
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
    
    setAnswers({});
    setReviewData({});
    setStatus('taking');
    // Reset timeRemaining to test duration (will be set by useEffect when currentTest is available)
    setTimeRemaining(currentTest ? convertDurationToSeconds(currentTest.duration) : 60 * 60);
    setIsStarted(false);
    setHasInteracted(false);
    setStartTime(null);
    setCurrentPart(1);
    setLatestAttemptId(null);
    setShowInitialModal(true);
    setPlaybackRate(1.0);
    setVolume(1.0);
    
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
    const mode = searchParams.get('mode');
    if (mode === 'review' && authUser && id && currentTest) {
      handleReviewTest();
    } else if (mode === 'retake' && authUser && id) {
      handleRetakeTest();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, authUser, id, currentTest]);

  // Update QuestionHeader to support listening navigation
  const handleBackClick = () => {
    handleBack();
  };

  return (
    <div className="flex flex-col h-screen bg-background-light dark:bg-background-dark">
      {/* Initial Modal - only show on first visit, not in review/retake mode */}
      <Dialog open={showInitialModal && !hasInteracted && status === 'taking'} onOpenChange={() => {}}>
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
      />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden p-3" ref={containerRef}>
        {/* Left Panel - Transcript (only in review mode) */}
        {status === 'reviewing' && currentPartData ? (
          <div
            className="border rounded-2xl border-gray-300 bg-white overflow-y-auto"
            style={{ width: `${leftWidth}%` }}
          >
            <div className="bg-gray-100 border-b border-gray-200 px-6 py-3">
              <h2 className="text-lg font-semibold text-gray-800">
                Part {currentPart}: Transcript
              </h2>
            </div>
            <div className="p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                {currentPartData?.title || `Part ${currentPart}`}
              </h2>
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
          <div className="border rounded-2xl border-gray-300 bg-gray-50"  />
        )}

        {/* Resizer - only show in review mode when left panel is visible */}
        {status === 'reviewing' && (
          <div className="px-4">
            <div
              onMouseDown={startResize}
              className="w-0.5 cursor-col-resize bg-gray-600 h-full flex justify-center items-center relative"
              title="Drag to resize"
            >
              <div className="w-6 h-6 rounded-2xl bg-white flex items-center justify-center absolute border-2">
                <LuChevronsLeftRight />
              </div>
            </div>
          </div>
        )}

        {/* Right Panel - Audio Player + Questions */}
        {questionGroups && questionGroups.length > 0 ? (
          <div
            ref={questionsContainerRef}
            className="space-y-8 overflow-y-auto border rounded-2xl border-gray-300 bg-white dark:bg-gray-800"
            style={{ width: status === 'reviewing' ? `${100 - leftWidth}%` : '100%' }}
          >
            {/* Sticky Audio Player - only in review mode */}
            {audioUrl && status === 'reviewing' && (
              <AudioPlayer
                audioUrl={audioUrl}
                isTestMode={false}
                playbackRate={playbackRate}
                onPlaybackRateChange={setPlaybackRate}
                volume={volume}
                onVolumeChange={setVolume}
              />
            )}

            {/* Questions */}
            <div className="p-6 space-y-8">
              {questionGroups.map((questionGroup, groupIdx) => {
                const questionRange = getQuestionRange(questionGroup);
                const groupQuestions = questionGroup.questions || [];
                const groupType = (questionGroup.type || '').toLowerCase();
                const isFillInTheBlanks = groupType === 'fill_in_blanks';
                const isDragAndDrop = groupType.includes('drag') || groupType.includes('drop') || groupType.includes('summary_completion');
                const isTable = groupType.includes('table');
                
                return (
                  <div key={questionGroup.id || groupIdx} className={`space-y-6 ${status === 'reviewing' ? 'w-full' : 'w-6/12'}`}>
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
                              
                              <p className="font-medium text-gray-900 mb-3 w-11/12">
                                {questionNumber}. {questionText}
                              </p>

                              <div onClick={handleInputInteraction} onFocus={handleInputInteraction}>
                                <QuestionRenderer
                                  question={{
                                    ...question,
                                    type: questionGroup.type,
                                    instruction: questionGroup.instruction,
                                    options: (groupType.includes('drag') || groupType.includes('summary') || groupType.includes('table'))
                                      ? (questionGroup.options || [])
                                      : (question.options || questionGroup.options || [])
                                  }}
                                  groupQuestions={
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
            className="space-y-8 overflow-y-auto p-6 border rounded-2xl border-gray-300 bg-white dark:bg-gray-800 flex items-center justify-center"
            style={{ width: status === 'reviewing' ? `${100 - leftWidth}%` : '100%' }}
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
        resultLink={`/listening-result/${id}`}
        getAllQuestions={getAllQuestions}
        bookmarks={bookmarks}
      />

      {/* Finish Modal */}
      <FinishModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        link={`/listening-result/${id}`}
        testId={id}
        onSubmit={handleSubmitTest}
      />
    </div>
  );
};

export default ListeningPracticePage;
