
import { useRef, useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { FaPlay, FaPause, FaVolumeUp, FaVolumeMute } from "react-icons/fa";
import { MdReplay5, MdForward5 } from "react-icons/md";
import { useAppearance } from "@/contexts/AppearanceContext";
import { saveAudioPosition, loadAudioPosition, clearAudioPosition } from "@/store/LocalStorage/listeningStorage";

/** Seconds moved by one press of the skip-back / skip-forward controls. */
const SKIP_SECONDS = 5;

const AudioPlayer = forwardRef(({ audioUrl, isTestMode, playbackRate, onPlaybackRateChange, volume, onVolumeChange, onAudioEnded, onPlay, autoPlay = false, testId = null, disableReplay = false, label = "Full recording", modeLabel = null }, ref) => {
    const { theme, themeColors } = useAppearance();

    // Every colour below is derived from the active theme's tokens rather than
    // hardcoded, so the black+gold `high-contrast` palette is honoured instead of
    // being overridden by fixed blues and grays.
    //
    // `high-contrast` is a black canvas whose single accent is the gold already
    // used for text and borders; the other themes use the design system's
    // `--primary`. `onAccent` is whatever stays legible on top of that fill.
    const isHighContrast = theme === 'high-contrast';
    const accent = isHighContrast ? themeColors.text : 'var(--primary)';
    const onAccent = isHighContrast ? themeColors.background : '#ffffff';

    /**
     * Muted shade of the foreground colour, for secondary text, the scrubber
     * track and the badge fill. Mixing the token keeps these tied to the theme
     * (gold-tinted in high-contrast, neutral elsewhere) instead of introducing
     * separate grays that would clash with the gold palette.
     */
    const subtle = (alpha) => `color-mix(in srgb, ${themeColors.text} ${Math.round(alpha * 100)}%, transparent)`;
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
        if (autoPlay && isTestMode && audioUrl && !isPlaying && !disableReplay && audioRef.current) {
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
    }, [autoPlay, isTestMode, audioUrl, isPlaying, disableReplay]);

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

    // Listen for play event to trigger onPlay callback
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !onPlay) return;

        const handlePlay = () => {
            onPlay();
        };

        audio.addEventListener('play', handlePlay);
        return () => {
            audio.removeEventListener('play', handlePlay);
        };
    }, [onPlay]);

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
        if (disableReplay) return;

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
            // In test mode, allow play and pause until the track has finished (no replay)
            if (!isPlaying) {
                if (disableReplay) return;
                play();
            } else {
                pause();
            }
        }
    };
    
    // Expose pause, play, and clearPosition methods via ref
    useImperativeHandle(ref, () => ({
        pause,
        play: () => {
            if (disableReplay) return;
            play();
        },
        isPlaying: () => isPlaying,
        clearPosition: () => {
            if (testId) {
                clearAudioPosition(testId);
                hasRestoredPositionRef.current = false;
            }
        },
    }), [isPlaying, testId, disableReplay]);

    /**
     * Jump the playhead by `delta` seconds, clamped to [0, duration].
     *
     * Gated on `!isTestMode` for the same reason as `handleSeek` and the range
     * input below: during a live test the audio plays once and the position must
     * not be steerable. This keeps the control additive - it grants review mode a
     * precise alternative to scrubbing without opening a new way to move the
     * playhead in test mode (see AUDIT_REPORT #78).
     */
    const skipBy = (delta) => {
        const audio = audioRef.current;
        if (isTestMode || !audio) return;

        const total = duration || audio.duration;
        if (!total || isNaN(total)) return;

        const next = Math.min(Math.max(audio.currentTime + delta, 0), total);
        audio.currentTime = next;
        setCurrentTime(next);
    };

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

    const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        // Positioning (incl. stickiness) is the page's job - this element's parent
        // wraps it tightly, so `position: sticky` here had no room to travel and
        // silently did nothing. See ListeningPracticePage's player wrapper.
        <div
            className="w-full border shadow-sm rounded-2xl px-5 py-4"
            style={{ backgroundColor: themeColors.background, borderColor: themeColors.border }}
        >
            <audio ref={audioRef} src={audioUrl} preload="metadata" />

            {playError && (
                <div className="text-xs mb-3" style={{ color: subtle(0.75) }}>
                    {playError}
                </div>
            )}

            {/* Row 1 - label + mode badge on the left, elapsed / total on the right */}
            <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold truncate" style={{ color: themeColors.text }}>
                        {label}
                    </span>
                    {modeLabel && (
                        <span
                            className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium"
                            style={{ backgroundColor: subtle(0.1), color: subtle(0.75) }}
                        >
                            {modeLabel}
                        </span>
                    )}
                </div>
                <span
                    className="shrink-0 text-sm font-medium tabular-nums"
                    style={{ color: subtle(0.75) }}
                >
                    {formatTime(currentTime)} / {formatTime(duration)}
                </span>
            </div>

            {/* Row 2 - transport, scrubber, volume. Wraps rather than overflowing
                in the narrow review pane, where width is a % of a resizable split. */}
            <div className="flex items-center gap-4 flex-wrap">
                {/* Transport. Play is filled and large; skip buttons are outlined and
                    smaller, so the primary action reads first. */}
                <div className="flex items-center gap-2 shrink-0">
                    {!isTestMode && (
                        <button
                            type="button"
                            onClick={() => skipBy(-SKIP_SECONDS)}
                            disabled={!duration}
                            className="grid place-items-center h-10 w-10 rounded-full border transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{ borderColor: themeColors.border, color: themeColors.text }}
                            title={`Back ${SKIP_SECONDS} seconds`}
                            aria-label={`Skip back ${SKIP_SECONDS} seconds`}
                        >
                            <MdReplay5 size={20} />
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={togglePlayPause}
                        className="grid place-items-center h-14 w-14 rounded-full shadow-sm transition-transform hover:scale-105 active:scale-95"
                        style={{ backgroundColor: accent, color: onAccent }}
                        title={isPlaying ? "Pause" : "Play"}
                        aria-label={isPlaying ? "Pause" : "Play"}
                    >
                        {/* Nudge the play triangle so it looks optically centred in the circle */}
                        {isPlaying ? <FaPause size={20} /> : <FaPlay size={20} className="ml-0.5" />}
                    </button>

                    {!isTestMode && (
                        <button
                            type="button"
                            onClick={() => skipBy(SKIP_SECONDS)}
                            disabled={!duration}
                            className="grid place-items-center h-10 w-10 rounded-full border transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{ borderColor: themeColors.border, color: themeColors.text }}
                            title={`Forward ${SKIP_SECONDS} seconds`}
                            aria-label={`Skip forward ${SKIP_SECONDS} seconds`}
                        >
                            <MdForward5 size={20} />
                        </button>
                    )}
                </div>

                {/* Scrubber - takes the remaining width, min-w-0 so it can shrink */}
                <div className="relative flex items-center flex-1 min-w-[7rem] h-5">
                    <div
                        className="h-1.5 w-full rounded-full cursor-pointer"
                        style={{ backgroundColor: subtle(0.18) }}
                        onClick={handleSeek}
                    >
                        <div
                            className="h-full rounded-full"
                            style={{ width: `${progressPct}%`, backgroundColor: accent }}
                        />
                    </div>
                    {/* Round handle. Purely decorative - the transparent range input
                        above it does the interaction, which avoids per-browser
                        ::-webkit-slider-thumb / ::-moz-range-thumb styling. */}
                    <span
                        aria-hidden="true"
                        className="pointer-events-none absolute h-3.5 w-3.5 rounded-full -translate-x-1/2 shadow-sm"
                        style={{
                            left: `${progressPct}%`,
                            backgroundColor: accent,
                            border: `2px solid ${themeColors.background}`,
                        }}
                    />
                    {!isTestMode && (
                        <input
                            type="range"
                            min="0"
                            max={duration || 0}
                            value={currentTime}
                            aria-label="Seek"
                            onChange={(e) => {
                                const newTime = parseFloat(e.target.value);
                                if (audioRef.current) {
                                    audioRef.current.currentTime = newTime;
                                    setCurrentTime(newTime);
                                }
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                    )}
                </div>

                {/* Volume */}
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={toggleMute}
                        className="transition-opacity hover:opacity-70"
                        style={{ color: subtle(0.75) }}
                        title={isMuted ? "Unmute" : "Mute"}
                        aria-label={isMuted ? "Unmute" : "Mute"}
                    >
                        {isMuted ? <FaVolumeMute size={18} /> : <FaVolumeUp size={18} />}
                    </button>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={isMuted ? 0 : volume}
                        aria-label="Volume"
                        onChange={(e) => {
                            setIsMuted(false);
                            onVolumeChange(parseFloat(e.target.value));
                        }}
                        className="w-20 cursor-pointer"
                        style={{ accentColor: accent }}
                    />
                </div>

                {/* Playback speed - review only, as before */}
                {!isTestMode && (
                    <select
                        value={playbackRate}
                        onChange={(e) => onPlaybackRateChange(parseFloat(e.target.value))}
                        aria-label="Playback speed"
                        className="shrink-0 rounded-lg border px-2 py-1 text-sm cursor-pointer"
                        style={{
                            borderColor: themeColors.border,
                            color: themeColors.text,
                            backgroundColor: themeColors.background,
                        }}
                    >
                        <option value={1.0}>1x</option>
                        <option value={1.2}>1.2x</option>
                        <option value={1.5}>1.5x</option>
                    </select>
                )}
            </div>
        </div>
    );
});

AudioPlayer.displayName = 'AudioPlayer';

export default AudioPlayer;