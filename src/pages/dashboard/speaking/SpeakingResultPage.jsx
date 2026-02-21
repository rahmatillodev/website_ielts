/**
 * Speaking practice result page: reads persisted result from sessionStorage and displays
 * list of questions with recorded audio playback.
 */

import React, { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SPEAKING_RESULT_STORAGE_KEY } from "@/store/speakingSessionStore";
import ConfirmModal from "@/components/modal/ConfirmModal";

export default function SpeakingResultPage() {
  const { id: testId } = useParams();
  const navigate = useNavigate();
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [durations, setDurations] = useState({});

  const result = useMemo(() => {
    try {
      const raw = sessionStorage.getItem(SPEAKING_RESULT_STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      return data;
    } catch {
      return null;
    }
  }, []);

  const handleBack = () => {
    setShowExitConfirm(true);
  };

  const handleExitConfirm = () => {
    navigate("/speaking");
    setShowExitConfirm(false);
  };

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-gray-600">
        <p className="mb-4">No result found. Start a speaking session first.</p>
        <button
          type="button"
          onClick={() => navigate("/speaking")}
          className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600"
        >
          Back to Speaking
        </button>
      </div>
    );
  }

  const { recordingResults = [], completedAt } = result;

  const formatDuration = (seconds) => {
    if (seconds == null || !Number.isFinite(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const handleLoadedMetadata = (index, e) => {
    const el = e.target;
    if (!el) return;
    const raw = el.duration;
    if (Number.isFinite(raw) && raw >= 0) {
      setDurations((prev) => ({ ...prev, [index]: raw }));
      return;
    }
    // Blob/MediaRecorder often reports Infinity until seek: set currentTime to large value, read duration on timeupdate, reset
    const onTimeUpdate = () => {
      const d = el.duration;
      el.removeEventListener("timeupdate", onTimeUpdate);
      el.currentTime = 0;
      if (Number.isFinite(d) && d >= 0) {
        setDurations((prev) => ({ ...prev, [index]: d }));
      }
    };
    el.addEventListener("timeupdate", onTimeUpdate);
    el.currentTime = 1e101;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-gray-50 overflow-y-auto">
      <ConfirmModal
        isOpen={showExitConfirm}
        onClose={() => setShowExitConfirm(false)}
        onConfirm={handleExitConfirm}
        title="Exit Test"
        description="Are you sure you want to exit? Your progress may be lost."
        cancelLabel="Stay"
        confirmLabel="Yes, Leave"
      />
      <header className="sticky top-0 z-10 flex items-center justify-between h-14 px-4 bg-white border-b border-gray-200">
        <button
          type="button"
          onClick={handleBack}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          ← Back
        </button>
        <h1 className="text-lg font-semibold">Speaking Practice — Result</h1>
        <span className="text-sm text-gray-500 w-24 text-right">
          {completedAt
            ? new Date(completedAt).toLocaleString(undefined, {
                dateStyle: "short",
                timeStyle: "short",
              })
            : ""}
        </span>
      </header>

      <main className="flex-1 p-6 max-w-2xl mx-auto w-full">
        <h2 className="text-xl font-bold mb-6">Your recordings</h2>
        <ul className="space-y-6">
          {recordingResults.map((item, index) => (
            <li
              key={item.questionId ?? index}
              className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm"
            >
              <p className="text-sm text-gray-500 mb-1">Question {index + 1}</p>
              <p className="font-medium text-gray-900 mb-3">{item.questionText}</p>
              {item.audioUrl ? (
                <div className="space-y-1">
                  {durations[index] != null && Number.isFinite(durations[index]) && (
                    <p className="text-xs text-gray-500">
                      Duration: {formatDuration(durations[index])}
                    </p>
                  )}
                  <audio
                    controls
                    src={item.audioUrl}
                    className="w-full max-w-md"
                    preload="metadata"
                    onLoadedMetadata={(e) => handleLoadedMetadata(index, e)}
                  >
                    Your browser does not support the audio element.
                  </audio>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No recording</p>
              )}
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
