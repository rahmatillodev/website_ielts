/**
 * Pointer-capability helpers shared by the annotation surfaces.
 *
 * Highlighting has to behave differently for a mouse (a drag ends in `mouseup`,
 * the secondary button opens a context menu) than for a finger or an Apple
 * Pencil (native long-press selection, handles dragged long after the initial
 * press, no right-click at all). We branch on the *pointer that produced the
 * event* rather than on device names or viewport sizes, so a hybrid machine
 * behaves correctly whichever input the user reaches for.
 */

/** Finger and stylus both drive the native iOS/iPadOS selection UI. */
export const isCoarsePointerType = (type) => type === 'touch' || type === 'pen';

/**
 * Matches a device whose *primary* input is a finger and which cannot hover -
 * an iPad or a phone, not a laptop.
 *
 * Deliberately both halves, and deliberately not a width query:
 *  - a narrow desktop window is still `pointer: fine` + `hover: hover`;
 *  - a touchscreen laptop driven by its trackpad is also fine/hover, because
 *    these queries describe the primary pointer rather than every pointer the
 *    machine has (that would be `any-pointer` / `any-hover`);
 *  - an iPad with a Magic Keyboard trackpad attached reports fine/hover too,
 *    and at that point it genuinely behaves like a laptop.
 */
export const TOUCH_PRIMARY_QUERY = '(pointer: coarse) and (hover: none)';

/**
 * Is the current device touch-first?
 *
 * The media query is the authority. `navigator.maxTouchPoints` is deliberately
 * NOT required: it is unreliable across engines (some WebKit builds report 0
 * on genuinely touch-driven contexts), and requiring it can hide the control
 * on devices that should have it. Pointer Events support is checked because
 * the touch handling downstream is written against them.
 * @returns {boolean}
 */
export const isTouchPrimaryDevice = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  if (typeof window.PointerEvent !== 'function') return false;
  return window.matchMedia(TOUCH_PRIMARY_QUERY).matches;
};

/**
 * How far a pointer may travel between press and release and still count as a
 * tap/click rather than a drag. Fingers wobble far more than a mouse does.
 */
export const tapSlopFor = (type) => (isCoarsePointerType(type) ? 10 : 6);

/**
 * A gesture that produced an annotation has "consumed" its selection.
 *
 * Highlight Mode applies the highlight and clears the selection as soon as it
 * settles, so by the time the tap's trailing click arrives there is nothing
 * selected left for the answer guard to notice - and the click would choose a
 * Multiple Choice option the user was only highlighting. This records that a
 * selection was just turned into an annotation so the guard can still refuse.
 *
 * It is cleared by the next pointer press, so it only ever suppresses clicks
 * belonging to the gesture that made the annotation - a deliberate later tap on
 * the same option still selects the answer. The timestamp is only a backstop
 * for the case where no further press arrives.
 */
let selectionConsumedAt = 0;
const CONSUMED_BACKSTOP_MS = 1500;

/** Called when a selection has been turned into a highlight or a note. */
export const noteSelectionConsumed = () => {
  selectionConsumedAt = Date.now();
};

/** Called on the next pointer press: a new gesture owns its own clicks. */
export const clearSelectionConsumed = () => {
  selectionConsumedAt = 0;
};

/** Did the gesture still in progress just turn its selection into an annotation? */
export const selectionWasJustConsumed = () =>
  selectionConsumedAt > 0 && Date.now() - selectionConsumedAt < CONSUMED_BACKSTOP_MS;

/**
 * Did the pointer stay within tap distance of where it went down?
 * @param {{x: number, y: number, type?: string}|null} start - press position
 * @param {{clientX: number, clientY: number}|null} end - release event
 */
export const isTapMovement = (start, end) => {
  if (!start || !end || typeof end.clientX !== 'number') return false;
  const slop = tapSlopFor(start.type);
  return Math.abs(end.clientX - start.x) <= slop && Math.abs(end.clientY - start.y) <= slop;
};
