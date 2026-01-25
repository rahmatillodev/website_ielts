import React, { useMemo } from "react";
import { FaRegBookmark, FaBookmark } from "react-icons/fa";
import { useAppearance } from "@/contexts/AppearanceContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
/**
 * MatchingInformation - Renders matching_information question type
 * 
 * Data Structure:
 * - Main Question (question group) contains instruction with JSON: { "original": "...", "answer_options": [...] }
 * - Multiple questions (statements) that need to be matched to answer options
 * - Each question has correct_answer stored as text (not letter)
 * 
 * Format:
 * - Instructions text (from instruction.original)
 * - Answer options list in a grey box (A. Option1, B. Option2, etc.)
 * - Each question with a dropdown selector
 * - Answers stored as text (e.g., "McKeachie"), not letter (e.g., "B")
 */
const MatchingInformation = ({ 
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
  const appearance = useAppearance();
  const themeColors = appearance.themeColors;
  const isReviewMode = mode === 'review';

  // Parse instruction JSON to extract answer_options
  const { instructionText, answerOptions } = useMemo(() => {
    let instructionText = '';
    let answerOptions = [];

    try {
      // Try to parse instruction as JSON
      const instruction = _question?.instruction || '';
      if (instruction) {
        try {
          const parsed = JSON.parse(instruction);
          if (parsed && typeof parsed === 'object') {
            instructionText = parsed.original || instruction;
            const rawOptions = parsed.answer_options || [];
            // Ensure answerOptions is always an array of strings
            // Handle both string arrays and object arrays with {letter, text} structure
            answerOptions = rawOptions.map(opt => {
              if (typeof opt === 'string') {
                return opt;
              } else if (typeof opt === 'object' && opt !== null) {
                // Extract text from object (e.g., {letter: 'A', text: 'Nilson'})
                return opt.text || opt.option_text || String(opt);
              }
              return String(opt);
            }).filter(Boolean);
          } else {
            instructionText = instruction;
          }
        } catch (e) {
          // If not JSON, use instruction as-is
          instructionText = instruction;
        }
      }

      // Fallback 1: Extract answer options from options table (group level)
      if (answerOptions.length === 0 && options && options.length > 0) {
        const optionsMap = new Map();
        options.forEach(opt => {
          const optText = opt.option_text || '';
          // Parse format: "A Nilson", "B McKeachie", etc.
          const match = optText.match(/^([A-Z])[.\s]\s*(.+)$/);
          if (match) {
            const letter = match[1];
            const text = match[2].trim();
            if (!optionsMap.has(letter)) {
              optionsMap.set(letter, text);
            }
          }
        });
        
        // Sort by letter and extract texts
        const sortedEntries = Array.from(optionsMap.entries()).sort((a, b) => 
          a[0].localeCompare(b[0])
        );
        answerOptions = sortedEntries.map(([_, text]) => text);
      }

      // Fallback 2: Extract answer options from questions' options arrays
      if (answerOptions.length === 0 && groupQuestions && groupQuestions.length > 0) {
        const optionsMap = new Map();
        // Use the first question's options (all questions should have the same options)
        const firstQuestion = groupQuestions[0];
        if (firstQuestion?.options && Array.isArray(firstQuestion.options)) {
          firstQuestion.options.forEach(opt => {
            const optText = opt.option_text || '';
            // Parse format: "A uogsidyg", "B yuf678f", etc.
            const match = optText.match(/^([A-Z])[.\s]\s*(.+)$/);
            if (match) {
              const letter = match[1];
              const text = match[2].trim();
              // Only add unique letters (first occurrence)
              if (!optionsMap.has(letter)) {
                optionsMap.set(letter, text);
              }
            }
          });
          
          // Sort by letter and extract texts
          const sortedEntries = Array.from(optionsMap.entries()).sort((a, b) => 
            a[0].localeCompare(b[0])
          );
          answerOptions = sortedEntries.map(([_, text]) => text);
        }
      }
    } catch (error) {
      console.error('[MatchingInformation] Error parsing instruction:', error);
      instructionText = _question?.instruction || '';
    }

    return { instructionText, answerOptions };
  }, [_question?.instruction, options, groupQuestions]);

  // Sort questions by question_number
  const sortedQuestions = useMemo(() => {
    if (!groupQuestions || groupQuestions.length === 0) {
      return [];
    }
    return [...groupQuestions].sort((a, b) => {
      const aNum = a.question_number ?? 0;
      const bNum = b.question_number ?? 0;
      return aNum - bNum;
    });
  }, [groupQuestions]);

  // Get correct answer for a question
  const getCorrectAnswerForQuestion = (question) => {
    if (question && question.correct_answer) {
      return question.correct_answer;
    }
    return '';
  };

  // Get review info for a question
  const getQuestionReview = (questionNumber) => {
    return reviewData[questionNumber] || {};
  };

  // Handle answer selection
  const handleAnswerChange = (questionNumber, answerText) => {
    if (mode !== 'review') {
      // Store answer as text (not letter)
      onAnswerChange(questionNumber, answerText);
    }
  };

  // Get selected answer for a question
  const getSelectedAnswer = (questionNumber) => {
    const review = reviewData[questionNumber] || {};
    return review.userAnswer || answers[questionNumber] || '';
  };

  // Calculate question range for heading
  const questionRange = useMemo(() => {
    if (sortedQuestions.length === 0) return '';
    const first = sortedQuestions[0]?.question_number ?? 0;
    const last = sortedQuestions[sortedQuestions.length - 1]?.question_number ?? 0;
    return first === last ? `${first}` : `${first}-${last}`;
  }, [sortedQuestions]);

  // Render component
  if (sortedQuestions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6 mb-6">
      {/* Question Range Heading */}
      {/* {questionRange && (
        <h2 
          className="text-lg font-semibold"
          style={{ color: themeColors.text }}
        >
          Questions {questionRange}
        </h2>
      )} */}

      {/* Instructions */}
      {instructionText && (
        <div 
          className="text-sm leading-relaxed"
          data-selectable="true"
          style={{ color: themeColors.text }}
        >
          {instructionText}
        </div>
      )}

      {/* Answer Options Box */}
      {answerOptions.length > 0 && (
        <div 
          className="rounded-lg p-4 mb-6 border"
          style={{ 
            backgroundColor: themeColors.background === '#f2f2f2' ? '#f5f5f5' : 
                           themeColors.background === '#000000' ? '#1a1a1a' : 
                           themeColors.background === '#1a2632' ? '#2a3a4a' : '#f5f5f5',
            borderColor: themeColors.background === '#f2f2f2' ? '#d1d5db' : 
                        themeColors.background === '#000000' ? '#374151' : 
                        themeColors.background === '#1a2632' ? '#4b5563' : '#d1d5db',
            borderWidth: '1px',
            borderStyle: 'solid'
          }}
        >
          <h3 
            className="font-bold mb-3"
            style={{ color: themeColors.text }}
          >
            List of Researchers
          </h3>
          <div className="space-y-2">
            {answerOptions.map((optionText, idx) => {
              const letter = String.fromCharCode(65 + idx); // A, B, C, D...
              return (
                <div 
                  key={idx}
                  className="flex items-start gap-2"
                  style={{ color: themeColors.text }}
                >
                  <span className="font-medium">{letter}.</span>
                  <span>{optionText}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Questions with Dropdowns */}
      <div className="space-y-4">
        {sortedQuestions.map((q) => {
          const qNumber = q.question_number || q.id;
          const questionText = q.question_text || q.text || '';
          const review = getQuestionReview(qNumber);
          const isCorrect = review.isCorrect;
          const correctAnswer = review.correctAnswer || getCorrectAnswerForQuestion(q);
          const selectedAnswer = getSelectedAnswer(qNumber);
          const showWrong = isReviewMode && !isCorrect;
          const showCorrect = isReviewMode && isCorrect;
          const isBookmarked = bookmarks.has(qNumber);

          return (
            <div
              key={q.id || qNumber}
              className={`flex items-start gap-3 justify-between group ${
                showWrong ? 'p-4 rounded-lg bg-red-50 border-2 border-red-500' : 
                showCorrect ? 'p-4 rounded-lg bg-green-50 border-2 border-green-500' : 
                ''
              }`}
              style={showWrong || showCorrect ? {} : {
                backgroundColor: 'transparent'
              }}
            >
              <div className="flex items-start gap-2 flex-1">
                <span 
                  className="font-medium"
                  style={{ color: themeColors.text }}
                >
                  {qNumber}.
                </span>
                <span 
                  data-selectable="true"
                  className="flex-1"
                  style={{ color: themeColors.text }}
                >
                  {questionText}
                </span>
                {showCorrect && (
                  <span className="text-xs text-green-700 font-medium ml-2">
                    Correct
                  </span>
                )}
                {showWrong && correctAnswer && showCorrectAnswers && (
                  <span className="text-xs text-green-600 font-medium ml-2">
                    Correct: {correctAnswer}
                  </span>
                )}
              </div>

              {/* Dropdown Selector */}
              <div className="flex items-center gap-2">
                    <Select
                      value={selectedAnswer || undefined}
                      onValueChange={(value) => handleAnswerChange(qNumber, value)}
                      disabled={mode === 'review'}
                    >
                      <SelectTrigger
                        className={cn(
                          "min-w-[100px]",
                          selectedAnswer && !isReviewMode && "border-gray-400 border-2",
                          showWrong && "border-red-500 border-2",
                          showCorrect && "border-green-500 border-2"
                        )}
                        style={{
                          backgroundColor: themeColors.background,
                          color: themeColors.text,
                          borderColor: selectedAnswer && !isReviewMode ? '#dce1e5' : 
                                     showWrong ? '#ef4444' : 
                                     showCorrect ? '#22c55e' : 
                                     themeColors.border
                        }}
                        aria-label={`Select answer for question ${qNumber}`}
                      >
                        <SelectValue placeholder={qNumber.toString()} />
                      </SelectTrigger>
                      <SelectContent
                        style={{
                          backgroundColor: themeColors.background === '#f2f2f2' ? '#ffffff' : 
                                         themeColors.background === '#000000' ? '#1a1a1a' : 
                                         themeColors.background === '#1a2632' ? '#2a3a4a' : 
                                         '#ffffff',
                          color: themeColors.text
                        }}
                      >
                        {answerOptions.map((optionText, idx) => {
                          const letter = String.fromCharCode(65 + idx);
                          const isSelected = selectedAnswer === optionText;
                          const isCorrectOption = isReviewMode && 
                            optionText.toLowerCase() === (correctAnswer || '').toLowerCase().trim();
                          
                          return (
                            <SelectItem
                              key={idx}
                              value={optionText}
                              className={cn(
                                isSelected && showCorrect && "bg-green-50",
                                isSelected && showWrong && "bg-red-50"
                              )}
                              style={{
                                backgroundColor: isSelected && showCorrect ? 'rgba(220, 252, 231, 0.5)' : 
                                              isSelected && showWrong ? 'rgba(254, 226, 226, 0.5)' : 
                                              'transparent',
                                color: themeColors.text
                              }}
                            >
                              {letter}. {optionText}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Bookmark Icon */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleBookmark(qNumber);
                    }}
                    className={`transition-all shrink-0 ${
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
          );
        })}
      </div>
    </div>
  );
};

export default MatchingInformation;

