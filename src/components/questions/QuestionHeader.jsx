import React, { useState, useEffect } from 'react'
import { FaArrowLeft, FaExpand, FaBars, FaEdit, FaCompress } from 'react-icons/fa'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import AppearanceSettingsModal from '@/components/modal/AppearanceSettingsModal'
import ConfirmModal from '@/components/modal/ConfirmModal'
import { useAppearance } from '@/contexts/AppearanceContext'
import { useAnnotation } from '@/contexts/AnnotationContext'

const QuestionHeader = ({ currentTest, id, timeRemaining, isStarted, hasInteracted, isPaused, handleStart, handlePause, onBack, showCorrectAnswers, onToggleShowCorrect, status, type, showTryPractice }) => {
  // Immediately check URL for review mode to prevent flickering
  const [searchParams] = useSearchParams();
  const isReviewMode = searchParams.get('mode') === 'review' || status === 'reviewing';
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
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

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
    setIsConfirmModalOpen(true);
  };

  const handleConfirmExit = () => {
    setIsConfirmModalOpen(false);
    if (onBack) {
      onBack();
    }
      if (type == "Reading") {
        navigate("/reading");
      } else if (type == "Writing") {
        navigate("/writing");
      } else {
        navigate("/listening");
      }
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
          className="flex items-center gap-2 hover:text-primary transition-colors bg-gray-200 p-1 rounded-sm px-4"
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
            IELTS | {type}
          </span>
          <span 
            className="text-sm"
            style={{ color: themeColors.text, opacity: 0.7 }}
          >
            {/* ID: {currentTest?.id.slice(0, 8) || id.slice(0, 8)}... */}
          </span>
        </div>
        {/* Show Correct Answers Toggle - only in review mode */}
        {isReviewMode && (
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

      {!isReviewMode && (
        <div className="absolute left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-1">
          {showTryPractice && !isStarted ? (
            // Show "Try practice" button when not in practice mode
            <button
              onClick={handleStart}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Try Practice
            </button>
          ) : isStarted && timeRemaining !== null && timeRemaining !== undefined ? (
            // Show timer and pause/resume when in practice mode
            <>
              <div className="flex items-center gap-2">
                <div 
                  className="text-lg font-semibold"
                  style={{ color: themeColors.text }}
                >
                  {formatTime(timeRemaining)}
                </div>
                <button
                  onClick={handlePause}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium"
                >
                  {isPaused ? "Resume" : "Pause"}
                </button>
              </div>
              <p 
                className="text-xs text-center"
                style={{ color: themeColors.text, opacity: 0.7 }}
              >
                This test will automatically end when the allotted time expires.
              </p>
            </>
          ) : null}
        </div>
      )}

      <div className="flex items-center gap-4">
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

      {/* Confirm Exit Modal */}
      <ConfirmModal 
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmExit}
        title="Exit Test"
        description="Are you sure you want to exit? Your progress may be lost."
      />
    </header>
  )
}

export default QuestionHeader