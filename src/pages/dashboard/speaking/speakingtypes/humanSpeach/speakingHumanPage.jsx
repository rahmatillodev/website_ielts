/**
 * Human Speaking Practice: same UI as SpeakingTaskPage (navbar, sidebar, question view).
 * No TTS; questions do NOT auto-advance — user (or admin) controls next via "Submit Recording".
 */

import React from "react";
import SpeakingSessionOrchestrator from "@/components/speaking/SpeakingSessionOrchestrator";
import SpeakingSessionNavbar from "@/components/speaking/SpeakingSessionNavbar";
import SpeakingSessionSidebar from "@/components/speaking/SpeakingSessionSidebar";
import SpeakingQuestionView from "@/components/speaking/SpeakingQuestionView";
import { useSpeakingSessionStore, getFlatQuestions } from "@/store/speakingSessionStore";
import { getHumanPartsForTest } from "./mockHuman";

export default function SpeakingHumanPage() {
  const status = useSpeakingSessionStore((s) => s.status);
  const parts = useSpeakingSessionStore((s) => s.parts);
  const totalSteps = getFlatQuestions(parts).length;
  const isLoading = totalSteps === 0 && status === "idle";

  return (
    <SpeakingSessionOrchestrator getPartsForTest={getHumanPartsForTest} mode="human">
      <div className="flex flex-col h-[calc(100vh)] bg-gray-50">
        <div className="flex flex-1 overflow-hidden min-h-0">
          <div className="flex-1 flex flex-col min-w-0 bg-background">
            <SpeakingSessionNavbar />
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center p-8 text-text-secondary-light">
                Loading…
              </div>
            ) : (
              <SpeakingQuestionView />
            )}
          </div>
          <SpeakingSessionSidebar />
        </div>
      </div>
    </SpeakingSessionOrchestrator>
  );
}
