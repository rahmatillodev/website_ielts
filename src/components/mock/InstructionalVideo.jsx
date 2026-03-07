import { useState, useEffect, useRef } from 'react';

/**
 * Instructional video component for mock test sections
 * - Auto-plays video
 * - Shows countdown timer
 * - Auto-advances after video completion
 * - Non-skippable
 * - Auto-fullscreen on start
 */
const InstructionalVideo = ({ 
  onComplete, 
  onStart,
  countdownSeconds = 5,
  title = "Instructions",
  description = "Please watch this video before starting the section.",
  autoFullscreen = true,
  videoSrc: propVideoSrc,
  onExit
}) => {
  const [countdown, setCountdown] = useState(countdownSeconds);
  const [videoEnded, setVideoEnded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasCalledOnStart, setHasCalledOnStart] = useState(false);
  const videoRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const containerRef = useRef(null);
  
  const videoSrc = propVideoSrc; 

  // Fullscreen mantiqi
  useEffect(() => {
    if (!autoFullscreen) return;
    
    const enterFullscreen = async () => {
      try {
        const el = containerRef.current;
        // Check if element still exists before accessing properties
        if (!el) {
          console.warn('[InstructionalVideo] Container ref is null, cannot enter fullscreen');
          return;
        }
        
        const requestMethod = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
        if (requestMethod) {
          await requestMethod.call(el);
          setIsFullscreen(true);
        } else {
          console.warn('[InstructionalVideo] Fullscreen API not available');
        }
      } catch (error) {
        console.error('[InstructionalVideo] Error entering fullscreen:', error);
      }
    };
    
    // Use a small delay to ensure ref is set, but check again inside the callback
    const timeoutId = setTimeout(enterFullscreen, 100);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [autoFullscreen]);

  // Fullscreen-dan chiqishni cheklash (Developer hotkey-dan tashqari)
  useEffect(() => {
    if (!autoFullscreen) return;
    let allowExit = false;

    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
      setIsFullscreen(isCurrentlyFullscreen);
      
      if (!isCurrentlyFullscreen && containerRef.current && !allowExit) {
        containerRef.current.requestFullscreen?.().catch(() => {});
      }
    };

    window.__mockTestAllowExit = () => { allowExit = true; };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      delete window.__mockTestAllowExit;
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [autoFullscreen]);

  // Developer hotkey (Ctrl+Shift+Q)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'Q' || e.key === 'q')) {
        if (window.__mockTestAllowExit) window.__mockTestAllowExit();
        document.exitFullscreen?.().catch(() => {});
        if (onExit) onExit();
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [onExit]);

  // Video tugagandan keyin countdown boshlash (agar countdownSeconds > 0 bo'lsa)
  useEffect(() => {
    if (videoEnded) {
      if (countdownSeconds > 0 && countdown > 0) {
        countdownIntervalRef.current = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(countdownIntervalRef.current);
              // Wrap onComplete in setTimeout to avoid setState during render
              setTimeout(() => {
                if (onComplete) onComplete();
              }, 0);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        // No countdown - call onComplete immediately
        setTimeout(() => {
          if (onComplete) onComplete();
        }, 0);
      }
    }
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [videoEnded, onComplete, countdownSeconds, countdown]);

  // Avtomatik play
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(err => console.log("Autoplay blocked:", err));
    }
  }, []);

  // Call onStart when video starts playing (only once)
  useEffect(() => {
    if (isPlaying && !hasCalledOnStart && onStart) {
      setHasCalledOnStart(true);
      onStart();
    }
  }, [isPlaying, hasCalledOnStart, onStart]);

  const handleVideoEnd = () => {
    setVideoEnded(true);
    setIsPlaying(false);
  };

  const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development'


  const handleDevSkip = () => {
    if (window.__mockTestAllowExit) window.__mockTestAllowExit();
    document.exitFullscreen?.().catch(() => {});
    if (onComplete) onComplete();
  };

  return (
    <div ref={containerRef} className="fixed inset-0 z-[9999] flex items-center justify-center bg-black">
      {/* Developer skip button */}
      {isDevelopment && (
      <button
        type="button"
        onClick={handleDevSkip}
        className="absolute top-4 right-4 z-[10000] px-3 py-1.5 rounded bg-white/10 hover:bg-white/25 text-gray-300 hover:text-white text-sm font-medium transition border border-white/20"
        title="Skip instruction (dev)"
      >
        Skip (dev)
      </button>
      )}
      <div className="w-full h-full flex flex-col items-center justify-center p-4">
        <div className="max-w-4xl w-full">
          <h2 className="text-3xl font-bold text-white mb-2 text-center">{title}</h2>
          <p className="text-gray-300 mb-6 text-center">{description}</p>

          {countdownSeconds > 0 && (
            <p className="text-white text-lg mb-6 text-center">Countdown: {countdown}</p>
          )}
          <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden shadow-2xl">
            <video
              ref={videoRef}
              src={videoSrc}
              className="w-full h-full object-contain"
              onEnded={handleVideoEnd}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              controls={false} // User o'tkazib yubora olmaydi
              playsInline
              disablePictureInPicture
              controlsList="nodownload noRemotePlayback"
            />

            {/* Play tugmasi (agar brauzer autoplayni bloklasa) */}
            {!isPlaying && !videoEnded && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <button 
                  onClick={() => {
                    videoRef.current?.play();
                    // Call onStart when user manually starts the video
                    if (!hasCalledOnStart && onStart) {
                      setHasCalledOnStart(true);
                      onStart();
                    }
                  }}
                  className="bg-white/20 hover:bg-white/40 p-6 rounded-full transition"
                >
                  <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                  </svg>
                </button>
              </div>
            )}

            {/* Countdown overlay - only show if countdownSeconds > 0 */}
            {videoEnded && countdownSeconds > 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
                <div className="text-center">
                  <div className="text-7xl font-bold text-white mb-4 animate-pulse">{countdown}</div>
                  <p className="text-xl text-gray-300">Section starting soon...</p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 text-center text-gray-500 text-sm">
            {videoEnded ? "Starting..." : "Please watch the full instruction video"}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstructionalVideo;