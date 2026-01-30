// ✅ WritingPracticePage.jsx
// NOTE: This version ONLY ports highlight + note logic from Reading
// Footer, layout, task switcher remain WRITING-style (NOT reading footer)

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import parse from "html-react-parser";
import { LuChevronsLeftRight } from "react-icons/lu";
import { toast } from "react-toastify";

import QuestionHeader from "@/components/questions/QuestionHeader";
import TextSelectionTooltip from "@/components/annotations/TextSelectionTooltip";
import NoteSidebar from "@/components/sidebar/NoteSidebar";

import { AppearanceProvider, useAppearance } from "@/contexts/AppearanceContext";
import { AnnotationProvider, useAnnotation } from "@/contexts/AnnotationContext";
import { useWritingStore } from "@/store/WritingStore";
import { convertDurationToSeconds } from "@/utils/testDuration";
import { applyHighlight, applyNote, getTextOffsets } from "@/utils/annotationRenderer";

/* ================= CONTENT ================= */
const WritingPracticePageContent = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { themeColors, fontSizeValue } = useAppearance();

  const {
    currentWriting,
    fetchWritingById,
    loadingCurrentWriting,
    errorCurrentWriting,
  } = useWritingStore();

  const {
    addHighlight,
    addNote,
    highlights,
    notes,
  } = useAnnotation();

  const [currentTaskType, setCurrentTaskType] = useState(null);
  const [answers, setAnswers] = useState({});
  const [leftWidth, setLeftWidth] = useState(50);

  const [isStarted, setIsStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);

  const containerRef = useRef(null);
  const universalContentRef = useRef(null);
  const passageRef = useRef(null);


  /* ================= FETCH ================= */
  useEffect(() => {
    if (id) fetchWritingById(id);
  }, [id]);

  useEffect(() => {
    if (!currentWriting?.writing_tasks?.length) return;

    const tasks = currentWriting.writing_tasks;
    setCurrentTaskType(tasks[0].task_type);

    const init = {};
    tasks.forEach((t) => (init[t.task_type] = ""));
    setAnswers(init);

    setTimeRemaining(convertDurationToSeconds(currentWriting.duration));
  }, [currentWriting]);

  /* ================= TIMER ================= */
  useEffect(() => {
    if (!isStarted || isPaused || timeRemaining <= 0) return;
    const interval = setInterval(() => {
      setTimeRemaining((t) => {
        if (t <= 1) {
          clearInterval(interval);
          toast.info("Time is up");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isStarted, isPaused, timeRemaining]);

  /* ================= TEXT ================= */
  const handleTextChange = (e) => {
    if (!isStarted) setIsStarted(true);
    if (isPaused) setIsPaused(false);
    setAnswers((p) => ({ ...p, [currentTaskType]: e.target.value }));
  };

  const countWords = (t) =>
    t ? t.trim().split(/\s+/).filter(Boolean).length : 0;  

  /* ================= RESIZE ================= */
  const startResize = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = leftWidth;

    const onMove = (ev) => {
      const delta = ((ev.clientX - startX) / window.innerWidth) * 100;
      setLeftWidth(Math.min(Math.max(startWidth + delta, 20), 80));
    };

    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  /* ================= ANNOTATION ================= */
  const handleHighlight = useCallback((range, text, partId) => {
    const container = passageRef.current;
    if (!container) return;

    const offsets = getTextOffsets(container, range);
    const id = addHighlight({
      text,
      ...offsets,
      partId,
      sectionType: "passage",
      testType: "writing",
    });

    applyHighlight(range, id);
    window.getSelection().removeAllRanges();
  }, []);

  const handleNote = useCallback((range, text, partId) => {
    const container = passageRef.current;
    if (!container) return;

    const offsets = getTextOffsets(container, range);
    const id = addNote({
      text,
      note: "",
      ...offsets,
      partId,
      sectionType: "passage",
      testType: "writing",
    });

    applyNote(range, id);
    window.getSelection().removeAllRanges();
  }, []);

  const currentTask = currentWriting?.writing_tasks?.find(
    (t) => t.task_type === currentTaskType
  );

  if (loadingCurrentWriting) return <div>Loading...</div>;
  if (errorCurrentWriting) return <div>{errorCurrentWriting}</div>;
  if (!currentTask) return null;

  /* ================= RENDER ================= */
  return (
    <div className="flex flex-col h-screen" style={{ background: themeColors.background }}>
      <TextSelectionTooltip
        universalContentRef={universalContentRef}
        partId={currentTaskType}
        onHighlight={handleHighlight}
        onNote={handleNote}
        testType="writing"
      />

      <QuestionHeader
        currentTest={currentWriting}
        id={id}
        timeRemaining={timeRemaining}
        isStarted={isStarted}
        isPaused={isPaused}
        handleStart={() => setIsStarted(true)}
        handlePause={() => setIsPaused((p) => !p)}
        onBack={() => navigate(-1)}
        type="Writing"
        status="taking"
      />

      <div className="flex flex-1 overflow-hidden" ref={containerRef}>
        <div className="flex w-full" ref={universalContentRef}>
          {/* LEFT */}
          <div
            className="border overflow-y-auto"
            style={{ width: `${leftWidth}%`, borderColor: themeColors.border }}
          >
            <div className="p-6" ref={passageRef} data-selectable="true">
              <h3 className="text-xl font-semibold mb-4">{currentTask.title}</h3>
              {parse(currentTask.content || "")}
            </div>
          </div>

          {/* RESIZER */}
          <div className="relative w-[14px] flex justify-center">
            <div
              onMouseDown={startResize}
              className="absolute inset-y-0 w-[4px] cursor-col-resize"
              style={{ backgroundColor: themeColors.border }}
            />
            <div
              onMouseDown={startResize}
              className="absolute top-1/2 left-1/2 w-6 h-6 rounded-2xl flex items-center justify-center border-2 cursor-col-resize"
              style={{
                backgroundColor: themeColors.background,
                borderColor: themeColors.border,
                transform: "translate(-50%, -50%)",
              }}
            >
              <LuChevronsLeftRight />
            </div>
          </div>

          {/* RIGHT */}
          <div
            className="border flex flex-col"
            style={{ width: `${100 - leftWidth}%`, borderColor: themeColors.border }}
          >
            <textarea
              className="flex-1 p-8 resize-none outline-none"
              placeholder="Write your answer here..."
              value={answers[currentTaskType] || ""}
              onChange={handleTextChange}
              disabled={isPaused}
              style={{
                fontSize: `${fontSizeValue.base}px`,
                backgroundColor: themeColors.background,
                color: themeColors.text,
              }}
            />

            <div className="px-6 py-4 border-t flex justify-between text-sm font-semibold">
              <span>WORD COUNT: {countWords(answers[currentTaskType])}</span>
              <span className="text-red-500">
                MINIMUM: {currentTaskType === "Task 1" ? 150 : 250} WORDS
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* WRITING FOOTER ONLY */}
      <footer
  className="relative h-20 border-t grid grid-cols-3 items-center px-8 shrink-0"
  style={{ 
    borderColor: themeColors.border,
    backgroundColor: themeColors.background
  }}
>
  {/* CHAP TOMON - */}
  <div></div>

  {/*  - TASK SWITCHER */}
  <div className="flex justify-center items-center gap-200">
    {currentWriting.writing_tasks.length > 1 ? (
      currentWriting.writing_tasks.map((task, index) => {
        const isActive = currentTaskType === task.task_type;
        
        return (
          <button
            key={task.id}
            onClick={() => setCurrentTaskType(task.task_type)}
            className="relative flex flex-col items-center gap-1 transition-all group hover:scale-110 active:scale-95"
          >
            {/* Task Label */}
            <span
              className="text-base font-semibold transition-all whitespace-nowrap"
              style={{
                color: isActive ? themeColors.text : themeColors.text,
                opacity: isActive ? 1 : 0.5
              }}
            >
              {task.task_type}
            </span>
            
            {/* Active Indicator -  */}
            {isActive && (
              <div
                className="w-full h-1 rounded-full transition-all"
                style={{
                  backgroundColor: themeColors.text,
                }}
              />
            )}
          </button>
        );
      })
    ) : (
      <div 
        className="px-4 py-2 text-xs font-bold uppercase tracking-widest"
        style={{ color: themeColors.text, opacity: 0.5 }}
      >
        {currentTaskType}
      </div>
    )}
  </div>

  {/*- SUBMIT */}
  <div className="flex justify-end">
    <button
      onClick={() => toast.info("Submit mantiqi hali ulanmagan.")}
      className="px-10 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg"
    >
      Submit Test
    </button>
  </div>
</footer>
      <NoteSidebar />
    </div>
  );
};

/* ================= PROVIDER ================= */
const WritingPracticePage = () => (
  <AppearanceProvider>
    <AnnotationProvider>
      <WritingPracticePageContent />
    </AnnotationProvider>
  </AppearanceProvider>
);

export default WritingPracticePage;
