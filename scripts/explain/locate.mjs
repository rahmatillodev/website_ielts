// Deterministic answer location - the "Where:" line, derived from the passage
// rather than asked of the model.
//
// Measured against prod (active reading, 2026-08): fill_in_blanks resolves
// 97.8% verbatim / 96.0% under the question-order rule, table_completion
// 100% / 91.1%. drag_drop is paraphrase-by-construction (word bank) and only
// resolves 35% verbatim, so it is NOT in DETERMINISTIC_TYPES and falls through
// to the model. `table` needs no search at all: its stored answer IS the
// paragraph letter.

const DASHES = [
  ['’', "'"], ['‘', "'"], ['“', '"'], ['”', '"'],
  ['–', '-'], ['—', '-'], [' ', ' '],
];

/** Fold typographic variants so passage text and stored answers compare equal. */
export function norm(s) {
  let out = (s ?? '').normalize('NFKD');
  for (const [a, b] of DASHES) out = out.split(a).join(b);
  return out.replace(/\s+/g, ' ').toLowerCase();
}

/** Types whose answer is a verbatim span of the passage. */
export const DETERMINISTIC_TYPES = new Set(['fill_in_blanks', 'table_completion']);

/**
 * Split a passage into labelled paragraph blocks.
 *
 * Lettered passages must be cited by letter - that is what the question paper
 * shows the student - and plain ones by ordinal. Detecting which is which is
 * fiddlier than it looks, because the corpus uses BOTH conventions:
 *
 *   "A \nNew Zealand's native frogs are..."   <- letter on its own line
 *   "A Anthropologists calculate that..."      <- letter inline with the text
 *
 * and a paragraph may legitimately open with the article "A" ("A study of
 * non-verbal communication carried out in 1967..."). Matching a bare leading
 * capital would mislabel those. The discriminator is the SEQUENCE: real
 * lettering runs A, B, C, ... consecutively across blocks. A lone "A" with no
 * "B" after it is the article, not a marker.
 */
export function paragraphs(content) {
  const text = content ?? '';

  // Pass 1: split on paragraph-letter markers wherever they appear at the start
  // of a line. This has to run BEFORE any blank-line split, because a sizeable
  // minority of lettered passages separate their paragraphs with a single \n -
  // splitting those on \n\n yields one giant block and loses the lettering.
  const markers = [...text.matchAll(/^[ \t]*([A-K])(?:[ \t]*\n|[ \t]+(?=[A-Z"“]))/gm)];
  const run = markers.map((m) => m[1]);
  if (run.length >= 3 && run.every((ch, i) => ch.charCodeAt(0) === 65 + i)) {
    const out = [];
    const intro = text.slice(0, markers[0].index).trim();
    if (intro) out.push({ label: 'the introduction', letter: null, body: intro, norm: norm(intro) });
    markers.forEach((m, i) => {
      const start = m.index;
      const end = i + 1 < markers.length ? markers[i + 1].index : text.length;
      const body = text.slice(start, end).trim();
      out.push({ label: `Paragraph ${m[1]}`, letter: m[1], body, norm: norm(body) });
    });
    return out;
  }

  // Pass 2: unlettered prose. Prefer blank-line separation; fall back to single
  // newlines when the passage never uses blank lines at all.
  let blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  if (blocks.length < 3 && text.split('\n').filter((l) => l.trim()).length >= 3) {
    blocks = text.split('\n').map((b) => b.trim()).filter(Boolean);
  }

  return blocks.map((body, i) => ({
    label: `Paragraph ${i + 1}`,
    letter: null,
    body,
    norm: norm(body),
  }));
}

/** The sentence inside `body` that spans offset `at` (normalised offsets). */
function sentenceAt(block, at) {
  const text = block.body.replace(/\s+/g, ' ').trim();
  // Walk the raw text keeping a normalised cursor so offsets stay aligned.
  const pieces = text.split(/(?<=[.!?])\s+(?=[A-Z"'(])/);
  let cursor = 0;
  for (const p of pieces) {
    const len = norm(p).length + 1;
    if (at >= cursor && at < cursor + len) return p.trim();
    cursor += len;
  }
  return pieces[pieces.length - 1]?.trim() ?? text;
}

/**
 * Locate every deterministic answer in one part, in question order.
 *
 * The question-order rule: IELTS gap answers appear in the passage in the same
 * order the questions are asked, so the search for question N starts where
 * question N-1's answer ended. That disambiguates answers whose word occurs
 * many times ("water", "1990"). Falls back to a global first-occurrence when
 * the ordered search misses.
 *
 * @returns Map<question row id, {label, quote, exact}>
 */
export function locatePart(items, content) {
  const blocks = paragraphs(content);
  const found = new Map();
  let cursor = 0;

  // Flat normalised passage plus block offsets, so one find() maps to a block.
  const offsets = [];
  let flat = '';
  for (const b of blocks) {
    offsets.push({ start: flat.length, end: flat.length + b.norm.length, block: b });
    flat += b.norm + ' ';
  }

  const ordered = [...items].sort((a, b) => a.question_number - b.question_number);
  for (const item of ordered) {
    const type = item.group?.type;
    if (!DETERMINISTIC_TYPES.has(type)) continue;
    const ans = norm(item.correct_answer).trim();
    if (!ans) continue;

    let at = flat.indexOf(ans, cursor);
    const exact = at !== -1;
    if (!exact) at = flat.indexOf(ans);
    if (at === -1) continue;

    const hit = offsets.find((o) => at >= o.start && at < o.end);
    if (!hit) continue;

    found.set(item.id, {
      label: hit.block.label,
      quote: sentenceAt(hit.block, at - hit.start),
      exact,
      kind: 'search',
    });
    cursor = at + ans.length;
  }
  return found;
}

/**
 * `table` groups ask "which paragraph contains X" - the stored letter is the
 * location, so the Where line needs no search and cannot be wrong.
 */
export function paragraphByLetter(content, letter) {
  const want = String(letter ?? '').trim().toUpperCase();
  if (!want) return null;
  const blocks = paragraphs(content);
  const hit = blocks.find((b) => b.letter === want);
  if (hit) return { ...hit, kind: 'letter' };

  // Unlettered passage answered by letter. Position is the only handle left,
  // and it is NOT reliable: the A-F lettering on the question paper refers to
  // the BODY paragraphs, so any title/standfirst block shifts the mapping.
  // Counting from the first block that looks like body prose removes the most
  // common off-by-one, but the result is still a guess - callers must treat
  // kind:'positional' as weaker evidence than the located quote.
  const firstBody = blocks.findIndex((b) => b.body.replace(/\s+/g, ' ').trim().length > 160);
  const base = firstBody === -1 ? 0 : firstBody;
  const idx = base + (want.charCodeAt(0) - 65);
  const blk = blocks[idx];
  return blk ? { ...blk, kind: 'positional' } : null;
}
