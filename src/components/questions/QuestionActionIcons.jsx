import React from "react";
import { FaRegBookmark, FaBookmark } from "react-icons/fa";
import { MdOutlineFlag } from "react-icons/md";

/**
 * Standard action icons for an answerable question.
 *
 * Single source of truth for the bookmark + report controls so every question type
 * renders them at the same size and spacing (previously each component rolled its own,
 * which drifted and let the page's report flag collide with a component's bookmark).
 *
 * - Bookmark: shown in every mode. Hover-gated (invisible until group-hover) unless already
 *   bookmarked — matching the existing behaviour (discoverability is tracked separately).
 * - Report: shown ONLY in review mode (mode === 'review'), always visible when shown.
 *
 * Both icons are 20px (`w-5 h-5`). The parent supplies positioning via `className`.
 * The parent must also provide a `group` ancestor for the bookmark's hover reveal.
 *
 * @param {boolean} isBookmarked
 * @param {function} onToggleBookmark - () => void
 * @param {boolean} isReviewMode - when true, the report icon is rendered
 * @param {function} onReport - () => void, opens the report-a-problem modal for this question
 * @param {string} className - positioning/utility classes for the wrapper
 */
const QuestionActionIcons = ({
  isBookmarked = false,
  onToggleBookmark = () => {},
  isReviewMode = false,
  onReport,
  className = "",
}) => {
  return (
    <span className={`inline-flex items-center gap-1 align-middle ${className}`}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleBookmark();
        }}
        className={`transition-all ${
          isBookmarked ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
        title={isBookmarked ? "Remove bookmark" : "Bookmark question"}
        aria-label={isBookmarked ? "Remove bookmark" : "Bookmark question"}
      >
        {isBookmarked ? (
          <FaBookmark className="w-5 h-5 text-red-500" />
        ) : (
          <FaRegBookmark className="w-5 h-5 text-gray-400 hover:text-red-500" />
        )}
      </button>

      {isReviewMode && onReport && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onReport();
          }}
          className="text-gray-300 hover:text-red-500 transition-colors"
          title="Report a problem with this question"
          aria-label="Report a problem with this question"
        >
          <MdOutlineFlag className="w-5 h-5" />
        </button>
      )}
    </span>
  );
};

export default QuestionActionIcons;
