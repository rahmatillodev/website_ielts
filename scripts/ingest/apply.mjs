// Write a validated test to the database, atomically, then verify it.
//
// Atomicity without a transaction: PostgREST cannot run multi-statement
// transactions, but every child table cascades from `test`
// (part/question/questions/options ... ON DELETE CASCADE). So for a BRAND NEW test
// the whole write can be undone by deleting the one test row. That is only sound
// because nothing else references a test we just created in this run - which is
// why this pipeline creates new tests and never edits existing ones.
//
// The compensating delete is the ONLY delete here, and it can only ever remove a
// test this run created seconds earlier. Validation happens entirely before the
// first insert.

import { displayLetters, TYPES, OPTIONS } from './types.mjs';
import { norm } from './lib.mjs';

/** Rows that would be written, table by table - the --dry-run report. */
export function planRows(parsed) {
  const plan = { test: 1, part: 0, question: 0, questions: 0, options: 0 };
  for (const part of parsed.parts ?? []) {
    plan.part += 1;
    for (const g of part.groups ?? []) {
      plan.question += 1;
      plan.questions += (g.questions ?? []).length;
      plan.options += (g.options ?? []).length;
    }
  }
  return plan;
}

export function describePlan(parsed) {
  const lines = [];
  const t = parsed.test;
  lines.push(`test        1 row   "${t.title}" (${t.type}, ${t.difficulty ?? 'MEDIUM'}, duration ${t.duration ?? 60})`);
  for (const part of parsed.parts ?? []) {
    lines.push(`part        1 row   #${part.part_number} "${part.title}" — ${(part.content ?? '').length} chars of content` +
      (part.listening_url ? ' + audio' : ''));
    for (const g of part.groups ?? []) {
      const real = (g.questions ?? []).filter((q) => q.question_number != null);
      const bank = (g.questions ?? []).length - real.length;
      lines.push(`  question  1 row   type=${g.type}` + (g.question_text ? `, group text ${g.question_text.length} chars` : ''));
      lines.push(`  questions ${String((g.questions ?? []).length).padStart(2)} rows  Q${real.map((q) => q.question_number).join(', Q') || '—'}` +
        (bank ? ` (+${bank} word-bank rows, unnumbered)` : ''));
      if ((g.options ?? []).length) {
        const perQ = g.options.some((o) => o.question_number != null);
        lines.push(`  options   ${String(g.options.length).padStart(2)} rows  ${perQ ? 'per-question choices' : 'group legend'}`);
        if (perQ) {
          for (const q of real.slice(0, 2)) {
            const letters = displayLetters(g.options.filter((o) => o.question_number === q.question_number).map((o) => o.option_text));
            const correct = g.options.find((o) => o.question_number === q.question_number && o.is_correct);
            const shown = letters.find((l) => l.text === correct?.option_text)?.letter ?? '?';
            lines.push(`              Q${q.question_number} will show ${letters.map((l) => l.letter).join('/')}; correct renders as ${shown}`);
          }
        }
      }
    }
  }
  return lines.join('\n');
}

/**
 * Insert the whole test. Returns { testId, counts }.
 * Throws after rolling back if any step fails.
 */
