/**
 * Shadowing task: YouTube video + Answer button → record (no stop, auto-advance on timer).
 */

import React from "react";
import SpeakingSessionOrchestrator from "@/components/speaking/SpeakingSessionOrchestrator";
import SpeakingSessionNavbar from "@/components/speaking/SpeakingSessionNavbar";
import SpeakingSessionSidebar from "@/components/speaking/SpeakingSessionSidebar";
import { useSpeakingSessionStore, getFlatQuestions } from "@/store/speakingSessionStore";
import { getShadowingPartsForTest } from "./mockShadowingData";

/** Normalize YouTube URL to embed form. */
function toEmbedUrl(url) {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (trimmed.includes("/embed/")) return trimmed;
  const match = trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : trimmed;
}

function ShadowingVideoView() {
  const getCurrentYoutubeUrl = useSpeakingSessionStore((s) => s.getCurrentYoutubeUrl);
  const currentStep = useSpeakingSessionStore((s) => s.currentStep);
  const getTotalSteps = useSpeakingSessionStore((s) => s.getTotalSteps);

  const url = getCurrentYoutubeUrl();
  const embedUrl = toEmbedUrl(url);
  const totalSteps = getTotalSteps();

  if (totalSteps === 0 || currentStep >= totalSteps) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-text-secondary-light">
        No step
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-6 overflow-hidden min-h-0">
      <h2 className="text-xl font-bold text-primary mb-4 shrink-0">
        Step {currentStep + 1}
      </h2>
      <div className="flex-1 min-h-0 rounded-lg overflow-hidden bg-black">
        {embedUrl ? (
          <iframe
            key={currentStep}
            title={`Shadowing video — Step ${currentStep + 1}`}
            src={embedUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/80">
            No video URL
          </div>
        )}
      </div>
    </div>
  );
}

export default function SpeakingShadowingTask() {
  const status = useSpeakingSessionStore((s) => s.status);
  const parts = useSpeakingSessionStore((s) => s.parts);
  const totalSteps = getFlatQuestions(parts).length;
  const isLoading = totalSteps === 0 && status === "idle";

  return (
    <SpeakingSessionOrchestrator getPartsForTest={getShadowingPartsForTest} mode="shadowing">
      <div className="flex flex-col h-[calc(100vh)] bg-gray-50">
        <div className="flex flex-1 overflow-hidden min-h-0">
          <div className="flex-1 flex flex-col min-w-0 bg-background">
            <SpeakingSessionNavbar />
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center p-8 text-text-secondary-light">
                Loading…
              </div>
            ) : (
              <ShadowingVideoView />
            )}
          </div>
          <SpeakingSessionSidebar />
        </div>
      </div>
    </SpeakingSessionOrchestrator>
  );
}
