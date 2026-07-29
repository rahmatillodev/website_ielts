/**
 * User-facing messages for Supabase auth failures.
 *
 * Every auth action used to surface `error.message` verbatim, so a dropped
 * connection reached the user as the raw string "Failed to fetch" - a developer
 * message that reads like a hard rejection and gives no hint that retrying would
 * work.
 *
 * The reason it slips through is that supabase-js does not throw on a network
 * failure. It catches the rejected fetch, wraps it in an `AuthRetryableFetchError`
 * with `status: 0`, and RETURNS it, so it arrives on exactly the same path as a
 * genuine 400 from the API and is indistinguishable without an explicit check.
 * This module is that check, kept in one place so every caller classifies the
 * same way.
 */

export const NETWORK_ERROR_MESSAGE =
  "Couldn't reach the server. Check your internet connection and try again.";

export const SERVER_ERROR_MESSAGE =
  'The server is temporarily unavailable. Please try again in a moment.';

export const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.';

/**
 * How long an error toast stays on screen.
 *
 * The global `ToastContainer` default is 2s, which is fine for "Saved!" but too
 * short to read a failure and understand what to do about it.
 */
export const AUTH_ERROR_TOAST_MS = 8000;

/**
 * Failures raised by fetch itself, before any HTTP status exists. The wording
 * differs per browser: Chrome "Failed to fetch", Firefox "NetworkError when
 * attempting to fetch resource", Safari "Load failed", React Native "Network
 * request failed".
 */
const NETWORK_MESSAGE_PATTERN =
  /failed to fetch|networkerror|network request failed|load failed|connection closed|err_connection|err_network|err_internet_disconnected|the internet connection appears to be offline/i;

/**
 * Messages Supabase returns that are accurate but read like API internals.
 * Deliberately short - anything not listed falls through to Supabase's own text,
 * which is usually already written for humans (rate-limit notices, for example,
 * carry the exact number of seconds left and are better left intact).
 */
const KNOWN_MESSAGES = [
  {
    pattern: /invalid login credentials/i,
    message: 'Invalid email or password.',
  },
  {
    pattern: /email not confirmed/i,
    message: 'Please confirm your email address first - check your inbox for the link.',
  },
  {
    pattern: /user already registered|already been registered/i,
    message: 'An account with this email already exists.',
  },
  {
    pattern: /new password should be different/i,
    message: 'Your new password must be different from your current password.',
  },
];

const readMessage = (error) => {
  if (!error) return '';
  if (typeof error === 'string') return error;
  return typeof error.message === 'string' ? error.message : '';
};

/**
 * True when the request never reached the server (offline, DNS failure, dropped
 * connection, TLS reset, blocked by CORS).
 *
 * Accepts an Error, a Supabase error object, or a plain message string, because
 * store actions hand pages a string while the store itself sees the object.
 *
 * @param {unknown} error
 * @returns {boolean}
 */
export function isNetworkError(error) {
  if (!error) return false;

  if (typeof error === 'object') {
    // supabase-js wraps a rejected fetch as AuthRetryableFetchError / status 0.
    if (error.name === 'AuthRetryableFetchError') return true;
    if (error.__isAuthError === true && error.status === 0) return true;
  }

  return NETWORK_MESSAGE_PATTERN.test(readMessage(error));
}

/**
 * Turn any auth failure into something worth showing a user.
 *
 * @param {unknown} error - Error, Supabase error object, or message string.
 * @param {string} [fallback] - used when the error carries no message at all.
 * @returns {string}
 */
export function getAuthErrorMessage(error, fallback = GENERIC_ERROR_MESSAGE) {
  if (!error) return fallback;

  if (isNetworkError(error)) return NETWORK_ERROR_MESSAGE;

  const raw = readMessage(error);

  for (const { pattern, message } of KNOWN_MESSAGES) {
    if (pattern.test(raw)) return message;
  }

  // 5xx bodies are written for operators ("Database error saving new user"),
  // not for the person staring at the form.
  const status = typeof error === 'object' ? error.status : undefined;
  if (typeof status === 'number' && status >= 500) return SERVER_ERROR_MESSAGE;

  return raw || fallback;
}

/**
 * Shape a failed store action returns to its caller. `isNetworkError` lets a
 * page offer a retry affordance without re-parsing the message.
 *
 * @param {unknown} error
 * @param {string} [fallback]
 */
export function toAuthErrorResult(error, fallback = GENERIC_ERROR_MESSAGE) {
  return {
    success: false,
    error: getAuthErrorMessage(error, fallback),
    isNetworkError: isNetworkError(error),
  };
}
