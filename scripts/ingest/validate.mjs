// Every rule this project has learned the hard way, enforced before any write.
//
// Two severities:
//   error   - refuses to write. The content would be broken or ungradeable.
//   warning - written, but reported for a human to look at.
//
// Nothing here talks to the database: validation runs on the parsed JSON plus the
// source text, so a bad parse is caught before a single row is inserted. That
// ordering is deliberate - the defect this replaces was a pipeline that deleted
// existing rows and only then discovered the new content was unusable.

import { TYPES, OPTIONS, isRomanNumeral, displayLetters } from './types.mjs';
import { norm, inSource, paragraphLetters } from './lib.mjs';
import { checkTextIntegrity } from './textIntegrity.mjs';

const MAX_PART = 5;
const MIN_PART = 1;

export function validate(parsed, sourceText) {
  const errors = [];
  const warnings = [];
  const err = (where, msg) => errors.push({ where, msg });
  const warn = (where, msg) => warnings.push({ where, msg });
  const sourceNorm = norm(sourceText);

  // ---------------------------------------------------------------- test level
  if (!parsed?.test?.title?.trim()) err('test', 'title is required (test.title is NOT NULL)');
  if (!['reading', 'listening'].includes(parsed?.test?.type)) {
    err('test', `type must be reading or listening, got ${JSON.stringify(parsed?.test?.type)}`);
  }
  if (parsed?.test?.difficulty && !['EASY', 'MEDIUM', 'HARD'].includes(parsed.test.difficulty)) {
    err('test', `difficulty must be EASY, MEDIUM or HARD, got ${parsed.test.difficulty}`);
  }

  const parts = parsed?.parts ?? [];
  if (!parts.length) err('test', 'no parts found');

  // ---------------------------------------------------------------- part level
  const seenPartNumbers = new Set();
  for (const part of parts) {
    const at = `part ${part.part_number}`;
    // The DB has CHECK (part_number BETWEEN 1 AND 5). Catching it here is the
    // difference between a clear message and a half-written test.
    if (!Number.isInteger(part.part_number) || part.part_number < MIN_PART || part.part_number > MAX_PART) {
      err(at, `part_number must be an integer ${MIN_PART}-${MAX_PART} (DB CHECK check_part_range)`);
    }
    if (seenPartNumbers.has(part.part_number)) err(at, 'duplicate part_number');
    seenPartNumbers.add(part.part_number);
    if (!part.title?.trim()) err(at, 'title is required (part.title is NOT NULL)');
    if (!part.content?.trim()) err(at, 'content is empty - the passage/transcript must be stored');
    else if (!inSource(part.content.slice(0, 200), sourceNorm)) {
      err(at, 'content does not appear in the source material - it must be sliced from it, not rewritten');
    }

    // Slicing guarantees the passage matches the source byte for byte. It does
    // NOT guarantee the source was extracted cleanly, and a damaged text layer
    // is stored just as faithfully as a good one.
    if (part.content) {
      const integrity = checkTextIntegrity(part.content, at);
      for (const e of integrity.errors) err(e.where, e.msg);
      for (const w of integrity.warnings) warn(w.where, w.msg);
    }
  }

  // ------------------------------------------------------------ question level
  const allNumbers = [];
  const answersByPart = new Map();

  for (const part of parts) {
    for (const group of part.groups ?? []) {
      const at = `part ${part.part_number} / ${group.type}`;
      const spec = TYPES[group.type];
      if (!spec) {
        err(at, `unknown type "${group.type}" - must be one of: ${Object.keys(TYPES).join(', ')}`);
        continue;
      }
      if (spec.unverified) {
        warn(at, `type "${group.type}" has never been verified against reading content - check the result by hand`);
      }

      const questions = group.questions ?? [];
      const options = group.options ?? [];
      if (!questions.length) err(at, 'group has no questions');

      if (group.instruction && !inSource(group.instruction, sourceNorm)) {
        warn(at, 'instruction text was not found in the source - confirm it was not paraphrased');
      }

      // Gap markers must line up with question rows, or answers land in the wrong blank.
      if (spec.groupText) {
        const gaps = (group.question_text ?? '').match(/_{3,}/g)?.length ?? 0;
        const numbered = questions.filter((q) => q.question_number != null).length;
        if (!group.question_text?.trim()) err(at, `${group.type} needs group question_text holding the gapped text`);
        else if (gaps !== numbered) {
          err(at, `${gaps} gap markers (___) but ${numbered} numbered questions - they must match one to one`);
        }
      }

      for (const q of questions) {
        const qAt = `${at} / Q${q.question_number ?? '(unnumbered)'}`;

        // drag_drop word-bank distractors are legitimately unnumbered; nothing else is.
        const isBankRow = group.type === 'drag_drop' && q.question_number == null;
        if (isBankRow) {
          if (q.is_correct === true) err(qAt, 'word-bank distractor must have is_correct false');
          continue;
        }
        if (!Number.isInteger(q.question_number)) {
          err(qAt, 'question_number is required (only drag_drop bank rows may omit it)');
          continue;
        }
        allNumbers.push(q.question_number);

        if (!q.question_text?.trim()) err(qAt, 'question_text is empty');
        else if (!inSource(q.question_text, sourceNorm)) {
          err(qAt, `stem not found in the source: "${q.question_text.slice(0, 60)}..." - it must be copied, not reworded`);
        }

        // --- the answer must be RECOVERABLE, by this type's own convention ---
        if (spec.options === OPTIONS.PER_QUESTION) {
          if (q.correct_answer != null && String(q.correct_answer).trim() !== '') {
            warn(qAt, `${group.type} stores its answer on the option row; correct_answer should be null`);
          }
          const mine = options.filter((o) => o.question_number === q.question_number);
          const correct = mine.filter((o) => o.is_correct === true);
          if (mine.length < 2) err(qAt, `only ${mine.length} option(s) for this question`);
          if (correct.length !== 1) {
            err(qAt, `exactly one option must be flagged correct, found ${correct.length}`);
          }
        } else {
          const a = String(q.correct_answer ?? '').trim();
          if (!a) {
            err(qAt, 'no answer: correct_answer is empty and this type has no per-question options');
            continue;
          }
          if (spec.verdicts && !spec.verdicts.includes(a.toUpperCase())) {
            err(qAt, `correct_answer must be one of ${spec.verdicts.join(' / ')}, got "${a}"`);
          }
          if (spec.options === OPTIONS.GROUP_LEGEND) {
            const keys = options.map((o) => String(o.option_key ?? o.option_text ?? '').trim().toUpperCase());
            if (!keys.includes(a.toUpperCase())) {
              err(qAt, `answer "${a}" does not match any option in this group's legend (${keys.join(', ') || 'none'})`);
            }
          }
          // Free-text answers are graded against the passage, so the spelling has
          // to be the passage's own. US/UK divergence between key and passage is a
          // live grading bug, not a cosmetic one.
          if (spec.correctAnswer === 'text' && !inSource(a, sourceNorm)) {
            err(qAt, `answer "${a}" does not appear in the source - gap answers must use the passage's own spelling`);
          }
          if (spec.correctAnswer === 'text') {
            const partContent = norm(part.content ?? '');
            if (!partContent.includes(norm(a))) {
              err(qAt, `answer "${a}" is not in THIS part's passage - the question is attached to the wrong part`);
            }
          }
        }
      }

      // ------------------------------------------------- option-level checks
      const legendMode = spec.options === OPTIONS.GROUP_LEGEND;
      for (const o of options) {
        const oAt = `${at} / option ${o.option_key ?? o.option_text ?? '?'}`;
        if (!String(o.option_text ?? '').trim()) err(oAt, 'option_text is empty');
        else if (group.type !== 'table' && !inSource(o.option_text, sourceNorm)) {
          err(oAt, `option text not found in the source: "${String(o.option_text).slice(0, 50)}..."`);
        }
        if (legendMode) {
          if (o.question_number != null) err(oAt, 'group-legend options must have question_number null');
          if (group.type !== 'table' && !String(o.option_key ?? '').trim()) {
            err(oAt, 'group-legend options need an option_key');
          }
        }
        if (spec.options === OPTIONS.PER_QUESTION) {
          if (o.question_number == null) err(oAt, 'per-question options must carry question_number');
        }
        if (spec.options === OPTIONS.NONE && options.length) {
          warn(at, `${group.type} does not use options, but ${options.length} were supplied`);
        }
      }

      // An authored option_key that disagrees with the letter the student is shown.
      //
      // For per-question choices the app ignores option_key entirely and letters the
      // options by sorting option_text alphabetically. 131 of the 156 live prod MC
      // questions that carry an authored key therefore display a DIFFERENT letter than
      // the one the author assigned. Grading is unaffected (it matches on option_text
      // and is_correct), but any check against a paper answer key is then comparing
      // two different lettering schemes - which is how a wrong is_correct flag gets in
      // and goes unnoticed. Either leave option_key null or make it agree.
      if (spec.options === OPTIONS.PER_QUESTION) {
        for (const q of questions) {
          if (q.question_number == null) continue;
          const mine = options.filter((o) => o.question_number === q.question_number);
          const shown = displayLetters(mine.map((o) => o.option_text));
          for (const o of mine) {
            const key = String(o.option_key ?? '').trim().toUpperCase();
            if (!key) continue;
            const letter = shown.find((l) => l.text === o.option_text)?.letter;
            if (letter && key !== letter) {
              warn(
                `${at} / Q${q.question_number}`,
                `option "${String(o.option_text).slice(0, 32)}" is authored as ${key} but the app shows ` +
                  `it as ${letter}. option_key is NOT STORED for this type - the key is dropped on write ` +
                  `and the answer is identified by option text.`
              );
            }
          }
        }
      }

      // List of headings hides inside matching_information; say so in the report.
      if (group.type === 'matching_information') {
        const romans = questions.filter((q) => isRomanNumeral(q.correct_answer, group.instruction)).length;
        if (romans && romans !== questions.length) {
          warn(at, `mixed answer styles: ${romans} of ${questions.length} look like list-of-headings roman numerals`);
        }
      }

      // Letter answers are unanswerable if the passage never labels its paragraphs.
      if (group.type === 'table' || (group.type === 'matching_information' && !questions.some((q) => isRomanNumeral(q.correct_answer, group.instruction)))) {
        const need = new Set(questions.map((q) => String(q.correct_answer ?? '').trim().toUpperCase()).filter((a) => /^[A-Z]$/.test(a)));
        const have = paragraphLetters(part.content ?? '');
        const missing = [...need].filter((l) => !have.has(l));
        if (missing.length) {
          err(
            at,
            `the passage does not label paragraph(s) ${missing.join(', ')}, but questions answer with those ` +
              `letters - the test would be unanswerable as written`
          );
        }
      }

      answersByPart.set(part.part_number, (answersByPart.get(part.part_number) ?? 0) + questions.length);
    }
  }

  // ------------------------------------------------------------- whole paper
  const sorted = [...new Set(allNumbers)].sort((a, b) => a - b);
  if (sorted.length !== allNumbers.length) {
    const dupes = allNumbers.filter((n, i) => allNumbers.indexOf(n) !== i);
    err('test', `duplicate question numbers: ${[...new Set(dupes)].join(', ')}`);
  }
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) {
      warn('test', `question numbers jump from ${sorted[i - 1]} to ${sorted[i]} - confirm nothing was missed`);
    }
  }
  if (sorted.length && sorted[0] !== 1) warn('test', `numbering starts at ${sorted[0]}, not 1`);

  return { ok: errors.length === 0, errors, warnings, questionCount: sorted.length, numbers: sorted };
}

/** What the parse found, for the confirmation report. */
export function summarise(parsed) {
  const byType = {};
  let questions = 0;
  let bankRows = 0;
  for (const part of parsed.parts ?? []) {
    for (const g of part.groups ?? []) {
      const real = (g.questions ?? []).filter((q) => q.question_number != null);
      byType[g.type] = (byType[g.type] ?? 0) + real.length;
      questions += real.length;
      bankRows += (g.questions ?? []).length - real.length;
    }
  }
  return {
    title: parsed.test?.title,
    testType: parsed.test?.type,
    parts: (parsed.parts ?? []).map((p) => ({
      part_number: p.part_number,
      title: p.title,
      contentChars: (p.content ?? '').length,
      groups: (p.groups ?? []).length,
      questions: (p.groups ?? []).reduce((n, g) => n + (g.questions ?? []).filter((q) => q.question_number != null).length, 0),
    })),
    byType,
    questions,
    bankRows,
  };
}

/** Letters a student will see for a per-question group, for the dry-run report. */
export function previewLetters(group, questionNumber) {
  const texts = (group.options ?? []).filter((o) => o.question_number === questionNumber).map((o) => o.option_text);
  return displayLetters(texts);
}
