import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Clock, Calendar } from "lucide-react";
import { FaCrown } from "react-icons/fa";
import UpgradeModal from "@/components/modal/UpgradeModal";

/**
 * Shadowing card — minimal body: date (optional) + title + CTA.
 * `test.duration` (minutes) only on the thumbnail capsule; no conversion or fallbacks.
 */
const ShadowingCard = ({ testId, title, image, duration, videoUrl, date, isPremium = false, isProUser = false }) => {
  const navigate = useNavigate();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const isLocked = isPremium && !isProUser;

  const hasDuration =
    duration != null &&
    duration !== "" &&
    !(typeof duration === "number" && Number.isNaN(duration)) &&
    !Number.isNaN(Number(duration));

  const overlayDurationLabel = hasDuration ? `${duration} min` : null;

  const handleOpen = () => {
    if (isPremium && !isProUser) {
      setUpgradeOpen(true);
      return;
    }
    if (!videoUrl) return;
    navigate("/speaking-practice/shadowing-player", { state: { videoUrl, isPremium, testId } });
  };

  const thumbSrc = image?.trim?.() || "";

  const buttonClass = isLocked
    ? "w-full py-3 text-white bg-amber-500 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 border border-amber-500 shadow-sm hover:bg-amber-600"
    : "w-full py-3 bg-brand-600 text-white rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 border border-brand-600 shadow-sm group-hover:bg-brand-700 group-hover:border-brand-700";

  return (
    <>
      <article
        role="button"
        tabIndex={0}
        onClick={handleOpen}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleOpen();
          }
        }}
        className="group bg-white rounded-3xl border border-gray-200 shadow-sm hover:shadow-[0_20px_50px_rgba(227,6,19,0.08)] hover:-translate-y-1 transition-all duration-500 flex flex-col h-full overflow-hidden cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
      >
        <div className="relative aspect-video overflow-hidden pointer-events-none">
          {thumbSrc ? (
            <img
              src={thumbSrc}
              alt=""
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400 text-sm font-medium">
              No thumbnail
            </div>
          )}
          <div className="absolute inset-0 bg-black/5 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-300">
              <Play className="w-4 h-4 text-brand-600 fill-brand-600 ml-0.5" aria-hidden />
            </div>
          </div>
          {isPremium ? (
            <div className="absolute top-2.5 right-2.5 bg-amber-500 backdrop-blur-md text-white text-[9px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 border border-amber-500">
              <FaCrown className="w-3 h-3 shrink-0 text-white" aria-hidden />
              Premium
            </div>
          ) : null}
          {overlayDurationLabel ? (
            <div className="absolute bottom-2.5 right-2.5 bg-black/70 backdrop-blur-md text-white text-[9px] font-bold px-2 py-1 rounded-lg flex items-center gap-1">
              <Clock className="w-3 h-3 shrink-0" aria-hidden />
              {overlayDurationLabel}
            </div>
          ) : null}
        </div>

        <div className="p-6 flex flex-col flex-grow">
          {date ? (
            <div className="flex items-center gap-2 mb-1.5 text-gray-400 text-[10px] font-bold uppercase tracking-wider pointer-events-none">
              <Calendar className="w-3 h-3 shrink-0 text-gray-400" aria-hidden />
              <span className="min-w-0 leading-tight">{date}</span>
            </div>
          ) : null}
          <h2 className="text-lg font-extrabold text-gray-900 mb-3 line-clamp-2 leading-snug group-hover:text-brand-600 transition-colors pointer-events-none md:text-xl">
            {title}
          </h2>
          <div className="mt-auto pointer-events-none">
            <div className={buttonClass} aria-hidden>
              {isLocked ? (
                <>
                  <FaCrown className="w-4 h-4 text-white" aria-hidden />
                  Upgrade to Pro
                </>
              ) : (
                "Start Shadowing"
              )}
            </div>
          </div>
        </div>
      </article>

      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </>
  );
};

export default ShadowingCard;
