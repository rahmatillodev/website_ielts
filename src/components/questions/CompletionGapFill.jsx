import React from "react";
import { Input } from "@/components/ui/input";

/**
 * CompletionGapFill - Renders Fill-in-the-Blanks questions with inline inputs
 */
const CompletionGapFill = ({ question, groupQuestions, answers, onAnswerChange, onInteraction, mode = 'test', reviewData = {}, showCorrectAnswers = true }) => {
  if (groupQuestions && groupQuestions.length > 0) {
    const getContentString = (content) => {
      if (typeof content === 'string') return content;
      if (typeof content === 'number') return String(content);
      return '';
    };
    
    const questionText = getContentString(question.question_text) 
    
    const sortedQuestions = [...groupQuestions].sort((a, b) => {
      const aNum = a.question_number ?? 0;
      const bNum = b.question_number ?? 0;
      return aNum - bNum;
    });
    
    const placeholderRegex = /___/g;
    const matches = [...questionText.matchAll(placeholderRegex)];
    
    const parts = [];
    let lastIndex = 0;
    let questionIndex = 0;
    
    matches.forEach((match) => {
      const beforeMatch = questionText.substring(lastIndex, match.index);
      if (beforeMatch) {
        parts.push({ type: 'text', content: beforeMatch });
      }
      
      if (questionIndex < sortedQuestions.length) {
        const questionItem = sortedQuestions[questionIndex];
        // Use question_number as the key for consistency with other question types
        const answerKey = questionItem.question_number ?? questionItem.id;
        parts.push({
          type: 'input',
          questionId: answerKey,
          questionNumber: questionItem.question_number,
        });
        questionIndex++;
      }
      lastIndex = match.index + match[0].length;
    });
    
    if (lastIndex < questionText.length) {
      parts.push({ type: 'text', content: questionText.substring(lastIndex) });
    }
    
    return (
      <div className="w-full bg-white p-4 rounded-lg shadow-sm">
        <div className="text-gray-800 leading-12 text-lg">
          {parts.map((part, idx) => {
            if (part.type === 'text') {
              return <span key={idx}>{part.content}</span>;
            } else {
              const answer = answers[part.questionId] || '';
              const review = reviewData[part.questionId] || {};
              const isReviewMode = mode === 'review';
              const isCorrect = review.isCorrect;
              const correctAnswer = review.correctAnswer || '';
              // In review mode, show red if answer is wrong (regardless of whether answer exists)
              const showWrong = isReviewMode && review.hasOwnProperty('isCorrect') && !isCorrect;
              const showCorrect = isReviewMode && isCorrect;
              
              return (
                <span key={idx} className="inline-block relative mx-2 align-middle">
                  <Input
                    type="text"
                    value={isReviewMode ? `[${part.questionNumber}] ${answer}` : answer}
                    onChange={(e) => {
                      if (mode !== 'review') {
                        onInteraction?.();
                        onAnswerChange(part.questionId, e.target.value);
                      }
                    }}
                    onFocus={onInteraction}
                    placeholder={part.questionNumber ? `[${part.questionNumber}]` : ''}
                    disabled={mode === 'review'}
                    className={`w-24 h-9 px-2 text-base rounded-md focus-visible:ring-1 bg-gray-50/50 placeholder:text-gray-400 placeholder:font-semibold ${
                      showWrong 
                        ? 'border-red-500 bg-red-50 text-red-600 focus-visible:ring-red-500' 
                        : showCorrect
                        ? 'border-green-500 bg-green-50 text-green-700 focus-visible:ring-green-500'
                        : 'border-gray-400 focus-visible:ring-blue-500'
                    } ${mode === 'review' ? 'cursor-not-allowed' : ''}`}
                  />
                  {/* {showCorrect && (
                    <span className="absolute -top-5 left-0 text-[10px] bg-green-500 text-white px-2 py-0.5 rounded-sm">
                      Correct
                    </span>
                  )} */}
                  {/* {showWrong && (
                    <span className="absolute -top-5 left-0 text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-sm">
                      Wrong
                    </span>
                  )} */}
                  {showWrong && correctAnswer && showCorrectAnswers && (
                    <span className="absolute bottom-10 left-8 text-xs text-green-600 font-medium text-ellipsis overflow-hidden whitespace-nowrap">
                      {correctAnswer}
                    </span>
                  )}
                </span>
              );
            }
          })}
        </div>
      </div>
    );
  }
  
  // Single question fallback...
  return (
    <div className="p-2">
      <Input
        className="max-w-xs border-gray-400"
        value={answers[question.id] || ""}
        onChange={(e) => onAnswerChange(question.id, e.target.value)}
        placeholder="Yozing..."
      />
    </div>
  );
};

export default CompletionGapFill;