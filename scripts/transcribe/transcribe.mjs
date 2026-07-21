// Resumable IELTS listening transcription.
//
//   node --env-file=.env.transcribe scripts/transcribe/transcribe.mjs [--status] [--limit N] [--only <testId>]
//
// Flow per test: download+transcode audio -> Gemini -> split on part markers ->
// write part.content -> update tracker. State is flushed after every file, so an
// interruption at any point leaves accurate progress behind.

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, statSync } from 'node:fs';
import { supabase, fetchListeningTests, sleep, fmtDuration } from './lib.mjs';
import { loadState, saveState, buildState, summarize, workQueue } from './state.mjs';
import { TokenBucket, RateLimitError } from './gemini.mjs';
import { transcribeChunked, timestampsOf, reflow } from './chunk.mjs';

const execFileAsync = promisify(execFile);

// Free-tier quota is ~20 requests/day PER MODEL, so no single model can carry a
// ~370-chunk batch. Work through this list, falling through to the next model as
// each one's daily allowance runs out. Order is best-quality-first among those
// that usually still have quota.
// Note gemini-2.5-flash / gemini-2.5-flash-lite are closed to new API projects;
// they only work on older, grandfathered keys.
const MODELS = (process.env.GEMINI_MODELS ??
  'gemini-flash-lite-latest,gemini-3.1-flash-lite,gemini-flash-latest')
  .split(',').map((m) => m.trim()).filter(Boolean);

const exhausted = new Set();
const pickModel = () => MODELS.find((m) => !exhausted.has(m)) ?? null;
// Free-tier ceilings, with headroom so we throttle before Google does.
const TPM_LIMIT = Number(process.env.GEMINI_TPM ?? 220_000);
const RPM_LIMIT = Number(process.env.GEMINI_RPM ?? 12);
const DELAY_MS = Number(process.env.GEMINI_DELAY_MS ?? 4000);

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null);

const TMP = new URL('./tmp/', import.meta.url);
const TRANSCRIPTS = new URL('./transcripts/', import.meta.url);
const INVENTORY = new URL('./audio_inventory.json', import.meta.url);

// ---------------------------------------------------------------- audio prep

/**
 * Transcode straight from the remote URL to 16 kHz mono MP3. Gemini downsamples
 * audio to 16 kHz mono regardless, so this costs no accuracy but cuts a ~30 MB
 * file to ~6 MB - small enough to inline as base64 and skip the Files API.
 * Bitrate is chosen so the encoded file always stays under ~9 MB.
 */
async function prepareAudio(url, durationSec, outPath) {
  const budgetBits = 9 * 1024 * 1024 * 8;
  const kbps = durationSec
    ? Math.max(16, Math.min(32, Math.floor(budgetBits / durationSec / 1000)))
    : 24;

  await execFileAsync(
    'ffmpeg',
    ['-y', '-loglevel', 'error', '-i', url, '-vn', '-ac', '1', '-ar', '16000',
     '-c:a', 'libmp3lame', '-b:a', `${kbps}k`, outPath],
    { timeout: 15 * 60_000, maxBuffer: 8 * 1024 * 1024 }
  );

  const bytes = statSync(outPath).size;
  if (bytes > 18 * 1024 * 1024) throw new Error(`transcoded file still ${(bytes / 1048576).toFixed(1)} MB`);
  return { bytes, kbps };
}

// ------------------------------------------------------------------ splitting

/**
 * Split a transcript on `### PART n` markers into { partNumber: text }.
 *
 * Tolerant of the two deviations the model actually produces: a leading
 * timestamp (`[07:20] ### PART 2`) and "SECTION" in place of "PART". A leading
 * timestamp is carried into the new part's body rather than discarded. The
 * marker must still be the only prose on its line, so a spoken phrase like
 * "Hello, Part 2 of the form please" cannot be mistaken for a boundary.
 */
const NUMWORD = { 1: 'one', 2: 'two', 3: 'three', 4: 'four' };

