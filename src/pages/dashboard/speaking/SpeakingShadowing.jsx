import React, { useMemo } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { X } from "lucide-react";
import { toIframeSrc } from "@/utils/videoIframeSrc";

export default function SpeakingShadowing() {
  const navigate = useNavigate();
  const { videoId } = useParams();
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
        className="absolute top-4 left-4 z-[100000] flex items-center gap-2 bg-gray-900/80 hover:bg-gray-800 text-white border border-white/20 rounded-lg px-4 py-2 text-sm font-semibold transition-all shadow-lg"
      >
        <X size={18} />
        Exit
      </button>

      <div className="relative w-full h-full">
        {iframeSrc ? (
          <iframe
            className="absolute inset-0 w-full h-full border-0"
            src={iframeSrc}
            title="YouTube video player"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />

        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center text-white">
            <p className="text-lg font-medium text-white/90">No video URL provided.</p>
            <button
              type="button"
              onClick={() => navigate("/shadowing-library")}
              className="rounded-lg bg-white/10 hover:bg-white/20 border border-white/25 px-5 py-2.5 text-sm font-semibold transition-colors"
            >
              Go to Shadowing Library
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
