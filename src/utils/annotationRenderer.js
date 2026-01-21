/**
 * Utility functions for rendering highlights and notes in text content
 */

/**
 * Apply highlight to a range
 * @param {Range} range - The text range to highlight
 * @param {string} highlightId - Unique ID for the highlight
 * @returns {HTMLElement} The created mark element
 */
export const applyHighlight = (range, highlightId) => {
  try {
    const mark = document.createElement('mark');
    mark.className = 'bg-yellow-300';
    mark.setAttribute('data-highlight-id', highlightId);
    mark.setAttribute('data-highlight', 'true');
    
    // Clone the range to avoid issues
    const clonedRange = range.cloneRange();
    
    try {
      clonedRange.surroundContents(mark);
    } catch (e) {
      // If surroundContents fails (e.g., range spans multiple elements),
      // use extractContents and append
      const contents = clonedRange.extractContents();
      mark.appendChild(contents);
      clonedRange.insertNode(mark);
    }
    
    return mark;
  } catch (error) {
    console.error('Error applying highlight:', error);
    return null;
  }
};

/**
 * Apply note to a range
 * @param {Range} range - The text range to note
 * @param {string} noteId - Unique ID for the note
 * @returns {HTMLElement} The created span element
 */
export const applyNote = (range, noteId) => {
  try {
    const span = document.createElement('span');
    span.setAttribute('data-note-id', noteId);
    span.className = 'border-b-2 border-blue-500';
    span.style.cursor = 'pointer';
    span.style.backgroundColor = 'rgba(59, 130, 246, 0.3)';
    
    // Clone the range to avoid issues
    const clonedRange = range.cloneRange();
    
    try {
      clonedRange.surroundContents(span);
    } catch (e) {
      // If surroundContents fails, use extractContents and append
      const contents = clonedRange.extractContents();
      span.appendChild(contents);
      clonedRange.insertNode(span);
    }
    
    return span;
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
 * Remove highlight by ID
 * @param {string} highlightId - The highlight ID to remove
 */
export const removeHighlight = (highlightId) => {
  const mark = document.querySelector(`[data-highlight-id="${highlightId}"]`);
  if (mark) {
    const parent = mark.parentNode;
    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark);
    }
    parent.removeChild(mark);
    // Normalize to merge adjacent text nodes
    parent.normalize();
  }
};

/**
 * Remove note by ID
 * @param {string} noteId - The note ID to remove
 */
export const removeNote = (noteId) => {
  const span = document.querySelector(`[data-note-id="${noteId}"]`);
  if (span) {
    const parent = span.parentNode;
    while (span.firstChild) {
      parent.insertBefore(span.firstChild, span);
    }
    parent.removeChild(span);
    // Normalize to merge adjacent text nodes
    parent.normalize();
  }
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

