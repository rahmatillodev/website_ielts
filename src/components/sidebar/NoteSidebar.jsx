import React, { useEffect, useRef } from 'react';
import { FaTrash, FaStickyNote, FaTimes } from 'react-icons/fa';
import { useAnnotation } from '@/contexts/AnnotationContext';
import { useAppearance } from '@/contexts/AppearanceContext';

const NoteSidebar = () => {
  const { notes, updateNote, deleteNote, isSidebarOpen, closeSidebar, focusedNoteId, openNoteSidebar } = useAnnotation();
  const { themeColors, theme } = useAppearance();
  const noteRefs = useRef({});

  // Scroll to focused note when sidebar opens
  useEffect(() => {
    if (isSidebarOpen && focusedNoteId && noteRefs.current[focusedNoteId]) {
      const noteElement = noteRefs.current[focusedNoteId];
      noteElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isSidebarOpen, focusedNoteId]);

  // Only show sidebar if it's open
  if (!isSidebarOpen) {
    return null;
  }

  const handleNoteChange = (noteId, newNoteText) => {
    updateNote(noteId, { note: newNoteText });
  };

  const handleDeleteNote = (noteId) => {
    deleteNote(noteId);
    // Remove the note marker from DOM
    const noteElement = document.querySelector(`[data-note-id="${noteId}"]`);
    if (noteElement) {
      const parent = noteElement.parentNode;
      while (noteElement.firstChild) {
        parent.insertBefore(noteElement.firstChild, noteElement);
      }
      parent.removeChild(noteElement);
      parent.normalize();
    }
  };

  return (
    <div
      className="fixed right-0 top-0 bottom-0 h-full z-40 overflow-y-auto"
      style={{
        width: '400px',
        backgroundColor: themeColors.background,
        borderLeft: `1px solid ${themeColors.border}`,
        boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.1)',
        animation: 'slideInRight 0.3s ease-out',
      }}
    >
      <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: themeColors.border }}>
        <div className="flex items-center gap-2">
          <FaStickyNote style={{ color: themeColors.text }} />
          <h2
            className="text-lg font-semibold"
            style={{ color: themeColors.text }}
          >
            Notes ({notes.length})
          </h2>
        </div>
        <button
          onClick={closeSidebar}
          className="p-1 rounded transition-colors"
          style={{ color: themeColors.text }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme === 'light' ? '#f3f4f6' : 'rgba(255,255,255,0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          title="Close sidebar"
        >
          <FaTimes className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {notes.length === 0 ? (
          <div 
            className="text-center py-8"
            style={{ color: themeColors.text, opacity: 0.6 }}
          >
            <FaStickyNote className="w-12 h-12 mx-auto mb-3" style={{ opacity: 0.3 }} />
            <p className="text-sm">No notes yet. Select text and click "Note" to create one.</p>
          </div>
        ) : (
          notes.map((note) => (
          <div
            key={note.id}
            ref={(el) => {
              if (el) noteRefs.current[note.id] = el;
            }}
            className="p-4 rounded-lg border"
            style={{
              backgroundColor: theme === 'light' ? '#f9fafb' : 'rgba(255, 255, 255, 0.05)',
              borderColor: focusedNoteId === note.id ? '#3b82f6' : themeColors.border,
              borderWidth: focusedNoteId === note.id ? '2px' : '1px',
              transition: 'border-color 0.3s ease-in-out, border-width 0.3s ease-in-out',
            }}
          >
            {/* Quote section */}
            <div className="mb-3">
              <div
                className="text-sm italic p-2 rounded border-l-4"
                style={{
                  color: themeColors.text,
                  opacity: 0.8,
                  borderLeftColor: '#3b82f6',
                  backgroundColor: theme === 'light' ? '#eff6ff' : 'rgba(59, 130, 246, 0.1)',
                }}
              >
                "{note.text}"
              </div>
            </div>

            {/* Textarea for note */}
            <textarea
              value={note.note || ''}
              onChange={(e) => handleNoteChange(note.id, e.target.value)}
              placeholder="Add your note here..."
              className="w-full p-2 rounded text-sm resize-none"
              rows={4}
              style={{
                backgroundColor: themeColors.background,
                color: themeColors.text,
                border: `1px solid ${themeColors.border}`,
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#3b82f6';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = themeColors.border;
              }}
            />

            {/* Delete button */}
            <div className="mt-2 flex justify-end">
              <button
                onClick={() => handleDeleteNote(note.id)}
                className="flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors"
                style={{
                  color: '#ef4444',
                  backgroundColor: 'transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme === 'light' ? '#fee2e2' : 'rgba(239, 68, 68, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <FaTrash className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
          ))
        )}
      </div>

      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
};

export default NoteSidebar;
