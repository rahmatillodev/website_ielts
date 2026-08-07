import { useEffect, useMemo, useState } from "react";
import { resolveDurations, storedDurationSeconds } from "@/utils/mediaDuration";

/**
 * Real video lengths for a list of library items, as `{ [itemId]: seconds }`.
 *
 * Two sources, in order:
 *   - `item.durationSeconds`, the length stored on the row
 *     (`part.video_duration_seconds`). Present in the very first returned map,
 *     so those cards never flash the unknown state.
 *   - measurement from the video source, for rows the admin app left empty.
 *     Those ids appear once the probe resolves.
 *
 * An id that is neither stored nor measurable is simply absent, and the card
 * shows DURATION_UNKNOWN.
 *
 * @param {Array<{ id: string, videoUrl: string, durationSeconds?: number|null }>} items
 */
/** Stable identity, so the returned map does not change when there is nothing measured. */
const NONE = {};

export function useMediaDurations(items) {
  // Measurements are held together with the list they belong to. Reading them
  // back through that key is what discards a previous page's results, so the
  // effect never has to clear state synchronously (which would cost an extra
  // render pass on every list change).
  const [probed, setProbed] = useState({ signature: "", values: NONE });

  // The effect keys off the ids, URLs and stored lengths rather than the array
  // identity - the libraries rebuild their item objects on every render and
  // would otherwise re-probe forever. JSON carries the tuple list through the
  // key losslessly, so a URL containing whatever delimiter we might have picked
  // cannot corrupt it.
  const signature = JSON.stringify(
    items.map((item) => [item.id, item.videoUrl, storedDurationSeconds(item.durationSeconds)])
  );

  const stored = useMemo(() => {
    const map = {};
    for (const [id, , seconds] of JSON.parse(signature)) {
      if (seconds != null) map[id] = seconds;
    }
    return map;
  }, [signature]);

  useEffect(() => {
    // Only rows without a usable stored length are measured: a stored value is
    // already the real length, and probing it again would cost a request per
    // card for a number we have.
    const entries = JSON.parse(signature)
      .filter(([, , seconds]) => seconds == null)
      .map(([id, videoUrl]) => ({ id, videoUrl }));

    // Merged one at a time rather than in one final assignment: each card shows
    // its length as soon as its own video answers, instead of every card waiting
    // on the slowest video on the page.
    let cancelled = false;
    resolveDurations(entries, (id, seconds) => {
      if (cancelled) return;
      setProbed((previous) => ({
        signature,
        // Results carried over only while they still describe this same list.
        values:
          previous.signature === signature
            ? { ...previous.values, [id]: seconds }
            : { [id]: seconds },
      }));
    });

    return () => {
      cancelled = true;
    };
  }, [signature]);

  const measured = probed.signature === signature ? probed.values : NONE;

  // Stored last: it is the authority, and it is the only half that is correct
  // before the probe resolves.
  return useMemo(() => ({ ...measured, ...stored }), [measured, stored]);
}

export default useMediaDurations;
