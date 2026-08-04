/**
 * Answer normalization for grading typed answers.
 *
 * The real exam accepts a correct answer written in more than one legitimate
 * form — British or American spelling, a date in any standard form, a number as
 * a word or a digit. Our grader compared strings exactly, so it marked those
 * students wrong. This layer canonicalizes both the stored key and the student's
 * answer, then compares.
 *
 * Two rules govern everything here:
 *
 * 1. **Structural, never fuzzy.** No edit distance, no similarity score. A
 *    fuzzy matcher would accept `2 July` for `1 July`; a date parser cannot.
 *    Where a transform can't be expressed precisely, it is left out — we would
 *    rather keep marking a rare variant wrong than start accepting wrong answers.
 *
 * 2. **Dispatch, not a pipeline.** Structured recognizers run first and each
 *    either claims the whole answer or declines. Chaining them as string→string
 *    is a correctness hazard: number folding rewrites `17th February` to
 *    `17#ord february` and silently destroys the date parse. Ask for the
 *    canonical form, not for a sequence of rewrites.
 *
 * Deliberately excluded, because each would accept a genuinely wrong answer:
 * stemming or any singular/plural folding (`teachers` and `teacher` are
 * different answers), the `-ce/-se` family as a rule (`practice`/`practise`
 * differ by part of speech in British English), the `ae/oe` family
 * (`shoes` → `shes`), purely numeric dates (`1/7` is 1 July in the UK and
 * 7 January in the US), and `licence`/`license` (noun vs verb in British
 * English, and no measured benefit).
 */

/**
 * The approved British/American pairs. A closed, reviewed list rather than
 * suffix rules: rules generalize to words nobody checked, and on this corpus
 * they produced `for`↔`four`, `prize`↔`prise` and `dinner`→`diner`. Acceptance
 * can only ever be granted for a pair on this list.
 */
export const SPELLING_VARIANTS = [
  ["colour", "color"],
  ["coloured", "colored"],
  ["behaviour", "behavior"],
  ["harbour", "harbor"],
  ["humour", "humor"],
  ["rumour", "rumor"],
  ["theatre", "theater"],
  ["defences", "defenses"],
  ["civilisation", "civilization"],
  ["standardisation", "standardization"],
  ["stabilise", "stabilize"],
  ["fertiliser", "fertilizer"],
  ["travelling", "traveling"],
  ["archaeological", "archeological"],
  ["dialogue", "dialog"],
  ["programme", "program"],
  ["grey", "gray"],
];

const VARIANT_CANON = new Map();
for (const [british, american] of SPELLING_VARIANTS) {
  VARIANT_CANON.set(british, british);
  VARIANT_CANON.set(american, british);
}

const CARDINAL_WORDS = new Map(Object.entries({
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60,
  seventy: 70, eighty: 80, ninety: 90, hundred: 100, thousand: 1000,
}));

const ORDINAL_WORDS = new Map(Object.entries({
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7,
  eighth: 8, ninth: 9, tenth: 10, eleventh: 11, twelfth: 12, thirteenth: 13,
  fourteenth: 14, fifteenth: 15, sixteenth: 16, seventeenth: 17,
  eighteenth: 18, nineteenth: 19, twentieth: 20, thirtieth: 30,
}));

const MONTHS = new Map(Object.entries({
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7,
  august: 8, september: 9, october: 10, november: 11, december: 12,
}));

/** Abbreviated month forms. A closed set, so no ambiguity is introduced. */
const MONTH_ABBREVIATIONS = new Map(Object.entries({
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8,
  sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
}));

/**
 * Case, whitespace and punctuation hygiene. This is what the grader used to do
 * on its own, plus internal whitespace collapsing (a stored key with a double
 * space mis-graded before) and trailing sentence punctuation, which appears on
 * some stored keys.
 */
function basic(raw) {
  if (raw === null || raw === undefined) return "";
  return String(raw)
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.,;:!?]+$/, "")
    .trim();
}

/** 'twenty two' → 22. Returns [value, tokensConsumed] or [null, 0]. */
function readCardinal(tokens, i) {
  const first = CARDINAL_WORDS.get(tokens[i]);
  if (first === undefined) return [null, 0];
  const isTens = [20, 30, 40, 50, 60, 70, 80, 90].includes(first);
  if (isTens) {
    const next = CARDINAL_WORDS.get(tokens[i + 1]);
    if (next !== undefined && next < 10) return [first + next, 2];
  }
  return [first, 1];
}

/**
 * A date, or null. Declines unless the entire answer is consumed, so
 * `354 Forest` and `28th August trip` are never read as dates. Purely numeric
 * forms are refused: `1/7` means 1 July in the UK and 7 January in the US, so
 * accepting it would mean accepting a different date.
 */
