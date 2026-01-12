import React from "react";
import {
  MdHeadset,
  MdLock,
  MdTimer,
  MdQuiz,
  MdStar,
  MdCheckCircle,
} from "react-icons/md";
import { HiOutlinePlay } from "react-icons/hi2";
import { Link } from "react-router-dom";

const ReadingCard = ({
  title,
  status,
  difficulty,
  accent,
  time,
  qs,
  score,
  date,
  isGridView,
  id,
}) => {
  const isFree = status === "FREE";
  const isPremium = status === "PREMIUM";
  const isCompleted = status === "COMPLETED";

  const containerClass = isGridView
    ? "bg-white border border-gray-100 rounded-[32px] p-7 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all flex flex-col relative overflow-hidden group"
    : "bg-white border border-gray-100 rounded-[24px] p-4 mb-4 shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-4 group";

  return (
    <div className={containerClass}>
      {/* Grid view uchun badge tepada qoladi, listda esa bu qism bo'sh bo'ladi */}
      {isGridView && (
        <div className="absolute top-5 right-5 z-10">
          {isFree && (
            <span className="px-2.5 py-1 bg-green-50 text-green-600 text-[10px] font-black uppercase rounded-lg tracking-widest border border-green-100">
              Free
            </span>
          )}
          {isPremium && (
            <span className="px-2.5 py-1 bg-amber-50 text-amber-600 text-[10px] font-black uppercase rounded-lg tracking-widest flex items-center gap-1 border border-amber-100">
              <MdStar className="text-[10px]" /> Premium
            </span>
          )}
          {isCompleted && (
            <div className="flex flex-col h-14 w-14 items-center justify-center bg-green-50 rounded-2xl border border-green-100">
              <p className="text-[10px] font-black text-green-600 uppercase tracking-tighter">Score</p>
              <p className="text-xl font-black text-green-700 leading-none">{score}</p>
            </div>
          )}
        </div>
      )}

      <div className={`flex ${isGridView ? "flex-col" : "items-center flex-1 gap-5"}`}>
        {/* 1. Icon qismi */}
        <div
          className={`rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 
          ${isGridView ? "size-16 mb-6" : "size-14"} 
          ${isFree ? "bg-pink-50 text-pink-400" : isPremium ? "bg-amber-50 text-amber-400" : "bg-blue-50 text-blue-400"}`}
        >
          {isCompleted ? (
            <MdCheckCircle className="text-3xl" />
          ) : isPremium ? (
            <MdLock className="text-3xl" />
          ) : (
            <MdHeadset className="text-3xl" />
          )}
        </div>

        {/* 2. Content qismi */}
        <div className="flex-1">
          <div className="flex flex-col">
            {/* List ko'rinishida Badge sarlavha tepasida chiqadi */}
            {!isGridView && (
              <div className="mb-1.5 flex gap-2 items-center">
                {isFree && (
                  <span className="px-2 py-0.5 bg-green-50 text-green-600 text-[9px] font-black uppercase rounded-md tracking-widest border border-green-100">
                    Free
                  </span>
                )}
                {isPremium && (
                  <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-[9px] font-black uppercase rounded-md tracking-widest flex items-center gap-1 border border-amber-100">
                    <MdStar className="text-[9px]" /> Premium
                  </span>
                )}
                {isCompleted && (
                   <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-black uppercase rounded-md tracking-widest border border-blue-100">
                    Completed
                  </span>
                )}
              </div>
            )}

            <h3 className={`${isGridView ? "text-xl pr-14" : "text-lg"} font-black text-gray-900 mb-0.5 leading-tight`}>
              {title}
            </h3>
            
            <p className="text-sm text-gray-500 font-bold mb-1">
              {isCompleted ? `Completed on ${date}` : `${difficulty} • ${accent}`}
            </p>
          </div>

          {/* Icons Bar */}
          <div className={`flex items-center gap-4 text-gray-400 ${isGridView ? "mt-6 border-b border-gray-50 pb-4 mb-4" : "mt-2"}`}>
            <div className="flex items-center gap-1.5 text-[12px] font-black uppercase tracking-tight">
              <MdTimer className="text-lg text-gray-300" /> {time}
            </div>
            <div className="flex items-center gap-1.5 text-[12px] font-black uppercase tracking-tight">
              <MdQuiz className="text-lg text-gray-300" /> {qs}
            </div>
            {isCompleted && !isGridView && (
               <div className="ml-4 pl-4 border-l border-gray-200 flex items-center gap-2">
                  <span className="text-[10px] font-black text-gray-400 uppercase">Band Score:</span>
                  <span className="text-sm font-black text-blue-600">{score}</span>
               </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Button Section */}
      <div className={`${isGridView ? "w-full" : "w-64 flex justify-end"}`}>
        {isFree && (
          <Link
            to={`/reading-practice/${id}`}
            className="flex items-center justify-center gap-2 w-full max-w-[180px] py-3 bg-blue-500 hover:bg-blue-600 text-white text-sm font-black rounded-xl transition-all shadow-lg shadow-blue-100 active:scale-95"
          >
            Start Test <HiOutlinePlay className="text-lg" />
          </Link>
        )}
        {isPremium && (
          <button className="flex items-center justify-center gap-2 w-full max-w-[180px] py-3 bg-white border-2 border-amber-100 text-amber-600 text-sm font-black rounded-xl hover:bg-amber-50 transition-all active:scale-95">
            <MdLock className="text-lg" /> Unlock
          </button>
        )}
        {isCompleted && (
          <div className={`flex gap-3 ${isGridView ? "w-full" : "w-full justify-end"}`}>
            <button className="px-5 py-2.5 text-xs font-black bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition-all border border-gray-200 active:scale-95">
              Review
            </button>
            <button className="px-5 py-2.5 text-xs font-black bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition-all border border-gray-200 active:scale-95">
              Retake
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReadingCard;