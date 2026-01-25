import React from "react";
import { MdLock, MdQuiz, MdStar, MdTimer, MdCheckCircle } from "react-icons/md";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

// Иконка «сети» с 1–3 полосками: Easy=1, Medium=2, Hard=3
const SignalBars = ({ level = 1 }) => (
  <span className="inline-flex items-end gap-[2px] h-[10px]">
    <span className={`w-0.5 shrink-0 rounded-sm ${level >= 1 ? "bg-gray-600" : "bg-gray-300"}`} style={{ height: 4 }} />
    <span className={`w-0.5 shrink-0 rounded-sm ${level >= 2 ? "bg-gray-600" : "bg-gray-300"}`} style={{ height: 7 }} />
    <span className={`w-0.5 shrink-0 rounded-sm ${level >= 3 ? "bg-gray-600" : "bg-gray-300"}`} style={{ height: 10 }} />
  </span>
);

const CardLocked = ({
  title,
  is_premium,
  isGridView,
  duration,
  question_quantity,
  isCompleted,
  created_at,
  date,
  difficulty,
  score,
  correct_answers,
  total_questions,
}) => {
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

  const completedDate = date ? formatDate(date) : '';
  const createdDate = created_at ? formatDate(created_at) : '';
  const cardStatus = is_premium ? "Premium" : "Free";

  // Animation variants for hover effect
  const cardVariants = {
    hover: {
      scale: 1.005,
      transition: {
        duration: 0.2,
        ease: "easeOut",
      },
    },
  };

  // Container classes with green border for completed tests
  const containerClass = isGridView
    ? `bg-white border ${isCompleted ? 'border-green-500' : is_premium ? 'border-amber-400' : 'border-amber-300'} rounded-2xl md:rounded-[32px] p-4 md:p-7 shadow-lg hover:shadow-2xl transition-all flex flex-col relative h-full`
    : `bg-white border border-l-4 ${isCompleted ? 'border-l-green-500' : is_premium ? 'border-l-amber-400' : 'border-l-amber-300'} rounded-xl md:rounded-[24px] p-3 md:p-4 shadow-lg hover:shadow-2xl flex items-center gap-3 md:gap-4 justify-between mb-4`;

  if (isGridView) {
    // Grid View
    return (
      <motion.div
        className={containerClass}
        variants={cardVariants}
        whileHover="hover"
      >
        {/* Premium/Free Badge */}
        <div className={`${isCompleted ? 'absolute top-3 md:top-5 right-20 md:right-30 z-10' : 'absolute top-3 md:top-5 right-3 md:right-5 z-10'}`}>
          <span className={`px-2.5 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-black uppercase rounded-lg md:rounded-xl tracking-wider flex items-center gap-1.5 ${is_premium
            ? "bg-gradient-to-br from-amber-400 to-amber-500 text-white border-0 shadow-md"
            : "bg-green-500 text-white border-0 shadow-md"
            }`}>
            {is_premium && <MdStar className="text-xs md:text-sm" />} {cardStatus}
          </span>
        </div>

        {/* Score Badge for Completed */}
        {isCompleted && (
          <div className="absolute top-3 md:top-5 right-3 md:right-5 z-10">
            <div className="bg-white border border-gray-200 rounded-full px-2 md:px-3 py-1 md:py-1.5 flex items-center gap-1 md:gap-1.5 shadow-sm">
              <span className="text-[10px] md:text-xs text-gray-500 font-semibold">Score</span>
              <span className="text-sm md:text-base font-black text-green-600">{score?.toFixed(1) || '0.0'}</span>
            </div>
          </div>
        )}

        <div className="flex flex-col flex-1">
          {/* Icon */}
          <div className={`size-12 md:size-16 mb-4 md:mb-6 rounded-xl md:rounded-2xl ${isCompleted
            ? 'bg-green-50 text-green-500'
            : is_premium
              ? 'bg-gradient-to-br from-amber-50 to-amber-100 text-amber-500'
              : 'bg-amber-50 text-amber-500'
            } flex items-center justify-center shrink-0`}>
            {isCompleted ? (
              <MdCheckCircle className="text-2xl md:text-3xl" />
            ) : (
              <MdLock className="text-2xl md:text-3xl" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h6 className="text-sm md:text-base font-semibold text-gray-900 line-clamp-2 overflow-hidden text-ellipsis mb-1">
              {title}
            </h6>

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
                <MdTimer className="text-[10px] md:text-xs" /> {duration} min
              </span>
              {isCompleted ? (
                <span className="flex items-center gap-1 text-[9px] md:text-[10px] font-medium">
                  <MdQuiz className="text-[10px] md:text-xs" /> {correct_answers || 0}/{total_questions || question_quantity || 0} Correct
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

          {/* Unlock Button - Always show for locked tests, even if completed */}
          <Link to="/pricing">
            <button className={`mt-4 md:mt-6 py-2.5 md:py-3 font-black rounded-lg md:rounded-xl transition-all w-full flex items-center justify-center gap-2 text-xs md:text-sm ${is_premium
              ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-white hover:from-amber-500 hover:to-amber-600 shadow-md'
              : 'border-2 border-amber-300 text-amber-600 hover:bg-amber-50'
              }`}>
              <MdLock className="text-sm md:text-base" />
              Unlock Test
            </button>
          </Link>
        </div>
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
          : is_premium
            ? 'bg-gradient-to-br from-amber-50 to-amber-100 text-amber-500'
            : 'bg-amber-50 text-amber-500'
          } flex items-center justify-center shrink-0`}>
          {isCompleted ? (
            <MdCheckCircle className="text-2xl md:text-3xl" />
          ) : (
            <MdLock className="text-2xl md:text-3xl" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-2 flex-wrap">
            <h3 className="text-base md:text-lg font-semibold text-gray-900 line-clamp-1 overflow-hidden text-ellipsis">
              {title}
            </h3>
            {!isCompleted && (
              <span className={`ml-2 md:ml-4 px-2.5 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-black uppercase rounded-lg md:rounded-xl tracking-wider flex items-center gap-1.5 shrink-0 self-start ${is_premium
                ? "bg-gradient-to-br from-amber-400 to-amber-500 text-white border-0 shadow-md"
                : "bg-green-500 text-white border-0 shadow-md"
                }`}>
                {is_premium && <MdStar className="text-xs md:text-sm" />} {cardStatus}
              </span>
            )}
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
              <MdTimer className="text-[10px] md:text-xs" /> {duration} min
            </span>
            {isCompleted ? (
              <span className="flex items-center gap-1 text-[9px] md:text-[10px] font-medium">
                <MdQuiz className="text-[10px] md:text-xs" /> {correct_answers || 0}/{total_questions || question_quantity || 0} Correct
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
          {isCompleted ? (
            <div className="flex flex-col items-end border-l border-gray-200 pl-3 md:pl-6">
              <span className="text-[10px] md:text-xs text-gray-500 font-semibold mb-1">Score</span>
              <span className="text-xl md:text-2xl font-black text-green-600">{score?.toFixed(1) || '0.0'}</span>
            </div>
          ) : (
            <Link to="/pricing">

              <button className={`py-2 md:py-3 flex items-center gap-2 px-4 md:px-8 font-black rounded-lg md:rounded-xl transition-all shrink-0 text-xs md:text-sm ${is_premium
                ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-white hover:from-amber-500 hover:to-amber-600 shadow-md'
                : 'border-2 border-amber-300 text-amber-600 hover:bg-amber-50'
                }`}>
                <MdLock className="text-sm md:text-base" />
                Unlock Test
              </button>
            </Link>
          )}
        </div>
      </motion.div>
    );
  }
};

export default React.memo(CardLocked);