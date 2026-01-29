import React, { useMemo } from "react";
import { getOptionValue } from "../../store/optionUtils";
import { FaRegBookmark, FaBookmark } from "react-icons/fa";
import { useAppearance } from "@/contexts/AppearanceContext";
import parse from "html-react-parser"; 

/**
 * Map - Renders a map question type with image and table matching interface
 *  example:
 * - Uses _question?.options as the answer option source (array of option objects)
 * - Each groupQuestion corresponds to a row; options must be joined with columns from _question.options for table alignment
 *  {
 *  _question: {
 *    options: [
 *      {
 *        option_key: "A",
 *        option_text: "Paris",
 *        is_correct: true // true or false
 *        question_id: "123", // the question id
 *        question_number: null, // the question number
 *        id: "123", // the option id
 *      }
 *    ]
 *  }
 * }
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
  console.log(_question.opt);
  // Always use _question.options for column options
  const columnOptions = useMemo(() => {
    const qOpts = _question?.options || [];
    const uniqueMap = new Map();
    for (const opt of qOpts) {
      const key = (opt.letter || opt.option_key || opt.option_text || '').toUpperCase();
      if (key && !uniqueMap.has(key)) uniqueMap.set(key, opt);
    }
    return Array.from(uniqueMap.values()).sort((a, b) => {
      const la = a.letter || a.option_key || '';
      const lb = b.letter || b.option_key || '';
      return la.localeCompare(lb, undefined, { sensitivity: 'base' });
    });
  }, [_question]);
  

  // Table questions sorted by question_number
  const questions = useMemo(() => {
    if (!Array.isArray(groupQuestions)) return [];
    console.log(groupQuestions);
    return [...groupQuestions].sort((a, b) => {
      const aNum = a.question_number ?? 0;
      const bNum = b.question_number ?? 0;
      return aNum - bNum;
    });
  }, [groupQuestions]);

  const isReviewMode = mode === 'review';
  const appearance = useAppearance();
  const themeColors = appearance.themeColors;

  // Find correct answer for a question (by correct_answer on question or by is_correct option in _question.options)
  const getCorrectAnswerForQuestion = (question) => {
    if (question && question.correct_answer) {
      return question.correct_answer;
    }
    // Try _question.options (shared among all rows)
    if (_question?.options && Array.isArray(_question.options)) {
      // Look for an option that links to this question via question_id
      let correct = _question.options.find(
        opt => opt.is_correct === true && (opt.question_id === question.id || opt.question_number === question.question_number)
      );
      // Fallback: if none are linked, just return first correct
      if (!correct) {
        correct = _question.options.find(opt => opt.is_correct === true);
      }
      if (correct) {
        return correct.letter || correct.option_text || getOptionValue(correct);
      }
    }
    return '';
  };

  // Get the option from _question.options that matches this column and question row
  const getQuestionColumnOption = (question, colOption) => {
    if (!_question?.options) return null;
    console.log(question);
    console.log(colOption);
    // Try to match both question and column via option.question_id + letter/option_key/option_text
    return _question.options.find(opt => {
      // console.log(opt.question_id === question.id);
      // Must match to this row (question id), and column (letter/option_key/option_text)
      const matchesRow = opt.question_id === question.question_id;
      const matchesCol = (
        (colOption.letter && (opt.letter || '').toUpperCase() === (colOption.letter || '').toUpperCase()) ||
        (colOption.option_key && (opt.option_key || '').toUpperCase() === (colOption.option_key || '').toUpperCase()) ||
        (colOption.option_text && (opt.option_text || '').toUpperCase() === (colOption.option_text || '').toUpperCase())
      );
      return matchesRow && matchesCol;
    });
  };

  // Is selected: answers[question_number] matches column option value
  const isOptionSelected = (questionNumber, columnOptionValue) => {
    const review = reviewData[questionNumber] || {};
    const answer = review.userAnswer || answers[questionNumber] || '';
    return answer === columnOptionValue || answer === (columnOptionValue || '').toLowerCase();
  };

  // Get review data for a question
  const getQuestionReview = (questionNumber) => reviewData[questionNumber] || {};

  // Selection handler: value is either columnOption.letter or getOptionValue(colOption)
  const handleOptionChange = (questionNumber, columnOptionValue) => {
    if (mode !== 'review') {
      onAnswerChange(questionNumber, columnOptionValue);
    }
  };

  if (!questions || questions.length === 0) return null;

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
          {parse(instruction, { allowDangerousHtml: true })}
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
                  style={{ color: themeColors.text, borderColor: themeColors.border }}
                >
                  Question
                </th>
                {/* Option columns */}
                {columnOptions.map((colOpt) => {
                  const letter = colOpt.letter || colOpt.option_key || colOpt.option_text;
                  const optionText = colOpt.option_text || '';
                  return (
                    <th
                      key={colOpt.id || letter}
                      className="px-4 py-3 text-center font-semibold text-gray-700"
                      title={optionText}
                      style={{
                        backgroundColor: themeColors.background,
                        color: themeColors.text,
                      }}
                    >
                      {letter}
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
                    {/* Row Question */}
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
                    {/* Options */}
                    {columnOptions.map((colOpt) => {
                      // Value to store as answer: usually the letter/option_key.
                      const colValue = colOpt.letter || colOpt.option_key || colOpt.option_text;
                      // See if this row has an option for this column (lookup by question_id and letter/etc)
                      const optInRow = getQuestionColumnOption(q, colOpt);
                      // If missing, render empty for vertical alignment
                      if (!optInRow) {
                        return (
                          <td
                            key={`${q.id}-${colOpt.id || colValue}`}
                            className="px-4 py-3 text-center"
                            style={{ backgroundColor: themeColors.background, color: themeColors.text }}
                          ></td>
                        );
                      }
                      const isSelected = isOptionSelected(qNumber, colValue);
                      const isCorrectOption = optInRow.is_correct === true;
                      const isCorrectAnswerMatch = isReviewMode &&
                        (colValue?.toLowerCase() === (correctAnswer || '').toLowerCase().trim() ||
                        optInRow.correct_answer?.toLowerCase() === (correctAnswer || '').toLowerCase().trim());
                      return (
                        <td
                          key={`${q.id}-${optInRow.id || colValue}`}
                          className={`px-4 py-3 text-center ${
                            isSelected && showCorrect ? 'bg-green-100' :
                            isSelected && showWrong ? 'bg-red-400' :
                            (isCorrectOption || isCorrectAnswerMatch) && isReviewMode && !isSelected ? 'bg-green-50' : ''
                          }`}
                          style={{
                            backgroundColor: themeColors.background,
                            color: themeColors.text,
                          }}
                        >
                          <label className={`flex items-center justify-center ${mode === 'review' ? 'cursor-default' : 'cursor-pointer'}`}>
                            <input
                              type="radio"
                              name={`map-q-${qNumber}`}
                              value={colValue}
                              checked={isSelected}
                              onChange={() => handleOptionChange(qNumber, colValue)}
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
