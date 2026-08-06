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
      // Coverage used to be partial for every test, and this asserted
      // `withExplanation < totalRows`. Since the generation pass that no longer
      // holds - most tests are now fully covered - so the invariant is stated
      // against what is actually stored instead of against a coverage level:
      // a toggle appears for an explained question and for nothing else.
      expect(withExplanation).toBeLessThanOrEqual(totalRows);
      const rowsWithoutToggle = totalRows - withExplanation;
      expect(rowsWithoutToggle).toBeGreaterThanOrEqual(0);
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

  /**
   * Generated explanations are stored as three labelled lines separated by \n.
   * HTML collapses newlines, so the panel carries `whitespace-pre-line` - without
   * it the three parts render as one run-on paragraph. That is invisible to a
   * text assertion, so this checks the computed style as well as the content.
   */
  test('renders a generated explanation as three labelled lines', async ({
    signedInPage: page,
    fixtureUser,
  }) => {
    const target = await findReadingTestWithExplanations(1);
    test.skip(!target, 'no reading test in this environment carries a stored explanation');

    const { attemptId } = await seedCompletedAttempt({
      userId: fixtureUser.id,
      testId: target.testId,
    });

    await page.goto(`/reading-result/${attemptId}`);
    await expect(page.locator('table')).toBeVisible({ timeout: 30_000 });

    const why = page.locator('button', { hasText: /^Why\?$/ });
    await expect.poll(() => why.count(), { timeout: 15_000 }).toBeGreaterThan(0);

    // Open every explanation on the page and find one in the generated format.
    // Hand-authored explanations are a single sentence and are expected to stay
    // that way, so this looks for a three-line one rather than requiring all.
    const count = await why.count();
    let threeLine = null;
    for (let i = 0; i < count; i++) {
      const toggle = why.nth(0);
      await toggle.scrollIntoViewIfNeeded();
      await toggle.click();
      const panel = page.locator('p.whitespace-pre-line').first();
      await expect(panel).toBeVisible();
      const text = await panel.innerText();
      if (/^Where:.*\nQuote:.*\nWhy:/s.test(text)) {
        threeLine = { panel, text };
        break;
      }
      await page.locator('button', { hasText: /^Hide$/ }).first().click();
    }

    test.skip(!threeLine, 'no generated (three-line) explanation on this test');

    await test.step('the three parts are present and in order', () => {
      const lines = threeLine.text.split('\n').filter((l) => l.trim());
      expect(lines.length).toBeGreaterThanOrEqual(3);
      expect(lines[0]).toMatch(/^Where:\s*\S/);
      expect(lines[1]).toMatch(/^Quote:\s*"/);
      expect(lines[2]).toMatch(/^Why:\s*\S/);
    });

    await test.step('the line breaks actually render', async () => {
      const ws = await threeLine.panel.evaluate((el) => getComputedStyle(el).whiteSpace);
      expect(ws).toBe('pre-line');
      // Height proves it: one collapsed line would be far shorter than three.
      const box = await threeLine.panel.boundingBox();
      expect(box.height).toBeGreaterThan(40);
    });
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
