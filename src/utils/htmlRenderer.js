/**
 * HTML renderer utilities for universal question content.
 * Sanitization, table structure, scroll wrappers, and blank slot processing.
 */

import DOMPurify from "dompurify";

const ALLOWED_TAGS = [
  "p", "div", "span", "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li", "strong", "em", "b", "i", "u", "br",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td",
];

const ALLOWED_ATTR = ["class", "colspan", "rowspan"];

/**
 * Sanitize HTML for editor content. Allows only safe tags and attributes.
 * Preserves table elements and div box classes (info-box, tip-box, etc.).
 * @param {string} html - Raw HTML string
 * @returns {string} Sanitized HTML
 */
export function sanitizeEditorHTML(html) {
  if (typeof html !== "string") return "";
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Ensure tables have valid structure (tbody if missing) and a styling class.
 * @param {string} html - Sanitized HTML string
 * @returns {string} HTML with normalized table structure
 */
export function ensureTableStructure(html) {
  if (typeof html !== "string") return "";
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const tables = doc.querySelectorAll("table");
  tables.forEach((table) => {
    if (!table.classList.contains("question-table")) {
      table.classList.add("question-table");
    }
    const tbody = table.querySelector("tbody");
    const directRows = Array.from(table.children).filter((n) => n.tagName === "TR");
    if (directRows.length > 0) {
      const tbodyEl = tbody || doc.createElement("tbody");
      if (!tbody) {
        table.appendChild(tbodyEl);
      }
      directRows.forEach((row) => tbodyEl.appendChild(row));
    }
  });
  return doc.body?.innerHTML ?? "";
}

/**
 * Wrap each table in a horizontal scroll wrapper.
 * @param {string} html - HTML string (with valid table structure)
 * @returns {string} HTML with tables wrapped in .table-scroll-wrapper
 */
export function wrapTablesInWrapper(html) {
  if (typeof html !== "string") return "";
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const tables = doc.querySelectorAll("table");
  tables.forEach((table) => {
    if (table.parentNode?.classList?.contains("table-scroll-wrapper")) return;
    const wrapper = doc.createElement("div");
    wrapper.className = "table-scroll-wrapper";
    table.parentNode.insertBefore(wrapper, table);
    wrapper.appendChild(table);
  });
  return doc.body?.innerHTML ?? "";
}

/**
 * Replace each "___" with a numbered blank span. Numbering starts at startQuestionNumber.
 * @param {string} html - HTML string
 * @param {number} startQuestionNumber - First blank index (e.g. 1)
 * @returns {string} HTML with ___ replaced by <span class="blank-slot" data-blank-index="n">[n]</span>
 */
export function processBlanks(html, startQuestionNumber) {
  if (typeof html !== "string") return "";
  const start = Number(startQuestionNumber) || 1;
  const parts = html.split("___");
  if (parts.length <= 1) return html;
  let index = start;
  const result = parts
    .map((part, i) => {
      if (i === parts.length - 1) return part;
      const span = `<span class="blank-slot" data-blank-index="${index}">[${index}]</span>`;
      index += 1;
      return part + span;
    })
    .join("");
  return result;
}
