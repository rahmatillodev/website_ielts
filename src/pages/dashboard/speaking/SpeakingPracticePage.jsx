import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSpeakingDetailStore } from "@/store/testStore";

const COLOR = "#2D9CDB";
const COLOR_DARK = "#1a7ab8";
const COLOR_LIGHT = "#e8f4fd";

const QUESTION_DURATION = {
  "Part 1": 30,
  "Part 2": 120,
  "Part 3": 60,
};


function buildSteps(sections) {
  const steps = [];
  sections.forEach((sec, si) => {
    steps.push({ type: "part", label: sec.label, sectionIdx: si, questionIdx: -1 });
    sec.questions.forEach((q, qi) => {
      steps.push({
        type: "question", label: String(qi + 1),
        sectionIdx: si, questionIdx: qi,
        question: q, partLabel: sec.label,
      });
    });
  });
  return steps;
}

function normalizeSpeakingSections(speakingTest) {
  const parts = Array.isArray(speakingTest?.part) ? speakingTest.part : [];
  const sortedParts = [...parts].sort((a, b) => (a?.part_number ?? 0) - (b?.part_number ?? 0));

  return sortedParts.map((part, partIdx) => {
    const partLabel = part?.title || `Part ${part?.part_number ?? partIdx + 1}`;
    const groups = Array.isArray(part?.question) ? part.question : [];
    const questions = [];

    groups.forEach((group, groupIdx) => {
      const groupQuestions = Array.isArray(group?.questions) ? group.questions : [];

      if (groupQuestions.length > 0) {
        const sortedQuestions = [...groupQuestions].sort(
          (a, b) => (a?.question_number ?? 0) - (b?.question_number ?? 0)
        );
        sortedQuestions.forEach((q, qIdx) => {
          questions.push({
            id: String(q?.id ?? `${part?.id || partIdx}-${group?.id || groupIdx}-${qIdx}`),
            question: q?.question_text || group?.question_text || "Question is not available.",
            sampleAnswer: q?.correct_answer || q?.explanation || "",
          });
        });
        return;
      }

      if (group?.question_text) {
        questions.push({
          id: String(group?.id ?? `${part?.id || partIdx}-${groupIdx}`),
          question: group.question_text,
          sampleAnswer: "",
        });
      }
    });

    return { label: partLabel, questions };
  });
}

function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "#fff", borderRadius: 20, padding: "36px 40px",
        maxWidth: 400, width: "90%", textAlign: "center",
        boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: "50%",
          background: "#fff7ed", margin: "0 auto 20px",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="28" height="28" fill="none" stroke="#f59e0b" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: "0 0 8px" }}>
          {message}
        </h3>
        <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 28px" }}>
          Your current recording will be saved.
        </p>
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={onCancel} style={{
            flex: 1, background: "#f3f4f6", color: "#374151",
            border: "none", borderRadius: 10, padding: "12px 0",
            fontWeight: 600, fontSize: 14, cursor: "pointer",
          }}>Cancel</button>
          <button onClick={onConfirm} style={{
            flex: 1, background: COLOR, color: "#fff",
            border: "none", borderRadius: 10, padding: "12px 0",
            fontWeight: 600, fontSize: 14, cursor: "pointer",
          }}>Yes, leave</button>
        </div>
      </div>
    </div>
  );
}

