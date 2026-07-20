import React from "react";
import { sortOptionsByLetter, getOptionDisplayText, getOptionValue, isOptionSelected } from "../../store/optionUtils";
import QuestionActionIcons from "./QuestionActionIcons";

const MatchingHeadings = ({ question, answer, onAnswerChange, options = [], mode = 'test', reviewData = {}, showCorrectAnswers = true, bookmarks = new Set(), toggleBookmark = () => {}, onReport = () => {} }) => {
  const sortedOptions = sortOptionsByLetter(options);
  
  // Get question number (use question_number from individual question)
  const questionId = question.id;
  const questionNumber = question.question_number || question.id;
  const questionText = question.question_text || question.text || '';
  const isReviewMode = mode === 'review';
  const isBookmarked = bookmarks.has(questionId) || bookmarks.has(questionNumber);
  // Try both question.id (UUID) and question_number for review data lookup
  const review = reviewData[questionId] ||
                 reviewData[String(questionId)] ||
                 reviewData[questionNumber] ||
                 reviewData[String(questionNumber)] ||
                 {};
  const correctAnswer = review.correctAnswer || '';
  const userAnswer = review.userAnswer || answer;
  const showWrong = isReviewMode && Object.prototype.hasOwnProperty.call(review, 'isCorrect') && review.isCorrect === false;
  const showCorrect = isReviewMode && review.isCorrect === true;
  // correctAnswer may be stored as the heading text OR its letter — normalize and match either.
  const normalize = (v) => (v ?? '').toString().trim().toLowerCase();

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden group relative">
      <div className="grid grid-cols-[1fr_auto] divide-x divide-gray-200">
        {/* Left: Question Text */}
        <div className={`p-4 relative ${showWrong ? 'bg-red-50 border-red-500' : showCorrect ? 'bg-green-50 border-green-500' : 'bg-white'} ${showWrong || showCorrect ? 'border-2' : ''}`}>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-gray-900 font-medium" data-selectable="true">
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
          {/* Bookmark + report actions */}
          <QuestionActionIcons
            className="absolute right-2 top-1/2 -translate-y-1/2"
            isBookmarked={isBookmarked}
            onToggleBookmark={() => toggleBookmark(questionNumber)}
            isReviewMode={isReviewMode}
            onReport={() => onReport(question)}
          />
        </div>
        
        {/* Right: Radio Buttons with letters from options */}
        <div className="p-4 bg-gray-50 flex items-center gap-3">
          {sortedOptions.map((option) => {
            const radioValue = getOptionValue(option);
            const optionLetter = option.letter || '';
            const isSelected = isOptionSelected(option, userAnswer || answer);
            const isCorrectOption = isReviewMode && (
              normalize(radioValue) === normalize(correctAnswer) ||
              (optionLetter && normalize(optionLetter) === normalize(correctAnswer))
            );
            
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
                    : isCorrectOption && isReviewMode && showCorrectAnswers
                    ? "border-green-400 bg-green-50 text-green-700"
                    : isSelected
                    ? "border-brand-600 bg-brand-50 text-brand-900"
                    : "border-gray-300 bg-white text-gray-700 hover:border-brand-400 hover:bg-brand-50"
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

