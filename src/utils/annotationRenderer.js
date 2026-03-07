/**
 * Utility functions for rendering highlights and notes in text content
 */

const HIGHLIGHT_COLOR = 'rgb(253, 224, 71)';

/**
 * Collect all text node segments that intersect the range (without modifying DOM).
 * @param {Range} range - The selection range
 * @returns {Array<{ node: Text, startInNode: number, endInNode: number }>}
 */
function getTextSegmentsInRange(range) {
  const segments = [];
  const startContainer = range.startContainer;
  const endContainer = range.endContainer;
  const startOffset = range.startOffset;
  const endOffset = range.endOffset;

  const root = range.commonAncestorContainer;
  const walkerRoot = root.nodeType === Node.TEXT_NODE ? root.parentNode : root;
  const walker = document.createTreeWalker(
    walkerRoot,
    NodeFilter.SHOW_TEXT,
    null
  );

  let node;
  while ((node = walker.nextNode())) {
    if (!range.intersectsNode(node)) continue;
    const text = node.textContent;
    const len = text.length;
    if (len === 0) continue;

    const startInNode = node === startContainer ? startOffset : 0;
    const endInNode = node === endContainer ? endOffset : len;
    if (startInNode >= endInNode) continue;

    segments.push({ node, startInNode, endInNode });
  }

  return segments;
}

/**
 * Wrap a single text segment in a <mark> (splitting the text node if needed).
 * @param {Text} node - Text node (may be split in place)
 * @param {number} startInNode - Start offset within the node
 * @param {number} endInNode - End offset within the node
 * @param {string} highlightId - Unique ID for the highlight
 * @returns {HTMLElement} The created mark element
 */
function wrapTextSegmentInMark(node, startInNode, endInNode, highlightId) {
  let toWrap = node;
  if (startInNode > 0) {
    toWrap = node.splitText(startInNode);
  }
  const segmentLength = endInNode - startInNode;
  if (toWrap.length > segmentLength) {
    toWrap.splitText(segmentLength);
  }

  const mark = document.createElement('mark');
  mark.className = 'annotation-highlight';
  mark.style.backgroundColor = HIGHLIGHT_COLOR;
  mark.style.cursor = 'pointer';
  mark.style.userSelect = 'none';
  mark.style.webkitUserSelect = 'none';
  mark.setAttribute('data-highlight-id', highlightId);
  mark.setAttribute('data-highlight', 'true');
  mark.setAttribute('draggable', 'false');

  const parent = toWrap.parentNode;
  parent.insertBefore(mark, toWrap);
  mark.appendChild(toWrap);
  return mark;
}

/**
 * Apply highlight to a range by wrapping each intersecting text segment in <mark>.
 * Supports selections spanning multiple DOM nodes and block elements.
 * @param {Range} range - The text range to highlight
 * @param {string} highlightId - Unique ID for the highlight
 * @returns {HTMLElement|null} The first created mark element, or null
 */
export const applyHighlight = (range, highlightId) => {
  if (!range || range.collapsed) return null;
  try {
    const segments = getTextSegmentsInRange(range);
    if (segments.length === 0) return null;

    let firstMark = null;
    for (const { node, startInNode, endInNode } of segments) {
      const mark = wrapTextSegmentInMark(node, startInNode, endInNode, highlightId);
      if (!firstMark) firstMark = mark;
    }
    return firstMark;
  } catch (error) {
    console.error('Error applying highlight:', error);
    return null;
  }
};

/**
 * Wrap a single text segment in a note <span> (splitting the text node if needed).
 * @param {Text} node - Text node (may be split in place)
 * @param {number} startInNode - Start offset within the node
 * @param {number} endInNode - End offset within the node
 * @param {string} noteId - Unique ID for the note
 * @returns {HTMLElement} The created span element
 */
function wrapTextSegmentInNoteSpan(node, startInNode, endInNode, noteId) {
  let toWrap = node;
  if (startInNode > 0) {
    toWrap = node.splitText(startInNode);
  }
  const segmentLength = endInNode - startInNode;
  if (toWrap.length > segmentLength) {
    toWrap.splitText(segmentLength);
  }

  const span = document.createElement('span');
  span.setAttribute('data-note-id', noteId);
  span.className = 'annotation-note border-b-2 border-blue-500';
  span.style.cursor = 'pointer';
  span.style.backgroundColor = 'rgba(59, 130, 246, 0.3)';

  const parent = toWrap.parentNode;
  parent.insertBefore(span, toWrap);
  span.appendChild(toWrap);
  return span;
}