export default function SpeakingPracticePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const getSpeakingTest = useSpeakingDetailStore((state) => state.get);

  const [sections, setSections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [qStepIdx, setQStepIdx] = useState(0);
  const [status, setStatus] = useState("listen");
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [modal, setModal] = useState(null);
  const [viewMode, setViewMode] = useState("sample");
  const [sampleQuestionFlatIndex, setSampleQuestionFlatIndex] = useState(0);

  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const rafRef = useRef(null);
  const timerRef = useRef(null);
  const canvasRef = useRef(null);
  const recordingsRef = useRef([]);
  const goNextRef = useRef(null);
  const steps = buildSteps(sections);
  const questionSteps = steps.filter((s) => s.type === "question");

  const currentQStep = questionSteps[qStepIdx];
  const currentQuestion = currentQStep?.question;
  const currentPartLabel = currentQStep?.partLabel || "Part 1";
  const qDuration = QUESTION_DURATION[currentPartLabel] || 30;

  // Active step index for dots styling
  const activeStepsIdx = steps.findIndex(
    (s) =>
      s.type === "question" &&
      s.sectionIdx === currentQStep?.sectionIdx &&
      s.questionIdx === currentQStep?.questionIdx
  );

  const stopAll = () => {
    clearInterval(timerRef.current);
    cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  };

  const saveAndThen = useCallback((callback) => {
    stopAll();
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (currentQuestion) {
          recordingsRef.current.push({
            questionId: currentQuestion.id,
            question: currentQuestion.question,
            partLabel: currentQStep.partLabel,
            blob,
          });
        }
        callback();
      };
      recorderRef.current.stop();
    } else {
      callback();
    }
  }, [currentQuestion, currentQStep]);

  const goNext = useCallback(() => {
    saveAndThen(() => {
      const next = qStepIdx + 1;
      if (next >= questionSteps.length) {
        window.speechSynthesis.cancel();
        navigate(`/speaking-result/${id}`, { state: { recordings: recordingsRef.current } });
      } else {
        setQStepIdx(next);
        setStatus("listen");
      }
    });
  }, [qStepIdx, questionSteps.length, saveAndThen, navigate, id]);

  useEffect(() => { goNextRef.current = goNext; }, [goNext]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setIsLoading(true);
      setLoadError("");
      const result = await getSpeakingTest(id);
      if (!mounted) return;

      if (result?.error || !result?.data) {
        setLoadError(result?.error || "Failed to load speaking test.");
        setSections([]);
        setIsLoading(false);
        return;
      }

      const mappedSections = normalizeSpeakingSections(result.data);
      setSections(mappedSections);
      setQStepIdx(0);
      setSampleQuestionFlatIndex(0);
      setIsLoading(false);
    };

    if (id) load();
    return () => {
      mounted = false;
    };
  }, [getSpeakingTest, id]);

  const startRecordingPhase = useCallback(async () => {
    setSecondsLeft(qDuration);
    setStatus("recording");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);

      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.start();

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        const bufferLength = analyser.frequencyBinCount;
        const render = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArrayRef.current);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const bw = (canvas.width / bufferLength) * 3;
          let x = 0;
          for (let i = 0; i < bufferLength; i++) {
            const bh = (dataArrayRef.current[i] / 255) * canvas.height;
            ctx.fillStyle = COLOR;
            ctx.fillRect(x, canvas.height - bh, bw - 1, bh);
            x += bw;
          }
          rafRef.current = requestAnimationFrame(render);
        };
        render();
      }

      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            goNextRef.current && goNextRef.current();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Mic error:", err);
    }
  }, [qDuration]);

  const speakAndRecord = useCallback((text) => {
    if (!window.speechSynthesis) { startRecordingPhase(); return; }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const enVoice =
      voices.find((v) => v.lang === "en-GB" || v.lang === "en-US") ||
      voices.find((v) => v.lang.startsWith("en"));
    if (enVoice) utter.voice = enVoice;
    utter.lang = "en-US";
    utter.rate = 0.9;
    utter.onend = () => startRecordingPhase();
    window.speechSynthesis.speak(utter);
  }, [startRecordingPhase]);

  useEffect(() => {
    if (viewMode !== "practice") return;
    setStatus("listen");
    if (!currentQuestion) return;
    const speak = () => speakAndRecord(currentQuestion.question);
    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = speak;
    } else {
      speak();
    }
    return () => { window.speechSynthesis.cancel(); stopAll(); };
  }, [qStepIdx, viewMode]);

  useEffect(() => {
    if (viewMode !== "practice") {
      window.speechSynthesis.cancel();
      stopAll();
    }
  }, [viewMode]);

  const handleModalConfirm = () => {
    const type = modal;
    setModal(null);
    window.speechSynthesis.cancel();
    if (type === "back") {
      saveAndThen(() => navigate("/speaking-library"));
    } else {
      saveAndThen(() =>
        navigate(`/speaking-result/${id}`, { state: { recordings: recordingsRef.current } })
      );
    }
  };

  const displayTime = `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`;

  const sampleStep = questionSteps[sampleQuestionFlatIndex];
  const sampleAnswerText = sampleStep?.question?.sampleAnswer || "";
  const sampleActiveStepsIdx =
    sampleStep
      ? steps.findIndex(
          (s) =>
            s.type === "question" &&
            s.sectionIdx === sampleStep.sectionIdx &&
            s.questionIdx === sampleStep.questionIdx
        )
      : -1;

  const handleSampleStepClick = (step) => {
    if (step.type === "part") {
      const fi = questionSteps.findIndex((q) => q.sectionIdx === step.sectionIdx);
      if (fi >= 0) setSampleQuestionFlatIndex(fi);
      return;
    }
    const fi = questionSteps.findIndex(
      (q) => q.sectionIdx === step.sectionIdx && q.questionIdx === step.questionIdx
    );
    if (fi >= 0) setSampleQuestionFlatIndex(fi);
  };

  const renderSampleMode = () => (
    <>
      <header style={{
        borderBottom: "1px solid #f0f0f0",
        padding: "12px 24px 10px",
        background: "#fff",
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
          alignItems: "center",
          columnGap: 16,
        }}>
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <button
              type="button"
              onClick={() => navigate("/speaking-library")}
              style={{
                background: COLOR, color: "#fff", border: "none",
                borderRadius: 8, padding: "7px 14px",
                fontWeight: 600, fontSize: 13, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = COLOR_DARK}
              onMouseLeave={(e) => e.currentTarget.style.background = COLOR}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
          </div>
          <button
            type="button"
            onClick={() => setViewMode("practice")}
            style={{
              background: COLOR, color: "#fff", border: "none",
              borderRadius: 8, padding: "7px 14px",
              fontWeight: 600, fontSize: 13, cursor: "pointer",
              flexShrink: 0,
              justifySelf: "center",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = COLOR_DARK}
            onMouseLeave={(e) => e.currentTarget.style.background = COLOR}
          >
            Try Your Self
          </button>
          <div aria-hidden="true" />
        </div>
      </header>

      <div style={{
        display: "flex",
        justifyContent: "center",
        borderBottom: "1px solid #e5e7eb",
        padding: "12px 24px 14px",
        background: "#fff",
        flexShrink: 0,
      }}>
        <div style={{ width: "100%", maxWidth: 1100, position: "relative" }}>
          <div style={{
            position: "absolute", top: 9, left: 0, right: 0,
            height: 2, background: "#e5e7eb", zIndex: 0,
          }} />
          <div style={{ position: "relative", display: "flex", alignItems: "flex-start" }}>
            {steps.map((step, si) => {
              const isPast = si < sampleActiveStepsIdx;
              const isActive = si === sampleActiveStepsIdx;
              const isPartType = step.type === "part";
              return (
                <button
                  key={si}
                  type="button"
                  onClick={() => handleSampleStepClick(step)}
                  style={{
                    position: "relative", zIndex: 2,
                    display: "flex", flexDirection: "column", alignItems: "center",
                    flex: 1,
                    border: "none", background: "transparent",
                    padding: 0, margin: 0, cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  <div style={{
                    width: 20, height: 20, borderRadius: "50%",
                    border: `2px solid ${isActive || isPast ? COLOR : "#d1d5db"}`,
                    background: isPast ? COLOR : "#fff",
                    boxShadow: isActive ? `0 0 0 4px ${COLOR_LIGHT}` : "none",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    marginBottom: 4, transition: "all 0.3s",
                  }}>
                    {isPast && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.8"
                          strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span style={{
                    fontSize: 11,
                    fontWeight: isPartType || isActive ? 700 : 500,
                    color: isActive ? COLOR : isPast ? COLOR : "#9ca3af",
                    whiteSpace: "nowrap",
                  }}>
                    {step.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          justifyContent: "flex-start", padding: "40px 48px 48px", minWidth: 0,
        }}>
          <span style={{ color: COLOR, fontWeight: 700, fontSize: 14, marginBottom: 8, display: "block" }}>
            {sampleStep?.partLabel || ""}
          </span>
          <h1 style={{ color: "#111827", fontSize: 26, fontWeight: 600, lineHeight: 1.6, margin: 0, maxWidth: 720 }}>
            {sampleStep?.question?.question || ""}
          </h1>
        </div>

        <div style={{
          width: "42%",
          minWidth: 320,
          borderLeft: "1px solid #f0f0f0",
          background: "#fff",
          display: "flex",
          flexDirection: "column",
          padding: "40px 32px 32px",
          gap: 20,
          minHeight: 0,
        }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: COLOR, margin: 0 }}>
            Sample Answer
          </h3>
          <div style={{
            flex: 1,
            minHeight: 200,
            padding: "16px 18px",
            borderRadius: 12,
            border: `1px solid ${COLOR_LIGHT}`,
            background: "#f8fcfe",
            color: "#374151",
            fontSize: 15,
            lineHeight: 1.65,
            overflowY: "auto",
            whiteSpace: "pre-wrap",
          }}>
            {sampleAnswerText}
          </div>
          <button
            type="button"
            onClick={() =>
              setSampleQuestionFlatIndex((i) =>
                questionSteps.length ? (i + 1) % questionSteps.length : 0
              )
            }
            style={{
              width: "100%",
              background: COLOR,
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "14px 0",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              boxShadow: `0 4px 16px ${COLOR_LIGHT}`,
              marginTop: "auto",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = COLOR_DARK}
            onMouseLeave={(e) => e.currentTarget.style.background = COLOR}
          >
            Next Question
          </button>
        </div>
      </div>
    </>
  );

  const renderPracticeMode = () => (
    <>
      {modal && (
        <ConfirmModal
          message={modal === "back" ? "Are you sure you want to leave?" : "Are you sure you want to finish?"}
          onConfirm={handleModalConfirm}
          onCancel={() => setModal(null)}
        />
      )}

      <header style={{
        borderBottom: "1px solid #f0f0f0",
        padding: "12px 24px 10px",
        background: "#fff",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>

          <button
            onClick={() => setModal("back")}
            style={{
              background: COLOR, color: "#fff", border: "none",
              borderRadius: 8, padding: "7px 14px",
              fontWeight: 600, fontSize: 13, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = COLOR_DARK}
            onMouseLeave={(e) => e.currentTarget.style.background = COLOR}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          <div style={{ flex: 1, position: "relative" }}>
            <div style={{
              position: "absolute", top: 9, left: 0, right: 0,
              height: 2, background: "#e5e7eb", zIndex: 0,
            }} />

            <div style={{ position: "relative", display: "flex", alignItems: "flex-start" }}>
              {steps.map((step, si) => {
                const isPast = si < activeStepsIdx;
                const isActive = si === activeStepsIdx;
                const isPartType = step.type === "part";
                return (
                  <div key={si} style={{
                    position: "relative", zIndex: 2,
                    display: "flex", flexDirection: "column", alignItems: "center",
                    flex: 1,
                  }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: "50%",
                      border: `2px solid ${isActive || isPast ? COLOR : "#d1d5db"}`,
                      background: isPast ? COLOR : "#fff",
                      boxShadow: isActive ? `0 0 0 4px ${COLOR_LIGHT}` : "none",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      marginBottom: 4, transition: "all 0.3s",
                    }}>
                      {isPast && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.8"
                            strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span style={{
                      fontSize: 11,
                      fontWeight: isPartType || isActive ? 700 : 500,
                      color: isActive ? COLOR : isPast ? COLOR : "#9ca3af",
                      whiteSpace: "nowrap",
                    }}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </header>

      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          justifyContent: "flex-start", padding: "40px 72px 48px",
        }}>
          <span style={{ color: COLOR, fontWeight: 700, fontSize: 18, marginBottom: 16, display: "block" }}>
            Question {qStepIdx + 1}
          </span>
          <h1 style={{ color: "#111827", fontSize: 28, fontWeight: 600, lineHeight: 1.6, margin: 0, maxWidth: 700 }}>
            {currentQuestion?.question || ""}
          </h1>
        </div>

        <div style={{
          width: 310, borderLeft: "1px solid #f0f0f0", background: "#fff",
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", padding: "32px 24px", gap: 20,
        }}>
          <div style={{
            width: 76, height: 76, borderRadius: "50%",
            background: status === "recording" ? COLOR_LIGHT : "#f3f4f6",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="34" height="34" viewBox="0 0 24 24" fill={status === "recording" ? COLOR : "#9ca3af"}>
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
          </div>

          <div style={{ textAlign: "center" }}>
            <h3 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: "0 0 6px" }}>
              {status === "recording" ? "Recording" : "Listen"}
            </h3>
            <p style={{ fontSize: 13, color: "#9ca3af", margin: 0, lineHeight: 1.5 }}>
              {status === "recording"
                ? "Speak your answer clearly into the microphone."
                : "The examiner is reading the question..."}
            </p>
          </div>

          {status === "recording" && (
            <div style={{ fontSize: 50, fontWeight: 800, fontFamily: "monospace", color: "#111827", letterSpacing: 3 }}>
              {displayTime}
            </div>
          )}

          {status === "recording" && (
            <div style={{
              width: "100%", height: 50, background: "#f9fafb",
              borderRadius: 12, overflow: "hidden", border: "1px solid #f0f0f0",
            }}>
              <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} width={262} height={50} />
            </div>
          )}

          {status === "recording" && (
            <button
              onClick={goNext}
              style={{
                width: "100%", background: COLOR, color: "#fff",
                border: "none", borderRadius: 12, padding: "15px 0",
                fontWeight: 700, fontSize: 14, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                boxShadow: `0 4px 16px ${COLOR_LIGHT}`,
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = COLOR_DARK}
              onMouseLeave={(e) => e.currentTarget.style.background = COLOR}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
              Submit Recording
            </button>
          )}

          <button
            onClick={() => setModal("finish")}
            style={{
              width: "100%", background: "#b91c1c", color: "#fff",
              border: "none", borderRadius: 12, padding: "13px 0",
              fontWeight: 600, fontSize: 13, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "#991b1b"}
            onMouseLeave={(e) => e.currentTarget.style.background = "#b91c1c"}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2" />
            </svg>
            Finish Exam
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div style={{
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      height: "100vh", display: "flex", flexDirection: "column",
      background: "#fff", overflow: "hidden",
    }}>
      {isLoading && (
        <div style={{ margin: "auto", color: "#6b7280", fontSize: 16 }}>Loading speaking test...</div>
      )}
      {!isLoading && loadError && (
        <div style={{ margin: "auto", textAlign: "center", color: "#b91c1c" }}>
          <p>{loadError}</p>
          <button
            type="button"
            onClick={() => navigate("/speaking-library")}
            style={{
              marginTop: 12,
              background: COLOR,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "8px 14px",
              cursor: "pointer",
            }}
          >
            Back to library
          </button>
        </div>
      )}
      {!isLoading && !loadError && questionSteps.length === 0 && (
        <div style={{ margin: "auto", textAlign: "center", color: "#6b7280" }}>
          <p>No speaking questions were found for this test.</p>
          <button
            type="button"
            onClick={() => navigate("/speaking-library")}
            style={{
              marginTop: 12,
              background: COLOR,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "8px 14px",
              cursor: "pointer",
            }}
          >
            Back to library
          </button>
        </div>
      )}
      {!isLoading && !loadError && questionSteps.length > 0 && viewMode === "sample" && renderSampleMode()}
      {!isLoading && !loadError && questionSteps.length > 0 && viewMode === "practice" && renderPracticeMode()}
    </div>
  );
}