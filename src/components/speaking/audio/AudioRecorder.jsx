/**
 * Reusable audio recorder. No UI for start/stop — lifecycle is fully controlled by props.
 * When isActive becomes true, recording starts; when maxDurationMs elapses or isActive becomes false,
 * recording stops and onResult(blob) is called.
 * Can be used by speaking session or any other feature that needs recording.
 */

import { useRef, useEffect } from "react";

/**
 * @param {Object} props
 * @param {boolean} props.isActive - When true, start recording; when false, stop and deliver result
 * @param {(blob: Blob | null) => void} props.onResult - Called when recording stops with the audio blob (or null)
 * @param {number} [props.maxDurationMs] - Max recording duration in ms; recording auto-stops after this
 * @param {string} [props.mimeType] - e.g. 'audio/webm'
 * @param {boolean} [props.requestStop] - When true, stop recording immediately and call onResult (e.g. user clicked Next)
 * @param {(stream: MediaStream | null) => void} [props.onStreamReady] - Called with mic stream when recording starts, null when it stops (for level meter)
 */
function AudioRecorder({ isActive, onResult, maxDurationMs = 120000, mimeType, requestStop = false, onStreamReady }) {
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (!isActive) {
      // Stop existing recording if any
      const mr = mediaRecorderRef.current;
      if (mr && mr.state !== "inactive") {
        mr.stop();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    let cancelled = false;
    chunksRef.current = [];

    const startRecording = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (onStreamReady) onStreamReady(stream);

        const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm";
        const options = mimeType ? { mimeType } : { mimeType: mime };
        const recorder = new MediaRecorder(stream, options);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        recorder.onstop = () => {
          if (onStreamReady) onStreamReady(null);
          stream.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
          mediaRecorderRef.current = null;
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          const blob = chunksRef.current.length
            ? new Blob(chunksRef.current, { type: recorder.mimeType })
            : null;
          if (onResult) onResult(blob);
        };

        recorder.start(1000);
      } catch (err) {
        console.error("[AudioRecorder] getUserMedia failed", err);
        if (onResult) onResult(null);
      }
    };

    startRecording();

    if (maxDurationMs > 0) {
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        const mr = mediaRecorderRef.current;
        if (mr && mr.state !== "inactive") mr.stop();
      }, maxDurationMs);
    }

    return () => {
      cancelled = true;
      if (onStreamReady) onStreamReady(null);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      const mr = mediaRecorderRef.current;
      if (mr && mr.state !== "inactive") mr.stop();
      const s = streamRef.current;
      if (s) s.getTracks().forEach((t) => t.stop());
    };
  }, [isActive, maxDurationMs, mimeType, onResult, onStreamReady]);

  // When requestStop becomes true, stop the current recording (onstop will call onResult)
  useEffect(() => {
    if (!requestStop || !isActive) return;
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") mr.stop();
  }, [requestStop, isActive]);

  return null;
}

export default AudioRecorder;
