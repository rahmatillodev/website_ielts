import React, { useState, useEffect, useMemo } from 'react';
import { Check } from 'lucide-react';
import { useAppearance } from '@/contexts/AppearanceContext';
import { FaRegBookmark, FaBookmark } from 'react-icons/fa';
import parse from 'html-react-parser';

const MultipleAnswers = ({ 
  question,
  groupQuestions = [],
  answers = {},
  onAnswerChange,
  mode = 'test',
  reviewData = {},
  showCorrectAnswers = true,
  bookmarks = new Set(),
  toggleBookmark = () => {}
}) => {
  const appearance = useAppearance();
  const themeColors = appearance.themeColors;
  const isReviewMode = mode === 'review';

  // Get question data
  const questionId = question.id; // Group-level ID for answer storage
  const questionRange = question.question_range || groupQuestions.length || 1; // Number of correct answers to select
  const instruction = question.instruction || '';
  const questionText = question.question_text || '';
  const options = question.options || [];

  // Get question number range for display (e.g., "27-28")
  const questionNumberRange = useMemo(() => {
    if (!groupQuestions || groupQuestions.length === 0) return '';
    const numbers = groupQuestions
      .map(q => q.question_number)
      .filter(num => num != null)
      .sort((a, b) => a - b);
    if (numbers.length === 0) return '';
    if (numbers.length === 1) return `${numbers[0]}`;
    return `${numbers[0]}-${numbers[numbers.length - 1]}`;
  }, [groupQuestions]);

  // Parse current answer (comma-separated option_keys like "A,B")
  const currentAnswer = answers[questionId] || '';
  const selectedOptionKeys = useMemo(() => {
    if (!currentAnswer) return [];
    return currentAnswer.split(',').map(key => key.trim().toUpperCase()).filter(Boolean);
  }, [currentAnswer]);

  // Get correct answer option_keys from groupQuestions (normalized to uppercase)
  const correctOptionKeys = useMemo(() => {
    return groupQuestions
      .map(q => q.correct_answer?.toString().trim().toUpperCase())
      .filter(Boolean);
  }, [groupQuestions]);

  // Create option key to option object map
  const optionKeyMap = useMemo(() => {
    const map = new Map();
    options.forEach(opt => {
      const key = (opt.option_key || opt.letter || '').toString().trim().toUpperCase();
      if (key) {
        map.set(key, opt);
      }
    });
    return map;
  }, [options]);

  // Sort options by option_key/letter
  const sortedOptions = useMemo(() => {
    return [...options].sort((a, b) => {
      const keyA = (a.option_key || a.letter || '').toString().trim().toUpperCase();
      const keyB = (b.option_key || b.letter || '').toString().trim().toUpperCase();
      return keyA.localeCompare(keyB);
    });
  }, [options]);

  // Handle option toggle
  const toggleOption = (optionKey) => {
    if (isReviewMode) return; // Don't allow changes in review mode

    const key = optionKey.toString().trim().toUpperCase();
    let newSelectedKeys;

    if (selectedOptionKeys.includes(key)) {
      // Remove if already selected (undo functionality)
      newSelectedKeys = selectedOptionKeys.filter(k => k !== key);
    } else {
      // Add if not at limit
      if (selectedOptionKeys.length < questionRange) {
        newSelectedKeys = [...selectedOptionKeys, key];
      } else {
        // If at limit, automatically replace first selected (IELTS behavior)
        // This enforces the selection limit
        newSelectedKeys = [...selectedOptionKeys.slice(1), key];
      }
    }

    // Store as comma-separated string (order doesn't matter for checking)
    const answerValue = newSelectedKeys.join(',');
    onAnswerChange(questionId, answerValue);
  };

  // Check if option is correct (for review mode)
  const isOptionCorrect = (optionKey) => {
    return correctOptionKeys.includes(optionKey.toString().trim().toUpperCase());
  };

  // Get review data for individual questions that match this option
  const getQuestionReviewForOption = (optionKey) => {
    const key = optionKey.toString().trim().toUpperCase();
    // Find questions that have this option as correct answer
    const matchingQuestions = groupQuestions.filter(q => {
      const correctKey = q.correct_answer?.toString().trim().toUpperCase();
      return correctKey === key;
    });
    
    // Check review data for these questions
    for (const question of matchingQuestions) {
      const questionId = question.id;
      const questionNumber = question.question_number;
      const review = reviewData[questionId] || reviewData[questionNumber] || {};
      if (review.hasOwnProperty('isCorrect')) {
        return review;
      }
    }
    return null;
  };

  // Check if option was selected and correct/incorrect (for review mode)
  const getOptionReviewStatus = (optionKey) => {
    if (!isReviewMode) return null;
    
    const key = optionKey.toString().trim().toUpperCase();
    const wasSelected = selectedOptionKeys.includes(key);
    const isCorrect = isOptionCorrect(key);
    const questionReview = getQuestionReviewForOption(key);

    // Use question review data if available, otherwise infer from correctness
    if (questionReview) {
      if (wasSelected && questionReview.isCorrect) return 'correct';
      if (wasSelected && !questionReview.isCorrect) return 'incorrect';
      if (!wasSelected && questionReview.isCorrect && showCorrectAnswers) return 'missed';
    } else {
      // Fallback: infer from correctness
      if (wasSelected && isCorrect) return 'correct';
      if (wasSelected && !isCorrect) return 'incorrect';
      if (!wasSelected && isCorrect && showCorrectAnswers) return 'missed';
    }
    
    return null;
  };

  return (
    <div 
      className="space-y-6"
      style={{ color: themeColors.text }}
    >
      {/* Question Number Range Display - Shows grouped questions (e.g., "27-28") */}
      {questionNumberRange && (
        <div 
          className="flex items-center gap-2 mb-2 pb-2 border-b"
          style={{ 
            color: themeColors.text,
            borderColor: themeColors.border
          }}
        >
          <span className="text-sm font-semibold" style={{ color: themeColors.text }}>
            Questions {questionNumberRange}
          </span>
          <span className="text-xs" style={{ color: themeColors.text, opacity: 0.6 }}>•</span>
          <span className="text-xs" style={{ color: themeColors.text, opacity: 0.7 }}>
            Select {questionRange} {questionRange === 1 ? 'answer' : 'answers'}
          </span>
        </div>
      )}

      {/* Instruction */}
      {instruction && (
        <div 
          className="text-sm leading-relaxed mb-2"
          data-selectable="true"
          style={{ color: themeColors.text }}
        >
          {parse(instruction, { allowDangerousHtml: true })}
        </div>
      )}

      {/* Main Question Text */}
      {questionText && (
        <h3 
          className="text-lg font-semibold mb-4"
          data-selectable="true"
          style={{ color: themeColors.text }}
        >
          {parse(questionText, { allowDangerousHtml: true })}
        </h3>
      )}

      {/* Options List */}
      <div className="space-y-3">
        {sortedOptions.map((option) => {
          const optionKey = (option.option_key || option.letter || '').toString().trim().toUpperCase();
          const optionText = option.option_text || option.text || '';
          const isSelected = selectedOptionKeys.includes(optionKey);
          const reviewStatus = getOptionReviewStatus(optionKey);
          
          // Determine styling based on review status
          let borderColor = themeColors.border;
          let backgroundColor = themeColors.background;
          let textColor = themeColors.text;

          if (isReviewMode) {
            if (reviewStatus === 'correct') {
              borderColor = '#22c55e';
              backgroundColor = 'rgba(220, 252, 231, 0.3)';
            } else if (reviewStatus === 'incorrect') {
              borderColor = '#ef4444';
              backgroundColor = 'rgba(254, 226, 226, 0.3)';
            } else if (reviewStatus === 'missed') {
              borderColor = '#22c55e';
              backgroundColor = 'rgba(220, 252, 231, 0.1)';
            }
          } else if (isSelected) {
            borderColor = '#6366f1';
            backgroundColor = 'rgba(99, 102, 241, 0.1)';
          }

          return (
            <button
              key={option.id || optionKey}
              onClick={() => toggleOption(optionKey)}
              disabled={isReviewMode}
              className={`flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all duration-200 w-full ${
                isReviewMode ? 'cursor-default' : 'cursor-pointer hover:shadow-sm'
              }`}
              style={{
                borderColor,
                backgroundColor,
                color: textColor
              }}
            >
              {/* Checkbox Icon */}
              <div 
                className={`mt-0.5 shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                  isSelected 
                    ? reviewStatus === 'incorrect' 
                      ? 'bg-red-500 border-red-500' 
                      : 'bg-indigo-600 border-indigo-600'
                    : reviewStatus === 'missed'
                      ? 'bg-green-100 border-green-500'
                      : 'bg-white border-gray-300'
                }`}
              >
                {isSelected && (
                  <Check 
                    size={16} 
                    className={`stroke-[3px] ${
                      reviewStatus === 'incorrect' ? 'text-white' : 'text-white'
                    }`} 
                  />
                )}
                {reviewStatus === 'missed' && !isSelected && (
                  <Check 
                    size={16} 
                    className="text-green-600 stroke-[3px]" 
                  />
                )}
              </div>

              {/* Option Key and Text */}
              <div className="flex gap-2 flex-1">
                <span className={`font-bold ${isSelected ? 'text-indigo-700' : 'text-gray-500'}`}>
                  {optionKey}.
                </span>
                <span className={`font-medium ${isSelected ? 'text-indigo-900' : 'text-gray-700'}`}>
                  {parse(optionText, { allowDangerousHtml: true })}
                </span>
              </div>

              {/* Review Status Indicators */}
              {isReviewMode && reviewStatus === 'correct' && (
                <span className="text-xs text-green-700 font-medium">Correct</span>
              )}
              {isReviewMode && reviewStatus === 'incorrect' && (
                <span className="text-xs text-red-700 font-medium">Incorrect</span>
              )}
              {isReviewMode && reviewStatus === 'missed' && (
                <span className="text-xs text-green-600 font-medium">Correct Answer</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Info - Real-time selection indicator */}
      <div className="flex justify-between items-center text-sm pt-2 border-t" style={{ 
        color: themeColors.text,
        borderColor: themeColors.border 
      }}>
        <div className="flex items-center gap-2">
          <p className="text-sm">
            <span className="font-bold" style={{ color: '#6366f1' }}>
              {selectedOptionKeys.length}
            </span>
            <span className="text-gray-500 mx-1">out of</span>
            <span className="font-semibold">{questionRange}</span>
            <span className="text-gray-500 ml-1">
              {selectedOptionKeys.length === 1 ? 'selected' : 'selected'}
            </span>
          </p>
        </div>
        {!isReviewMode && selectedOptionKeys.length === questionRange && (
          <span className="text-green-500 font-medium flex items-center gap-1">
            <Check size={14} /> Complete
          </span>
        )}
        {!isReviewMode && selectedOptionKeys.length > 0 && selectedOptionKeys.length < questionRange && (
          <span className="text-amber-500 font-medium text-xs">
            Select {questionRange - selectedOptionKeys.length} more
          </span>
        )}
      </div>
    </div>
  );
};

export default MultipleAnswers;
