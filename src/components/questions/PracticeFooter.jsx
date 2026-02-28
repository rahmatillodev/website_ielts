import React, { useState, useEffect, useRef } from 'react'
import { FaCheck, FaChevronLeft, FaChevronRight, FaBookmark, FaRedo, FaVolumeUp, FaBatteryFull } from 'react-icons/fa';
import { LuWifi, LuWifiHigh, LuWifiLow, LuWifiOff } from 'react-icons/lu';
import { useSearchParams } from 'react-router-dom';
import { useAppearance } from '@/contexts/AppearanceContext';
import useNetworkStatus from '@/hooks/use_network_status';
import ConfirmModal from '@/components/modal/ConfirmModal';
import { toast } from 'react-toastify';

/** Format current time as HH:mm for footer clock */
const formatCurrentTime = () => {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};

/**
 * Prev/Next question arrows for the upper content area (not in footer).
 * Uses same nav logic as footer; place in practice page content area.
 */


const PracticeFooter = ({ currentTest, currentPart, handlePartChange, getPartAnsweredCount, answers, scrollToQuestion, isModalOpen, setIsModalOpen, id, activeQuestion, onFinish, onSubmitTest, status = 'taking', onReview, onRetake, resultLink, getAllQuestions, bookmarks = new Set(), isSubmitting = false, isMockTest = false, mockTestId = null, timeRemaining, isListening = false, volume, onVolumeChange, assessmentLabel = 'IELTSCORE.UZ' }) => {
  // Immediately check URL for review mode to prevent flickering
  const [searchParams] = useSearchParams();
  const isReviewMode = searchParams.get('mode') === 'review' || status === 'reviewing';
  const [isRetakeModalOpen, setIsRetakeModalOpen] = useState(false);

  // --- Volume icon popup state and click-outside detection ---
  const [isVolumeOpen, setIsVolumeOpen] = useState(false);
  const volumeButtonRef = useRef(null);
  const volumeSliderRef = useRef(null);

  // When listening ends, close volume menu if open
  useEffect(() => {
    if (!isListening && isVolumeOpen) {
      setIsVolumeOpen(false);
    }
  }, [isListening, isVolumeOpen]);
  
  // Click outside closes the slider popup only when open
  useEffect(() => {
    if (!isVolumeOpen) return;

    function handleClickOutside(event) {
      // If the click is NOT on the button nor the slider popup
      if (
        volumeButtonRef.current &&
        !volumeButtonRef.current.contains(event.target) &&
        volumeSliderRef.current &&
        !volumeSliderRef.current.contains(event.target)
      ) {
        setIsVolumeOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, [isVolumeOpen]);

  // Try to use appearance context, but don't fail if not available
  const appearance = useAppearance();
  const themeColors = appearance.themeColors;
  const themeName = appearance.theme;
  const { isOnline, speed } = useNetworkStatus();
  const showVolumeIcon = isListening && typeof volume === 'number' && typeof onVolumeChange === 'function'; // icon only
  const showVolumeSlider = isVolumeOpen && showVolumeIcon;
  const [currentClock, setCurrentClock] = useState(formatCurrentTime);
  const [batteryLevel, setBatteryLevel] = useState(null);
  const [isBatteryHovered, setIsBatteryHovered] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setCurrentClock(formatCurrentTime()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.getBattery) return;
    let battery = null;
    const updateLevel = () => battery && setBatteryLevel(Math.round(battery.level * 100));
    navigator.getBattery()
      .then((b) => {
        battery = b;
        updateLevel();
        battery.addEventListener('levelchange', updateLevel);
      })
      .catch(() => setBatteryLevel(null));
    return () => {
      if (battery) battery.removeEventListener('levelchange', updateLevel);
    };
  }, []);

  const currentPartData = currentTest?.parts?.find(p => p.part_number === currentPart) || currentTest?.parts?.[0];

  // Utility function to sort parts by part_number
  const getSortedParts = () => {
    return [...(currentTest?.parts || [])].sort((a, b) => {
      const aNum = a.part_number ?? 0;
      const bNum = b.part_number ?? 0;
      return aNum - bNum;
    });
  };

  return (
    <footer
      className="z-50 flex flex-col relative"
      style={{
        backgroundColor: themeColors.backgroundColor }}
    >
        <div className="flex justify-end absolute right-10 -top-16 items-center py-2 shrink-0" style={{ borderColor: themeColors.border }}>
            <PracticeNavArrows
              getAllQuestions={getAllQuestions}
              activeQuestion={activeQuestion}
              currentPart={currentPart}
              handlePartChange={handlePartChange}
              scrollToQuestion={scrollToQuestion}
            />
          </div>
      {/* Row 1: Assessment label (left) + Part navigation and question numbers (center) */}
      <div
        className="flex items-center justify-between h-12 shrink-0"
        style={{ backgroundColor: themeColors.background }}
      >
        
        {/* Center: All Parts with Progress */}
        <div className="flex-1 flex items-center justify-center min-w-0">
          {currentTest?.parts && currentTest.parts.length > 0 ? (
            getSortedParts().map((part) => {
              const partNumber = part.part_number ?? part.id;
              const partQuestions = part.questions || [];
              const answeredCount = getPartAnsweredCount(partQuestions);
              const totalQuestions = partQuestions.length;
              const isActive = currentPart === partNumber;

              return (
                <div key={part.id} className="flex flex-col flex-1 items-center h-full shrink-0">
                  {isActive ? (
                    // Active part: Part label and question numbers in same row
                      <div className='w-full p-2 pt-4 '>
                        <div className="flex items-center justify-start w-full h-full min-w-0 px-2">
                        {/* LEFT: Part X + question numbers in one row */}
                        <div className="flex items-center justify-center flex-1 min-w-0">
                          <div
                            className="font-semibold text-md text-center shrink-0"
                            style={{ color: themeColors.text }}
                          >
                            Part {partNumber}
                          </div>
                          {partQuestions.length > 0 && (
                            <div className="flex flex-col min-w-0 items-center">
                          {/* Progress bars above question buttons */}
                          <div className="flex items-center gap-x-1 overflow-x-auto max-w-full">
                            {[...partQuestions]
                              .sort((a, b) => {
                                const aNum = a.question_number ?? 0;
                                const bNum = b.question_number ?? 0;
                                return aNum - bNum;
                              })
                              .map((q) => {
                                const questionNumber = q.question_number;
                                if (!questionNumber) return null;

                                const questionId = q.id;
                                const groupQuestionId = q.question_id; // For multiple_answers, answer is stored at group level
                                // Check both question.id (UUID) and question_number for answer
                                // Most components use question.id as the primary key
                                let answered = false;
                                
                                // First check by question.id (UUID) - this is what most components use
                                if (questionId && answers[questionId] && answers[questionId].toString().trim() !== '') {
                                  answered = true;
                                }
                                
                                // Then check by question_number - for backward compatibility
                                if (!answered && questionNumber && answers[questionNumber] && answers[questionNumber].toString().trim() !== '') {
                                  answered = true;
                                }
                                
                                // For multiple_answers and other group-based types, check group-level question_id
                                // The answer is stored using the group-level question.id (not individual question.id)
                                if (!answered && groupQuestionId && answers[groupQuestionId] && answers[groupQuestionId].toString().trim() !== '') {
                                  answered = true;
                                }

                                // Theme-aware progress line: answered = green, unanswered = muted border
                                const lineBg = answered ? '#22c55e' : themeColors.border;

                                return (
                                  <div
                                    key={`line-${questionNumber}`}
                                    className="h-0.5 w-8"
                                    style={{ backgroundColor: lineBg, opacity: answered ? 1 : 0.7 }}
                                  />
                                );
                              })}
                          </div>

                          {/* Question number buttons */}
                          <div className="flex items-center gap-x-1 whitespace-nowrap p-2 rounded-md">
                            {[...partQuestions]
                              .sort((a, b) => {
                                const aNum = a.question_number ?? 0;
                                const bNum = b.question_number ?? 0;
                                return aNum - bNum;
                              })
                              .map((q) => {
                                const questionNumber = q.question_number;
                                if (!questionNumber) return null;
                                
                                const questionId = q.id;
                                const groupQuestionId = q.question_id; // For multiple_answers, answer is stored at group level
                                // Check both question.id (UUID) and question_number for answer
                                // Most components use question.id as the primary key
                                let answered = false;
                                
                                // First check by question.id (UUID) - this is what most components use
                                if (questionId && answers[questionId] && answers[questionId].toString().trim() !== '') {
                                  answered = true;
                                }
                                
                                // Then check by question_number - for backward compatibility
                                if (!answered && questionNumber && answers[questionNumber] && answers[questionNumber].toString().trim() !== '') {
                                  answered = true;
                                }
                                
                                // For multiple_answers and other group-based types, check group-level question_id
                                // The answer is stored using the group-level question.id (not individual question.id)
                                if (!answered && groupQuestionId && answers[groupQuestionId] && answers[groupQuestionId].toString().trim() !== '') {
                                  answered = true;
                                }
                                
                                // Get the actual answer value for display (check all keys: questionId, questionNumber, and groupQuestionId)
                                const answerValue = (questionId && answers[questionId]) || (questionNumber && answers[questionNumber]) || (groupQuestionId && answers[groupQuestionId]) || '';
                                
                                // Ensure type consistency for comparison
                                const active = activeQuestion != null && Number(activeQuestion) === Number(questionNumber);
                                // Check bookmarks: some components use question_number, others use id
                                // Handle type mismatches by checking both number and string versions
                                const isBookmarked = bookmarks.has(questionNumber) ||
                                  bookmarks.has(Number(questionNumber)) ||
                                  bookmarks.has(String(questionNumber)) ||
                                  (questionId && bookmarks.has(questionId));

                                return (
                                  <div key={questionNumber} className="relative flex flex-col items-center shrink-0">
                                    {isBookmarked && (
                                      <FaBookmark className="absolute -top-2 text-red-500 text-xs z-10" />
                                    )}
                                    <button
                                      onClick={() => scrollToQuestion(questionNumber)}
                                      className={`
                                        w-8 h-8 rounded text-sm font-semibold transition-all flex items-center justify-center shrink-0
                                        border
                                      `}
                                      style={{
                                        backgroundColor: themeColors.background,
                                        color: themeColors.text,
                                        borderColor: themeColors.border,
                                        ...(active ? { boxShadow: `0 0 0 2px ${themeColors.border}` } : {})
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = themeColors.text === '#000000' ? '#f3f4f6' : 'rgba(255,255,255,0.1)';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = themeColors.background;
                                      }}
                                      title={answered ? `Answered: ${answerValue}` : `Question ${questionNumber}`}
                                    >
                                      {questionNumber}
                                    </button>
                                  </div>
                                );
                              })}
                          </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Inactive part: Show Part label and progress
                    <div
                      className='w-full flex items-center justify-center gap-2 cursor-pointer rounded transition-colors'
                     
                     
                    
                      onClick={() => handlePartChange(partNumber)}
                    >
                      <div
                        className="font-semibold text-md transition-colors "
                        style={{ color: themeColors.text }}
                      >
                        Part {partNumber}
                      </div>
                      {totalQuestions > 0 && (
                        <span
                          className="text-sm"
                          style={{ color: themeColors.text, opacity: 0.7 }}
                        >
                          {answeredCount}/{totalQuestions}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : null}
        </div>
      </div>

      {/* Row 2 (bottom): Current clock, battery, wifi, volume (listening only), Exit/Submit */}
      <div
        className="flex items-center justify-between shrink-0 p-2 px-4"
        style={{
          backgroundColor:
            themeName === 'light'
              ? '#E0E0E0'
              : themeName === 'dark'
                ? '#0d1520'
                : 'rgba(0,0,0,0.4)'
        }}
      >
        <span className="text-sm font-bold shrink-0" style={{ color: themeColors.text, opacity: 0.9 }}>
          {assessmentLabel}
        </span>
       
        <div className="flex items-center gap-4">
        <span className="text-sm font-medium shrink-0" style={{ color: themeColors.text }}>
          {currentClock}
        </span>
          <span
            className="relative flex items-center p-1 rounded shrink-0 cursor-default"
            style={{ color: themeColors.text }}
            title="Battery"
            onMouseEnter={() => setIsBatteryHovered(true)}
            onMouseLeave={() => setIsBatteryHovered(false)}
          >
            <FaBatteryFull className="w-4 h-4" />
            {isBatteryHovered && batteryLevel != null && (
              <span
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded text-xs font-medium whitespace-nowrap shadow-md z-50"
                style={{
                  backgroundColor: themeColors.background,
                  color: themeColors.text,
                  border: `1px solid ${themeColors.border}`
                }}
              >
                {batteryLevel}%
              </span>
            )}
          </span>
          <span
            className="flex items-center p-1 rounded shrink-0"
            style={{ color: themeColors.text, opacity: isOnline ? 1 : 0.6 }}
            title={isOnline ? `Internet: ${speed}` : 'No internet'}
          >
            {!isOnline ? (
              <LuWifiOff className="w-4 h-4" />
            ) : speed === 'fast' ? (
              <LuWifiHigh className="w-4 h-4" />
            ) : speed === 'slow' ? (
              <LuWifiLow className="w-4 h-4" />
            ) : (
              <LuWifi className="w-4 h-4" />
            )}
          </span>
          {/* Volume Icon appears when listening starts, clicking toggles slider, closes on outside click, disappears when listening ends */}
          {showVolumeIcon && (
            <div className="relative flex items-center shrink-0" ref={volumeButtonRef}>
              <button
                className="flex items-center transition-opacity hover:opacity-90 p-1"
                aria-label="Show volume slider"
                style={{ color: themeColors.text, background: 'none', border: 'none' }}
                onClick={() => setIsVolumeOpen(v => !v)}
                type="button"
                tabIndex={0}
              >
                <FaVolumeUp className="w-5 h-5" aria-hidden="true" />
              </button>
              {/* Slider only when open */}
              {showVolumeSlider && (
                <div
                  ref={volumeSliderRef}
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 shadow-lg px-4 py-3 rounded z-50 min-w-[130px] flex flex-col items-center"
                  style={{
                    border: `1px solid ${themeColors.border}`,
                    backgroundColor: themeColors.background,
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.15), 0 2px 4px -2px rgba(0,0,0,0.1)',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="mb-2 text-xs font-medium" style={{ color: themeColors.text, opacity: 0.9 }}>
                    Volume
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                    className="w-24 h-2 cursor-pointer"
                    title="Volume"
                    style={{ accentColor: themeColors.text }}
                  />
                </div>
              )}
            </div>
          )}
          <div className="flex items-center gap-1 shrink-0">
            {!isReviewMode && (
              <button
                disabled={isSubmitting}
                className="flex items-center gap-1 transition-colors hover:opacity-80 p-2 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={(e) => {
                  e.preventDefault();
                  if (isSubmitting) return;
                  if (onFinish) onFinish();
                }}
                title={isSubmitting ? 'Submitting...' : 'Submit'}
                style={{ color: themeColors.background, backgroundColor: themeColors.text }}
              >
                <div className="rounded-sm flex items-center justify-center text-sm gap-2 px-2">
                  <FaCheck className="w-4 h-4" /> {isSubmitting ? 'Submitting...' : 'Submit'}
                </div>
              </button>
            )}
            {isReviewMode && onRetake && (
              <button
                onClick={() => setIsRetakeModalOpen(true)}
                className="px-4 py-2 rounded transition-colors font-medium border"
                style={{
                  color: themeColors.text,
                  backgroundColor: themeColors.background,
                  borderColor: themeColors.border
                }}
              >
                Redo Test
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Retake Confirmation Modal */}
      <ConfirmModal
        isOpen={isRetakeModalOpen}
        onClose={() => setIsRetakeModalOpen(false)}
        onConfirm={() => {
          setIsRetakeModalOpen(false);
          if (onRetake) {
            onRetake();
          }
        }}
        title="Start New Test Attempt"
        description="Are you ready to start a fresh test? Your current review will be reset and you'll begin a new practice session."
        cancelLabel="Cancel"
        confirmLabel="Yes, Start Test"
        icon={FaRedo}
        iconBgColor="bg-blue-50"
        iconColor="text-blue-500"
      />

    </footer>
  )
}

const PracticeNavArrows = ({ getAllQuestions, activeQuestion, currentPart, handlePartChange, scrollToQuestion }) => {
  const appearance = useAppearance();
  const themeColors = appearance.themeColors;
  const allQuestions = getAllQuestions ? getAllQuestions() : [];
  const currentQuestionIndex = activeQuestion != null
    ? allQuestions.findIndex(q => Number(q.questionNumber) === Number(activeQuestion))
    : -1;
  const isFirstQuestion = currentQuestionIndex === -1 ? false : currentQuestionIndex <= 0;
  const isLastQuestion = currentQuestionIndex === -1 ? false : currentQuestionIndex >= allQuestions.length - 1;

  const handlePreviousQuestion = () => {
    if (!getAllQuestions || allQuestions.length === 0 || activeQuestion == null) return;
    const currentIdx = allQuestions.findIndex(q => Number(q.questionNumber) === Number(activeQuestion));
    if (currentIdx <= 0) return;
    const prevQuestion = allQuestions[currentIdx - 1];
    if (!prevQuestion || prevQuestion.questionNumber == null) return;
    const prevPartNumber = Number(prevQuestion.partNumber);
    const currentPartNumber = Number(currentPart);
    if (prevPartNumber !== currentPartNumber) {
      handlePartChange(prevQuestion.partNumber);
      setTimeout(() => scrollToQuestion(prevQuestion.questionNumber), 100);
    } else {
      scrollToQuestion(prevQuestion.questionNumber);
    }
  };

  const handleNextQuestion = () => {
    if (!getAllQuestions || allQuestions.length === 0 || activeQuestion == null) return;
    const currentIdx = allQuestions.findIndex(q => Number(q.questionNumber) === Number(activeQuestion));
    if (currentIdx === -1 || currentIdx >= allQuestions.length - 1) return;
    const nextQuestion = allQuestions[currentIdx + 1];
    if (!nextQuestion || nextQuestion.questionNumber == null) return;
    const nextPartNumber = Number(nextQuestion.partNumber);
    const currentPartNumber = Number(currentPart);
    if (nextPartNumber !== currentPartNumber) {
      handlePartChange(nextQuestion.partNumber);
      setTimeout(() => scrollToQuestion(nextQuestion.questionNumber), 100);
    } else {
      scrollToQuestion(nextQuestion.questionNumber);
    }
  };

  return (
    <div className="flex items-center gap-1 shrink-0">
      <button
        onClick={handlePreviousQuestion}
        disabled={isFirstQuestion}
        className="p-2 rounded border transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        style={{ color: themeColors.background, borderColor: themeColors.border, backgroundColor: themeColors.text }}
        title="Previous question"
      >
        <FaChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={handleNextQuestion}
        disabled={isLastQuestion}
        className="p-2 rounded border transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        style={{ color: themeColors.background, borderColor: themeColors.border, backgroundColor: themeColors.text }}
        title="Next question"
      >
        <FaChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
};

export default PracticeFooter