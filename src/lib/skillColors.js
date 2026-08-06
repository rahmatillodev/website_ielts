/**
 * The four IELTS skills as a CATEGORY axis.
 *
 * These are identity colours, not judgements — a Speaking score of 4.0 and one
 * of 9.0 wear the same hue. Use `STATUS` from `chartPalette` when the colour is
 * meant to say how well someone did, and never paint a skill with the danger
 * red: before this existed, Listening and Speaking both used the error red, so
 * a perfectly good Speaking band rendered in the same colour as a failure.
 *
 * Each skill exposes three steps, because a colour that works as a 12px icon is
 * not the same colour that works as a page-width tint:
 *   mark   — icons, chart marks, dots. Sized small, so it can be vivid.
 *   text   — numerals and labels. Darkened where the mark step would miss 4.5:1.
 *   subtle — tinted backing surfaces. Always pair with `text` on top, never on
 *            its own, since the tints are close to one another by design.
 *
 * Values resolve through CSS custom properties so dark mode re-themes for free.
 */
export const SKILL = {
  reading: {
    mark: 'var(--skill-reading)',
    text: 'var(--skill-reading-text)',
    subtle: 'var(--skill-reading-subtle)',
  },
  listening: {
    mark: 'var(--skill-listening)',
    text: 'var(--skill-listening-text)',
    subtle: 'var(--skill-listening-subtle)',
  },
  writing: {
    mark: 'var(--skill-writing)',
    text: 'var(--skill-writing-text)',
    subtle: 'var(--skill-writing-subtle)',
  },
  speaking: {
    mark: 'var(--skill-speaking)',
    text: 'var(--skill-speaking-text)',
    subtle: 'var(--skill-speaking-subtle)',
  },
};

/** Tailwind class trios, for markup that styles with classes rather than props. */
export const SKILL_CLASS = {
  reading: { text: 'text-skill-reading-text', bg: 'bg-skill-reading-subtle' },
  listening: { text: 'text-skill-listening-text', bg: 'bg-skill-listening-subtle' },
  writing: { text: 'text-skill-writing-text', bg: 'bg-skill-writing-subtle' },
  speaking: { text: 'text-skill-speaking-text', bg: 'bg-skill-speaking-subtle' },
};

/**
 * The mock-centre booking flow books two sittings — the combined
 * Reading/Writing/Listening one and the separate Speaking one — and has to tell
 * them apart at a glance.
 *
 * Only the ICON carries the distinction. Selected days and selected slots stay
 * brand in both calendars, because selection is brand-owned across the whole app
 * (see the BRAND note in index.css: "selection, nav, tabs, pagination, focus,
 * active/selected state"). Painting the selected state per session is what
 * produced the green/purple split this replaces, and it made a picked slot in
 * one calendar look like a different kind of thing from a picked slot in the
 * other.
 *
 * `rwl` takes the brand rather than a skill token because it spans three
 * skills, so no single skill colour is truthful for it.
 */
export const SESSION_ICON = {
  rwl: 'text-brand-600',
  speaking: 'text-skill-speaking-text',
};
