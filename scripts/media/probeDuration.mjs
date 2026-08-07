// Read the real length of a remote video without downloading it and without
// ffmpeg (which is not installed on the machines these scripts run on).
//
// The browser gets this for free from `<video preload="metadata">`; Node has no
// media stack, so the container header is parsed directly. Both formats keep the
// duration in a small metadata block, so a handful of HTTP Range requests is
// enough regardless of how large the file is:
//
//   - ISO-BMFF (.mp4 / .m4v / .mov / .m4a): the `moov` box holds `mvhd`, which
//     holds a timescale and a duration in those units. Top-level boxes are
//     walked by size so `moov` is found whether it sits before the media data
//     (faststart) or after it.
//   - Matroska / WebM: the Segment's `Info` element holds `TimecodeScale`
//     (nanoseconds, default 1e6) and a floating-point `Duration` in those units.
//     Info sits near the head of the Segment, so one prefix read covers it.
//
// Anything else - mp3, wav, ogg, a URL the server will not serve ranges for -
// returns null with a reason. A null is reported and skipped; it is never
// written, because a wrong duration is worse than an absent one.

/** Bytes pulled for the header walks. Generous: these are cheap range reads. */
const BOX_HEADER_BYTES = 16;
const MOOV_PREFIX_BYTES = 64 * 1024;
const EBML_PREFIX_BYTES = 2 * 1024 * 1024;

/** Stop walking a malformed file rather than looping on a zero-size box. */
const MAX_TOP_LEVEL_BOXES = 128;

export class DurationProbeError extends Error {}

/**
 * Fetch bytes [start, end] inclusive.
 *
 * Servers that ignore `Range` answer 200 with the whole body; that is handled by
 * slicing rather than failing, but it means the caller may get more bytes than
 * it asked for - never fewer without an error.
 */
