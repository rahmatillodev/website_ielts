import React from "react";
import parse from "html-react-parser"; // HTMLni xavfsiz va to'g'ri parse qilish uchun
import { Input } from "@/components/ui/input";
import QuestionActionIcons from "./QuestionActionIcons";
import { ExplainIcon, ExplainPanel } from "./InlineExplain";
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
  toggleBookmark = () => {},
  onReport = () => {}
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
    const questionId = questionItem.id;
    // Try both question.id (UUID) and question_number for lookup (matching reviewData structure)
    const answerKey = questionId || qNumber;
    
    // Try multiple keys for answer lookup
    const answer = answers[questionId] || answers[qNumber] || answers[answerKey] || '';
    // Try multiple keys for review data lookup
    const review = reviewData[questionId] || 
                   reviewData[String(questionId)] ||
                   reviewData[qNumber] || 
                   reviewData[String(qNumber)] ||
                   reviewData[answerKey] || 
                   {};
    const isReviewMode = mode === 'review';
    const isCorrect = review.isCorrect;
    const correctAnswer = review.correctAnswer || '';
    const showWrong = isReviewMode && review.hasOwnProperty('isCorrect') && review.isCorrect === false;
    const showCorrect = isReviewMode && review.isCorrect === true;
    const isBookmarked = bookmarks.has(questionId) || bookmarks.has(qNumber) || bookmarks.has(answerKey);

    return (
      <React.Fragment key={`input-${qIndex}`}>
      <span className="inline-flex items-center  relative  align-middle group">
        <Input
         spellCheck="false"
          type="text"
          value={isReviewMode ? `[${qNumber}] ${answer}` : answer}
          onChange={(e) => {
            if (mode !== 'review') {
              onInteraction?.();
              // Use question.id (UUID) as primary key, fallback to question_number
              onAnswerChange(questionId || qNumber, e.target.value);
            }
          }}
          onFocus={onInteraction}
          placeholder={qNumber ? `[${qNumber}]` : ''}
          disabled={mode === 'review'}
          className={`w-30 h-7 px-2 text-base rounded-md focus-visible:ring-1 bg-gray-50/50 placeholder:text-gray-400  ${
            showWrong 
              ? 'border-danger-500 bg-danger-50 text-danger-700 focus-visible:ring-danger-500' 
              : showCorrect
              ? 'border-success-500 bg-success-50 text-success-700 focus-visible:ring-success-500'
              : 'border-gray-400 focus-visible:ring-brand-500'
          } ${mode === 'review' ? 'cursor-not-allowed' : ''}`}
          style={{ backgroundColor: themeColors.background, color: themeColors.text }}
        />
        {/* Bookmark tugmasi */}
        <QuestionActionIcons
          className=""
          isBookmarked={isBookmarked}
          onToggleBookmark={() => toggleBookmark(answerKey)}
          isReviewMode={isReviewMode}
          onReport={() => onReport(questionItem)}
        />
        {/* Explain - shu bo'sh joyning izohi, report bayrog'i yonida */}
        <ExplainIcon
          questionKey={qNumber}
          explanation={questionItem.explanation}
          isReviewMode={isReviewMode}
          className="ml-0.5"
        />
        {/* Correct Answer - Only for fill_in_blank type, after bookmark */}
        {showWrong && correctAnswer && showCorrectAnswers && (
          <span className="ml-0 mr-0.5 text-sm text-success-600 font-semibold whitespace-nowrap">
            {correctAnswer}
          </span>
        )}
      </span>
      {/* Izoh paneli - inline-flex o'ramidan TASHQARIDA, shuning uchun blok
          sifatida shu qatorning ostiga ochiladi. */}
      <ExplainPanel
        questionKey={qNumber}
        explanation={questionItem.explanation}
        isReviewMode={isReviewMode}
      />
      </React.Fragment>
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