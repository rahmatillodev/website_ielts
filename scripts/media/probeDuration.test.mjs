// Header-parsing tests for the backfill probe.
//
// The buffers are built by hand rather than downloaded: these assertions have to
// stay true offline and must not depend on a third party keeping a sample file
// at a stable length. The parsers were separately checked against real files
// (see the module header) — this pins the byte-level arithmetic.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  lengthSecondsFromWatchHtml,
  matroskaSeconds,
  moovSeconds,
  mvhdSeconds,
  parseIsoDuration,
  readVint,
  youtubeVideoId,
} from './probeDuration.mjs';

const bytes = (...values) => Uint8Array.from(values.flat());
const u32be = (n) => [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];
const u64be = (n) => [...u32be(Math.floor(n / 2 ** 32)), ...u32be(n >>> 0)];
const ascii = (s) => [...s].map((c) => c.charCodeAt(0));

/** An `mvhd` payload: the bytes that follow its 8-byte box header. */
const mvhdV0 = (timescale, duration) =>
  bytes([0, 0, 0, 0], u32be(0), u32be(0), u32be(timescale), u32be(duration), new Array(80).fill(0));

const mvhdV1 = (timescale, duration) =>
  bytes([1, 0, 0, 0], u64be(0), u64be(0), u32be(timescale), u64be(duration), new Array(80).fill(0));

/** Wrap a payload in a box, as it sits inside `moov`. */
const box = (type, payload) => bytes(u32be(payload.length + 8), ascii(type), [...payload]);

test('mvhdSeconds: version 0 divides duration by timescale', () => {
  assert.equal(mvhdSeconds(mvhdV0(1000, 515000)), 515); // 08:35
  assert.equal(mvhdSeconds(mvhdV0(600, 1522800)), 2538); // 42:18
  assert.equal(mvhdSeconds(mvhdV0(90000, 392400000)), 4360); // 1:12:40
});

test('mvhdSeconds: version 1 reads the 64-bit fields at their own offsets', () => {
  assert.equal(mvhdSeconds(mvhdV1(1000, 515000)), 515);
  assert.equal(mvhdSeconds(mvhdV1(48000, 5_000_000_000)), 5_000_000_000 / 48000);
});

test('mvhdSeconds: refuses what it cannot turn into a real length', () => {
  assert.equal(mvhdSeconds(mvhdV0(0, 515000)), null, 'zero timescale');
  assert.equal(mvhdSeconds(mvhdV0(1000, 0)), null, 'zero duration');
  assert.equal(mvhdSeconds(mvhdV0(1000, 0xffffffff)), null, 'v0 unknown-duration sentinel');
  assert.equal(mvhdSeconds(bytes([0, 0, 0, 0])), null, 'truncated');
  assert.equal(mvhdSeconds(null), null);
});

test('moovSeconds: finds mvhd past a preceding sibling box', () => {
  const moov = bytes([
    ...box('udta', bytes(new Array(32).fill(7))),
    ...box('mvhd', mvhdV0(1000, 515000)),
  ]);
  assert.equal(moovSeconds(moov), 515);
});

test('moovSeconds: null when the prefix holds no mvhd', () => {
  assert.equal(moovSeconds(box('trak', bytes(new Array(16).fill(0)))), null);
  // A zero-size box would otherwise spin forever.
  assert.equal(moovSeconds(bytes(u32be(0), ascii('trak'))), null);
});

test('readVint: length comes from the leading marker bit', () => {
  assert.deepEqual(readVint(bytes([0x84]), 0, false), { value: 4, length: 1 });
  assert.deepEqual(readVint(bytes([0x40, 0x84]), 0, false), { value: 0x84, length: 2 });
  // Element ids keep their marker; sizes strip it.
  assert.equal(readVint(bytes([0x18, 0x53, 0x80, 0x67]), 0, true).value, 0x18538067);
  assert.equal(readVint(bytes([0x18, 0x53, 0x80, 0x67]), 0, false).value, 0x08538067);
  assert.equal(readVint(bytes([0x00]), 0, false), null, 'no marker bit in 8 bytes');
  assert.equal(readVint(bytes([0x84]), 5, false), null, 'past the end');
});

/** A Matroska prefix: EBML header, then Segment > Info > TimecodeScale + Duration. */
function webm(durationTicks, timecodeScale = 1_000_000) {
  const size4 = (n) => [0x10 | ((n >>> 24) & 0x0f), (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];
  const element = (id, payload) => bytes(id, size4(payload.length), [...payload]);

  const float64 = new Uint8Array(8);
  new DataView(float64.buffer).setFloat64(0, durationTicks);

  const info = element(
    [0x15, 0x49, 0xa9, 0x66],
    bytes([...element([0x2a, 0xd7, 0xb1], bytes(u32be(timecodeScale)))], [
      ...element([0x44, 0x89], float64),
    ])
  );

  return bytes(
    [...element([0x1a, 0x45, 0xdf, 0xa3], bytes(new Array(8).fill(0)))], // EBML header, skipped
    [...element([0x18, 0x53, 0x80, 0x67], info)] // Segment
  );
}

test('matroskaSeconds: duration ticks scaled by TimecodeScale', () => {
  assert.equal(matroskaSeconds(webm(515000)), 515); // default 1ms ticks
  assert.equal(matroskaSeconds(webm(2538000)), 2538);
  // A non-default scale must actually be used, not assumed.
  assert.equal(matroskaSeconds(webm(4360, 1_000_000_000)), 4360);
});

test('matroskaSeconds: null when Info is not in the prefix', () => {
  assert.equal(matroskaSeconds(bytes([0x1a, 0x45, 0xdf, 0xa3, 0x84, 0, 0, 0, 0])), null);
  assert.equal(matroskaSeconds(bytes([])), null);
});

test('lengthSecondsFromWatchHtml: the keyless YouTube path', () => {
  // The shape the watch page actually carries, checked against real pages:
  // dQw4w9WgXcQ is 213s and jNQXAC9IVRw ("Me at the zoo") is 19s.
  assert.equal(lengthSecondsFromWatchHtml('...,"lengthSeconds":"213","isLive"...'), 213);
  assert.equal(lengthSecondsFromWatchHtml('"lengthSeconds":"19"'), 19);
  assert.equal(lengthSecondsFromWatchHtml('"lengthSeconds":"7679"'), 7679);

  // A live stream reports 0, and a consent page or an error carries nothing.
  // Both must stay null so the backfill skips rather than storing a wrong value.
  assert.equal(lengthSecondsFromWatchHtml('"lengthSeconds":"0"'), null);
  assert.equal(lengthSecondsFromWatchHtml('<html>consent</html>'), null);
  assert.equal(lengthSecondsFromWatchHtml(''), null);
  assert.equal(lengthSecondsFromWatchHtml(null), null);
});

test('the script shares the client contract for YouTube links', () => {
  assert.equal(youtubeVideoId('https://youtu.be/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(youtubeVideoId('https://cdn.example.com/lesson.mp4'), '');
  assert.equal(parseIsoDuration('PT1H12M40S'), 4360);
  assert.equal(parseIsoDuration('nonsense'), null);
});
