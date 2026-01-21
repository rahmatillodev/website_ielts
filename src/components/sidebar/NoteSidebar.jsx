import React, { useEffect, useRef } from 'react';
import { FaTrash, FaStickyNote } from 'react-icons/fa';
import { X } from "lucide-react";
import { useAnnotation } from '@/contexts/AnnotationContext';
import { useAppearance } from '@/contexts/AppearanceContext';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

const NoteSidebar = () => {
  const { notes, updateNote, deleteNote, isSidebarOpen, closeSidebar, focusedNoteId } = useAnnotation();
  const { themeColors, theme } = useAppearance();
  const noteRefs = useRef({});

  // Scroll to focused note when sidebar opens
  useEffect(() => {
    if (isSidebarOpen && focusedNoteId && noteRefs.current[focusedNoteId]) {
      const noteElement = noteRefs.current[focusedNoteId];
      noteElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isSidebarOpen, focusedNoteId]);

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
    <Sheet open={isSidebarOpen} onOpenChange={open => !open && closeSidebar()}>
      <SheetContent
        side="right"
        className="w-[400px] px-0 pt-0 h-full"
        style={{
          backgroundColor: themeColors.background,
          borderLeft: `1px solid ${themeColors.border}`,
          boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.1)'
        }}
      >
        {/* Header */}
        <SheetHeader className="sticky top-0 z-10 bg-opacity-95 px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: themeColors.border, background: themeColors.background }}>
          <div className="flex items-center gap-2">
            <FaStickyNote style={{ color: themeColors.text }} />
            <SheetTitle asChild>
              <h2
                className="text-lg font-semibold"
                style={{ color: themeColors.text }}
              >
                Notes ({notes.length})
              </h2>
            </SheetTitle>
          </div>
          <SheetClose asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded transition-colors absolute top-4 right-4"
              style={{ color: themeColors.text, background: "transparent" }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = theme === 'light' ? '#f3f4f6' : 'rgba(255,255,255,0.1)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
              title="Close sidebar"
            >
              <X className="w-4 h-4" />
            </Button>
          </SheetClose>
        </SheetHeader>

        <div className="p-6 pt-2 space-y-4 h-full overflow-y-auto">
          {notes.length === 0 ? (
            <div 
              className="text-center py-8"
              style={{ color: themeColors.text, opacity: 0.6 }}
            >
              <FaStickyNote className="w-12 h-12 mx-auto mb-3" style={{ opacity: 0.3 }} />
              <p className="text-sm">No notes yet. Select text and click &quot;Note&quot; to create one.</p>
            </div>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                ref={(el) => {
                  if (el) noteRefs.current[note.id] = el;
                }}
                className={
                  "p-4 rounded-lg border shadow-sm transition-all duration-200" +
                  (focusedNoteId === note.id
                    ? " border-blue-500 ring-2 ring-blue-100"
                    : "")
                }
                style={{
                  backgroundColor: theme === 'light'
                    ? '#f9fafb'
                    : 'rgba(255, 255, 255, 0.05)',
                  borderColor: focusedNoteId === note.id
                    ? '#3b82f6'
                    : themeColors.border,
                  borderWidth: focusedNoteId === note.id ? '2px' : '1px'
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
                      backgroundColor: theme === 'light'
                        ? '#eff6ff'
                        : 'rgba(59, 130, 246, 0.1)'
                    }}
                  >
                    &quot;{note.text}&quot;
                  </div>
                </div>

                {/* Textarea for note */}
                <textarea
                  value={note.note || ''}
                  onChange={(e) => handleNoteChange(note.id, e.target.value)}
                  placeholder="Add your note here..."
                  className="w-full p-2 rounded text-sm resize-none border transition-all focus:ring-1 focus:ring-blue-200"
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
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="flex items-center gap-2 text-red-600 font-medium px-3 py-1.5 rounded hover:bg-red-50"
                    style={{
                      backgroundColor: 'transparent'
                    }}
                    onClick={() => handleDeleteNote(note.id)}
                    onMouseEnter={e => {
                      e.currentTarget.style.backgroundColor = theme === 'light'
                        ? '#fee2e2'
                        : 'rgba(239, 68, 68, 0.1)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <FaTrash className="w-4 h-4" />
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default NoteSidebar;
