// Shared helpers for the reading-explanation pipeline.
//
// Secrets: this module reads GEMINI_API_KEY / Supabase creds from the process
// environment only. Run scripts with `node --env-file=.env.explain ...`.
// Never hardcode a key here and never print one.
//
// `.env.explain` selects WHICH project is written to. There is no --prod flag by
// design: pointing at prod is an explicit act of editing that file. Verify
// SUPABASE_URL before every run - dev is miyoovimtupziuehtcxi, prod is
// oqzluzzctiirxxhxsboc.

import { createClient } from '@supabase/supabase-js';

export function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. Run with: node --env-file=.env.explain scripts/explain/<script>.mjs`
    );
  }
  return value;
}

export function supabase() {
  return createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  });
}

/** Which Supabase project the current env points at - printed before any write. */
export function projectRef() {
  const m = requireEnv('SUPABASE_URL').match(/https:\/\/([a-z0-9]+)\.supabase\.co/);
  const ref = m?.[1] ?? 'unknown';
  const KNOWN = { miyoovimtupziuehtcxi: 'DEV', oqzluzzctiirxxhxsboc: 'PROD' };
  return { ref, label: KNOWN[ref] ?? 'UNKNOWN' };
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Strip the HTML the admin editor stores in `question.instruction` /
 * `question.question_text`. Gap markers become a visible token so the model can
 * see where the blank sits; <br>/<p>/<tr> become newlines so table rows survive.
 */
export function htmlToText(html) {
  if (!html) return '';
  return html
    .replace(/<\s*(br|\/p|\/div|\/tr|\/h[1-6])\s*\/?>/gi, '\n')
    .replace(/<\s*(td|th)\s*[^>]*>/gi, ' | ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Fetch one reading test with everything an explanation needs: passage text per
 * part, group metadata, question rows, and the option legend.
 *
 * Two data traps this deliberately works around:
 *  - `multiple_choice` rows carry `correct_answer = NULL`; the answer only
 *    exists as `options.is_correct`. Callers must use resolveAnswer(), not
 *    `row.correct_answer`.
 *  - `options.is_correct` is unreliable on letter-legend groups (matching /
 *    paragraph types), where several legend rows are flagged true. There the
 *    letter in `questions.correct_answer` is authoritative and options are only
 *    a key -> label lookup.
 */
export async function fetchTest(db, testId) {
  const { data: test, error: tErr } = await db
    .from('test')
    .select('id, title, type, is_active')
    .eq('id', testId)
    .single();
  if (tErr) throw new Error(`test ${testId}: ${tErr.message}`);

  const [{ data: parts, error: pErr }, { data: groups, error: gErr }, { data: rows, error: rErr }, { data: opts, error: oErr }] =
    await Promise.all([
      db.from('part').select('id, part_number, title, content').eq('test_id', testId).order('part_number'),
      db.from('question').select('id, part_id, type, question_range, instruction, question_text').eq('test_id', testId),
      db
        .from('questions')
        .select('id, question_id, part_id, question_number, question_text, correct_answer, explanation')
        .eq('test_id', testId)
        .order('question_number'),
      db.from('options').select('question_id, question_number, option_key, option_text, is_correct').eq('test_id', testId),
    ]);
  for (const e of [pErr, gErr, rErr, oErr]) if (e) throw new Error(`${testId}: ${e.message}`);

  const partById = new Map(parts.map((p) => [p.id, p]));
  const groupById = new Map(groups.map((g) => [g.id, g]));

  const items = rows
    // question_number IS NULL marks a drag_drop word-bank distractor, not a
    // question anyone was asked. These must never receive an explanation.
    .filter((r) => r.question_number != null)
    .map((r) => ({
      ...r,
      part: partById.get(r.part_id) ?? null,
      group: groupById.get(r.question_id) ?? null,
      options: opts.filter((o) => o.question_id === r.question_id),
    }))
    .filter((r) => r.group && r.part);

  return { test, parts, groups, items };
}

// `options` holds two different conventions under one table, and conflating
// them silently corrupts multiple_choice:
//
//  (1) GROUP LEGEND - option_key is set ('A'..'F'), question_number is NULL.
//      One shared list per group; the per-question answer is the letter stored
//      in `questions.correct_answer`. Used by matching_information, `table`,
//      multiple_answers.
//
//  (2) PER-QUESTION CHOICES - option_key is NULL, question_number identifies
//      the question. `questions.correct_answer` is always NULL here; the answer
//      is the row flagged is_correct. Used by multiple_choice.
//
// In (2) the displayed letter is positional, not stored: testDetailStore.js
// fetches options `.order("option_text")` and processMultipleChoice() letters
// them by index. Reproducing that sort here is what keeps the explanation's
// letter in step with what the student saw on screen.

/** Options scoped to one question, in the UI's display order, lettered as the UI letters them. */
export function choicesOf(item) {
  const scoped = item.options
    .filter((o) => o.question_number === item.question_number && o.option_text)
    .sort((a, b) => String(a.option_text).localeCompare(String(b.option_text)));
  return scoped.map((o, i) => ({
    key: String.fromCharCode(65 + i),
    text: o.option_text.trim(),
    isCorrect: o.is_correct === true,
  }));
}

/** Group-level letter legend: [{key, text}], deduped, letter-ordered. */
export function legendOf(item) {
  const seen = new Map();
  for (const o of item.options) {
    if (!o.option_key || !o.option_text) continue;
    if (!seen.has(o.option_key)) seen.set(o.option_key, o.option_text.trim());
  }
  const legend = [...seen.entries()]
    .map(([key, text]) => ({ key, text }))
    .sort((a, b) => a.key.localeCompare(b.key));
  if (legend.length) return legend;
  // multiple_choice has no keyed legend - fall back to its own lettered choices
  // so prompts can still show the student the option list they saw.
  return choicesOf(item);
}

/**
 * The stored answer, resolved per convention.
 * Returns { answer, answerText, source } or { answer: null, defect }.
 */
export function resolveAnswer(item) {
  const stored = (item.correct_answer ?? '').trim();
  if (stored) return { answer: stored, answerText: null, source: 'correct_answer' };

  // Convention (2): the answer exists only as the is_correct choice row.
  const choices = choicesOf(item);
  const correct = choices.filter((c) => c.isCorrect);
  if (correct.length === 1) {
    return { answer: correct[0].key, answerText: correct[0].text, source: 'options' };
  }
  if (correct.length > 1) {
    return {
      answer: null,
      defect: `${correct.length} options flagged correct for a single-answer question`,
    };
  }
  return {
    answer: null,
    defect: choices.length
      ? 'no option flagged correct'
      : 'no answer: correct_answer empty and no option rows for this question',
  };
}
