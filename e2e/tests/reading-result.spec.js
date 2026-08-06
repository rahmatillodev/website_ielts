import { test, expect, collectRealErrors } from '../fixtures/test.js';
import { findReadingTestWithExplanations, seedCompletedAttempt } from '../fixtures/seed.js';

/**
 * Reading result page: the answer review table and the feedback entry point.
 *
 * Explain is NOT here. It belongs next to the question, on the practice page in
 * review mode - see reading-review.spec.js. The last step of the first test guards
 * that, so the surface cannot quietly come back to the table.
 */
test.describe('reading result page', () => {
  test('reviews the answers of an attempt', async ({
    signedInPage: page,
    fixtureUser,
  }) => {
    const errors = collectRealErrors(page);

    const target = await findReadingTestWithExplanations(1);
    test.skip(!target, 'no reading test in this environment carries a stored explanation');

    const { attemptId, answerCount } = await seedCompletedAttempt({
      userId: fixtureUser.id,
      testId: target.testId,
    });
    expect(answerCount, 'seeded attempt should have answers').toBeGreaterThan(0);

    await page.goto(`/reading-result/${attemptId}`);
    await expect(page.locator('table')).toBeVisible({ timeout: 30_000 });

    await test.step('the review table renders the attempt', async () => {
      await expect(page.getByText(target.title, { exact: false }).first()).toBeVisible();
      const rows = page.locator('tbody tr');
      await expect.poll(() => rows.count(), { timeout: 15_000 }).toBeGreaterThan(0);
    });

    await test.step('the table carries no Explain surface - that lives on the review page', async () => {
      const headers = await page.locator('thead th').allTextContents();
      expect(headers.map((h) => h.trim())).not.toContain('Explanation');
      await expect(page.locator('[data-testid="explain-toggle"]')).toHaveCount(0);
      await expect(page.locator('button', { hasText: /^Why\?$/ })).toHaveCount(0);
      await expect(page.getByText('Why this is the answer')).toHaveCount(0);
    });

    expect(errors, `console errors: ${errors.join(' | ')}`).toEqual([]);
  });

  test('offers feedback about the result, pre-filled with the test', async ({
    signedInPage: page,
    fixtureUser,
  }) => {
    const target = await findReadingTestWithExplanations(0)
      ?? (await findReadingTestWithExplanations(1));
    test.skip(!target, 'no active reading test available');

    const { attemptId } = await seedCompletedAttempt({
      userId: fixtureUser.id,
      testId: target.testId,
    });

    await page.goto(`/reading-result/${attemptId}`);
    await expect(page.locator('table')).toBeVisible({ timeout: 30_000 });

    const feedback = page.locator('button', { hasText: /Feedback/ }).first();
    await expect(feedback).toBeVisible();
    await feedback.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    // The student never types which test it was - the page attaches it.
    await expect(dialog).toContainText(target.title.slice(0, 30));
  });
});
