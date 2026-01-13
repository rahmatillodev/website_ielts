import React from "react";
import { MdHeadset, MdTimer, MdQuiz, MdCheckCircle } from "react-icons/md";
import { HiOutlinePlay } from "react-icons/hi2";
import { Link } from "react-router-dom";

const ReadingCardOpen = ({
  id,
  title,
  difficulty,
  duration,
  qs,
  isCompleted,
  score,
  date,
  isGridView,
}) => {
  const containerClass = isGridView
    ? "bg-white border border-gray-100 rounded-[32px] p-7 shadow-sm hover:shadow-xl transition-all flex flex-col relative"
    : "bg-white border border-gray-100 rounded-[24px] p-4 shadow-sm hover:shadow-md flex items-center gap-4";

  return (
    <div className={containerClass}>
      {isGridView && isCompleted && (
        <div className="absolute top-5 right-5 bg-green-50 border border-green-100 rounded-2xl h-14 w-14 flex flex-col items-center justify-center">
          <p className="text-[10px] font-black text-green-600 uppercase">Score</p>
          <p className="text-xl font-black text-green-700">{score}</p>
        </div>
      )}

      <div className={`flex ${isGridView ? "flex-col" : "items-center flex-1 gap-5"}`}>
        <div className={`${isGridView ? "size-16 mb-6" : "size-14"} rounded-2xl bg-blue-50 text-blue-400 flex items-center justify-center`}>
          {isCompleted ? <MdCheckCircle className="text-3xl" /> : <MdHeadset className="text-3xl" />}
        </div>

        <div className="flex-1">
          <h3 className={`${isGridView ? "text-xl" : "text-lg"} font-black text-gray-900`}>
            {title}
          </h3>

          <p className="text-sm text-gray-500 font-bold">
            {isCompleted ? `Completed on ${date}` : `Difficulty: ${difficulty}`}
          </p>

          <div className="flex gap-4 text-gray-400 mt-4">
            <span className="flex items-center gap-1 text-xs font-black">
              <MdTimer /> {duration}
            </span>
            <span className="flex items-center gap-1 text-xs font-black">
              <MdQuiz /> {qs}
            </span>
          </div>
        </div>
      </div>

      <Link
        to={`/reading-practice/${id}`}
        className="mt-6 flex items-center justify-center gap-2 py-3 bg-blue-500 hover:bg-blue-600 text-white text-sm font-black rounded-xl pr-6 pl-6"
      >
        Start Test <HiOutlinePlay />
      </Link>
    </div>
  );
};

export default React.memo(ReadingCardOpen);
