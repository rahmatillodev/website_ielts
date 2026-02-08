/**
 * Speaking practice result page: reads persisted result from sessionStorage and displays
 * list of questions with recorded audio playback.
 */

import React, { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SPEAKING_RESULT_STORAGE_KEY } from "@/store/speakingSessionStore";

export default function SpeakingResultPage() {
  const { id: testId } = useParams();
  const navigate = useNavigate();

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
    navigate(testId ? `/speaking-practice/${testId}` : "/speaking");
  };

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-gray-600">
        <p className="mb-4">No result found. Start a speaking session first.</p>
        <button
          type="button"
          onClick={handleBack}
          className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600"
        >
          Back to Speaking
        </button>
      </div>
    );
  }

  const { recordingResults = [], completedAt } = result;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-gray-50 overflow-y-auto">
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
                <audio
                  controls
                  src={item.audioUrl}
                  className="w-full max-w-md"
                  preload="metadata"
                >
                  Your browser does not support the audio element.
                </audio>
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
