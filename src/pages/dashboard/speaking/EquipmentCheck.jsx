import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const EQUIPMENT_BLUE = "#2D9CDB";

const EquipmentCheck = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [deviceType, setDeviceType] = useState("Device");
  const [microphones, setMicrophones] = useState([]);
  const [speakers, setSpeakers] = useState([]);
  const [selectedMicId, setSelectedMicId] = useState("");
  const [selectedSpeakerId, setSelectedSpeakerId] = useState("");

  const [permissionError, setPermissionError] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  const [readyChecked, setReadyChecked] = useState(false);
  const [isOpenAnimating, setIsOpenAnimating] = useState(false);

  const [isMicMenuOpen, setIsMicMenuOpen] = useState(false);
  const [isSpeakerMenuOpen, setIsSpeakerMenuOpen] = useState(false);
  const micMenuWrapRef = useRef(null);
  const speakerMenuWrapRef = useRef(null);

  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const rafRef = useRef(null);
  const canvasRef = useRef(null);

  const canStartExam = useMemo(() => {
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
      /* ignore */
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
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        /* ignore */
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

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(45,156,219,0.08)";
    ctx.fillRect(0, 0, w, h);

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

    const data = dataArrayRef.current;
    analyser.getByteFrequencyData(data);

    const bars = 28;
    const gap = Math.max(2, Math.floor(w * 0.005));
    const barW = Math.max(3, Math.floor((w - gap * (bars - 1)) / bars));

    for (let i = 0; i < bars; i++) {
      const idx = Math.floor((i / bars) * data.length);
      const v = data[idx] / 255;
      const barH = Math.max(3, Math.floor(v * h * 0.95));
      const x = i * (barW + gap);
      const y = h - barH;

      ctx.fillStyle = "rgba(45,156,219,0.95)";
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

  useEffect(() => {
    setIsOpenAnimating(false);
    const t = setTimeout(() => setIsOpenAnimating(true), 10);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
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
  }, []);

  const audioUrlRef = useRef(audioUrl);
  audioUrlRef.current = audioUrl;

  useEffect(() => {
    return () => {
      stopVisualizationLoop();
      stopStreamTracks();
      closeAudioContext();
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRecording = async () => {
    setPermissionError("");
    setReadyChecked(false);

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

      refreshDevices().catch(() => {});

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
      stopVisualizationLoop();
    } catch {
      setPermissionError("Could not stop recording. Please try again.");
    }
  };

  const releasePreviewUrl = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl("");
    }
  };

  const goToSession = async () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    await cleanupRecording();
    setIsMicMenuOpen(false);
    setIsSpeakerMenuOpen(false);
    releasePreviewUrl();

    if (id === "shadowing") {
      navigate("/speaking-practice/shadowing");
      return;
    }
    navigate(`/speaking-practice/${id}/session`);
  };

  const handleCancel = async () => {
    await cleanupRecording();
    setIsMicMenuOpen(false);
    setIsSpeakerMenuOpen(false);
    releasePreviewUrl();
    navigate(-1);
  };

  return (
    <div
      className={`min-h-[calc(100vh-64px)] flex items-center justify-center bg-slate-100 px-3 py-8 transition-opacity duration-200 ease-out ${
        isOpenAnimating ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        className={`w-full max-w-lg bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden transform transition-all duration-200 ease-out ${
          isOpenAnimating ? "opacity-100 scale-100" : "opacity-95 scale-[0.98]"
        }`}
      >
        <div className="px-5 sm:px-6 py-5 sm:py-6 flex flex-col">
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 text-center">
            Equipment Check
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-gray-600 text-center">
            Let&apos;s make sure your microphone and speakers are ready for the test.
          </p>

          <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 flex items-center justify-between">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Device
            </div>
            <div className="text-xs sm:text-sm font-semibold text-gray-900">{deviceType}</div>
          </div>

          <div className="mt-3 space-y-3">
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
                                (d.deviceId === "default" ? "Default Microphone" : "Microphone")}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

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
                                (d.deviceId === "default" ? "Default Speaker" : "Speaker")}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white px-3 py-3">
              <div className="text-sm font-semibold text-gray-900">Recording</div>

              {permissionError ? (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {permissionError}
                </div>
              ) : null}

              <div className="mt-3">
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  className="w-full h-11 rounded-xl text-sm font-semibold text-white transition shadow-sm"
                  style={{ backgroundColor: EQUIPMENT_BLUE }}
                >
                  {isRecording ? "Stop Recording" : "Start Recording"}
                </button>
              </div>

              {isRecording ? (
                <div className="mt-2 rounded-xl border border-gray-200 bg-white overflow-hidden">
                  <canvas
                    ref={canvasRef}
                    className="w-full h-12"
                    aria-label="Microphone activity visualizer"
                  />
                </div>
              ) : null}

              {!isRecording && audioUrl ? (
                <div className="mt-3 space-y-2.5">
                  <audio
                    controls
                    className="w-full"
                    ref={(el) => {
                      if (!el) return;
                      if (typeof el.setSinkId === "function" && selectedSpeakerId) {
                        el.setSinkId(selectedSpeakerId).catch(() => {});
                      }
                    }}
                    src={audioUrl}
                  />

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={readyChecked}
                      onChange={(e) => setReadyChecked(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-[rgb(45,156,219)] focus:ring-[rgba(45,156,219,0.25)]"
                    />
                    <span className="text-sm text-gray-700 leading-snug">
                      I&apos;m sure that microphone and speakers are ready.
                    </span>
                  </label>
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-6 flex gap-2.5">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 h-10 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={!canStartExam}
              onClick={goToSession}
              className="flex-1 h-10 rounded-xl text-sm font-semibold text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: EQUIPMENT_BLUE }}
            >
              Start Exam
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EquipmentCheck;