async function fetchRange(url, start, end, { fetchImpl = fetch } = {}) {
  const res = await fetchImpl(url, { headers: { Range: `bytes=${start}-${end}` } });
  if (!res.ok) throw new DurationProbeError(`HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (res.status === 200 && start > 0) {
    // Full body despite the Range header - slice out the window ourselves.
    return bytes.slice(start, end + 1);
  }
  return bytes;
}

const u32 = (b, i) =>
  ((b[i] << 24) >>> 0) + (b[i + 1] << 16) + (b[i + 2] << 8) + b[i + 3];

const u64 = (b, i) => {
  let value = 0n;
  for (let k = 0; k < 8; k += 1) value = (value << 8n) | BigInt(b[i + k]);
  return Number(value);
};

const boxType = (b, i) => String.fromCharCode(b[i], b[i + 1], b[i + 2], b[i + 3]);

/** Seconds from an `mvhd` payload (the bytes after its 8-byte box header). */
export function mvhdSeconds(mvhd) {
  if (!mvhd || mvhd.length < 20) return null;
  const version = mvhd[0];
  // version/flags(4) then creation+modification: 4+4 in v0, 8+8 in v1.
  const base = version === 1 ? 4 + 16 : 4 + 8;
  if (mvhd.length < base + (version === 1 ? 12 : 8)) return null;

  const timescale = u32(mvhd, base);
  const duration = version === 1 ? u64(mvhd, base + 4) : u32(mvhd, base + 4);
  if (!timescale) return null;

  // 0xFFFFFFFF is the "unknown duration" sentinel in a v0 header.
  if (version === 0 && duration === 0xffffffff) return null;

  const seconds = duration / timescale;
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}

/** Seconds from a `moov` payload, by finding its `mvhd` child. */
export function moovSeconds(moov) {
  let offset = 0;
  while (offset + 8 <= moov.length) {
    const size = u32(moov, offset);
    const type = boxType(moov, offset + 4);
    if (type === "mvhd") return mvhdSeconds(moov.subarray(offset + 8, offset + Math.max(size, 8)));
    if (size < 8) return null;
    offset += size;
  }
  return null;
}

/** Length of an ISO-BMFF file in seconds, or null. */
export async function isoBmffDuration(url, options = {}) {
  let offset = 0;

  for (let i = 0; i < MAX_TOP_LEVEL_BOXES; i += 1) {
    const head = await fetchRange(url, offset, offset + BOX_HEADER_BYTES - 1, options);
    if (head.length < 8) return null;

    let size = u32(head, 0);
    const type = boxType(head, 4);
    let headerSize = 8;

    if (size === 1) {
      if (head.length < 16) return null;
      size = u64(head, 8);
      headerSize = 16;
    } else if (size === 0) {
      // Extends to end of file; only meaningful as the last box.
      size = Number.POSITIVE_INFINITY;
    }

    if (type === "moov") {
      const payload = Number.isFinite(size) ? size - headerSize : MOOV_PREFIX_BYTES;
      const start = offset + headerSize;
      const moov = await fetchRange(url, start, start + Math.min(payload, MOOV_PREFIX_BYTES) - 1, options);
      return moovSeconds(moov);
    }

    if (!Number.isFinite(size) || size < 8) return null;
    offset += size;
  }

  return null;
}

/** An EBML variable-length integer at `pos`. `keepMarker` for element ids. */
export function readVint(buf, pos, keepMarker) {
  if (pos >= buf.length) return null;
  const first = buf[pos];
  if (first === 0) return null;

  let length = 1;
  while (length <= 8 && !(first & (0x80 >> (length - 1)))) length += 1;
  if (length > 8 || pos + length > buf.length) return null;

  let value = keepMarker ? first : first & (0xff >> length);
  for (let i = 1; i < length; i += 1) value = value * 256 + buf[pos + i];

  return { value, length };
}

/** IEEE float of 4 or 8 bytes, as Matroska stores `Duration`. */
function readFloat(buf, pos, size) {
  const view = new DataView(buf.buffer, buf.byteOffset + pos, size);
  if (size === 4) return view.getFloat32(0);
  if (size === 8) return view.getFloat64(0);
  return null;
}

const EBML_SEGMENT = 0x18538067;
const EBML_INFO = 0x1549a966;
const EBML_TIMECODE_SCALE = 0x2ad7b1;
const EBML_DURATION = 0x4489;

/** Seconds from a Matroska/WebM prefix, or null if Info is not in it yet. */
export function matroskaSeconds(buf) {
  // Descend into Segment, then Info; read the two children that matter.
  const descend = (start, limit, wanted) => {
    let pos = start;
    while (pos < limit) {
      const id = readVint(buf, pos, true);
      if (!id) return null;
      const size = readVint(buf, pos + id.length, false);
      if (!size) return null;
      const contentStart = pos + id.length + size.length;
      if (id.value === wanted) return { start: contentStart, end: contentStart + size.value };
      pos = contentStart + size.value;
    }
    return null;
  };

  // Skip the EBML header element to reach Segment.
  const segment = descend(0, buf.length, EBML_SEGMENT);
  if (!segment) return null;

  const info = descend(segment.start, Math.min(segment.end, buf.length), EBML_INFO);
  if (!info) return null;

  let timecodeScale = 1_000_000; // nanoseconds, the spec default
  let duration = null;

  let pos = info.start;
  const end = Math.min(info.end, buf.length);
  while (pos < end) {
    const id = readVint(buf, pos, true);
    if (!id) break;
    const size = readVint(buf, pos + id.length, false);
    if (!size) break;
    const contentStart = pos + id.length + size.length;
    if (contentStart + size.value > buf.length) break;

    if (id.value === EBML_TIMECODE_SCALE) {
      let scale = 0;
      for (let i = 0; i < size.value; i += 1) scale = scale * 256 + buf[contentStart + i];
      if (scale > 0) timecodeScale = scale;
    } else if (id.value === EBML_DURATION) {
      duration = readFloat(buf, contentStart, size.value);
    }

    pos = contentStart + size.value;
  }

  if (duration == null) return null;
  const seconds = (duration * timecodeScale) / 1e9;
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}

/** Length of a Matroska/WebM file in seconds, or null. */
export async function matroskaDuration(url, options = {}) {
  const prefix = await fetchRange(url, 0, EBML_PREFIX_BYTES - 1, options);
  return matroskaSeconds(prefix);
}

/** Seconds in an ISO-8601 duration such as `PT1H21M30S`. Mirrors the client's copy. */
export function parseIsoDuration(iso) {
  if (typeof iso !== "string") return null;
  const match = iso.match(/^P(?:\d+D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/);
  if (!match) return null;
  const [, h, m, s] = match;
  const total = Number(h || 0) * 3600 + Number(m || 0) * 60 + Number(s || 0);
  return total > 0 ? total : null;
}

/** The YouTube video id in a watch/short/embed/youtu.be URL, or "". */
export function youtubeVideoId(urlOrEmpty) {
  if (!urlOrEmpty || typeof urlOrEmpty !== "string") return "";
  const raw = urlOrEmpty.trim();
  if (!raw) return "";
  try {
    const url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return url.pathname.split("/").filter(Boolean)[0] || "";
    if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      const v = url.searchParams.get("v");
      if (v) return v;
      const path = url.pathname.match(/\/(?:embed|shorts|v)\/([^/?]+)/);
      if (path?.[1]) return path[1];
    }
  } catch {
    /* not a URL */
  }
  return /^[a-zA-Z0-9_-]{6,32}$/.test(raw) && !raw.includes("/") ? raw : "";
}

/**
 * Seconds in a watch page's `ytInitialPlayerResponse`, or null.
 *
 * The watch page carries `"lengthSeconds":"213"` for every public video. It is
 * the only way to read a YouTube length from Node without an API key, and
 * without it a library whose videos are all YouTube (which is what these
 * podcast/shadowing rows are) can never be backfilled at all.
 */
export function lengthSecondsFromWatchHtml(html) {
  if (typeof html !== "string") return null;
  const seconds = Number(html.match(/"lengthSeconds":"(\d+)"/)?.[1]);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}

/** Length of one YouTube video in seconds via its watch page. No API key needed. */
export async function youtubeWatchDuration(videoId, { fetchImpl = fetch } = {}) {
  if (!videoId) return null;
  try {
    const res = await fetchImpl(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        // Without a desktop UA the response is a consent interstitial with no
        // player data in it.
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) return null;
    return lengthSecondsFromWatchHtml(await res.text());
  } catch {
    // Offline or blocked: report nothing rather than guessing.
    return null;
  }
}

/** Lengths for a batch of YouTube ids, as a Map of id → seconds. */
export async function fetchYoutubeDurations(videoIds, apiKey, { fetchImpl = fetch } = {}) {
  const ids = [...new Set(videoIds.filter(Boolean))];
  const out = new Map();
  if (!apiKey || ids.length === 0) return out;

  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const res = await fetchImpl(
      `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${chunk.join(",")}&key=${apiKey}`
    );
    if (!res.ok) throw new DurationProbeError(`YouTube API HTTP ${res.status}`);
    const body = await res.json();
    for (const item of body?.items ?? []) {
      const seconds = parseIsoDuration(item?.contentDetails?.duration);
      if (seconds) out.set(item.id, seconds);
    }
  }
  return out;
}

const ISO_BMFF = /\.(mp4|m4v|mov|m4a)(\?|#|$)/i;
const MATROSKA = /\.(webm|mkv)(\?|#|$)/i;

/**
 * Length of one direct media URL in seconds.
 * Resolves `{ seconds }` or `{ seconds: null, reason }` — never throws.
 */
export async function probeDirectDuration(url, options = {}) {
  let pathname = url;
  try {
    pathname = new URL(url).pathname;
  } catch {
    return { seconds: null, reason: "not a URL" };
  }

  try {
    if (ISO_BMFF.test(pathname)) {
      const seconds = await isoBmffDuration(url, options);
      return seconds ? { seconds } : { seconds: null, reason: "no mvhd duration in header" };
    }
    if (MATROSKA.test(pathname)) {
      const seconds = await matroskaDuration(url, options);
      return seconds ? { seconds } : { seconds: null, reason: "no Info duration in header" };
    }
    return { seconds: null, reason: `unsupported container (${pathname.split(".").pop()})` };
  } catch (error) {
    return { seconds: null, reason: error.message };
  }
}
