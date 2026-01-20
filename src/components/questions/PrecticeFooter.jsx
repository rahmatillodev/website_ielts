import React from 'react'
import { FaCheck, FaChevronLeft, FaChevronRight, FaBookmark } from 'react-icons/fa';

const PrecticeFooter = ({ currentTest, currentPart, handlePartChange, getPartAnsweredCount, answers, scrollToQuestion, isModalOpen, setIsModalOpen, id, activeQuestion, onFinish, onSubmitTest, status = 'taking', onReview, onRetake, resultLink, getAllQuestions, bookmarks = new Set() }) => {
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

  // Find current question index
  const currentQuestionIndex = activeQuestion
    ? allQuestions.findIndex(q => q.questionNumber === activeQuestion)
    : -1;

  // Check if we're at the first or last question
  const isFirstQuestion = currentQuestionIndex <= 0;
  const isLastQuestion = currentQuestionIndex >= allQuestions.length - 1;

  // Handle previous/next question navigation
  const handlePreviousQuestion = () => {
    if (!getAllQuestions || !activeQuestion || allQuestions.length === 0) return;


    // Find current question index
    const currentIdx = allQuestions.findIndex(q => q.questionNumber === activeQuestion);

    if (currentIdx > 0) {
      const prevQuestion = allQuestions[currentIdx - 1];

      // Switch to the part containing the previous question if needed
      if (prevQuestion.partNumber !== currentPart) {
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
    if (!getAllQuestions || !activeQuestion || allQuestions.length === 0) return;
  

    // Find current question index
    const currentIdx = allQuestions.findIndex(q => q.questionNumber === activeQuestion);
    
    if (currentIdx < allQuestions.length - 1 && currentIdx >= 0) {
      const nextQuestion = allQuestions[currentIdx + 1];
      console.log(nextQuestion);
      
      
      // Switch to the part containing the next question if needed
      if (nextQuestion.partNumber !== currentPart) {
        
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

  // // Check if a part is fully completed
  // const isPartCompleted = (partQuestions) => {
  //   if (!partQuestions || partQuestions.length === 0) return false;
  //   const answeredCount = getPartAnsweredCount(partQuestions);
  //   return answeredCount === partQuestions.length;
  // };

  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 h-20 z-50 ">
      <div className="flex items-center justify-between h-full ">
       

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
                <div key={part.id} className={`flex flex-col items-center w-full h-full ${isActive ? 'bg-gray-100' : ''}`}>
                  {isActive ? (
                    // Active part: Show Part label and question numbers
                    <div>
                      <div className="font-semibold text-md text-gray-900 dark:text-gray-100 text-center ">
                        Part {partNumber}
                      </div>
                      {partQuestions.length > 0 && (
                        <div className="flex flex-col gap-1 w-full items-center">
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

                                const answerKey = questionNumber || q.id;
                                const answered = answers[answerKey] && answers[answerKey].toString().trim() !== '';

                                return (
                                  <div
                                    key={`line-${questionNumber}`}
                                    className={`h-0.5 w-8 ${answered
                                        ? "bg-green-500"
                                        : "bg-gray-300 dark:bg-gray-600"
                                      }`}
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
                                const answerKey = questionNumber || q.id;
                                const answered = answers[answerKey] && answers[answerKey].toString().trim() !== '';
                                const active = activeQuestion === questionNumber;
                                const isBookmarked = bookmarks.has(questionNumber) || bookmarks.has(answerKey);

                                return (
                                  <div key={questionNumber} className="relative flex flex-col items-center shrink-0">
                                    {isBookmarked && (
                                      <FaBookmark className="absolute -top-2 text-red-500 text-xs z-10" />
                                    )}
                                    <button
                                      onClick={() => scrollToQuestion(questionNumber)}
                                      className={`
                                        w-8 h-8 rounded text-sm font-semibold transition-all flex items-center justify-center shrink-0
                                        bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 
                                        border border-gray-300 dark:border-gray-600 
                                        hover:bg-gray-100 dark:hover:bg-gray-600
                                        ${active ? "ring-2 ring-blue-500 ring-offset-1" : ""}
                                      `}
                                      title={answered ? `Answered: ${answers[answerKey]}` : `Question ${questionNumber}`}
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
                    <div className='w-full h-20 flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors'
                      onClick={() => handlePartChange(partNumber)}
                    >
                      <div

                        className="font-semibold text-md text-gray-900 dark:text-gray-100 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                      >
                        Part {partNumber}
                      </div>
                      {totalQuestions > 0 && (
                        <span className="text-sm text-gray-600 dark:text-gray-400">
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
          className="p-4  rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Previous question"
        >
          <FaChevronLeft className="w-5 h-5" />
        </button>

        <button
          onClick={handleNextQuestion}
          disabled={isLastQuestion}
          className="p-4   rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Next question"
        >
          <FaChevronRight className="w-5 h-5" />
        </button>
      </div>



        {/* Right: Finish Button */}
        <div className="flex items-center gap-1 shrink-0">
          {status === 'taking' && (
            <button
              className="flex items-center gap-1 transition-colors hover:opacity-80 p-2"
              onClick={() => {
                if (onFinish) {
                  onFinish();
                }
              }}
              title="Finish"
            >
              <div className="rounded bg-black text-white dark:text-white flex items-center justify-center p-2 text-sm gap-2">
                <FaCheck className="w-4 h-4 text-white dark:text-white" /> Submit
              </div>
            </button>
          )}
        </div>
      </div>
      
    </footer>
  )
}

export default PrecticeFooter