/**
 * Motion for the landing page, matched to the Claude Design prototype.
 *
 * The prototype animates with one rule and one rule only:
 *
 *   [data-reveal]      transition: opacity .7s cubic-bezier(.2,.7,.2,1),
 *                                  transform .7s cubic-bezier(.2,.7,.2,1)
 *   [data-reveal].pre  opacity: 0; transform: translateY(18px)
 *
 * driven by an IntersectionObserver at threshold 0.1 that removes `.pre` once
 * and then unobserves. `revealUp` below is the Framer Motion equivalent, down to
 * the curve, the distance and the duration, and `inView` reproduces the
 * fire-once-at-10%-visible behaviour.
 *
 * The prototype has no stagger, no per-item delay and no hover choreography
 * beyond simple CSS transitions, so neither does this. The one extra is the
 * hero's SVG path draw, which the prototype does with a CSS keyframe on
 * stroke-dashoffset.
 */

/** The prototype's curve, used for every reveal. */
export const EASE = [0.2, 0.7, 0.2, 1];

/** [data-reveal] — 18px up, 0.7s. */
export const revealUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

/**
 * The prototype's observer fires at `threshold: 0.1` and unobserves, so a block
 * reveals once, when a tenth of it is on screen. `amount: 0.1` is the direct
 * equivalent.
 */
export const inView = { once: true, amount: 0.1 };
