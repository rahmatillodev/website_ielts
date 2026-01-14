import React from "react";
import { MdLock, MdQuiz, MdStar, MdTimer } from "react-icons/md";

const ReadingCardLocked = ({ 
  title, 
  is_premium, 
  isGridView,
  duration,
  question_quantity,
  isCompleted,
  date,
  difficulty
}) => {
  const containerClass = isGridView
    ? "bg-white border border-gray-100 rounded-[32px] p-7 shadow-sm hover:shadow-xl transition-all flex flex-col relative h-full"
    : "bg-white border border-gray-100 rounded-[24px] p-4 shadow-sm hover:shadow-md flex items-center gap-4 justify-between mb-4";
  
  const cardStatus = is_premium ? "Premium" : "Free";
  
  return (
    <div className={containerClass}>
      {isGridView && (
        <div className="absolute top-5 right-5 px-2.5 py-1 bg-amber-50 text-amber-600 text-[10px] font-black rounded-lg flex items-center gap-1 border border-amber-100">
          <MdStar /> {cardStatus}
        </div>
      )}

      {isGridView ? (
        // Вертикальный режим (GridView)
        <>
          <div className="flex flex-col flex-1">
            <div className="flex flex-col flex-1">
              <div className="size-16 mb-6 rounded-2xl bg-amber-50 text-amber-400 flex items-center justify-center flex-shrink-0">
                <MdLock className="text-3xl" />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-black text-gray-900 line-clamp-2 overflow-hidden text-ellipsis">
                  {title}
                </h3>

                <p className="text-sm text-gray-500 font-bold mt-1">
                  {isCompleted ? `Completed on ${date}` : `Difficulty: ${difficulty}`}
                </p>

                <div className="flex gap-4 text-gray-400 mt-4">
                  <span className="flex items-center gap-1 text-xs font-black">
                    <MdTimer /> {duration} min
                  </span>
                  {question_quantity && (
                    <span className="flex items-center gap-1 text-xs font-black">
                      <MdQuiz /> {question_quantity + `${question_quantity < 2 ? " question" : " questions"}`}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button className="mt-6 py-3 border-2 border-amber-100 text-amber-600 font-black rounded-xl hover:bg-amber-50 w-full md:w-36 self-start">
              Unlock
            </button>
          </div>
        </>
      ) : (
        // Горизонтальный режим
        <>
          <div className="flex items-center gap-5 flex-1 min-w-0">
            <div className="size-14 rounded-2xl bg-amber-50 text-amber-400 flex items-center justify-center flex-shrink-0">
              <MdLock className="text-3xl" />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-black text-gray-900 line-clamp-2 overflow-hidden text-ellipsis">
                {title}
              </h3>

              <p className="text-sm text-gray-500 font-bold mt-1">
                {isCompleted ? `Completed on ${date}` : `Difficulty: ${difficulty}`}
              </p>

              <div className="flex gap-4 text-gray-400 mt-4">
                <span className="flex items-center gap-1 text-xs font-black">
                  <MdTimer /> {duration} min
                </span>
                {question_quantity && (
                  <span className="flex items-center gap-1 text-xs font-black">
                    <MdQuiz /> {question_quantity + `${question_quantity < 2 ? " question" : " questions"}`}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button className="py-3 flex items-center gap-2 px-12 border-2 border-amber-100 text-amber-600 font-black rounded-xl hover:bg-amber-50 flex-shrink-0">
            <MdLock />
            Unlock
          </button>
        </>
      )}
    </div>
  );
};

export default React.memo(ReadingCardLocked);