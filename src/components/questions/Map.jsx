import React, { useMemo } from "react";
import { getOptionValue } from "../../store/optionUtils";
import { FaRegBookmark, FaBookmark } from "react-icons/fa";
import { useAppearance } from "@/contexts/AppearanceContext";

/**
 * Map - Renders a map question type with image and table matching interface
 * 
 * Data Structure:
 * - Main Question (question group) contains image_url and instruction
 * - Multiple questions (rows) that need to be matched to column letters
 * - Options table with column letters (A, B, C, D, etc.) and is_correct flags
 * 
 * Format:
 * - Instructions text
 * - Map image (from question.image_url)
 * - Table with:
 *   - First column: question_number and question_text
 *   - Subsequent columns: Radio buttons for options (A, B, C, etc.)
 */
const TypeMap = ({ 
  question: _question, 
  groupQuestions = [], 
  answers = {}, 
  onAnswerChange, 
  options = [], 
  mode = 'test', 
  reviewData = {}, 
  showCorrectAnswers = true, 
  bookmarks = new Set(), 
  toggleBookmark = () => {} 
}) => {
  // Prepare unified table structure with all unique options for column headers
  const tableData = useMemo(() => {
    if (!groupQuestions || groupQuestions.length === 0) {
      return { questions: [], columnOptions: [] };
    }

    // Collect all unique options from all questions to create unified column headers
    // This ensures perfect vertical alignment (all Option A columns align, etc.)
    const allUniqueOptionsMap = new Map();
    
    // Iterate through all questions and collect their nested options
    groupQuestions.forEach(q => {
      // Each question has nested options: q.options contains options where option.question_id === q.id
      if (q.options && Array.isArray(q.options)) {
        q.options.forEach(opt => {
          const optText = opt.option_text || '';
          // Use option_text as key to ensure unique columns
          if (optText && !allUniqueOptionsMap.has(optText)) {
            allUniqueOptionsMap.set(optText, opt);
          }
        });
      }
    });

    // Convert to sorted array for consistent column ordering
    // Sort by letter if available, otherwise by option_text
    const columnOptions = Array.from(allUniqueOptionsMap.values())
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
  const appearance = useAppearance();
  const themeColors = appearance.themeColors;

  // Get correct answer for a question from question object or its nested options
  const getCorrectAnswerForQuestion = (question) => {
    // First, try to get from question object's correct_answer field
    if (question && question.correct_answer) {
      return question.correct_answer;
    }
    
    // Fallback: find option with is_correct = true in question's nested options array
    if (question && question.options && Array.isArray(question.options)) {
      const correctOption = question.options.find(opt => opt.is_correct === true);
      if (correctOption) {
        // Use correct_answer from option if available, otherwise use option_text
        return correctOption.correct_answer || getOptionValue(correctOption);
      }
    }
    
    return '';
  };

  // Get the option from a question's nested options array that matches a specific option_text
  const getQuestionOption = (question, optionText) => {
    if (!question || !question.options || !Array.isArray(question.options)) {
      return null;
    }
    return question.options.find(opt => 
      (opt.option_text || '').toLowerCase() === (optionText || '').toLowerCase()
    );
  };

  // Check if an option is selected for a question (match by option_text)
  const isOptionSelected = (questionNumber, optionValue) => {
    const review = reviewData[questionNumber] || {};
    const answer = review.userAnswer || answers[questionNumber] || '';
    // Match by option_text (not letter)
    return answer === optionValue || answer === optionValue.toLowerCase();
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

  // Render component
  if (!tableData.questions || tableData.questions.length === 0) {
    return null;
  }

  const { questions, columnOptions } = tableData;
  const instruction = _question?.instruction || '';
  const imageUrl = _question?.image_url || '';

  return (
    <div className="space-y-6 mb-6">
      {/* Instructions */}
      {instruction && (
        <div 
          className="text-sm leading-relaxed"
          data-selectable="true"
          style={{ color: themeColors.text }}
        >
          {instruction}
        </div>
      )}

      {/* Map Image */}
      {imageUrl && (
        <div className="mb-6">
          <img 
            src={imageUrl} 
            alt="Map for labeling"
            className="w-full max-w-full h-auto object-contain rounded-lg border"
            style={{ 
              borderColor: themeColors.border,
              maxHeight: '500px'
            }}
            onError={(e) => {
              e.target.style.display = 'none';
              console.error('Failed to load map image:', imageUrl);
            }}
          />
        </div>
      )}

      {/* Question Table */}
      <div className="overflow-x-auto">
        <div 
          className="rounded-lg shadow-sm border overflow-hidden" 
          style={{ 
            backgroundColor: themeColors.background,
            borderColor: themeColors.border 
          }}
        >
          <table className="min-w-full border-collapse">
            <thead>
              <tr style={{ backgroundColor: themeColors.background }}>
                {/* First column header: Question */}
                <th 
                  className="px-4 py-3 text-left font-semibold text-gray-700 border-r"
                  style={{ 
                    color: themeColors.text,
                    borderColor: themeColors.border 
                  }}
                >
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
                      style={{ 
                        backgroundColor: themeColors.background, 
                        color: themeColors.text 
                      }}
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
                    className={`border-t transition-colors group ${
                      showWrong ? 'bg-red-50' : showCorrect ? 'bg-green-50' : 'bg-white hover:bg-gray-50'
                    }`}
                    style={{ borderColor: themeColors.border }}
                  >
                    {/* First Column: Question Number and Question Text */}
                    <td 
                      className={`px-4 py-3 text-gray-900 border-r ${
                        showWrong ? 'bg-red-50' : showCorrect ? 'bg-green-50' : ''
                      }`} 
                      style={{ 
                        backgroundColor: themeColors.background, 
                        color: themeColors.text,
                        borderColor: themeColors.border 
                      }}
                    >
                      <div className="flex gap-2 items-center justify-between">
                        <div className="flex gap-2">
                          <span className="font-medium">{qNumber}.</span>
                          <span data-selectable="true">{questionText}</span>
                          {showCorrect && (
                            <span className="text-xs text-green-700 font-medium ml-2">Correct</span>
                          )}
                          {showWrong && correctAnswer && showCorrectAnswers && (
                            <span className="text-xs text-green-600 font-medium ml-2 flex whitespace-nowrap">
                              Correct: {correctAnswer}
                            </span>
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
                    {columnOptions.map((columnOption) => {
                      const columnOptionText = columnOption.option_text || '';
                      const columnOptionLetter = columnOption.letter || '';
                      
                      // Find if this question has an option matching this column's option_text
                      const questionOption = getQuestionOption(q, columnOptionText);
                      
                      // If this question doesn't have this option, render empty cell for perfect alignment
                      if (!questionOption) {
                        return (
                          <td
                            key={`${q.id}-${columnOption.id || columnOptionLetter || columnOptionText}`}
                            className="px-4 py-3 text-center"
                            style={{ 
                              backgroundColor: themeColors.background, 
                              color: themeColors.text 
                            }}
                          >
                            {/* Empty cell - question doesn't have this option, maintaining column alignment */}
                          </td>
                        );
                      }
                      
                      // This question has this option, render radio button
                      const optionValue = getOptionValue(questionOption);
                      const isSelected = isOptionSelected(qNumber, optionValue);
                      const isCorrectOption = questionOption.is_correct === true;
                      const isCorrectAnswerMatch = isReviewMode && 
                        (optionValue.toLowerCase() === (correctAnswer || '').toLowerCase().trim() ||
                         questionOption.correct_answer?.toLowerCase() === (correctAnswer || '').toLowerCase().trim());
                      
                      return (
                        <td
                          key={`${q.id}-${questionOption.id || columnOptionLetter || columnOptionText}`}
                          className={`px-4 py-3 text-center ${
                            isSelected && showCorrect ? 'bg-green-100' : 
                            isSelected && showWrong ? 'bg-red-400' : 
                            (isCorrectOption || isCorrectAnswerMatch) && isReviewMode && !isSelected ? 'bg-green-50' : ''
                          }`}
                          style={{ 
                            backgroundColor: themeColors.background, 
                            color: themeColors.text 
                          }}
                        >
                          <label className={`flex items-center justify-center ${mode === 'review' ? 'cursor-default' : 'cursor-pointer'}`}>
                            <input
                              type="radio"
                              name={`map-q-${qNumber}`}
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
    </div>
  );
};

export default TypeMap;

