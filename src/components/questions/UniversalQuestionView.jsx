import React from "react";
import parse from "html-react-parser";
import {
  sanitizeEditorHTML,
  ensureTableStructure,
  wrapTablesInWrapper,
} from "@/utils/htmlRenderer";
import { Input } from "@/components/ui/input";
import { FaRegBookmark, FaBookmark } from "react-icons/fa";
import { useAppearance } from "@/contexts/AppearanceContext";
import styles from "./UniversalQuestionView.module.css";

/**
 * Renders universal question: sanitized HTML with optional image and inline
 * blank inputs (same input/output behaviour as fill_in_blanks, not static ___).
 * Optional image_url on the question group (same pattern as map type).
 *
 * @param {string} html - Raw HTML from group.question_text (with ___ for each blank)
 * @param {number} startQuestionNumber - First blank number (e.g. 1)
 * @param {object} question - Group question (may have image_url)
 * @param {array} groupQuestions - One sub-question per blank (id, question_number, correct_answer)
 * @param {object} answers - Keyed by question id or question_number
 * @param {function} onAnswerChange - (questionIdOrNumber, value) => void
 * @param {function} onInteraction - optional
 * @param {string} mode - 'test' | 'review'
 * @param {object} reviewData - { [key]: { userAnswer, isCorrect, correctAnswer } }
 * @param {boolean} showCorrectAnswers - In review, show correct answer when wrong
 * @param {Set} bookmarks - Set of question ids/numbers
 * @param {function} toggleBookmark - (questionIdOrNumber) => void
 */
const UniversalQuestionView = ({
  html,
  startQuestionNumber,
  question = {},
  groupQuestions = [],
  answers = {},
  onAnswerChange,
  onInteraction,
  mode = "test",
  reviewData = {},
  showCorrectAnswers = true,
  bookmarks = new Set(),
  toggleBookmark = () => {},
}) => {
  const { themeColors } = useAppearance();

  if (!html || typeof html !== "string") {
    return (
      <div className={styles.content}>
        {question?.image_url && (
          <div className="mb-4">
            <img
              loading="lazy"
              src={question.image_url}
              alt="Question"
              className="w-full max-w-full h-auto object-contain rounded-lg border"
              style={{ borderColor: themeColors.border, maxHeight: "500px" }}
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          </div>
        )}
        <div />
      </div>
    );
  }

  const sanitized = sanitizeEditorHTML(html);
  const withTables = ensureTableStructure(sanitized);
  const processedHtml = wrapTablesInWrapper(withTables);

  const sortedQuestions = React.useMemo(
    () =>
      [...(groupQuestions || [])].sort((a, b) => {
        const aNum = a.question_number ?? 0;
        const bNum = b.question_number ?? 0;
        return aNum - bNum;
      }),
    [groupQuestions]
  );

  let currentBlankIndex = 0;

  const renderInput = (qIndex) => {
    if (qIndex >= sortedQuestions.length) return null;

    const questionItem = sortedQuestions[qIndex];
    const qNumber = questionItem.question_number;
    const questionId = questionItem.id;
    const answerKey = questionId || qNumber;

    const answer =
      answers[questionId] ?? answers[qNumber] ?? answers[answerKey] ?? "";
    const review =
      reviewData[questionId] ??
      reviewData[String(questionId)] ??
      reviewData[qNumber] ??
      reviewData[String(qNumber)] ??
      reviewData[answerKey] ??
      {};
    const isReviewMode = mode === "review";
    const correctAnswer = review.correctAnswer ?? "";
    const showWrong =
      isReviewMode &&
      review.hasOwnProperty("isCorrect") &&
      review.isCorrect === false;
    const showCorrect = isReviewMode && review.isCorrect === true;
    const isBookmarked =
      bookmarks.has(questionId) || bookmarks.has(qNumber) || bookmarks.has(answerKey);

    return (
      <span
        key={`input-${qIndex}`}
        className="inline-flex items-center relative align-middle group"
      >
        <Input
          spellCheck="false"
          type="text"
          value={isReviewMode ? `[${qNumber}] ${answer}` : answer}
          onChange={(e) => {
            if (mode !== "review") {
              onInteraction?.();
              onAnswerChange(questionId || qNumber, e.target.value);
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
          style={{ backgroundColor: themeColors.background, color: themeColors.text }}
        />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleBookmark(answerKey);
          }}
          className={`transition-all ${isBookmarked ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
          aria-label="Bookmark"
        >
          {isBookmarked ? (
            <FaBookmark className="w-5 h-5 text-red-500" />
          ) : (
            <FaRegBookmark className="w-5 h-5 text-gray-400" />
          )}
        </button>
        {showWrong && correctAnswer && showCorrectAnswers && (
          <span className="ml-0 mr-0.5 text-sm text-green-600 font-semibold whitespace-nowrap">
            {correctAnswer}
          </span>
        )}
      </span>
    );
  };

  const parseOptions = {
    replace: (domNode) => {
      if (domNode.type === "text" && domNode.data && domNode.data.includes("___")) {
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
    <div className="w-full" style={{ backgroundColor: themeColors.background }}>
      {question?.image_url && (
        <div className="mb-4">
          <img 
            loading="lazy"
            src={question.image_url}
            alt="Question"
            className="w-full max-w-full h-auto object-contain rounded-lg border"
            style={{ borderColor: themeColors.border, maxHeight: "500px" }}
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        </div>
      )}
      <div
        className={`${styles.content} prose prose-slate max-w-none [&_h3]:text-xl [&_h3]:font-bold [&_h3]:mb-3 [&_h4]:text-lg [&_h4]:font-semibold [&_h4]:mt-4 [&_h4]:mb-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_li]:mb-2 [&_p]:mb-3`}
        data-selectable="true"
        style={{ color: themeColors.text }}
      >
        {parse(processedHtml, parseOptions)}
      </div>
    </div>
  );
};

export default UniversalQuestionView;
