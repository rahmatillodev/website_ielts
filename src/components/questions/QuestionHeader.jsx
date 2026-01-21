import React, { useState, useEffect } from 'react'
import { FaArrowLeft, FaExpand, FaBars, FaEdit, FaCompress, FaBell } from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import AppearanceSettingsModal from '@/components/modal/AppearanceSettingsModal'
import { useAppearance } from '@/contexts/AppearanceContext'
import { useAnnotation } from '@/contexts/AnnotationContext'

const QuestionHeader = ({ currentTest, id, timeRemaining, isStarted, hasInteracted, handleStart, onBack, showCorrectAnswers, onToggleShowCorrect, status, onRetake }) => {
  // Try to use appearance context, but don't fail if not available (for backward compatibility)
  let themeColors = { text: '#000000', background: '#ffffff', border: '#e5e7eb' };
  let theme = 'light';
  try {
    const appearance = useAppearance();
    themeColors = appearance.themeColors;
    theme = appearance.theme;
  } catch (e) {
    // Context not available, use defaults
  }

  // Try to use annotation context for sidebar toggle
  let toggleSidebar = null;
  let notes = [];
  let isSidebarOpen = false;
  try {
    const annotation = useAnnotation();
    toggleSidebar = annotation.toggleSidebar;
    notes = annotation.notes;
    isSidebarOpen = annotation.isSidebarOpen;
  } catch (e) {
    console.log('annotation context not available', e);
    // Context not available, sidebar toggle won't work
  }

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error("Fullscreen error:", err);
    }
  };
  useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);
  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined) {
      return "00:00";
    }
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };
  const navigate = useNavigate()

  const handleBackClick = () => {
    if (onBack) {
      onBack();
    }
    navigate("/dashboard");
  };

  return (
    <header 
      className="border-b px-6 py-4 flex items-center justify-between relative"
      style={{ 
        backgroundColor: themeColors.background,
        borderColor: themeColors.border
      }}
    >
      <div className="flex items-center gap-4">
        <button
          onClick={handleBackClick}
          className="flex items-center gap-2 hover:text-primary transition-colors"
          style={{ color: themeColors.text }}
        >
          <FaArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <div className="flex items-center gap-3">
          <span 
            className="text-xl font-semibold"
            style={{ color: themeColors.text }}
          >
            IELTS
          </span>
          <span 
            className="text-sm"
            style={{ color: themeColors.text, opacity: 0.7 }}
          >
            ID: {currentTest?.id.slice(0, 8) || id.slice(0, 8)}...
          </span>
        </div>
        {/* Show Correct Answers Toggle - only in review mode */}
        {status === 'reviewing' && (
          <div className="flex items-center gap-2 ml-4">
            <Label htmlFor="show-correct-answers" className="flex items-center gap-2 cursor-pointer">
              <span 
                className="text-sm font-medium"
                style={{ color: themeColors.text }}
              >
                Show Correct Answers
              </span>
              <Switch
                id="show-correct-answers"
                checked={showCorrectAnswers}
                onCheckedChange={onToggleShowCorrect}
              />
            </Label>
          </div>
        )}
      </div>

      {status !== 'reviewing' && (
        <div className="absolute left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-1">
          <div className="flex items-center gap-2">
            <div 
              className="text-lg font-semibold"
              style={{ color: themeColors.text }}
            >
              {formatTime(timeRemaining)}
            </div>
            <button
              onClick={handleStart}
              disabled={isStarted || hasInteracted}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Start
            </button>
          </div>
          <p 
            className="text-xs text-center"
            style={{ color: themeColors.text, opacity: 0.7 }}
          >
            This test will automatically end when the allotted time expires.
          </p>
        </div>
      )}

      <div className="flex items-center gap-4">

        {status === 'reviewing' && onRetake && (
          <button
            onClick={onRetake}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors font-medium"
          >
            Redo Test
          </button>
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded transition-colors"
            style={{ 
              color: themeColors.text,
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = theme === 'light' ? '#f3f4f6' : 'rgba(255,255,255,0.1)'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? (
              <FaCompress className="w-5 h-5" />
            ) : (
              <FaExpand className="w-5 h-5" />
            )}
          </button>
          <button 
            onClick={() => setIsSettingsModalOpen(true)}
            className="p-2 rounded transition-colors"
            style={{ color: themeColors.text }}
            onMouseEnter={(e) => e.target.style.backgroundColor = theme === 'light' ? '#f3f4f6' : 'rgba(255,255,255,0.1)'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            title="Settings"
          >
            <FaBars className="w-5 h-5" />
          </button>
          <button 
            onClick={() => toggleSidebar && toggleSidebar()}
            className="p-2 rounded transition-colors relative"
            style={{ 
              color: themeColors.text,
              backgroundColor: isSidebarOpen ? (theme === 'light' ? '#f3f4f6' : 'rgba(255,255,255,0.1)') : 'transparent'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = theme === 'light' ? '#f3f4f6' : 'rgba(255,255,255,0.1)'}
            onMouseLeave={(e) => {
              if (!isSidebarOpen) {
                e.target.style.backgroundColor = 'transparent';
              }
            }}
            title={isSidebarOpen ? "Close Notes" : "Open Notes"}
          >
            <FaEdit className="w-5 h-5" />
            {(notes.length > 0 || isSidebarOpen) && (
              <span 
                className="absolute top-0 right-0 w-2 h-2 rounded-full"
                style={{ backgroundColor: '#3b82f6' }}
              />
            )}
          </button>
        </div>
      </div>

      {/* Appearance Settings Modal */}
      <AppearanceSettingsModal 
        isOpen={isSettingsModalOpen} 
        onClose={() => setIsSettingsModalOpen(false)} 
      />
    </header>
  )
}

export default QuestionHeader