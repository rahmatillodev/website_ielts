import React from "react";
import { MdLock, MdQuiz, MdStar, MdTimer } from "react-icons/md";

const CardLocked = ({ 
  title, 
  is_premium, 
  isGridView,
  duration,
  question_quantity,
  isCompleted,
  date,
  difficulty,
}) => {
  const containerClass = isGridView
    ? "bg-white border border-gray-100 rounded-[32px] p-7 shadow-sm hover:shadow-xl transition-all flex flex-col relative h-full"
    : "bg-white border border-gray-100 rounded-[24px] p-4 shadow-sm hover:shadow-md flex items-center gap-4 justify-between mb-4";
  
  const cardStatus = is_premium ? "Premium" : "Free";
  
  if (isGridView) {
    // Grid View
    return (
      <div className={containerClass}>
        {/* Premium Badge */}
        <div className="absolute top-5 right-5 z-10">
          <span className="px-2.5 py-1 bg-amber-50 text-amber-600 text-[10px] font-black uppercase rounded-lg tracking-widest flex items-center gap-1 border border-amber-100">
            <MdStar /> {cardStatus}
          </span>
        </div>

        <div className="flex flex-col flex-1">
          {/* Icon */}
          <div className="size-16 mb-6 rounded-2xl bg-amber-50 text-amber-400 flex items-center justify-center shrink-0">
            <MdLock className="text-3xl" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-black text-gray-900 line-clamp-2 overflow-hidden text-ellipsis mb-1">
              {title}
            </h3>

            <p className="text-sm text-gray-500 font-semibold mt-1 ">
              {isCompleted ? `Completed on ${date}` : `Difficulty: ${difficulty}`}
            </p>

            <div className="flex gap-4 text-gray-500 mt-4">
              <span className="flex items-center gap-1 text-xs font-black pl-2 bg-gray-100 rounded-full px-3 py-1.5">
                <MdTimer /> {duration} min
              </span>
              {question_quantity && (
                <span className="flex items-center gap-1 text-xs font-black pl-2 bg-gray-100 rounded-full px-3 py-1.5">
                  <MdQuiz /> {question_quantity} {question_quantity < 2 ? "question" : "questions"}
                </span>
              )}
            </div>
          </div>

          {/* Unlock Button */}
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
        <div className="size-14 rounded-2xl bg-amber-50 text-amber-400 flex items-center justify-center shrink-0">
          <MdLock className="text-3xl" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-black text-gray-900 line-clamp-1 overflow-hidden text-ellipsis">
              {title}
            </h3>
            <span className="ml-4 px-2.5 py-1 bg-amber-50 text-amber-600 text-[10px] font-black uppercase rounded-lg tracking-widest flex items-center gap-1 border border-amber-100 shrink-0">
              <MdStar className="text-xs" /> {cardStatus}
            </span>
          </div>

          <p className="text-sm text-gray-500 font-semibold mt-1">
            {isCompleted ? `Completed on ${date}` : `Difficulty: ${difficulty}`}
          </p>

          <div className="flex gap-4 text-gray-500 mt-4">
            <span className="flex items-center gap-1 text-xs font-black pl-2 bg-gray-100 rounded-full px-3 py-1.5">
              <MdTimer /> {duration} min
            </span>
            {question_quantity && (
              <span className="flex items-center gap-1 text-xs font-black pl-2 bg-gray-100 rounded-full px-3 py-1.5">
                <MdQuiz /> {question_quantity} {question_quantity < 2 ? "question" : "questions"}
              </span>
            )}
          </div>
        </div>

        {/* Unlock Button */}
        <button className="py-3 flex items-center gap-2 px-8 border-2 border-amber-200 text-amber-600 font-black rounded-xl hover:bg-amber-50 transition-all shrink-0">
          <MdLock />
          Unlock Test
        </button>
      </div>
    );
  }
};

export default React.memo(CardLocked);