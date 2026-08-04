import { test, expect, collectRealErrors } from '../fixtures/test.js';
import { findReadingTestWithExplanations, seedCompletedAttempt } from '../fixtures/seed.js';

/**
 * Reading result page: the answer review table, Explain (phase 1) and the
 * results-page feedback entry point.
 */
test.describe('reading result page', () => {
  test('reviews answers and explains the ones that have an explanation', async ({
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

    await test.step('an Explanation column appears because this test has explanations', async () => {
      const headers = await page.locator('thead th').allTextContents();
      expect(headers.map((h) => h.trim())).toContain('Explanation');
    });

    const why = page.locator('button', { hasText: /^Why\?$/ });

    await test.step('only the questions that have an explanation offer one', async () => {
      const withExplanation = await why.count();
      const totalRows = await page.locator('tbody tr').count();
      expect(withExplanation).toBeGreaterThan(0);
      // Coverage is partial by design; a blanket toggle on every row would mean the
      // empty-state handling regressed.
      expect(withExplanation).toBeLessThan(totalRows);
    });

    await test.step('the explanation expands and collapses', async () => {
      const first = why.first();
      await first.scrollIntoViewIfNeeded();
      await first.click();

      const panel = page.getByText('Why this is the answer');
      await expect(panel).toBeVisible();

      const hide = page.locator('button', { hasText: /^Hide$/ }).first();
      await expect(hide).toHaveAttribute('aria-expanded', 'true');

      await hide.click();
      await expect(panel).toBeHidden();
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

/**
 * Guards a product decision rather than an implementation detail: Explain is
 * reading-only. Listening gets highlight + Locate + audio seek and must never grow
 * an Explain surface, so this fails if one appears.
 */
test.describe('listening', () => {
  test('has no Explain surface', async ({ signedInPage: page }) => {
    await page.goto('/listening');
    await expect(page.getByText('Why this is the answer')).toHaveCount(0);
  });
});