/**
 * Locate the narrator announcing the start of part `n` somewhere after
 * `fromIndex`. Used to repair boundaries the model failed to mark, which
 * happens whenever it drops the line format. IELTS audio always announces
 * these aloud, so the spoken text is a more dependable signal than the marker.
 */
/** Start of the line containing `idx`, so a part opens on a clean boundary. */
function lineStart(text, idx) {
  const nl = text.lastIndexOf('\n', idx);
  return nl === -1 ? 0 : nl + 1;
}

/** A part shorter than this is a mis-detected boundary, not a real section. */
const MIN_PART_CHARS = 600;

/**
 * Only text that could plausibly precede a spoken announcement on its own line:
 * a timestamp, a speaker label, a leading "now". This is what separates a real
 * announcement ("[13:07] Section 3.") from a passing reference to a section
 * mid-sentence ("...check your answers to part two."), which is otherwise
 * indistinguishable and was silently producing 60-character parts.
 */
const ANNOUNCEMENT_PREFIX =
  /^(?:\[\d{1,3}:\d{2}(?::\d{2})?\][ \t]*)?(?:[A-Z][A-Za-z .]{0,18}:[ \t]*)?(?:now[ \t]+)?$/i;

/**
 * Every plausible start position for part `n`, in descending order of trust:
 * the model's own marker, a spoken announcement, the announcement of this
 * part's first question number, then the previous part's closing announcement.
 */
function boundaryCandidates(text, n) {
  const num = `(?:${n}|${NUMWORD[n]})`;
  const tiers = [[], [], [], []];

  const markerRe =
    /^[ \t]*(\[\d{1,3}:\d{2}(?::\d{2})?\])?[ \t]*#{0,4}[ \t]*(?:PART|SECTION)[ \t]*([1-4])[ \t]*[.:)]?[ \t]*$/gim;
  for (const m of text.matchAll(markerRe)) {
    if (Number(m[2]) === n) tiers[0].push({ start: m.index, end: m.index + m[0].length, ts: m[1] ?? '' });
  }

  for (const src of [
    `(?:now\\s+)?turn\\s+to\\s+(?:section|part)\\s+${num}\\b`,
    `\\b(?:section|part)\\s+${num}\\b`,
  ]) {
    for (const m of text.matchAll(new RegExp(src, 'gi'))) {
      const ls = lineStart(text, m.index);
      if (!ANNOUNCEMENT_PREFIX.test(text.slice(ls, m.index))) continue;
      tiers[1].push({ start: ls, end: ls, ts: '' });
    }
  }

  // IELTS parts map to fixed question ranges: 1-10, 11-20, 21-30, 31-40.
  const firstQ = (n - 1) * 10 + 1;
  for (const m of text.matchAll(new RegExp(`questions?\\s+${firstQ}\\s*(?:to|-|and)\\s*\\d+`, 'gi'))) {
    const ls = lineStart(text, m.index);
    tiers[2].push({ start: ls, end: ls, ts: '' });
  }

  if (n > 1) {
    const prev = `(?:${n - 1}|${NUMWORD[n - 1]})`;
    for (const m of text.matchAll(
      new RegExp(`end\\s+of\\s+(?:the\\s+)?(?:section|part)\\s+${prev}\\b[^\\n]*`, 'gi')
    )) {
      const after = m.index + m[0].length;
      const nl = text.indexOf('\n', after);
      const idx = nl === -1 ? after : nl + 1;
      tiers[3].push({ start: idx, end: idx, ts: '' });
    }
  }

  return tiers.map((t) => t.sort((a, b) => a.start - b.start));
}

/**
 * Split a transcript into { partNumber: text }.
 *
 * Primary signal is the `### PART n` marker; anything missing is repaired from
 * the spoken announcement. Tolerant of a leading timestamp and of "SECTION" in
 * place of "PART". The marker must be the only prose on its line, so a spoken
 * "Hello, Part 2 of the form please" cannot be mistaken for a boundary.
 */
