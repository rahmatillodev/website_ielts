import React, { useMemo } from "react";
import { MdHeadset, MdTimer, MdQuiz, MdCheckCircle, MdStar, MdEdit } from "react-icons/md";
import { HiOutlinePlay } from "react-icons/hi2";
import { useNavigate } from "react-router-dom";
import { clearReadingPracticeData } from "@/store/LocalStorage/readingStorage";
import { clearListeningPracticeData } from "@/store/LocalStorage/listeningStorage";
import { IoBookOutline } from "react-icons/io5";
import { useDashboardStore } from "@/store/dashboardStore";
import { motion } from "framer-motion";
import { FaCrown, FaPencilAlt } from "react-icons/fa";
import { formatDateToDayMonth } from "@/utils/formatDate";
// Иконка «сети» с 1–3 полосками: Easy=1, Medium=2, Hard=3
const SignalBars = ({ level = 1 }) => (
  <span className="inline-flex items-end gap-[2px] h-[10px]">
    <span className={`w-0.5 shrink-0 rounded-sm ${level >= 1 ? "bg-gray-600" : "bg-gray-300"}`} style={{ height: 4 }} />
    <span className={`w-0.5 shrink-0 rounded-sm ${level >= 2 ? "bg-gray-600" : "bg-gray-300"}`} style={{ height: 7 }} />
    <span className={`w-0.5 shrink-0 rounded-sm ${level >= 3 ? "bg-gray-600" : "bg-gray-300"}`} style={{ height: 10 }} />
  </span>
);

