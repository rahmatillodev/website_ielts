import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FaHighlighter, FaQuoteLeft, FaTrash } from 'react-icons/fa';
import { useAnnotation } from '@/contexts/AnnotationContext';
import {
  isCoarsePointerType,
  isTapMovement,
  noteSelectionConsumed,
  clearSelectionConsumed,
} from '@/utils/pointerInput';

// A touch selection is never "finished" the way a mouse drag is: the user lifts
// the finger and then nudges the iOS handles for a while. Wait for the selection
// to stay still this long before showing the actions over it.
const SELECTION_SETTLE_MS = 300;

// Highlight Mode commits without asking, so it waits longer than the bubble
// does: the iOS handles are usually still being nudged at 300ms, and a pause
// for thought should not be read as "done". A premature highlight is one tap
// to undo, but it is still worth not provoking.
const HIGHLIGHT_MODE_SETTLE_MS = 650;

const TextSelectionTooltip = ({ universalContentRef, partId: defaultPartId, onHighlight, onNote, testType = 'reading' }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [selectedText, setSelectedText] = useState('');
  const [selectedRange, setSelectedRange] = useState(null);
  const [isExistingHighlight, setIsExistingHighlight] = useState(false);
  const [highlightId, setHighlightId] = useState(null);
  const [currentPartId, setCurrentPartId] = useState(defaultPartId);
  const [currentSectionType, setCurrentSectionType] = useState('passage');
  const tooltipRef = useRef(null);
  // Where the current gesture started, and with what kind of pointer.
  const pointerStartRef = useRef(null);
  // Set while the gesture that opened the bubble is still producing events, so
  // its own trailing clicks cannot close what it just opened.
  const openedByThisGestureRef = useRef(false);
  const { removeHighlight, openNoteSidebar, isHighlightMode } = useAnnotation();

  const lastPointerWasCoarse = () => isCoarsePointerType(pointerStartRef.current?.type);

  // The document listeners below are installed once; these keep them reading
  // current values without tearing down and re-adding on every render.
  const highlightModeRef = useRef(isHighlightMode);
  const onHighlightRef = useRef(onHighlight);
  const testTypeRef = useRef(testType);

  useEffect(() => {
    highlightModeRef.current = isHighlightMode;
    onHighlightRef.current = onHighlight;
    testTypeRef.current = testType;
  });

  useEffect(() => {
    let settleTimer = null;
    let showTimer = null;

    // Which part/section a selection belongs to, read off the surrounding markup.
    const findContextFromElement = (node) => {
      if (!node) return { partId: defaultPartId, sectionType: 'passage' };

      // Convert text node to element node if needed
      let element = node;
      if (node.nodeType === Node.TEXT_NODE) {
        element = node.parentElement;
      } else if (node.nodeType !== Node.ELEMENT_NODE) {
        // If it's not a text node or element node, try to get parent
        element = node.parentElement || node.parentNode;
      }

      if (!element || typeof element.closest !== 'function') {
        return { partId: defaultPartId, sectionType: 'passage' };
      }

      // Try to find data-part-id attribute
      const partElement = element.closest('[data-part-id]');
      if (partElement) {
        const partId = parseInt(partElement.getAttribute('data-part-id')) || defaultPartId;
        const sectionType = partElement.getAttribute('data-section-type') || 'passage';
        return { partId, sectionType };
      }

      // Fallback: check if it's in questions section
      const questionsSection = element.closest('[data-section="questions"]');
      if (questionsSection) {
        const partId = parseInt(questionsSection.getAttribute('data-part-id')) || defaultPartId;
        return { partId, sectionType: 'questions' };
      }

      // Fallback: check if it's in passage section
      const passageSection = element.closest('[data-section="passage"]');
      if (passageSection) {
        const partId = parseInt(passageSection.getAttribute('data-part-id')) || defaultPartId;
        return { partId, sectionType: 'passage' };
      }

      return { partId: defaultPartId, sectionType: 'passage' };
    };

    // Is the selection already sitting inside an annotation?
    const checkIfAnnotated = (range) => {
      const container = range.commonAncestorContainer;
      let element = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;
      while (element && element !== universalContentRef?.current) {
        if (element.tagName === 'MARK' || element.hasAttribute('data-note-id')) return true;
        element = element.parentElement;
      }
      return false;
    };

    const asElement = (node) =>
      node && node.nodeType === Node.TEXT_NODE ? node.parentElement : node;

    const findMark = (node) => {
      const element = asElement(node);
      return element && typeof element.closest === 'function'
        ? element.closest('mark[data-highlight-id]')
        : null;
    };

    const findNote = (node) => {
      const element = asElement(node);
      return element && typeof element.closest === 'function'
        ? element.closest('[data-note-id]')
        : null;
    };

    const clearSelection = () => {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        selection.removeAllRanges();
      }
    };

    /** Keep the bubble on screen, preferring just below the target. */
    const placeTooltip = (rect, width, height) => {
      const padding = 10;
      let top = rect.bottom + 12;
      let left = rect.left + rect.width / 2;

      if (top + height > window.innerHeight - padding) {
        top = rect.top - height - padding;
      }
      if (left - width / 2 < padding) left = width / 2 + padding;
      if (left + width / 2 > window.innerWidth - padding) left = window.innerWidth - width / 2 - padding;

      return { top, left };
    };

    /** Open the single-action bubble that removes an existing highlight. */
    const openHighlightActions = (markElement) => {
      openedByThisGestureRef.current = true;
      setHighlightId(markElement.getAttribute('data-highlight-id'));
      setIsExistingHighlight(true);
      setSelectedText('');
      setSelectedRange(null);
      setTooltipPosition(placeTooltip(markElement.getBoundingClientRect(), 140, 50));
      setShowTooltip(true);
      clearSelection();
    };

    /**
     * Shared by the mouse (`mouseup`) and the touch (`selectionchange`) paths:
     * decide whether what is currently selected can be annotated and, if so,
     * open the Note/Highlight bubble over it. Returns false when the selection
     * is not annotatable, leaving it to the caller to decide about hiding - the
     * touch path must never hide, because tapping our own buttons collapses the
     * native selection and would otherwise close the bubble before the tap
     * registered.
     */
    const openSelectionActions = () => {
      const selection = window.getSelection();
      const container = universalContentRef?.current;

      if (!selection || !selection.rangeCount || selection.isCollapsed) return false;

      const range = selection.getRangeAt(0);
      if (!container || !container.contains(range.commonAncestorContainer)) return false;

      // Don't offer to annotate something that is already annotated.
      if (findMark(range.commonAncestorContainer) || findNote(range.commonAncestorContainer)) return false;

      const text = selection.toString().trim();
      if (!text) return false;
      if (checkIfAnnotated(range)) return false;

      const rect = range.getBoundingClientRect();
      if (!rect || (!rect.width && !rect.height)) return false;

      const context = findContextFromElement(range.commonAncestorContainer);

      // Highlight Mode: commit through the very same callback the bubble's
      // Highlight button calls, so there is one highlight system, not two.
      if (highlightModeRef.current && lastPointerWasCoarse()) {
        const apply = onHighlightRef.current;
        if (apply) {
          apply(range.cloneRange(), text, context.partId, context.sectionType, testTypeRef.current);
          noteSelectionConsumed();
          clearSelection();
          setShowTooltip(false);
          return true;
        }
      }

      setCurrentPartId(context.partId);
      setCurrentSectionType(context.sectionType);
      setSelectedText(text);
      setSelectedRange(range.cloneRange());
      setIsExistingHighlight(false);
      setHighlightId(null);
      setTooltipPosition(placeTooltip(rect, 160, 70));

      window.clearTimeout(showTimer);
      showTimer = window.setTimeout(() => setShowTooltip(true), 10);
      return true;
    };

    // Remember where each gesture started so a release can be classified as a
    // tap or a drag, and so every other handler knows which input is in use.
    // Passive + capture: purely observational, it never interferes with the
    // native long-press selection gesture or with scrolling.
    const handlePointerDown = (e) => {
      openedByThisGestureRef.current = false;
      // A new gesture owns its own clicks; whatever the previous one annotated
      // must no longer suppress an answer selection.
      clearSelectionConsumed();
      pointerStartRef.current = {
        type: e.pointerType || 'mouse',
        x: e.clientX,
        y: e.clientY,
      };
    };

    // Prevent text selection when clicking on highlights.
    const handleMouseDown = (e) => {
      // Mouse only. On touch this is a synthesised event fired after the finger
      // has already lifted; cancelling it there swallows the tap that follows
      // (which would break answer selection) without preventing anything.
      if (lastPointerWasCoarse()) return;

      const clickedElement = e.target;
      const markElement = findMark(clickedElement);
      const noteElement = findNote(clickedElement);

      if (markElement || noteElement) {
        // Prevent default text selection behavior
        e.preventDefault();
        // Don't stop propagation - we want the click to bubble up for tooltip positioning
      }
    };

    // Right-click on an existing highlight is what manages it: swallow the browser
    // context menu and show the Delete Highlight action for THAT highlight. Anywhere
    // else the context menu is left completely alone. No click event is produced by a
    // secondary button, so nothing underneath (a Multiple Choice option, say) reacts.
    const handleContextMenu = (e) => {
      const markElement = findMark(e.target);
      if (!markElement) return;

      e.preventDefault();
      e.stopPropagation();
      openHighlightActions(markElement);
    };

    const handleMouseUp = (e) => {
      // Selection/note handling is primary-button only; the secondary button is
      // handled by handleContextMenu.
      if (e.button !== undefined && e.button !== 0) return;

      const selection = window.getSelection();

      // Check if clicking on tooltip buttons - don't process if so
      const clickedElement = e.target;
      if (tooltipRef.current && tooltipRef.current.contains(clickedElement)) {
        return;
      }

      // Left-clicking a highlight is deliberately inert here: it stays available for
      // normal answer interaction and text selection. Deleting is right-click only.
      const noteElement = findNote(clickedElement);

      if (noteElement) {
        // User clicked on existing note - open sidebar and focus note
        e.preventDefault();
        e.stopPropagation();

        const noteIdValue = noteElement.getAttribute('data-note-id');
        if (openNoteSidebar && noteIdValue) {
          openNoteSidebar(noteIdValue);
        }
        clearSelection();
        setShowTooltip(false);
        return;
      }

      // Touch/pen stand-in for right-click: tapping a highlight offers to remove
      // it. The event is deliberately NOT swallowed, so a Multiple Choice option
      // sitting under the highlight still records the answer for that same tap,
      // and nothing is destroyed until the user taps the button in the bubble.
      const markElement = findMark(clickedElement);
      if (
        markElement &&
        lastPointerWasCoarse() &&
        isTapMovement(pointerStartRef.current, e) &&
        (!selection || !selection.rangeCount || selection.isCollapsed)
      ) {
        openHighlightActions(markElement);
        return;
      }

      // Regular text selection - only if not clicking on highlight/note.
      if (!openSelectionActions()) {
        setShowTooltip(false);
      }
    };

    /**
     * Touch path. A finger produces no meaningful `mouseup` for a long-press
     * selection, and dragging the iOS selection handles produces no pointer
     * events over the text at all - `selectionchange` is the only signal that
     * covers both. Debounced so the bubble appears once the selection settles
     * instead of flickering while the handles move.
     */
    const handleSelectionChange = () => {
      if (!lastPointerWasCoarse()) return; // the mouse keeps the mouseup path
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(
        openSelectionActions,
        highlightModeRef.current ? HIGHLIGHT_MODE_SETTLE_MS : SELECTION_SETTLE_MS
      );
    };

    const handleClickOutside = (e) => {
      // Don't hide if clicking on tooltip itself
      if (tooltipRef.current && tooltipRef.current.contains(e.target)) {
        return;
      }

      // Don't hide if clicking on a note element (handled by mouseup)
      if (findNote(e.target)) {
        return;
      }

      // The tap that opened the bubble must not also close it. A tap on a
      // highlight inside an answer option produces two clicks - one on the mark
      // and one that the <label> forwards to its radio - and only the first
      // carries the mark, so match on the gesture rather than on the target.
      if (openedByThisGestureRef.current) {
        return;
      }

      const selection = window.getSelection();
      // Only hide if there's no text selection
      if (!selection.rangeCount || selection.isCollapsed) {
        setShowTooltip(false);
      }
    };

    // Use capture phase for click to handle it before other handlers
    document.addEventListener('pointerdown', handlePointerDown, { capture: true, passive: true });
    document.addEventListener('mousedown', handleMouseDown, true);
    document.addEventListener('mouseup', handleMouseUp, true);
    document.addEventListener('contextmenu', handleContextMenu, true);
    document.addEventListener('click', handleClickOutside, true);
    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      window.clearTimeout(settleTimer);
      window.clearTimeout(showTimer);
      document.removeEventListener('pointerdown', handlePointerDown, { capture: true });
      document.removeEventListener('mousedown', handleMouseDown, true);
      document.removeEventListener('mouseup', handleMouseUp, true);
      document.removeEventListener('contextmenu', handleContextMenu, true);
      document.removeEventListener('click', handleClickOutside, true);
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [universalContentRef, openNoteSidebar, defaultPartId]);

  const handleAction = (callback, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (callback && selectedRange) {
      callback(selectedRange, selectedText, currentPartId, currentSectionType, testType);
      // Touch only. On desktop no stray click follows the bubble, and recording
      // a consumption there could swallow a genuine click on an answer option.
      if (isCoarsePointerType(pointerStartRef.current?.type)) noteSelectionConsumed();
    }

    // Clear selection and close tooltip immediately
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      selection.removeAllRanges();
    }

    setShowTooltip(false);
    setSelectedRange(null);
    setSelectedText('');
  };

  // Keeping the native selection alive through the press is a mouse concern.
  // On touch the same call can swallow the click that follows, and it isn't
  // needed there: the range was cloned when the bubble opened.
  const handleButtonMouseDown = (e) => {
    if (isCoarsePointerType(pointerStartRef.current?.type)) return;
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDeleteHighlight = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (highlightId && removeHighlight) {
      removeHighlight(highlightId);
    } else {
      console.warn('Cannot delete highlight: missing highlightId or removeHighlight function', { highlightId, removeHighlight });
    }

    setShowTooltip(false);
    setIsExistingHighlight(false);
    setHighlightId(null);

    // Clear any text selection
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      selection.removeAllRanges();
    }
  };

  if (!showTooltip) return null;

  const tooltipContent = (
    <>
      <style>{`
        .ielts-tooltip {
          z-index: 40 !important;
          box-shadow: 0 4px 15px rgba(0,0,0,0.15);
          border: 1px solid #d1d5db;
          user-select: none;
          -webkit-user-select: none;
          /* Respond on first tap (no double-tap-zoom delay) and never let a
             press on the bubble turn into an iOS callout. */
          touch-action: manipulation;
          -webkit-touch-callout: none;
        }
        /* Arrow pointing upwards */
        .ielts-tooltip::after {
          content: '';
          position: absolute;
          top: -6px;
          left: 50%;
          transform: translateX(-50%) rotate(45deg);
          width: 12px;
          height: 12px;
          background: white;
          border-left: 1px solid #d1d5db;
          border-top: 1px solid #d1d5db;
        }
        .ielts-btn {
          all: unset;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 8px 16px;
          cursor: pointer;
          transition: background 0.2s;
          min-width: 60px;
          position: relative;
          z-index: 2;
          touch-action: manipulation;
        }
        .ielts-btn:hover {
          background-color: #f3f4f6;
        }
        .ielts-btn span {
          font-size: 12px;
          font-weight: 500;
          margin-top: 4px;
          color: #374151;
        }
        .ielts-icon {
          font-size: 16px;
          color: #4b5563;
        }
        .ielts-delete-icon {
          font-size: 16px;
          color: var(--destructive-text);
        }
        .ielts-divider {
          width: 1px;
          background-color: #e5e7eb;
          margin: 8px 0;
          z-index: 2;
        }
        /* Delete button specific styling */
        .ielts-btn-delete:hover {
          background-color: var(--destructive-subtle);
        }
        .ielts-btn-delete span {
          color: var(--destructive-text);
        }
        /* Finger-sized targets wherever there is no fine pointer - covers iPad
           in every orientation without asking which device it is. */
        @media (pointer: coarse) {
          .ielts-btn {
            padding: 12px 20px;
            min-width: 76px;
          }
          .ielts-btn span {
            font-size: 13px;
          }
        }
      `}</style>
      <div
        ref={tooltipRef}
        className="ielts-tooltip fixed flex bg-white rounded-lg"
        style={{
          top: `${tooltipPosition.top}px`,
          left: `${tooltipPosition.left}px`,
          transform: 'translateX(-50%)',
          pointerEvents: 'auto',
        }}
      >
        {isExistingHighlight ? (
          <button
            className="ielts-btn ielts-btn-delete"
            onClick={handleDeleteHighlight}
            onMouseDown={handleButtonMouseDown}
            type="button"
          >
            <FaTrash className="ielts-delete-icon" />
            <span>Delete Highlight</span>
          </button>
        ) : (
          <>
            <button
              className="ielts-btn"
              onClick={(e) => handleAction(onNote, e)}
              onMouseDown={handleButtonMouseDown}
              type="button"
            >
              <FaQuoteLeft className="ielts-icon" />
              <span>Note</span>
            </button>

            <div className="ielts-divider" />

            <button
              className="ielts-btn"
              onClick={(e) => handleAction(onHighlight, e)}
              onMouseDown={handleButtonMouseDown}
              type="button"
            >
              <FaHighlighter className="ielts-icon" />
              <span>Highlight</span>
            </button>
          </>
        )}
      </div>
    </>
  );

  return createPortal(tooltipContent, document.body);
};

export default TextSelectionTooltip;