export function splitByPart(text) {
  const cands = { 1: boundaryCandidates(text, 1), 2: boundaryCandidates(text, 2),
                  3: boundaryCandidates(text, 3), 4: boundaryCandidates(text, 4) };

  // Walk the parts in order, each boundary constrained to leave the previous
  // part a plausible length. Higher-trust tiers win, but only if the resulting
  // split is sane - which is what stops a mid-sentence reference or a trailing
  // "now turn to section 4" from carving off a 30-character part.
  const ordered = [];
  let prev = null;
  for (const n of [1, 2, 3, 4]) {
    const floor = prev ? prev.start + MIN_PART_CHARS : 0;
    let chosen = null;
    for (const tier of cands[n]) {
      chosen = tier.find((c) => c.start >= floor && text.length - c.start >= MIN_PART_CHARS) ?? null;
      if (chosen) break;
    }
    // Part 1 always starts at the top when nothing better is found.
    if (!chosen && n === 1) chosen = { start: 0, end: 0, ts: '' };
    if (!chosen) continue;
    ordered.push({ n, ...chosen });
    prev = chosen;
  }
  if (!ordered.length) return null;

  const out = {};
  ordered.forEach((mk, i) => {
    const bodyEnd = i + 1 < ordered.length ? ordered[i + 1].start : text.length;
    const body = text.slice(mk.end, bodyEnd).trim();
    // Re-attach the marker's own timestamp so no timing information is lost.
    out[mk.n] = mk.ts ? `${mk.ts} ${body}` : body;
  });

  // Anything before the first boundary belongs to that first part.
  const preamble = text.slice(0, ordered[0].start).trim();
  if (preamble) out[ordered[0].n] = `${preamble}\n\n${out[ordered[0].n]}`.trim();

  return out;
}

// ------------------------------------------------------------------ DB writes

async function writeParts(db, testId, byPart, fallbackPartId) {
  const { data: parts, error } = await db
    .from('part')
    .select('id, part_number')
    .eq('test_id', testId);
  if (error) throw new Error(`part fetch failed: ${error.message}`);

  const written = [];
  if (byPart) {
    for (const p of parts) {
      const content = byPart[p.part_number];
      if (!content) continue;
      const { error: upErr } = await db.from('part').update({ content }).eq('id', p.id);
      if (upErr) throw new Error(`part ${p.part_number} update failed: ${upErr.message}`);
      written.push(p.part_number);
    }
  }
  return written;
}

/** Fallback when the model never emitted usable markers: keep the whole thing on one row. */
async function writeWhole(db, partId, text) {
  const { error } = await db.from('part').update({ content: text }).eq('id', partId);
  if (error) throw new Error(`fallback update failed: ${error.message}`);
}

// ----------------------------------------------------------------------- main

const db = supabase();

// Refresh the inventory if it is missing, then (re)build state around it.
if (!existsSync(INVENTORY)) {
  console.error('audio_inventory.json missing - run scripts/transcribe/inventory.mjs first.');
  process.exit(1);
}
const inventory = JSON.parse(readFileSync(INVENTORY, 'utf8'));

let state = loadState();
if (!state) {
  state = buildState(inventory, MODELS.join(', '));
  saveState(state);
  console.log('Initialised transcription_state.json + TRANSCRIPTION_PROGRESS.md');
}

const s0 = summarize(state);
console.log(
  `\nState: ${s0.done}/${s0.total - s0.blocked} done · ${s0.pending} pending · ` +
    `${s0.failed} failed · ${s0.in_progress} stuck · ${s0.blocked} blocked (no audio)`
);
console.log(`Remaining audio: ${fmtDuration(s0.remainingSec)} (~${Math.round(s0.remainingSec * 32 / 1000)}k input tokens)\n`);

if (flag('--status')) process.exit(0);