const CardOpen = ({
  id,
  title,
  difficulty,
  duration,
  question_quantity,
  isCompleted,
  created_at,
  date,
  isGridView,
  link,
  is_premium,
  testType = "reading",
  partLabel,
}) => {
  const navigate = useNavigate();

  // Get completion status from dashboardStore (no API call needed)
  const completionData = useDashboardStore((state) => state.getCompletion(id));

  const hasCompleted = useMemo(() => {
    if (testType !== 'speaking') { 
      return completionData?.isCompleted || false;
    }
  }, [completionData]);

  const attemptData = useMemo(() => {
    return completionData?.attempt || null;
  }, [completionData]);


  const handleStartTest = (e) => {
    // Clear localStorage when starting a new test
    if (id) {
      if (testType === 'listening') {
        clearListeningPracticeData(id);
      } else if (testType === 'reading') {
        clearReadingPracticeData(id);
      } else if (testType === 'speaking') {
        // clearWritingPracticeData(id);
      }
    }
    // Navigate using navigate to ensure localStorage is cleared first
    const practiceLink = testType === 'listening'
      ? `/listening-practice/${id}`
      : (testType === 'reading'
        ? `/reading-practice/${id}`
        : testType === 'speaking'
          ? `/speaking-practice/${id}`
          : testType === 'shadowing'
            ? `/speaking-practice/${id}`
            : testType === 'human'
              ? `/speaking-practice/${id}`
              : `/writing-practice/${id}`);
    navigate(practiceLink);
  };

  const handleRetake = () => {
    if (id) {
      if (testType === 'listening') {
        clearListeningPracticeData(id);
      } else if (testType === 'reading') {
        clearReadingPracticeData(id);
      }
    }
    if (testType === 'listening') {
      navigate(`/listening-practice/${id}`);
    } else if (testType === 'reading') {
      navigate(`/reading-practice/${id}`);
    } else if (testType === 'speaking') {
      navigate(`/speaking-practice/${id}`);
    } else if (testType === 'shadowing') {
      navigate(`/speaking-practice/${id}`);
    } else if (testType === 'human') {
      navigate(`/speaking-practice/${id}`);
    }
  };

  const handleReview = () => {
    if (testType === 'listening') {
      navigate(`/listening-practice/${id}?mode=review`);
    } else if (testType === 'reading') {
      navigate(`/reading-practice/${id}?mode=review`);
    } else if (testType === 'speaking') {
      navigate(`/speaking-practice/${id}?mode=review`);
    } else if (testType === 'shadowing') {
      navigate(`/speaking-practice/${id}/shadowing?mode=review`);
    } else if (testType === 'human') {
      navigate(`/speaking-practice/${id}/human?mode=review`);
    }
  };

  const cardStatus = is_premium ? "Premium" : "Free";
  const createdDate = created_at ? formatDateToDayMonth(created_at) : '';
  const completedDate = attemptData?.completed_at ? formatDateToDayMonth(attemptData.completed_at) : (date ? formatDateToDayMonth(date) : '');

  const score = attemptData?.score || null;
  const correctAnswers = attemptData?.correct_answers || 0;
  const totalQuestions = attemptData?.total_questions || question_quantity || 0;

  // Container classes with green border for completed tests
  const containerClass = isGridView
    ? `bg-white border ${hasCompleted ? 'border-green-500' : is_premium ? 'border-amber-400' : 'border-blue-500'} rounded-2xl p-4 shadow-lg hover:shadow-2xl flex flex-col relative h-full transition-all`
    : `bg-white border border-l-4 ${hasCompleted ? 'border-l-green-500' : is_premium ? 'border-l-amber-400' : 'border-l-blue-500'} rounded-xl md:rounded-[24px] p-4 shadow-lg hover:shadow-2xl flex items-center gap-3 md:gap-4 mb-4 relative`;


  // Animation variants for hover effect
  const cardVariants = {
    hover: {
      scale: 1.005,
      transition: {
        duration: 0.5,
        ease: "ease",
      },
    },
  };

  if (isGridView) {
    // Grid View
    return (
      <motion.div
        className={containerClass}
        variants={cardVariants}
        whileHover="hover"
      >
        {/* Premium/Free Badge */}
        {
          <div className={`${'absolute top-5 right-3 z-10'}`}>
            <span className={`px-2.5 md:px-3 py-1 text-[10px] md:text-xs font-black uppercase rounded-lg tracking-wider flex items-center gap-1.5 ${is_premium
              ? "bg-gradient-to-br from-amber-400 to-amber-500 text-white border-0 shadow-md"
              : "bg-green-500 text-white border-0 shadow-md"
              }`}>
              {is_premium && <FaCrown className="text-xs md:text-sm" />} {cardStatus}
            </span>
          </div>
        }

        {/* Score Badge for Completed */}


        <div className="flex flex-col flex-1">
          {/* Icon */}
          <div className="size-12 md:size-14 mb-4 flex items-center justify-center shrink-0">



            {hasCompleted ? (
              <div className="bg-white border border-gray-200 w-12 md:w-14 h-12 md:h-14 rounded-full flex flex-col items-center justify-center shadow-sm">
                <span className="text-[10px] text-gray-500 font-semibold">Score</span>
                <span className="text-sm md:text-base font-black text-green-600">
                  {score?.toFixed(1) || '0.0'}
                </span>
              </div>
            ) : (
              <div className={`size-full rounded-xl flex items-center justify-center ${is_premium
                  ? 'bg-gradient-to-br from-amber-50 to-amber-100 text-amber-500'
                  : 'bg-blue-50 text-blue-500'
                }`}>
                {testType === 'listening'
                  ? <MdHeadset className="text-2xl" />
                  : testType === 'writing'
                    ? <FaPencilAlt className="text-2xl" />
                    : <IoBookOutline className="text-2xl" />}
              </div>
            )}

          </div>


          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-base md:text-lg font-semibold text-gray-900 line-clamp-1 overflow-hidden text-ellipsis mb-1">
              {title}
            </h3>

            {(partLabel || difficulty || createdDate || completedDate) && (
              <div className="flex flex-wrap items-center gap-2 mt-1 mb-2">
                {(partLabel || difficulty) && (
                  <p className="text-[10px] md:text-xs text-gray-500 font-medium">
                    {partLabel}{partLabel && difficulty ? " " : " "}
                  
                  </p>
                )}
                {(partLabel || difficulty) && (createdDate || completedDate) && (
                  <span className="text-gray-300 text-[10px]"></span>
                )}
                {(createdDate || completedDate) && (
                  <p className="text-[10px] md:text-xs text-gray-400">
                    {completedDate ? "Completed on " + completedDate : "Created on " + createdDate}
                  </p>
                )}
              </div>
            )}
{/* 
            {hasCompleted && (
              <p className="text-[10px] md:text-xs text-gray-400 font-normal mt-0.5">
                Completed on {completedDate}
              </p>
            )} */}

            <div className="flex gap-2 md:gap-3 text-gray-500 mt-2 md:mt-3 items-center">
              <span className="flex items-baseline gap-1.5 text-[9px] md:text-[10px] font-medium leading-none">
                <SignalBars level={difficulty?.toLowerCase() === "hard" ? 3 : difficulty?.toLowerCase() === "medium" ? 2 : 1} />
                <span className="text-gray-600">{difficulty || "—"}</span>
              </span>
              <span className="flex items-center gap-1 text-[9px] md:text-[10px] font-medium">
                <MdTimer className="text-[10px] md:text-xs" /> {duration} min
              </span>
              {hasCompleted ? (
                <span className="flex items-center gap-1 text-[9px] md:text-[10px] font-medium">
                  <MdQuiz className="text-[10px] md:text-xs" /> {correctAnswers}/{totalQuestions} Correct
                </span>
              ) : (
                question_quantity != null && (
                  <span className="flex items-center gap-1 text-[9px] md:text-[10px] font-medium">
                    <MdQuiz className="text-[10px] md:text-xs" /> {question_quantity} {question_quantity === 1 ? "question" : "questions"}
                  </span>
                )
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        {hasCompleted ? (
          <div className="mt-4 flex gap-2 w-full">
            <button
              onClick={handleReview}
              className="flex-1 py-2.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-all"
            >
              Review
            </button>
            <button
              onClick={handleRetake}
              className="flex-1 py-2.5 px-3 bg-blue-500 hover:bg-blue-600 text-white text-xs font-black rounded-lg flex items-center justify-center gap-2 transition-all"
            >
              Retake <HiOutlinePlay className="text-sm" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleStartTest}
            className="mt-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-black rounded-lg flex items-center justify-center gap-2 w-full transition-all"
          >
            {testType === 'writing' ? "View Sample" : "Start Practice"} <HiOutlinePlay className="text-sm" />
          </button>
        )}
      </motion.div>
    );
  } else {
    // List View
    return (
      <motion.div
        className={containerClass}
        variants={cardVariants}
        whileHover="hover"
      >
        {/* Icon */}
        <div className={`size-10 md:size-14 rounded-xl md:rounded-2xl ${hasCompleted
          ? 'bg-green-50 text-green-500'
          : 'bg-blue-50 text-blue-400'
          } flex items-center justify-center shrink-0`}>
          {hasCompleted ? (
            <MdCheckCircle className="text-2xl md:text-3xl" />
          ) : (
            testType === 'listening' ? (
              <MdHeadset className="text-2xl md:text-3xl" />
            ) : testType === 'writing' ? (
              <FaPencilAlt className="text-2xl md:text-3xl" />
            ) : (
              <IoBookOutline className="text-2xl md:text-3xl" />
            )
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-2">
            <h3 className="text-base md:text-lg font-semibold text-gray-900 line-clamp-1 overflow-hidden text-ellipsis">
              {title}
            </h3>

            <span className={`ml-2 md:ml-4 px-2.5 md:px-3 py-1 md:py-1 text-[10px] md:text-xs font-black uppercase rounded-lg md:rounded-xl tracking-wider flex items-center gap-1.5 shrink-0 self-start ${is_premium
              ? "bg-gradient-to-br from-amber-400 to-amber-500 text-white border-0 shadow-md"
              : "bg-green-500 text-white border-0 shadow-md"
              }`}>
              {is_premium && <FaCrown className="text-xs md:text-sm" />} {cardStatus}
            </span>

          </div>

          {(partLabel || difficulty || createdDate || completedDate) && (
            <div className="flex flex-wrap items-center gap-2 mt-1 mb-2">
              {(partLabel || difficulty) && (
                <p className="text-[10px] md:text-xs text-gray-500 font-medium">
                  {partLabel}{partLabel && difficulty ? " " : ""}
                  
                </p>
              )}
              {(partLabel || difficulty) && (createdDate || completedDate) && (
                <span className="text-gray-300 text-[10px]"></span>
              )}
                <p className="text-[10px] md:text-xs text-gray-400">
                  {completedDate ? "Completed on " + completedDate : "Created on " + createdDate}
                </p>
            </div>
          )}

          {/* {hasCompleted && (
            <p className="text-[10px] md:text-xs text-gray-400 font-normal mt-0.5">
              Completed on {completedDate}
            </p>
          )} */}

          <div className="flex gap-2 md:gap-3 text-gray-500 mt-2 md:mt-3 flex-wrap items-center">
            <span className="flex items-baseline gap-1.5 text-[9px] md:text-[10px] font-medium leading-none">
              <SignalBars level={difficulty?.toLowerCase() === "hard" ? 3 : difficulty?.toLowerCase() === "medium" ? 2 : 1} />
              <span className="text-gray-600">{difficulty || "—"}</span>
            </span>
            <span className="flex items-center gap-1 text-[9px] md:text-[10px] font-medium">
              <MdTimer className="text-[10px] md:text-xs" /> {duration} min
            </span>
            {hasCompleted ? (
              <span className="flex items-center gap-1 text-[9px] md:text-[10px] font-medium">
                <MdQuiz className="text-[10px] md:text-xs" /> {correctAnswers}/{totalQuestions} Correct
              </span>
            ) : (
              question_quantity != null && (
                <span className="flex items-center gap-1 text-[9px] md:text-[10px] font-medium">
                  <MdQuiz className="text-[10px] md:text-xs" /> {question_quantity} {question_quantity === 1 ? "question" : "questions"}
                </span>
              )
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-6 shrink-0">
          {hasCompleted ? (
            <>
              <div className="flex flex-col items-end border-l border-gray-200 pl-3 md:pl-6">
                <span className="text-[10px] md:text-xs text-gray-500 font-semibold mb-1">Score</span>
                <span className="text-xl md:text-2xl font-black text-green-600">{score?.toFixed(1) || '0.0'}</span>
              </div>
              <div className="flex flex-col gap-1.5 md:gap-2 mr-2 md:mr-4">
                <button
                  onClick={handleReview}
                  className="py-1.5 md:py-2 px-3 md:px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs md:text-sm font-semibold rounded-md transition-all"
                >
                  Review
                </button>
                <button
                  onClick={handleRetake}
                  className="py-1 text-xs md:text-sm font-semibold text-blue-400 hover:text-blue-700 transition-all text-left"
                >
                  Retake Test
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={handleStartTest}
              className="py-2 md:py-3 px-4 md:px-6 bg-blue-500 hover:bg-blue-600 text-white text-xs md:text-sm font-black rounded-lg md:rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              {testType === 'writing' ? "View Sample" : "Start Practice"} <HiOutlinePlay className="text-sm md:text-base" />
            </button>
          )}
        </div>
      </motion.div>
    );
  }
};

export default CardOpen;