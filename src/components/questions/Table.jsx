import React, { useMemo } from "react";
import { getOptionValue } from "../../store/optionUtils";
import { FaRegBookmark, FaBookmark } from "react-icons/fa";
import { useAppearance } from "@/contexts/AppearanceContext";

/**
 * Table - Renders a unified table for table-type questions with group-level options
 * 
 * Data Structure:
 * - Main Question (question group) contains multiple questions
 * - All questions share the same group-level options (question_number is null in options table)
 * - Each question has correct_answer stored directly (e.g., "A", "B", "C")
 * - Options table: id, question_id, option_text, is_correct (question_number is null)
 * 
 * Format: Single unified table with:
 * - First column: question_number and question_text
 * - Subsequent columns: Radio buttons for options (A, B, C, etc.)
 * - Perfect vertical alignment: all Option A columns align, all Option B columns align, etc.
 */
const Table = ({ question: _question, groupQuestions = [], answers = {}, onAnswerChange, options = [], mode = 'test', reviewData = {}, showCorrectAnswers = true, bookmarks = new Set(), toggleBookmark = () => {} }) => {
  // Prepare unified table structure with group-level options for column headers
  const tableData = useMemo(() => {
    if (!groupQuestions || groupQuestions.length === 0) {
      return { questions: [], columnOptions: [] };
    }

    // Use group-level options directly (passed via options prop)
    // These are shared by all questions in the group
    const columnOptions = (options || [])
      .sort((a, b) => {
        if (a.letter && b.letter) {
          return a.letter.localeCompare(b.letter);
        }
        const aText = a.option_text || '';
        const bText = b.option_text || '';
        return aText.localeCompare(bText);
      });

    // Sort questions by question_number
    const sortedQuestions = [...groupQuestions].sort((a, b) => {
      const aNum = a.question_number ?? 0;
      const bNum = b.question_number ?? 0;
      return aNum - bNum;
    });

    return {
      questions: sortedQuestions,
      columnOptions: columnOptions
    };
  }, [groupQuestions, options]);

  const isReviewMode = mode === 'review';

  // Get correct answer for a question from question object's correct_answer field
  const getCorrectAnswerForQuestion = (question) => {
    // Correct answer is stored directly on the question object
    if (question && question.correct_answer) {
      return question.correct_answer;
    }
    return '';
  };

  // Get the option from group-level options that matches a specific option_text or letter
  const getGroupOption = (optionTextOrLetter) => {
    if (!options || !Array.isArray(options)) {
      return null;
    }
    return options.find(opt => {
      const optText = (opt.option_text || '').toLowerCase();
      const optLetter = (opt.letter || '').toLowerCase();
      const searchValue = (optionTextOrLetter || '').toLowerCase();
      return optText === searchValue || optLetter === searchValue;
    });
  };

  // Check if an option is selected for a question (match by option_text or letter)
  const isOptionSelected = (questionNumber, optionValue) => {
    const review = reviewData[questionNumber] || {};
    const answer = review.userAnswer || answers[questionNumber] || '';
    // Match by option_text or letter (case-insensitive)
    const normalizedAnswer = (answer || '').toString().toLowerCase().trim();
    const normalizedValue = (optionValue || '').toString().toLowerCase().trim();
    return normalizedAnswer === normalizedValue;
  };

  // Get review info for a question
  const getQuestionReview = (questionNumber) => {
    return reviewData[questionNumber] || {};
  };

  // Handle option selection
  const handleOptionChange = (questionNumber, optionValue) => {
    if (mode !== 'review') {
      // Store option_text as the answer value
      onAnswerChange(questionNumber, optionValue);
    }
  };

  // Render single unified table
  if (!tableData.questions || tableData.questions.length === 0) {
    return null;
  }

  const { questions, columnOptions } = tableData;

  const appearance = useAppearance();
  const themeColors = appearance.themeColors;

  return (
    <div className="overflow-x-auto mb-6">
      <div className="rounded-lg shadow-sm border border-gray-200 overflow-hidden" style={{ backgroundColor: themeColors.background }}>
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-gray-50" style={{ backgroundColor: themeColors.background }}>
              {/* First column header: Question */}
              <th className="px-4 py-3 text-left font-semibold text-gray-700 border-r border-gray-200" style={{ color: themeColors.text }}>
                Question
              </th>
              {/* Subsequent column headers: Option letters (A, B, C, etc.) */}
              {columnOptions.map((option) => {
                const optionLetter = option.letter || '';
                const optionText = option.option_text || '';
                return (
                  <th
                    key={option.id || optionLetter || optionText}
                    className="px-4 py-3 text-center font-semibold text-gray-700"
                    title={optionText} // Show option text on hover
                    style={{ backgroundColor: themeColors.background, color: themeColors.text }}
                  >
                    {optionLetter}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {questions.map((q) => {
              const qNumber = q.question_number || q.id;
              const questionText = q.question_text || q.text || '';
              const review = getQuestionReview(qNumber);
              const isCorrect = review.isCorrect;
              
              // Get correct answer from review data or from question's nested options
              const correctAnswerFromReview = review.correctAnswer || '';
              const correctAnswerFromQuestion = getCorrectAnswerForQuestion(q);
              const correctAnswer = correctAnswerFromReview || correctAnswerFromQuestion;
              const showWrong = isReviewMode && !isCorrect;
              const showCorrect = isReviewMode && isCorrect;

              const isBookmarked = bookmarks.has(qNumber);

              return (
                <tr
                  key={q.id || qNumber}
                  className={`border-t border-gray-200 transition-colors group ${
                    showWrong ? 'bg-red-50' : showCorrect ? 'bg-green-50' : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  {/* First Column: Question Number and Question Text */}
                  <td className={`px-4 py-3 text-gray-900 border-r border-gray-200 ${showWrong ? 'bg-red-50' : showCorrect ? 'bg-green-50' : ''}`} style={{ backgroundColor: themeColors.background, color: themeColors.text }}>
                    <div className="flex gap-2 items-center justify-between">
                      <div className="flex gap-2">
                        <span className="font-medium">{qNumber}.</span>
                        <span data-selectable="true">{questionText}</span>
                        {showCorrect && (
                          <span className="text-xs text-green-700 font-medium ml-2">Correct</span>
                        )}
                        {/* {showWrong && (
                          <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-sm ml-2">
                            Wrong
                          </span>
                        )} */}
                        {showWrong && correctAnswer && showCorrectAnswers && (
                          <span className="text-xs text-green-600 font-medium ml-2 flex whitespace-nowrap">Correct: {correctAnswer}</span>
                        )}
                      </div>
                      {/* Bookmark Icon */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleBookmark(qNumber);
                        }}
                        className={`ml-2 transition-all ${
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
                    </div>
                  </td>
                  
                  {/* Subsequent Columns: Radio Buttons for Options */}
                  {/* All questions share the same group-level options */}
                  {columnOptions.map((columnOption) => {
                    // Use getOptionValue for consistency (returns option_text)
                    const optionValue = getOptionValue(columnOption);
                    const columnOptionLetter = columnOption.letter || '';
                    const isSelected = isOptionSelected(qNumber, optionValue);
                    
                    // Check if this option matches the correct answer for this question
                    // correct_answer is stored as a letter (e.g., "A"), so match by letter or option_text
                    const isCorrectAnswerMatch = isReviewMode && 
                      (optionValue.toLowerCase() === (correctAnswer || '').toLowerCase().trim() ||
                       columnOptionLetter.toLowerCase() === (correctAnswer || '').toLowerCase().trim());
                    
                    return (
                      <td
                        key={`${q.id}-${columnOption.id || columnOptionLetter || columnOptionText}`}
                        className={`px-4 py-3 text-center ${
                          isSelected && showCorrect ? 'bg-green-100' : 
                          isSelected && showWrong ? 'bg-red-400' : 
                          isCorrectAnswerMatch && isReviewMode && !isSelected ? 'bg-green-50' : ''
                        }`}
                        style={{ backgroundColor: themeColors.background, color: themeColors.text }}
                      >
                        <label className={`flex items-center justify-center ${mode === 'review' ? 'cursor-default' : 'cursor-pointer'}`}>
                          <input
                            type="radio"
                            name={`table-q-${qNumber}`}
                            value={optionValue}
                            checked={isSelected}
                            onChange={() => handleOptionChange(qNumber, optionValue)}
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
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Table;

