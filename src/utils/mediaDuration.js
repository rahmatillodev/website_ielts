/**
 * Real running time for the Speaking library videos.
 *
 * The cards used to print `test.duration`, but that column is the exam time
 * limit in minutes (INTEGER, default 60 — see full_db.md and INGESTION_GUIDE.md),
 * not the length of the attached video. Podcast and shadowing rows reuse the
 * `test` table, so they inherit whatever limit was set at creation: that is why
 * a 40-minute recording was captioned "20 min".
 *
 * The length now comes from two places, in order:
 *
 *   1. `part.video_duration_seconds` — the measured length, stored alongside the
 *      video URL (see supabase/migrations/20260807120000_part_video_duration.sql).
 *      When it is set the card is exact on first paint, with no network work.
 *   2. otherwise the video itself is measured, so a row that predates the column
 *      or that the admin app left empty is still correct:
 *        - a media file (Supabase storage, any http(s) URL that a media element
 *          can open) is probed with a detached element, which fetches only the
 *          metadata header;
 *        - a YouTube link is resolved through the Data API when
 *          VITE_YOUTUBE_API_KEY is configured — one batched request per page —
 *          and otherwise through the embedded player, which reports the same
 *          number without a key (src/utils/youtubeIframeDuration.js).
 *
 * That last step is what this file was missing. With no key configured the
 * Data API path returns nothing, and every YouTube-hosted card — which is most
 * of the library, since playback is a YouTube embed — fell through to
 * DURATION_UNKNOWN and showed "-- min".
 *
 * Anything we cannot measure stays unknown; callers render DURATION_UNKNOWN
 * rather than inventing a number.
 *
 * Seconds are the unit everywhere in here — the stored column, the probes, the
 * cache and the YouTube parse all speak seconds. `formatDuration` is the only
 * conversion, and it happens at the point of display.
 */

// Extension included on purpose: this module is run directly by `node --test`
// (src/utils/mediaDuration.test.js), and Node's ESM resolver does not guess it.
import { probeYoutubeDuration } from "./youtubeIframeDuration.js";

/** Shown when the length is not known — never an empty badge. */
export const DURATION_UNKNOWN = "-- min";

/**
 * How long to wait for a media header before giving up on a probe.
 *
 * Measured on a real library page: a 90-minute MP4 on a slow host takes ~9s to
 * hand over its header on its own, and longer while other probes are in flight.
 * 15s was not enough for those and they timed out; this leaves real headroom.
 * Nothing waits on this - other cards fill in as their own probes land.
 */
const PROBE_TIMEOUT_MS = 45000;

/**
 * Resolved lengths in seconds, keyed by URL.
 *
 * `null` is stored only for a URL that can never yield a length (not a media
 * file, not a YouTube link). A probe that fails or times out is deliberately
 * NOT cached: that is usually a slow network rather than a fact about the
 * video, and caching it would pin the card to "-- min" for the whole session.
 */
const durationCache = new Map();

const MEDIA_EXTENSIONS = /\.(mp4|m4v|mov|webm|ogv|ogg|mp3|m4a|wav|aac|flac)(\?|#|$)/i;

/**
 * Format a length in seconds as whole minutes: `6 min`, `42 min`, `81 min`.
 *
 * Seconds are the only unit carried around internally — stored, probed and
 * cached — and this is the single place they become minutes, so nothing
 * downstream has to know which unit it is holding.
 *
 * Minutes are rounded to nearest, not truncated: a 5m40s video is "6 min",
 * because flooring would caption it "5 min" and read as the shorter watch.
 * Hours are folded into the total (1h21m is "81 min") rather than printed as
 * `1h 21m` — the badge is asked for minutes only.
 *
 * Anything under 30 seconds would round to zero, and "0 min" reads as broken,
 * so a real length is never captioned below "1 min". DURATION_UNKNOWN when
 * there is nothing real to show.
 */
export function formatDuration(seconds) {
  const value = Number(seconds);
  if (!Number.isFinite(value) || value <= 0) return DURATION_UNKNOWN;

  return `${Math.max(1, Math.round(value / 60))} min`;
}

/**
 * A length read off a database row, or null when the column holds nothing
 * usable (NULL, 0, a negative, or a non-numeric string from a hand-edited row).
 *
 * Guards the stored path the same way the probe guards the measured one: a bad
 * stored value must fall through to measurement, not be printed as a duration.
 */
export function storedDurationSeconds(value) {
  if (value === null || value === undefined || value === "") return null;
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}

/** The YouTube video id in a watch/short/embed/youtu.be URL, or "" if it is not YouTube. */
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
    /* not a URL — fall through to the bare-id case below */
  }

  // `toIframeSrc` also accepts a bare video id, so this has to as well.
  return /^[a-zA-Z0-9_-]{6,32}$/.test(raw) && !raw.includes("/") ? raw : "";
}

