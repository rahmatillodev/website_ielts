import React from "react";
import parse from "html-react-parser"; // HTMLni xavfsiz va to'g'ri parse qilish uchun
import { Input } from "@/components/ui/input";
import { FaRegBookmark, FaBookmark } from "react-icons/fa";
import { useAppearance } from "@/contexts/AppearanceContext";

const CompletionGapFill = ({ 
  question, 
  groupQuestions, 
  answers, 
  onAnswerChange, 
  onInteraction, 
  mode = 'test', 
  reviewData = {}, 
  showCorrectAnswers = true, 
  bookmarks = new Set(), 
  toggleBookmark = () => {} 
}) => {

  const appearance = useAppearance();
  const themeColors = appearance.themeColors;


  
  if (!groupQuestions || groupQuestions.length === 0) return null;

  // Savollarni tartiblash
  const sortedQuestions = [...groupQuestions].sort((a, b) => 
    (a.question_number ?? 0) - (b.question_number ?? 0)
  );

  let currentBlankIndex = 0;

  // Input komponentini render qiluvchi yordamchi funksiya
  const renderInput = (qIndex) => {
    if (qIndex >= sortedQuestions.length) return "___";

    const questionItem = sortedQuestions[qIndex];
    const qNumber = questionItem.question_number;
    // Use questionNumber as key if it exists, otherwise fall back to id (matching footer logic)
    const answerKey = qNumber || questionItem.id;
    
    const answer = answers[answerKey] || '';
    const review = reviewData[answerKey] || {};
    const isReviewMode = mode === 'review';
    const isCorrect = review.isCorrect;
    const correctAnswer = review.correctAnswer || '';
    const showWrong = isReviewMode && review.hasOwnProperty('isCorrect') && !isCorrect;
    const showCorrect = isReviewMode && isCorrect;
    const isBookmarked = bookmarks.has(answerKey) || bookmarks.has(qNumber);

    return (
      <span key={`input-${qIndex}`} className="inline-flex items-center  relative  align-middle group">
        <Input
          type="text"
          value={isReviewMode ? `[${qNumber}] ${answer}` : answer}
          onChange={(e) => {
            if (mode !== 'review') {
              onInteraction?.();
              onAnswerChange(answerKey, e.target.value);
            }
          }}
          onFocus={onInteraction}
          placeholder={qNumber ? `[${qNumber}]` : ''}
          disabled={mode === 'review'}
          className={`w-30 h-7 px-2 text-base rounded-md focus-visible:ring-1 bg-gray-50/50 placeholder:text-gray-400  ${
            showWrong 
              ? 'border-red-500 bg-red-50 text-red-600 focus-visible:ring-red-500' 
              : showCorrect
              ? 'border-green-500 bg-green-50 text-green-700 focus-visible:ring-green-500'
              : 'border-gray-400 focus-visible:ring-blue-500'
          } ${mode === 'review' ? 'cursor-not-allowed' : ''}`}
          style={{ backgroundColor: themeColors.background, color: themeColors.text }}
        />
        {/* Bookmark tugmasi */}
        <button
          onClick={(e) => { e.stopPropagation(); toggleBookmark(answerKey); }}
          className={`transition-all ${isBookmarked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
        >
          {isBookmarked ? <FaBookmark className="w-3 h-3 text-red-500" /> : <FaRegBookmark className="w-3 h-3 text-gray-400" />}
        </button>
        {/* To'g'ri javobni ko'rsatish */}
        {showWrong && correctAnswer && showCorrectAnswers && (
          <span className="absolute -top-5 left-0 text-[10px] text-green-600 font-bold whitespace-nowrap">
            {correctAnswer}
          </span>
        )}
      </span>
    );
  };

  // HTML ichidagi "___" ni topib, Inputga almashtirish mantiqi
  const options = {
    replace: (domNode) => {
      // Faqat matnli nodelarni tekshiramiz
      if (domNode.type === 'text' && domNode.data.includes('___')) {
        const segments = domNode.data.split('___');
        return (
          <>
            {segments.map((segment, i) => (
              <React.Fragment key={i}>
                {segment}
                {i < segments.length - 1 ? renderInput(currentBlankIndex++) : null}
              </React.Fragment>
            ))}
          </>
        );
      }
    }
  };

  const questionText = typeof question.question_text === 'string' ? question.question_text : '';

  return (
    <div className="w-full" style={{ backgroundColor: themeColors.background }}>
      <div 
        className="prose prose-slate max-w-none 
        [&_h3]:text-xl [&_h3]:font-bold [&_h3]:mb-3 
        [&_h4]:text-lg [&_h4]:font-semibold [&_h4]:mt-4 [&_h4]:mb-2
        [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4
        [&_li]:mb-2 [&_p]:mb-3 
        text-gray-800 leading-9" 
        data-selectable="true"
        style={{ color: themeColors.text }}
      >
        {parse(questionText, options)}
      </div>
    </div>
  );
};

export default CompletionGapFill;