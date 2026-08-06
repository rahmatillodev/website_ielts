/**
 * Shared surface treatments for the test cards.
 *
 * `CardOpen`, `CardLocked` and `ComplatedCard` are the same card in three
 * states, and each used to carry its own copy of the badge, border, icon and
 * score classes. They drifted: the tier badge was an amber gradient in one file
 * and a flat amber in another, the "Start" button was brand-500 here and
 * brand-600 there, and a completed card's border was green-500 while the score
 * beside it was green-600. Stating each treatment once is what stops that.
 *
 * Which ramp carries which meaning:
 *
 *   completed  success — the only judgement on these cards, and the same ramp
 *              the review UI uses for a correct answer.
 *   locked     warning — a blocked state, not a failure. Danger is reserved for
 *              things that actually went wrong.
 *   premium    brand   — a tier is identity, not a judgement. It must not sit on
 *              a meaning ramp, which is what the old amber did.
 *   score      brand   — a band score is identity too. 7.5 and 4.0 wear the same
 *              colour, exactly as on the result pages.
 */

/** Tier badge. Premium is brand (white on brand-600 = 4.88:1); Free is neutral
 *  because "free" asserts nothing about how the user did. */
export const TIER_BADGE = {
  premium: "bg-primary text-primary-foreground shadow-md",
  free: "bg-gray-100 text-gray-700",
};

/** The card's accent edge — a full border in grid view, a left bar in list view. */
export const CARD_BORDER = {
  completed: "border-success-500",
  locked: "border-warning-500",
  default: "border-brand-500",
};

export const CARD_BORDER_LEFT = {
  completed: "border-l-success-500",
  locked: "border-l-warning-500",
  default: "border-l-brand-500",
};

/** The square icon badge. All three clear the 3:1 graphics floor on white. */
export const CARD_ICON = {
  completed: "bg-success-50 text-success-600",
  locked: "bg-warning-subtle text-warning-text",
  default: "bg-brand-50 text-brand-600",
};

/** The band score numeral, wherever it appears on a card. */
export const CARD_SCORE = "text-brand-600";

/** Primary action on a card. Mirrors the Button primitive's default variant so a
 *  card CTA and a page CTA are the same red at the same hover step. */
export const CARD_CTA =
  "bg-primary hover:bg-primary-hover active:bg-primary-active text-primary-foreground";

/** Secondary action sitting beside a primary one. */
export const CARD_CTA_SECONDARY =
  "bg-gray-100 hover:bg-gray-200 text-gray-700";
