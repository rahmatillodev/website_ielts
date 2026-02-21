import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { MdMic, MdVolumeUp, MdCheckCircle } from "react-icons/md";
import { FaCheck } from "react-icons/fa";
import { saveAudioCheckState, loadAudioCheckState } from "@/store/LocalStorage/mockTestStorage";

// Custom Audio Visualizer Component with Gradient
const GradientAudioVisualizer = ({ stream, width = 350, height = 100 }) => {
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const analyserRef = useRef(null);
  const audioContextRef = useRef(null);
  const dataArrayRef = useRef(null);

  useEffect(() => {
    if (!stream || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = width;
    canvas.height = height;

    // Create audio context and analyser
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);

    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#ec4899"); // Pink
    gradient.addColorStop(0.5, "#a855f7"); // Purple-Pink mix
    gradient.addColorStop(1, "#8b5cf6"); // Purple

    const centerY = height / 2;
    const barCount = 40;
    const barWidth = width / barCount;
    const gap = 2;
    const maxBarHeight = height * 0.4;

    const draw = () => {
      if (!analyserRef.current || !dataArrayRef.current) return;

      analyserRef.current.getByteFrequencyData(dataArrayRef.current);
      const data = dataArrayRef.current;

      ctx.clearRect(0, 0, width, height);

      // Draw symmetric waveform bars
      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor((i / barCount) * data.length);
        const value = data[dataIndex] / 255;
        const barHeight = value * maxBarHeight;

        const x = i * (barWidth + gap);
        const topY = centerY - barHeight;
        const bottomY = centerY + barHeight;

        // Draw top bar (upward)
        ctx.fillStyle = gradient;
        ctx.fillRect(x, topY, barWidth - gap, barHeight);

        // Draw bottom bar (downward)
        ctx.fillRect(x, centerY, barWidth - gap, barHeight);
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stream, width, height]);

  return (
    <canvas
      ref={canvasRef}
      className="rounded-lg"
      style={{ display: "block" }}
    />
  );
};

const MockTestStart = ({ onStart, mockTestId }) => {
  const [micStreamActive, setMicStreamActive] = useState(false);
  const [micSuccess, setMicSuccess] = useState(false);
  const [speakerSuccess, setSpeakerSuccess] = useState(false);
  const [speakerTesting, setSpeakerTesting] = useState(false);

  const streamRef = useRef(null);
  const testAudioRef = useRef(null);
  const audioContextRef = useRef(null);
  const oscillatorRef = useRef(null);
  const gainRef = useRef(null);
  const micSuccessTimeoutRef = useRef(null);
  const speakerSuccessTimeoutRef = useRef(null);


  // Load saved audio check state on mount
  useEffect(() => {
    if (mockTestId) {
      const savedState = loadAudioCheckState(mockTestId);
      if (savedState) {
        setMicSuccess(savedState.micSuccess || false);
        setSpeakerSuccess(savedState.speakerSuccess || false);
      }
    }
  }, [mockTestId]);

  // Check if both checks were already successful from saved state
  const [wasRestored, setWasRestored] = useState(false);
  useEffect(() => {
    if (mockTestId && micSuccess && speakerSuccess) {
      const savedState = loadAudioCheckState(mockTestId);
      if (savedState?.completed) {
        setWasRestored(true);
      }
    }
  }, [mockTestId, micSuccess, speakerSuccess]);

  // Save audio check state whenever it changes
  useEffect(() => {
    if (mockTestId && (micSuccess || speakerSuccess)) {
      saveAudioCheckState(mockTestId, {
        micSuccess,
        speakerSuccess,
        completed: micSuccess && speakerSuccess,
      });
    }
  }, [micSuccess, speakerSuccess, mockTestId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (testAudioRef.current) {
        testAudioRef.current.pause();
        testAudioRef.current = null;
      }
      if (micSuccessTimeoutRef.current) {
        clearTimeout(micSuccessTimeoutRef.current);
      }
      if (speakerSuccessTimeoutRef.current) {
        clearTimeout(speakerSuccessTimeoutRef.current);
      }
    };
  }, []);

  const handleMicCheck = async () => {
    try {
      setMicSuccess(false);
      if (micSuccessTimeoutRef.current) {
        clearTimeout(micSuccessTimeoutRef.current);
      }

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      streamRef.current = stream;
      setMicStreamActive(true);

      // Auto-detect mic success after 2 seconds of active stream
      // This gives the visualizer time to show activity
      micSuccessTimeoutRef.current = setTimeout(() => {
        // Check if stream is still active and has active tracks
        if (streamRef.current && streamRef.current.active) {
          const audioTracks = streamRef.current.getAudioTracks();
          if (audioTracks.length > 0 && audioTracks[0].readyState === 'live') {
            setMicSuccess(true);
          }
        }
      }, 2000);
    } catch (err) {
      console.error("Microphone error:", err);
      alert("Microphone not detected or permission denied. Please allow microphone access to continue.");
      setMicStreamActive(false);
      setMicSuccess(false);
    }
  };

  const handleMicStop = () => {
    const wasActive = streamRef.current?.active;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setMicStreamActive(false);
    if (micSuccessTimeoutRef.current) {
      clearTimeout(micSuccessTimeoutRef.current);
    }
    // If mic was working when stopped, mark as successful
    if (!micSuccess && wasActive) {
      setMicSuccess(true);
    }
  };

  const handleSpeakerTest = () => {
    // AGAR TEST KETAYOTGAN BO'LSA — STOP QILAMIZ
    if (speakerTesting) {
      // Stop mp3 audio
      if (testAudioRef.current) {
        testAudioRef.current.pause();
        testAudioRef.current.currentTime = 0;
        testAudioRef.current = null;
      }

      // Stop oscillator
      if (oscillatorRef.current) {
        try {
          oscillatorRef.current.stop();
        } catch (e) { }
        oscillatorRef.current = null;
      }

      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }

      if (speakerSuccessTimeoutRef.current) {
        clearTimeout(speakerSuccessTimeoutRef.current);
      }

      setSpeakerTesting(false);
      return;
    }

    // AKS HOLDA — TESTNI BOSHLAYMIZ
    try {
      setSpeakerTesting(true);

      const audio = new Audio("/audios/test-sound.mp3");
      testAudioRef.current = audio;
      audio.volume = 0.7;

      audio.onended = () => {
        setSpeakerTesting(false);
        // Auto-mark speaker as successful if audio played successfully
        if (!speakerSuccess) {
          setSpeakerSuccess(true);
        }
      };

      audio.onerror = () => {
        // Fallback to oscillator if MP3 fails
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioContextRef.current = audioContext;

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillatorRef.current = oscillator;
        gainRef.current = gainNode;

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 440;
        oscillator.type = "sine";
        gainNode.gain.value = 0.3;

        oscillator.start();

        // Auto-mark speaker as successful after oscillator plays for 1 second
        speakerSuccessTimeoutRef.current = setTimeout(() => {
          if (!speakerSuccess) {
            setSpeakerSuccess(true);
          }
        }, 1000);

        oscillator.onended = () => {
          setSpeakerTesting(false);
          if (speakerSuccessTimeoutRef.current) {
            clearTimeout(speakerSuccessTimeoutRef.current);
          }
        };
      };

      audio.play().then(() => {
        // Auto-mark speaker as successful when audio starts playing
        // Wait a bit to ensure it's actually playing
        speakerSuccessTimeoutRef.current = setTimeout(() => {
          if (!speakerSuccess && !audio.paused) {
            setSpeakerSuccess(true);
          }
        }, 500);
      }).catch(() => {
        setSpeakerTesting(false);
        if (speakerSuccessTimeoutRef.current) {
          clearTimeout(speakerSuccessTimeoutRef.current);
        }
      });

    } catch (err) {
      console.error("Speaker test error:", err);
      setSpeakerTesting(false);
    }
  };


  const canStart = micSuccess && speakerSuccess;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-2xl"
      >
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2 text-gray-900">Audio Check</h2>
          <p className="text-gray-600">
            {wasRestored
              ? "Your audio devices were previously verified. You can re-test them or proceed to start the test."
              : "Please ensure your microphone and speaker are working before starting the test."}
          </p>
        </div>

        <div className="flex flex-col gap-6 mb-8">
          {/* Microphone Test Row */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 bg-gray-50/50"
          >
            {/* Icon */}
            <div className="shrink-0">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <MdMic className="w-6 h-6 text-purple-600" />
              </div>
            </div>

            {/* Label */}
            <div className="flex-1 min-w-0 pr-2">
              <h3 className="font-semibold text-gray-900 mb-1">Microphone</h3>
              <p className="text-sm text-gray-600">
                {micSuccess
                  ? "Microphone is working correctly"
                  : micStreamActive
                  ? "Speak into your microphone to test"
                  : "Click to start microphone check"}
              </p>
            </div>

            {/* Visualizer/Action */}
            <div className="flex-1 flex justify-center items-center min-h-[100px]">
              <AnimatePresence mode="wait">
                {micStreamActive ? (
                  <motion.div
                    key="visualizer"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex flex-col items-center gap-2 ml-2"
                  >
                    <GradientAudioVisualizer
                      stream={streamRef.current}
                      width={300}
                      height={100}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleMicStop}
                      className="text-xs"
                    >
                      Stop Test
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="button"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <Button
                      variant="outline"
                      onClick={handleMicCheck}
                      className="whitespace-nowrap"
                    >
                      Check Microphone
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Success Indicator */}
            <div className="shrink-0">
              <motion.div
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  micSuccess
                    ? "bg-green-500 text-white shadow-lg"
                    : "bg-gray-200 text-gray-400"
                }`}
                animate={micSuccess ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 0.3 }}
              >
                {micSuccess ? (
                  <FaCheck className="w-6 h-6" />
                ) : (
                  <MdCheckCircle className="w-6 h-6" />
                )}
              </motion.div>
            </div>
          </motion.div>

          {/* Speaker Test Row */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 bg-gray-50/50"
          >
            {/* Icon */}
            <div className="shrink-0">
              <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center">
                <MdVolumeUp className="w-6 h-6 text-pink-600" />
              </div>
            </div>

            {/* Label */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 mb-1">Speaker</h3>
              <p className="text-sm text-gray-600">
                {speakerSuccess
                  ? "Speaker is working correctly"
                  : speakerTesting
                  ? "Playing test sound..."
                  : "Click to test your speaker"}
              </p>
            </div>

            {/* Action */}
            <div className="flex-1 flex justify-center">
              <Button
                variant="outline"
                onClick={handleSpeakerTest}
                // disabled={speakerTesting}
                className="whitespace-nowrap"
              >
                {speakerTesting ? (
                  "End test"
                ) : (
                  "Test Sound"
                )}
              </Button>
            </div>

            {/* Success Indicator */}
            <div className="shrink-0">
              <motion.div
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  speakerSuccess
                    ? "bg-green-500 text-white shadow-lg"
                    : "bg-gray-200 text-gray-400"
                }`}
                animate={speakerSuccess ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 0.3 }}
              >
                {speakerSuccess ? (
                  <FaCheck className="w-6 h-6" />
                ) : (
                  <MdCheckCircle className="w-6 h-6" />
                )}
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Start Button */}
        <div className="flex flex-col items-center gap-3">
          <Button
            disabled={!canStart}
            onClick={onStart}
            className="w-full py-6 text-lg font-semibold  disabled:opacity-50 disabled:cursor-not-allowed"
            size="lg"
          >
            Start Full Test
          </Button>

          <AnimatePresence>
            {!canStart && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-sm text-gray-500 text-center"
              >
                Please complete both checks to continue
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default MockTestStart;
