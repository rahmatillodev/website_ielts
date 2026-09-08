/**
 * One definition of "is this profile premium right now", shared by the store,
 * the gates and the profile screen.
 *
 * A subscription is premium while `subscription_status` says so AND the clock
 * has not passed `premium_until`. The moment it does, the plan is expired: the
 * status drops to free and both premium dates are cleared, mirroring exactly
 * what `expire_own_premium_subscription()` writes in the database, so the
 * in-memory profile and the row agree even before the round trip lands.
 *
 * `premium_until = NULL` on a premium row still means "no end date" (manually
 * granted / lifetime access) and never expires — only a date in the past does.
 *
 * These are pure functions on a profile object, which is what makes the
 * lifecycle testable without a database (see premiumSubscription.test.js).
 */

export const FREE_STATUS = "free";
export const PREMIUM_STATUS = "premium";

/** Legacy label for the same plan; rows were never backfilled. */
const PREMIUM_ALIASES = new Set(["premium", "vip"]);

/** `vip` → `premium`, blank/unknown → `free`. */
export function normalizeSubscriptionStatus(status) {
  const value = String(status ?? "").trim().toLowerCase();
  if (PREMIUM_ALIASES.has(value)) return PREMIUM_STATUS;
  return value || FREE_STATUS;
}

/**
 * `premium_until` as a Date, or null when absent or unparseable. An
 * unparseable date is deliberately treated as "no end date" rather than as
 * expired, so a bad value cannot revoke a paying user's access.
 */
export function getPremiumExpiry(profile) {
  const raw = profile?.premium_until;
  if (raw === null || raw === undefined || raw === "") return null;
  const date = raw instanceof Date ? raw : new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** True once the clock has passed a real `premium_until`. */
export function isPremiumExpired(profile, now = Date.now()) {
  const expiry = getPremiumExpiry(profile);
  return expiry !== null && expiry.getTime() <= now;
}

/**
 * The profile as it should be right now: `vip` folded into `premium`, and an
 * elapsed plan wound back to free with both dates cleared.
 *
 * Returns the original object when nothing changed so callers can skip a
 * pointless state update, plus `expired` to tell the "was already free" case
 * apart from the "just lapsed, persist it" one.
 */
export function normalizePremiumProfile(profile, now = Date.now()) {
  if (!profile) return { profile, expired: false, changed: false };

  const status = normalizeSubscriptionStatus(profile.subscription_status);
  const expired = isPremiumExpired(profile, now);

  if (expired) {
    return {
      profile: {
        ...profile,
        subscription_status: FREE_STATUS,
        premium_started_at: null,
        premium_until: null,
      },
      expired: true,
      changed: true,
    };
  }

  if (status !== profile.subscription_status) {
    return { profile: { ...profile, subscription_status: status }, expired: false, changed: true };
  }

  return { profile, expired: false, changed: false };
}

/** The gate every premium check should go through. */
export function isPremiumProfile(profile, now = Date.now()) {
  if (!profile) return false;
  if (normalizeSubscriptionStatus(profile.subscription_status) !== PREMIUM_STATUS) return false;
  return !isPremiumExpired(profile, now);
}

/**
 * Milliseconds until an active plan lapses, or null when there is nothing to
 * wait for (free, no end date, or already expired). Used to arm the timer that
 * expires a session that is left open across the boundary.
 */
export function msUntilPremiumExpiry(profile, now = Date.now()) {
  if (!profile) return null;
  if (normalizeSubscriptionStatus(profile.subscription_status) !== PREMIUM_STATUS) return null;
  const expiry = getPremiumExpiry(profile);
  if (expiry === null) return null;
  const remaining = expiry.getTime() - now;
  return remaining > 0 ? remaining : null;
}

/**
 * The identity of the "your premium has ended" notice owed to this profile, or
 * null when there is nothing to announce.
 *
 * `premium_expired_at` is written by the database when a plan runs out and
 * cleared when one is granted (see
 * supabase/migrations/20260803090000_premium_subscription_expiry.sql). The
 * client deliberately does not invent the value: the row is the only place
 * that survives a new browser, and inventing one here would produce a
 * different id than the row does moments later and announce the same lapse
 * twice.
 *
 * The id pairs the user with the exact instant, so a student who lapses,
 * renews and lapses again is told each time, while a reload is not a second
 * time. Callers persist the last id they showed.
 */
export function premiumExpiryNoticeId(profile, now = Date.now()) {
  if (!profile?.id) return null;

  const raw = profile.premium_expired_at;
  if (raw === null || raw === undefined || raw === "") return null;

  const at = raw instanceof Date ? raw : new Date(raw);
  if (Number.isNaN(at.getTime())) return null;

  // A running plan means the row is stale, not that the student lost access.
  if (isPremiumProfile(profile, now)) return null;

  return `${profile.id}:${at.toISOString()}`;
}
