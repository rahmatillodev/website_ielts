/**
 * Lifecycle tests for the premium rules: purchase → active → expired → renewed.
 *
 * Run with `npm test` (node's built-in runner — no new dependencies). These
 * cover the client's half of the contract; the database half has a matching
 * script at supabase/tests/premium_subscription_lifecycle.sql.
 *
 * Imports are relative rather than aliased so the file runs under plain node.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  FREE_STATUS,
  PREMIUM_STATUS,
  getPremiumExpiry,
  isPremiumExpired,
  isPremiumProfile,
  msUntilPremiumExpiry,
  normalizePremiumProfile,
  normalizeSubscriptionStatus,
  premiumExpiryNoticeId,
} from "./premiumSubscription.js";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse("2026-08-03T12:00:00.000Z");

/** What grant_premium_subscription() writes, so the fixtures match the row. */
const purchase = (now, days) => ({
  id: "user-1",
  subscription_status: PREMIUM_STATUS,
  premium_started_at: new Date(now).toISOString(),
  premium_until: new Date(now + days * DAY).toISOString(),
});

const freeProfile = {
  id: "user-1",
  subscription_status: FREE_STATUS,
  premium_started_at: null,
  premium_until: null,
};

test("full lifecycle: purchase → active → expired → renewed", () => {
  // Purchase: 30 days, both dates populated.
  const bought = purchase(NOW, 30);
  assert.equal(isPremiumProfile(bought, NOW), true);
  assert.equal(normalizePremiumProfile(bought, NOW).changed, false, "a fresh plan is left untouched");

  // Active: still premium a minute before the boundary.
  const justBefore = NOW + 30 * DAY - 60_000;
  assert.equal(isPremiumProfile(bought, justBefore), true);
  assert.equal(isPremiumExpired(bought, justBefore), false);

  // Expired: the instant premium_until passes, status drops and both dates clear.
  const justAfter = NOW + 30 * DAY + 1;
  const lapsed = normalizePremiumProfile(bought, justAfter);
  assert.equal(lapsed.expired, true);
  assert.equal(lapsed.profile.subscription_status, FREE_STATUS);
  assert.equal(lapsed.profile.premium_started_at, null);
  assert.equal(lapsed.profile.premium_until, null);
  assert.equal(isPremiumProfile(lapsed.profile, justAfter), false);

  // The expired profile is stable: normalizing again is a no-op, so the store
  // does not fire the expiry write a second time.
  const again = normalizePremiumProfile(lapsed.profile, justAfter);
  assert.equal(again.expired, false);
  assert.equal(again.changed, false);
  assert.equal(again.profile, lapsed.profile, "unchanged profiles keep their identity");

  // Renewed: a new purchase repopulates both dates and premium is back.
  const renewedAt = justAfter + 5 * DAY;
  const renewed = purchase(renewedAt, 30);
  assert.equal(isPremiumProfile(renewed, renewedAt), true);
  assert.equal(renewed.premium_started_at, new Date(renewedAt).toISOString());
  assert.equal(Date.parse(renewed.premium_until) - renewedAt, 30 * DAY);
  assert.equal(normalizePremiumProfile(renewed, renewedAt).changed, false);
});

test("expiry is exact at the boundary", () => {
  const bought = purchase(NOW, 1);
  const boundary = NOW + DAY;
  assert.equal(isPremiumExpired(bought, boundary - 1), false);
  // premium_until is an end instant, not an inclusive last moment.
  assert.equal(isPremiumExpired(bought, boundary), true);
});

test("a free profile is never premium and never expires", () => {
  assert.equal(isPremiumProfile(freeProfile, NOW), false);
  assert.equal(isPremiumExpired(freeProfile, NOW), false);
  assert.equal(normalizePremiumProfile(freeProfile, NOW).changed, false);
  assert.equal(msUntilPremiumExpiry(freeProfile, NOW), null);
});

test("a lapsed date expires the plan whatever the status says", () => {
  // The shape a stale row has before the sweep reaches it.
  const stale = { ...purchase(NOW - 60 * DAY, 30) };
  const result = normalizePremiumProfile(stale, NOW);
  assert.equal(result.expired, true);
  assert.deepEqual(
    { ...result.profile },
    { ...stale, subscription_status: FREE_STATUS, premium_started_at: null, premium_until: null },
  );
});

test("vip is the same plan as premium", () => {
  assert.equal(normalizeSubscriptionStatus("vip"), PREMIUM_STATUS);
  assert.equal(normalizeSubscriptionStatus("VIP"), PREMIUM_STATUS);
  assert.equal(normalizeSubscriptionStatus("  Premium "), PREMIUM_STATUS);
  assert.equal(normalizeSubscriptionStatus(null), FREE_STATUS);
  assert.equal(normalizeSubscriptionStatus(""), FREE_STATUS);

  const vip = { ...purchase(NOW, 10), subscription_status: "vip" };
  assert.equal(isPremiumProfile(vip, NOW), true);
  assert.equal(normalizePremiumProfile(vip, NOW).profile.subscription_status, PREMIUM_STATUS);

  // And it expires on the same rule.
  const expiredVip = { ...purchase(NOW - 40 * DAY, 10), subscription_status: "vip" };
  const result = normalizePremiumProfile(expiredVip, NOW);
  assert.equal(result.expired, true);
  assert.equal(result.profile.subscription_status, FREE_STATUS);
});

