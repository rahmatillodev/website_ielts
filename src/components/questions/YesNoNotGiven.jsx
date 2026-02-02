import React from "react";
import { FaRegBookmark, FaBookmark } from "react-icons/fa";

const YesNoNotGiven = ({ question, answer, onAnswerChange, mode = 'test', reviewData = {}, showCorrectAnswers = true, bookmarks = new Set(), toggleBookmark = () => {} }) => {
  const questionId = question.id;
  const questionNumber = question.question_number || question.id;
  const isReviewMode = mode === 'review';
  // Try both question.id (UUID) and question_number for review data lookup
  const review = reviewData[questionId] ||
                 reviewData[String(questionId)] ||
                 reviewData[questionNumber] ||
                 reviewData[String(questionNumber)] ||
                 {};
  const isCorrect = review.isCorrect;
  const correctAnswer = review.correctAnswer || '';
  // Use review.userAnswer if available, otherwise use the answer prop
  const userAnswer = review.userAnswer || answer;
  const showWrong = isReviewMode && review.hasOwnProperty('isCorrect') && review.isCorrect === false;
  const showCorrect = isReviewMode && review.isCorrect === true;
  const isBookmarked = bookmarks.has(questionId) || bookmarks.has(questionNumber);
  
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
          <FaBookmark className="w-5 h-5 text-red-500" />
        ) : (
          <FaRegBookmark className="w-5 h-5 text-gray-400 hover:text-red-500" />
        )}
      </button>
      {["YES", "NO", "NOT GIVEN"].map((option) => {
        const isSelected = (userAnswer || answer) === option;
        const isCorrectOption = isReviewMode && option === correctAnswer;
        
        return (
          <label
            key={option}
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
                  // Use question.id (UUID) as primary key, fallback to question_number
                  onAnswerChange(questionId || questionNumber, option);
                }
              }}
              disabled={mode === 'review'}
              className="accent-blue-500"
            />
            <span className="flex-1" data-selectable="true">{option}</span>
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

export default YesNoNotGiven;