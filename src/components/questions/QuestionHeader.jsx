import React, { useState, useEffect } from 'react'
import { FaArrowLeft, FaExpand, FaBars, FaEdit, FaCompress, FaBell } from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

const QuestionHeader = ({ currentTest, id, timeRemaining, isStarted, hasInteracted, handleStart, onBack, showCorrectAnswers, onToggleShowCorrect, status, onRetake }) => {
    const [isFullscreen, setIsFullscreen] = useState(false);

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
      navigate("/reading");
    };
    
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
    <div className="flex items-center gap-4">
      <button
        onClick={handleBackClick}
        className="flex items-center gap-2 text-gray-900 hover:text-primary transition-colors"
      >
        <FaArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>
      <div className="flex items-center gap-3">
        <span className="text-xl font-bold text-gray-900">IELTS</span>
        <span className="text-sm text-gray-600">ID: {currentTest?.id || id}</span>
      </div>
      {/* Show Correct Answers Toggle - only in review mode */}
      {status === 'reviewing' && (
        <div className="flex items-center gap-2 ml-4">
          <Label htmlFor="show-correct-answers" className="flex items-center gap-2 cursor-pointer">
            <span className="text-sm font-medium text-gray-700">Show Correct Answers</span>
            <Switch
              id="show-correct-answers"
              checked={showCorrectAnswers}
              onCheckedChange={onToggleShowCorrect}
            />
          </Label>
        </div>
      )}
    </div>

    <div className="flex items-center gap-4">
      {status !== 'reviewing' && (
        <>
          <div className="text-lg font-semibold text-gray-900">
            {formatTime(timeRemaining)}
          </div>
          <button
            onClick={handleStart}
            disabled={isStarted || hasInteracted}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            Start
          </button>
        </>
      )}
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
          className="p-2 text-gray-700 hover:bg-gray-100 rounded transition-colors"
          title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          {isFullscreen ? (
            <FaCompress className="w-5 h-5" />
          ) : (
            <FaExpand className="w-5 h-5" />
          )}
        </button>
        <button className="p-2 text-gray-700 hover:bg-gray-100 rounded transition-colors">
          <FaBell className="w-5 h-5" />
        </button>
        <button className="p-2 text-gray-700 hover:bg-gray-100 rounded transition-colors">
          <FaBars className="w-5 h-5" />
        </button>
        <button className="p-2 text-gray-700 hover:bg-gray-100 rounded transition-colors">
          <FaEdit className="w-5 h-5" />
        </button>
      </div>
    </div>
  </header>
  )
}

export default QuestionHeader