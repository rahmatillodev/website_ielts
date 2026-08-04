import { defineConfig, devices } from '@playwright/test';

/**
 * Browser smoke tests. See e2e/README.md.
 *
 * The suite writes real rows (it creates a user and an attempt), so it targets the
 * DEV project and refuses to run against whatever `.env.prod` points at - the guard
 * lives in e2e/fixtures/target.js and runs before any test touches the database.
 */
const PORT = Number(process.env.E2E_PORT ?? 5179);

export default defineConfig({
  testDir: './e2e/tests',
  globalSetup: './e2e/global-setup.js',
  globalTeardown: './e2e/global-teardown.js',
  // Seeding goes through the Management API, so tests are slower than a pure UI run.
  timeout: 90_000,
  expect: { timeout: 15_000 },

  // Each test owns a throwaway user, so specs are safe to parallelise. Workers are
  // kept low on purpose: every one of them creates a user and signs in against the
  // same Supabase project, and piling on concurrent auth requests is what makes this
  // kind of suite flaky. `signIn` also retries once for the same reason.
  fullyParallel: true,
  workers: 2,

  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,

  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: `http://localhost:${PORT}`,
    // 1440x900 keeps useSmallScreen() false, so the rotate-device modal stays away.
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 20_000,
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  // `--mode dev` loads .env.dev, which points at the dev project.
  webServer: {
    command: `npx vite --mode dev --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
