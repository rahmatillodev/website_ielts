import React from "react";
import { MdAutoAwesome, MdBolt, MdFlag, MdLock, MdQuiz, MdStar, MdTimer, MdCheckCircle } from "react-icons/md";

const CardLocked = ({
  title,
  is_premium,
  isGridView,
  duration,
  question_quantity,
  isCompleted,
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
  const cardStatus = is_premium ? "Premium" : "Free";

  // Container classes with green border for completed tests
  const containerClass = isGridView
    ? `bg-white border border-t-4 ${isCompleted ? 'border-t-green-500' : 'border-t-yellow-500'} rounded-[32px] p-7 shadow-sm hover:shadow-xl transition-all flex flex-col relative h-full`
    : `bg-white border border-l-4 ${isCompleted ? 'border-l-green-500' : 'border-l-yellow-500'} rounded-[24px] p-4 shadow-sm hover:shadow-md flex items-center gap-4 justify-between mb-4`;

  if (isGridView) {
    // Grid View
    return (
      <div className={containerClass}>
        {/* Premium/Free Badge */}
        <div className={`${isCompleted ? 'absolute top-5 right-30 z-10' : 'absolute top-5 right-5 z-10'}`}>
          <span className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-lg tracking-widest border flex items-center gap-1 ${is_premium
              ? "bg-amber-50 text-amber-600 border-amber-100"
              : "bg-green-50 text-green-600 border-green-100"
            }`}>
            {is_premium && <MdStar />} {cardStatus}
          </span>
        </div>

        {/* Score Badge for Completed */}
        {isCompleted && (
          <div className="absolute top-5 right-5 z-10">
            <div className="bg-white border border-gray-200 rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-sm">
              <span className="text-xs text-gray-500 font-semibold">Score</span>
              <span className="text-base font-black text-green-600">{score?.toFixed(1) || '0.0'}</span>
            </div>
          </div>
        )}

        <div className="flex flex-col flex-1">
          {/* Icon */}
          <div className={`size-16 mb-6 rounded-2xl ${isCompleted
              ? 'bg-green-50 text-green-500'
              : 'bg-amber-50 text-amber-400'
            } flex items-center justify-center shrink-0`}>
            {isCompleted ? (
              <MdCheckCircle className="text-3xl" />
            ) : (
              <MdLock className="text-3xl" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h6 className="text-base font-semibold text-gray-900 line-clamp-2 overflow-hidden text-ellipsis mb-1">
              {title}
            </h6>

            <p className="text-sm text-gray-500 font-medium mt-1 flex items-center gap-2">
              {(() => {
                let diffIcon = null;
                let diffColor = "";
                if (difficulty?.toLowerCase() === "easy") {
                  diffIcon = <MdBolt className="text-green-400 text-[16px]" title="Easy" />;
                  diffColor = "text-green-500";
                } else if (difficulty?.toLowerCase() === "medium") {
                  diffIcon = <MdFlag className="text-yellow-500 text-[16px]" title="Medium" />;
                  diffColor = "text-yellow-500";
                } else if (difficulty?.toLowerCase() === "hard") {
                  diffIcon = <MdAutoAwesome className="text-red-500 text-[16px]" title="Hard" />;
                  diffColor = "text-red-400";
                }
                return (
                  <>
                    <span className={`flex items-center gap-1 font-medium ${diffColor}`}>
                      {diffIcon}
                      Difficulty: {difficulty}
                    </span>
                    {isCompleted && (
                      <span className="ml-1 text-xs text-gray-400 font-normal">
                        • Completed on {completedDate}
                      </span>
                    )}
                  </>
                );
              })()}
            </p>

            <div className="flex gap-4 text-gray-500 mt-4">
              <span className="flex items-center gap-1 text-xs font-black pl-2 bg-gray-100 rounded-full px-3 py-1.5">
                <MdTimer /> {duration} min
              </span>
              {isCompleted ? (
                <span className="flex items-center gap-1 text-xs font-black pl-2 bg-gray-100 rounded-full px-3 py-1.5">
                  <MdQuiz /> {correct_answers || 0}/{total_questions || question_quantity || 0} Correct
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

          {/* Unlock Button - Always show for locked tests, even if completed */}
          <button className="mt-6 py-3 border-2 border-amber-200 text-amber-600 font-black rounded-xl hover:bg-amber-50 transition-all w-full flex items-center justify-center gap-2">
            <MdLock />
            Unlock Test
          </button>
        </div>
      </div>
    );
  } else {
    // List View
    return (
      <div className={containerClass}>
        {/* Icon */}
        <div className={`size-14 rounded-2xl ${isCompleted
            ? 'bg-green-50 text-green-500'
            : 'bg-amber-50 text-amber-400'
          } flex items-center justify-center shrink-0`}>
          {isCompleted ? (
            <MdCheckCircle className="text-3xl" />
          ) : (
            <MdLock className="text-3xl" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900 line-clamp-1 overflow-hidden text-ellipsis">
              {title}
            </h3>
            {!isCompleted && (
              <span className={`ml-4 px-2.5 py-1 text-[10px] font-black uppercase rounded-lg tracking-widest border flex items-center gap-1 shrink-0 ${is_premium
                  ? "bg-amber-50 text-amber-600 border-amber-100"
                  : "bg-green-50 text-green-600 border-green-100"
                }`}>
                {is_premium && <MdStar className="text-xs" />} {cardStatus}
              </span>
            )}
          </div>

          <p className="text-sm text-gray-500 font-medium mt-1 flex items-center gap-2">
            {(() => {
              let diffIcon = null;
              let diffColor = "";
              if (difficulty?.toLowerCase() === "easy") {
                diffIcon = <MdBolt className="text-green-400 text-[16px]" title="Easy" />;
                diffColor = "text-green-500";
              } else if (difficulty?.toLowerCase() === "medium") {
                diffIcon = <MdFlag className="text-yellow-500 text-[16px]" title="Medium" />;
                diffColor = "text-yellow-500";
              } else if (difficulty?.toLowerCase() === "hard") {
                diffIcon = <MdAutoAwesome className="text-red-500 text-[16px]" title="Hard" />;
                diffColor = "text-red-400";
              }
              return (
                <>
                  <span className={`flex items-center gap-1 font-medium ${diffColor}`}>
                    {diffIcon}
                    Difficulty: {difficulty}
                  </span>
                  {isCompleted && (
                    <span className="ml-1 text-xs text-gray-400 font-normal">
                      • Completed on {completedDate}
                    </span>
                  )}
                </>
              );
            })()}
          </p>

          <div className="flex gap-4 text-gray-500 mt-4">
            <span className="flex items-center gap-1 text-xs font-black pl-2 bg-gray-100 rounded-full px-3 py-1.5">
              <MdTimer /> {duration} min
            </span>
            {isCompleted ? (
              <span className="flex items-center gap-1 text-xs font-black pl-2 bg-gray-100 rounded-full px-3 py-1.5">
                <MdQuiz /> {correct_answers || 0}/{total_questions || question_quantity || 0} Correct
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

        <div className="flex items-center gap-6 shrink-0">
          {isCompleted ? (
            <div className="flex flex-col items-end border-l border-gray-200 pl-6">
              <span className="text-xs text-gray-500 font-semibold mb-1">Score</span>
              <span className="text-2xl font-black text-green-600">{score?.toFixed(1) || '0.0'}</span>
            </div>
          ) : (
            <button className="py-3 flex items-center gap-2 px-8 border-2 border-amber-200 text-amber-600 font-black rounded-xl hover:bg-amber-50 transition-all shrink-0">
              <MdLock />
              Unlock Test
            </button>
          )}
        </div>
      </div>
    );
  }
};

export default React.memo(CardLocked);