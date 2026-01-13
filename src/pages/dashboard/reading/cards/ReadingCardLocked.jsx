import React from "react";
import { MdLock, MdStar } from "react-icons/md";

const ReadingCardLocked = ({ title, is_premium, isGridView }) => {
  const containerClass = isGridView
    ? "bg-white border border-amber-100 rounded-[32px] p-7 shadow-sm flex flex-col relative"
    : "bg-white border border-amber-100 rounded-[24px] p-4 shadow-sm flex items-center gap-4";
    const cardStatus = is_premium ? "Premium" : "Free";
  return (
    <div className={containerClass}>
      {isGridView && (
        <div className="absolute top-5 right-5 px-2.5 py-1 bg-amber-50 text-amber-600 text-[10px] font-black rounded-lg flex items-center gap-1 border border-amber-100">
          <MdStar /> {cardStatus}
        </div>
      )}

      <div className={`flex ${isGridView ? "flex-col" : "items-center gap-5"}`}>
        <div className={`${isGridView ? "size-16 mb-6" : "size-14"} rounded-2xl bg-amber-50 text-amber-400 flex items-center justify-center`}>
          <MdLock className="text-3xl" />
        </div>

        <div className="flex-1">
          <h3 className={`${isGridView ? "text-xl" : "text-lg"} font-black text-gray-900`}>
            {title}
          </h3>

          <p className="text-sm text-gray-500 font-bold">
            {cardStatus} content
          </p>
        </div>
      </div>

      <button className="mt-6 py-3 border-2 border-amber-100 text-amber-600 font-black rounded-xl hover:bg-amber-50">
        Unlock
      </button>
    </div>
  );
};

export default React.memo(ReadingCardLocked);
