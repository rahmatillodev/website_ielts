import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import parse from 'html-react-parser';
import { LuChevronsLeftRight } from "react-icons/lu";

// Components & Providers
import QuestionHeader from '@/components/questions/QuestionHeader';
import TextSelectionTooltip from '@/components/annotations/TextSelectionTooltip';
import { AppearanceProvider, useAppearance } from '@/contexts/AppearanceContext';
import { AnnotationProvider, useAnnotation } from '@/contexts/AnnotationContext';
import { useWritingStore } from '@/store/WritingStore';
import { convertDurationToSeconds } from '@/utils/testDuration';

const WritingPracticePageContent = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { theme, themeColors, fontSizeValue } = useAppearance();
  
  // Store
  const { 
    currentWriting, 
    fetchWritingById, 
    loadingCurrentWriting, 
    errorCurrentWriting 
  } = useWritingStore();

  // States
  const [currentTaskType, setCurrentTaskType] = useState(null); 
  const [answers, setAnswers] = useState({});
  const [leftWidth, setLeftWidth] = useState(50);
  const [isStarted, setIsStarted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Refs for annotation and resizing
  const containerRef = useRef(null);
  const universalContentRef = useRef(null);
  const selectableContentRef = useRef(null);

  // 1. Ma'lumotlarni yuklash
  useEffect(() => {
    if (id) fetchWritingById(id);
  }, [id, fetchWritingById]);

  // 2. Ma'lumot kelganda tasklarni va taymerni sozlash
  useEffect(() => {
    if (currentWriting?.writing_tasks?.length > 0) {
      // Birinchi mavjud taskni tanlash (Task 1 yoki Task 2)
      const tasks = currentWriting.writing_tasks;
      const initialTask = tasks[0].task_type;
      setCurrentTaskType(initialTask);
      
      // Har bir task uchun alohida answer state yaratish
      const initialAnswers = {};
      tasks.forEach(t => {
        initialAnswers[t.task_type] = '';
      });
      setAnswers(initialAnswers);
      
      setTimeRemaining(convertDurationToSeconds(currentWriting.duration));
    }
  }, [currentWriting]);

  //  word count function
  const countWords = (text) => {
    if (!text || text.trim() === '') return 0;
    /// regex to count words
    const regex = /[a-zA-Z0-9]+(?:[-.][a-zA-Z0-9]+)*/g;
    
    const matches = text.match(regex);
    return matches ? matches.length : 0;
  };

  const handleTextChange = (e) => {
    const val = e.target.value;
    setAnswers(prev => ({ ...prev, [currentTaskType]: val }));
  };

  // Panelni o'lchamini o'zgartirish (Resize)
  const startResize = (e) => {
    const startX = e.clientX;
    const startWidth = leftWidth;

    const doDrag = (dragEvent) => {
      const deltaX = ((dragEvent.clientX - startX) / window.innerWidth) * 100;
      const newWidth = Math.min(Math.max(startWidth + deltaX, 20), 80);
      setLeftWidth(newWidth);
    };

    const stopDrag = () => {
      document.removeEventListener('mousemove', doDrag);
      document.removeEventListener('mouseup', stopDrag);
    };

    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);
  };

  // Annotation mantiqi (Reading kabi)
  const { addHighlight, addNote } = useAnnotation();
  const handleHighlight = useCallback((range, text, partId) => {
    addHighlight(range, text, partId, 'passage', 'writing');
  }, [addHighlight]);

  const handleNote = useCallback((range, text, partId) => {
    addNote(range, text, partId, 'passage', 'writing');
  }, [addNote]);

  const currentTaskData = currentWriting?.writing_tasks?.find(t => t.task_type === currentTaskType);

  if (loadingCurrentWriting) return <div className="h-screen flex items-center justify-center">Loading...</div>;
  if (errorCurrentWriting) return <div className="h-screen flex items-center justify-center text-red-500">{errorCurrentWriting}</div>;
  if (!currentTaskType) return null;

  return (
    <div 
      className="flex flex-col h-screen overflow-hidden"
      style={{ 
        backgroundColor: themeColors.backgroundColor, 
        color: themeColors.text,
        fontSize: `${fontSizeValue.base / 16}rem`
      }}
    >
      {/* Annotatsiya asbobi */}
      <TextSelectionTooltip
        universalContentRef={universalContentRef}
        partId={currentTaskType}
        onHighlight={handleHighlight}
        onNote={handleNote}
        testType="writing"
      />

      {/* Header */}
      <QuestionHeader
        currentTest={currentWriting}
        id={id}
        timeRemaining={timeRemaining}
        isStarted={isStarted}
        isPaused={isPaused}
        handleStart={() => setIsStarted(true)}
        handlePause={() => setIsPaused(!isPaused)}
        onBack={() => navigate(-1)}
        type="Writing"
        status="taking"
      />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden p-3 gap-1" ref={containerRef}>
        <div ref={universalContentRef} className="flex flex-1 overflow-hidden w-full">
          
          {/* CHAP PANEL: Task Kontenti */}
          <div 
            className="border rounded-2xl overflow-y-auto flex flex-col"
            style={{ 
              width: `${leftWidth}%`, 
              backgroundColor: themeColors.background,
              borderColor: themeColors.border 
            }}
          >
            {/* Task Sarlavhasi */}
            <div 
              className="px-6 py-4 border-b flex justify-between items-center"
              style={{ backgroundColor: theme === 'light' ? '#f3f4f6' : 'rgba(255,255,255,0.05)', borderColor: themeColors.border }}
            >
              <h2 className="font-bold text-lg flex items-center gap-2">
                <span className="p-1.5 bg-blue-500 text-white rounded-md text-sm">Task</span>
                {currentTaskType.replace('_', ' ')}
              </h2>
            </div>

            <div className="p-6 overflow-y-auto">
              <div ref={selectableContentRef} className="prose max-w-none mb-8" style={{ color: themeColors.text }}>
                <h3 className="text-xl font-semibold mb-4">{currentTaskData?.title}</h3>
                <div className="leading-relaxed text-lg whitespace-pre-wrap opacity-90">
                  {currentTaskData?.content && parse(currentTaskData.content)}
                </div>
              </div>

              {/* Task 1 bo'lsa rasm chiqarish */}
              {currentTaskType === 'Task 1' && currentTaskData?.image_url && (
                <div className="mt-4 border rounded-xl p-4 bg-white flex justify-center shadow-sm">
                  <img 
                    src={currentTaskData.image_url} 
                    alt="Writing Task" 
                    className="max-w-full h-auto object-contain max-h-[500px] rounded-lg"
                  />
                </div>
              )}
            </div>
          </div>

          {/* DRAGGABLE RESIZER */}
          <div className="px-4">
          <div
            onMouseDown={startResize}
            className="w-0.5 cursor-col-resize  dark:bg-gray-600 h-full flex justify-center items-center relative"
            title="Drag to resize"
            style={{ backgroundColor: themeColors.border }}
          >
            <div className="w-6 h-6 rounded-2xl bg-white flex items-center justify-center absolute border-2" style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}>
              <LuChevronsLeftRight style={{ color: themeColors.text }} />
            </div>
          </div>
        </div>
          {/* O'NG PANEL: Yozish maydoni */}
          <div 
            className="flex flex-col border rounded-2xl overflow-hidden shadow-inner"
            style={{ 
              width: `${100 - leftWidth}%`, 
              backgroundColor: themeColors.background,
              borderColor: themeColors.border 
            }}
          >
            <textarea
              className="flex-1 p-8 outline-none resize-none bg-transparent leading-relaxed"
              placeholder="Write your answer here..."
              value={answers[currentTaskType] || ''}
              onChange={handleTextChange}
              disabled={!isStarted || isPaused}
              style={{ 
                fontSize: `${fontSizeValue.base}px`, 
                color: themeColors.text,
                fontFamily: 'inherit'
              }}
            />
            
            {/* Word Count & Info Bar */}
            <div 
              className="px-6 py-4 border-t flex justify-between items-center text-sm font-semibold"
              style={{ 
                borderColor: themeColors.border, 
                backgroundColor: theme === 'light' ? '#f9fafb' : 'rgba(0,0,0,0.15)' 
              }}
            >
              <div className="flex items-center gap-2">
                <span className="opacity-70 text-xs uppercase tracking-wider">Word count:</span>
                <span className="text-blue-500 text-base">{countWords(answers[currentTaskType])}</span>
              </div>
              <div className="text-red-500 opacity-80 text-xs uppercase tracking-wider">
                Minimum: {currentTaskType === 'Task 1' ? '150' : '250'} words
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER: Task tanlash va Submit */}
      <footer 
        className="h-20 border-t flex items-center justify-between px-8"
        style={{ backgroundColor: themeColors.background, borderColor: themeColors.border }}
      >
        {/* Task Switcher faqat tasklar soni > 1 bo'lsa chiqadi */}
        <div className="flex gap-3 p-1.5 bg-gray-100 dark:bg-gray-800 rounded-xl">
          {currentWriting.writing_tasks.length > 1 ? (
            currentWriting.writing_tasks.map((task) => (
              <button
                key={task.id}
                onClick={() => setCurrentTaskType(task.task_type)}
                className={`px-8 py-2 rounded-lg text-sm font-bold transition-all shadow-sm ${
                  currentTaskType === task.task_type 
                  ? 'bg-white dark:bg-gray-700 scale-105' 
                  : 'text-gray-500 hover:text-gray-700'
                }`}
                style={currentTaskType === task.task_type ? { color: themeColors.text } : {}}
              >
                {task.task_type.replace('_', ' ')}
              </button>
            ))
          ) : (
            <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
              {currentTaskData?.task_type}
            </div>
          )}
        </div>

        <button
          onClick={() => toast.info("Submit mantiqi hali ulanmagan.")}
          className="px-10 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transform active:scale-95 transition-all shadow-lg"
        >
          Submit Test
        </button>
      </footer>
    </div>
  );
};

// Main Export with Providers
const WritingPracticePage = () => (
  <AppearanceProvider>
    <AnnotationProvider>
      <WritingPracticePageContent />
    </AnnotationProvider>
  </AppearanceProvider>
);

export default WritingPracticePage;