import React from "react";
import { sortOptionsByLetter } from "../../store/optionUtils";

/**
 * Table - Renders table-type questions with wrong answers from options table
 * and correct answers from questions table
 * Options are at group level (not per question)
 * Format: Questions in rows, option letters (A-F) as column headers
 */
const Table = ({ question: _question, groupQuestions = [], answers = {}, onAnswerChange, options = [], mode = 'test', reviewData = {}, showCorrectAnswers = true }) => {
  // Sort options from options table by letter (A, B, C, D, E, F, etc.)
  const sortedOptions = React.useMemo(() => {
    return sortOptionsByLetter(options);
  }, [options]);

  // Sort group questions by question_number
  const sortedQuestions = React.useMemo(() => {
    return [...groupQuestions].sort((a, b) => {
      const aNum = a.question_number ?? 0;
      const bNum = b.question_number ?? 0;
      return aNum - bNum;
    });
  }, [groupQuestions]);

  const isReviewMode = mode === 'review';

  // Check if an option letter is selected for a question
  const isOptionSelected = (questionNumber, optionLetter) => {
    const review = reviewData[questionNumber] || {};
    const answer = review.userAnswer || answers[questionNumber] || '';
    // Match by letter or by option value
    return answer === optionLetter || answer === optionLetter.toLowerCase();
  };

  // Get review info for a question
  const getQuestionReview = (questionNumber) => {
    return reviewData[questionNumber] || {};
  };

  // Handle option selection
  const handleOptionChange = (questionNumber, optionLetter) => {
    if (mode !== 'review') {
      onAnswerChange(questionNumber, optionLetter);
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-700">
        <thead>
          <tr className="bg-gray-100 dark:bg-gray-800">
            <th className="border border-gray-300 dark:border-gray-700 px-4 py-3 text-left font-semibold text-gray-900 dark:text-gray-100">
              {/* Empty header for question column */}
            </th>
            {sortedOptions.map((option) => {
              const optionLetter = option.letter || '';
              return (
                <th
                  key={option.id || optionLetter}
                  className="border border-gray-300 dark:border-gray-700 px-4 py-3 text-center font-semibold text-gray-900 dark:text-gray-100"
                >
                  {optionLetter}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedQuestions.map((q) => {
            const qNumber = q.question_number || q.id;
            const questionText = q.question_text || q.text || '';
            const review = getQuestionReview(qNumber);
            const isCorrect = review.isCorrect;
            const correctAnswer = review.correctAnswer || '';
            const showWrong = isReviewMode && !isCorrect;
            const showCorrect = isReviewMode && isCorrect;

            return (
              <tr
                key={q.id || qNumber}
                className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                  showWrong ? 'bg-red-50' : showCorrect ? 'bg-green-50' : ''
                }`}
              >
                {/* Question Column */}
                <td className={`border border-gray-300 dark:border-gray-700 px-4 py-3 text-gray-900 dark:text-gray-100 ${showWrong ? 'bg-red-50' : showCorrect ? 'bg-green-50' : ''}`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{qNumber}.</span>
                    <span>{questionText}</span>
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
                </td>
                {/* Option Columns with Radio Buttons */}
                {sortedOptions.map((option) => {
                  const optionLetter = option.letter || '';
                  const isSelected = isOptionSelected(qNumber, optionLetter);
                  const isCorrectOption = isReviewMode && optionLetter.toLowerCase() === correctAnswer.toLowerCase().trim();
                  
                  return (
                    <td
                      key={option.id || optionLetter}
                      className={`border border-gray-300 dark:border-gray-700 px-4 py-3 text-center ${
                        isSelected && showCorrect ? 'bg-green-100' : 
                        isSelected && showWrong ? 'bg-red-100' : 
                        isCorrectOption && isReviewMode ? 'bg-green-50' : ''
                      }`}
                    >
                      <label className={`flex items-center justify-center ${mode === 'review' ? 'cursor-default' : 'cursor-pointer'}`}>
                        <input
                          type="radio"
                          name={`table-q-${qNumber}`}
                          value={optionLetter}
                          checked={isSelected}
                          onChange={() => handleOptionChange(qNumber, optionLetter)}
                          disabled={mode === 'review'}
                          className={`w-4 h-4 ${
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default Table;

