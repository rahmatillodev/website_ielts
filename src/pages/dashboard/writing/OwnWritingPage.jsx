import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom';
import {
  FaArrowLeft,
  FaExpand,
  FaCompress,
  FaDownload,
  FaFileAlt,
  FaBars
} from "react-icons/fa";
import { LuChevronsLeftRight } from "react-icons/lu";
import { PenSquare, X } from "lucide-react";
import { generateWritingPDF } from '@/utils/exportOwnWritingPdf';
import { AppearanceProvider, useAppearance } from '@/contexts/AppearanceContext';
import AppearanceSettingsModal from '@/components/modal/AppearanceSettingsModal';
import { toast } from "react-toastify";

const OwnWritingPageContent = () => {
  const navigate = useNavigate();
  const { theme, themeColors, fontSizeValue } = useAppearance();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [activeTask, setActiveTask] = useState("task1"); // "task1" | "task2"
  const [draggedImage, setDraggedImage] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [tasks, setTasks] = useState({
    task1: {
      question: "",
      answer: ""
    },
    task2: {
      question: "",
      answer: ""
    }
  });
  const currentTask = tasks[activeTask];
  const [isRunning, setIsRunning] = useState(false);
  const [leftWidth, setLeftWidth] = useState(50);
  const containerRef = useRef(null);
  const isResizing = useRef(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Calculate font size in rem (base 16px = 1rem)
  const baseFontSize = fontSizeValue.base / 16; // Convert px to rem

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };


  const handleAnswerFocus = () => {
    if (!isRunning && !isSubmitted) {
      setIsRunning(true);
    }
  };

  const startResize = () => {
    isResizing.current = true;
  };

  const stopResize = () => {
    isResizing.current = false;
  };

  const wordCount = currentTask.answer
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  const minWords = activeTask === "task1" ? 150 : 250;
  const isEnoughWords = wordCount >= minWords;

  // Check if at least one task has both question and answer filled
  const task1Complete = tasks.task1.question.trim().length > 0 && tasks.task1.answer.trim().length > 0;
  const task2Complete = tasks.task2.question.trim().length > 0 && tasks.task2.answer.trim().length > 0;
  const hasAtLeastOneTaskFilled = task1Complete || task2Complete;

  const handleResize = (e) => {
    if (!isResizing.current || !containerRef.current) return;
    const containerWidth = containerRef.current.offsetWidth;
    const newLeftWidth = (e.clientX / containerWidth) * 100;
    if (newLeftWidth > 20 && newLeftWidth < 80) {
      setLeftWidth(newLeftWidth);
    }
  };

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

  const handleDropImage = (e) => {
    if (isSubmitted) return;
    e.preventDefault();
    if (activeTask !== "task1") return; // только для task1

    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = () => {
      setDraggedImage(reader.result); // base64 для превью
      setTasks(prev => ({
        ...prev,
        task1: {
          ...prev.task1,
          image: reader.result
        }
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e) => e.preventDefault();

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);


  useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleResize);
    window.addEventListener("mouseup", stopResize);
    return () => {
      window.removeEventListener("mousemove", handleResize);
      window.removeEventListener("mouseup", stopResize);
    };
  }, []);

  // Add dynamic styles for placeholder
  useEffect(() => {
    const styleId = 'own-writing-placeholder-styles';
    let styleElement = document.getElementById(styleId);
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }

    // Calculate placeholder color based on theme
    const placeholderColor = theme === 'light' 
      ? 'rgba(0, 0, 0, 0.4)' 
      : theme === 'dark'
      ? 'rgba(255, 255, 255, 0.4)'
      : 'rgba(255, 255, 0, 0.5)'; // high-contrast

    styleElement.textContent = `
      .own-writing-textarea::placeholder {
        color: ${placeholderColor} !important;
        opacity: 1 !important;
      }
    `;

    return () => {
      // Cleanup on unmount
      const element = document.getElementById(styleId);
      if (element) {
        element.remove();
      }
    };
  }, [theme]);

  const toggleTimer = () => {
    setIsRunning((prev) => !prev);
  };


  return (
    <div 
      className="flex flex-col h-screen"
      style={{ 
        backgroundColor: themeColors.backgroundColor,
        color: themeColors.text,
        fontSize: `${baseFontSize}rem`,
        transition: 'font-size 0.3s ease-in-out, background-color 0.3s ease-in-out, color 0.3s ease-in-out'
      }}
    >
      <header 
        className="border-b px-6 py-4 flex items-center justify-between relative"
        style={{ 
          backgroundColor: themeColors.background,
          borderColor: themeColors.border
        }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/writing")}
            className="flex items-center gap-2 hover:text-primary transition-colors cursor-pointer bg-gray-200 p-1 rounded-sm px-4"
            style={{ 
              color: theme === 'dark' ? '#000000' : themeColors.text 
            }}
          >
            <FaArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <div className="flex items-center gap-3">
            <span 
              className="text-xl font-bold"
              style={{ color: themeColors.text }}
            >
              IELTS | Writing
            </span>
          </div>
        </div>

        <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-4">
          <div 
            className="text-lg font-semibold"
            style={{ color: themeColors.text }}
          >
            {formatTime(elapsedTime)}
          </div>

          <button
            onClick={toggleTimer}
            disabled={isSubmitted}
            className="px-4 py-2 bg-[#4A90E2] text-white rounded hover:bg-[#4a6de2] transition-colors"
          >
            {isRunning ? "Pause" : "Start"}
          </button>
        </div>

        {/* Правая часть - PDF, Fullscreen и Settings */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded transition-colors"
            style={{ color: themeColors.text }}
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
            className="flex items-center gap-2 cursor-pointer px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors font-medium"
            onClick={() => {
              setIsRunning(false);
              generateWritingPDF(tasks, formatTime(elapsedTime));
            }}
          >
            <FaDownload className="w-4 h-4" />
            <span>save as PDF</span>
          </button>
        </div>

        {/* Appearance Settings Modal */}
        <AppearanceSettingsModal 
          isOpen={isSettingsModalOpen} 
          onClose={() => setIsSettingsModalOpen(false)} 
        />
      </header>

      <div className="flex flex-1 overflow-hidden p-3 gap-3" ref={containerRef}>
        {/* Left Panel */}
        <div
          className="border border-t border-b rounded-2xl overflow-y-auto transition-opacity duration-300 ease-in-out"
          style={{ 
            width: `${leftWidth}%`,
            backgroundColor: themeColors.background,
            borderColor: themeColors.border,
            transition: 'background-color 0.3s ease-in-out, border-color 0.3s ease-in-out'
          }}
        >
          <div className="p-6 space-y-4">
            {/* Первый элемент - Информационный блок */}
            <div 
              className="mx-2 px-4 py-4 border rounded-lg"
              style={{
                backgroundColor: theme === 'light' ? '#e5e7eb' : 'rgba(255,255,255,0.1)',
                borderColor: themeColors.border
              }}
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <PenSquare 
                    className="w-5 h-5 shrink-0" 
                    style={{ color: themeColors.text }}
                  />
                  <span 
                    className="text-base font-bold"
                    style={{ color: themeColors.text }}
                  >
                    IELTS Writing Practice - {activeTask === "task1" ? "Task 1" : "Task 2"}
                  </span>
                </div>
                <span 
                  className="text-sm"
                  style={{ color: themeColors.text, opacity: 0.7 }}
                >
                  Create your own writing task and practice at your own pace
                </span>
              </div>
            </div>

            {/* Второй элемент - Форма с input'ами */}
            <div 
              className="mx-2 px-4 py-4 border-2 rounded-lg transition-colors"
              style={{ borderColor: themeColors.border }}
            >
              <div className="space-y-4 overflow-y-auto">
                {/* Textarea для письма */}
                <textarea
                  value={currentTask.question}
                  disabled={isSubmitted}
                  onChange={(e) =>
                    setTasks(prev => ({
                      ...prev,
                      [activeTask]: {
                        ...prev[activeTask],
                        question: e.target.value
                      }
                    }))
                  }
                  placeholder={
                    activeTask === "task1"
                      ? `Type your writing task question here... 
                      
Tip: You can drag & drop image`
                      : "Type your writing task question here..."
                  }
                  className="w-full min-h-[200px] bg-transparent resize-none focus:outline-none own-writing-textarea"
                  style={{ 
                    color: themeColors.text,
                    transition: 'color 0.3s ease-in-out, border-color 0.3s ease-in-out'
                  }}
                  onFocus={(e) => {
                    e.target.parentElement.parentElement.style.borderColor = '#4A90E2';
                  }}
                  onBlur={(e) => {
                    e.target.parentElement.parentElement.style.borderColor = themeColors.border;
                  }}
                  onDrop={handleDropImage}
                  onDragOver={handleDragOver}
                />

              </div>
            </div>
            {/* Превью изображения под textarea */}
            {activeTask === "task1" && draggedImage && (
              <div 
                className="mt-3 relative p-2 border rounded-lg flex justify-center"
                style={{
                  borderColor: themeColors.border,
                  backgroundColor: theme === 'light' ? '#f9fafb' : 'rgba(255,255,255,0.05)'
                }}
              >
                {/* Кнопка закрытия */}
                <button
                  disabled={isSubmitted}
                  onClick={() => {
                    setDraggedImage(null);
                    setTasks(prev => ({
                      ...prev,
                      task1: {
                        ...prev.task1,
                        image: null
                      }
                    }));
                  }}
                  className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  title="Remove image"
                >
                  <X size={15} />
                </button>

                <img src={draggedImage} alt="Dropped" className="max-h-48 object-contain" />
              </div>
            )}

          </div>
        </div>

        {/* Resizable Divider */}

        <div>
          <div
            onMouseDown={startResize}
            className="w-0.5 cursor-col-resize h-full flex justify-center items-center relative"
            style={{ backgroundColor: themeColors.border }}
            title="Drag to resize"
          >
            <div 
              className="w-6 h-6 rounded-2xl flex items-center justify-center absolute border-2"
              style={{ 
                backgroundColor: themeColors.background,
                borderColor: themeColors.border
              }}
            >
              <LuChevronsLeftRight style={{ color: themeColors.text }} />
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div
          className="space-y-1 overflow-y-auto p-6 border rounded-2xl"
          style={{ 
            width: `${100 - leftWidth}%`,
            backgroundColor: themeColors.background,
            borderColor: themeColors.border,
            transition: 'background-color 0.3s ease-in-out, border-color 0.3s ease-in-out'
          }}
        >
          <textarea
            disabled={isSubmitted}
            value={currentTask.answer}
            onChange={(e) => {
              setTasks(prev => ({
                ...prev,
                [activeTask]: {
                  ...prev[activeTask],
                  answer: e.target.value
                }
              }));
              handleAnswerFocus();
            }}
            placeholder="Write your answer here..."
            className="w-full min-h-[320px] p-4 bg-transparent border-2 rounded-xl resize-none focus:outline-none own-writing-textarea"
            style={{ 
              color: themeColors.text,
              borderColor: themeColors.border,
              transition: 'color 0.3s ease-in-out, border-color 0.3s ease-in-out'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#4A90E2';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = themeColors.border;
            }}
          />

          <div className="flex items-center justify-between mt-3 text-sm">
            {/* Words counter */}
            <div 
              className="flex items-center gap-2"
              style={{ color: themeColors.text, opacity: 0.7 }}
            >
              <FaFileAlt className="w-4 h-4" />
              <span>Words: {wordCount}</span>
            </div>

            {/* Minimum words */}
            <div
              className={`font-medium ${isEnoughWords ? "text-green-600" : "text-red-600"
                }`}
            >
              Minimum: {minWords} words
            </div>
          </div>
        </div>
      </div>

      <footer 
        className="w-full border-t"
        style={{
          backgroundColor: theme === 'light' ? '#f3f4f6' : 'rgba(255,255,255,0.1)',
          borderColor: themeColors.border,
          transition: 'background-color 0.3s ease-in-out, border-color 0.3s ease-in-out'
        }}
      >
        <div className="flex items-stretch justify-between w-full max-w-full px-3">
          {/* Переключатели в стиле Part */}
          <div className="flex flex-1">
            {["task1", "task2"].map((task) => {
              const isActive = activeTask === task;
              return (
                <button
                  key={task}
                  onClick={() => setActiveTask(task)}
                  className="flex-1 flex justify-center items-center font-semibold text-sm transition-colors duration-200"
                  style={{
                    backgroundColor: isActive 
                      ? (theme === 'light' ? '#e5e7eb' : 'rgba(255,255,255,0.2)')
                      : 'transparent',
                    color: themeColors.text
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = theme === 'light' ? '#d1d5db' : 'rgba(255,255,255,0.15)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {task === "task1" ? "Task 1" : "Task 2"}
                </button>
              );
            })}
          </div>

          {/* Submit с отступом слева */}
          <button
            onClick={() => {
              if (!hasAtLeastOneTaskFilled) {
                toast.error("Please fill both question and answer in at least one task before submitting");
                return;
              }
              if (isSubmitted) {
                return;
              }
              setIsRunning(false); // Stop timer on submit
              setIsSubmitted(true);
            }}
            disabled={isSubmitted}
            className="ml-3 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-default"
          >
            {isSubmitted ? "Submitted" : "Submit"}
          </button>
        </div>
      </footer>
    </div>
  )
}

const OwnWritingPage = () => {
  return (
    <AppearanceProvider>
      <OwnWritingPageContent />
    </AppearanceProvider>
  );
};

export default OwnWritingPage