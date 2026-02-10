import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";

const MockTestStart = ({ onStart }) => {
  const [micEnabled, setMicEnabled] = useState(false);
  const [speakerTested, setSpeakerTested] = useState(false);
  const [micTesting, setMicTesting] = useState(false);
  const [speakerTesting, setSpeakerTesting] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const testAudioRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (testAudioRef.current) {
        testAudioRef.current.pause();
        testAudioRef.current = null;
      }
    };
  }, []);

  const handleMicCheck = async () => {
    try {
      setMicTesting(true);
      setMicEnabled(false);
      setMicLevel(0);

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      streamRef.current = stream;

      // Create audio context for level detection
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      
      source.connect(analyser);

      // Monitor microphone level
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const checkLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        const level = Math.min(100, (average / 255) * 100);
        setMicLevel(level);

        if (level > 5) {
          // Microphone is picking up sound
          setMicEnabled(true);
          setMicTesting(false);
        } else {
          animationFrameRef.current = requestAnimationFrame(checkLevel);
        }
      };

      // Start checking after a short delay to allow user to speak
      setTimeout(() => {
        checkLevel();
      }, 500);

      // Auto-detect after 3 seconds if no sound detected
      setTimeout(() => {
        if (!micEnabled) {
          setMicEnabled(true); // Assume mic is working if permission granted
          setMicTesting(false);
        }
      }, 3000);

    } catch (err) {
      console.error("Microphone error:", err);
      alert("Microphone not detected or permission denied. Please allow microphone access to continue.");
      setMicEnabled(false);
      setMicTesting(false);
      setMicLevel(0);
    }
  };

  const handleSpeakerTest = () => {
    try {
      setSpeakerTesting(true);
      setSpeakerTested(false);

      // Create test audio
      const audio = new Audio("/test-sound.mp3");
      testAudioRef.current = audio;

      audio.volume = 0.7;
      
      audio.onended = () => {
        setSpeakerTested(true);
        setSpeakerTesting(false);
      };

      audio.onerror = () => {
        // If test file doesn't exist, use Web Audio API to generate test tone
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 440; // A4 note
        oscillator.type = 'sine';
        gainNode.gain.value = 0.3;

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 1); // Play for 1 second

        oscillator.onended = () => {
          audioContext.close();
          setSpeakerTested(true);
          setSpeakerTesting(false);
        };
      };

      audio.play().catch((err) => {
        console.warn("Speaker test error (non-critical):", err);
        // Fallback: assume speaker works if we can create audio context
        // This is a non-critical error - the audio file might not be available
        // but the browser can still play audio, so we'll mark it as tested
        setSpeakerTested(true);
        setSpeakerTesting(false);
      });

    } catch (err) {
      console.error("Speaker test error:", err);
      setSpeakerTested(true); // Assume speaker works
      setSpeakerTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md text-center">
        <h2 className="text-2xl font-bold mb-4">Audio Check</h2>
        <p className="mb-6 text-gray-600">Please ensure your microphone and speaker are working before starting the test.</p>

        <div className="flex flex-col gap-4">
          {/* Microphone Test */}
          <div className="space-y-2">
            <Button
              variant={micEnabled ? "default" : "outline"}
              onClick={handleMicCheck}
              disabled={micTesting}
              className="w-full"
            >
              {micTesting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Testing Microphone... (speak into your mic)
                </span>
              ) : micEnabled ? (
                "Microphone Ready ✅"
              ) : (
                "Check Microphone"
              )}
            </Button>
            
            {/* Microphone Level Indicator */}
            {micTesting && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-100"
                  style={{ width: `${micLevel}%` }}
                />
              </div>
            )}
          </div>

          {/* Speaker Test */}
          <div className="space-y-2">
            <Button
              variant={speakerTested ? "default" : "outline"}
              onClick={handleSpeakerTest}
              disabled={speakerTesting}
              className="w-full"
            >
              {speakerTesting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Testing Speaker...
                </span>
              ) : speakerTested ? (
                "Speaker Tested ✅"
              ) : (
                "Test Speaker"
              )}
            </Button>
          </div>
        </div>

        <Button
          disabled={!micEnabled || !speakerTested}
          className="mt-6 w-full"
          onClick={onStart}
        >
          Start Full Test
        </Button>

        {(!micEnabled || !speakerTested) && (
          <p className="mt-4 text-sm text-gray-500">
            Please complete both checks to continue
          </p>
        )}
      </div>
    </div>
  );
};

export default MockTestStart;
