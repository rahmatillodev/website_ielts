import React from "react";
import { Input } from "@/components/ui/input";
import { FaRegBookmark, FaBookmark } from "react-icons/fa";
import parse from "html-react-parser"; 
const FillInTheBlank = ({ 
  question, 
  answer, 
  onAnswerChange, 
  mode = 'test',
  reviewData = {},
  showCorrectAnswers = true,
  bookmarks = new Set(), 
  toggleBookmark = () => {} 
}) => {
  const questionId = question.id; // Use question.id as primary key (UUID)
  const questionNumber = question.question_number || question.id; // For display
  const isBookmarked = bookmarks.has(questionId) || bookmarks.has(questionNumber);
  
  const isReviewMode = mode === 'review';
  // Check review data by questionId first, then fallback to questionNumber for backward compatibility
  const review = reviewData[questionId] || reviewData[questionNumber] || {};
  const isCorrect = review.isCorrect;
  const correctAnswer = review.correctAnswer || '';
  const showWrong = isReviewMode && review.hasOwnProperty('isCorrect') && !isCorrect;
  const showCorrect = isReviewMode && isCorrect;
  
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 group">
        <Input
          type="text"
          value={isReviewMode ? `[${questionNumber}] ${answer || ''}` : (answer || "")}
          onChange={(e) => {
            if (mode !== 'review') {
              // Use questionId (questions.id) as the answer key, fallback to questionNumber
              onAnswerChange(questionId || questionNumber, e.target.value);
            }
          }}
          placeholder="Enter your answer..."
          disabled={mode === 'review'}
          className={`w-full ${
            showWrong
              ? 'border-red-500 bg-red-50 text-red-600 focus-visible:ring-red-500'
              : showCorrect
              ? 'border-green-500 bg-green-50 text-green-700 focus-visible:ring-green-500'
              : ''
          } ${mode === 'review' ? 'cursor-not-allowed' : ''}`}
        />
        {/* Bookmark Icon */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleBookmark(questionId || questionNumber);
          }}
          className={`transition-all ${
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
        {/* Correct Answer - Only for fill_in_blank type, after bookmark */}
        {showWrong && correctAnswer && showCorrectAnswers && (
          <span className="text-sm text-green-600 font-semibold whitespace-nowrap">
            {correctAnswer}
          </span>
        )}
      </div>
      {question.instruction && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {parse(question.instruction, { allowDangerousHtml: true })}
        </p>
      )}
    </div>
  );
};

export default FillInTheBlank;

