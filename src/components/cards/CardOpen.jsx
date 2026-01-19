import React, { useState, useEffect } from "react";
import { MdHeadset, MdTimer, MdQuiz, MdCheckCircle, MdStar } from "react-icons/md";
import { HiOutlinePlay } from "react-icons/hi2";
import { useNavigate } from "react-router-dom";
import { clearReadingPracticeData } from "@/store/readingStorage";
import { clearListeningPracticeData } from "@/store/listeningStorage";
import { checkTestCompleted } from "@/lib/testAttempts";
import { IoBookOutline } from "react-icons/io5";
import { useTestStore } from "@/store/testStore";

const ReadingCardOpen = ({
  id,
  title,
  difficulty,
  duration,
  question_quantity,
  isCompleted,
  date,
  isGridView,
  link,
  is_premium,
  testType = 'reading', // 'reading' or 'listening'
}) => {
  const navigate = useNavigate();
  const [hasCompleted, setHasCompleted] = useState(false);
  const [attemptData, setAttemptData] = useState(null);

  // Get test completion state from store
  const test_completed = useTestStore((state) => state.test_completed);
  const setTestCompleted = useTestStore((state) => state.setTestCompleted);
  const getTestCompleted = useTestStore((state) => state.getTestCompleted);

  useEffect(() => {
    const checkCompleted = async () => {
      if (!id) return;

      // First check if we have cached completion data in store
      const cachedData = getTestCompleted(id);
      if (cachedData) {
        setHasCompleted(cachedData.isCompleted);
        setAttemptData(cachedData.attempt);
        return;
      }

      // If not in store, fetch from API
      const result = await checkTestCompleted(id);
      if (result.success) {
        // Cache the result in store
        setTestCompleted(id, {
          isCompleted: result.isCompleted,
          attempt: result.attempt,
        });
        
        // Update local state
        setHasCompleted(result.isCompleted);
        setAttemptData(result.attempt);
      }
    };
    
    checkCompleted();
  }, [id, setTestCompleted, getTestCompleted]);
  
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[date.getMonth()]} ${date.getDate()}`;
    } catch {
      return dateString;
    }
  };
  
  const handleStartTest = (e) => {
    // Clear localStorage when starting a new test
    if (id) {
      if (testType === 'listening') {
        clearListeningPracticeData(id);
      } else {
        clearReadingPracticeData(id);
      }
    }
    // Navigate using navigate to ensure localStorage is cleared first
    const practiceLink = testType === 'listening' 
      ? `/listening-practice/${id}`
      : (link || `/reading-practice/${id}`);
    navigate(practiceLink);
  };
  
  const handleRetake = () => {
    if (id) {
      if (testType === 'listening') {
        clearListeningPracticeData(id);
      } else {
        clearReadingPracticeData(id);
      }
    }
    const practiceLink = testType === 'listening' 
      ? `/listening-practice/${id}?mode=retake`
      : `/reading-practice/${id}?mode=retake`;
    navigate(practiceLink);
  };
  
  const handleReview = () => {
    const practiceLink = testType === 'listening' 
      ? `/listening-practice/${id}?mode=review`
      : `/reading-practice/${id}?mode=review`;
    navigate(practiceLink);
  };
  const cardStatus = is_premium ? "Premium" : "Free";
  const completedDate = attemptData?.completed_at ? formatDate(attemptData.completed_at) : (date ? formatDate(date) : '');
  
  const score = attemptData?.score || null;
  const correctAnswers = attemptData?.correct_answers || 0;
  const totalQuestions = attemptData?.total_questions || question_quantity || 0;
  
  // Container classes with green border for completed tests
  const containerClass = isGridView
    ? `bg-white border ${hasCompleted ? 'border-t-4 border-t-green-500' : 'border-gray-100'} rounded-[32px] p-7 shadow-none hover:shadow-sm flex flex-col relative h-full`
    : `bg-white border ${hasCompleted ? 'border-l-4 border-l-green-500' : 'border-gray-100'} rounded-[24px] p-4 shadow-none hover:shadow-sm flex items-center gap-4 mb-4 relative`;

  if (isGridView) {
    // Grid View
    return (
      <div className={containerClass}>
        {/* Premium/Free Badge */}
        { 
          <div className={`${hasCompleted ? 'absolute top-5 right-30 z-10' : 'absolute top-5 right-5 z-10'}`}>
            <span className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-lg tracking-widest border flex items-center gap-1 ${
              is_premium 
                ? "bg-amber-50 text-amber-600 border-amber-100" 
                : "bg-green-50 text-green-600 border-green-100"
            }`}>
              {is_premium && <MdStar />} {cardStatus}
            </span>
          </div>
        }

        {/* Score Badge for Completed */}
        {hasCompleted && (
          <div className="absolute top-5 right-5 z-10">

            <div className="bg-white border border-gray-200 rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-sm">
              <span className="text-xs text-gray-500 font-bold">Score</span>
              <span className="text-base font-black text-green-600">{score?.toFixed(1) || '0.0'}</span>
            </div>
          </div>
        )}

        <div className="flex flex-col flex-1">
          {/* Icon */}
          <div className={`size-16 mb-6 rounded-2xl ${
            hasCompleted 
              ? 'bg-green-50 text-green-500' 
              : 'bg-blue-50 text-blue-400'
          } flex items-center justify-center shrink-0`}>
            {hasCompleted ? (
              <MdCheckCircle className="text-3xl" />
            ) : (
              testType === 'listening' ? (
                <MdHeadset className="text-3xl" />
              ) : (
                <IoBookOutline className="text-3xl" />
              )
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-black text-gray-900 line-clamp-2 overflow-hidden text-ellipsis mb-1">
              {title}
            </h3>

            <p className="text-sm text-gray-500 font-semibold mt-1">
              {hasCompleted 
                ? `Completed on ${completedDate}` 
                : `Difficulty: ${difficulty}`}
            </p>

            <div className="flex gap-4 text-gray-500 mt-4">
              <span className="flex items-center gap-1 text-xs font-black pl-2 bg-gray-100 rounded-full px-3 py-1.5">
                <MdTimer /> {duration} min
              </span>
              {hasCompleted ? (
                <span className="flex items-center gap-1 text-xs font-black pl-2 bg-gray-100 rounded-full px-3 py-1.5">
                  <MdQuiz /> {correctAnswers}/{totalQuestions} Correct
                </span>
              ) : (
                question_quantity && (
                  <span className="flex items-center gap-1 text-xs font-black pl-2 bg-gray-100 rounded-full px-3 py-1.5">
                    <MdQuiz /> {question_quantity} {question_quantity < 2 ? "question" : "questions"}
                  </span>
                )
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        {hasCompleted ? (
          <div className="mt-6 flex gap-3 w-full">
            <button
              onClick={handleReview}
              className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold rounded-xl transition-all"
            >
              Review
            </button>
            <button
              onClick={handleRetake}
              className="flex-1 py-3 px-4 bg-blue-500 hover:bg-blue-600 text-white text-sm font-black rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              Retake <HiOutlinePlay />
            </button>
          </div>
        ) : (
          <button
            onClick={handleStartTest}
            className="mt-6 py-3 bg-blue-500 hover:bg-blue-600 text-white text-sm font-black rounded-xl flex items-center justify-center gap-2 w-full transition-all"
          >
            Start Practice <HiOutlinePlay />
          </button>
        )}
      </div>
    );
  } else {
    // List View
    return (
      <div className={containerClass}>
        {/* Icon */}
        <div className={`size-14 rounded-2xl ${
          hasCompleted 
            ? 'bg-green-50 text-green-500' 
            : 'bg-blue-50 text-blue-400'
        } flex items-center justify-center shrink-0`}>
          {hasCompleted ? (
            <MdCheckCircle className="text-3xl" />
          ) : (
            testType === 'listening' ? (
              <MdHeadset className="text-3xl" />
            ) : (
              <IoBookOutline className="text-3xl" />
            )
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-black text-gray-900 line-clamp-1 overflow-hidden text-ellipsis">
              {title}
            </h3>
            {!hasCompleted && (
              <span className={`ml-4 px-2.5 py-1 text-[10px] font-black uppercase rounded-lg tracking-widest border flex items-center gap-1 shrink-0 ${
                is_premium 
                  ? "bg-amber-50 text-amber-600 border-amber-100" 
                  : "bg-green-50 text-green-600 border-green-100"
              }`}>
                {is_premium && <MdStar className="text-xs" />} {cardStatus}
              </span>
            )}
          </div>

          <p className="text-sm text-gray-500 font-semibold mt-1">
            {hasCompleted 
              ? `Completed on ${completedDate}` 
              : `Difficulty: ${difficulty}`}
          </p>

        
          <div className="flex gap-4 text-gray-500 mt-4">
            <span className="flex items-center gap-1 text-xs font-black pl-2 bg-gray-100 rounded-full px-3 py-1.5">
              <MdTimer /> {duration} min
            </span>
            {hasCompleted ? (
              <span className="flex items-center gap-1 text-xs font-black pl-2 bg-gray-100 rounded-full px-3 py-1.5">
                <MdQuiz /> {correctAnswers}/{totalQuestions} Correct
              </span>
            ) : (
              question_quantity && (
                <span className="flex items-center gap-1 text-xs font-black pl-2 bg-gray-100 rounded-full px-3 py-1.5">
                  <MdQuiz /> {question_quantity} {question_quantity < 2 ? "question" : "questions"}
                </span>
              )
            )}
          </div>
        </div>

        <div className="flex items-center gap-6 shrink-0 ">
          {hasCompleted ? (
            <>
              <div className="flex flex-col items-end border-l border-gray-200 pl-6">
                <span className="text-xs text-gray-500 font-bold mb-1">Score</span>
                <span className="text-2xl font-black text-green-600">{score?.toFixed(1) || '0.0'}</span>
              </div>
              <div className="flex flex-col gap-2 mr-4">
                <button
                  onClick={handleReview}
                  className="py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold rounded-md transition-all"
                >
                  Review
                </button>
                <button
                  onClick={handleRetake}
                  className="py-1  text-sm font-semibold text-blue-400 hover:text-blue-700 transition-all text-left"
                >
                  Retake Test
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={handleStartTest}
              className="py-3 px-6 bg-blue-500 hover:bg-blue-600 text-white text-sm font-black rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              Start Practice <HiOutlinePlay />
            </button>
          )}
        </div>
      </div>
    );
  }
};

export default React.memo(ReadingCardOpen);