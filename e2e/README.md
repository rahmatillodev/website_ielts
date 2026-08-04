# Browser smoke tests

End-to-end tests that drive the real app in a real browser. They complement the unit
tests in `src/**/*.test.js` (run with `npm test`), which cover pure logic; these cover
the parts only a browser can prove — routing, auth, rendering, and interaction.

```bash
npm run test:e2e            # headless
npm run test:e2e:headed     # watch it run
npm run test:e2e:ui         # Playwright's interactive runner
npm run test:e2e -- --grep "Explain"
```

The first run needs a browser binary: `npx playwright install chromium`.

## Safety

**These tests write real rows** — each one creates a user, an attempt and its answers,
then deletes them. So the suite refuses to run against production.

The guard in `fixtures/target.js` hardcodes no project ref (this repo is public). It
asks a relative question instead: *is the target the same project `.env.prod` points
at?* If so it aborts. That stays correct if projects are renamed or keys rotated.

Everything the suite touches is deleted in fixture teardown, which runs even when a
test fails. `purgeOrphanFixtures()` sweeps up after a hard crash.

## Configuration

Nothing is required on a developer machine that already has `.env.dev` and a
`supabase login`. Overrides, all optional:

| Variable | Purpose |
| --- | --- |
| `E2E_SUPABASE_URL` / `E2E_SUPABASE_ANON_KEY` | Target a project other than `.env.dev` |
| `E2E_SERVICE_ROLE_KEY` | Skip the keychain lookup (required in CI) |
| `E2E_SUPABASE_ACCESS_TOKEN` | Management API token (required in CI) |
| `E2E_PORT` | Dev-server port, default `5179` |

The service-role key is used **only** to create and delete the throwaway user. No key
is ever written to disk or committed.

## Layout

```
e2e/
  fixtures/
    target.js   resolves the target project; refuses production
    db.js       SQL + auth-admin helpers (seeding and teardown only)
    seed.js     creates users, finds content by shape, builds attempts
    test.js     the suite's `test` object, with its fixtures
  tests/
    *.spec.js
```

## Writing a new spec

Import the suite's `test`, not `@playwright/test`:

```js
import { test, expect } from '../fixtures/test.js';

test('a signed-in student can reach analytics', async ({ signedInPage: page }) => {
  await page.goto('/analytics');
  await expect(page.getByRole('heading', { name: /analytics/i })).toBeVisible();
});
```

Available fixtures:

- **`fixtureUser`** — a throwaway user (`{ id, email, password }`), deleted afterwards.
- **`signedInPage`** — a page already logged in as that user, via the real login form.

Both are lazy: a test that asks for neither creates no user and touches no database.

## Conventions

- **Never hardcode an id.** This repo is public, so test UUIDs and answer keys must not
  land in it. Find fixtures by shape — `findReadingTestWithExplanations()` asks for
  *a reading test that has explanations*, so the suite survives content changes and
  works against any environment.
- **`test.skip` when the content isn't there.** Explain coverage is thin and varies by
  environment; a spec that can't find its fixture should skip, not fail.
- **Assert on the page, not the database.** The seed helpers exist to set up state.
  Checking the DB instead of the UI defeats the point of an end-to-end test.
- **Avoid `fullPage` screenshots.** Chromium implements them by resizing the viewport,
  which flips `useSmallScreen()` and pops the "Please Rotate Your Device" modal over
  the page — it will silently eat your next click. Use viewport screenshots, or
  `dismissRotationModal(page)` when a test genuinely needs a narrow viewport.
- **Prefer locators to `ElementHandle`.** Locators re-resolve after React re-renders;
  a handle captured before a state change goes stale and times out.
- **Don't wait on `networkidle`.** The dev server serves thousands of unbundled modules
  and holds an HMR socket open, so it settles slowly and unpredictably — it roughly
  doubled this suite's runtime. Wait for the element you actually care about instead.
- **Keep worker count low.** Every worker creates a user and signs in against the same
  Supabase project; concurrent auth is the main source of flakiness here. `signIn`
  retries once for that reason, and that retry is scoped to sign-in deliberately —
  blanket test-level retries would hide real product failures.
