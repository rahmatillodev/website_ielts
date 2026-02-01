import React, { useState } from 'react'
import { FaCheck, FaChevronLeft, FaChevronRight, FaBookmark, FaRedo } from 'react-icons/fa';
import { useSearchParams } from 'react-router-dom';
import { useAppearance } from '@/contexts/AppearanceContext';
import ConfirmModal from '@/components/modal/ConfirmModal';

const PracticeFooter = ({ currentTest, currentPart, handlePartChange, getPartAnsweredCount, answers, scrollToQuestion, isModalOpen, setIsModalOpen, id, activeQuestion, onFinish, onSubmitTest, status = 'taking', onReview, onRetake, resultLink, getAllQuestions, bookmarks = new Set(), isSubmitting = false }) => {
  // Immediately check URL for review mode to prevent flickering
  const [searchParams] = useSearchParams();
  const isReviewMode = searchParams.get('mode') === 'review' || status === 'reviewing';
  const [isRetakeModalOpen, setIsRetakeModalOpen] = useState(false);
  
  // Try to use appearance context, but don't fail if not available
  const appearance = useAppearance();
  const themeColors = appearance.themeColors;

  const currentPartData = currentTest?.parts?.find(p => p.part_number === currentPart) || currentTest?.parts?.[0];

  // Utility function to sort parts by part_number
  const getSortedParts = () => {
    return [...(currentTest?.parts || [])].sort((a, b) => {
      const aNum = a.part_number ?? 0;
      const bNum = b.part_number ?? 0;
      return aNum - bNum;
    });
  };

  // Get all questions once
  const allQuestions = getAllQuestions ? getAllQuestions() : [];

  // Find current question index - ensure type consistency for comparison
  const currentQuestionIndex = activeQuestion != null
    ? allQuestions.findIndex(q => Number(q.questionNumber) === Number(activeQuestion))
    : -1;

  // Check if we're at the first or last question
  // If currentQuestionIndex is -1 (not found), we can't determine if we're at first/last
  const isFirstQuestion = currentQuestionIndex === -1 ? false : currentQuestionIndex <= 0;
  const isLastQuestion = currentQuestionIndex === -1 ? false : currentQuestionIndex >= allQuestions.length - 1;

  // Debug logging for disabled state (can be removed in production)
  // if (activeQuestion != null) {
  //   console.log('Footer state:', {
  //     activeQuestion,
  //     currentQuestionIndex,
  //     totalQuestions: allQuestions.length,
  //     isFirstQuestion,
  //     isLastQuestion,
  //     shouldDisableNext: isLastQuestion
  //   });
  // }

  // Handle previous/next question navigation
  const handlePreviousQuestion = () => {
    if (!getAllQuestions || allQuestions.length === 0) return;
    if (activeQuestion == null) return;

    // Find current question index - ensure type consistency for comparison
    const currentIdx = allQuestions.findIndex(q => Number(q.questionNumber) === Number(activeQuestion));

    if (currentIdx === -1) {
      console.log('handlePreviousQuestion: Could not find current question in allQuestions array');
      return;
    }

    if (currentIdx > 0) {
      const prevQuestion = allQuestions[currentIdx - 1];

      // Safety check: ensure prevQuestion exists and has required properties
      if (!prevQuestion || prevQuestion.questionNumber == null) {
        console.log('Previous question missing or invalid:', prevQuestion);
        return;
      }

      // Convert both to numbers for consistent comparison
      const prevPartNumber = Number(prevQuestion.partNumber);
      const currentPartNumber = Number(currentPart);

      // Switch to the part containing the previous question if needed
      if (prevPartNumber !== currentPartNumber) {
        handlePartChange(prevQuestion.partNumber);
        // Use setTimeout to ensure part change completes before scrolling
        setTimeout(() => {
          scrollToQuestion(prevQuestion.questionNumber);
        }, 100);
      } else {
        scrollToQuestion(prevQuestion.questionNumber);
      }
    }
  };

  const handleNextQuestion = () => {
    if (!getAllQuestions || allQuestions.length === 0) return;
    if (activeQuestion == null) return;


    // Find current question index - ensure type consistency for comparison
    const currentIdx = allQuestions.findIndex(q => Number(q.questionNumber) === Number(activeQuestion));

    if (currentIdx === -1) return;


    if (currentIdx < allQuestions.length - 1 && currentIdx >= 0) {
      const nextQuestion = allQuestions[currentIdx + 1];

      // Safety check: ensure nextQuestion exists and has required properties
      if (!nextQuestion || nextQuestion.questionNumber == null) {
        return;
      }

      // Convert both to numbers for consistent comparison
      const nextPartNumber = Number(nextQuestion.partNumber);
      const currentPartNumber = Number(currentPart);

      // Switch to the part containing the next question if needed
      if (nextPartNumber !== currentPartNumber) {
        handlePartChange(nextQuestion.partNumber);
        // Use setTimeout to ensure part change completes before scrolling
        setTimeout(() => {
          scrollToQuestion(nextQuestion.questionNumber);
        }, 100);
      } else {
        scrollToQuestion(nextQuestion.questionNumber);
      }
    }
  };


  return (
    <footer
      className="border-t border-gray-300 px-6 h-20 z-50"
      style={{
        backgroundColor: themeColors.backgroundColor }}
    >
      <div className="flex items-center justify-between h-20 ">


        {/* Center: All Parts with Progress */}
        <div className="flex-1 flex items-center justify-between">
          {currentTest?.parts && currentTest.parts.length > 0 ? (
            getSortedParts().map((part) => {
              const partNumber = part.part_number ?? part.id;
              const partQuestions = part.questions || [];
              const answeredCount = getPartAnsweredCount(partQuestions);
              const totalQuestions = partQuestions.length;
              const isActive = currentPart === partNumber;

              return (
                <div
                  key={part.id}
                  className="flex flex-col items-center w-full h-full"
                  style={{ backgroundColor: themeColors.background }}
                  
                >
                  {isActive ? (
                    // Active part: Show Part label and question numbers
                    <div className='w-full h-20' style={{ backgroundColor: themeColors.backgroundColor !== '#000000' ? '#E0E0E0' : themeColors.backgroundColor }}>
                      <div
                        className="font-semibold text-md text-center"
                        style={{ color: themeColors.text }}
                      >
                        Part {partNumber}
                      </div>
                      {partQuestions.length > 0 && (
                        <div className="flex flex-col  w-full items-center">
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
                                
                                // For multiple_answers: each question stores its own answer individually
                                // So we don't need to check group-level answers - the check above is sufficient

                                // Determine line color: only answered questions are green, default is gray
                                let lineColor = "bg-gray-300 dark:bg-gray-600";
                                if (answered) {
                                  lineColor = "bg-green-500";
                                }

                                return (
                                  <div
                                    key={`line-${questionNumber}`}
                                    className={`h-0.5 w-8 ${lineColor}`}
                                  />
                                );
                              })}
                          </div>

                          {/* Question number buttons */}
                          <div className="flex items-center gap-x-1 overflow-x-auto max-w-full p-2 rounded-md">
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
                                
                                // For multiple_answers: each question stores its own answer individually
                                // So we don't need to check group-level answers - the check above is sufficient
                                
                                // Get the actual answer value for display (check both keys)
                                const answerValue = (questionId && answers[questionId]) || (questionNumber && answers[questionNumber]) || '';
                                
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
                                        ${active ? "ring-2 ring-blue-500 ring-offset-1" : ""}
                                      `}
                                      style={{
                                        backgroundColor: themeColors.background,
                                        color: themeColors.text,
                                        borderColor: themeColors.border
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
                  ) : (
                    // Inactive part: Show Part label and progress
                    <div
                      className='w-full h-20 flex items-center justify-center gap-2 cursor-pointer rounded transition-colors'
                      style={{
                        backgroundColor: 'transparent'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = themeColors.text === '#000000' ? '#f3f4f6' : 'rgba(255,255,255,0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      onClick={() => handlePartChange(partNumber)}
                    >
                      <div
                        className="font-semibold text-md transition-colors"
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
        <div className="flex items-center gap-2">
          <button
            onClick={handlePreviousQuestion}
            disabled={isFirstQuestion}
            className="p-4 rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ color: themeColors.text }}
            title="Previous question"
          >
            <FaChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={handleNextQuestion}
            disabled={isLastQuestion}
            className="p-4 rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ color: themeColors.text }}
            title="Next question"
          >
            <FaChevronRight className="w-5 h-5" />
          </button>
        </div>



        {/* Right: Finish Button */}
        <div className="flex items-center gap-1 shrink-0">
          {!isReviewMode && (
            <button
              disabled={isSubmitting}
              className="flex items-center gap-1 transition-colors hover:opacity-80 p-2 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => {
                if (isSubmitting) return;
                if (onFinish) {
                  onFinish();
                }
              }}
              title="Finish"
            >
              <div className="rounded-sm flex items-center justify-center text-sm bg-black text-white gap-2 p-2" >
                <FaCheck className="w-4 h-4"  /> {isSubmitting ? 'Submitting...' : 'Submit'}
              </div>
            </button>
          )}
        </div>
        {isReviewMode && onRetake && (
          <button
            onClick={() => setIsRetakeModalOpen(true)}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors font-medium"
          >
            Redo Test
          </button>
        )}
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

export default PracticeFooter