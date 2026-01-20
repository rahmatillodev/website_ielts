import React from "react";
import { useDrag, useDrop } from "react-dnd";

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
          ? 'bg-gray-200 text-gray-400 line-through cursor-not-allowed' 
          : 'bg-blue-100 text-blue-900 hover:bg-blue-200 cursor-move shadow-sm'
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
const DropZone = ({ questionId, questionNumber, answer, onDrop, onClear, mode = 'test', reviewData = {}, showCorrectAnswers = true }) => {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ItemType.WORD,
    drop: (item) => onDrop(questionId, item.word),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  }), [questionId]);

  const isReviewMode = mode === 'review';
  const review = reviewData[questionId] || {};
  const isCorrect = review.isCorrect;
  const correctAnswer = review.correctAnswer || '';
  // In review mode, show red if answer is wrong (regardless of whether answer exists)
  const showWrong = isReviewMode && review.hasOwnProperty('isCorrect') && !isCorrect;
  const showCorrect = isReviewMode && isCorrect;
  
  return (
    <span
      ref={isReviewMode ? null : drop}
      onClick={() => {
        if (!isReviewMode && answer) {
          onClear(questionId);
        }
      }}
      className={`
        inline-flex items-center justify-center min-w-[100px] h-8 px-2 mx-1
        border-b-2 transition-all align-middle relative
        ${isReviewMode ? 'cursor-default' : 'cursor-pointer'}
        ${isOver && canDrop && !isReviewMode ? 'bg-green-100 border-green-500' : ''}
        ${showCorrect ? 'border-green-500 bg-green-50 text-green-700 font-bold' : ''}
        ${showWrong ? 'border-red-500 bg-red-50 text-red-600 font-bold' : ''}
        ${answer && !showCorrect && !showWrong ? 'border-blue-500 text-blue-900 font-bold' : ''}
        ${!answer ? 'border-gray-400' : ''}
      `}
      style={{ borderStyle: answer ? 'solid' : 'dashed' }}
      title={questionNumber ? `Question ${questionNumber}` : undefined}
    >
      {answer && answer.trim() !== '' ? `[${questionNumber}] `+answer : (questionNumber ? `[ ${questionNumber}]` : "____")}
      
      
      {showWrong && correctAnswer && showCorrectAnswers && (
        <span className="absolute -top-2 left-0 text-xs text-green-600 font-medium whitespace-nowrap">
           {correctAnswer}
        </span>
      )}
    </span>
  );  
};

/**
 * Asosiy DragAndDrop Komponenti
 */
const DragAndDrop = ({ question, groupQuestions, answers, onAnswerChange, onInteraction, mode = 'test', reviewData = {}, showCorrectAnswers = true }) => {
  
  const getContentString = (content) => {
    if (typeof content === 'string') return content;
    if (typeof content === 'number') return String(content);
    return '';
  };

  const groupContent = getContentString(question.question_text || question.content || "");
  
  // Filter questions to only include those with valid question_numbers (for mapping to placeholders)
  // and create a sorted list for placeholder mapping
  const validQuestionsForPlaceholders = React.useMemo(() => {
    if (!groupQuestions || groupQuestions.length === 0) return [];
    
    return groupQuestions
      .filter(q => q.question_number != null) // Exclude questions with null question_number
      .sort((a, b) => {
        const aNum = a.question_number ?? 0;
        const bNum = b.question_number ?? 0;
        return aNum - bNum;
      });
  }, [groupQuestions]);

  // Word bank: all questions' question_text values (including null question_number ones)
  const wordBank = React.useMemo(() => {
    if (!groupQuestions || groupQuestions.length === 0) return [];
    
    const words = groupQuestions
      .map(q => getContentString(q.question_text))
      .filter(word => word && word.trim() !== '');
    
    const shuffled = [...words];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    return shuffled;
  }, [groupQuestions]);

  // Regex: 3 ta va undan ko'p tag chiziqchalarni topadi (masalan: ___, ______)
  const placeholderRegex = /_{3,}/g;
  const matches = [...groupContent.matchAll(placeholderRegex)];
  
  const parts = [];
  let lastIndex = 0;

  matches.forEach((match, index) => {
    const beforeMatch = groupContent.substring(lastIndex, match.index);
    if (beforeMatch) parts.push({ type: 'text', content: beforeMatch });

    // Map placeholders to questions sequentially based on their sorted question_number order
    // This ensures questions appear in numerical order (18, 19, 20, 21, etc.)
    const targetQuestion = validQuestionsForPlaceholders[index];

    if (targetQuestion) {
      // Use question_number as the key if available, otherwise fall back to id
      const answerKey = targetQuestion.question_number ?? targetQuestion.id;
      parts.push({
        type: 'dropzone',
        questionId: answerKey,
        questionNumber: targetQuestion.question_number,
      });
    }
    lastIndex = match.index + match[0].length;
  });

  if (lastIndex < groupContent.length) {
    parts.push({ type: 'text', content: groupContent.substring(lastIndex) });
  }

  const handleDrop = (qId, word) => {
    onInteraction?.();
    onAnswerChange(qId, word);
  };

  const handleClear = (qId) => {
    onInteraction?.();
    onAnswerChange(qId, '');
  };

  const isWordUsed = (word) => {
    return Object.values(answers).some(answer => 
      answer && answer.toString().trim() === word.trim()
    );
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="text-gray-800 leading-10 text-lg mb-8">
        {parts.map((part, idx) => (
          part.type === 'text' 
            ? <span key={idx}>{part.content}</span>
            : <DropZone 
                key={idx}
                questionId={part.questionId}
                questionNumber={part.questionNumber}
                answer={answers[part.questionId]}
                onDrop={handleDrop}
                onClear={handleClear}
                mode={mode}
                reviewData={reviewData}
                showCorrectAnswers={showCorrectAnswers}
              />
        ))}
      </div>

      {wordBank.length > 0 && mode !== 'review' && (
        <div className="pt-6 border-t border-gray-100">
          <h4 className="text-xs font-semibold text-gray-400 uppercase mb-4 tracking-wider">Tanlov uchun so'zlar:</h4>
          <div className="flex flex-wrap gap-3">
            {wordBank.map((word, idx) => (
              <DraggableWord 
                key={idx} 
                word={word} 
                isUsed={isWordUsed(word)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DragAndDrop;