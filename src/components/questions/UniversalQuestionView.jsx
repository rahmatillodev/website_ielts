import React from "react";
import {
  sanitizeEditorHTML,
  ensureTableStructure,
  wrapTablesInWrapper,
  processBlanks,
} from "@/utils/htmlRenderer";
import styles from "./UniversalQuestionView.module.css";

/**
 * Renders sanitized universal question HTML with numbered blank slots.
 * Static display only; no ReactQuill or admin logic.
 *
 * @param {string} html - Raw HTML from group.content
 * @param {number} startQuestionNumber - First blank number (e.g. 1)
 */
const UniversalQuestionView = ({ html, startQuestionNumber }) => {
  const start = startQuestionNumber != null ? Number(startQuestionNumber) : 1;
  console.log("startQuestionNumber", startQuestionNumber);
  console.log("html", html);
  

  if (!html || typeof html !== "string") {
    return <div className={styles.content} />;
  }

  const sanitized = sanitizeEditorHTML(html);
  const withTables = ensureTableStructure(sanitized);
  const withWrapper = wrapTablesInWrapper(withTables);
  const previewHtml = processBlanks(withWrapper, start);

  return (
    <div
      className={styles.content}
      dangerouslySetInnerHTML={{ __html: previewHtml }}
    />
  );
};

export default UniversalQuestionView;
