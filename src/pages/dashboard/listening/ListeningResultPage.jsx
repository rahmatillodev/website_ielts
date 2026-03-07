import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { FaArrowLeft } from "react-icons/fa6";
import { IoPrint } from "react-icons/io5";
import { LuTimer } from "react-icons/lu";
import { FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import { Link, useParams, useNavigate } from "react-router-dom";
import { HiOutlineHome, HiOutlineRefresh } from "react-icons/hi";
import { useTestStore } from "@/store/testStore";
import { fetchAttemptById, fetchAttemptAnswers } from "@/lib/testAttempts";
import { useAuthStore } from "@/store/authStore";
import { generateTestResultsPDF } from "@/utils/pdfExport";
import ResultBanner from "@/components/badges/ResultBanner";
import { useSettingsStore } from "@/store/systemStore";
import { clearListeningPracticeData } from "@/store/LocalStorage/listeningStorage";
import { formatDateToDayMonth } from "@/store/analyticsStore";

const ListeningResultPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentTest, fetchTestById } = useTestStore();
  useAuthStore();
  const [resultData, setResultData] = useState(null);
  const [attemptData, setAttemptData] = useState(null);
  /** Test data fetched for this result page. Used for answer display so we don't depend on store timing. */
  const [pageTest, setPageTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const settings = useSettingsStore((state) => state.settings);
  // Use refs to track loaded state and prevent unnecessary re-fetches
  const lastLoadedIdRef = useRef(null);
  const isLoadingRef = useRef(false);
  const fetchTestByIdRef = useRef(fetchTestById);

  useEffect(() => {
    fetchTestByIdRef.current = fetchTestById;
  }, [fetchTestById]);

  // Load data only when id changes, not on re-renders or tab focus
  useEffect(() => {
    // Guard: Don't fetch if no id or already loading
    if (!id || isLoadingRef.current) {
      return;
    }

    // Guard: Don't fetch if same id already loaded (prevents re-fetch on tab focus/re-renders)
    if (lastLoadedIdRef.current === id) {
      // Data already loaded for this id, ensure loading state is false
      setLoading(false);
      return;
    }

    // Clear previous result data immediately so we never show stale results for a different test
    setResultData(null);
    setAttemptData(null);
    setPageTest(null);
    // Mark as loading and update last loaded id
    isLoadingRef.current = true;
    lastLoadedIdRef.current = id;
    setLoading(true);

    // id in URL is user_attempts.id (attempt ID)
    const loadData = async () => {
      try {
        const attemptId = id;
        const currentFetchTestById = fetchTestByIdRef.current;

        const attemptResponse = await fetchAttemptById(attemptId);
        if (!attemptResponse.success || !attemptResponse.attempt) {
          setResultData(null);
          setAttemptData(null);
          setPageTest(null);
          return;
        }
        const attempt = attemptResponse.attempt;
        const testId = attempt.test_id;

        const [testResult, answersResult] = await Promise.all([
          currentFetchTestById(testId, false, true),
          fetchAttemptAnswers(attemptId),
        ]);

        if (!answersResult.success) {
          setResultData(null);
          setAttemptData(null);
          setPageTest(null);
          return;
        }

        const attemptResult = {
          success: true,
          attempt: {
            id: attempt.id,
            user_id: attempt.user_id,
            test_id: attempt.test_id,
            score: attempt.score,
            total_questions: attempt.total_questions,
            correct_answers: attempt.correct_answers,
            time_taken: attempt.time_taken,
            completed_at: attempt.completed_at,
            created_at: attempt.created_at,
          },
          answers: answersResult.answers || {},
        };

        if (attemptResult.success && attemptResult.attempt && attemptResult.answers) {
          setAttemptData(attemptResult.attempt);
          if (testResult) setPageTest(testResult);
          const testDataForMapping = testResult || currentTest;
          
          // Map question_id (questions.id) back to question_number for display
          // Build a mapping from questions.id to question_number from the test data
          const questionIdToNumberMap = {};
          if (testDataForMapping?.parts) {
            testDataForMapping.parts.forEach((part) => {
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
          
          // Convert answers to the format expected by the component
          // Use question_number as key for display (prefer stored question_number from user_answers)
          const answersObj = {};
          const reviewDataObj = {};
          Object.keys(attemptResult.answers).forEach((questionId) => {
            const answerItem = attemptResult.answers[questionId];
            const questionNumber = (answerItem.questionNumber ?? questionIdToNumberMap[questionId]) || questionId;
            answersObj[questionNumber] = answerItem.userAnswer;
            reviewDataObj[questionNumber] = answerItem;
          });
          
          setResultData({
            answers: answersObj,
            attempt: attemptResult.attempt,
            reviewData: reviewDataObj,
          });
        } else {
          setResultData(null);
          setAttemptData(null);
        }
      } catch (error) {
        console.error('Error loading result data:', error);
        setResultData(null);
        setAttemptData(null);
      } finally {
        setLoading(false);
        isLoadingRef.current = false;
      }
    };

    loadData();
  }, [id]); // Only depend on id, not on other values

  // Format time from seconds - ensure never negative
  const formatTime = useCallback((seconds) => {
    if (!seconds || seconds < 0) return "0m 0s";
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m ${secs}s`;
    }
    return `${mins}m ${secs}s`;
  }, []);



  // Calculate elapsed time - use time_taken from database if available, otherwise calculate from timestamps
  const elapsedTime = useMemo(() => {
    // Prefer time_taken from database (stored in seconds)
    if (attemptData?.time_taken !== null && attemptData?.time_taken !== undefined) {
      return Math.max(0, attemptData.time_taken);
    }
    // Fallback to calculating from timestamps
    if (attemptData?.created_at && attemptData?.completed_at) {
      const created = new Date(attemptData.created_at).getTime();
      const completed = new Date(attemptData.completed_at).getTime();
      const elapsed = Math.floor((completed - created) / 1000);
      return Math.max(0, elapsed); // Ensure never negative
    }
    return resultData?.elapsedTime || 0;
  }, [attemptData, resultData]);

  // Helper function to format multiple_answers answer (option_key -> "key. option_text")
  const formatMultipleAnswersAnswer = useCallback((optionKey, questionGroup) => {
    if (!optionKey || !questionGroup?.options) return optionKey || '';
    
    const key = optionKey.toString().trim().toUpperCase();
    const option = questionGroup.options.find(
      (opt) => (opt.option_key || opt.letter || '').toString().trim().toUpperCase() === key
    );
    
    if (option && option.option_text) {
      return `${key}. ${option.option_text}`;
    }
    return key;
  }, []);

  // Helper function to get correct answer from question/questionGroup structure
  const getCorrectAnswerFromTest = useCallback((question, questionGroup) => {
    if (!question || !questionGroup) return '';
    
    const groupType = (questionGroup.type || '').toLowerCase();
    const isMultipleChoice = groupType.includes('multiple_choice');
    const isMultipleAnswers = groupType === 'multiple_answers';
    
    // For multiple_choice: try to get from question.correct_answer or find correct option
    if (isMultipleChoice) {
      if (question.correct_answer) {
        const correctAnswerKey = question.correct_answer.toString().trim();
        if (question.options && question.options.length > 0) {
          const correctOption = question.options.find(
            (opt) => (opt.letter || opt.option_key || '').toLowerCase() === correctAnswerKey.toLowerCase() ||
                     opt.is_correct === true
          );
          if (correctOption) {
            return correctOption.option_text || correctAnswerKey;
          }
        }
        return correctAnswerKey;
      }
      if (question.options && question.options.length > 0) {
        const correctOption = question.options.find((opt) => opt.is_correct === true);
        if (correctOption) {
          return correctOption.option_text || '';
        }
      }
    }
    
    // For multiple_answers: get from question.correct_answer and format as "key. option_text"
    if (isMultipleAnswers) {
      if (question.correct_answer) {
        const correctAnswerKey = question.correct_answer.toString().trim().toUpperCase();
        return formatMultipleAnswersAnswer(correctAnswerKey, questionGroup);
      }
    }
    
    // For other types: try question.correct_answer first
    if (question.correct_answer) {
      const correctAnswer = question.correct_answer.toString().trim();
      // Try to convert option_key to option_text if options available
      if (questionGroup.options && questionGroup.options.length > 0) {
        const matchingOption = questionGroup.options.find(
          (opt) => (opt.option_key || opt.letter || '').toLowerCase() === correctAnswer.toLowerCase()
        );
        if (matchingOption) {
          return matchingOption.option_text || correctAnswer;
        }
      }
      return correctAnswer;
    }
    
    // Try to find correct option from question or group options
    if (question.options && question.options.length > 0) {
      const correctOption = question.options.find((opt) => opt.is_correct);
      if (correctOption) {
        return correctOption.option_text || correctOption.letter || correctOption.option_key || '';
      }
    }
    
    if (questionGroup.options && questionGroup.options.length > 0) {
      const correctOption = questionGroup.options.find(
        (opt) => opt.is_correct && opt.question_number === question.question_number
      );
      if (correctOption) {
        return correctOption.option_text || correctOption.letter || correctOption.option_key || '';
      }
    }
    
    return '';
  }, []);

  // Use page test (fetched with result) so display doesn't depend on store timing; fallback to currentTest
  const testForDisplay = pageTest || currentTest;

  // Get answer display data - memoized for performance
  // Include ALL questions from the test, not just answered ones
  const answerDisplayData = useMemo(() => {
    if (!testForDisplay) return [];

    const answers = resultData?.answers || {};
    const reviewData = resultData?.reviewData || {};
    const result = [];
    const processedQuestionNumbers = new Set(); // Track processed question numbers to avoid duplicates (as strings)

    // Build a map of all questions from the test
    const allQuestionsMap = new Map(); // question_number -> { question, questionId, questionGroup }
    
    if (testForDisplay?.parts) {
      testForDisplay.parts.forEach((part) => {
        if (part.questionGroups) {
          part.questionGroups.forEach((questionGroup) => {
            if (questionGroup.questions) {
              questionGroup.questions.forEach((question) => {
                if (question.question_number != null) {
                  // Normalize question_number to string for consistent key matching
                  const qNum = String(question.question_number);
                  allQuestionsMap.set(qNum, {
                    question,
                    questionId: question.id,
                    questionGroup,
                  });
                }
              });
            }
          });
        }
      });
    }

    // First, process review data to get individual question entries
    Object.entries(reviewData).forEach(([questionNum, review]) => {
      // Normalize question number to string for consistent comparison
      const normalizedQNum = String(questionNum);
      if (processedQuestionNumbers.has(normalizedQNum)) return;
      
      const userAnswer = (review.userAnswer || '').toString().trim();
      const correctAnswerText = (review.correctAnswer || '').toString().trim();
      
      // Get question data from test to access correct_answer (option_key)
      const questionData = allQuestionsMap.get(normalizedQNum);
      const question = questionData?.question;
      const questionGroup = questionData?.questionGroup;
      const isMultipleAnswers = questionGroup && (questionGroup.type || '').toLowerCase() === 'multiple_answers';
      
      // Check if answer contains commas (multiple answers like "D,B")
      if (userAnswer.includes(',') && isMultipleAnswers) {
        // This is a multiple_answers question - split the answer
        const answerParts = userAnswer.split(',').map(a => a.trim().toUpperCase()).filter(Boolean);
        
        // For multiple_answers, correctAnswerText from DB is now option_key (e.g., "B")
        // Convert it to display format: "B. option_text"
        const formattedCorrectAnswer = formatMultipleAnswersAnswer(correctAnswerText, questionGroup);
        
        // Get the question's correct answer option_key (e.g., "A", "B")
        const correctAnswerKey = question?.correct_answer?.toString().trim().toUpperCase() || '';
        
        if (correctAnswerKey) {
          // Check if the user selected this question's correct answer option_key
          const userSelectedThisAnswer = answerParts.includes(correctAnswerKey);
          
          // Format user's selected answer if they selected the correct one
          let formattedUserAnswer = '';
          if (userSelectedThisAnswer) {
            formattedUserAnswer = formatMultipleAnswersAnswer(correctAnswerKey, questionGroup);
          }
          
          processedQuestionNumbers.add(normalizedQNum);
          result.push({
            questionNumber: normalizedQNum,
            yourAnswer: formattedUserAnswer,
            isCorrect: review.isCorrect || false,
            correctAnswer: formattedCorrectAnswer,
          });
        } else {
          // No correct answer key found, process normally
          processedQuestionNumbers.add(normalizedQNum);
          result.push({
            questionNumber: normalizedQNum,
            yourAnswer: '',
            isCorrect: review.isCorrect || false,
            correctAnswer: formattedCorrectAnswer,
          });
        }
      } else {
        // Single answer - process normally (include even if empty)
        processedQuestionNumbers.add(normalizedQNum);
        result.push({
          questionNumber: normalizedQNum,
          yourAnswer: userAnswer || '',
          isCorrect: review.isCorrect || false,
          correctAnswer: correctAnswerText || '',
        });
      }
    });

    // Also process answers object for any entries not in review data
    // This handles cases where review data might not be available
    Object.entries(answers).forEach(([key, value]) => {
      // Normalize question number to string for consistent comparison
      const normalizedKey = String(key);
      if (processedQuestionNumbers.has(normalizedKey)) return;
      
      const answerStr = (value || '').toString().trim();
      const review = reviewData[key] || {};
      const correctAnswerText = (review.correctAnswer || '').toString().trim();
      
      // Get question data from test to access correct_answer (option_key)
      const questionData = allQuestionsMap.get(normalizedKey);
      const question = questionData?.question;
      const questionGroup = questionData?.questionGroup;
      const isMultipleAnswers = questionGroup && (questionGroup.type || '').toLowerCase() === 'multiple_answers';
      
      // Check if answer contains commas (multiple answers like "D,B")
      if (answerStr.includes(',') && isMultipleAnswers) {
        // Split comma-separated answers
        const answerParts = answerStr.split(',').map(a => a.trim().toUpperCase()).filter(Boolean);
        
        // For multiple_answers, correctAnswerText from DB is now option_key (e.g., "B")
        // Convert it to display format: "B. option_text"
        const formattedCorrectAnswer = formatMultipleAnswersAnswer(correctAnswerText, questionGroup);
        
        // Get the question's correct answer option_key (e.g., "A", "B")
        const correctAnswerKey = question?.correct_answer?.toString().trim().toUpperCase() || '';
        
        if (correctAnswerKey) {
          // Check if the user selected this question's correct answer option_key
          const userSelectedThisAnswer = answerParts.includes(correctAnswerKey);
          
          // Format user's selected answer if they selected the correct one
          let formattedUserAnswer = '';
          if (userSelectedThisAnswer) {
            formattedUserAnswer = formatMultipleAnswersAnswer(correctAnswerKey, questionGroup);
          }
          
          processedQuestionNumbers.add(normalizedKey);
          result.push({
            questionNumber: normalizedKey,
            yourAnswer: formattedUserAnswer,
            isCorrect: review.isCorrect || false,
            correctAnswer: formattedCorrectAnswer,
          });
        } else {
          // No correct answer key found, process normally
          processedQuestionNumbers.add(normalizedKey);
          result.push({
            questionNumber: normalizedKey,
            yourAnswer: '',
            isCorrect: review.isCorrect || false,
            correctAnswer: formattedCorrectAnswer,
          });
        }
      } else {
        // Single answer (include even if empty)
        processedQuestionNumbers.add(normalizedKey);
        result.push({
          questionNumber: normalizedKey,
          yourAnswer: answerStr || '',
          isCorrect: review.isCorrect || false,
          correctAnswer: correctAnswerText || '',
        });
      }
    });

    // Add all unanswered questions from the test
    allQuestionsMap.forEach(({ question, questionId, questionGroup }, questionNumber) => {
      // questionNumber is already a string from the Map key
      if (!processedQuestionNumbers.has(questionNumber)) {
        // Get correct answer for this question using helper function
        const correctAnswer = getCorrectAnswerFromTest(question, questionGroup);
        
        processedQuestionNumbers.add(questionNumber);
        result.push({
          questionNumber: questionNumber,
          yourAnswer: '', // Empty answer
          isCorrect: false,
          correctAnswer: correctAnswer,
        });
      }
    });

    return result.sort((a, b) => {
      // Sort by question number if numeric, otherwise by string
      const aNum = Number(a.questionNumber);
      const bNum = Number(b.questionNumber);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum;
      }
      return String(a.questionNumber).localeCompare(String(b.questionNumber));
    });
  }, [resultData, testForDisplay, getCorrectAnswerFromTest, formatMultipleAnswersAnswer]);

  // Memoized stats calculations
  const stats = useMemo(() => {
    // Use total_questions from attempt data if available, otherwise use answered count
    const totalQuestions = attemptData?.total_questions ?? answerDisplayData.length;
    const correctCount = answerDisplayData.filter(a => a.isCorrect).length;
    const timeTaken = formatTime(elapsedTime);
    const avgTime = totalQuestions > 0 ? formatTime(Math.floor(elapsedTime / totalQuestions)) : "0m 0s";
    const score = attemptData?.score?.toFixed(1) || "0.0";
    const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    return {
      totalQuestions,
      correctCount,
      timeTaken,
      avgTime,
      score,
      percentage,
    };
  }, [answerDisplayData, elapsedTime, attemptData, formatTime]);

  // PDF Export function
  const downloadPDF = useCallback(async () => {
    await generateTestResultsPDF({
      test: testForDisplay,
      stats,
      answerDisplayData,
      showCorrectAnswers,
      completedDate: formatDateToDayMonth(attemptData?.completed_at || resultData?.completedAt),
      testType: 'Listening',
      defaultTestTitle: 'Academic Listening Practice Test',
      settings
    });
  }, [testForDisplay, resultData, answerDisplayData, stats, showCorrectAnswers, attemptData, formatDateToDayMonth]);

  const handleRetake = useCallback(() => {
    if (!attemptData?.test_id) return;
    clearListeningPracticeData(attemptData.test_id);
    navigate(`/listening-practice/${attemptData.test_id}`);
  }, [attemptData?.test_id, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 p-8 font-sans flex items-center justify-center">
        <div className="text-gray-500">Loading results...</div>
      </div>
    );
  }

  const isDataForCurrentTest =
    resultData &&
    attemptData &&
    (String(attemptData.id) === String(id));

  if (!resultData || !testForDisplay || !isDataForCurrentTest) {
    return (
      <div className="min-h-screen bg-gray-50/50 p-8 font-sans flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-500 mb-4">No results found</div>
          <Link to="/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 sm:p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        {/* Back Link */}
        <Link
          to="/dashboard"
          className="flex max-w-max items-center gap-2 text-blue-500 font-semibold text-sm mb-6 cursor-pointer uppercase tracking-wider hover:text-blue-600 transition-colors"
        >
          <FaArrowLeft size={12} />
          <span>Back to Dashboard</span>
        </Link>

        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2">
              Exam Results
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-slate-500 font-medium text-xs sm:text-sm">
              <span>{testForDisplay?.title || "Academic Listening Practice Test"}</span>
              <span className="text-gray-400">•</span>
              <span>Completed on {formatDateToDayMonth(attemptData?.completed_at || resultData?.completedAt)}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="border-gray-200 text-gray-700 shadow-sm flex gap-2 h-9 px-4 sm:px-6"
              onClick={downloadPDF}
            >
              <IoPrint className="text-base" /> <span className="hidden sm:inline">Print</span>
            </Button>
          </div>
        </div>

        <hr className="border-gray-200 mb-10" />


        {/* Stats Cards - Redesigned */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-8">
          {/* Overall Score Card */}
          <div className="border-2 border-blue-200 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-lg">
            <div className="relative z-10">
              <h3 className="text-slate-600 font-semibold text-xs sm:text-sm uppercase tracking-widest mb-3">
                Overall Band Score
              </h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl sm:text-5xl font-black text-blue-600">
                  {stats.score}
                </span>
                <span className="text-gray-500 font-semibold text-lg">/ 9.0</span>
              </div>
              {/* Progress Bar */}
              <div className="w-full bg-blue-200 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${(parseFloat(stats.score) / 9.0) * 100}%` }}
                ></div>
              </div>
            </div>
            {/* Background Checkmark Icon */}
            <div className="absolute -right-4 -top-4 text-blue-200/30">
              <FaCheckCircle size={80} />
            </div>
          </div>

          {/* Correct Answers Card */}
          <div className="border-2 border-grey-200 rounded-2xl p-4 sm:p-5 shadow-lg">
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-slate-600 font-semibold text-xs sm:text-sm uppercase tracking-widest">
                Correct Answers
              </h3>
              <FaCheckCircle className="text-green-600 text-lg sm:text-xl" />
            </div>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-3xl sm:text-4xl font-black text-gray-800">
                {stats.correctCount}
              </span>
              <span className="text-gray-500 font-semibold text-lg">
                / {stats.totalQuestions}
              </span>
            </div>
            <div className="text-sm font-semibold text-gray-500">
              {stats.percentage}%
            </div>
          </div>

          {/* Time Taken Card */}
          <div className="border-2 border-grey-200 rounded-2xl p-4 sm:p-5 shadow-lg">
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-slate-600 font-semibold text-xs sm:text-sm uppercase tracking-widest">
                Time Taken
              </h3>
              <LuTimer className="text-purple-600 text-lg sm:text-xl" />
            </div>
            <div className="mb-2">
              <span className="text-3xl sm:text-4xl font-black text-gray-800">
                {stats.timeTaken}
              </span>
            </div>
            <div className="text-sm font-semibold text-gray-500">
              Avg. {stats.avgTime} per question
            </div>
          </div>
        </div>
        <ResultBanner score={stats.score} testType="Listening" />

        {/* Detailed Answer Review Section */}
        <div className="mt-12">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-2xl font-black text-gray-900">
              Detailed Answer Review
            </h2>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 w-full sm:w-auto">
              {/* Show Correct Answers Toggle */}
              <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
                <Switch
                  checked={showCorrectAnswers}
                  onCheckedChange={setShowCorrectAnswers}
                  id="show-correct-answers"
                />
                <label htmlFor="show-correct-answers" className="text-sm font-semibold text-gray-700 cursor-pointer">
                  Show Correct Answers
                </label>
              </div>
              <div className="flex gap-4 font-semibold text-sm">
                <span className="text-slate-500">
                  Correct{" "}
                  <span className="bg-green-100 text-green-600 px-2 py-0.5 rounded-full ml-1">
                    {stats.correctCount}
                  </span>
                </span>
                <span className="text-slate-500">
                  Questions{" "}
                  <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full ml-1">
                    {stats.totalQuestions}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Table - Responsive */}
          <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b">
                    <th className="text-left p-4 text-xs font-black text-slate-400 uppercase tracking-widest w-16">
                      #
                    </th>
                    <th className="text-left p-4 text-xs font-black text-slate-400 uppercase tracking-widest w-20">
                      Status
                    </th>
                    <th className="text-left p-4 text-xs font-black text-slate-400 uppercase tracking-widest">
                      Your Answer
                    </th>
                    {showCorrectAnswers && (
                      <th className="text-left p-4 text-xs font-black text-slate-400 uppercase tracking-widest">
                        Correct Answer
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y">
                {answerDisplayData.length > 0 ? (
                    answerDisplayData.map((answerItem) => (
                      <tr
                        key={answerItem.questionNumber}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="p-4 text-slate-400 font-semibold">
                          {answerItem.questionNumber}
                        </td>
                        <td className="p-4">
                          {answerItem.isCorrect ? (
                            <FaCheckCircle className="text-green-500 text-xl" />
                          ) : (
                            <FaTimesCircle className="text-red-500 text-xl" />
                          )}
                        </td>
                        <td className="p-4">
                          <span className={answerItem.isCorrect ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                            {answerItem.yourAnswer || "N/A"}
                          </span>
                        </td>
                        {showCorrectAnswers && (
                          <td className="p-4">

                            <span className="text-green-600 font-semibold">
                              {answerItem.correctAnswer}
                            </span>

                          </td>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={showCorrectAnswers ? 4 : 3} className="p-6 text-center text-gray-500">
                        No answers submitted
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="border-t border-gray-200 mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <Link to="/dashboard">
              <Button
                variant="ghost"
                className="text-slate-500 w-full sm:w-auto hover:text-black bg-blue-100 hover:bg-blue-200 font-semibold transition-all flex items-center gap-2 px-6 h-12 rounded-xl"
              >
                <HiOutlineHome className="text-xl" />
                Go Home
              </Button>
            </Link>

            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Link to={"/listening-practice/" + (attemptData?.test_id ?? '') + "?mode=review"} className="w-full sm:w-auto">
                <Button 
                  variant="outline"
                  className="border-blue-600 text-blue-600 w-full sm:w-auto hover:bg-blue-50 font-semibold px-8 h-12 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  Review Test
                </Button>
              </Link>
              <Button 
                className="bg-blue-600 w-full sm:w-auto hover:bg-blue-700 text-white font-semibold px-8 h-12 rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                onClick={handleRetake}
                disabled={isDeleting}
              >
                <HiOutlineRefresh className="text-xl" />
                {isDeleting ? 'Clearing...' : 'Retake Exam'}
              </Button>
            </div>
          </div>
        </div>

        <footer className="mt-12 py-8 text-center text-slate-400 text-sm">
          <p>© 2026 IELTSCORE. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
};

export default ListeningResultPage;