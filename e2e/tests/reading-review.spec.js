import { test, expect, collectRealErrors } from '../fixtures/test.js';
import {
  findReadingTestWithExplanations,
  findListeningTestWithExplanations,
  listQuestionExplanations,
  seedCompletedAttempt,
} from '../fixtures/seed.js';

/**
 * Explain lives on the reading practice page in REVIEW mode
 * (/reading-practice/:id?mode=review) - the split pane with the question cards on
 * the left and the passage on the right. Not on the result page: the student reads
 * the explanation next to the question it belongs to.
 */

/** Opens a seeded attempt in review mode and waits for the question cards. */
async function openReview(page, testId) {
  await page.goto(`/reading-practice/${testId}?mode=review`);
  await expect(page.locator('[data-question-number]').first()).toBeVisible({ timeout: 30_000 });
}

/** Switches to `partNumber` via the footer part navigation. */
async function goToPart(page, partNumber) {
  const button = page.locator('button, div[role="button"]', { hasText: new RegExp(`^\\s*Part ${partNumber}\\b`) }).first();
  await button.click();
  await expect(page.locator('[data-question-number]').first()).toBeVisible();
}

test.describe('reading review page - Explain', () => {
  test('offers Explain for exactly the questions that have one', async ({
    signedInPage: page,
    fixtureUser,
  }) => {
    const errors = collectRealErrors(page);

    const target = await findReadingTestWithExplanations(1);
    test.skip(!target, 'no reading test in this environment carries a stored explanation');

    const questions = await listQuestionExplanations(target.testId);
    // Review the part that actually carries explanations, so the assertion has teeth.
    const explainedPart = questions.find((q) => q.hasExplanation)?.partNumber;
    expect(explainedPart, 'a stored explanation should belong to a part').toBeTruthy();

    await seedCompletedAttempt({ userId: fixtureUser.id, testId: target.testId });
    await openReview(page, target.testId);
    if (explainedPart !== 1) await goToPart(page, explainedPart);

    await test.step('this is the split-pane review layout, not the result page', async () => {
      // Question cards on one side, passage on the other. (Not "no <table> anywhere":
      // matching/completion groups render real tables inside the question pane.)
      await expect(page.locator('[data-section="questions"]')).toBeVisible();
      await expect(page.locator('[data-section-type="passage"], [data-section="passage"]').first())
        .toBeVisible();
      await expect(page.getByText('Detailed Answer Review')).toHaveCount(0);
    });

    await test.step('an Explain control appears for every explained question and no other', async () => {
      const expected = questions
        .filter((q) => q.partNumber === explainedPart && q.hasExplanation)
        .map((q) => q.questionNumber)
        .sort((a, b) => a - b);
      expect(expected.length, 'the reviewed part should carry explanations').toBeGreaterThan(0);

      const toggles = page.locator('[data-testid="explain-toggle"]');
      await expect.poll(() => toggles.count(), { timeout: 15_000 }).toBe(expected.length);

      // Every control carries its question number, whether it is the inline icon
      // beside a gap or the button on a card, so one query covers both surfaces.
      const rendered = (await page.locator('[data-explain-toggle]').evaluateAll((els) =>
        els.map((el) => Number(el.getAttribute('data-explain-toggle'))),
      )).sort((a, b) => a - b);
      expect(rendered).toEqual(expected);

      // The other side of the same claim: questions without a stored explanation get
      // no control at all - not a disabled one, and not an expander onto nothing.
      const unexplained = questions.filter((q) => q.partNumber === explainedPart && !q.hasExplanation);
      for (const q of unexplained) {
        expect(rendered, `question ${q.questionNumber} has no explanation stored`)
          .not.toContain(q.questionNumber);
      }
    });

    await test.step('the explanation expands and collapses on the card', async () => {
      const toggle = page.locator('[data-testid="explain-toggle"]').first();
      await toggle.scrollIntoViewIfNeeded();
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');

      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      const panel = page.locator('[data-testid="explain-panel"]').first();
      await expect(panel).toBeVisible();
      await expect(panel).toContainText('Why this is the answer');

      await toggle.click();
      await expect(page.locator('[data-testid="explain-panel"]')).toHaveCount(0);
    });

    // The practice page logs one React warning that predates Explain: group
    // instructions are stored as HTML and parsed into a <p>, so an instruction
    // containing its own <p> nests one inside another. It is reproducible with
    // Explain absent (in test mode), so it is filtered rather than fixed here -
    // and named, so a new console error still fails this test.
    const unrelated = /cannot be a descendant of/i;
    const real = errors.filter((e) => !unrelated.test(e));
    expect(real, `console errors: ${real.join(' | ')}`).toEqual([]);
  });

  /**
   * Generated explanations are stored as three labelled lines separated by \n.
   * HTML collapses newlines, so the panel carries `whitespace-pre-line` - without it
   * the three parts render as one run-on paragraph. That is invisible to a text
   * assertion, so this checks the computed style as well as the content.
   */
  test('renders a generated explanation as three labelled lines', async ({
    signedInPage: page,
    fixtureUser,
  }) => {
    const target = await findReadingTestWithExplanations(1);
    test.skip(!target, 'no reading test in this environment carries a stored explanation');

    const questions = await listQuestionExplanations(target.testId);
    const explainedPart = questions.find((q) => q.hasExplanation)?.partNumber ?? 1;

    await seedCompletedAttempt({ userId: fixtureUser.id, testId: target.testId });
    await openReview(page, target.testId);
    if (explainedPart !== 1) await goToPart(page, explainedPart);

    const toggles = page.locator('[data-testid="explain-toggle"]');
    await expect.poll(() => toggles.count(), { timeout: 15_000 }).toBeGreaterThan(0);

    // Open each one until a generated (three-line) explanation turns up. Hand-authored
    // explanations are a single sentence and are expected to stay that way, so this
    // looks for a three-line one rather than requiring all of them to be.
    const count = await toggles.count();
    let threeLine = null;
    for (let i = 0; i < count; i++) {
      const toggle = toggles.nth(i);
      await toggle.scrollIntoViewIfNeeded();
      await toggle.click();
      const panel = page.locator('[data-testid="explain-panel"] .whitespace-pre-line').first();
      await expect(panel).toBeVisible();
      const text = await panel.innerText();
      if (/^Where:.*\nQuote:.*\nWhy:/s.test(text)) {
        threeLine = { panel, text };
        break;
      }
      await toggle.click();
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

  /**
   * The inline types expand a full-width panel that pushes the passage below it
   * down, so two open at once buries the text. One-at-a-time is the rule, and it
   * is shared with the card types so the interaction is the same everywhere.
   */
  test('opens one explanation at a time, and attaches it to the question', async ({
    signedInPage: page,
    fixtureUser,
  }) => {
    const target = await findReadingTestWithExplanations(1);
    test.skip(!target, 'no reading test in this environment carries a stored explanation');

    const questions = await listQuestionExplanations(target.testId);
    const explainedPart = questions.find((q) => q.hasExplanation)?.partNumber ?? 1;

    await seedCompletedAttempt({ userId: fixtureUser.id, testId: target.testId });
    await openReview(page, target.testId);
    if (explainedPart !== 1) await goToPart(page, explainedPart);

    const toggles = page.locator('[data-testid="explain-toggle"]');
    await expect.poll(() => toggles.count(), { timeout: 15_000 }).toBeGreaterThan(1);

    const first = toggles.nth(0);
    const second = toggles.nth(1);
    const firstQ = await first.getAttribute('data-explain-toggle');
    const secondQ = await second.getAttribute('data-explain-toggle');

    await first.scrollIntoViewIfNeeded();
    await first.click();
    await expect(page.locator('[data-testid="explain-panel"]')).toHaveCount(1);
    await expect(page.locator(`[data-explain-panel="${firstQ}"]`)).toBeVisible();

    await second.scrollIntoViewIfNeeded();
    await second.click();
    // Opening the second closes the first - never two panels at once.
    await expect(page.locator('[data-testid="explain-panel"]')).toHaveCount(1);
    await expect(page.locator(`[data-explain-panel="${secondQ}"]`)).toBeVisible();
    await expect(page.locator(`[data-explain-panel="${firstQ}"]`)).toHaveCount(0);

    // And no detached list is left at the bottom of a group card. It survives
    // only for types with nowhere per-question to put an icon (multiple_answers
    // renders its options as <button>, map has no live reading content), so the
    // assertion is made against what this part actually contains.
    const NO_INLINE_ANCHOR = ['multiple_answers', 'map'];
    const partHasExempt = questions
      .filter((q) => q.partNumber === explainedPart && q.hasExplanation)
      .some((q) => NO_INLINE_ANCHOR.includes(q.type));
    if (!partHasExempt) {
      await expect(page.locator('[data-explain-card="group-list"]')).toHaveCount(0);
    }
  });

  /** Explain is a review surface. Taking the test must not hand out the answers. */
  test('does not offer Explain while the test is being taken', async ({
    signedInPage: page,
  }) => {
    const target = await findReadingTestWithExplanations(1);
    test.skip(!target, 'no reading test in this environment carries a stored explanation');

    await page.goto(`/reading-practice/${target.testId}`);
    await expect(page.locator('[data-question-number]').first()).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('[data-testid="explain-toggle"]')).toHaveCount(0);
    await expect(page.getByText('Why this is the answer')).toHaveCount(0);
  });
});

/**
 * Guards a product decision rather than an implementation detail: Explain is
 * reading-only. Listening gets highlight + Locate + audio seek and must never grow an
 * Explain surface, so this fails if one appears - including in listening review, which
 * is the page that would be tempting to copy this onto.
 */
test.describe('listening', () => {
  test('has no Explain surface in review', async ({ signedInPage: page, fixtureUser }) => {
    const target = await findListeningTestWithExplanations(1)
      ?? (await findListeningTestWithExplanations(0));
    test.skip(!target, 'no active listening test available');

    await seedCompletedAttempt({ userId: fixtureUser.id, testId: target.testId, type: 'listening' });

    await page.goto(`/listening-practice/${target.testId}?mode=review`);
    await expect(page.locator('[data-question-number]').first()).toBeVisible({ timeout: 30_000 });

    await expect(page.locator('[data-testid="explain-toggle"]')).toHaveCount(0);
    await expect(page.getByText('Why this is the answer')).toHaveCount(0);
  });
});
