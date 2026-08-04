import { test as base, expect } from '@playwright/test';
import { assertNotProduction } from './target.js';
import { createFixtureUser, deleteFixtureUser } from './seed.js';

/**
 * The suite's own `test`. Import this instead of @playwright/test:
 *
 *   import { test, expect } from '../fixtures/test.js';
 *
 *   test('something', async ({ page, signedInPage }) => { ... });
 *
 * Fixtures available:
 *   fixtureUser   - a throwaway user, deleted after the test whatever the outcome
 *   signedInPage  - a page already logged in as that user
 *
 * Adding a new fixture (a seeded writing attempt, a premium user, ...) means adding
 * one more entry here rather than repeating setup in every spec.
 */
export const test = base.extend({
  // Runs once per test file, before anything else touches the database.
  productionGuard: [async ({}, use) => {
    assertNotProduction();
    await use(true);
  }, { auto: true, scope: 'test' }],

  fixtureUser: async ({}, use) => {
    const user = await createFixtureUser();
    try {
      await use(user);
    } finally {
      // Teardown runs even when the test fails, so a red run leaves no residue.
      await deleteFixtureUser(user.id);
    }
  },

  signedInPage: async ({ page, fixtureUser }, use) => {
    await signIn(page, fixtureUser);
    await use(page);
  },
});

export { expect };

/**
 * Drives the real login form - the app's own auth path, not a planted token.
 *
 * Retried once. Workers sign in at roughly the same moment, and Supabase's auth
 * endpoint occasionally makes one of them wait long enough to miss the timeout; a
 * single retry after a short pause clears it. The retry is deliberately scoped to
 * sign-in rather than turned on for whole tests, so a genuine product failure still
 * fails on the first attempt.
 */
export async function signIn(page, { email, password }, { attempts = 2 } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await page.goto('/login');
      await page.waitForSelector('input[type="email"]', { timeout: 30_000 });
      await page.fill('input[type="email"]', email);
      await page.fill('input[type="password"]', password);
      await page.click('button[type="submit"]');
      await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 45_000 });
      return;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await page.waitForTimeout(2_000 * attempt);
    }
  }
  const visible = await page.textContent('body').catch(() => '');
  throw new Error(
    `e2e: sign-in failed after ${attempts} attempts at ${page.url()}\n` +
    `page said: ${visible.replace(/\s+/g, ' ').slice(0, 200)}\n${lastError}`,
  );
}

/**
 * Dismisses the "Please Rotate Your Device" modal if it is showing.
 *
 * It is keyed off `useSmallScreen()`, so it appears at narrow widths and can also be
 * provoked by anything that resizes the viewport mid-run - notably `fullPage`
 * screenshots, which Chromium implements by resizing. Prefer viewport screenshots in
 * these specs; call this when a test genuinely needs a narrow viewport.
 */
export async function dismissRotationModal(page) {
  const button = page.locator('button', { hasText: /Continue Anyway/ });
  if (await button.isVisible().catch(() => false)) {
    await button.click();
    await page.waitForTimeout(200);
  }
}

/** Console/page errors worth failing on - the noisy, expected ones are filtered out. */
export function collectRealErrors(page) {
  const errors = [];
  const ignore = /favicon|manifest|Download the React DevTools|ResizeObserver loop/i;
  page.on('console', (msg) => { if (msg.type() === 'error' && !ignore.test(msg.text())) errors.push(msg.text()); });
  page.on('pageerror', (err) => { if (!ignore.test(String(err))) errors.push(String(err)); });
  return errors;
}