/**
 * Apply note to a range by wrapping each intersecting text segment in a <span>.
 * Supports selections spanning multiple DOM nodes and block elements.
 * @param {Range} range - The text range to note
 * @param {string} noteId - Unique ID for the note
 * @returns {HTMLElement|null} The first created span element, or null
 */
export const applyNote = (range, noteId) => {
  if (!range || range.collapsed) return null;
  try {
    const segments = getTextSegmentsInRange(range);
    if (segments.length === 0) return null;

    let firstSpan = null;
    for (const { node, startInNode, endInNode } of segments) {
      const span = wrapTextSegmentInNoteSpan(node, startInNode, endInNode, noteId);
      if (!firstSpan) firstSpan = span;
    }
    return firstSpan;
  } catch (error) {
    console.error('Error applying note:', error);
    return null;
  }
};

/**
 * Unified function to apply visual annotation
 * @param {Range} range - The text range to annotate
 * @param {string} id - Unique ID for the annotation
 * @param {string} type - 'highlight' or 'note'
 * @returns {HTMLElement} The created element
 */
export const applyVisualAnnotation = (range, id, type) => {
  if (type === 'highlight') {
    return applyHighlight(range, id);
  } else if (type === 'note') {
    return applyNote(range, id);
  }
  return null;
};

/**
 * Remove highlight by ID. Unwraps all <mark> elements with this data-highlight-id
 * (one highlight can span multiple marks when it crosses block boundaries).
 * @param {string} highlightId - The highlight ID to remove
 */
export const removeHighlight = (highlightId) => {
  const marks = document.querySelectorAll(`[data-highlight-id="${highlightId}"]`);
  marks.forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark);
    }
    parent.removeChild(mark);
    parent.normalize();
  });
};

/**
 * Remove note by ID. Unwraps all elements with this data-note-id
 * (one note can span multiple spans when it crosses block boundaries).
 * @param {string} noteId - The note ID to remove
 */
export const removeNote = (noteId) => {
  const spans = document.querySelectorAll(`[data-note-id="${noteId}"]`);
  spans.forEach((span) => {
    const parent = span.parentNode;
    if (!parent) return;
    while (span.firstChild) {
      parent.insertBefore(span.firstChild, span);
    }
    parent.removeChild(span);
    parent.normalize();
  });
};

/**
 * Get text offset within a container
 * @param {Node} container - The container node
 * @param {Range} range - The range to get offset for
 * @returns {Object} Object with startOffset and endOffset
 */
export const getTextOffsets = (container, range) => {
  const preCaretRange = range.cloneRange();
  preCaretRange.selectNodeContents(container);
  preCaretRange.setEnd(range.startContainer, range.startOffset);
  const startOffset = preCaretRange.toString().length;

  const postCaretRange = range.cloneRange();
  postCaretRange.selectNodeContents(container);
  postCaretRange.setStart(range.endContainer, range.endOffset);
  const endOffset = container.textContent.length - postCaretRange.toString().length;

  return { startOffset, endOffset };
};

/**
 * Find node at offset in container
 * @param {Node} container - The container node
 * @param {number} offset - The text offset
 * @returns {Object} Object with node and offset within that node
 */
export const findNodeAtOffset = (container, offset) => {
  let currentOffset = 0;
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null
  );

  let node;
  while ((node = walker.nextNode())) {
    const nodeLength = node.textContent.length;
    if (currentOffset + nodeLength >= offset) {
      return {
        node,
        offset: offset - currentOffset,
      };
    }
    currentOffset += nodeLength;
  }

  return { node: container, offset: container.textContent.length };
};

/**
 * Create range from offsets
 * @param {Node} container - The container node
 * @param {number} startOffset - Start text offset
 * @param {number} endOffset - End text offset
 * @returns {Range} The created range
 */
export const createRangeFromOffsets = (container, startOffset, endOffset) => {
  const range = document.createRange();
  const start = findNodeAtOffset(container, startOffset);
  const end = findNodeAtOffset(container, endOffset);

  range.setStart(start.node, start.offset);
  range.setEnd(end.node, end.offset);

  return range;
};