export async function applyTest(db, parsed, log = () => {}) {
  const t = parsed.test;
  let testId = null;

  try {
    const questionTotal = (parsed.parts ?? []).reduce(
      (n, p) => n + (p.groups ?? []).reduce((m, g) => m + (g.questions ?? []).filter((q) => q.question_number != null).length, 0),
      0
    );

    const { data: testRow, error: testErr } = await db
      .from('test')
      .insert({
        title: t.title,
        type: t.type,
        duration: t.duration ?? (t.type === 'listening' ? 30 : 60),
        difficulty: t.difficulty ?? 'MEDIUM',
        is_active: t.is_active ?? false, // new content lands inactive; you activate it deliberately
        is_premium: t.is_premium ?? false,
        question_quantity: questionTotal,
      })
      .select('id')
      .single();
    if (testErr) throw new Error(`test insert failed: ${testErr.message}`);
    testId = testRow.id;
    log(`   test ${testId} created (inactive)`);

    for (const part of parsed.parts ?? []) {
      const { data: partRow, error: partErr } = await db
        .from('part')
        .insert({
          test_id: testId,
          part_number: part.part_number,
          title: part.title,
          content: part.content ?? null,
          listening_url: part.listening_url ?? null,
          image_url: part.image_url ?? null,
        })
        .select('id')
        .single();
      if (partErr) throw new Error(`part ${part.part_number} insert failed: ${partErr.message}`);

      for (const g of part.groups ?? []) {
        const { data: groupRow, error: gErr } = await db
          .from('question')
          .insert({
            test_id: testId,
            part_id: partRow.id,
            type: g.type,
            instruction: g.instruction ?? null,
            question_text: g.question_text ?? null,
            question_range: g.question_range ?? String((g.questions ?? []).filter((q) => q.question_number != null).length),
            image_url: g.image_url ?? null,
          })
          .select('id')
          .single();
        if (gErr) throw new Error(`question group (${g.type}) insert failed: ${gErr.message}`);

        const qRows = (g.questions ?? []).map((q) => ({
          test_id: testId,
          question_id: groupRow.id,
          part_id: partRow.id,
          question_number: q.question_number ?? null,
          question_text: q.question_text ?? null,
          correct_answer: q.correct_answer ?? null,
          is_correct: q.question_number == null ? false : true,
        }));
        if (qRows.length) {
          const { error } = await db.from('questions').insert(qRows);
          if (error) throw new Error(`questions insert failed (${g.type}): ${error.message}`);
        }

        // option_key is NOT stored for per-question types. The app has never read it
        // there - it letters options by sorting option_text - so an authored key only
        // ever created a second, invisible lettering scheme that disagreed with the
        // screen on 131 of 156 live prod questions. Answers are identified by option
        // text; the letter is presentation. Group legends still need their keys, which
        // ARE the answer (questions.correct_answer stores them).
        const perQuestionChoices = TYPES[g.type]?.options === OPTIONS.PER_QUESTION;
        const oRows = (g.options ?? []).map((o) => ({
          test_id: testId,
          question_id: groupRow.id,
          part_id: partRow.id,
          question_number: o.question_number ?? null,
          option_key: perQuestionChoices ? null : (o.option_key ?? null),
          option_text: o.option_text,
          is_correct: o.is_correct === true,
        }));
        if (oRows.length) {
          const { error } = await db.from('options').insert(oRows);
          if (error) throw new Error(`options insert failed (${g.type}): ${error.message}`);
        }
      }
      log(`   part ${part.part_number} written`);
    }

    return { testId, counts: planRows(parsed) };
  } catch (err) {
    if (testId) {
      log(`   ROLLING BACK: deleting test ${testId} (cascades to parts, groups, questions, options)`);
      const { error } = await db.from('test').delete().eq('id', testId);
      if (error) {
        throw new Error(
          `${err.message}\n!! ROLLBACK ALSO FAILED (${error.message}). Test ${testId} is half-written and must be removed by hand.`
        );
      }
      log('   rollback complete - nothing was left behind');
    }
    throw err;
  }
}

/**
 * Read the test back and prove it is usable: counts match, every question
 * resolves an answer, and gap answers really are in their own part's content.
 */
export async function verifyWritten(db, testId, parsed) {
  const problems = [];

  const [{ data: parts }, { data: groups }, { data: questions }, { data: options }] = await Promise.all([
    db.from('part').select('id, part_number, content').eq('test_id', testId),
    db.from('question').select('id, part_id, type').eq('test_id', testId),
    db.from('questions').select('id, question_id, part_id, question_number, correct_answer').eq('test_id', testId),
    db.from('options').select('question_id, question_number, option_key, option_text, is_correct').eq('test_id', testId),
  ]);

  const expected = planRows(parsed);
  if ((parts ?? []).length !== expected.part) problems.push(`parts: expected ${expected.part}, found ${parts?.length}`);
  if ((groups ?? []).length !== expected.question) problems.push(`groups: expected ${expected.question}, found ${groups?.length}`);
  if ((questions ?? []).length !== expected.questions) problems.push(`questions: expected ${expected.questions}, found ${questions?.length}`);
  if ((options ?? []).length !== expected.options) problems.push(`options: expected ${expected.options}, found ${options?.length}`);

  const groupById = new Map((groups ?? []).map((g) => [g.id, g]));
  const contentByPart = new Map((parts ?? []).map((p) => [p.id, norm(p.content ?? '')]));

  for (const q of questions ?? []) {
    if (q.question_number == null) continue; // word-bank row
    const g = groupById.get(q.question_id);
    const stored = String(q.correct_answer ?? '').trim();
    if (!stored) {
      const mine = (options ?? []).filter((o) => o.question_id === q.question_id && o.question_number === q.question_number && o.is_correct);
      if (mine.length !== 1) {
        problems.push(`Q${q.question_number}: no recoverable answer (correct_answer empty and ${mine.length} options flagged correct)`);
      }
      continue;
    }
    // A free-text answer must be findable in its own part's passage.
    if (g && ['fill_in_blanks', 'table_completion', 'universal', 'drag_drop'].includes(g.type)) {
      const content = contentByPart.get(q.part_id) ?? '';
      if (!content.includes(norm(stored))) {
        problems.push(`Q${q.question_number}: answer "${stored}" is not in its part's content`);
      }
    }
  }

  return { ok: problems.length === 0, problems };
}