/** True when the URL points at a media file a <video> element can read. */
export function isDirectMediaUrl(urlOrEmpty) {
  if (!urlOrEmpty || typeof urlOrEmpty !== "string") return false;
  const raw = urlOrEmpty.trim();
  if (!raw || youtubeVideoId(raw)) return false;
  try {
    return MEDIA_EXTENSIONS.test(new URL(raw, "https://placeholder.invalid").pathname);
  } catch {
    return false;
  }
}

/**
 * True when it is worth pointing a media element at this URL.
 *
 * A recognisable extension is the confident case, but plenty of real video
 * links do not have one — a Supabase Storage object stored without a suffix, a
 * signed CDN link that puts the name in the query string, a redirect. Those
 * used to be written off as "can never yield a length" and captioned "-- min"
 * forever; trying them costs one metadata request that fails fast and harmlessly
 * when the URL turns out not to be media.
 */
export function isProbableMediaUrl(urlOrEmpty) {
  if (!urlOrEmpty || typeof urlOrEmpty !== "string") return false;
  const raw = urlOrEmpty.trim();
  if (!raw || youtubeVideoId(raw)) return false;
  if (isDirectMediaUrl(raw)) return true;
  try {
    // Only real http(s) links: a bare word is not something to fetch.
    return /^https?:$/.test(new URL(raw).protocol);
  } catch {
    return false;
  }
}

/**
 * Read the real length of a media file, in seconds.
 *
 * `preload="metadata"` makes the browser fetch the header rather than the whole
 * file. Resolves null on error, on a stream with no known length, or if the
 * header does not arrive in time — never rejects, so one bad row cannot take a
 * page down.
 */
export function probeMediaDuration(url) {
  if (typeof document === "undefined") return Promise.resolve(null);

  return new Promise((resolve) => {
    const media = document.createElement("video");
    let settled = false;

    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      media.removeAttribute("src");
      // Detaches the network request; without it the element keeps buffering.
      media.load();
      resolve(value);
    };

    const timer = setTimeout(() => finish(null), PROBE_TIMEOUT_MS);

    media.preload = "metadata";
    media.muted = true;
    media.onloadedmetadata = () => {
      const { duration } = media;
      // Live streams report Infinity; a header-less file reports NaN.
      finish(Number.isFinite(duration) && duration > 0 ? duration : null);
    };
    media.onerror = () => finish(null);
    media.src = url;
  });
}

