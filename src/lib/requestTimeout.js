/**
 * Request deadlines for Supabase queries.
 *
 * These replace the `Promise.race([query, rejectAfter(ms)])` pattern that used
 * to guard the test-list queries. That pattern had three problems:
 *
 *  - it reported a failure while leaving the real request running, so a slow
 *    response still arrived later and was silently discarded;
 *  - its `setTimeout` was never cleared, so every call left a timer armed for
 *    the full duration even after the query had succeeded;
 *  - it could not distinguish "the server is slow" from "the client is blocked
 *    before the request was ever sent", which is what actually happened.
 *
 * An abort signal cancels the underlying fetch, cannot fire once the request
 * has settled, and is understood natively by `postgrest-js` via `.abortSignal()`.
 */

/**
 * A signal that aborts after `ms` milliseconds.
 * @param {number} ms
 * @returns {AbortSignal}
 */
export const requestTimeoutSignal = (ms) => {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(ms);
  }
  // Older engines: same semantics, one timer that dies with the signal.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  controller.signal.addEventListener("abort", () => clearTimeout(timer), { once: true });
  return controller.signal;
};

/**
 * Was this error a cancelled or timed-out request rather than a real failure?
 * `AbortSignal.timeout` rejects with a `TimeoutError`; a manual abort and
 * postgrest's own cancellation both surface as `AbortError`.
 * @param {unknown} error
 * @returns {boolean}
 */
export const isAbortLikeError = (error) => {
  const name = error?.name;
  if (name === "AbortError" || name === "TimeoutError") return true;
  const message = error?.message || "";
  return /aborted|abortederror|signal is aborted|timeout/i.test(message);
};
