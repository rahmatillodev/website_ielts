import React, { createContext, useContext, useState, useCallback } from 'react';
import { removeHighlight as removeHighlightFromDOM } from '@/utils/annotationRenderer';

const AnnotationContext = createContext(null);

// Generate unique ID
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const AnnotationProvider = ({ children }) => {
  const [highlights, setHighlights] = useState([]);
  const [notes, setNotes] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [focusedNoteId, setFocusedNoteId] = useState(null);

  // Highlight functions
  const addHighlight = useCallback((highlightData) => {
    const newHighlight = {
      id: generateId(),
      text: highlightData.text,
      startOffset: highlightData.startOffset,
      endOffset: highlightData.endOffset,
      containerId: highlightData.containerId,
      partId: highlightData.partId,
      sectionType: highlightData.sectionType || 'passage', // 'passage' or 'questions'
      testType: highlightData.testType || 'reading', // 'reading' or 'listening'
      range: highlightData.range, // Store range for re-rendering
    };
    setHighlights((prev) => [...prev, newHighlight]);
    return newHighlight.id;
  }, []);

  const removeHighlight = useCallback((highlightId) => {
    // Remove from DOM first
    removeHighlightFromDOM(highlightId);
    // Then remove from state
    setHighlights((prev) => prev.filter((h) => h.id !== highlightId));
  }, []);

  // Note functions
  const addNote = useCallback((noteData) => {
    const newNote = {
      id: generateId(),
      text: noteData.text,
      note: noteData.note || '',
      startOffset: noteData.startOffset,
      endOffset: noteData.endOffset,
      containerId: noteData.containerId,
      partId: noteData.partId,
      sectionType: noteData.sectionType || 'passage', // 'passage' or 'questions'
      testType: noteData.testType || 'reading', // 'reading' or 'listening'
      range: noteData.range, // Store range for re-rendering
    };
    setNotes((prev) => [...prev, newNote]);
    setIsSidebarOpen(true); // Open sidebar when note is added
    return newNote.id;
  }, []);

  const updateNote = useCallback((noteId, updates) => {
    setNotes((prev) =>
      prev.map((note) => (note.id === noteId ? { ...note, ...updates } : note))
    );
  }, []);

  const deleteNote = useCallback((noteId) => {
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
  }, []);

  const clearAll = useCallback(() => {
    setHighlights([]);
    setNotes([]);
  }, []);

  // Get highlights/notes for a specific part
  const getHighlightsForPart = useCallback(
    (partId) => highlights.filter((h) => h.partId === partId),
    [highlights]
  );

  const getNotesForPart = useCallback(
    (partId) => notes.filter((n) => n.partId === partId),
    [notes]
  );

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  const openSidebar = useCallback(() => {
    setIsSidebarOpen(true);
  }, []);

  const closeSidebar = useCallback(() => {
    setIsSidebarOpen(false);
    setFocusedNoteId(null);
  }, []);

  const openNoteSidebar = useCallback((noteId) => {
    setFocusedNoteId(noteId);
    setIsSidebarOpen(true);
  }, []);

  const value = {
    highlights,
    notes,
    addHighlight,
    removeHighlight,
    addNote,
    updateNote,
    deleteNote,
    clearAll,
    getHighlightsForPart,
    getNotesForPart,
    isSidebarOpen,
    toggleSidebar,
    openSidebar,
    closeSidebar,
    openNoteSidebar,
    focusedNoteId,
  };

  return (
    <AnnotationContext.Provider value={value}>
      {children}
    </AnnotationContext.Provider>
  );
};

export const useAnnotation = () => {
  const context = useContext(AnnotationContext);
  if (!context) {
    throw new Error('useAnnotation must be used within an AnnotationProvider');
  }
  return context;
};