/** Seconds in an ISO-8601 duration such as `PT1H21M30S`. */
export function parseIsoDuration(iso) {
  if (typeof iso !== "string") return null;
  const match = iso.match(/^P(?:\d+D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/);
  if (!match) return null;
  const [, h, m, s] = match;
  const total = Number(h || 0) * 3600 + Number(m || 0) * 60 + Number(s || 0);
  return total > 0 ? total : null;
}

/**
 * Lengths for a batch of YouTube ids, as a Map of id → seconds.
 *
 * Returns an empty Map when VITE_YOUTUBE_API_KEY is unset, which is the
 * no-key default: YouTube exposes no other way to read a video's length from
 * the client, so those cards show DURATION_UNKNOWN instead of a wrong number.
 */
export async function fetchYoutubeDurations(videoIds) {
  const key = import.meta.env?.VITE_YOUTUBE_API_KEY;
  const ids = [...new Set(videoIds.filter(Boolean))];
  const out = new Map();
  if (!key || ids.length === 0) return out;

  // The endpoint takes up to 50 ids per call, so a library page is one request.
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${chunk.join(",")}&key=${key}`
      );
      if (!res.ok) continue;
      const body = await res.json();
      for (const item of body?.items ?? []) {
        const seconds = parseIsoDuration(item?.contentDetails?.duration);
        if (seconds) out.set(item.id, seconds);
      }
    } catch {
      // Offline or blocked: leave these ids unresolved rather than guessing.
    }
  }
  return out;
}

/**
 * How many videos are measured at once. A library page can hold a dozen, and a
 * dozen simultaneous metadata requests both saturate the connection pool and
 * slow every one of them down.
 */
const CONCURRENCY = 4;

/**
 * How many YouTube players boot at once. Lower than CONCURRENCY: each one is a
 * real embedded player rather than a range request, so a page full of them is
 * far heavier than the same number of metadata reads.
 */
const YOUTUBE_CONCURRENCY = 3;

/**
 * Resolve the real length of every video in `items` ([{ id, videoUrl }]).
 *
 * Resolves to a plain object of item id → seconds, omitting anything unknown.
 * `onResolved(id, seconds)` is called for each length as soon as it is known,
 * so a page can show each badge the moment its own video answers: waiting for
 * the whole list meant every card sat at "-- min" until the slowest video on the
 * page had replied, which on a real library was tens of seconds.
 */
export async function resolveDurations(items, onResolved) {
  const resolved = {};
  const report = (id, seconds) => {
    if (seconds == null) return;
    resolved[id] = seconds;
    onResolved?.(id, seconds);
  };

  const direct = new Map(); // videoUrl → [item ids]
  const youtube = new Map(); // youtube id → [{ id, videoUrl }]

  for (const { id, videoUrl } of items) {
    if (!videoUrl) continue;

    if (durationCache.has(videoUrl)) {
      const cached = durationCache.get(videoUrl);
      if (cached != null) report(id, cached);
      continue;
    }

    const ytId = youtubeVideoId(videoUrl);
    if (ytId) {
      if (!youtube.has(ytId)) youtube.set(ytId, []);
      youtube.get(ytId).push({ id, videoUrl });
    } else if (isProbableMediaUrl(videoUrl)) {
      // Grouped by URL so the same video listed twice is measured once.
      if (!direct.has(videoUrl)) direct.set(videoUrl, []);
      direct.get(videoUrl).push(id);
    } else {
      // Not a link at all — nothing could ever measure it, so this negative is
      // worth keeping.
      durationCache.set(videoUrl, null);
    }
  }

  /**
   * YouTube: the batched Data API first (one request for the page, when a key
   * is configured), then the embedded player for whatever is left. The player
   * needs no key, which is the only reason these cards can show a real number
   * at all in a deployment without VITE_YOUTUBE_API_KEY.
   */
  const resolveYoutube = async () => {
    if (youtube.size === 0) return;

    const fromApi = await fetchYoutubeDurations([...youtube.keys()]);
    const unresolved = [];

    for (const [ytId, entries] of youtube) {
      const seconds = fromApi.get(ytId) ?? null;
      if (seconds == null) {
        unresolved.push(ytId);
        continue;
      }
      for (const entry of entries) {
        durationCache.set(entry.videoUrl, seconds);
        report(entry.id, seconds);
      }
    }

    let cursor = 0;
    const worker = async () => {
      while (cursor < unresolved.length) {
        const ytId = unresolved[cursor];
        cursor += 1;
        const seconds = await probeYoutubeDuration(ytId);
        for (const entry of youtube.get(ytId)) {
          if (seconds != null) durationCache.set(entry.videoUrl, seconds);
          report(entry.id, seconds);
        }
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(YOUTUBE_CONCURRENCY, unresolved.length) }, () => worker())
    );
  };

  // A worker pool rather than fixed batches: a single slow video holds up one
  // slot instead of blocking everything queued behind its batch.
  const resolveDirect = async () => {
    const urls = [...direct.keys()];
    let cursor = 0;
    const worker = async () => {
      while (cursor < urls.length) {
        const url = urls[cursor];
        cursor += 1;
        const seconds = await probeMediaDuration(url);
        if (seconds != null) durationCache.set(url, seconds);
        for (const id of direct.get(url)) report(id, seconds);
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, urls.length) }, () => worker())
    );
  };

  // Run both together: a page of YouTube cards must not wait on a slow MP4, or
  // the other way round.
  await Promise.all([resolveYoutube(), resolveDirect()]);

  return resolved;
}
