import React, { useMemo } from "react";
import { MdHeadset, MdTimer, MdQuiz, MdCheckCircle, MdStar, MdEdit } from "react-icons/md";
import { HiOutlinePlay } from "react-icons/hi2";
import { useNavigate } from "react-router-dom";
import { clearReadingPracticeData } from "@/store/LocalStorage/readingStorage";
import { clearListeningPracticeData } from "@/store/LocalStorage/listeningStorage";
import { IoBookOutline } from "react-icons/io5";
import { useDashboardStore } from "@/store/dashboardStore";
import { motion } from "framer-motion";
import { FaPencilAlt } from "react-icons/fa";

// Иконка «сети» с 1–3 полосками: Easy=1, Medium=2, Hard=3
const SignalBars = ({ level = 1 }) => (
  <span className="inline-flex items-end gap-[2px] h-[10px]">
    <span className={`w-0.5 shrink-0 rounded-sm ${level >= 1 ? "bg-gray-600" : "bg-gray-300"}`} style={{ height: 4 }} />
    <span className={`w-0.5 shrink-0 rounded-sm ${level >= 2 ? "bg-gray-600" : "bg-gray-300"}`} style={{ height: 7 }} />
    <span className={`w-0.5 shrink-0 rounded-sm ${level >= 3 ? "bg-gray-600" : "bg-gray-300"}`} style={{ height: 10 }} />
  </span>
);

