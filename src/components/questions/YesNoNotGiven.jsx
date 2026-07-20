import React from "react";
import QuestionActionIcons from "./QuestionActionIcons";

const YesNoNotGiven = ({ question, answer, onAnswerChange, mode = 'test', reviewData = {}, showCorrectAnswers = true, bookmarks = new Set(), toggleBookmark = () => {}, onReport = () => {} }) => {
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
  // Options are fixed uppercase strings; normalize the stored answer so casing/whitespace
  // differences (e.g. "Yes", " not given") still match.
  const normalize = (v) => (v ?? '').toString().trim().toUpperCase();

  return (
    <div className="space-y-2 group relative">
      {/* Bookmark + report actions */}
      <QuestionActionIcons
        className="absolute right-0 -top-10"
        isBookmarked={isBookmarked}
        onToggleBookmark={() => toggleBookmark(questionNumber)}
        isReviewMode={isReviewMode}
        onReport={() => onReport(question)}
      />
      {["YES", "NO", "NOT GIVEN"].map((option) => {
        const isSelected = normalize(userAnswer || answer) === normalize(option);
        const isCorrectOption = isReviewMode && normalize(option) === normalize(correctAnswer);
        
        return (
          <label
            key={option}
            className={`flex gap-3 items-center p-2 rounded-md transition-all ${
              mode === 'review' ? 'cursor-default' : 'cursor-pointer'
            } ${
              isSelected && showCorrect
                ? "bg-green-100 border-2 border-green-500 text-green-900"
                : isSelected && showWrong
                ? "bg-danger-100 border-2 border-danger-500 text-danger-900"
                : isCorrectOption && isReviewMode && showCorrectAnswers
                ? "bg-green-50 border border-green-300 text-green-700"
                : isSelected
                ? "bg-brand-200 dark:bg-brand-900 text-brand-900 dark:text-brand-300"
                : "hover:bg-brand-100 dark:hover:bg-brand-800 hover:text-brand-800 dark:hover:text-brand-200"
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
              className="accent-brand-500"
            />
            <span className="flex-1" data-selectable="true">{option}</span>
            {isSelected && showCorrect && (
              <span className="text-xs text-green-700 font-medium">Correct</span>
            )}
            {isSelected && showWrong && (
              <span className="text-[10px] bg-danger-500 text-white px-2 py-0.5 rounded-sm">
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