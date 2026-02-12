/**
 * Reusable real-time frequency / level visualization. No business logic — only display.
 * When isActive is true, shows mock bars (or real analyser when stream is provided).
 * Can be used by speaking session or any other feature that needs a level meter.
 */

import { useRef, useEffect, useState } from "react";

const BAR_COUNT = 24;
const MOCK_UPDATE_MS = 80;

/**
 * @param {Object} props
 * @param {boolean} props.isActive - When true, show animated bars
 * @param {MediaStream} [props.stream] - Optional; when provided, use AnalyserNode for real levels (future)
 * @param {string} [props.className]
 */
function AudioFrequencyGraph({ isActive, stream, className = "" }) {
  const canvasRef = useRef(null);
  const [mockLevels, setMockLevels] = useState(() => Array(BAR_COUNT).fill(0));
  const animationRef = useRef(null);

  // Mock animation when active and no stream
  useEffect(() => {
    if (!isActive || stream) return;

    let frame = 0;
    const update = () => {
      frame++;
      setMockLevels((prev) =>
        prev.map((_, i) => {
          const t = (frame * 0.1 + i * 0.3) % (Math.PI * 2);
          return 0.2 + 0.8 * Math.abs(Math.sin(t));
        })
      );
      animationRef.current = requestAnimationFrame(update);
    };
    animationRef.current = requestAnimationFrame(update);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isActive, stream]);

  // Real-time level meter when stream is provided (mic input)
  useEffect(() => {
    if (!isActive || !stream || !canvasRef.current) return;
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.2;
    analyser.minDecibels = -60;
    analyser.maxDecibels = -10;
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let stopped = false;

    const draw = () => {
      if (stopped || !canvasRef.current || !ctx) return;
      analyser.getByteFrequencyData(dataArray);
      const w = canvas.width;
      const h = canvas.height;
      const barW = Math.max(2, w / BAR_COUNT - 2);
      const gap = 2;
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < BAR_COUNT; i++) {
        const idx = Math.floor((i / BAR_COUNT) * dataArray.length);
        const v = dataArray[idx] / 255;
        const barH = Math.max(4, v * h * 0.85);
        ctx.fillStyle = "#1990e6";
        ctx.fillRect(i * (barW + gap), h - barH, barW, barH);
      }
      animationRef.current = requestAnimationFrame(draw);
    };

    const run = () => {
      if (audioContext.state === "suspended") {
        audioContext.resume().then(draw);
      } else {
        draw();
      }
    };
    run();

    return () => {
      stopped = true;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      try {
        source.disconnect();
        audioContext.close();
      } catch (_) {}
    };
  }, [isActive, stream]);

  const showMock = isActive && !stream;

  if (!isActive) {
    return (
      <div className={`flex items-end justify-center gap-0.5 h-12 ${className}`} aria-hidden="true">
        {Array(BAR_COUNT)
          .fill(0)
          .map((_, i) => (
            <div
              key={i}
              className="w-1 bg-gray-200 rounded-sm min-h-1"
              style={{ height: 4 }}
            />
          ))}
        </div>
    );
  }

  if (stream) {
    return (
      <canvas
        ref={canvasRef}
        width={280}
        height={48}
        className={`block rounded ${className}`}
        aria-label="Audio level"
      />
    );
  }

  return (
    <div
      className={`flex items-end justify-center gap-0.5 h-12 ${className}`}
      aria-label="Audio level"
    >
      {showMock &&
        mockLevels.map((v, i) => (
          <div
            key={i}
            className="w-1 bg-primary rounded-sm min-h-1 transition-all duration-75"
            style={{ height: `${Math.max(4, v * 40)}px` }}
          />
        ))}
    </div>
  );
}

export default AudioFrequencyGraph;