mkdirSync(TMP, { recursive: true });
mkdirSync(TRANSCRIPTS, { recursive: true });

// --resplit: re-run the splitter over transcripts already on disk and rewrite
// part.content. Costs no API quota - use after any change to splitByPart().
if (flag('--resplit')) {
  let fixed = 0, unchanged = 0, missing = 0;
  for (const entry of Object.values(state.entries)) {
    const file = new URL(`./${entry.testId}.md`, TRANSCRIPTS);
    if (!existsSync(file)) {
      if (entry.status === 'done') missing += 1;
      continue;
    }
    // Re-flow first: transcripts written before reflow existed may still be
    // run-on paragraphs, and rewriting them here costs no API quota.
    const raw = readFileSync(file, 'utf8');
    const text = reflow(raw);
    if (text !== raw) writeFileSync(file, text);
    const byPart = splitByPart(text);
    const written = await writeParts(db, entry.testId, byPart, entry.audioPartId);
    if (!written.length) {
      await writeWhole(db, entry.audioPartId, text);
      written.push(entry.audioPartNumber);
    }
    const splitOk = written.length === 4;
    const before = entry.partsWritten;
    entry.status = 'done';
    entry.partsWritten = written.length;
    entry.splitOk = splitOk;
    entry.transcriptChars = text.length;
    entry.error = splitOk ? null : `only ${written.length} part(s) split: [${written.join(',')}]`;
    if (before === written.length) unchanged += 1;
    else {
      fixed += 1;
      console.log(`  ${entry.title}: ${before ?? '?'} -> ${written.length} parts [${written.join(',')}]`);
    }
  }
  saveState(state);
  console.log(`\nresplit: ${fixed} changed, ${unchanged} unchanged, ${missing} done-but-no-local-transcript`);
  process.exit(0);
}

const only = value('--only');

// --force: discard cached chunks and re-transcribe from scratch. Scoped by
// --only when given, otherwise applies to everything.
if (flag('--force')) {
  const targets = only ? [state.entries[only]].filter(Boolean) : Object.values(state.entries);
  for (const e of targets) {
    if (!e.audioUrl) continue;
    rmSync(new URL(`./chunks/${e.testId}`, TRANSCRIPTS), { recursive: true, force: true });
    e.status = 'pending';
    e.error = null;
  }
  saveState(state);
  console.log(`--force: reset ${targets.filter((e) => e.audioUrl).length} entr(ies)\n`);
}

let queue = workQueue(state);
if (only) queue = queue.filter((e) => e.testId === only);
const limit = value('--limit');
if (limit) queue = queue.slice(0, Number(limit));

if (!queue.length) {
  console.log('Nothing to do - everything transcribable is done.');
  process.exit(0);
}

console.log(`Processing ${queue.length} file(s); models: ${MODELS.join(' -> ')}\n`);

const bucket = new TokenBucket(TPM_LIMIT, RPM_LIMIT);
const runStats = { ok: 0, failed: 0, warned: 0, tokensIn: 0, tokensOut: 0 };
let stopReason = null;

