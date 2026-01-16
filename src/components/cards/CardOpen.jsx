import React from "react";
import { MdHeadset, MdTimer, MdQuiz, MdCheckCircle, MdStar } from "react-icons/md";
import { HiOutlinePlay } from "react-icons/hi2";
import { Link } from "react-router-dom";

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
}) => {
  const containerClass = isGridView
    ? "bg-white border border-gray-100 rounded-[32px] p-7 shadow-sm hover:shadow-xl transition-all flex flex-col relative h-full"
    : "bg-white border border-gray-100 rounded-[24px] p-4 shadow-sm hover:shadow-md flex items-center gap-4 mb-4";

    const cardStatus = is_premium ? "Premium" : "Free";
  return (
    <div className={containerClass}>
      <div className={isGridView 
        ? "absolute top-5 right-5 z-10"
        : "flex-shrink-0 order-last"
      }>
        <span className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-lg tracking-widest border flex items-center gap-1 ${
          is_premium 
            ? "bg-amber-50 text-amber-600 border-amber-100" 
            : "bg-green-50 text-green-600 border-green-100"
        }`}>
          {is_premium && <MdStar />} {cardStatus}
        </span>
      </div>

      <div className={`flex ${isGridView ? "flex-col flex-1" : "items-center flex-1 gap-5"}`}>
        <div className={`${isGridView ? "size-16 mb-6" : "size-14"} rounded-2xl bg-blue-50 text-blue-400 flex items-center justify-center flex-shrink-0`}>
          {isCompleted ? <MdCheckCircle className="text-3xl" /> : <MdHeadset className="text-3xl" />}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className={`${isGridView ? "text-xl" : "text-lg"} font-black text-gray-900 line-clamp-2 overflow-hidden text-ellipsis`}>
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

      <Link
        to={link || `/reading-practice/${id}`}
        className="mt-6 py-3 bg-blue-500 hover:bg-blue-600 text-white text-sm font-black rounded-xl flex items-center justify-center gap-2 w-full md:w-36 self-start"
      >
        Start Test <HiOutlinePlay />
      </Link>
    </div>
  );
};

export default React.memo(ReadingCardOpen);