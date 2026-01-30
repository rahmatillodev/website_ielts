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

  // Get review data for the group-level question
  // For multiple_answers, review data might be stored at group level or per individual question
  // All questions in the group share the same userAnswer (comma-separated like "A,B")
  const groupReview = reviewData[questionId] || 
                      reviewData[String(questionId)] ||
                      {};

  // If group-level review data not found, check individual questions in the group
  // (all questions in a multiple_answers group share the same answer)
  const individualQuestionReview = useMemo(() => {
    if (groupReview.userAnswer) return groupReview;
    
    // Check each question in the group for review data
    for (const q of groupQuestions) {
      const qId = q.id;
      const qNum = q.question_number;
      const review = reviewData[qId] || 
                     reviewData[String(qId)] ||
                     (qNum ? reviewData[qNum] : null) ||
                     (qNum ? reviewData[String(qNum)] : null);
      if (review && review.userAnswer) {
        return review;
      }
    }
    return null;
  }, [reviewData, groupQuestions, groupReview]);

  // Parse current answer (comma-separated option_keys like "A,B")
  // In review mode, prioritize reviewData.userAnswer, otherwise use answers prop
  const currentAnswer = isReviewMode && (groupReview.userAnswer || individualQuestionReview?.userAnswer)
    ? (groupReview.userAnswer || individualQuestionReview.userAnswer)
    : (answers[questionId] || '');
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
  // For multiple_answers, options come from the group-level options table
  // Each option has an option_key (e.g., "A", "B", "C")
  const optionKeyMap = useMemo(() => {
    const map = new Map();
    options.forEach(opt => {
      // Use option_key as primary identifier (from options table)
      const key = (opt.option_key || opt.letter || '').toString().trim().toUpperCase();
      if (key) {
        map.set(key, opt);
      }
    });
    return map;
  }, [options]);

  // Sort options by option_key (from options table)
  const sortedOptions = useMemo(() => {
    return [...options].sort((a, b) => {
      // Prioritize option_key from options table
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
    const isCorrect = correctOptionKeys.includes(key);

    if (wasSelected) {
      return isCorrect ? 'correct' : 'incorrect';
    } else if (isCorrect && showCorrectAnswers) {
      return 'missed'; // Foydalanuvchi belgilamagan, lekin to'g'ri javob
    }
    
    return null;
  }

  return (
    <div 
      className="space-y-4 group relative"
      style={{ color: themeColors.text }}
    >
      {/* Bookmark Icon - Bookmark all questions in the group */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          // Bookmark all individual questions in the group
          groupQuestions.forEach(q => {
            const qId = q.id;
            const qNum = q.question_number;
            if (qId) toggleBookmark(qId);
            if (qNum && qNum !== qId) toggleBookmark(qNum);
          });
        }}
        className={`absolute right-0 -top-10 transition-all ${
          groupQuestions.some(q => {
            const qId = q.id;
            const qNum = q.question_number;
            return (qId && bookmarks.has(qId)) || (qNum && bookmarks.has(qNum));
          }) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
        title="Bookmark questions"
      >
        {groupQuestions.some(q => {
          const qId = q.id;
          const qNum = q.question_number;
          return (qId && bookmarks.has(qId)) || (qNum && bookmarks.has(qNum));
        }) ? (
          <FaBookmark className="w-5 h-5 text-red-500" />
        ) : (
          <FaRegBookmark className="w-5 h-5 text-gray-400 hover:text-red-500" />
        )}
      </button>

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
          className="text-base font-semibold mb-3"
          data-selectable="true"
          style={{ color: themeColors.text }}
        >
          {parse(questionText, { allowDangerousHtml: true })}
        </h3>
      )}

      {/* Options List */}
      <div className="space-y-2">
  {sortedOptions.map((option) => {
    const optionKey = (option.option_key || option.letter || '').toString().trim().toUpperCase();
    const isSelected = selectedOptionKeys.includes(optionKey);
    const reviewStatus = getOptionReviewStatus(optionKey);
    
    // --- RANG STYILLARI ---
    let borderColor = themeColors.border;
    let backgroundColor = themeColors.background;
    let iconBg = 'bg-white border-gray-300';
    let checkIconColor = 'text-white';

    if (isReviewMode) {
      if (reviewStatus === 'correct') {
        borderColor = '#22c55e'; // Yashil
        backgroundColor = 'rgba(34, 197, 94, 0.1)'; 
        iconBg = 'bg-green-500 border-green-500';
      } else if (reviewStatus === 'incorrect') {
        borderColor = '#ef4444'; // Qizil
        backgroundColor = 'rgba(239, 68, 68, 0.1)';
        iconBg = 'bg-red-500 border-red-500';
      } else if (reviewStatus === 'missed') {
        borderColor = '#22c55e'; // To'g'ri lekin tanlanmagan
        backgroundColor = 'transparent';
        iconBg = 'bg-white border-green-500 border-dashed'; // Farqlanishi uchun punktir
        checkIconColor = 'text-green-600';
      }
    } else if (isSelected) {
      borderColor = '#6366f1'; // Tanlangan (test paytida)
      backgroundColor = 'rgba(99, 102, 241, 0.1)';
      iconBg = 'bg-indigo-600 border-indigo-600';
    }

    return (
      <button
        key={option.id || optionKey}
        disabled={isReviewMode}
        onClick={() => toggleOption(optionKey)}
        className={`flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-all w-full ${
          isReviewMode ? 'cursor-default' : 'cursor-pointer hover:shadow-sm'
        }`}
        style={{ borderColor, backgroundColor, color: themeColors.text }}
      >
        {/* Checkbox Icon */}
        <div className={`mt-0.5 shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${iconBg}`}>
          {(isSelected || reviewStatus === 'missed') && (
            <Check size={14} className={`stroke-[3px] ${checkIconColor}`} />
          )}
        </div>

        {/* Option Text */}
        <div className="flex gap-2 flex-1">
          <span className={`font-semibold text-sm ${
            reviewStatus === 'correct' ? 'text-green-700' : 
            reviewStatus === 'incorrect' ? 'text-red-700' : 
            isSelected ? 'text-indigo-700' : 'text-gray-500'
          }`}>
            {optionKey}.
          </span>
          <span className={`text-sm ${
            (isSelected || reviewStatus === 'missed') ? 'font-medium' : ''
          }`}>
            {parse(option.option_text || '', { allowDangerousHtml: true })}
          </span>
        </div>

        {/* Status Text labels */}
        {isReviewMode && (
          <div className="flex flex-col items-end">
            {reviewStatus === 'correct' && <span className="text-[10px] text-green-700 font-bold uppercase">Correct</span>}
            {reviewStatus === 'incorrect' && <span className="text-[10px] text-red-700 font-bold uppercase">Your Answer</span>}
            {reviewStatus === 'missed' && <span className="text-[10px] text-green-600 font-bold uppercase italic">Correct Answer</span>}
          </div>
        )}
      </button>
    );
  })}
</div>

      {/* Footer Info - Real-time selection indicator */}
      { !isReviewMode && <div className="flex justify-between items-center text-sm pt-2 border-t" style={{ 
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
        { selectedOptionKeys.length === questionRange && (
          <span className="text-green-500 font-medium flex items-center gap-1">
            <Check size={14} /> Complete
          </span>
        )}
        { selectedOptionKeys.length > 0 && selectedOptionKeys.length < questionRange && (
          <span className="text-amber-500 font-medium text-xs">
            Select {questionRange - selectedOptionKeys.length} more
          </span>
        )}
      </div>}
    </div>
  );
};

export default MultipleAnswers;
