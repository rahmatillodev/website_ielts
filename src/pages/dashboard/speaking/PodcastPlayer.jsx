import React, { useMemo } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { X } from "lucide-react";
import { toIframeSrc } from "@/utils/videoIframeSrc";

const PodcastPlayer = () => {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const videoUrlFromState = location.state?.videoUrl;

  const iframeSrc = useMemo(() => {
    if (videoUrlFromState && String(videoUrlFromState).trim()) {
      return toIframeSrc(String(videoUrlFromState));
    }
    if (videoId) {
      return toIframeSrc(videoId);
    }
    return "";
  }, [videoUrlFromState, videoId]);

  return (
    <div className="fixed inset-0 z-[99999] bg-black flex items-center justify-center">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="absolute top-6 left-6 z-[100000] flex items-center gap-2 bg-gray-900/80 text-white px-5 py-2.5 rounded-xl font-semibold transition-colors hover:bg-gray-800"
        aria-label="Exit player"
      >
        <X className="w-5 h-5 shrink-0" aria-hidden />
        Exit
      </button>

      <div className="relative w-full h-full">
        {iframeSrc ? (
          <iframe
            src={iframeSrc}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen; web-share"
            allowFullScreen
            title="Speaking podcast player"
            className="absolute inset-0 w-full h-full border-0"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center text-white">
            <p className="text-lg font-medium text-white/90">No video URL provided.</p>
            <button
              type="button"
              onClick={() => navigate("/speaking/podcasts")}
              className="rounded-lg bg-white/10 hover:bg-white/20 border border-white/25 px-5 py-2.5 text-sm font-semibold transition-colors"
            >
              Go to podcasts
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PodcastPlayer;