for (const [i, entry] of queue.entries()) {
  const label = `[${i + 1}/${queue.length}] ${entry.title}`;
  console.log(`${label} — ${fmtDuration(entry.durationSec)}`);

  entry.status = 'in_progress';
  entry.lastAttemptAt = new Date().toISOString();
  entry.attempts += 1;
  saveState(state);

  const tmpFile = new URL(`./${entry.testId}.mp3`, TMP).pathname;

  try {
    const { bytes, kbps } = await prepareAudio(entry.audioUrl, entry.durationSec, tmpFile);
    console.log(`   transcoded -> ${(bytes / 1048576).toFixed(1)} MB @ ${kbps}kbps mono 16kHz`);

    const result = await transcribeChunked({
      localAudioPath: tmpFile,
      durationSec: entry.durationSec,
      cacheDir: new URL(`./chunks/${entry.testId}`, TRANSCRIPTS).pathname,
      pickModel,
      onExhausted: (m) => exhausted.add(m),
      bucket,
      tmpDir: TMP.pathname,
      delayMs: DELAY_MS,
      onProgress: (m) => console.log(m),
    });

    // Persist the raw transcript before touching the DB, so a DB failure never
    // costs us the API spend.
    writeFileSync(new URL(`./${entry.testId}.md`, TRANSCRIPTS), result.text);

    // Whole-recording coverage check across the stitched result.
    const ts = timestampsOf(result.text);
    const lastTs = ts.length ? Math.max(...ts) : 0;
    // Measure against where speech actually ends, not the raw file length -
    // trailing answer-transfer silence is deliberately not transcribed.
    const target = result.speechEnd ?? entry.durationSec;
    if (target && lastTs / target < 0.9) {
      result.warnings.push(
        `stitched transcript ends at ${fmtDuration(lastTs)} of ${fmtDuration(target)} of speech`
      );
    }

    const byPart = splitByPart(result.text);
    const written = await writeParts(db, entry.testId, byPart, entry.audioPartId);

    let splitOk = written.length === 4;
    if (!written.length) {
      await writeWhole(db, entry.audioPartId, result.text);
      written.push(entry.audioPartNumber);
      splitOk = false;
    }

    const notes = [];
    if (!splitOk) notes.push(`only ${written.length} part(s) split: [${written.join(',')}]`);
    notes.push(...result.warnings);

    entry.status = 'done';
    entry.error = notes.length ? notes.join('; ').slice(0, 300) : null;
    entry.transcriptChars = result.text.length;
    entry.partsWritten = written.length;
    entry.splitOk = splitOk && result.warnings.length === 0;
    entry.chunks = result.chunkCount;
    entry.models = result.modelsUsed;
    entry.tokensIn = result.tokensIn;
    entry.tokensOut = result.tokensOut;

    runStats.ok += 1;
    runStats.tokensIn += result.tokensIn;
    runStats.tokensOut += result.tokensOut;
    if (notes.length) runStats.warned += 1;

    console.log(
      `   ✅ ${result.text.length.toLocaleString()} chars · ${result.chunkCount} chunks · parts [${written.join(',')}]` +
        `${notes.length ? ` ⚠ ${notes.join('; ')}` : ''} · ` +
        `${result.tokensIn.toLocaleString()} in / ${result.tokensOut.toLocaleString()} out\n`
    );
  } catch (err) {
    entry.status = 'failed';
    entry.error = String(err.message ?? err).slice(0, 300);
    runStats.failed += 1;
    console.log(`   ❌ ${entry.error}\n`);

    if (err instanceof RateLimitError) {
      stopReason = pickModel()
        ? `rate limited by Gemini${err.retryAfterSec ? ` (retry after ${err.retryAfterSec}s)` : ''}`
        : `daily quota exhausted on all models: ${MODELS.join(', ')}`;
    }
  } finally {
    rmSync(tmpFile, { force: true });
    saveState(state); // flush immediately, before any delay
  }

  if (stopReason) break;
  if (i < queue.length - 1) await sleep(DELAY_MS);
}

rmSync(TMP, { recursive: true, force: true });

const s1 = summarize(state);
console.log('─'.repeat(70));
if (stopReason) console.log(`STOPPED EARLY: ${stopReason}`);
console.log(`This run : ${runStats.ok} transcribed (${runStats.warned} with warnings), ${runStats.failed} failed`);
console.log(`Tokens   : ${runStats.tokensIn.toLocaleString()} in / ${runStats.tokensOut.toLocaleString()} out`);
console.log(`Overall  : ${s1.done}/${s1.total - s1.blocked} done · ${s1.pending} pending · ${s1.failed} failed · ${s1.blocked} blocked`);
console.log(`Remaining: ${fmtDuration(s1.remainingSec)} of audio`);
console.log(`Tracker  : TRANSCRIPTION_PROGRESS.md`);
