import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";

/**
 
 */
const mockSpeakingQuestions = [
  {
    id: uuidv4(),
    question: "What is your favorite hobby?",
  },
  {
    id: uuidv4(),
    question: "Do you like traveling? Why or why not?",
  },
  {
    id: uuidv4(),
    question: "Describe your hometown.",
  },
];

const SpeakingPracticePage = () => {
  const { id } = useParams(); // speaking test id
  const navigate = useNavigate();

  /* =========================================================
   * EQUIPMENT CHECK OVERLAY (renders INSIDE this page)
   * - Shows immediately when SpeakingPracticePage opens
   * - Blocks interaction with the speaking UI behind it
   * - Disables body scroll while open
   * - Includes recording + live voice visualization (Web Audio API)
   * ========================================================= */
  const EQUIPMENT_BLUE = "#2D9CDB";
  const [showEquipmentCheck, setShowEquipmentCheck] = useState(true);
  const [deviceType, setDeviceType] = useState("Device");

  const [microphones, setMicrophones] = useState([]);
  const [speakers, setSpeakers] = useState([]);
  const [selectedMicId, setSelectedMicId] = useState("");
  const [selectedSpeakerId, setSelectedSpeakerId] = useState("");

  const [permissionError, setPermissionError] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  const [readyChecked, setReadyChecked] = useState(false);
  const [isEquipmentOpenAnimating, setIsEquipmentOpenAnimating] = useState(false);

  // Dropdown open state (custom overlay menus so modal never resizes)
  const [isMicMenuOpen, setIsMicMenuOpen] = useState(false);
  const [isSpeakerMenuOpen, setIsSpeakerMenuOpen] = useState(false);
  const micMenuWrapRef = useRef(null);
  const speakerMenuWrapRef = useRef(null);

  // Recording refs
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);

  // Audio visualization refs (Web Audio API)
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const rafRef = useRef(null);
  const canvasRef = useRef(null);

  const canStartExam = useMemo(() => {
    // Checkbox only becomes visible after recording, so this naturally enforces flow.
    return !!audioUrl && readyChecked && !isRecording;
  }, [audioUrl, readyChecked, isRecording]);

  const selectedMicLabel = useMemo(() => {
    const d = microphones.find((x) => x.deviceId === selectedMicId);
    if (!d) return "Select microphone";
    return d.label || (d.deviceId === "default" ? "Default Microphone" : "Microphone");
  }, [microphones, selectedMicId]);

  const selectedSpeakerLabel = useMemo(() => {
    const d = speakers.find((x) => x.deviceId === selectedSpeakerId);
    if (!d) return "Select speaker";
    return d.label || (d.deviceId === "default" ? "Default Speaker" : "Speaker");
  }, [speakers, selectedSpeakerId]);

  const detectDeviceType = () => {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
    if (/Macintosh|Mac OS X/i.test(ua)) return "MacBook";
    if (/Windows/i.test(ua)) return "Windows PC";
    return "Device";
  };

  const pickDefaultDeviceId = (devices, kind) => {
    const list = devices.filter((d) => d.kind === kind);
    if (list.length === 0) return "";
    const defaultDevice = list.find((d) => d.deviceId === "default");
    return (defaultDevice || list[0]).deviceId || "";
  };

  const stopVisualizationLoop = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const closeAudioContext = async () => {
    const ctx = audioContextRef.current;
    audioContextRef.current = null;
    analyserRef.current = null;
    dataArrayRef.current = null;
    if (!ctx) return;
    try {
      await ctx.close();
    } catch {
      // ignore
    }
  };

  const stopStreamTracks = () => {
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }
    streamRef.current = null;
  };

  const cleanupRecording = async () => {
    // Stop recorder if needed (prevents memory leaks / mic lock)
    const recorder = recorderRef.current;
        if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        // ignore
      }
    }
    recorderRef.current = null;
    chunksRef.current = [];

    stopVisualizationLoop();
    stopStreamTracks();
    await closeAudioContext();
    setIsRecording(false);
  };

  const refreshDevices = async () => {
    if (!navigator?.mediaDevices?.enumerateDevices) return;
    const devices = await navigator.mediaDevices.enumerateDevices();
    const mics = devices.filter((d) => d.kind === "audioinput");
    const outs = devices.filter((d) => d.kind === "audiooutput");

    setMicrophones(mics);
    setSpeakers(outs);

    setSelectedMicId((prev) => prev || pickDefaultDeviceId(devices, "audioinput"));
    setSelectedSpeakerId((prev) => prev || pickDefaultDeviceId(devices, "audiooutput"));
  };

  const ensureCanvasSized = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const { clientWidth, clientHeight } = canvas;
    const nextW = Math.max(1, Math.floor(clientWidth * dpr));
    const nextH = Math.max(1, Math.floor(clientHeight * dpr));
    if (canvas.width !== nextW) canvas.width = nextW;
    if (canvas.height !== nextH) canvas.height = nextH;
  };

  const drawVisualizerFrame = () => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas) {
      rafRef.current = requestAnimationFrame(drawVisualizerFrame);
      return;
    }

    ensureCanvasSized();
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      rafRef.current = requestAnimationFrame(drawVisualizerFrame);
      return;
    }

    const w = canvas.width;
    const h = canvas.height;

    // Background (keep subtle, IELTS-like)
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(45,156,219,0.08)";
    ctx.fillRect(0, 0, w, h);

    // If analyser isn't ready yet, show an idle baseline
    if (!analyser || !dataArrayRef.current) {
      ctx.strokeStyle = "rgba(45,156,219,0.55)";
      ctx.lineWidth = Math.max(1, Math.floor(w * 0.002));
      ctx.beginPath();
      ctx.moveTo(0, h * 0.62);
      ctx.lineTo(w, h * 0.62);
      ctx.stroke();
      rafRef.current = requestAnimationFrame(drawVisualizerFrame);
      return;
    }

    // Voice activity bars (reacts to mic input)
    const data = dataArrayRef.current;
    analyser.getByteFrequencyData(data);

    const bars = 28; // fixed number = stable layout
    const gap = Math.max(2, Math.floor(w * 0.005));
    const barW = Math.max(3, Math.floor((w - gap * (bars - 1)) / bars));

    for (let i = 0; i < bars; i++) {
      const idx = Math.floor((i / bars) * data.length);
      const v = data[idx] / 255; // 0..1
      const barH = Math.max(3, Math.floor(v * h * 0.95));
      const x = i * (barW + gap);
      const y = h - barH;

      ctx.fillStyle = "rgba(45,156,219,0.95)";
      // rounded bars (manual)
      const r = Math.min(8, Math.floor(barW / 2));
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + barW - r, y);
      ctx.quadraticCurveTo(x + barW, y, x + barW, y + r);
      ctx.lineTo(x + barW, y + barH - r);
      ctx.quadraticCurveTo(x + barW, y + barH, x + barW - r, y + barH);
      ctx.lineTo(x + r, y + barH);
      ctx.quadraticCurveTo(x, y + barH, x, y + barH - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      ctx.fill();
    }

    rafRef.current = requestAnimationFrame(drawVisualizerFrame);
  };

  /* ---------------- Equipment Check: lifecycle & safety ---------------- */
  useEffect(() => {
    setDeviceType(detectDeviceType());
    refreshDevices().catch(() => {});

    const onDeviceChange = () => refreshDevices().catch(() => {});
    if (navigator?.mediaDevices?.addEventListener) {
      navigator.mediaDevices.addEventListener("devicechange", onDeviceChange);
    } else if (navigator?.mediaDevices) {
      navigator.mediaDevices.ondevicechange = onDeviceChange;
    }

    return () => {
      if (navigator?.mediaDevices?.removeEventListener) {
        navigator.mediaDevices.removeEventListener("devicechange", onDeviceChange);
      } else if (navigator?.mediaDevices) {
        navigator.mediaDevices.ondevicechange = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Open animation (subtle scale + fade)
  useEffect(() => {
    if (!showEquipmentCheck) return;
    setIsEquipmentOpenAnimating(false);
    const t = setTimeout(() => setIsEquipmentOpenAnimating(true), 10);
    return () => clearTimeout(t);
  }, [showEquipmentCheck]);

  // Close dropdown menus on outside click / ESC (keeps modal stable)
  useEffect(() => {
    if (!showEquipmentCheck) return;

    const onPointerDown = (e) => {
      const micWrap = micMenuWrapRef.current;
      const spWrap = speakerMenuWrapRef.current;
      if (micWrap && !micWrap.contains(e.target)) setIsMicMenuOpen(false);
      if (spWrap && !spWrap.contains(e.target)) setIsSpeakerMenuOpen(false);
    };

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsMicMenuOpen(false);
        setIsSpeakerMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [showEquipmentCheck]);

  // Disable body scroll while overlay is open (prevents layout jump/overflow)
  useEffect(() => {
    if (!showEquipmentCheck) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showEquipmentCheck]);

  // Cleanup any active media resources on unmount (no leaks)
  useEffect(() => {
    return () => {
      stopVisualizationLoop();
      stopStreamTracks();
      closeAudioContext();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- Equipment Check: recording logic ---------------- */
  const startRecording = async () => {
    setPermissionError("");
    setReadyChecked(false);

    // Replace any previous recording
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl("");
    }

    await cleanupRecording();

    if (!navigator?.mediaDevices?.getUserMedia) {
      setPermissionError("Microphone is not supported in this browser.");
      return;
    }

    try {
      const constraints = {
        audio: selectedMicId
          ? {
              deviceId:
                selectedMicId === "default" ? undefined : { exact: selectedMicId },
            }
          : true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // After permission, device labels become available
      refreshDevices().catch(() => {});

      // --- Audio visualization setup (Web Audio API) ---
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContextCtor();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.85;
      source.connect(analyser);

      analyserRef.current = analyser;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);

      // --- Recording setup (MediaRecorder) ---
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        try {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);
        } catch {
          setPermissionError("Could not create audio preview. Please try again.");
        } finally {
          // Stop mic usage after recording stops (privacy & performance)
          stopStreamTracks();
          closeAudioContext();
          setIsRecording(false);
        }
      };

      recorder.onerror = () => {
        setPermissionError("Recording failed. Please try again.");
        stopStreamTracks();
        closeAudioContext();
        setIsRecording(false);
      };

      recorder.start();
      setIsRecording(true);

      // Start visualizer loop AFTER refs are ready
      stopVisualizationLoop();
      rafRef.current = requestAnimationFrame(drawVisualizerFrame);
    } catch (err) {
      await cleanupRecording();
      setPermissionError(
        err?.name === "NotAllowedError"
          ? "Microphone permission was denied. Please allow access and try again."
          : "Could not access microphone. Please check your device settings."
      );
    }
  };

  const stopRecording = () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    try {
      recorder.stop();
      // Keep last drawn waveform visible (static is fine)
      stopVisualizationLoop();
    } catch {
      setPermissionError("Could not stop recording. Please try again.");
    }
  };

  const [activeQuestion, setActiveQuestion] = useState(
    mockSpeakingQuestions[0]
  );
  const [answer, setAnswer] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);

  // 🔊 TEXT → SPEECH (Browser API, error chiqarmaydi)
  const readAnswerAloud = () => {
    if (!answer.trim()) return;

    // Agar oldingi ovoz bo‘lsa to‘xtat
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(answer);
    utterance.lang = "en-US";
    utterance.rate = 1;
    utterance.pitch = 1;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  return (
    <>
      {/* Equipment check only. Exam is at /speaking-practice/:id/session (Start Exam navigates there). */}
      {/* Legacy UI (kept): do NOT render during Equipment Check. */}
      {!showEquipmentCheck ? (
        <div className="flex h-[calc(100vh-64px)] p-4 gap-4 bg-gray-50">
          {/* LEFT — QUESTIONS */}
          <div className="w-1/3 bg-white border rounded-xl p-4 overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">Speaking Questions</h2>

            <div className="flex flex-col gap-2">
              {mockSpeakingQuestions.map((q) => {
                const isActive = q.id === activeQuestion.id;
                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      setActiveQuestion(q);
                      setAnswer("");
                    }}
                    className={`text-left p-3 rounded-lg border transition-all ${
                      isActive
                        ? "bg-blue-50 border-blue-500 font-semibold"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    {q.question}
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT — ANSWER */}
          <div className="flex-1 bg-white border rounded-xl p-4 flex flex-col">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-bold">Your Answer</h2>
              <button
                onClick={() => navigate(-1)}
                className="text-sm text-gray-500 hover:text-black"
              >
                ← Back
              </button>
            </div>

            <p className="text-gray-700 mb-3">
              <span className="font-semibold">Question:</span>{" "}
              {activeQuestion.question}
            </p>

            <textarea
              className="flex-1 resize-none border rounded-lg p-4 outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Type your answer here..."
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
            />

            <div className="flex justify-between items-center mt-4">
              <span className="text-sm text-gray-500">
                Words: {answer.trim() ? answer.trim().split(/\s+/).length : 0}
              </span>

              <button
                onClick={readAnswerAloud}
                disabled={!answer.trim()}
                className={`px-4 py-2 rounded-lg text-white font-semibold transition-all ${
                  isSpeaking
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {isSpeaking ? "Reading..." : "▶ Read My Answer"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* =========================================================
          EQUIPMENT CHECK OVERLAY UI (modal-style)
          - Covers the page content area only (keeps the main header visible)
          - Blocks background interaction until user completes equipment check
         ========================================================= */}
      {showEquipmentCheck ? (
        <div
          /* Background interaction is blocked because this fixed overlay sits above the page. */
          /* Strong dark overlay keeps the speaking page unreadable behind the modal. */
          className={`fixed inset-0 z-[2147483647] pointer-events-auto px-3 py-4
            flex items-center justify-center transition-opacity duration-200 ease-out
            ${
              isEquipmentOpenAnimating
                ? "opacity-100 bg-black/85 backdrop-blur-sm"
                : "opacity-0 bg-black/85 backdrop-blur-sm"
            }`}
            role="dialog"
            aria-modal="true"
            
        >
          {/* Modal size is controlled here: compact width + padding, no internal scrolling. */}
          <div
            /* Modal size is LOCKED:
               - fixed max width (`max-w-lg`) for a balanced, not-tiny card
               - fixed height (bounded by viewport) so buttons never clip off-screen
               - `overflow-hidden` so nothing forces resizing */
            className={`w-full max-w-lg h-[min(600px,calc(100vh-32px))] bg-white rounded-3xl shadow-[0_18px_55px_rgba(0,0,0,0.35)] border border-gray-100 overflow-hidden transform transition-all duration-200 ease-out ${
              isEquipmentOpenAnimating ? "opacity-100 scale-100" : "opacity-0 scale-95"
            }`}
          >
            <div className="px-5 sm:px-6 py-5 sm:py-6 h-full flex flex-col">
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 text-center">
                Equipment Check
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-gray-600 text-center">
                Let’s make sure your microphone and speakers are ready for the test.
              </p>

              {/* DEVICE INFO */}
              <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 flex items-center justify-between">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Device
                </div>
                <div className="text-xs sm:text-sm font-semibold text-gray-900">
                  {deviceType}
                </div>
              </div>

              {/* MICROPHONE & SPEAKER SELECTORS
                  Dropdowns do NOT resize the modal because the option lists are rendered as
                  absolutely-positioned overlay menus (not normal-flow content). */}
              <div className="mt-3 space-y-3">
                {/* Microphone dropdown (overlay menu) */}
                <div className="space-y-1.5" ref={micMenuWrapRef}>
                  <div className="text-sm font-semibold text-gray-900">Microphone</div>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSpeakerMenuOpen(false);
                        setIsMicMenuOpen((v) => !v);
                      }}
                      className="w-full h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm text-left outline-none focus:ring-2 focus:ring-[rgba(45,156,219,0.25)] focus:border-[rgba(45,156,219,0.55)] flex items-center justify-between gap-3"
                    >
                      <span className="truncate text-gray-900">{selectedMicLabel}</span>
                      <span className="text-gray-400 text-xs">▾</span>
                    </button>

                    {isMicMenuOpen ? (
                      <div className="absolute left-0 right-0 mt-2 z-50 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                        <div className="max-h-48 overflow-auto">
                          {microphones.length === 0 ? (
                            <button
                              type="button"
                              className="w-full px-3 py-2 text-left text-sm text-gray-500"
                              onClick={() => setIsMicMenuOpen(false)}
                            >
                              No microphones found
                            </button>
                          ) : (
                            microphones.map((d, idx) => (
                              <button
                                type="button"
                                key={`${d.deviceId}-${idx}`}
                                onClick={() => {
                                  setSelectedMicId(d.deviceId);
                                  setIsMicMenuOpen(false);
                                }}
                                className={`w-full px-3 py-2 text-left text-sm hover:bg-[rgba(45,156,219,0.08)] ${
                                  d.deviceId === selectedMicId ? "bg-[rgba(45,156,219,0.12)]" : ""
                                }`}
                              >
                                <span className="block truncate text-gray-900">
                                  {d.label ||
                                    (d.deviceId === "default"
                                      ? "Default Microphone"
                                      : "Microphone")}
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Speaker dropdown (overlay menu) */}
                <div className="space-y-1.5" ref={speakerMenuWrapRef}>
                  <div className="text-sm font-semibold text-gray-900">Speaker</div>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMicMenuOpen(false);
                        setIsSpeakerMenuOpen((v) => !v);
                      }}
                      className="w-full h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm text-left outline-none focus:ring-2 focus:ring-[rgba(45,156,219,0.25)] focus:border-[rgba(45,156,219,0.55)] flex items-center justify-between gap-3"
                    >
                      <span className="truncate text-gray-900">{selectedSpeakerLabel}</span>
                      <span className="text-gray-400 text-xs">▾</span>
                    </button>

                    {isSpeakerMenuOpen ? (
                      <div className="absolute left-0 right-0 mt-2 z-50 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                        <div className="max-h-48 overflow-auto">
                          {speakers.length === 0 ? (
                            <button
                              type="button"
                              className="w-full px-3 py-2 text-left text-sm text-gray-500"
                              onClick={() => setIsSpeakerMenuOpen(false)}
                            >
                              Default speaker
                            </button>
                          ) : (
                            speakers.map((d, idx) => (
                              <button
                                type="button"
                                key={`${d.deviceId}-${idx}`}
                                onClick={() => {
                                  setSelectedSpeakerId(d.deviceId);
                                  setIsSpeakerMenuOpen(false);
                                }}
                                className={`w-full px-3 py-2 text-left text-sm hover:bg-[rgba(45,156,219,0.08)] ${
                                  d.deviceId === selectedSpeakerId ? "bg-[rgba(45,156,219,0.12)]" : ""
                                }`}
                              >
                                <span className="block truncate text-gray-900">
                                  {d.label ||
                                    (d.deviceId === "default"
                                      ? "Default Speaker"
                                      : "Speaker")}
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* RECORDING CHECK */}
                <div className="rounded-xl border border-gray-200 bg-white px-3 py-3">
                  <div className="text-sm font-semibold text-gray-900">Recording</div>

                  {permissionError ? (
                    <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {permissionError}
                    </div>
                  ) : null}

                  {/* Recording state controls UI:
                      - Waveform is hidden by default to keep the modal small/compact.
                      - Waveform is shown ONLY while recording (after user clicks Start Recording).
                      - After recording stops, waveform hides and audio preview appears. */}
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={isRecording ? stopRecording : startRecording}
                      className="w-full h-10 rounded-xl text-sm font-semibold text-white transition"
                      style={{ backgroundColor: EQUIPMENT_BLUE }}
                    >
                      {isRecording ? "Stop Recording" : "Start Recording"}
                    </button>
                  </div>

                  {/* LIVE VOICE LEVEL VISUALIZATION (Web Audio API)
                      Hidden unless recording to avoid empty/inactive UI taking space. */}
                  {isRecording ? (
                    <div className="mt-2 rounded-xl border border-gray-200 bg-white overflow-hidden">
                      <canvas
                        ref={canvasRef}
                        className="w-full h-12"
                        aria-label="Microphone activity visualizer"
                      />
                    </div>
                  ) : null}

                  {/* AFTER RECORDING: audio playback + checkbox */}
                  {!isRecording && audioUrl ? (
                    <div className="mt-3 space-y-2.5">
                      <audio
                        controls
                        className="w-full"
                        ref={(el) => {
                          if (!el) return;
                          // Best-effort output device selection (supported on some browsers only)
                          if (typeof el.setSinkId === "function" && selectedSpeakerId) {
                            el.setSinkId(selectedSpeakerId).catch(() => {});
                          }
                        }}
                        src={audioUrl}
                      />

                      <label className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={readyChecked}
                          onChange={(e) => setReadyChecked(e.target.checked)}
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-[rgb(45,156,219)] focus:ring-[rgba(45,156,219,0.25)]"
                        />
                        <span className="text-sm text-gray-700 leading-snug">
                          I’m sure that microphone and speakers are ready.
                        </span>
                      </label>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* ACTIONS: Cancel / Start Exam */}
              <div className="mt-auto pt-4 flex gap-2.5">
                <button
                  type="button"
                  onClick={async () => {
                    // Where the user can safely exit without affecting speaking logic
                    await cleanupRecording();
                    setIsMicMenuOpen(false);
                    setIsSpeakerMenuOpen(false);
                    if (audioUrl) {
                      URL.revokeObjectURL(audioUrl);
                      setAudioUrl("");
                    }
                    navigate(-1);
                  }}
                  className="flex-1 h-10 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={!canStartExam}
                  onClick={async () => {
                    await cleanupRecording();
                    setIsMicMenuOpen(false);
                    setIsSpeakerMenuOpen(false);
                    if (audioUrl) {
                      URL.revokeObjectURL(audioUrl);
                      setAudioUrl("");
                    }
                    if (id === "shadowing") {
                      setShowEquipmentCheck(false);
                      navigate(`/speaking-practice/shadowing/shadowing`);
                      return;
                    }
                    if (id === "human") {
                      setShowEquipmentCheck(false);
                      navigate(`/speaking-practice/human/human`);
                      return;
                    }
                    setShowEquipmentCheck(false);
                    navigate(`/speaking-practice/${id}/session`);
                  }}
                  className="flex-1 h-10 rounded-xl text-sm font-semibold text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: EQUIPMENT_BLUE }}
                >
                  Start Exam
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default SpeakingPracticePage;
