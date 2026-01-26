
import { useRef, useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { FaPlay, FaPause, FaVolumeUp, FaVolumeMute } from "react-icons/fa";
import { useAppearance } from "@/contexts/AppearanceContext";
import { saveAudioPosition, loadAudioPosition, clearAudioPosition } from "@/store/LocalStorage/listeningStorage";

const AudioPlayer = forwardRef(({ audioUrl, isTestMode, playbackRate, onPlaybackRateChange, volume, onVolumeChange, onAudioEnded, autoPlay = false, testId = null }, ref) => {
    const { themeColors } = useAppearance();
    const audioRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [playError, setPlayError] = useState(null);
    const positionSaveIntervalRef = useRef(null);
    const hasRestoredPositionRef = useRef(false);

    // Update audio source when URL changes
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !audioUrl) return;

        // Only update source if it's different
        if (audio.src !== audioUrl) {
            audio.src = audioUrl;
            audio.load().catch((error) => {
                console.error('[AudioPlayer] Error loading audio:', error);
                setPlayError('Failed to load audio. Please check your connection.');
            });
        }
    }, [audioUrl]);

    // Reset restoration flag when testId changes
    useEffect(() => {
        hasRestoredPositionRef.current = false;
    }, [testId]);

    // Load and restore saved audio position on mount
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !audioUrl || !testId || hasRestoredPositionRef.current) return;

        const restorePosition = () => {
            const savedPosition = loadAudioPosition(testId);
            if (savedPosition !== null && savedPosition >= 0) {
                // Wait for audio to be ready before setting position
                const tryRestore = () => {
                    // Only restore if position is valid (less than duration)
                    if (audio.duration && savedPosition >= audio.duration) {
                        // Position is beyond audio duration, don't restore
                        hasRestoredPositionRef.current = true;
                        return;
                    }
                    
                    if (audio.readyState >= 2) { // HAVE_CURRENT_DATA
                        audio.currentTime = savedPosition;
                        setCurrentTime(savedPosition);
                        hasRestoredPositionRef.current = true;
                    } else {
                        // Wait for audio to load more data
                        const handleCanPlay = () => {
                            if (audio.duration && savedPosition < audio.duration) {
                                audio.currentTime = savedPosition;
                                setCurrentTime(savedPosition);
                            }
                            hasRestoredPositionRef.current = true;
                            audio.removeEventListener('canplay', handleCanPlay);
                        };
                        audio.addEventListener('canplay', handleCanPlay, { once: true });
                    }
                };

                if (audio.readyState >= 1) { // HAVE_METADATA
                    // Check if we have duration info
                    if (audio.duration && !isNaN(audio.duration)) {
                        tryRestore();
                    } else {
                        // Wait for duration to be available
                        const handleLoadedMetadata = () => {
                            tryRestore();
                            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
                        };
                        audio.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
                    }
                } else {
                    audio.addEventListener('loadedmetadata', () => {
                        tryRestore();
                    }, { once: true });
                }
            } else {
                // No saved position, mark as restored to prevent further attempts
                hasRestoredPositionRef.current = true;
            }
        };

        // Try to restore position when audio is ready
        if (audio.readyState >= 1) {
            restorePosition();
        } else {
            audio.addEventListener('loadedmetadata', restorePosition, { once: true });
        }

        return () => {
            // Cleanup is handled by once: true on event listeners
        };
    }, [audioUrl, testId]);

    // Save audio position every 2 seconds
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !testId) return;

        // Clear any existing interval
        if (positionSaveIntervalRef.current) {
            clearInterval(positionSaveIntervalRef.current);
        }

        // Set up interval to save position every 2 seconds
        positionSaveIntervalRef.current = setInterval(() => {
            if (audio && !isNaN(audio.currentTime) && audio.currentTime >= 0) {
                saveAudioPosition(testId, audio.currentTime);
            }
        }, 2000);

        return () => {
            if (positionSaveIntervalRef.current) {
                clearInterval(positionSaveIntervalRef.current);
                positionSaveIntervalRef.current = null;
            }
        };
    }, [testId]);

    // Clear audio position when component unmounts or testId changes (cleanup)
    useEffect(() => {
        return () => {
            // Don't clear on unmount - we want to persist the position
            // Only clear when explicitly requested (e.g., test finished/reset)
        };
    }, [testId]);

    // NOTE: We intentionally do NOT auto-play in review mode.
    // Autoplay is often blocked by browsers and can also start at full volume,
    // which feels like a "notification" to users.
    
    // Handle autoPlay prop - trigger playback when requested (after user interaction)
    useEffect(() => {
        if (autoPlay && isTestMode && audioUrl && !isPlaying && audioRef.current) {
            const audio = audioRef.current;
            
            const attemptPlay = () => {
                setPlayError(null);
                const playPromise = audio.play();
                if (playPromise && typeof playPromise.catch === 'function') {
                    playPromise
                        .then(() => {
                            setIsPlaying(true);
                        })
                        .catch((error) => {
                            console.error('[AudioPlayer] Auto-play error:', error);
                            setPlayError('Could not start audio automatically. Please click play manually.');
                        });
                } else {
                    setIsPlaying(true);
                }
            };
            
            // If audio is already loaded, play immediately
            if (audio.readyState >= 2) { // HAVE_CURRENT_DATA
                attemptPlay();
            } else {
                // Wait for audio to be ready
                const handleCanPlay = () => {
                    attemptPlay();
                    audio.removeEventListener('canplay', handleCanPlay);
                };
                audio.addEventListener('canplay', handleCanPlay);
                
                // Also try to load if not already loading
                if (audio.readyState === 0) { // HAVE_NOTHING
                    audio.load();
                }
                
                return () => {
                    audio.removeEventListener('canplay', handleCanPlay);
                };
            }
        }
    }, [autoPlay, isTestMode, audioUrl, isPlaying]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateTime = () => setCurrentTime(audio.currentTime);
        const updateDuration = () => {
            if (audio.duration && !isNaN(audio.duration)) {
                setDuration(audio.duration);
            }
        };
        const handleEnded = () => {
            setIsPlaying(false);
            // Call onAudioEnded callback if provided (for auto-submit in test mode)
            if (onAudioEnded && isTestMode) {
                onAudioEnded();
            }
        };
        const handleLoadedMetadata = () => {
            if (audio.duration && !isNaN(audio.duration)) {
                setDuration(audio.duration);
            }
        };

        audio.addEventListener('timeupdate', updateTime);
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('durationchange', updateDuration);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('timeupdate', updateTime);
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.removeEventListener('durationchange', updateDuration);
            audio.removeEventListener('ended', handleEnded);
        };
    }, [onAudioEnded, isTestMode]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.playbackRate = playbackRate;
        }
    }, [playbackRate]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = isMuted ? 0 : volume;
        }
    }, [volume, isMuted]);

    const pause = () => {
        if (audioRef.current && isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        }
    };

    const play = () => {
        if (!audioRef.current) return;
        
        setPlayError(null);
        const audio = audioRef.current;
        
        // Ensure audio is loaded before playing
        if (audio.readyState < 2) { // HAVE_CURRENT_DATA
            audio.load();
        }
        
        const playPromise = audio.play();
        if (playPromise && typeof playPromise.catch === 'function') {
            playPromise
                .then(() => {
                    setIsPlaying(true);
                })
                .catch((error) => {
                    console.error('[AudioPlayer] Play error:', error);
                    setPlayError('Could not start audio. Please try again.');
                });
        } else {
            setIsPlaying(true);
        }
    };

    const togglePlayPause = () => {
        if (!isTestMode) {
            // In review mode, allow pause
            if (isPlaying) {
                pause();
            } else {
                play();
            }
        } else {
            // In test mode, allow play and pause
            if (!isPlaying) {
                play();
            } else {
                pause();
            }
        }
    };
    
    // Expose pause, play, and clearPosition methods via ref
    useImperativeHandle(ref, () => ({
        pause,
        play,
        isPlaying: () => isPlaying,
        clearPosition: () => {
            if (testId) {
                clearAudioPosition(testId);
                hasRestoredPositionRef.current = false;
            }
        },
    }), [isPlaying, testId]);

    const handleSeek = (e) => {
        if (!isTestMode && audioRef.current) {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const percentage = x / rect.width;
            const newTime = percentage * duration;
            audioRef.current.currentTime = newTime;
            setCurrentTime(newTime);
        }
    };

    const toggleMute = () => {
        setIsMuted(!isMuted);
    };

    const formatTime = (seconds) => {
        if (!seconds || isNaN(seconds)) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    if (!audioUrl) return null;

    return (
        <div className="sticky top-2 z-10 border border-gray-200 p-4 shadow-sm w-7/12 mx-auto rounded-2xl" style={{ backgroundColor: themeColors.background, borderColor: themeColors.border }}>
            <audio ref={audioRef} src={audioUrl} />
            <div className="space-y-3">
                {playError && (
                    <div className="text-xs text-gray-600">
                        {playError}
                    </div>
                )}
                {/* Main Controls */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={togglePlayPause}
                        className="p-3 rounded-full transition-colors bg-blue-600 hover:bg-blue-700 text-white"
                        title={isPlaying ? "Pause" : "Play"}
                    >
                        {isPlaying ? <FaPause size={16} style={{ color: themeColors.text }} /> : <FaPlay size={16} style={{ color: themeColors.text }} />}
                    </button>

                    {/* Progress Bar */}
                    <div className="flex-1 relative">
                        <div
                            className="h-2 bg-gray-200 rounded-full cursor-pointer"
                            onClick={handleSeek}
                        >
                            <div
                                className="h-full bg-blue-600 rounded-full transition-all"
                                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                            />
                        </div>
                        {!isTestMode && (
                            <input
                                type="range"
                                min="0"
                                max={duration || 0}
                                value={currentTime}
                                onChange={(e) => {
                                    const newTime = parseFloat(e.target.value);
                                    if (audioRef.current) {
                                        audioRef.current.currentTime = newTime;
                                        setCurrentTime(newTime);
                                    }
                                }}
                                className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer"
                            />
                        )}
                    </div>

                    {/* Time Display */}
                    <div className="text-sm font-medium text-gray-700 min-w-[80px] text-right">
                        {formatTime(currentTime)} / {formatTime(duration)}
                    </div>
                </div>

                {/* Secondary Controls */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {/* Volume Control */}
                        <button
                            onClick={toggleMute}
                            className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
                            title={isMuted ? "Unmute" : "Mute"}
                        >
                            {isMuted ? <FaVolumeMute size={18} /> : <FaVolumeUp size={18} />}
                        </button>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={isMuted ? 0 : volume}
                            onChange={(e) => {
                                setIsMuted(false);
                                onVolumeChange(parseFloat(e.target.value));
                            }}
                            className="w-24"
                        />
                    </div>

                    {/* Playback Speed - only in review mode */}
                    {!isTestMode && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Speed:</span>
                            <select
                                value={playbackRate}
                                onChange={(e) => onPlaybackRateChange(parseFloat(e.target.value))}
                                className="px-2 py-1 border border-gray-300 rounded text-sm"
                            >
                                <option value={1.0}>1x</option>
                                <option value={1.2}>1.2x</option>
                                <option value={1.5}>1.5x</option>
                            </select>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

AudioPlayer.displayName = 'AudioPlayer';

export default AudioPlayer;