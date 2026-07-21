// Chunked transcription.
//
// Sending a 30-minute file in one request makes the model silently drop
// stretches of audio (verified: a 110s span vanished, and the tail was cut).
// Short clips come back complete, so we always slice, transcribe, validate and
// stitch. Chunk transcripts are cached on disk so an interrupted file resumes
// mid-way instead of re-paying for work already done.

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { buildPrompt, transcribeAudio, RateLimitError } from './gemini.mjs';
import { fmtDuration, sleep } from './lib.mjs';

const execFileAsync = promisify(execFile);

export const CHUNK_SEC = Number(process.env.CHUNK_SEC ?? 360); // 6 minutes
export const OVERLAP_SEC = Number(process.env.OVERLAP_SEC ?? 8);

/**
 * Contiguous clips with a small overlap - duplicated words at a seam are
 * harmless downstream, missing words are not. Chunks never span a skipped
 * silence, and each carries its absolute offset so timestamps stay true to the
 * original recording.
 */
export function planChunks(intervals) {
  const spans = typeof intervals === 'number' ? [{ start: 0, end: intervals }] : intervals;
  const chunks = [];
  for (const span of spans) {
    let start = span.start;
    while (start < span.end) {
      const end = Math.min(start + CHUNK_SEC, span.end);
      const dur = end - start;
      // Absorb a sliver into the previous chunk rather than spend a request on it.
      if (dur < 20 && chunks.length) break;
      chunks.push({ index: chunks.length, start, dur });
      if (end >= span.end) break;
      start = end - OVERLAP_SEC;
    }
  }
  return chunks;
}

const TS_RE = /\[(\d{1,3}):(\d{2})(?::(\d{2}))?\]/g;

/** Shift every [mm:ss] in a clip transcript into absolute recording time. */
export function offsetTimestamps(text, offsetSec) {
  return text.replace(TS_RE, (_m, a, b, c) => {
    const rel = c ? +a * 3600 + +b * 60 + +c : +a * 60 + +b;
    const abs = Math.round(rel + offsetSec);
    return `[${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}]`;
  });
}

export function timestampsOf(text) {
  return [...text.matchAll(TS_RE)].map(([, a, b, c]) =>
    c ? +a * 3600 + +b * 60 + +c : +a * 60 + +b
  );
}

// Rough conversational speech rate. Used only to tell "a long monologue with
// one timestamp" apart from "audio that was actually skipped".
const CHARS_PER_SEC = 13;

/**
 * Reject a clip transcript that genuinely skipped audio.
 *
 * A bare gap between timestamps means nothing - the model legitimately emits a
 * single timestamp for a two-minute monologue. What signals dropped content is
 * a long stretch of elapsed time covered by very little text. Silence is
 * legitimate too, so spans the model marked `[pause]` are exempt.
 */
export function validateClip(text, clipDurSec) {
  const marks = [...text.matchAll(TS_RE)].map((m) => ({
    sec: m[3] ? +m[1] * 3600 + +m[2] * 60 + +m[3] : +m[1] * 60 + +m[2],
    at: m.index,
    len: m[0].length,
  }));
  if (!marks.length) return 'no timestamps in output';

  // The model sometimes abandons the line/speaker format and returns one giant
  // run-on paragraph. The words survive but part markers and speaker labels do
  // not, so treat it as a failure worth retrying.
  // Few lines carrying a LOT of text means the format collapsed. Few lines
  // carrying little text just means the clip was mostly silence, which is
  // normal at the end of a test during answer transfer.
  const nonBlank = text.split('\n').filter((l) => l.trim()).length;
  if (clipDurSec > 120 && nonBlank < 6 && text.length > 1500) {
    return `degraded formatting (${nonBlank} line(s), ${text.length} chars)`;
  }

  const sparse = (segment, elapsed) =>
    elapsed > 90 &&
    !/\[pause\]/i.test(segment) &&
    segment.replace(/\s+/g, ' ').length / elapsed < CHARS_PER_SEC / 4;

  for (let i = 0; i < marks.length - 1; i++) {
    const elapsed = marks[i + 1].sec - marks[i].sec;
    const segment = text.slice(marks[i].at + marks[i].len, marks[i + 1].at);
    if (sparse(segment, elapsed)) {
      return `only ${segment.trim().length} chars across ${Math.round(elapsed)}s at ${fmtDuration(marks[i].sec)}`;
    }
  }

  // Tail: the closing monologue has no following timestamp, so estimate how far
  // its text carries us and allow generous trailing silence.
  const last = marks[marks.length - 1];
  const tailText = text.slice(last.at + last.len).replace(/\s+/g, ' ').trim();
  const covered = last.sec + tailText.length / CHARS_PER_SEC;
  if (clipDurSec - covered > 90) {
    return `text runs out at ~${fmtDuration(covered)} of ${fmtDuration(clipDurSec)}`;
  }
  return null;
}

