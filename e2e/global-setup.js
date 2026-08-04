import { assertNotProduction, PROJECT_REF } from './fixtures/target.js';
import { purgeOrphanFixtures } from './fixtures/seed.js';

/**
 * Runs once before the suite.
 *
 * The production guard also runs per test (see fixtures/test.js), but checking here
 * too means a misconfigured target fails immediately, before any browser starts.
 *
 * The sweep clears fixtures left behind by a previous run that died before its
 * teardown - a killed process, a crashed worker. Without it those users accumulate
 * silently in the dev project.
 */
export default async function globalSetup() {
  assertNotProduction();
  const purged = await purgeOrphanFixtures();
  const note = purged ? `, purged ${purged} orphan fixture user(s)` : '';
  console.log(`[e2e] target project ${PROJECT_REF}${note}`);
}
