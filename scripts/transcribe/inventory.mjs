// Step 1: enumerate every listening audio file, its duration, and how it maps
// to test parts. Read-only — writes nothing to the DB.
//
// Usage: node --env-file=.env.prod scripts/transcribe/inventory.mjs

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFileSync } from 'node:fs';
import { supabase, fetchListeningTests, fmtDuration } from './lib.mjs';

const execFileAsync = promisify(execFile);

/** Read duration + size straight from the remote URL via ffprobe (no download). */
async function probe(url) {
  const { stdout } = await execFileAsync(
    'ffprobe',
    [
      '-v', 'error',
      '-show_entries', 'format=duration,size,bit_rate',
      '-of', 'json',
      url,
    ],
    { timeout: 60_000, maxBuffer: 1024 * 1024 }
  );
  const fmt = JSON.parse(stdout).format ?? {};
  return {
    durationSec: fmt.duration ? Number(fmt.duration) : null,
    bytes: fmt.size ? Number(fmt.size) : null,
    bitRate: fmt.bit_rate ? Number(fmt.bit_rate) : null,
  };
}

const db = supabase();
const tests = await fetchListeningTests(db);

console.log(`Listening tests found: ${tests.length}\n`);

// Distinct audio URLs across all parts of all tests.
const urlToParts = new Map();
for (const t of tests) {
  for (const p of t.parts) {
    if (!p.listening_url) continue;
    if (!urlToParts.has(p.listening_url)) urlToParts.set(p.listening_url, []);
    urlToParts.get(p.listening_url).push({ test: t, part: p });
  }
}

console.log(`Distinct audio URLs: ${urlToParts.size}`);
console.log('Probing durations (this makes one range request per file)...\n');

// Probe with bounded concurrency - ffprobe over the network is I/O bound.
const entries = [...urlToParts];
const rows = new Array(entries.length);
let totalSec = 0;
let probeFailures = 0;
let done = 0;

const CONCURRENCY = 8;
let cursor = 0;
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (cursor < entries.length) {
      const i = cursor++;
      const [url, uses] = entries[i];
      let info = { durationSec: null, bytes: null, bitRate: null };
      let probeError = null;
      try {
        info = await probe(url);
      } catch (err) {
        probeError = err.message.split('\n')[0];
        probeFailures++;
      }
      if (info.durationSec) totalSec += info.durationSec;
      rows[i] = { url, uses, ...info, probeError };
      if (++done % 10 === 0) process.stdout.write(`  probed ${done}/${entries.length}\n`);
    }
  })
);

// Per-test summary.
console.log('=== PER-TEST BREAKDOWN ===\n');
for (const t of tests) {
  const partsWithAudio = t.parts.filter((p) => p.listening_url);
  const distinct = new Set(partsWithAudio.map((p) => p.listening_url));
  const partsWithContent = t.parts.filter((p) => p.content && p.content.trim());
  const row = rows.find((r) => r.url === partsWithAudio[0]?.listening_url);

  console.log(`${t.title}`);
  console.log(`  test id       : ${t.id}`);
  console.log(`  active        : ${t.is_active}   questions: ${t.question_quantity}`);
  console.log(`  parts         : ${t.parts.length} (numbers: ${t.parts.map((p) => p.part_number).join(', ') || 'none'})`);
  console.log(`  parts w/ audio: ${partsWithAudio.length} on part_number(s) ${partsWithAudio.map((p) => p.part_number).join(', ') || '-'}`);
  console.log(`  distinct URLs : ${distinct.size}`);
  console.log(`  duration      : ${fmtDuration(row?.durationSec)}`);
  console.log(`  parts w/ existing content: ${partsWithContent.length ? partsWithContent.map((p) => p.part_number).join(', ') : 'none'}`);
  if (!partsWithAudio.length) console.log('  !! NO AUDIO URL ON ANY PART');
  console.log('');
}

// Aggregate.
const oneFilePerTest = rows.every((r) => new Set(r.uses.map((u) => u.test.id)).size === 1);
const partNumbersCarryingAudio = new Set(
  rows.flatMap((r) => r.uses.map((u) => u.part.part_number))
);

console.log('=== TOTALS ===');
console.log(`Listening tests            : ${tests.length}`);
console.log(`Tests with at least 1 audio: ${tests.filter((t) => t.parts.some((p) => p.listening_url)).length}`);
console.log(`Distinct audio files       : ${urlToParts.size}`);
console.log(`Probe failures             : ${probeFailures}`);
console.log(`Total audio duration       : ${fmtDuration(totalSec)} (${(totalSec / 3600).toFixed(2)} h)`);
console.log(`Audio tokens @32 tok/sec   : ${Math.round(totalSec * 32).toLocaleString()}`);
console.log(`Audio URL shared across tests? ${oneFilePerTest ? 'no - each file belongs to exactly 1 test' : 'YES - some files are reused'}`);
console.log(`Audio lives on part_number(s): ${[...partNumbersCarryingAudio].sort().join(', ')}`);

const longest = [...rows].sort((a, b) => (b.durationSec ?? 0) - (a.durationSec ?? 0))[0];
console.log(`Longest single file        : ${fmtDuration(longest?.durationSec)} = ${Math.round((longest?.durationSec ?? 0) * 32).toLocaleString()} tokens`);

// Machine-readable dump for the tracker builder.
const out = rows.map((r) => ({
  url: r.url,
  durationSec: r.durationSec,
  bytes: r.bytes,
  probeError: r.probeError,
  tests: r.uses.map((u) => ({
    testId: u.test.id,
    title: u.test.title,
    partId: u.part.id,
    partNumber: u.part.part_number,
  })),
}));
writeFileSync(
  new URL('./audio_inventory.json', import.meta.url),
  JSON.stringify({ tests, audio: out }, null, 2)
);
console.log('\nWrote scripts/transcribe/audio_inventory.json');
