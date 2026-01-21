import React from "react";
import { sortOptionsByLetter, getOptionDisplayText, getOptionValue, isOptionSelected } from "../../store/optionUtils";
import { FaRegBookmark, FaBookmark } from "react-icons/fa";

const MatchingHeadings = ({ question, answer, onAnswerChange, options = [], mode = 'test', reviewData = {}, showCorrectAnswers = true, bookmarks = new Set(), toggleBookmark = () => {} }) => {
  const sortedOptions = sortOptionsByLetter(options);
  
  // Get question number (use question_number from individual question)
  const questionNumber = question.question_number || question.id;
  const questionText = question.question_text || question.text || '';
  const isReviewMode = mode === 'review';
  const isBookmarked = bookmarks.has(questionNumber);
  const review = reviewData[questionNumber] || {};
  const isCorrect = review.isCorrect;
  const correctAnswer = review.correctAnswer || '';
  const userAnswer = review.userAnswer || answer;
  const showWrong = isReviewMode && !isCorrect;
  const showCorrect = isReviewMode && isCorrect;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden group relative">
      <div className="grid grid-cols-[1fr_auto] divide-x divide-gray-200">
        {/* Left: Question Text */}
        <div className={`p-4 relative ${showWrong ? 'bg-red-50 border-red-500' : showCorrect ? 'bg-green-50 border-green-500' : 'bg-white'} ${showWrong || showCorrect ? 'border-2' : ''}`}>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-gray-900 font-medium">
              {questionText}
            </p>
            {showCorrect && (
              <span className="text-xs text-green-700 font-medium">Correct</span>
            )}
            {showWrong && (
              <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-sm">
                Wrong
              </span>
            )}
            {showWrong && correctAnswer && showCorrectAnswers && (
              <span className="text-xs text-green-600 font-medium">Correct: {correctAnswer}</span>
            )}
          </div>
          {/* Bookmark Icon */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleBookmark(questionNumber);
            }}
            className={`absolute right-2 top-1/2 -translate-y-1/2 transition-all ${
              isBookmarked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
            title={isBookmarked ? 'Remove bookmark' : 'Bookmark question'}
          >
            {isBookmarked ? (
              <FaBookmark className="w-4 h-4 text-red-500" />
            ) : (
              <FaRegBookmark className="w-4 h-4 text-gray-400 hover:text-red-500" />
            )}
          </button>
        </div>
        
        {/* Right: Radio Buttons with letters from options */}
        <div className="p-4 bg-gray-50 flex items-center gap-3">
          {sortedOptions.map((option) => {
            const radioValue = getOptionValue(option);
            const optionLetter = option.letter || '';
            const isSelected = isOptionSelected(option, userAnswer || answer);
            const isCorrectOption = isReviewMode && radioValue.toLowerCase() === correctAnswer.toLowerCase().trim();
            
            return (
              <label
                key={option.id}
                className={`
                  flex flex-col items-center justify-center w-10 h-10 rounded-md border-2 transition-all
                  ${mode === 'review' ? 'cursor-default' : 'cursor-pointer'}
                  ${isSelected && showCorrect
                    ? "border-green-600 bg-green-100 text-green-900"
                    : isSelected && showWrong
                    ? "border-red-600 bg-red-100 text-red-900"
                    : isCorrectOption && isReviewMode
                    ? "border-green-400 bg-green-50 text-green-700"
                    : isSelected
                    ? "border-blue-600 bg-blue-50 text-blue-900"
                    : "border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:bg-blue-50"
                  }
                `}
                title={getOptionDisplayText(option)}
              >
                <input
                  type="radio"
                  name={`q-${questionNumber}`}
                  value={radioValue}
                  checked={isSelected}
                  onChange={() => {
                    if (mode !== 'review') {
                      onAnswerChange(questionNumber, radioValue);
                    }
                  }}
                  disabled={mode === 'review'}
                  className="sr-only"
                />
                <span className="text-sm font-semibold">{optionLetter}</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MatchingHeadings;

