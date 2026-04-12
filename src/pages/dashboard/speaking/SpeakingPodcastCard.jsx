import React from "react";
import { useNavigate } from "react-router-dom";
import { Play, Clock, Calendar } from "lucide-react";

/**
 * Layout clone of ShadowingCard: white rounded-3xl, date row, title, solid blue CTA.
 * `test.duration` shown verbatim on the thumbnail capsule as "{duration} min" (no conversion).
 */
const SpeakingPodcastCard = ({ title, image, duration, videoUrl, date }) => {
  const navigate = useNavigate();

  const hasDuration =
    duration != null &&
    duration !== "" &&
    !(typeof duration === "number" && Number.isNaN(duration));

  const overlayDurationLabel = hasDuration ? `${duration} min` : null;

  const goToPlayer = () => {
    if (!videoUrl) return;
    navigate("/speaking/podcast-player", { state: { videoUrl } });
  };

  const thumbSrc = image?.trim?.() || "";

  const buttonClass =
    "w-full py-3 bg-blue-600 text-white rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 border border-blue-600 shadow-sm group-hover:bg-blue-700 group-hover:border-blue-700";

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={goToPlayer}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          goToPlayer();
        }
      }}
      className="group bg-white rounded-3xl border border-gray-200 shadow-sm hover:shadow-[0_20px_50px_rgba(8,112,184,0.08)] hover:-translate-y-1 transition-all duration-500 flex flex-col h-full overflow-hidden cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
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
            <Play className="w-4 h-4 text-blue-600 fill-blue-600 ml-0.5" aria-hidden />
          </div>
        </div>
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
        <h2 className="text-lg font-extrabold text-gray-900 mb-3 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors pointer-events-none md:text-xl">
          {title}
        </h2>
        <div className="mt-auto pointer-events-none">
          <div className={buttonClass} aria-hidden>
            Start Practice
          </div>
        </div>
      </div>
    </article>
  );
};

export default SpeakingPodcastCard;
