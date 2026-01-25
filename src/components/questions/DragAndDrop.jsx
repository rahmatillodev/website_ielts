import React from "react";
import { useDrag, useDrop } from "react-dnd";
import { FaRegBookmark, FaBookmark } from "react-icons/fa";
import parse from "html-react-parser"; // HTML strukturasini saqlash uchun
import { useAppearance } from "@/contexts/AppearanceContext";

const ItemType = {
  WORD: "word",
};

/**
 * DraggableWord - Sudraluvchi so'z komponenti
 */
const DraggableWord = ({ word, isUsed }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemType.WORD,
    item: { word },
    canDrag: !isUsed,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }), [word, isUsed]);

  return (
    <div
      ref={drag}
      className={`
        px-4 py-2 rounded-md text-sm font-medium transition-all
        ${isUsed
          ? 'bg-gray-600 text-gray-300 line-through cursor-not-allowed'
          : 'bg-blue-100 text-blue-900 hover:bg-blue-200 cursor-move shadow-sm border border-blue-200'
        }
        ${isDragging ? 'opacity-50 border-2 border-blue-400' : ''}
      `}
    >
      {word}
    </div>
  );
};

/**
 * DropZone - Matn ichidagi tushirish maydoni
 */
const DropZone = ({ questionId, questionNumber, answer, onDrop, onClear, mode = 'test', reviewData = {}, showCorrectAnswers = true, bookmarks = new Set(), toggleBookmark = () => { } }) => {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ItemType.WORD,
    drop: (item) => onDrop(questionId, item.word),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  }), [questionId]);

  const isReviewMode = mode === 'review';
  // Try to find review data with type conversion (handle string/number mismatch)
  const review = reviewData[questionId] ||
    reviewData[String(questionId)] ||
    reviewData[Number(questionId)] ||
    {};
  const isCorrect = review.isCorrect;
  const correctAnswer = review.correctAnswer || '';
  const showWrong = isReviewMode && review.hasOwnProperty('isCorrect') && !isCorrect;
  const showCorrect = isReviewMode && isCorrect;
  const isBookmarked = bookmarks.has(questionId) || bookmarks.has(questionNumber);

  return (
    <span
      ref={isReviewMode ? null : drop}
      onClick={() => {
        if (!isReviewMode && answer) onClear(questionId);
      }}
      className={`
        inline-flex items-center justify-center min-w-[120px] text-sm h-7 px-2 mx-1
        border-2 transition-all align-middle relative group rounded
        ${isReviewMode ? 'cursor-default' : 'cursor-pointer'}
        ${isOver && canDrop && !isReviewMode ? 'bg-green-100 border-green-500' : ''}
        ${showCorrect ? 'border-green-500 bg-green-50 text-green-700 font-semibold border-solid' : ''}
        ${showWrong ? 'border-red-400 bg-red-50 text-red-500 font-semibold border-solid' : ''}
        ${!answer && !isReviewMode ? 'border-gray-400 border-dashed' : 'border-solid'}
        ${!answer && isReviewMode ? 'border-gray-200 bg-gray-50' : ''}
      `}
      title={questionNumber ? `Question ${questionNumber}` : undefined}
    >
      <span className="truncate max-w-[150px]">
        {answer && answer.trim() !== '' ? `[${questionNumber}] ${answer}` : `[ ${questionNumber} ]`}
      </span>

      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleBookmark(questionId);
        }}
        className={`ml-1 transition-all ${isBookmarked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
      >
        {isBookmarked ? <FaBookmark className="w-5 h-5 text-red-500" /> : <FaRegBookmark className="w-5 h-5 text-gray-400" />}
      </button>

      {/* Correct Answer - Only for drag_and_drop type, after bookmark */}
      {showWrong && correctAnswer && showCorrectAnswers && (
        <span className="ml-2 text-sm text-green-600 font-semibold whitespace-nowrap">
          {correctAnswer}
        </span>
      )}
    </span>
  );
};

/**
 * Asosiy DragAndDrop Komponenti
 */
const DragAndDrop = ({ question, groupQuestions, answers, onAnswerChange, onInteraction, mode = 'test', reviewData = {}, showCorrectAnswers = true, bookmarks = new Set(), toggleBookmark = () => { } }) => {

  const questionText = question.question_text || question.content || "";
  let currentBlankIndex = 0;

  // Faqat raqami bor savollarni tartiblab olish
  const validQuestions = React.useMemo(() => {
    if (!groupQuestions) return [];
    return [...groupQuestions]
      .filter(q => q.question_number != null)
      .sort((a, b) => (a.question_number ?? 0) - (b.question_number ?? 0));
  }, [groupQuestions]);

  // So'zlar banki (shuffled)
  const wordBank = React.useMemo(() => {
    if (!groupQuestions) return [];
    const words = groupQuestions
      .map(q => q.question_text)
      .filter(w => w && typeof w === 'string' && w.trim() !== '');
    return [...words].sort(() => Math.random() - 0.5);
  }, [groupQuestions]);

  const handleDrop = (qId, word) => {
    onInteraction?.();
    onAnswerChange(qId, word);
  };

  const handleClear = (qId) => {
    onInteraction?.();
    onAnswerChange(qId, '');
  };

  const isWordUsed = (word) => {
    return Object.values(answers).some(a => a && a.toString().trim() === word.trim());
  };

  // HTML ichidagi ___ ni DropZone ga almashtirish
  const options = {
    replace: (domNode) => {
      if (domNode.type === 'text' && domNode.data.includes('___')) {
        const segments = domNode.data.split(/_{3,}/g);
        return (
          <>
            {segments.map((segment, i) => (
              <React.Fragment key={i}>
                {segment}
                {i < segments.length - 1 && currentBlankIndex < validQuestions.length ? (
                  (() => {
                    const target = validQuestions[currentBlankIndex++];
                    // Use question_number as primary key (consistent with calculateTestScore)
                    const questionKey = target.question_number || target.id;
                    return (
                      <DropZone
                        questionId={questionKey}
                        questionNumber={target.question_number}
                        answer={answers[questionKey]}
                        onDrop={handleDrop}
                        onClear={handleClear}
                        mode={mode}
                        reviewData={reviewData}
                        showCorrectAnswers={showCorrectAnswers}
                        bookmarks={bookmarks}
                        toggleBookmark={toggleBookmark}
                      />
                    );
                  })()
                ) : null}
              </React.Fragment>
            ))}
          </>
        );
      }
    }
  };

  const appearance = useAppearance();
  const themeColors = appearance.themeColors;


  return (
    <div className="p-6 rounded-xl shadow-sm border border-gray-100" style={{ backgroundColor: themeColors.background }}>
      {/* Bu yerda 'prose' va list stillari qo'shildi */}
      <div 
        className="prose prose-slate max-w-none 
    [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:mb-4
    [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-4
    [&_li]:pl-1 [&_li]:mb-1
    text-gray-800 leading-9" 
        data-selectable="true"
        style={{ color: themeColors.text }}
      >
        {parse(questionText, options)}
      </div>


      {wordBank.length > 0 && mode !== 'review' && (
        <div className="pt-6 border-t border-red-700">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Word Bank:</p>
          <div className="flex flex-wrap gap-3">
            {wordBank.map((word, idx) => {
              return (
                <DraggableWord
                  key={idx}
                  word={word}
                  isUsed={isWordUsed(word)}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default DragAndDrop;