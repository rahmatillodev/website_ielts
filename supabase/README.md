# Database

SQL that belongs to the app but lives in Supabase rather than in the bundle.
There is no Supabase CLI setup in this repo, so these are applied by hand.

## Applying

Open **Supabase → SQL Editor**, paste the file, run it. In order:

| File | What it does |
| --- | --- |
| `migrations/20260803090000_premium_subscription_expiry.sql` | Makes premium expiry a database rule: a trigger, a scheduled sweep, a self-service RPC, a purchase/renewal helper, and a backfill of rows that are already stale. Idempotent — safe to re-run. |

`pg_cron` is not enabled on a Supabase project by default. Turn it on under
**Database → Extensions** *before* running the migration and it will schedule
the sweep for you; if it is off, everything else still applies and you can
re-run the migration later just to pick up the schedule.

## Premium expiry in one paragraph

A subscription is premium while `subscription_status` says so and `now()` has
not passed `premium_until`. Expiring means all four columns move together:
`subscription_status → 'free'`, `premium_started_at → NULL`,
`premium_until → NULL`, and `premium_expired_at → the instant the plan ran
out`. A premium row with `premium_until IS NULL` is a manual or lifetime grant
and never expires.

`premium_expired_at` exists because the other three columns are wiped on
expiry, leaving nothing to say the plan ever ran. `premium_expired_at IS NOT
NULL` means "premium has ended and has not been renewed", which is what
`PremiumExpiredModal` shows the student once. Starting or renewing a plan
clears it — including when the admin panel writes the row directly, which the
trigger covers.

Four things enforce that, so no single one has to be reliable on its own:

1. **`users_enforce_premium_expiry`** (BEFORE INSERT/UPDATE trigger) — no write
   can leave an expired plan on a row.
2. **`expire_premium_subscriptions()`** — sweeps the whole table; scheduled
   every 10 minutes via pg_cron, so rows lapse on time even if nobody signs in.
3. **`expire_own_premium_subscription()`** — the RPC the client calls the moment
   it notices its own plan has lapsed. Only downgrades, only the caller's row,
   only when the date really has passed, so it is safe to expose to
   `authenticated`.
4. **The client** (`src/utils/premiumSubscription.js` + `src/store/authStore.js`)
   normalizes every profile it reads and arms a timer at `premium_until`, so a
   session left open across the boundary downgrades itself.

Purchases and renewals go through **`grant_premium_subscription(user_id, days,
extend)`** (service role only), which sets all three columns together. Pass
`extend => true` to stack onto any remaining time instead of restarting the
period.

## Testing

- `tests/premium_subscription_lifecycle.sql` — drives one real row through
  purchase → active → expired → renewed and asserts the table stays consistent.
  It runs inside a transaction and ends in `ROLLBACK`, so it changes nothing.
  Run it in the SQL editor after applying the migration; every stage prints a
  `NOTICE`, and a failure aborts with the stage name.
- `npm test` covers the client half of the same rules.
