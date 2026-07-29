/**
 * The motion vocabulary for the login screen.
 *
 * Slide transition, per-slide entrance choreography, form entrance and ambient
 * loops all live here, so no slide re-declares timing and the whole page moves
 * on one curve.
 *
 * A note on why the showcase can look static even when it is animating: the
 * page wraps everything in `<MotionConfig reducedMotion="user">`, so when the OS
 * has "reduce motion" enabled Framer strips every transform — the slides still
 * cross-fade, but nothing inside them moves. That is correct behaviour, not a
 * bug. Each slide additionally checks `useReducedMotion()` to switch its
 * infinite loops off.
 */

/** The page curve. Decelerating, no overshoot. */
export const EASE = [0.22, 1, 0.36, 1];

/** Low-bounce spring, for the few things that should feel physical. */
export const SPRING_SOFT = { type: "spring", stiffness: 240, damping: 24, mass: 0.7 };

/* ── slide transition ─────────────────────────────────────────────────────── */

/**
 * The incoming slide arrives from the right, out of focus, and settles. Used
 * with `mode="wait"`, so the outgoing slide has fully left before it starts —
 * the two are never composited over each other.
 */
export const slideVariants = {
  enter: { opacity: 0, x: 36, scale: 0.985, filter: "blur(5px)" },
  center: {
    opacity: 1,
    x: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: 0.65, ease: EASE },
  },
  exit: {
    opacity: 0,
    x: -28,
    scale: 0.99,
    filter: "blur(4px)",
    transition: { duration: 0.65, ease: EASE },
  },
};

/** The same handover with movement and blur removed. */
export const slideVariantsReduced = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.4, ease: EASE } },
  exit: { opacity: 0, transition: { duration: 0.3, ease: EASE } },
};

/* ── slide interior ───────────────────────────────────────────────────────── */

/**
 * When a slide's interior choreography is allowed to start.
 *
 * This number is the whole reason the showcase can look static. The incoming
 * slide spends 0.65s going from opacity 0 to 1; anything inside it that starts
 * at mount with a ~0.5s duration has therefore *finished* by the time the slide
 * is actually visible, and all you ever see is the end state. Holding the
 * interior back until the handover is mostly done is what makes the animation
 * something you watch rather than something you miss.
 *
 * Every in-slide delay is expressed relative to this.
 */
export const INTERIOR_START = 0.3;

/** Stagger root. Every slide builds its interior from one of these. */
export const staggerGroup = (staggerChildren = 0.08, delayChildren = 0.15) => ({
  hidden: {},
  visible: { transition: { staggerChildren, delayChildren } },
});

/** Fades up. The default for anything appearing inside a slide. */
export const riseItem = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
};

/** Slides in from the right. For list rows, which read better horizontally. */
export const slideInItem = {
  hidden: { opacity: 0, x: 12 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.45, ease: EASE } },
};

/** Plain fade, for anything that should arrive without moving. */
export const fadeItem = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5, ease: EASE } },
};

/**
 * Ambient float for decorative panels. Transform only, and small enough that it
 * reads as depth rather than as animation.
 */
export const softFloat = (distance = 5, duration = 6) => ({
  animate: { y: [0, -distance, 0] },
  transition: { duration, repeat: Infinity, ease: "easeInOut" },
});

/* ── slide copy ───────────────────────────────────────────────────────────── */

export const titleMotion = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.12, ease: EASE } },
};

export const subtitleMotion = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.22, ease: EASE } },
};

/* ── login form ───────────────────────────────────────────────────────────── */

/**
 * Form entrance. Runs exactly once: logo, heading, subtitle, the two fields, the
 * options row, the button, the sign-up link — then the form is still.
 */
export const formGroup = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};

export const formItem = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
};

/**
 * Primary button. Named variants rather than inline `whileHover` objects,
 * because the arrow is a descendant and can only follow the hover state if it
 * is propagated down by name.
 */
export const buttonMotion = {
  rest: { y: 0, scale: 1 },
  hover: { y: -1, transition: { duration: 0.18, ease: "easeOut" } },
  tap: { scale: 0.99, transition: { duration: 0.18, ease: "easeOut" } },
};

export const arrowMotion = {
  rest: { x: 0 },
  hover: { x: 3, transition: { duration: 0.18, ease: "easeOut" } },
  tap: { x: 3 },
};

/**
 * The back control's chevron — nudges left on hover, the mirror of the sign-in
 * arrow. Its resting key is `visible`, not `rest`, so it matches the state its
 * parent settles into after the entrance and returns cleanly to 0 when the
 * pointer leaves.
 */
export const backChevronMotion = {
  visible: { x: 0, transition: { duration: 0.18, ease: "easeOut" } },
  hover: { x: -3, transition: { duration: 0.18, ease: "easeOut" } },
};

/**
 * Input focus. Only the box-shadow animates, in raw rgba — the one property
 * Framer can interpolate frame by frame, and the brand red is a fixed pigment
 * (#e30613) so a literal is safe. 8%, matching the dashboard's card hover
 * shadows. The border colour is left to the Input's own 200ms transition.
 */
export const fieldShadow = {
  rest: { boxShadow: "0 1px 2px rgba(16,24,40,0.04)" },
  focus: {
    boxShadow: "0 0 0 4px rgba(227,6,19,0.08), 0 1px 2px rgba(16,24,40,0.04)",
  },
  error: {
    boxShadow: "0 0 0 4px rgba(185,2,29,0.08), 0 1px 2px rgba(16,24,40,0.04)",
  },
};

/* ── ambient ──────────────────────────────────────────────────────────────── */

/** The background swell. Translation only, 8px over 16 seconds. */
export const backgroundDrift = {
  animate: { x: [0, 8, 0], y: [0, -8, 0] },
  transition: { duration: 16, repeat: Infinity, ease: "easeInOut" },
};
