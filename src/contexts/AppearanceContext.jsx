import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

const AppearanceContext = createContext(null);

// Theme definitions
const themes = {
  light: {
    text: '#000000',
    background: '#f2f2f2',
    border: '#dce1e5', // gray-300
    backgroundColor: '#f5f5f5',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    border: '#374151', // gray-700
    backgroundColor: '#1a2632',
  },
  'high-contrast': {
    text: '#FFD700',      // ← YANGILANDI: yellow → gold (ko'z uchun yaxshiroq)
    background: '#000000', // ← SAQLAB QOLINDI: qora
    border: '#FFD700',     // ← YANGILANDI: yellow → gold
    backgroundColor: '#000000', // ← YANGILANDI: ko'k-kulrang → qora
  },
};

// Font size definitions (base font sizes in px)
const fontSizes = {
  small: {
    base: 14,
    label: 'Small',
  },
  medium: {
    base: 16,
    label: 'Medium',
  },
  large: {
    base: 20,
    label: 'Large',
  },
};

// localStorage keys
const STORAGE_KEYS = {
  THEME: 'appearance_theme',
  FONT_SIZE: 'appearance_fontSize',
};

export const AppearanceProvider = ({ children }) => {
  // Load initial values from localStorage
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    return saved && themes[saved] ? saved : 'light';
  });

  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.FONT_SIZE);
    return saved && fontSizes[saved] ? saved : 'medium';
  });

  // Persist to localStorage when values change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FONT_SIZE, fontSize);
  }, [fontSize]);

  // Computed values
  const themeColors = useMemo(() => themes[theme], [theme]);
  const fontSizeValue = useMemo(() => fontSizes[fontSize], [fontSize]);

  const value = {
    theme,
    setTheme,
    fontSize,
    setFontSize,
    themeColors,
    fontSizeValue,
    themes,
    fontSizes,
  };

  return (
    <AppearanceContext.Provider value={value}>
      {children}
    </AppearanceContext.Provider>
  );
};

export const useAppearance = () => {
  const context = useContext(AppearanceContext);
  if (!context) {
    throw new Error('useAppearance must be used within an AppearanceProvider');
  }
  return context;
};