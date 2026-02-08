import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaExpand,
  FaCompress,
  FaDownload,
  FaFileAlt,
  FaBars,
  FaCheck,
} from "react-icons/fa";
import { LuChevronsLeftRight } from "react-icons/lu";
import { PenSquare, X } from "lucide-react";
import { AppearanceProvider, useAppearance } from "@/contexts/AppearanceContext";
import AppearanceSettingsModal from "@/components/modal/AppearanceSettingsModal";
import WritingFinishModal from "@/components/modal/WritingFinishModal";
import WritingSuccessModal from "@/components/modal/WritingSuccessModal";
import { generateWritingPDF } from "@/utils/exportOwnWritingPdf";
import { toast } from "react-toastify";
import { useSettingsStore } from "@/store/systemStore";
import { Button } from "@/components/ui/button";
import ConfirmModal from "@/components/modal/ConfirmModal";

const OwnWritingPageContent = () => {
  const navigate = useNavigate();
  const { themeColors, fontSizeValue } = useAppearance();
  const settings = useSettingsStore((s) => s.settings);

  const [activeTask, setActiveTask] = useState("task1");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [leftWidth, setLeftWidth] = useState(50);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFinishOpen, setIsFinishOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [isConfirmExitOpen, setIsConfirmExitOpen] = useState(false);

  const containerRef = useRef(null);
  const isResizing = useRef(false);
  const questionTextareaRef = useRef(null);

  const [tasks, setTasks] = useState({
    task1: { question: "", answer: "", image: null },
    task2: { question: "", answer: "", image: null },
  });

  const currentTask = tasks[activeTask];
  const baseFontSize = fontSizeValue.base / 16;

  /* ================= TIMER ================= */
  useEffect(() => {
    if (!isRunning) return;
    const timer = setInterval(() => setElapsedTime((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, [isRunning]);

  const formatTime = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(
      2,
      "0"
    )}`;

  /* ================= RESIZE ================= */
  useEffect(() => {
    const onMove = (e) => {
      if (!isResizing.current || !containerRef.current) return;
      const w = containerRef.current.offsetWidth;
      const percent = (e.clientX / w) * 100;
      if (percent > 25 && percent < 75) setLeftWidth(percent);
    };

    const stop = () => (isResizing.current = false);

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", stop);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", stop);
    };
  }, []);

  /* ================= FULLSCREEN ================= */
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const wordCount = currentTask.answer.trim().split(/\s+/).filter(Boolean).length;
  const minWords = activeTask === "task1" ? 150 : 250;

  const handleDownloadPDF = async () => {
    try {
      await generateWritingPDF(tasks, formatTime(elapsedTime), settings);
      toast.success("PDF saved successfully");
    } catch {
      toast.error("Failed to save PDF");
    }
  };

  /* ================= QUESTION TEXTAREA AUTO-GROW (grows with content, parent scrolls) ================= */
  const autosizeQuestionTextarea = (el) => {
    if (!el) return;
    el.style.height = "auto";
    const MIN_PX = 200;
    const nextHeight = Math.max(el.scrollHeight, MIN_PX);
    el.style.height = `${nextHeight}px`;
    el.style.overflowY = "hidden";
  };

  useEffect(() => {
    autosizeQuestionTextarea(questionTextareaRef.current);
  }, [activeTask, currentTask.question]);

  /* ================= IMAGE DRAG & DROP (TASK 1 ONLY) ================= */
  const handleQuestionDragOver = (e) => {
    e.preventDefault();
  };

  const handleQuestionDrop = (e) => {
    e.preventDefault();

    // Only Task 1 accepts image drop
    if (activeTask !== "task1") {
      toast.warning("Images can only be uploaded for Task 1");
      return;
    }

    const file = e.dataTransfer?.files?.[0];
    if (!file || !file.type?.startsWith("image/")) {
      toast.error("Please drop a valid image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result;
      setTasks((p) => ({
        ...p,
        task1: {
          ...p.task1,
          image: base64,
        },
      }));
      toast.success("Image uploaded successfully");
    };
    reader.onerror = () => {
      toast.error("Failed to read image file");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveQuestionImage = () => {
    // Only Task 1 image is removable here
    setTasks((p) => ({
      ...p,
      task1: {
        ...p.task1,
        image: null,
      },
    }));
  };

  /* ================= IMAGE PASTE (TASK 1 ONLY) ================= */
  const handleQuestionPaste = (e) => {
    // Only Task 1 accepts image paste
    if (activeTask !== "task1") {
      return;
    }

    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type?.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result;
          setTasks((p) => ({
            ...p,
            task1: {
              ...p.task1,
              image: base64,
            },
          }));
          toast.success("Image pasted successfully");
        };
        reader.onerror = () => {
          toast.error("Failed to read image file");
        };
        reader.readAsDataURL(file);
        break;
      }
    }
  };

  /* ================= BACK HANDLER ================= */
  const handleBack = () => {
    // Check if user has started (timer is running, elapsed time > 0, or has content)
    const hasStarted = isRunning || elapsedTime > 0 || 
      (tasks.task1.answer && tasks.task1.answer.trim()) || 
      (tasks.task2.answer && tasks.task2.answer.trim()) ||
      (tasks.task1.question && tasks.task1.question.trim()) ||
      (tasks.task2.question && tasks.task2.question.trim()) ||
      tasks.task1.image;

    if (hasStarted) {
      setIsConfirmExitOpen(true);
    } else {
      navigate("/writing");
    }
  };

  const handleConfirmExit = () => {
    setIsConfirmExitOpen(false);
    navigate("/writing");
  };

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{
        background: themeColors.background,
        color: themeColors.text,
        fontSize: `${baseFontSize}rem`,
      }}
    >
      {/* ================= HEADER ================= */}
      <header
        className="shrink-0 border-b px-6 py-4 flex items-center justify-between"
        style={{ borderColor: themeColors.border }}
      >
        <button
          onClick={handleBack}
          className="flex items-center gap-2 px-4 py-1 bg-gray-200 rounded"
        >
          <FaArrowLeft /> Back
        </button>

        <div className="flex items-center gap-4">
          <span className="font-bold text-lg">{formatTime(elapsedTime)}</span>
          <button
            onClick={() => setIsRunning((p) => !p)}
            disabled={isSubmitted}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? "Pause" : "Start"}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={toggleFullscreen}>
            {isFullscreen ? <FaCompress /> : <FaExpand />}
          </button>
          <button onClick={() => setIsSettingsOpen(true)}>
            <FaBars />
          </button>
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 bg-green-600 text-white px-3 py-2 rounded"
          >
            <FaDownload /> save as PDF
          </button>
        </div>
      </header>

      {/* ================= CONTENT ================= */}
      <div
        ref={containerRef}
        className="flex flex-1 overflow-hidden p-3 gap-2"
      >
        {/* ===== LEFT (GROW AND SCROLL AS DATA GROWS) ===== */}
        <div
          className="border rounded-2xl p-6 flex flex-col relative z-0 overflow-auto min-h-0 h-full"
          style={{
            width: `${leftWidth}%`,
            borderColor: themeColors.border,
            backgroundColor: themeColors.background,
          }}
        >
          {/* TOP INFO CARD */}
          <div className="shrink-0 rounded-xl border border-slate-200 p-4 mb-4">
            <div className="flex items-center gap-2">
              <PenSquare className="w-5 h-5" />
              <span className="text-base font-bold">
                IELTS Writing Practice - {activeTask === "task1" ? "Task 1" : "Task 2"}
              </span>
            </div>
            <div className="text-sm mt-1">
              Create your own writing task and practice at your own pace
            </div>
          </div>

          {/* WRITING BLOCK (textarea + image) */}
          <div className="w-full rounded-lg relative flex flex-col gap-2">
            <textarea
              spellcheck="false"
              ref={questionTextareaRef}
              className="w-full border border-gray-300 bg-amber-500 rounded-lg p-2 focus:ring-0 focus:border-blue-500 resize-none min-h-[10px] shrink-0"
              placeholder={
                activeTask === "task1"
                  ? "Type your writing task question here...\n\nTip: You can drag & drop or paste image"
                  : "Type your writing task question here..."
              }
              value={currentTask.question}
              style={{ backgroundColor: themeColors.background }}
              onDragOver={activeTask === "task1" ? handleQuestionDragOver : undefined}
              onDrop={activeTask === "task1" ? handleQuestionDrop : undefined}
              onPaste={activeTask === "task1" ? handleQuestionPaste : undefined}
              onChange={(e) =>
                (autosizeQuestionTextarea(e.currentTarget),
                setTasks((p) => ({
                  ...p,
                  [activeTask]: {
                    ...p[activeTask],
                    question: e.target.value,
                  },
                })))
              }
            />

            {/* IMAGE PREVIEW (Task 1 only) */}
            {activeTask === "task1" && tasks.task1.image && (
              <div className="rounded-xl border border-gray-300 overflow-hidden max-w-full mt-2 shrink-0">
                <div className="flex justify-end p-2">
                  <Button
                    type="button"
                    onClick={handleRemoveQuestionImage}
                    className="w-8 h-8 rounded-full hover:bg-gray-50 border border-gray-200 flex items-center justify-center"
                    title="Remove image"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <img
                  src={tasks.task1.image}
                  alt="Dropped preview"
                  className="block w-full max-w-full max-h-[260px] object-contain"
                />
              </div>
            )}
          </div>
        </div>

        {/* ===== RESIZER ===== */}
        <div
          onMouseDown={() => (isResizing.current = true)}
          className="relative z-50 overflow-visible flex items-center justify-center cursor-col-resize"
          style={{ width: "20px", zIndex: 50 }}
        >
          <div
            className="absolute inset-y-0 left-1/2 -translate-x-1/2 h-full z-50"
            style={{ width: "4px", backgroundColor: themeColors.border }}
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-60 w-6 h-6 rounded-2xl flex items-center justify-center border-2 bg-white shadow-md"
            style={{ borderColor: themeColors.border }}
          >
            <LuChevronsLeftRight size={16} />
          </div>
        </div>

        {/* ===== RIGHT (FULL HEIGHT) ===== */}
        <div
          className="flex flex-col border border-[color:var(--panel-border)] rounded-2xl overflow-hidden focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200 relative z-0"
          style={{
            width: `${100 - leftWidth}%`,
            "--panel-border": themeColors.border,
          }}
        >
          <textarea
            spellcheck="false"
            className="flex-1 p-5 resize-none outline-none bg-transparent focus:ring-0 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="Write your answer here..."
            value={currentTask.answer}
            disabled={isSubmitted}
            style={{ backgroundColor: themeColors.background }}
            onChange={(e) =>
              setTasks((p) => ({
                ...p,
                [activeTask]: {
                  ...p[activeTask],
                  answer: e.target.value,
                },
              }))
            }
            onFocus={() => !isRunning && !isSubmitted && setIsRunning(true)}
          />

          <div
            className="shrink-0 flex justify-between text-sm mt-3 p-4 border-t"
            style={{ borderColor: themeColors.border }}
          >
            <span>
              <FaFileAlt className="inline mr-1" />
              Words: {wordCount}
            </span>
            <span
              className={
                wordCount >= minWords ? "text-green-600" : "text-red-600"
              }
            >
              Minimum: {minWords}
            </span>
          </div>
        </div>
      </div>

      {/* ================= FOOTER ================= */}
      <footer
        className="shrink-0 border-t flex items-center"
        style={{ borderColor: themeColors.border }}
      >
        <div className="flex flex-1 ">
          {["task1", "task2"].map((t) => (
            <button
              key={t}
              onClick={() => setActiveTask(t)}
              className="flex-1 py-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: activeTask === t ? "#e5e7eb" : "transparent",
              }}
            >
              {t === "task1" ? "Task 1" : "Task 2"}
            </button>
          ))}
        </div>

        <button
          onClick={() => setIsFinishOpen(true)}
          disabled={isSubmitted}
          className="absolute right-2 w-24 rounded-sm flex items-center justify-center text-sm bg-black text-white gap-2 p-2" >
        
          <FaCheck className="w-4 h-4"  /> Save
        </button>
      </footer>

      {/* ================= MODALS ================= */}
      <AppearanceSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <WritingFinishModal
        isOpen={isFinishOpen}
        onClose={() => setIsFinishOpen(false)}
        onConfirm={async () => {
          // Close modal first
          setIsFinishOpen(false);
          
          // Stop timer and disable button
          setIsRunning(false);
          setIsSubmitted(true);

          try {
            // Check if at least one task has content
            const hasTask1 = tasks.task1.answer && tasks.task1.answer.trim();
            const hasTask2 = tasks.task2.answer && tasks.task2.answer.trim();
            
            if (!hasTask1 && !hasTask2) {
              toast.error('Please write at least one word in either Task 1 or Task 2 before generating PDF.');
              setIsSubmitted(false);
              setIsRunning(true);
              return;
            }

            // Show success modal which will allow PDF download
            setIsSuccessModalOpen(true);
          } catch (error) {
            console.error('Error preparing PDF:', error);
            setIsSubmitted(false);
            setIsRunning(true);
            toast.error('An error occurred while preparing your writing');
          }
        }}
        loading={false}
      />

      <ConfirmModal
        isOpen={isConfirmExitOpen}
        onClose={() => setIsConfirmExitOpen(false)}
        onConfirm={handleConfirmExit}
        title="Exit Writing Practice?"
        description="Are you sure you want to exit? Your progress may be lost."
      />
    </div>
  );
};

export default function OwnWritingPage() {
  return (
    <AppearanceProvider>
      <OwnWritingPageContent />
    </AppearanceProvider>
  );
}
