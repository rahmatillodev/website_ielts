import { useCallback, useEffect, useRef, useState } from "react";

/**
 * How long a validation message stays on screen before it clears itself.
 *
 * Long enough to read a full sentence, short enough that a form the user has
 * walked away from is not still shouting at them when they come back.
 */
export const ERROR_VISIBLE_MS = 3500;

/**
 * Validation errors that expire on their own.
 *
 * One timer per field rather than one for the whole set, because the fields do
 * not fail together and must not recover together: typing in "Email" has to
 * take Email's message away and leave Password's alone, including the timer
 * behind it. A single shared timeout would either clear every message at once
 * or keep firing for a field the user has already fixed.
 *
 * The map of timers is a ref, not state — cancelling a timeout must never cost
 * a render, and the identity of the map has to survive the re-render that
 * setting an error causes.
 *
 * @param {number} timeoutMs how long each message stays visible
 * @returns {{
 *   errors: Record<string, string|undefined>,
 *   showErrors: (next: Record<string, string>) => void,
 *   clearError: (field: string) => void,
 * }}
 */
export function useTransientErrors(timeoutMs = ERROR_VISIBLE_MS) {
  const [errors, setErrors] = useState({});
  const timers = useRef(new Map());

  const cancelTimer = useCallback((field) => {
    const id = timers.current.get(field);
    if (id === undefined) return;
    clearTimeout(id);
    timers.current.delete(field);
  }, []);

  const cancelAllTimers = useCallback(() => {
    timers.current.forEach((id) => clearTimeout(id));
    timers.current.clear();
  }, []);

  const dropField = useCallback((field) => {
    setErrors((prev) => {
      if (!prev[field]) return prev; // no error here; keep the same object
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  /**
   * Replace the whole error set and restart the countdown for each failing
   * field. Called on every submit, so submitting bad data a second time gives
   * the messages their full time again instead of inheriting a timer that is
   * already half spent.
   */
  const showErrors = useCallback(
    (nextErrors) => {
      cancelAllTimers();
      setErrors(nextErrors);

      Object.entries(nextErrors).forEach(([field, message]) => {
        if (!message) return;
        const id = setTimeout(() => {
          timers.current.delete(field);
          dropField(field);
        }, timeoutMs);
        timers.current.set(field, id);
      });
    },
    [cancelAllTimers, dropField, timeoutMs]
  );

  /** Clear one field's message now — used when the user edits that field. */
  const clearError = useCallback(
    (field) => {
      cancelTimer(field);
      dropField(field);
    },
    [cancelTimer, dropField]
  );

  // Every pending timeout dies with the component; a fired timer would
  // otherwise call setState on an unmounted form.
  useEffect(() => cancelAllTimers, [cancelAllTimers]);

  return { errors, showErrors, clearError };
}
