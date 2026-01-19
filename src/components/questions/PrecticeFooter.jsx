import React from 'react'
import { FaCheck, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import FinishModal from '../modal/FinishModal';

const PrecticeFooter = ({ currentTest, currentPart, handlePartChange, getPartAnsweredCount, answers, scrollToQuestion, isModalOpen, setIsModalOpen, id , activeQuestion, onFinish, onSubmitTest, status = 'taking', onReview, onRetake, resultLink }) => {
  const currentPartData = currentTest?.parts?.find(p => p.part_number === currentPart) || currentTest?.parts?.[0];
  
  // Utility function to sort parts by part_number
  const getSortedParts = () => {
    return [...(currentTest?.parts || [])].sort((a, b) => {
      const aNum = a.part_number ?? 0;
      const bNum = b.part_number ?? 0;
      return aNum - bNum;
    });
  };

  // Utility function to get current part index
  const getCurrentPartIndex = () => {
    const sortedParts = getSortedParts();
    return sortedParts.findIndex(p => (p.part_number ?? p.id) === currentPart);
  };

  // Compute sorted parts and indices once
  const sortedParts = getSortedParts();
  const currentIndex = getCurrentPartIndex();
  const isFirstPart = currentIndex === 0;
  const isLastPart = currentIndex === sortedParts.length - 1;

  // Handle previous/next part navigation
  const handlePreviousPart = () => {
    if (!isFirstPart) {
      const prevPart = sortedParts[currentIndex - 1];
      handlePartChange(prevPart.part_number ?? prevPart.id);
    }
  };

  const handleNextPart = () => {
    if (!isLastPart) {
      const nextPart = sortedParts[currentIndex + 1];
      handlePartChange(nextPart.part_number ?? nextPart.id);
    }
  };

  return (
    <footer className="bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between gap-4">
    {/* Left: Part Navigation with Completion Status */}
    <div className="flex items-center gap-3 shrink-0">
      {currentTest?.parts && currentTest.parts.length > 0 ? (
        sortedParts.map((part) => {
            const partNumber = part.part_number ?? part.id;
            const partQuestions = part.questions || [];
            const answeredCount = getPartAnsweredCount(partQuestions);
            const totalQuestions = partQuestions.length;
            const isActive = currentPart === partNumber;
            
            return (
              <button
                key={part.id}
                onClick={() => handlePartChange(partNumber)}
                className={`
                  px-4 py-2 rounded-md text-sm font-medium transition-all
                  ${isActive 
                    ? "bg-blue-600 text-white shadow-sm" 
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }
                `}
              >
                <span>Part {partNumber}</span>
                {totalQuestions > 0 && (
                  <span className={isActive ? "text-blue-100" : "text-gray-500"}>
                    {" "}{answeredCount}/{totalQuestions}
                  </span>
                )}
              </button>
            );
          })
      ) : null}
    </div>

    {/* Center: Question Pagination */}
    <div className="flex items-center gap-1 flex-1 justify-center overflow-x-auto">
      {currentPartData?.questions && currentPartData.questions.length > 0 ? (
        [...currentPartData.questions]
          .sort((a, b) => {
            const aNum = a.question_number ?? 0;
            const bNum = b.question_number ?? 0;
            return aNum - bNum;
          })
          .map((q) => {
            const questionNumber = q.question_number;
            if (!questionNumber) return null;
            
            // Support both questions.id (for Fill-in-the-Blanks) and question_number (for other types)
            // Match the logic used in question components: question_number || id
            const answerKey = questionNumber || q.id;
            const answered = answers[answerKey] && answers[answerKey].toString().trim() !== '';
            const active = activeQuestion === questionNumber;

            return (
              <button
                key={questionNumber}
                onClick={() => scrollToQuestion(questionNumber)}
                className={`
                  w-9 h-9 rounded-md text-sm font-semibold transition-all flex items-center justify-center
                  ${active ? "ring-2 ring-blue-500 ring-offset-1" : ""}
                  ${
                    answered
                      ? "bg-green-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }
                `}
                title={answered ? `Answered: ${answers[answerKey]}` : `Question ${questionNumber}`}
              >
                {questionNumber}
              </button>
            );
          })
      ) : (
        <div className="text-sm text-gray-500">No questions available</div>
      )}
    </div>

    {/* Right: Navigation Arrows and Finish Button */}
    <div className="flex items-center gap-3 shrink-0">
      <button
        onClick={handlePreviousPart}
        disabled={isFirstPart}
        className="p-2 text-gray-700 hover:bg-gray-100 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        title="Previous part"
      >
        <FaChevronLeft className="w-5 h-5" />
      </button>
      
      <button
        onClick={handleNextPart}
        disabled={isLastPart}
        className="p-2 text-gray-700 hover:bg-gray-100 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        title="Next part"
      >
        <FaChevronRight className="w-5 h-5" />
      </button>
      
      {status === 'taking' && (
        <button
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-2 font-medium"
          onClick={() => {
            if (onFinish) {
              onFinish();
            }
          }}
        >
          <FaCheck className="w-4 h-4" />
          Finish
        </button>
      )}

      {status === 'completed' && (
        <>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium"
            onClick={() => {
              if (onReview) {
                onReview();
              }
            }}
          >
            Review Test
          </button>
          <button
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors flex items-center gap-2 font-medium"
            onClick={() => {
              if (onRetake) {
                onRetake();
              }
            }}
          >
            Retake Test
          </button>
        </>
      )}

      {status === 'reviewing' && (
        <button
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors flex items-center gap-2 font-medium"
          onClick={() => {
            if (onRetake) {
              onRetake();
            }
          }}
        >
          Retake Test
        </button>
      )}

      {/* Modal - only show in taking mode */}
      {status === 'taking' && (
        <FinishModal
          link={resultLink || "/reading-result/"+id}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          testId={id}
          onSubmit={onSubmitTest}
        />
      )}
    </div>
  </footer>
  )
}

export default PrecticeFooter