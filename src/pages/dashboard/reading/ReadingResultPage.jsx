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
import { fetchLatestAttempt, deleteTestAttempts, fetchAttemptAnswers } from "@/lib/testAttempts";
import { useAuthStore } from "@/store/authStore";
import { useDashboardStore } from "@/store/dashboardStore";
import { generateTestResultsPDF } from "@/utils/pdfExport";
import ResultBanner from "@/components/badges/ResultBanner";
import { useSettingsStore } from "@/store/systemStore";
import { toast } from "react-toastify";

const ReadingResultPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentTest, fetchTestById } = useTestStore();
  const { authUser, userProfile } = useAuthStore();
  const attempts = useDashboardStore((state) => state.attempts);
  const [resultData, setResultData] = useState(null);
  const [attemptData, setAttemptData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  // Use refs to track loaded state and prevent unnecessary re-fetches
  const lastLoadedIdRef = useRef(null);
  const isLoadingRef = useRef(false);
  const fetchTestByIdRef = useRef(fetchTestById);
  const authUserRef = useRef(authUser);
  const userProfileRef = useRef(userProfile);
  const settings = useSettingsStore((state) => state.settings);
  // Update refs when values change (but don't trigger re-fetch)
  useEffect(() => {
    fetchTestByIdRef.current = fetchTestById;
  }, [fetchTestById]);

  useEffect(() => {
    authUserRef.current = authUser;
  }, [authUser]);

  useEffect(() => {
    userProfileRef.current = userProfile;
  }, [userProfile]);

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

    // Mark as loading and update last loaded id
    isLoadingRef.current = true;
    lastLoadedIdRef.current = id;
    setLoading(true);

    // Parallel loading with Promise.all
    const loadData = async () => {
      try {
        const currentAuthUser = authUserRef.current;
        const currentFetchTestById = fetchTestByIdRef.current;

        // Check if the latest attempt is already in dashboardStore
        const testId = id ? String(id) : null;
        const attemptsForTest = attempts.filter((a) => String(a.test_id) === testId);
        const latestAttemptFromStore = attemptsForTest.length > 0
          ? attemptsForTest.sort((a, b) => {
            const aDate = new Date(a.completed_at || a.created_at || 0).getTime();
            const bDate = new Date(b.completed_at || b.created_at || 0).getTime();
            return bDate - aDate; // Descending order
          })[0]
          : null;

        // On result pages, we should always bypass premium check since results are only shown after completion
        // First, try to get attempt from store or fetch it
        let attemptResult;
        let testResult = null; // Declare testResult outside if/else blocks
        const currentUserProfile = userProfileRef.current;
        const userSubscriptionStatus = currentUserProfile?.subscription_status || "free";

        if (latestAttemptFromStore && currentAuthUser) {
          // Use attempt from store and only fetch answers
          // Fetch test data and answers in parallel
          // Always bypass premium check on result pages
          const [fetchedTestResult, answersResult] = await Promise.all([
            currentFetchTestById(id, false, false, userSubscriptionStatus, true),
            fetchAttemptAnswers(latestAttemptFromStore.id)
          ]);
          testResult = fetchedTestResult; // Store testResult for later use

          if (answersResult.success) {
            attemptResult = {
              success: true,
              attempt: {
                id: latestAttemptFromStore.id,
                user_id: latestAttemptFromStore.user_id,
                test_id: latestAttemptFromStore.test_id,
                score: latestAttemptFromStore.score,
                total_questions: latestAttemptFromStore.total_questions,
                correct_answers: latestAttemptFromStore.correct_answers,
                time_taken: latestAttemptFromStore.time_taken,
                completed_at: latestAttemptFromStore.completed_at,
                created_at: latestAttemptFromStore.created_at,
              },
              answers: answersResult.answers || {}, // Keep original answers with question_id keys, will map later
            };
          } else {
            // Fallback to fetchLatestAttempt if fetching answers fails
            attemptResult = await fetchLatestAttempt(currentAuthUser.id, id);
          }
        } else {
          // Fetch test and attempt in parallel
          // Always bypass premium check on result pages (user can only reach here if they completed the test)
          const [fetchedTestResult, fetchedAttemptResult] = await Promise.all([
            currentFetchTestById(id, false, false, userSubscriptionStatus, true),
            currentAuthUser
              ? fetchLatestAttempt(currentAuthUser.id, id)
              : Promise.resolve({ success: true, attempt: null, answers: {} })
          ]);
          testResult = fetchedTestResult; // Store testResult for later use
          attemptResult = fetchedAttemptResult;
        }

        if (attemptResult.success && attemptResult.attempt && attemptResult.answers) {
          setAttemptData(attemptResult.attempt);

          // Get test data - use testResult if available (from parallel fetch), otherwise use currentTest from store
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
          // Use question_number as key for display, but keep question_id mapping for review data
          const answersObj = {};
          const reviewDataObj = {};
          Object.keys(attemptResult.answers).forEach((questionId) => {
            // questionId is now questions.id (UUID), map it to question_number
            const questionNumber = questionIdToNumberMap[questionId] || questionId;
            answersObj[questionNumber] = attemptResult.answers[questionId].userAnswer;
            reviewDataObj[questionNumber] = attemptResult.answers[questionId];
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]); // Only depend on id - attempts is read from store when effect runs

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

  // Format date from timestamp
  const formatDate = useCallback((timestamp) => {
    if (!timestamp) return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }, []);

  // Calculate elapsed time - use time_taken from database if available, otherwise calculate from timestamps
  const elapsedTime = useMemo(() => {
    // Prefer time_taken from database (in seconds)
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

  // Get answer display data - memoized for performance
  const answerDisplayData = useMemo(() => {
    if (!resultData || !resultData.answers || !currentTest) return [];

    const answers = resultData.answers || {};
    const reviewData = resultData.reviewData || {};
    const result = [];
    const processedQuestionNumbers = new Set(); // Track processed question numbers to avoid duplicates

    // First, process review data to get individual question entries for multiple_answers
    // For multiple_answers, review data has entries for each individual question
    Object.entries(reviewData).forEach(([questionNum, review]) => {
      if (processedQuestionNumbers.has(questionNum)) return;
      
      const userAnswer = (review.userAnswer || '').toString().trim();
      if (!userAnswer) return;
      
      // Check if answer contains commas (multiple answers like "D,B")
      if (userAnswer.includes(',')) {
        // This is a multiple_answers question - split the answer
        const answerParts = userAnswer.split(',').map(a => a.trim()).filter(Boolean);
        const correctAnswer = (review.correctAnswer || '').toString().trim();
        
        // For multiple_answers, each question in the group has the same userAnswer
        // We need to find which part of the answer corresponds to this question number
        // by matching the correct answer
        if (correctAnswer) {
          // This question's correct answer should match one of the parts
          const matchingPart = answerParts.find(part => 
            part.toUpperCase() === correctAnswer.toUpperCase()
          );
          
          if (matchingPart) {
            processedQuestionNumbers.add(questionNum);
            result.push({
              questionNumber: questionNum,
              yourAnswer: matchingPart,
              isCorrect: review.isCorrect || false,
              correctAnswer: correctAnswer,
            });
          }
        }
      } else {
        // Single answer - process normally
        processedQuestionNumbers.add(questionNum);
        result.push({
          questionNumber: questionNum,
          yourAnswer: userAnswer,
          isCorrect: review.isCorrect || false,
          correctAnswer: review.correctAnswer || '',
        });
      }
    });

    // Also process answers object for any entries not in review data
    Object.entries(answers).forEach(([key, value]) => {
      if (processedQuestionNumbers.has(key)) return;
      
      const answerStr = value.toString().trim();
      if (!answerStr) return;
      
      const review = reviewData[key] || {};
      
      // Check if answer contains commas (multiple answers like "D,B")
      if (answerStr.includes(',')) {
        // Split comma-separated answers
        const answerParts = answerStr.split(',').map(a => a.trim()).filter(Boolean);
        const correctAnswerStr = (review.correctAnswer || '').toString().trim();
        const correctAnswerParts = correctAnswerStr.includes(',') 
          ? correctAnswerStr.split(',').map(a => a.trim()).filter(Boolean)
          : [correctAnswerStr].filter(Boolean);
        
        // For multiple_answers, we need to map each part to a question number
        // Find review entries with matching userAnswer
        const matchingReviews = Object.entries(reviewData).filter(([qNum, rev]) => {
          return rev.userAnswer === answerStr && !processedQuestionNumbers.has(qNum);
        });
        
        if (matchingReviews.length > 0) {
          // Sort by question number
          matchingReviews.sort(([a], [b]) => {
            const aNum = Number(a);
            const bNum = Number(b);
            if (!isNaN(aNum) && !isNaN(bNum)) {
              return aNum - bNum;
            }
            return a.toString().localeCompare(b.toString());
          });
          
          // Map each answer part to a question number
          answerParts.forEach((part, index) => {
            const reviewEntry = matchingReviews[index];
            if (reviewEntry) {
              const [questionNum, rev] = reviewEntry;
              if (!processedQuestionNumbers.has(questionNum)) {
                processedQuestionNumbers.add(questionNum);
                result.push({
                  questionNumber: questionNum,
                  yourAnswer: part,
                  isCorrect: rev.isCorrect || false,
                  correctAnswer: rev.correctAnswer || '',
                });
              }
            }
          });
        }
      } else {
        // Single answer
        processedQuestionNumbers.add(key);
        result.push({
          questionNumber: key,
          yourAnswer: answerStr,
          isCorrect: review.isCorrect || false,
          correctAnswer: review.correctAnswer || '',
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
      return a.questionNumber.toString().localeCompare(b.questionNumber.toString());
    });
  }, [resultData, currentTest]);

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
    if (answerDisplayData.length === 0) {
      toast.error('No answers submitted');
      return;
    }
    await generateTestResultsPDF({
      test: currentTest,
      stats,
      answerDisplayData,
      showCorrectAnswers,
      formatDate,
      completedDate: attemptData?.completed_at || resultData?.completedAt,
      testType: 'Reading',
      defaultTestTitle: 'Academic Reading Practice Test',
      settings
    });
    toast.success('PDF is being generated...');
  }, [currentTest, resultData, answerDisplayData, stats, showCorrectAnswers, attemptData, formatDate]);

  // Handle retake - delete previous attempts
  const handleRetake = useCallback(async () => {
    if (!authUser || !id) return;
    navigate(`/reading-practice/${id}`);
  }, [authUser, id, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 p-8 font-sans flex items-center justify-center">
        <div className="text-gray-500">Loading results...</div>
      </div>
    );
  }

  if (!resultData || !currentTest) {
    return (
      <div className="min-h-screen bg-gray-50/50 p-8 font-sans flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-500 mb-4">No results found</div>
          <Link to="/reading">
            <Button variant="outline">Back to Reading</Button>
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
          to="/reading"
          className="flex max-w-max items-center gap-2 text-blue-500 font-semibold text-sm mb-6 cursor-pointer uppercase tracking-wider hover:text-blue-600 transition-colors"
        >
          <FaArrowLeft size={12} />
          <span>Back to Reading</span>
        </Link>

        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2">
              Exam Results
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-slate-500 font-medium text-xs sm:text-sm">
              <span>{currentTest?.title || "Academic Reading Practice Test"}</span>
              <span className="text-gray-400">•</span>
              <span>Completed on {formatDate(attemptData?.completed_at || resultData?.completedAt)}</span>
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
          <div className=" border-2 border-grey-200 rounded-2xl p-4 sm:p-5 shadow-lg">
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
          <div className=" border-2 border-grey-200 rounded-2xl p-4 sm:p-5 shadow-lg">
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
        {/* Performance Banner */}
        <ResultBanner score={stats.score} testType="Reading" />

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
                Go To Home
              </Button>
            </Link>

            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Link to={"/reading-practice/" + (id || '') + "?mode=review"} className="w-full sm:w-auto">
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
                disabled={isDeleting || !authUser}
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

export default ReadingResultPage;