// A silence must be at least this long to be worth skipping. IELTS pauses for
// reading questions run 30-45s and are kept; the answer-transfer gap runs ~8-10
// minutes and is not.
const MIN_SKIPPABLE_SILENCE = Number(process.env.MIN_SILENCE_SEC ?? 90);
const PAD = 3; // seconds kept either side, so no word is clipped at an edge

/**
 * Speech regions of a recording, with long silences removed.
 *
 * Every IELTS recording contains a multi-minute silence while candidates
 * transfer answers to the answer sheet, and often a short closing announcement
 * after it. Transcribing silence costs a request and ~32 tokens/second for
 * nothing, which matters under a per-day request cap.
 */
export async function speechIntervals(localPath, durationSec) {
  try {
    const { stderr } = await execFileAsync(
      'ffmpeg',
      ['-i', localPath, '-af', 'silencedetect=noise=-40dB:d=20', '-f', 'null', '-'],
      { timeout: 5 * 60_000, maxBuffer: 16 * 1024 * 1024 }
    );

    const events = [...stderr.matchAll(/silence_(start|end):\s*([\d.]+)/g)].map((m) => ({
      type: m[1],
      t: +m[2],
    }));
    const spans = [];
    let open = null;
    for (const e of events) {
      if (e.type === 'start') open = e.t;
      else if (open !== null) {
        spans.push({ start: open, end: e.t });
        open = null;
      }
    }
    if (open !== null) spans.push({ start: open, end: durationSec });

    const skip = spans.filter((s) => s.end - s.start >= MIN_SKIPPABLE_SILENCE);
    if (!skip.length) return [{ start: 0, end: durationSec }];

    const out = [];
    let pos = 0;
    for (const s of skip) {
      const end = Math.min(s.start + PAD, durationSec);
      if (end - pos > 5) out.push({ start: pos, end });
      pos = Math.max(pos, s.end - PAD);
    }
    if (durationSec - pos > 5) out.push({ start: pos, end: durationSec });
    return out.length ? out : [{ start: 0, end: durationSec }];
  } catch {
    return [{ start: 0, end: durationSec }]; // an optimisation, never a blocker
  }
}

/**
 * Put every [mm:ss] at the start of its own line.
 *
 * The model intermittently returns a chunk as one run-on paragraph. The words
 * are all there but the line structure is gone, which hurts readability and
 * hides part markers. Timestamps reliably mark segment starts, so the layout can
 * be rebuilt deterministically instead of spending another request on a retry.
 * Harmless on well-formed output, which already has these line breaks.
 */
