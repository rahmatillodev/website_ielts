/**
 * The rules behind the Profile Settings form.
 *
 * These are lifted verbatim from the edit-profile dialog that used to be the
 * only way to change these fields, so a save from the redesigned page writes
 * exactly what the dialog wrote — same normalisation, same nulls, same default
 * band score. Nothing about the stored shape changes.
 *
 * They live here rather than in the page so the arithmetic and the edge cases
 * can be tested without mounting React.
 */

/** What a complete Uzbek number looks like: +998 followed by 9 digits. */
const UZ_PHONE_LENGTH = 13;

/** Shown in the phone field. Not a value — just the shape being asked for. */
export const PHONE_PLACEHOLDER = "+998 90 123 45 67";

/** The band score stored when the field is left empty. */
export const DEFAULT_TARGET_BAND = 7.5;

/**
 * Force a phone number into `+998XXXXXXXXX` as it is typed.
 *
 * Everything that is not a digit is dropped, the country code is added when the
 * user has not typed it, and the result is capped so the field cannot grow past
 * a valid number.
 */
export function formatUzPhone(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  const withCode = digits.startsWith("998") ? `+${digits}` : `+998${digits}`;
  return withCode.substring(0, UZ_PHONE_LENGTH);
}

/**
 * True when the phone field can be saved.
 *
 * Empty is allowed — the number is optional. A half-typed number is not: it
 * would be stored as a number that cannot be called. The `> 5` floor mirrors
 * the dialog, so that a field holding nothing but the auto-inserted `+998`
 * counts as empty rather than as a broken number.
 */
export function isSavableUzPhone(value) {
  const trimmed = String(value ?? "").trim();
  if (trimmed.length <= 5) return true;
  return trimmed.length === UZ_PHONE_LENGTH;
}

/** True when the band score is within the IELTS range, or blank. */
export function isSavableTargetBand(value) {
  if (value === "" || value === null || value === undefined) return true;
  const score = Number(value);
  return Number.isFinite(score) && score >= 0 && score <= 9;
}

/**
 * The payload for `updateUserProfile`, built from the form's raw strings.
 *
 * Blank text becomes null rather than an empty string: that is what the dialog
 * stored, and it keeps "never filled in" distinguishable from "" in the row.
 */
export function buildProfileUpdate(form) {
  const phone = String(form.phone_number ?? "").trim();
  const score = form.target_band_score;

  return {
    full_name: String(form.full_name ?? "").trim() || null,
    telegram_username: String(form.telegram_username ?? "").trim() || null,
    // A lone `+998` is the field's own placeholder text, not a number.
    phone_number: phone.length > 5 ? phone : null,
    target_band_score: score === "" || score === null || score === undefined
      ? DEFAULT_TARGET_BAND
      : parseFloat(score),
  };
}

/**
 * True when the form still matches the profile it was loaded from.
 *
 * Drives the Save button's disabled state, so the primary action is quiet until
 * there is genuinely something to save.
 */
export function isProfileUnchanged(form, profile) {
  const next = buildProfileUpdate(form);
  const current = buildProfileUpdate({
    full_name: profile?.full_name ?? "",
    telegram_username: profile?.telegram_username ?? "",
    phone_number: profile?.phone_number ?? "",
    target_band_score: profile?.target_band_score ?? DEFAULT_TARGET_BAND,
  });

  return (
    next.full_name === current.full_name &&
    next.telegram_username === current.telegram_username &&
    next.phone_number === current.phone_number &&
    next.target_band_score === current.target_band_score
  );
}