function parseDate(text) {
  let t = text
    .replace(/\b(?:the|of)\b/g, " ")
    .replace(/(\d)\s+(st|nd|rd|th)\b/g, "$1$2")   // '15 th' → '15th'
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return null;

  const tokens = t.split(/[\s,]+/).filter(Boolean);
  if (tokens.length === 0 || tokens.length > 3) return null;

  let day = null;
  let month = null;
  let year = null;

  for (const token of tokens) {
    const bare = token.replace(/\.$/, "");          // 'jul.' → 'jul'

    if (month === null && MONTHS.has(bare)) { month = MONTHS.get(bare); continue; }
    if (month === null && MONTH_ABBREVIATIONS.has(bare)) {
      month = MONTH_ABBREVIATIONS.get(bare);
      continue;
    }
    if (year === null && /^(?:19|20)\d{2}$/.test(bare)) { year = Number(bare); continue; }

    const numeric = /^(\d{1,2})(st|nd|rd|th)?$/.exec(bare);
    if (day === null && numeric) {
      const value = Number(numeric[1]);
      if (value >= 1 && value <= 31) { day = value; continue; }
      return null;
    }
    if (day === null && ORDINAL_WORDS.has(bare)) {
      const value = ORDINAL_WORDS.get(bare);
      if (value >= 1 && value <= 31) { day = value; continue; }
      return null;
    }
    return null;                                     // token nothing claimed
  }

  if (day === null || month === null) return null;
  return `date:${day}-${month}` + (year === null ? "" : `-${year}`);
}

/**
 * A clock time, or null. Only `H:MM` and `H.MM` — the corpus stores both
 * separators for the same times. Spoken forms ('half past nine') are out of
 * scope: each extra pattern is new acceptance surface for no measured gain.
 */
function parseTime(text) {
  const t = text.replace(/\ba\.?m\.?\b/g, "am").replace(/\bp\.?m\.?\b/g, "pm").trim();
  const m = /^(\d{1,2})[.:](\d{2})\s*(am|pm)?$/.exec(t);
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour > 23 || minute > 59) return null;
  return `time:${hour}-${minute}` + (m[3] ? `-${m[3]}` : "");
}

/**
 * True for a token that looks like part of a code: it carries a digit, plus
 * either a letter or enough digits to be a number group. `courses` and `th`
 * both fail, which is what keeps prose out of the code path.
 */
function codeLikeToken(token) {
  if (!/^[a-z0-9]+$/.test(token)) return false;
  if (!/\d/.test(token)) return false;
  return /[a-z]/.test(token) || token.length >= 3;
}

/**
 * A reference code, postcode or phone number with the separators removed, or
 * null. Requires EVERY token to be code-like, so `chain store` and `3 courses`
 * decline and can never be compared space-insensitively.
 */
function parseCode(text) {
  const tokens = text.split(/[\s-]+/).filter(Boolean);
  if (tokens.length === 0) return null;
  // An ordinal is a number, not a code. Without this, '3rd' reads as digit+letter
  // and gets claimed here, so it would never agree with 'third'.
  if (tokens.some((t) => /^\d{1,3}(?:st|nd|rd|th)$/.test(t))) return null;
  if (!tokens.every(codeLikeToken)) return null;
  const joined = tokens.join("");
  if (!/\d/.test(joined)) return null;
  // Below four characters this is a bare number, not a reference code, and
  // number folding is the right treatment for it.
  if (joined.length < 4) return null;
  return `code:${joined}`;
}

/**
 * Cardinal number words become digits so `three courses` and `3 courses` agree.
 * Ordinals keep an explicit marker: `third` and `3rd` agree with each other but
 * never with `3`, because an ordinal and a cardinal are different answers.
 */
function foldNumbers(tokens) {
  const out = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];

    if (ORDINAL_WORDS.has(token)) { out.push(`${ORDINAL_WORDS.get(token)}#ord`); continue; }

    const ordinalDigits = /^(\d{1,3})(st|nd|rd|th)$/.exec(token);
    if (ordinalDigits) { out.push(`${Number(ordinalDigits[1])}#ord`); continue; }

    const [value, consumed] = readCardinal(tokens, i);
    if (value !== null) { out.push(String(value)); i += consumed - 1; continue; }

    if (/^\d+$/.test(token)) { out.push(String(Number(token))); continue; }

    out.push(token);
  }
  return out;
}

/**
 * The canonical form of an answer. Equal canonical forms mean the two answers
 * are the same answer; unequal means they are not.
 */
export function canonicalizeAnswer(raw) {
  const text = basic(raw);
  if (!text) return "";

  const date = parseDate(text);
  if (date) return date;

  const time = parseTime(text);
  if (time) return time;

  const code = parseCode(text);
  if (code) return code;

  const tokens = text.split(" ").map((t) => VARIANT_CANON.get(t) ?? t);
  return foldNumbers(tokens).join(" ");
}

/**
 * Whether a student's answer should be graded correct against a stored key.
 *
 * Exact comparison is tried first, so no answer that grades correct today can
 * start failing — normalization only ever adds acceptance. A blank answer never
 * counts, matching the previous behaviour.
 */
export function answersMatch(userAnswer, correctAnswer) {
  const user = basic(userAnswer);
  const key = basic(correctAnswer);
  if (!user || !key) return false;
  if (user === key) return true;

  const userCanonical = canonicalizeAnswer(userAnswer);
  const keyCanonical = canonicalizeAnswer(correctAnswer);
  return userCanonical !== "" && userCanonical === keyCanonical;
}
