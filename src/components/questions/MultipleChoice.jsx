import React from "react";
import { sortOptionsByLetter, getOptionDisplayText, getOptionValue, isOptionSelected } from "../../store/optionUtils";

const MultipleChoice = ({ question, answer, onAnswerChange, options = [], mode = 'test', reviewData = {}, showCorrectAnswers = true }) => {
  const questionNumber = question.question_number || question.id;
  
  // Sort options by letter (A, B, C, D, etc.)
  const sortedOptions = sortOptionsByLetter(options);
  
  const isReviewMode = mode === 'review';
  const review = reviewData[questionNumber] || {};
  const isCorrect = review.isCorrect;
  const correctAnswer = review.correctAnswer || '';
  const userAnswer = review.userAnswer || answer;
  const showWrong = isReviewMode && !isCorrect;
  const showCorrect = isReviewMode && isCorrect;

  return (
    <div className="space-y-2">
      {sortedOptions.map((option) => {
        const displayText = getOptionDisplayText(option);
        const optionValue = getOptionValue(option);
        const isSelected = isOptionSelected(option, answer || userAnswer);
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
                  onAnswerChange(questionNumber, optionValue);
                }
              }}
              disabled={mode === 'review'}
              className="accent-blue-500"
            />
            <span className="flex-1">{displayText}</span>
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

