import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom';
import {
  FaArrowLeft,
  FaExpand,
  FaCompress,
  FaDownload,
  FaFileAlt
} from "react-icons/fa";
import { LuChevronsLeftRight } from "react-icons/lu";
import { PenSquare, X } from "lucide-react";
import { generateWritingPDF } from '@/utils/exportOwnWritingPdf';

const OwnWritingPage = () => {
  const navigate = useNavigate();
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

  const toggleTimer = () => {
    setIsRunning((prev) => !prev);
  };


  return (
    <div className="flex flex-col h-screen bg-background-light dark:bg-background-dark">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between relative">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/writing")}
            className="flex items-center gap-2 text-gray-900 dark:text-white hover:text-primary transition-colors cursor-pointer"
          >
            <FaArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              IELTS | Writing
            </span>
          </div>
        </div>

        <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-4">
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
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

        {/* Правая часть - PDF и Fullscreen */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleFullscreen}
            className="p-2 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors cursor-pointer"
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? (
              <FaCompress className="w-5 h-5" />
            ) : (
              <FaExpand className="w-5 h-5" />
            )}
          </button>
          <button className="flex items-center gap-2 cursor-pointer px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 transition-colors font-medium"
            onClick={() => {
              setIsRunning(false);
              generateWritingPDF(tasks, formatTime(elapsedTime));
            }}>
            <FaDownload className="w-4 h-4" />
            <span>save as PDF</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden p-3 gap-3" ref={containerRef}>
        {/* Left Panel */}
        <div
          className="border border-t border-b rounded-2xl border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto transition-opacity duration-300 ease-in-out"
          style={{ width: `${leftWidth}%` }}
        >
          <div className="p-6 space-y-4">
            {/* Первый элемент - Информационный блок */}
            <div className="mx-2 px-4 py-4 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <PenSquare className="w-5 h-5 text-gray-700 dark:text-gray-300 shrink-0" />
                  <span className="text-base font-bold text-gray-900 dark:text-white">
                    IELTS Writing Practice - {activeTask === "task1" ? "Task 1" : "Task 2"}
                  </span>
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Create your own writing task and practice at your own pace
                </span>
              </div>
            </div>

            {/* Второй элемент - Форма с input'ами */}
            <div className="mx-2 px-4 py-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus-within:border-blue-500 dark:focus-within:border-blue-500 transition-colors">
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
                  className="w-full min-h-[200px] bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-none focus:outline-none"
                  onDrop={handleDropImage}
                  onDragOver={handleDragOver}
                />

              </div>
            </div>
            {/* Превью изображения под textarea */}
            {activeTask === "task1" && draggedImage && (
              <div className="mt-3 relative p-2 border border-gray-300 dark:border-gray-600 rounded-lg flex justify-center bg-gray-50 dark:bg-gray-800">
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
            className="w-0.5 cursor-col-resize bg-gray-600 dark:bg-gray-600 h-full flex justify-center items-center relative"
            title="Drag to resize"
          >
            <div className="w-6 h-6 rounded-2xl bg-white flex items-center justify-center absolute border-2">
              <LuChevronsLeftRight />
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div
          className="space-y-1 overflow-y-auto p-6 border rounded-2xl border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
          style={{ width: `${100 - leftWidth}%` }}
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
            className="
            w-full min-h-[320px] p-4
            bg-transparent
            text-gray-900 dark:text-white
            placeholder-gray-400 dark:placeholder-gray-500
            border-2 border-gray-300 dark:border-gray-600
            rounded-xl
            resize-none
            focus:outline-none
            focus:border-blue-500"
          />

          <div className="flex items-center justify-between mt-3 text-sm">
            {/* Words counter */}
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
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

      <footer className="w-full bg-gray-100 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-stretch justify-between w-full max-w-full px-3">
          {/* Переключатели в стиле Part */}
          <div className="flex flex-1">
            {["task1", "task2"].map((task) => {
              const isActive = activeTask === task;
              return (
                <button
                  key={task}
                  onClick={() => setActiveTask(task)}
                  className={`
                    flex-1 flex justify-center items-center font-semibold text-sm transition-colors duration-200
                    ${isActive
                      ? "bg-gray-100 text-gray-900"
                      : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600"
                    }
                  `}
                >
                  {task === "task1" ? "Task 1" : "Task 2"}
                </button>
              );
            })}
          </div>

          {/* Submit с отступом слева */}
          <button
            onClick={() => setIsSubmitted(true)}
            disabled={isSubmitted}
            className="ml-3 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 font-medium transition-colors"
          >
            {isSubmitted ? "Submitted" : "Submit"}
          </button>
        </div>
      </footer>
    </div>
  )
}

export default OwnWritingPage