export function reflow(text) {
  return text
    .replace(/[ \t]*(\[\d{1,3}:\d{2}(?::\d{2})?\])/g, '\n$1')
    .replace(/[ \t]*(#{1,4}[ \t]*PART[ \t]*[1-4])[ \t]*/gi, '\n$1\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Cut one clip out of the already-transcoded local file. */
async function cutClip(srcPath, start, dur, outPath) {
  await execFileAsync(
    'ffmpeg',
    ['-y', '-loglevel', 'error', '-ss', String(start), '-t', String(dur), '-i', srcPath,
     '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'libmp3lame', '-b:a', '32k', outPath],
    { timeout: 5 * 60_000 }
  );
  return statSync(outPath).size;
}

/**
 * Transcribe one whole recording as validated, stitched clips.
 * `onProgress` receives per-chunk status lines.
 */
export async function transcribeChunked({
  localAudioPath,
  durationSec,
  cacheDir,
  pickModel,
  onExhausted,
  bucket,
  tmpDir,
  delayMs,
  onProgress = () => {},
}) {
  mkdirSync(cacheDir, { recursive: true });
  const intervals = await speechIntervals(localAudioPath, durationSec);
  const speechSec = intervals.reduce((n, s) => n + (s.end - s.start), 0);
  const speechEnd = intervals[intervals.length - 1].end;
  if (durationSec - speechSec > 30) {
    onProgress(
      `   speech ${fmtDuration(speechSec)} of ${fmtDuration(durationSec)} — skipping ` +
        `${fmtDuration(durationSec - speechSec)} of silence across ${intervals.length} region(s)`
    );
  }
  const chunks = planChunks(intervals);
  const pieces = [];
  const modelsUsed = new Set();
  let tokensIn = 0;
  let tokensOut = 0;
  const warnings = [];

  for (const ch of chunks) {
    const cacheFile = `${cacheDir}/${String(ch.index).padStart(3, '0')}.txt`;

    if (existsSync(cacheFile)) {
      pieces.push(readFileSync(cacheFile, 'utf8'));
      onProgress(`   chunk ${ch.index + 1}/${chunks.length} — cached`);
      continue;
    }

    const clipPath = `${tmpDir}/clip_${ch.index}.mp3`;
    await cutClip(localAudioPath, ch.start, ch.dur, clipPath);

    let text = null;
    let lastProblem = null;

    // One retry: the drop-out failure is stochastic, so a straight retry
    // usually succeeds. Second failure is recorded but not fatal.
    for (let attempt = 1; attempt <= 2 && text === null; attempt++) {
      await bucket.reserve(Math.round(ch.dur * 32) + 1200, onProgress);

      // Free-tier quota is per model per day, so on exhaustion fall through to
      // the next model rather than abandoning the run.
      let res = null;
      while (res === null) {
        const model = pickModel();
        if (!model) throw new RateLimitError('all configured models are out of daily quota', null);
        try {
          res = await transcribeAudio({
            model,
            base64: readFileSync(clipPath).toString('base64'),
            mimeType: 'audio/mp3',
            prompt: buildPrompt({ clipLabel: fmtDuration(ch.dur), isWholeFile: false }),
            onRetry: onProgress,
          });
          modelsUsed.add(model);
        } catch (err) {
          if (!(err instanceof RateLimitError)) throw err;
          onExhausted(model);
          onProgress(`   ${model} out of daily quota — switching model`);
        }
      }

      bucket.record(res.tokensIn + res.tokensOut);
      tokensIn += res.tokensIn;
      tokensOut += res.tokensOut;

      if (res.finishReason === 'MAX_TOKENS') {
        lastProblem = 'clip hit maxOutputTokens';
      } else {
        lastProblem = validateClip(res.text, ch.dur);
      }

      if (!lastProblem) {
        text = res.text;
      } else if (attempt === 1) {
        onProgress(`   chunk ${ch.index + 1}/${chunks.length} — retrying: ${lastProblem}`);
        await sleep(delayMs);
      } else {
        text = res.text; // keep the better-than-nothing text, but flag it
        warnings.push(`chunk ${ch.index + 1} @${fmtDuration(ch.start)}: ${lastProblem}`);
      }
    }

    const shifted = reflow(offsetTimestamps(text, ch.start));
    writeFileSync(cacheFile, shifted);
    pieces.push(shifted);
    rmSync(clipPath, { force: true });

    onProgress(
      `   chunk ${ch.index + 1}/${chunks.length} — ${fmtDuration(ch.start)}+${fmtDuration(ch.dur)} ` +
        `→ ${text.length.toLocaleString()} chars${lastProblem ? ` ⚠ ${lastProblem}` : ''}`
    );
    if (ch.index < chunks.length - 1) await sleep(delayMs);
  }

  return {
    text: pieces.join('\n'),
    tokensIn,
    tokensOut,
    warnings,
    chunkCount: chunks.length,
    speechEnd,
    modelsUsed: [...modelsUsed],
  };
}