test("premium with no end date does not expire", () => {
  const lifetime = { ...freeProfile, subscription_status: PREMIUM_STATUS };
  assert.equal(isPremiumProfile(lifetime, NOW + 1000 * DAY), true);
  assert.equal(isPremiumExpired(lifetime, NOW + 1000 * DAY), false);
  assert.equal(msUntilPremiumExpiry(lifetime, NOW), null, "nothing to wait for");
});

test("an unparseable premium_until does not revoke access", () => {
  const broken = { ...purchase(NOW, 30), premium_until: "not-a-date" };
  assert.equal(getPremiumExpiry(broken), null);
  assert.equal(isPremiumExpired(broken, NOW), false);
  assert.equal(isPremiumProfile(broken, NOW), true);
});

test("a missing profile is not premium", () => {
  assert.equal(isPremiumProfile(null, NOW), false);
  assert.equal(isPremiumProfile(undefined, NOW), false);
  assert.equal(normalizePremiumProfile(null, NOW).profile, null);
  assert.equal(msUntilPremiumExpiry(null, NOW), null);
});

test("the expiry timer is armed only while a plan is running out", () => {
  const bought = purchase(NOW, 30);
  assert.equal(msUntilPremiumExpiry(bought, NOW), 30 * DAY);
  assert.equal(msUntilPremiumExpiry(bought, NOW + 30 * DAY - 5_000), 5_000);
  assert.equal(msUntilPremiumExpiry(bought, NOW + 30 * DAY), null, "already expired, nothing to arm");
  assert.equal(msUntilPremiumExpiry(bought, NOW + 60 * DAY), null);
});

test("date objects are accepted as well as ISO strings", () => {
  const withDates = {
    ...freeProfile,
    subscription_status: PREMIUM_STATUS,
    premium_until: new Date(NOW + DAY),
  };
  assert.equal(isPremiumProfile(withDates, NOW), true);
  assert.equal(isPremiumProfile(withDates, NOW + 2 * DAY), false);
});
/* ------------------------------------------------------------------ notice */
/* The "your premium has ended" modal. What it announces is the row's
   premium_expired_at, not a lapse this client worked out for itself — see
   premiumExpiryNoticeId for why. */

/** What expiry leaves behind: free, dates cleared, the end instant recorded. */
const lapsedRow = (endedAt) => ({
  id: "user-1",
  subscription_status: FREE_STATUS,
  premium_started_at: null,
  premium_until: null,
  premium_expired_at: new Date(endedAt).toISOString(),
});

test("a lapsed row owes the student one notice, identified by when it ended", () => {
  const row = lapsedRow(NOW);
  assert.equal(premiumExpiryNoticeId(row, NOW + DAY), `user-1:${new Date(NOW).toISOString()}`);
});

test("nothing to announce without an expiry on the row", () => {
  assert.equal(premiumExpiryNoticeId(freeProfile, NOW), null, "never had a plan");
  assert.equal(premiumExpiryNoticeId(purchase(NOW, 30), NOW), null, "plan still running");
  assert.equal(premiumExpiryNoticeId(null, NOW), null);
  assert.equal(premiumExpiryNoticeId({ premium_expired_at: new Date(NOW) }, NOW), null, "no id");
  assert.equal(premiumExpiryNoticeId({ ...lapsedRow(NOW), premium_expired_at: "" }, NOW), null);
  assert.equal(
    premiumExpiryNoticeId({ ...lapsedRow(NOW), premium_expired_at: "not-a-date" }, NOW),
    null
  );
});

test("renewing silences the notice even if the row still carries the old expiry", () => {
  // The trigger clears premium_expired_at on a grant, so this is belt and
  // braces — but a stale marker must never tell a paying student they lapsed.
  const renewed = { ...purchase(NOW, 30), premium_expired_at: new Date(NOW - DAY).toISOString() };
  assert.equal(premiumExpiryNoticeId(renewed, NOW), null);
});

test("a second lapse is a second notice", () => {
  const first = premiumExpiryNoticeId(lapsedRow(NOW), NOW);
  const second = premiumExpiryNoticeId(lapsedRow(NOW + 60 * DAY), NOW + 60 * DAY);
  assert.notEqual(first, second, "otherwise the marker from the first lapse hides the second");
});

test("a Date is accepted as well as an ISO string, and normalises to the same id", () => {
  const asDate = { ...lapsedRow(NOW), premium_expired_at: new Date(NOW) };
  assert.equal(premiumExpiryNoticeId(asDate, NOW), premiumExpiryNoticeId(lapsedRow(NOW), NOW));
});

test("normalizing a profile does not lose the expiry marker", () => {
  const row = lapsedRow(NOW);
  const { profile } = normalizePremiumProfile(row, NOW + DAY);
  assert.equal(profile.premium_expired_at, row.premium_expired_at);
});
