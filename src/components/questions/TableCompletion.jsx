import React, { useMemo } from "react";
import parse from "html-react-parser";
import { Input } from "@/components/ui/input";
import { FaRegBookmark, FaBookmark } from "react-icons/fa";
import { useAppearance } from "@/contexts/AppearanceContext";

const TableCompletion = ({
  question,
  groupQuestions,
  answers,
  onAnswerChange,
  onInteraction,
  mode = "test",
  reviewData = {},
  showCorrectAnswers = true,
  bookmarks = new Set(),
  toggleBookmark = () => {},
}) => {
  const appearance = useAppearance();
  const themeColors = appearance.themeColors;

  if (!groupQuestions || groupQuestions.length === 0) return null;

  // Sort questions by question_number
  const sortedQuestions = useMemo(
    () =>
      [...groupQuestions].sort(
        (a, b) => (a.question_number ?? 0) - (b.question_number ?? 0)
      ),
    [groupQuestions]
  );

  // Track blank index (resets on each render)
  let currentBlankIndex = 0;

  // Render input component for a blank
  const renderInput = (qIndex) => {
    if (qIndex >= sortedQuestions.length) return "___";

    const questionItem = sortedQuestions[qIndex];
    const qNumber = questionItem.question_number;
    const answerKey = qNumber || questionItem.id;

    const answer = answers[answerKey] || "";
    const review = reviewData[answerKey] || {};
    const isReviewMode = mode === "review";
    const isCorrect = review.isCorrect;
    const correctAnswer = review.correctAnswer || "";
    const showWrong =
      isReviewMode && review.hasOwnProperty("isCorrect") && !isCorrect;
    const showCorrect = isReviewMode && isCorrect;
    const isBookmarked = bookmarks.has(answerKey) || bookmarks.has(qNumber);

    return (
      <span
        key={`input-${qIndex}`}
        className="inline-flex items-center relative align-middle group"
      >
        <Input
          type="text"
          value={isReviewMode ? `[${qNumber}] ${answer}` : answer}
          onChange={(e) => {
            if (mode !== "review") {
              onInteraction?.();
              onAnswerChange(answerKey, e.target.value);
            }
          }}
          onFocus={onInteraction}
          placeholder={qNumber ? `[${qNumber}]` : ""}
          disabled={mode === "review"}
          className={`w-30 h-7 px-2 text-base rounded-md focus-visible:ring-1 bg-gray-50/50 placeholder:text-gray-400 ${
            showWrong
              ? "border-red-500 bg-red-50 text-red-600 focus-visible:ring-red-500"
              : showCorrect
              ? "border-green-500 bg-green-50 text-green-700 focus-visible:ring-green-500"
              : "border-gray-400 focus-visible:ring-blue-500"
          } ${mode === "review" ? "cursor-not-allowed" : ""}`}
          style={{
            backgroundColor: themeColors.background,
            color: themeColors.text,
          }}
        />
        {/* Bookmark button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleBookmark(answerKey);
          }}
          className={`transition-all ${
            isBookmarked ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          {isBookmarked ? (
            <FaBookmark className="w-3 h-3 text-red-500" />
          ) : (
            <FaRegBookmark className="w-3 h-3 text-gray-400" />
          )}
        </button>
        {/* Show correct answer when wrong */}
        {showWrong && correctAnswer && showCorrectAnswers && (
          <span className="absolute -top-5 left-0 text-[10px] text-green-600 font-bold whitespace-nowrap">
            {correctAnswer}
          </span>
        )}
      </span>
    );
  };

  // Parse and transform table HTML
  const questionText = typeof question.question_text === "string" ? question.question_text : "";

  // Options for html-react-parser to replace ___ with inputs
  // Similar to CompletionGapFill, but works for table cells too
  const parseOptions = {
    replace: (domNode) => {
      // Handle text nodes containing ___
      if (domNode.type === "text" && domNode.data.includes("___")) {
        const segments = domNode.data.split("___");
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
    },
  };

  return (
    <div className="w-full overflow-x-auto" style={{ backgroundColor: themeColors.background }}>
      <div
        className="prose prose-slate max-w-none 
        [&_table]:min-w-full [&_table]:border-collapse [&_table]:border [&_table]:border-gray-300
        [&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:font-semibold [&_th]:bg-gray-50 [&_th]:border [&_th]:border-gray-300
        [&_td]:px-4 [&_td]:py-3 [&_td]:border [&_td]:border-gray-300
        [&_thead]:bg-gray-50
        [&_tbody_tr:nth-child(even)]:bg-gray-50/30
        text-gray-800"
        data-selectable="true"
        style={{ color: themeColors.text }}
      >
        {parse(questionText, parseOptions)}
      </div>
    </div>
  );
};

export default TableCompletion;

