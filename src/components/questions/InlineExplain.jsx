import React from "react";
import { MdOutlineLightbulb } from "react-icons/md";
import { useExplain } from "./ExplainContext";

/**
 * Explain for the types whose questions are GAPS INSIDE TEXT (gap-fill, table
 * completion, universal, drag-drop) or rows inside a group (matching, table).
 *
 * Deliberately two pieces rather than one component:
 *
 *   <ExplainIcon/>   goes INSIDE the gap's wrapper, next to the report flag, so
 *                    the affordance sits on the answer it belongs to.
 *   <ExplainPanel/>  goes immediately AFTER that wrapper, as a sibling.
 *
 * The split is what makes the panel expand properly. The gap wrapper is an
 * `inline-flex` span, so a panel nested inside it would become a flex item and
 * sit beside the input. As a sibling in the surrounding text flow it is a block
 * box in an inline formatting context, which browsers place on its own line and
 * push the following text down - the explanation lands directly beneath the line
 * the student is reading, at full column width, without covering anything.
 *
 * Everything here is a <span> with a display utility. These render inside <p>
 * and <td>, where a <div> would be invalid phrasing content.
 */

/** Icon-only toggle. Renders nothing without an explanation, or outside review. */
export function ExplainIcon({ questionKey, explanation, isReviewMode = true, className = "" }) {
  const explain = useExplain();
  const text = (explanation ?? '').toString().trim();
  if (!explain || !isReviewMode || !text) return null;

  const isOpen = explain.isOpen(questionKey);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        explain.toggle(questionKey);
      }}
      aria-expanded={isOpen}
      aria-controls={`explain-panel-${questionKey}`}
      aria-label={isOpen ? `Hide the explanation for question ${questionKey}` : `Why the answer to question ${questionKey} is correct`}
      title={isOpen ? 'Hide explanation' : 'Why this is the answer'}
      data-testid="explain-toggle"
      data-explain-toggle={questionKey}
      className={`shrink-0 rounded transition-colors ${
        isOpen ? 'text-brand-700 bg-brand-50' : 'text-brand-500 hover:text-brand-700'
      } ${className}`}
    >
      <MdOutlineLightbulb className="w-5 h-5" />
    </button>
  );
}

/** The expanded explanation. Sibling of the gap wrapper - see the note above. */
export function ExplainPanel({ questionKey, explanation, isReviewMode = true }) {
  const explain = useExplain();
  const text = (explanation ?? '').toString().trim();
  if (!explain || !isReviewMode || !text || !explain.isOpen(questionKey)) return null;

  return (
    <span
      id={`explain-panel-${questionKey}`}
      data-testid="explain-panel"
      data-explain-panel={questionKey}
      className="block my-2 rounded-xl border border-brand-100 bg-white p-4 shadow-sm"
    >
      <span className="flex items-center gap-2 mb-2 leading-none">
        <MdOutlineLightbulb className="text-brand-600 shrink-0" size={16} />
        <span className="text-[11px] font-black uppercase tracking-widest text-brand-700">
          Why this is the answer
        </span>
        <span className="text-[11px] font-bold text-brand-400">Q{questionKey}</span>
      </span>
      {/* whitespace-pre-line: explanations are stored as three labelled lines
          (Where / Quote / Why) and the breaks have to survive. */}
      <span className="block text-sm leading-relaxed text-gray-700 whitespace-pre-line">
        {text}
      </span>
    </span>
  );
}
