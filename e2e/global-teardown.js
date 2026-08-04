import { purgeOrphanFixtures } from './fixtures/seed.js';

/**
 * Runs once after the suite, as a safety net behind the per-test teardown.
 *
 * Per-test cleanup already runs in a `finally`, so it survives assertion failures;
 * this catches the cases it cannot - a worker that crashed outright, or a run
 * interrupted part-way. Never let a failing test leave data behind.
 */
export default async function globalTeardown() {
  try {
    const purged = await purgeOrphanFixtures();
    if (purged) console.log(`[e2e] cleaned up ${purged} leftover fixture user(s)`);
  } catch (error) {
    // A teardown failure must not mask the actual test result.
    console.warn(`[e2e] fixture cleanup failed: ${error.message}`);
  }
}
