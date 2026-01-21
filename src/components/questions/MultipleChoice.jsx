import React from "react";
import { sortOptionsByLetter, getOptionDisplayText, getOptionValue, isOptionSelected } from "../../store/optionUtils";
import { FaRegBookmark, FaBookmark } from "react-icons/fa";

const MultipleChoice = ({ question, answer, onAnswerChange, options = [], mode = 'test', reviewData = {}, showCorrectAnswers = true, useTableFormat = false, bookmarks = new Set(), toggleBookmark = () => {} }) => {
  const questionNumber = question.question_number || question.id;
  const questionText = question.question_text || question.text || '';
  const isBookmarked = bookmarks.has(questionNumber);
  
  // Sort options by letter (A, B, C, D, etc.)
  const sortedOptions = sortOptionsByLetter(options);
  
  // Find correct answer from options (is_correct = true)
  const correctOption = sortedOptions.find(opt => opt.is_correct === true);
  const correctAnswerFromOptions = correctOption ? getOptionValue(correctOption) : '';
  
  const isReviewMode = mode === 'review';
  const review = reviewData[questionNumber] || {};
  const isCorrect = review.isCorrect;
  // Use correct answer from review data if available, otherwise from options
  const correctAnswer = review.correctAnswer || correctAnswerFromOptions;
  const userAnswer = review.userAnswer || answer;
  const showWrong = isReviewMode && !isCorrect;
  const showCorrect = isReviewMode && isCorrect;

  // Table format rendering (like Figure 1)
  if (useTableFormat) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                {/* Empty header for question column */}
              </th>
              {sortedOptions.map((option) => {
                const optionLetter = option.letter || '';
                return (
                  <th
                    key={option.id || optionLetter}
                    className="px-4 py-3 text-center font-semibold text-gray-700"
                  >
                    {optionLetter}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            <tr className={`border-t border-gray-200 transition-colors ${
              showWrong ? 'bg-red-50' : showCorrect ? 'bg-green-50' : 'bg-white'
            }`}>
              {/* Question Column */}
              <td className={`px-4 py-3 text-gray-900 relative group ${showWrong ? 'bg-red-50' : showCorrect ? 'bg-green-50' : ''}`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{questionNumber}.</span>
                  <span data-selectable="true">{questionText}</span>
                  {showCorrect && (
                    <span className="text-xs text-green-700 font-medium ml-2">Correct</span>
                  )}
                  {showWrong && (
                    <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-sm ml-2">
                      Wrong
                    </span>
                  )}
                  {showWrong && correctAnswer && showCorrectAnswers && (
                    <span className="text-xs text-green-600 font-medium ml-2">Correct: {correctAnswer}</span>
                  )}
                </div>
                {/* Bookmark Icon */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleBookmark(questionNumber);
                  }}
                  className={`absolute right-10 top-1/2 -translate-y-1/2 transition-all ${
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
              </td>
              {/* Option Columns with Radio Buttons */}
              {sortedOptions.map((option) => {
                const optionValue = getOptionValue(option);
                const isSelected = isOptionSelected(option, answer || userAnswer);
                const isCorrectOption = isReviewMode && optionValue.toLowerCase() === correctAnswer.toLowerCase().trim();
                
                return (
                  <td
                    key={option.id}
                    className={`px-4 py-3 text-center ${
                      isSelected && showCorrect ? 'bg-green-100' : 
                      isSelected && showWrong ? 'bg-red-100' : 
                      isCorrectOption && isReviewMode ? 'bg-green-50' : ''
                    }`}
                  >
                    <label className={`flex items-center justify-center ${mode === 'review' ? 'cursor-default' : 'cursor-pointer'}`}>
                      <input
                        type="radio"
                        name={`q-${questionNumber}`}
                        checked={isSelected}
                        onChange={() => {
                          if (mode !== 'review') {
                            onAnswerChange(questionNumber, optionValue);
                          }
                        }}
                        disabled={mode === 'review'}
                        className={`w-5 h-5 ${
                          isSelected && showCorrect ? 'accent-green-600' :
                          isSelected && showWrong ? 'accent-red-600' :
                          'accent-blue-500'
                        } ${mode === 'review' ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                      />
                    </label>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  // Default list format
  return (
    <div className="space-y-2 group relative">
      {/* Bookmark Icon */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleBookmark(questionNumber);
        }}
        className={`absolute right-0 -top-10 transition-all ${
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
      {sortedOptions.map((option) => {
        const displayText = getOptionDisplayText(option);
        const optionValue = getOptionValue(option); // Use option_text as value
        const isSelected = isOptionSelected(option, answer || userAnswer);
        // Compare by option_text (not letter)
        const isCorrectOption = isReviewMode && optionValue.toLowerCase() === correctAnswer.toLowerCase().trim();
        
        return (
          <label
            key={option.id}
            className={`flex gap-3 items-center p-2 rounded-md transition-all ${
              mode === 'review' ? 'cursor-default' : 'cursor-pointer'
            } ${
              isSelected && showCorrect
                ? "bg-green-100 border-2 border-green-500 text-green-900"
                : isSelected && showWrong
                ? "bg-red-100 border-2 border-red-500 text-red-900"
                : isCorrectOption && isReviewMode
                ? "bg-green-50 border border-green-300 text-green-700"
                : isSelected
                ? "bg-blue-200 dark:bg-blue-900 text-blue-900 dark:text-blue-300"
                : "hover:bg-blue-100 dark:hover:bg-blue-800 hover:text-blue-800 dark:hover:text-blue-200"
            }`}
          >
            <input
              type="radio"
              name={`q-${questionNumber}`}
              checked={isSelected}
              onChange={() => {
                if (mode !== 'review') {
                  // Store option_text as the answer value
                  onAnswerChange(questionNumber, optionValue);
                }
              }}
              disabled={mode === 'review'}
              className="accent-blue-500"
            />
            <span className="flex-1" data-selectable="true">{displayText}</span>
            {isSelected && showCorrect && (
              <span className="text-xs text-green-700 font-medium">Correct</span>
            )}
            {isSelected && showWrong && (
              <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-sm">
                Wrong
              </span>
            )}
            {isSelected && showWrong && correctAnswer && showCorrectAnswers && (
              <span className="text-xs text-green-600 font-medium ml-2">
                Correct: {correctAnswer}
              </span>
            )}
            {isCorrectOption && isReviewMode && !isSelected && correctAnswer && showCorrectAnswers && (
              <span className="text-xs text-green-700 font-medium">Correct Answer</span>
            )}
          </label>
        );
      })}
    </div>
  );
};

export default MultipleChoice;

