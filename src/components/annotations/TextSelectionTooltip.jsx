import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FaHighlighter, FaQuoteLeft, FaTrash } from 'react-icons/fa';
import { useAppearance } from '@/contexts/AppearanceContext';
import { useAnnotation } from '@/contexts/AnnotationContext';

const TextSelectionTooltip = ({ universalContentRef, partId: defaultPartId, onHighlight, onNote, testType = 'reading' }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [selectedText, setSelectedText] = useState('');
  const [selectedRange, setSelectedRange] = useState(null);
  const [isExistingHighlight, setIsExistingHighlight] = useState(false);
  const [highlightId, setHighlightId] = useState(null);
  const [noteId, setNoteId] = useState(null);
  const [currentPartId, setCurrentPartId] = useState(defaultPartId);
  const [currentSectionType, setCurrentSectionType] = useState('passage');
  const tooltipRef = useRef(null);
  const { themeColors } = useAppearance();
  const { removeHighlight, openNoteSidebar } = useAnnotation();

  // Helper function to find partId and sectionType from element
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

  useEffect(() => {
    // Prevent text selection when clicking on highlights
    const handleMouseDown = (e) => {
      const clickedElement = e.target;
      const markElement = clickedElement.closest('mark[data-highlight-id]');
      const noteElement = clickedElement.closest('[data-note-id]');
      
      if (markElement || noteElement) {
        // Prevent default text selection behavior
        e.preventDefault();
        // Don't stop propagation - we want the click to bubble up for tooltip positioning
      }
    };

    const handleMouseUp = (e) => {
      const selection = window.getSelection();
      const container = universalContentRef?.current;
      
      // Check if clicking on tooltip buttons - don't process if so
      const clickedElement = e.target;
      if (tooltipRef.current && tooltipRef.current.contains(clickedElement)) {
        return;
      }
      
      // Check if clicking on an existing highlight FIRST (before text selection)
      const markElement = clickedElement.closest('mark[data-highlight-id]');
      const noteElement = clickedElement.closest('[data-note-id]');
      
      if (markElement) {
        // User clicked on existing highlight - show delete tooltip
        e.preventDefault();
        e.stopPropagation();
        
        const highlightIdValue = markElement.getAttribute('data-highlight-id');
        const rect = markElement.getBoundingClientRect();
        const tooltipHeight = 50;
        const tooltipWidth = 140;
        const padding = 10;

        let top = rect.bottom + 12;
        let left = rect.left + (rect.width / 2);

        if (top + tooltipHeight > window.innerHeight - padding) {
          top = rect.top - tooltipHeight - padding;
        }
        
        if (left - tooltipWidth / 2 < padding) left = tooltipWidth / 2 + padding;
        if (left + tooltipWidth / 2 > window.innerWidth - padding) left = window.innerWidth - tooltipWidth / 2 - padding;

        setHighlightId(highlightIdValue);
        setIsExistingHighlight(true);
        setNoteId(null);
        setSelectedText('');
        setSelectedRange(null);
        setTooltipPosition({ top, left });
        setShowTooltip(true);
        
        // Clear any text selection
        if (selection.rangeCount > 0) {
          selection.removeAllRanges();
        }
        return;
      }
      
      if (noteElement) {
        // User clicked on existing note - open sidebar and focus note
        e.preventDefault();
        e.stopPropagation();
        
        const noteIdValue = noteElement.getAttribute('data-note-id');
        if (openNoteSidebar && noteIdValue) {
          openNoteSidebar(noteIdValue);
        }
        if (selection.rangeCount > 0) {
          selection.removeAllRanges();
        }
        setShowTooltip(false);
        return;
      }

      // Regular text selection - only if not clicking on highlight/note
      if (!selection.rangeCount || selection.isCollapsed) {
        // If clicking outside, hide tooltip unless clicking on tooltip itself
        if (!tooltipRef.current?.contains(clickedElement)) {
          setShowTooltip(false);
        }
        return;
      }

      const range = selection.getRangeAt(0);
      
      if (!container || !container.contains(range.commonAncestorContainer)) {
        setShowTooltip(false);
        return;
      }

      // Don't show tooltip if selection is inside a highlight or note
      const selectedMark = range.commonAncestorContainer.nodeType === Node.TEXT_NODE
        ? range.commonAncestorContainer.parentElement?.closest('mark[data-highlight-id]')
        : range.commonAncestorContainer.closest('mark[data-highlight-id]');
      
      const selectedNote = range.commonAncestorContainer.nodeType === Node.TEXT_NODE
        ? range.commonAncestorContainer.parentElement?.closest('[data-note-id]')
        : range.commonAncestorContainer.closest('[data-note-id]');
      
      if (selectedMark || selectedNote) {
        setShowTooltip(false);
        return;
      }

      const text = selection.toString().trim();
      if (!text) {
        setShowTooltip(false);
        return;
      }

      const isAlreadyAnnotated = checkIfAnnotated(range);
      if (isAlreadyAnnotated) {
        setShowTooltip(false);
        return;
      }

      // Find context (partId and sectionType) from the selection
      const context = findContextFromElement(range.commonAncestorContainer);
      setCurrentPartId(context.partId);
      setCurrentSectionType(context.sectionType);

      const rect = range.getBoundingClientRect();
      const tooltipHeight = 70; 
      const tooltipWidth = 160; 
      const padding = 10;

      let top = rect.bottom + 12;
      let left = rect.left + (rect.width / 2);

      if (top + tooltipHeight > window.innerHeight - padding) {
        top = rect.top - tooltipHeight - padding;
      }
      
      if (left - tooltipWidth / 2 < padding) left = tooltipWidth / 2 + padding;
      if (left + tooltipWidth / 2 > window.innerWidth - padding) left = window.innerWidth - tooltipWidth / 2 - padding;

      setSelectedText(text);
      setSelectedRange(range.cloneRange());
      setIsExistingHighlight(false);
      setHighlightId(null);
      setNoteId(null);
      setTooltipPosition({ top, left });
      
      setTimeout(() => setShowTooltip(true), 10);
    };

    const handleClickOutside = (e) => {
      // Don't hide if clicking on tooltip itself
      if (tooltipRef.current && tooltipRef.current.contains(e.target)) {
        return;
      }
      
      // Don't hide if clicking on a mark or note element (handled by mouseup)
      if (e.target.closest('mark[data-highlight-id]') || e.target.closest('[data-note-id]')) {
        return;
      }
      
      const selection = window.getSelection();
      // Only hide if there's no text selection
      if (!selection.rangeCount || selection.isCollapsed) {
        setShowTooltip(false);
      }
    };

    // Use capture phase for click to handle it before other handlers
    document.addEventListener('mousedown', handleMouseDown, true);
    document.addEventListener('mouseup', handleMouseUp, true);
    document.addEventListener('click', handleClickOutside, true);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown, true);
      document.removeEventListener('mouseup', handleMouseUp, true);
      document.removeEventListener('click', handleClickOutside, true);
    };
  }, [universalContentRef, openNoteSidebar, defaultPartId]);

  const checkIfAnnotated = (range) => {
    const container = range.commonAncestorContainer;
    let element = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;
    while (element && element !== universalContentRef?.current) {
      if (element.tagName === 'MARK' || element.hasAttribute('data-note-id')) return true;
      element = element.parentElement;
    }
    return false;
  };

  const handleAction = (callback, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (callback && selectedRange) {
      callback(selectedRange, selectedText, currentPartId, currentSectionType, testType);
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
    setNoteId(null);
    
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
          color: #ef4444;
        }
        .ielts-divider {
          width: 1px;
          background-color: #e5e7eb;
          margin: 8px 0;
          z-index: 2;
        }
        /* Delete button specific styling */
        .ielts-btn-delete:hover {
          background-color: #fee2e2;
        }
        .ielts-btn-delete span {
          color: #ef4444;
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
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
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
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              type="button"
            >
              <FaQuoteLeft className="ielts-icon" />
              <span>Note</span>
            </button>

            <div className="ielts-divider" />

            <button 
              className="ielts-btn" 
              onClick={(e) => handleAction(onHighlight, e)}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
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