import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

const AppearanceContext = createContext(null);

// Theme definitions
const themes = {
  light: {
    text: '#000000',
    background: '#ffffff',
    border: '#e5e7eb', // gray-200
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    border: '#374151', // gray-700
  },
  'high-contrast': {
    text: '#ffff00', // yellow
    background: '#000000',
    border: '#ffff00',
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

