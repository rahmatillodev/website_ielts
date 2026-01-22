
import { useRef, useState, useEffect } from "react";
import { FaPlay, FaPause, FaVolumeUp, FaVolumeMute } from "react-icons/fa";


const AudioPlayer = ({ audioUrl, isTestMode, playbackRate, onPlaybackRateChange, volume, onVolumeChange, onAudioEnded }) => {
    const audioRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);

    // Update audio source when URL changes
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !audioUrl) return;

        // Only update source if it's different
        if (audio.src !== audioUrl) {
            audio.src = audioUrl;
            audio.load();
        }
    }, [audioUrl]);

    // Auto-play when audio is loaded (only in review mode)
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !audioUrl || isTestMode) return;

        const handleCanPlay = async () => {
            try {
                await audio.play();
                setIsPlaying(true);
            } catch (error) {
                // Browser autoplay policy may prevent auto-play
                // Silently fail - user can manually start playback
                console.log('Auto-play prevented by browser policy');
            }
        };

        audio.addEventListener('canplay', handleCanPlay);
        
        // Also try to play if audio is already ready
        if (audio.readyState >= 3) { // HAVE_FUTURE_DATA or higher
            handleCanPlay();
        }

        return () => {
            audio.removeEventListener('canplay', handleCanPlay);
        };
    }, [audioUrl, isTestMode]);

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

    const togglePlayPause = () => {
        if (!isTestMode) {
            // In review mode, allow pause
            if (isPlaying) {
                audioRef.current?.pause();
            } else {
                audioRef.current?.play();
            }
            setIsPlaying(!isPlaying);
        } else {
            // In test mode, only allow play (no pause)
            if (!isPlaying) {
                audioRef.current?.play();
                setIsPlaying(true);
            }
        }
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

    return (
        <div className="sticky top-2 z-10 bg-white border border-gray-200 p-4 shadow-sm w-7/12 mx-auto rounded-2xl">
            <audio ref={audioRef} src={audioUrl} />
            <div className="space-y-3">
                {/* Main Controls */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={togglePlayPause}
                        disabled={isTestMode && isPlaying}
                        className={`p-3 rounded-full transition-colors ${isTestMode && isPlaying
                                ? "bg-gray-300 cursor-not-allowed"
                                : "bg-blue-600 hover:bg-blue-700 text-white"
                            }`}
                        title={isTestMode && isPlaying ? "Cannot pause during test" : isPlaying ? "Pause" : "Play"}
                    >
                        {isPlaying ? <FaPause size={16} /> : <FaPlay size={16} />}
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
};
export default AudioPlayer;