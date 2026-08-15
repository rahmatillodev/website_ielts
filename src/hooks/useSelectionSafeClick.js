import { useCallback, useRef } from 'react';
import { tapSlopFor, selectionWasJustConsumed } from '@/utils/pointerInput';

const getSelection = () =>
  typeof window !== 'undefined' && window.getSelection ? window.getSelection() : null;

/** Is there a real (non-empty) text selection anywhere on the page? */
const hasActiveSelection = () => {
  const selection = getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return false;
  return selection.toString().trim().length > 0;
};

/** Does the active selection touch this element? */
const selectionTouches = (element) => {
  if (!hasActiveSelection()) return false;
  if (!element) return true;

  const selection = getSelection();
  for (let i = 0; i < selection.rangeCount; i += 1) {
    const range = selection.getRangeAt(i);
    if (element.contains(range.commonAncestorContainer)) return true;
    try {
      if (range.intersectsNode(element)) return true;
    } catch {
      // Some browsers throw on detached nodes - ignore and keep checking.
    }
  }
  return false;
};

/**
 * Lets users highlight text inside clickable answer options without the
 * gesture that produced the selection toggling the answer.
 *
 * Attach `onPointerDown` to the clickable element, then call
 * `isTextSelectionClick(event, element)` from the click/change handler and bail
 * out when it returns true. Keyboard activations (Enter/Space, arrow keys on a
 * radio group) report `detail === 0` and are always allowed through.
 *
 * Works the same for a mouse drag and for an iPad long-press: in both cases the
 * live selection overlaps the option, which is the primary test. A plain tap
 * leaves no selection and still picks the answer.
 */
export const useSelectionSafeClick = () => {
  const pointerOrigin = useRef(null);

  const onPointerDown = useCallback((event) => {
    pointerOrigin.current =
      typeof event?.clientX === 'number'
        ? { x: event.clientX, y: event.clientY, type: event.pointerType }
        : null;
  }, []);

  const isTextSelectionClick = useCallback((event, element) => {
    const source = event?.nativeEvent || event;
    // Kept until the next pointer press so the guard can be asked more than
    // once for the same click (e.g. from both onClick and onChange).
    const origin = pointerOrigin.current;

    // Keyboard-driven activation - never a text selection.
    if (!source || source.detail === 0) return false;

    const target = element || source.currentTarget || event?.currentTarget || null;
    if (selectionTouches(target)) return true;

    // Highlight Mode has already turned this gesture's selection into a
    // highlight and cleared it, so there is nothing left for the check above to
    // find - but the click still belongs to that gesture and must not pick an
    // answer. Only the touch paths record a consumption (see
    // noteSelectionConsumed callers), so desktop behaviour is untouched, and
    // this does not depend on the option itself having seen the pointerdown.
    if (selectionWasJustConsumed()) return true;

    // Fallback for drags whose selection was already cleared: only treat the
    // pointer movement as a drag when it actually selected something, so a
    // slightly sloppy click still selects the answer. The tolerance follows the
    // pointer type, because a finger wobbles far more than a mouse.
    if (origin && typeof source.clientX === 'number') {
      const slop = tapSlopFor(origin.type);
      const movedFar =
        Math.abs(source.clientX - origin.x) > slop ||
        Math.abs(source.clientY - origin.y) > slop;
      if (movedFar && hasActiveSelection()) return true;
    }

    return false;
  }, []);

  return { onPointerDown, isTextSelectionClick };
};

export default useSelectionSafeClick;
