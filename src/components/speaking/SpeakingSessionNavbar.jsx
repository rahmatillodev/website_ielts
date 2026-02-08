/**
 * Top progress stepper from parts: "Part 1" → "1", "2", … → "Part 2" → "1", "2", …
 * Stretches full width; small circles and labels. Active/completed = primary, rest = outline.
 */

import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSpeakingSessionStore, getFlatQuestions } from "@/store/speakingSessionStore";

function buildRoadmapSegments(parts) {
  if (!Array.isArray(parts) || parts.length === 0) return [];
  const segments = [];
  parts.forEach((part, partIndex) => {
    segments.push({ type: "part", label: part.title || `Part ${partIndex + 1}` });
    (part.questions || []).forEach((_, qIndex) => {
      segments.push({ type: "question", label: String(qIndex + 1) });
    });
  });
  return segments;
}

function getCurrentSegmentIndex(parts, currentStep) {
  const flat = getFlatQuestions(parts);
  if (currentStep < 0 || currentStep >= flat.length) return 0;
  let segmentIndex = 0;
  let flatIndex = 0;
  for (let p = 0; p < parts.length; p++) {
    segmentIndex++; // part segment
    for (let q = 0; q < (parts[p].questions || []).length; q++) {
      if (flatIndex === currentStep) return segmentIndex;
      segmentIndex++;
      flatIndex++;
    }
  }
  return segmentIndex;
}

export default function SpeakingSessionNavbar() {
  const navigate = useNavigate();
  const { id: testId } = useParams();
  const parts = useSpeakingSessionStore((s) => s.parts);
  const currentStep = useSpeakingSessionStore((s) => s.currentStep);

  const segments = useMemo(() => buildRoadmapSegments(parts), [parts]);
  const currentSegmentIndex = useMemo(
    () => getCurrentSegmentIndex(parts, currentStep),
    [parts, currentStep]
  );
  const totalSteps = getFlatQuestions(parts).length;

  const handleBack = () => {
    navigate(testId ? `/speaking-practice/${testId}` : "/speaking");
  };

  if (totalSteps === 0 || segments.length === 0) {
    return (
      <header className="sticky top-0 z-30 flex items-center h-14 px-4 bg-white border-b border-border">
        <button type="button" onClick={handleBack} className="text-sm text-text-secondary-light hover:text-text-light">
          ← Back
        </button>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-30 flex items-center h-14 px-4 bg-white border-b border-border min-w-0">
      <button type="button" onClick={handleBack} className="shrink-0 text-sm text-text-secondary-light hover:text-text-light">
        ← Back
      </button>
      <div className="flex items-end gap-0 min-w-0 flex-1 py-2 ml-5">
        {segments.map((seg, i) => {
          const isActive = i === currentSegmentIndex;
          const isCompleted = i < currentSegmentIndex;
          return (
            <React.Fragment key={i}>
              {i > 0 && (
                <div
                  className={`h-0.5 flex-1 min-w-[6px] shrink-0 self-center ${isCompleted ? "bg-primary" : "bg-gray-300"}`}
                  aria-hidden
                />
              )}
              <div
                className="flex flex-col items-center justify-center shrink-0 gap-0.5"
                aria-current={isActive ? "step" : undefined}
              >
                <div
                  className={`h-2 w-2 rounded-full transition-colors ${
                    isActive ? "bg-primary" : isCompleted ? "bg-primary" : "bg-white border border-gray-300"
                  }`}
                />
                <span className="text-[10px] font-medium text-text-secondary-light leading-tight">
                  {seg.label}
                </span>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </header>
  );
}
