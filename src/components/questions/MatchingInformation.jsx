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
import parse from "html-react-parser"; 
/**
 * MatchingInformation - Renders matching_information question type
 * 
 * Data Structure:
 * - Main Question (question group) contains instruction as plain string (e.g., "Write NO MORE THAN TWO WORDS")
 * - Multiple questions (statements) that need to be matched to answer options
 * - Each question has correct_answer stored as option_key (e.g., "A", "1", "I") in database, converted to text for display
 * - Options array contains group-level options (question_number is null) with option_key and option_text fields
 * 
 * Format:
 * - Instructions text (from instruction field, plain string)
 * - Answer options list in a grey box (A. Option1, B. Option2, etc. or 1. Option1, 2. Option2, etc. or I. Option1, II. Option2, etc.)
 * - Each question with a dropdown selector
 * - Answers stored as text (e.g., "Dr. Nilson") for user selection
 * - Supports option_key types: alphabetical (A-Z), numeric (1, 2, 3...), and Roman numerals (I, II, III...)
 * 
 * Options Structure:
 * - options array: [{ option_key: "A", option_text: "Dr. Nilson", question_number: null }, ...]
 * - Uses option_key and option_text directly from options array (new structure)
 * - Falls back to parsing "A Nilson" format if option_key is not available (legacy support)
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

  // Helper function to convert number to Roman numeral (1-26)
  const toRomanNumeral = (num) => {
    if (num < 1 || num > 26) return '';
    const values = [1, 4, 5, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26];
    const numerals = ['I', 'IV', 'V', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI', 'XXII', 'XXIII', 'XXIV', 'XXV', 'XXVI'];
    for (let i = values.length - 1; i >= 0; i--) {
      if (num >= values[i]) {
        return numerals[i];
      }
    }
    return '';
  };

  // Parse instruction and extract answer_options from options array
  const { instructionText, answerOptions, optionKeyType, optionKeyToTextMap, optionKeyList } = useMemo(() => {
    let instructionText = '';
    let answerOptions = [];
    let optionKeyType = 'alphabetical'; // Default to alphabetical
    const optionKeyToTextMap = new Map(); // Maps option_key (A, 1, I) to text
    const optionKeyList = []; // Array of {key, text} objects to preserve order and keys

    try {
      // Get instruction text (plain string, not JSON)
      instructionText = _question?.instruction || '';

      // Priority 1: Extract answer options directly from options array (new structure)
      // Options have option_key and option_text fields directly
      if (options && options.length > 0) {
        const optionsMap = new Map();
        
        // Filter group-level options (question_number is null)
        const groupLevelOptions = options.filter(opt => opt.question_number === null || opt.question_number === undefined);
        
        groupLevelOptions.forEach(opt => {
          // Check if option has option_key and option_text fields (new structure)
          if (opt.option_key && opt.option_text) {
            const key = String(opt.option_key).trim().toUpperCase();
            const text = String(opt.option_text).trim();
            if (text && !optionsMap.has(key)) {
              optionsMap.set(key, text);
              optionKeyToTextMap.set(key, text);
              optionKeyList.push({ key, text });
            }
          } else if (opt.option_text) {
            // Fallback: Parse format "A Nilson", "B McKeachie", etc. (old structure)
            const match = String(opt.option_text).match(/^([A-Z0-9IVXLC]+)[.\s]\s*(.+)$/i);
            if (match) {
              const key = match[1].trim().toUpperCase();
              const text = match[2].trim();
              if (!optionsMap.has(key)) {
                optionsMap.set(key, text);
                optionKeyToTextMap.set(key, text);
                optionKeyList.push({ key, text });
              }
            }
          }
        });
        
        // Sort by key and extract texts
        optionKeyList.sort((a, b) => {
          const firstKey = a.key;
          if (/^\d+$/.test(firstKey)) {
            return parseInt(a.key) - parseInt(b.key);
          } else if (/^[IVX]+$/i.test(firstKey)) {
            return a.key.localeCompare(b.key);
          } else {
            return a.key.localeCompare(b.key);
          }
        });
        
        answerOptions = optionKeyList.map(item => item.text);
        
        // Infer option_key_type from first key
        if (optionKeyList.length > 0) {
          const firstKey = optionKeyList[0].key;
          if (/^\d+$/.test(firstKey)) {
            optionKeyType = 'numeric';
          } else if (/^[IVX]+$/i.test(firstKey)) {
            optionKeyType = 'roman';
          } else {
            optionKeyType = 'alphabetical';
          }
        }
      }

      // Fallback: Try to parse instruction as JSON (legacy support)
      if (answerOptions.length === 0 && instructionText) {
        try {
          const parsed = JSON.parse(instructionText);
          if (parsed && typeof parsed === 'object') {
            instructionText = parsed.original || instructionText;
            optionKeyType = parsed.option_key_type || 'alphabetical';
            const rawOptions = parsed.answer_options || [];
            rawOptions.forEach((opt, idx) => {
              if (typeof opt === 'string') {
                let optionKey = '';
                if (optionKeyType === 'numeric') {
                  optionKey = String(idx + 1);
                } else if (optionKeyType === 'roman') {
                  optionKey = toRomanNumeral(idx + 1);
                } else {
                  optionKey = String.fromCharCode(65 + idx);
                }
                optionKeyToTextMap.set(optionKey, opt);
                optionKeyList.push({ key: optionKey, text: opt });
              } else if (typeof opt === 'object' && opt !== null) {
                const text = opt.text || opt.option_text || String(opt);
                const key = opt.option_key || opt.letter || String.fromCharCode(65 + idx);
                optionKeyToTextMap.set(key, text);
                optionKeyList.push({ key, text });
              }
            });
            answerOptions = optionKeyList.map(item => item.text).filter(Boolean);
          }
        } catch (e) {
          // Not JSON, use instruction as-is
        }
      }
    } catch (error) {
      console.error('[MatchingInformation] Error parsing instruction:', error);
      instructionText = _question?.instruction || '';
    }

    return { instructionText, answerOptions, optionKeyType, optionKeyToTextMap, optionKeyList };
  }, [_question?.instruction, options, groupQuestions]);

  // Sort questions by question_number
// 1. Savollarni qayerdan olishni aniqlaymiz
const actualQuestions = useMemo(() => {
  if (groupQuestions && groupQuestions.length > 0) return groupQuestions;
  if (_question?.questions && _question.questions.length > 0) return _question.questions;
  return [];
}, [groupQuestions, _question]);

// 2. O'sha savollarni tartiblaymiz
const sortedQuestions = useMemo(() => {
  return [...actualQuestions].sort((a, b) => {
    const aNum = a.question_number ?? 0;
    const bNum = b.question_number ?? 0;
    return aNum - bNum;
  });
}, [actualQuestions]);

  // Get correct answer for a question
  // Converts option_key (A, 1, I) to text if needed, or returns text directly
  const getCorrectAnswerForQuestion = (question) => {
    if (!question || !question.correct_answer) {
      return '';
    }
    
    const correctAnswer = question.correct_answer;
    
    // If correct_answer is already in answerOptions (text format), return it
    if (answerOptions.includes(correctAnswer)) {
      return correctAnswer;
    }
    
    // If correct_answer is an option_key, convert it to text
    if (optionKeyToTextMap.has(correctAnswer)) {
      return optionKeyToTextMap.get(correctAnswer);
    }
    
    // Fallback: try case-insensitive match
    const lowerCorrectAnswer = correctAnswer.toLowerCase();
    for (const [key, text] of optionKeyToTextMap.entries()) {
      if (key.toLowerCase() === lowerCorrectAnswer) {
        return text;
      }
    }
    
    // If no match found, return as-is (might be text that matches answerOptions)
    return correctAnswer;
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
          {/* <h3 
            className="font-bold mb-3"
            style={{ color: themeColors.text }}
          >
            List of Researchers
          </h3> */}
          <div className="space-y-2">
            {optionKeyList.length > 0 ? (
              // Use actual option_key from data
              optionKeyList.map((item, idx) => (
                <div 
                  key={idx}
                  className="flex items-start gap-2"
                  style={{ color: themeColors.text }}
                >
                  <span className="font-medium">{item.key}.</span>
                  <span>{item.text}</span>
                </div>
              ))
            ) : (
              // Fallback: Generate display key based on option_key_type
              answerOptions.map((optionText, idx) => {
                let displayKey = '';
                if (optionKeyType === 'numeric') {
                  displayKey = String(idx + 1);
                } else if (optionKeyType === 'roman') {
                  displayKey = toRomanNumeral(idx + 1);
                } else {
                  displayKey = String.fromCharCode(65 + idx); // A, B, C, D...
                }
                
                return (
                  <div 
                    key={idx}
                    className="flex items-start gap-2"
                    style={{ color: themeColors.text }}
                  >
                    <span className="font-medium">{displayKey}.</span>
                    <span>{optionText}</span>
                  </div>
                );
              })
            )}
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
          // Get correct answer text (converted from option_key if needed)
          const correctAnswerText = review.correctAnswer || getCorrectAnswerForQuestion(q);
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
              <div className="flex items-center gap-2 flex-1">
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
                   {parse(questionText, { allowDangerousHtml: true })}
                </span>
                {showCorrect && (
                  <span className="text-xs text-green-700 font-medium ml-2">
                    Correct
                  </span>
                )}
                {showWrong && correctAnswerText && showCorrectAnswers && (
                  <span className="text-xs text-green-600 font-medium ml-2">
                    {correctAnswerText}
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
                        {optionKeyList.length > 0 ? (
                          // Use actual option_key from data
                          optionKeyList.map((item, idx) => {
                            const isSelected = selectedAnswer === item.text;
                    
                            
                            return (
                              <SelectItem
                                key={idx}
                                value={item.text}
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
                                {item.key}
                              </SelectItem>
                            );
                          })
                        ) : (
                          // Fallback: Generate display key based on option_key_type
                          answerOptions.map((optionText, idx) => {
                            console.log(optionText);
                            let displayKey = '';
                            if (optionKeyType === 'numeric') {
                              displayKey = String(idx + 1);
                            } else if (optionKeyType === 'roman') {
                              displayKey = toRomanNumeral(idx + 1);
                            } else {
                              displayKey = String.fromCharCode(65 + idx); // A, B, C, D...
                            }
                            
                            const isSelected = selectedAnswer === optionText;
                           
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
                                {displayKey}. {optionText}
                              </SelectItem>
                            );
                          })
                        )}
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

