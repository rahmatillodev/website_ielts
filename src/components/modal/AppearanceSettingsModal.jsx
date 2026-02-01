import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { ChevronRight, ChevronLeft, Check, X } from 'lucide-react';
import { useAppearance } from '@/contexts/AppearanceContext';

const AppearanceSettingsModal = ({ isOpen, onClose }) => {
  // Get appearance context
  let appearance;
  try {
    appearance = useAppearance();
  } catch (e) {
    console.error('AppearanceSettingsModal: AppearanceContext not available');
    return null;
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
  };

  const handleFontSizeSelect = (selectedSize) => {
    setFontSize(selectedSize);
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

  // Helper function to get hover background color based on current theme
  const getHoverBackground = () => {
    if (theme === 'light') return '#f3f4f6'; // gray-100
    if (theme === 'dark') return 'rgba(255,255,255,0.1)';
    return 'rgba(255, 215, 0, 0.1)'; // yellow overlay for high-contrast
  };

  // Helper function to get active background color based on current theme
  const getActiveBackground = () => {
    if (theme === 'light') return '#e5e7eb'; // gray-200
    if (theme === 'dark') return 'rgba(255,255,255,0.15)';
    return 'rgba(255, 215, 0, 0.15)'; // yellow overlay for high-contrast
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
          className="w-full flex items-center justify-between px-4 py-3 transition-colors"
          style={{
            color: themeColors.text,
            backgroundColor: 'transparent',
            border: `1px solid ${themeColors.border}`,
            borderBottom: 'none',
            borderTopLeftRadius: '0.5rem',
            borderTopRightRadius: '0.5rem',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = getHoverBackground();
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <span className="text-sm font-medium">Contrast</span>
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Text Size Menu Item */}
        <button
          onClick={() => handleMenuClick('textSize')}
          className="w-full flex items-center justify-between px-4 py-3 transition-colors"
          style={{
            color: themeColors.text,
            backgroundColor: 'transparent',
            border: `1px solid ${themeColors.border}`,
            borderBottomLeftRadius: '0.5rem',
            borderBottomRightRadius: '0.5rem',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = getHoverBackground();
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <span className="text-sm font-medium">Text size</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </>
  );

  // Render contrast view
  const renderContrastView = () => {
    const themeKeys = Object.keys(themes);
    return (
      <>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBack}
              className="p-1 rounded transition-colors"
              style={{ color: themeColors.text }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = getHoverBackground();
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
        
        <div 
          className="mt-4 space-y-0 rounded-lg" 
          style={{ border: `1px solid ${themeColors.border}` }}
        >
          {themeKeys.map((themeKey, index) => {
            const isActive = theme === themeKey;
            const isFirst = index === 0;
            const isLast = index === themeKeys.length - 1;
            
            return (
              <button
                key={themeKey}
                onClick={() => handleThemeSelect(themeKey)}
                className="w-full flex items-center justify-between px-4 py-3 transition-colors text-left"
                style={{
                  color: themeColors.text,
                  backgroundColor: isActive ? getActiveBackground() : 'transparent',
                  borderBottom: !isLast ? `1px solid ${themeColors.border}` : 'none',
                  borderTopLeftRadius: isFirst ? '0.5rem' : '0',
                  borderTopRightRadius: isFirst ? '0.5rem' : '0',
                  borderBottomLeftRadius: isLast ? '0.5rem' : '0',
                  borderBottomRightRadius: isLast ? '0.5rem' : '0',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = getHoverBackground();
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = isActive ? getActiveBackground() : 'transparent';
                }}
              >
                <span className="text-sm font-medium">
                  {getThemeLabel(themeKey)}
                </span>
                {isActive && (
                  <Check className="w-5 h-5" style={{ color: themeColors.text }} />
                )}
              </button>
            );
          })}
        </div>
      </>
    );
  };

  // Render text size view
  const renderTextSizeView = () => {
    const fontSizeKeys = Object.keys(fontSizes);
    return (
      <>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBack}
              className="p-1 rounded transition-colors"
              style={{ color: themeColors.text }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = getHoverBackground();
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
        
        <div 
          className="mt-4 space-y-0 rounded-lg" 
          style={{ border: `1px solid ${themeColors.border}` }}
        >
          {fontSizeKeys.map((sizeKey, index) => {
            const isActive = fontSize === sizeKey;
            const isFirst = index === 0;
            const isLast = index === fontSizeKeys.length - 1;
            
            return (
              <button
                key={sizeKey}
                onClick={() => handleFontSizeSelect(sizeKey)}
                className="w-full flex items-center justify-between px-4 py-3 transition-colors text-left"
                style={{
                  color: themeColors.text,
                  backgroundColor: isActive ? getActiveBackground() : 'transparent',
                  borderBottom: !isLast ? `1px solid ${themeColors.border}` : 'none',
                  borderTopLeftRadius: isFirst ? '0.5rem' : '0',
                  borderTopRightRadius: isFirst ? '0.5rem' : '0',
                  borderBottomLeftRadius: isLast ? '0.5rem' : '0',
                  borderBottomRightRadius: isLast ? '0.5rem' : '0',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = getHoverBackground();
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = isActive ? getActiveBackground() : 'transparent';
                }}
              >
                <span className="text-sm font-medium">
                  {getFontSizeLabel(sizeKey)}
                </span>
                {isActive && (
                  <Check className="w-5 h-5" style={{ color: themeColors.text }} />
                )}
              </button>
            );
          })}
        </div>
      </>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="sm:max-w-[400px]" 
        showCloseButton={false}
        style={{ 
          backgroundColor: themeColors.background,
          border: `1px solid ${themeColors.border}`,
          transition: 'background-color 0.2s ease-in-out, border-color 0.2s ease-in-out'
        }}
      >
        {/* Custom Close Button */}
        <DialogClose
          className="absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:outline-hidden disabled:pointer-events-none p-1"
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