/**
 * Length of a YouTube video, measured in the browser with no API key.
 *
 * `fetchYoutubeDurations` (src/utils/mediaDuration.js) is the cheap path: one
 * batched Data API request for a whole page. It needs VITE_YOUTUBE_API_KEY,
 * and when that is not configured it returns nothing at all — which is why
 * every YouTube-hosted card showed "-- min".
 *
 * The embedded player exposes the same number without any credential:
 * `player.getDuration()`. That is what this module uses. It costs an offscreen
 * iframe per video rather than one request per page, so it runs only for the
 * videos the Data API did not already answer for.
 *
 * The player is muted, 1×1, offscreen and aria-hidden, and is destroyed the
 * moment the duration is known. The app already embeds YouTube for playback
 * (src/utils/videoIframeSrc.js), so this introduces no new third party.
 */

const IFRAME_API_SRC = "https://www.youtube.com/iframe_api";

/** How long to wait for the API script itself before giving up. */
const API_TIMEOUT_MS = 20000;

/**
 * How long to wait for one video's metadata.
 *
 * Generous because several of these run alongside each other and each is a real
 * player boot, not a header read. Nothing waits on it — every card fills in as
 * its own probe lands.
 */
const PROBE_TIMEOUT_MS = 30000;

/** Resolved once per page load; the API script is global and loads only once. */
let apiPromise = null;

/**
 * The YT namespace once the iframe API is usable, or null if it never loads
 * (offline, blocked by an extension, or a content blocker).
 */
export function loadYoutubeIframeApi() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.resolve(null);
  }
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), API_TIMEOUT_MS);
    const settle = () => {
      clearTimeout(timer);
      resolve(window.YT?.Player ? window.YT : null);
    };

    // The script calls this global exactly once when it is ready. Any existing
    // handler is chained rather than replaced, so this cannot break another
    // consumer that got there first.
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previous === "function") previous();
      settle();
    };

    if (!document.querySelector(`script[src="${IFRAME_API_SRC}"]`)) {
      const script = document.createElement("script");
      script.src = IFRAME_API_SRC;
      script.async = true;
      // Blocked or offline: resolve null rather than hanging until the timeout.
      script.onerror = settle;
      document.head.appendChild(script);
    }
  });

  return apiPromise;
}

/**
 * The length of one YouTube video in seconds, or null.
 *
 * Never rejects: a private, deleted, region-locked or embedding-disabled video
 * resolves null, and the card keeps showing the unknown badge rather than a
 * wrong number.
 */
export async function probeYoutubeDuration(videoId) {
  const YT = await loadYoutubeIframeApi();
  if (!YT?.Player || !videoId) return null;

  return new Promise((resolve) => {
    // The player replaces the element it is given, so it gets its own mount
    // inside a wrapper we can still remove afterwards.
    const host = document.createElement("div");
    host.setAttribute("aria-hidden", "true");
    host.style.cssText =
      "position:absolute;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none";
    const mount = document.createElement("div");
    host.appendChild(mount);
    document.body.appendChild(host);

    let player = null;
    let poll = null;
    let settled = false;

    const finish = (seconds) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearInterval(poll);
      // Destroying stops the muted playback below and detaches the iframe.
      try {
        player?.destroy?.();
      } catch {
        /* already torn down */
      }
      host.remove();
      resolve(Number.isFinite(seconds) && seconds > 0 ? seconds : null);
    };

    const timer = setTimeout(() => finish(null), PROBE_TIMEOUT_MS);

    const read = () => {
      const seconds = Number(player?.getDuration?.());
      if (Number.isFinite(seconds) && seconds > 0) finish(seconds);
    };

    player = new YT.Player(mount, {
      width: 1,
      height: 1,
      videoId,
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        rel: 0,
        playsinline: 1,
      },
      events: {
        onReady: (event) => {
          event.target.mute();
          read();
          if (settled) return;

          // Some videos report 0 until the player has actually begun loading the
          // stream. It is muted and offscreen, and `finish` destroys it as soon
          // as the number arrives, so this is inaudible and invisible.
          try {
            event.target.playVideo();
          } catch {
            /* autoplay refused — the poll below still gets it once ready */
          }
          poll = setInterval(read, 250);
        },
        onError: () => finish(null),
      },
    });
  });
}

export default probeYoutubeDuration;
