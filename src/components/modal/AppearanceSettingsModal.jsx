import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { ChevronRight, ChevronLeft, Check, X } from 'lucide-react';
import { useAppearance } from '@/contexts/AppearanceContext';

const AppearanceSettingsModal = ({ isOpen, onClose }) => {
  // Get appearance context - this should always be available when modal is used in practice pages
  let appearance;
  try {
    appearance = useAppearance();
  } catch (e) {
    console.error('AppearanceSettingsModal: AppearanceContext not available');
    return null; // Don't render if context is not available
  }

  const { theme, setTheme, fontSize, setFontSize, themes, fontSizes, themeColors } = appearance;
  const [currentView, setCurrentView] = useState('main'); // 'main' | 'contrast' | 'textSize'

  // Reset to main view when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentView('main');
    }
  }, [isOpen]);

  const handleMenuClick = (menu) => {
    setCurrentView(menu);
  };

  const handleBack = () => {
    setCurrentView('main');
  };

  const handleThemeSelect = (selectedTheme) => {
    setTheme(selectedTheme);
    // Optionally go back to main or stay on contrast view
    // setCurrentView('main');
  };

  const handleFontSizeSelect = (selectedSize) => {
    setFontSize(selectedSize);
    // Optionally go back to main or stay on textSize view
    // setCurrentView('main');
  };

  const getThemeLabel = (themeKey) => {
    const labels = {
      light: 'Black on white',
      dark: 'White on black',
      'high-contrast': 'Yellow on black',
    };
    return labels[themeKey] || themeKey;
  };

  const getFontSizeLabel = (sizeKey) => {
    const labels = {
      small: 'Regular',
      medium: 'Large',
      large: 'Extra large',
    };
    return labels[sizeKey] || fontSizes[sizeKey]?.label || sizeKey;
  };
  

  // Render main menu view
  const renderMainView = () => (
    <>
      <DialogHeader>
        <DialogTitle 
          className="text-lg font-semibold" 
          style={{ color: themeColors.text }}
        >
          Options
        </DialogTitle>
      </DialogHeader>
      
      <div className="mt-4 space-y-0">
        {/* Contrast Menu Item */}
        <button
          onClick={() => handleMenuClick('contrast')}
          className="w-full flex items-center justify-between px-4 py-3 rounded-t-lg transition-colors border border-b-0"
          style={{
            color: themeColors.text,
            backgroundColor: 'transparent'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme === 'light' ? '#f9fafb' : 'rgba(255,255,255,0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <span className="text-sm font-medium" style={{ color: themeColors.text }}>Contrast</span>
          <ChevronRight
            className="w-4 h-4 transition-transform"
            style={{ color: themeColors.text }}
          />
        </button>

        {/* Text Size Menu Item */}
        <button
          onClick={() => handleMenuClick('textSize')}
          className="w-full flex items-center justify-between px-4 py-3 rounded-b-lg transition-colors border "
          style={{
            color: themeColors.text,
            backgroundColor: 'transparent'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme === 'light' ? '#f9fafb' : 'rgba(255,255,255,0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <span className="text-sm font-medium" style={{ color: themeColors.text }}>Text size</span>
          <ChevronRight
            className="w-4 h-4 transition-transform"
            style={{ color: themeColors.text }}
          />
        </button>
      </div>
    </>
  );

  // Render contrast view
  const renderContrastView = () => (
    <>
      <DialogHeader>
        <div className="flex items-center gap-2">
          <button
            onClick={handleBack}
            className="p-1 rounded transition-colors"
            style={{ color: themeColors.text }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme === 'light' ? '#f9fafb' : 'rgba(255,255,255,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <DialogTitle 
            className="text-lg font-semibold flex-1" 
            style={{ color: themeColors.text }}
          >
            Contrast
          </DialogTitle>
        </div>
      </DialogHeader>
      
      <div className="mt-4 space-y-0 border rounded-lg" style={{ borderColor: themeColors.border }}>
        {Object.keys(themes).map((themeKey, index) => (
          <button
            key={themeKey}
            onClick={() => handleThemeSelect(themeKey)}
            className="w-full flex items-center justify-between px-4 py-3 transition-colors text-left border-b"
            style={{
              color: themeColors.text,
              backgroundColor: 'transparent',
              borderColor: themeColors.border,
              borderBottom: index !== 2 ? `1px solid ${themeColors.border}` : 'none'
              
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme === 'light' ? '#f9fafb' : 'rgba(255,255,255,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <span className="text-sm font-medium" style={{ color: themeColors.text }}>
              {getThemeLabel(themeKey)}
            </span>
            {theme === themeKey && (
              <Check className="w-5 h-5" style={{ color: themeColors.text }} />
            )}
          </button>
        ))}
      </div>
    </>
  );

  // Render text size view
  const renderTextSizeView = () => (
    <>
      <DialogHeader>
        <div className="flex items-center gap-2" style={{ borderColor: themeColors.border }}>
          <button
            onClick={handleBack}
            className="p-1 rounded transition-colors"
            style={{ color: themeColors.text, borderColor: themeColors.border }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme === 'light' ? '#f9fafb' : 'rgba(255,255,255,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <DialogTitle 
            className="text-lg font-semibold flex-1" 
            style={{ color: themeColors.text }}
          >
            Text size
          </DialogTitle>
        </div>
      </DialogHeader>
      
      <div className="mt-4 space-y-0 border rounded-lg" style={{ borderColor: themeColors.border }}>
        {Object.keys(fontSizes).map((sizeKey, index) => (
          <button
            key={sizeKey}
            onClick={() => handleFontSizeSelect(sizeKey)}
            className="w-full flex items-center justify-between px-4 py-3 transition-colors text-left border-b"
            style={{
              color: themeColors.text,
              backgroundColor: 'transparent',
              borderColor: themeColors.border,
              borderBottom: index !== 2 ? `1px solid ${themeColors.border}` : 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme === 'light' ? '#f9fafb' : 'rgba(255,255,255,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <span className="text-sm font-medium" style={{ color: themeColors.text }}>
              {getFontSizeLabel(sizeKey)}
            </span>
            {fontSize === sizeKey && (
              <Check className="w-5 h-5" style={{ color: themeColors.text }} />
            )}
          </button>
        ))}
      </div>
    </>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="sm:max-w-[400px]" 
        showCloseButton={false}
        style={{ 
          backgroundColor: themeColors.background,
          transition: 'background-color 0.3s ease-in-out'
        }}
      >
        {/* Custom Close Button - visible in all themes */}
        <DialogClose
          className="absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none p-1"
          style={{ color: themeColors.text }}
        >
          <X className="w-5 h-5" />
          <span className="sr-only">Close</span>
        </DialogClose>

        {currentView === 'main' && renderMainView()}
        {currentView === 'contrast' && renderContrastView()}
        {currentView === 'textSize' && renderTextSizeView()}
      </DialogContent>
    </Dialog>
  );
};

export default AppearanceSettingsModal;