const ComplatedCard = ({
  id,
  title,
  difficulty,
  duration,
  isCompleted,
  created_at,
  completed_at,
  date,
  isGridView,
  is_premium,
  testType = 'reading', // 'reading' or 'listening'
}) => {
  const navigate = useNavigate();

  // Get completion status from dashboardStore (no API call needed)
  const completionData = useDashboardStore((state) => state.getCompletion(id));

  const attemptData = useMemo(() => {
    return completionData?.attempt || null;
  }, [completionData]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[date.getMonth()]} ${date.getDate()} ${date.getHours()}:${date.getMinutes()}`;
    } catch {
      return dateString;
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const handleStartTest = (e) => {
    // Clear localStorage when starting a new test
    if (id) {
      if (testType === 'listening') {
        clearListeningPracticeData(id);
      } else if (testType === 'reading') {
        clearReadingPracticeData(id);
      } else if (testType === 'writing') {
        // clearWritingPracticeData(id);
      }
    }
    // Navigate using navigate to ensure localStorage is cleared first
    const practiceLink = testType === 'listening'
      ? `/listening-practice/${id}`
      : (testType === 'reading' ? `/reading-practice/${id}` : `/writing-practice/${id}`);
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
    } else if (testType === 'writing') {
      navigate(`/writing-practice/${id}`);
    }
  };

  const handleReview = () => {
    if (testType === 'listening') {
      navigate(`/listening-practice/${id}?mode=review`);
    } else if (testType === 'reading') {
      navigate(`/reading-practice/${id}?mode=review`);
    } else if (testType === 'writing') {
      navigate(`/writing-practice/${id}?mode=review`);
    }
  };
  
  const cardStatus = is_premium ? "Premium" : "Free";
  const createdDate = created_at ? formatDate(created_at) : '';
  const completedDate = completed_at ? formatDate(completed_at) : (date ? formatDate(date) : '');

  // Container classes with green border for completed tests
  const containerClass = isGridView
    ? `bg-white border ${isCompleted ? 'border-green-500' : is_premium ? 'border-amber-400' : 'border-blue-500'} rounded-2xl md:rounded-[32px] p-4 md:p-7 shadow-lg hover:shadow-2xl flex flex-col relative h-full transition-all`
    : `bg-white border border-l-4 ${isCompleted ? 'border-l-green-500' : is_premium ? 'border-l-amber-400' : 'border-l-blue-500'} rounded-xl md:rounded-[24px] p-3 md:p-4 shadow-lg hover:shadow-2xl flex items-center gap-3 md:gap-4 mb-4 relative`;

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
          <div className={`${'absolute top-3 md:top-5 right-3 md:right-7 z-10'}`}>
            <span className={`px-2.5 md:px-3 py-1 md:py-1 text-[10px] md:text-xs font-black uppercase rounded-lg md:rounded-xl tracking-wider flex items-center gap-1.5 ${is_premium
              ? "bg-gradient-to-br from-amber-400 to-amber-500 text-white border-0 shadow-md"
              : "bg-green-500 text-white border-0 shadow-md"
              }`}>
              {is_premium && <MdStar className="text-xs md:text-sm" />} {cardStatus}
            </span>
          </div>
        }

        {/* Score Badge for Completed */}
        {isCompleted && (
          <div className="absolute top-10 md:top-12 right-3 md:right-5 z-10">
            <div className="bg-white border border-gray-200 w-12 md:w-18 h-12 md:h-18 rounded-full p-2 md:p-4 flex items-center justify-center flex-col shadow-sm">
              <p className="text-[10px] md:text-xs text-gray-500 font-semibold">Score</p>
              <p className="text-sm md:text-xl font-black text-green-600">{'--'}</p>
            </div>
          </div>
        )}

        <div className="flex flex-col flex-1">
          {/* Icon */}
          <div className={`size-12 md:size-16 mb-4 md:mb-6 rounded-xl md:rounded-2xl ${isCompleted
            ? 'bg-green-50 text-green-500'
            : is_premium
              ? 'bg-gradient-to-br from-amber-50 to-amber-100 text-amber-500'
              : 'bg-blue-50 text-blue-500'
            } flex items-center justify-center shrink-0`}>
            {isCompleted ? (
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
            <h3 className="text-lg md:text-xl font-semibold text-gray-900 line-clamp-2 overflow-hidden text-ellipsis mb-1">
              {title}
            </h3>

            {isCompleted && (
              <p className="text-[10px] md:text-xs text-gray-400 font-normal mt-1">
                Completed on {completedDate}
              </p>
            )}

            {createdDate && !isCompleted && (
              <p className="text-[10px] md:text-xs text-gray-400 font-normal mt-1">
                Created on {createdDate}
              </p>
            )}

            <div className="flex gap-2 md:gap-3 text-gray-500 mt-2 md:mt-3 flex-wrap items-center">
              <span className="flex items-baseline gap-1.5 text-[9px] md:text-[10px] font-medium leading-none">
                <SignalBars level={difficulty?.toLowerCase() === "hard" ? 3 : difficulty?.toLowerCase() === "medium" ? 2 : 1} />
                <span className="text-gray-600">{difficulty || "—"}</span>
              </span>
              <span className="flex items-center gap-1 text-[9px] md:text-[10px] font-medium">
                <MdTimer className="text-[10px] md:text-xs" /> {formatTime(duration)}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        {isCompleted ? (
          <div className="mt-4 md:mt-6 flex gap-2 md:gap-3 w-full">
            <button
              onClick={handleReview}
              className="flex-1 py-2.5 md:py-3 px-3 md:px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs md:text-sm font-semibold rounded-lg md:rounded-xl transition-all"
            >
              Review
            </button>
            <button
              onClick={handleRetake}
              className="flex-1 py-2.5 md:py-3 px-3 md:px-4 bg-blue-500 hover:bg-blue-600 text-white text-xs md:text-sm font-black rounded-lg md:rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              Retake <HiOutlinePlay className="text-sm md:text-base" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleStartTest}
            className="mt-4 md:mt-6 py-2.5 md:py-3 bg-blue-500 hover:bg-blue-600 text-white text-xs md:text-sm font-black rounded-lg md:rounded-xl flex items-center justify-center gap-2 w-full transition-all"
          >
            Start Practice <HiOutlinePlay className="text-sm md:text-base" />
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
        <div className={`size-10 md:size-14 rounded-xl md:rounded-2xl ${isCompleted
          ? 'bg-green-50 text-green-500'
          : 'bg-blue-50 text-blue-400'
          } flex items-center justify-center shrink-0`}>
          {isCompleted ? (
            <MdCheckCircle className="text-2xl md:text-3xl" />
          ) : (
            testType === 'listening' ? (
              <MdHeadset className="text-2xl md:text-3xl" />
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
              {is_premium && <MdStar className="text-xs md:text-sm" />} {cardStatus}
            </span>

          </div>

          {isCompleted && (
            <p className="text-[10px] md:text-xs text-gray-400 font-normal mt-1">
              Completed on {completedDate}
            </p>
          )}

          {createdDate && !isCompleted && (
            <p className="text-[10px] md:text-xs text-gray-400 font-normal mt-1">
              Created on {createdDate}
            </p>
          )}

          <div className="flex gap-2 md:gap-3 text-gray-500 mt-2 md:mt-3 flex-wrap items-center">
            <span className="flex items-baseline gap-1.5 text-[9px] md:text-[10px] font-medium leading-none">
              <SignalBars level={difficulty?.toLowerCase() === "hard" ? 3 : difficulty?.toLowerCase() === "medium" ? 2 : 1} />
              <span className="text-gray-600">{difficulty || "—"}</span>
            </span>
            <span className="flex items-center gap-1 text-[9px] md:text-[10px] font-medium">
              <MdTimer className="text-[10px] md:text-xs" /> {formatTime(duration)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-6 shrink-0">
          {isCompleted ? (
            <>
              <div className="flex flex-col items-end border-l border-gray-200 pl-3 md:pl-6">
                <span className="text-[10px] md:text-xs text-gray-500 font-semibold mb-1">Score</span>
                <span className="text-xl md:text-2xl font-black text-green-600">{'--'}</span>
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
              Start Practice <HiOutlinePlay className="text-sm md:text-base" />
            </button>
          )}
        </div>
      </motion.div>
    );
  }
};

export default React.memo(ComplatedCard);