// Generate `questions.explanation` for reading questions.
//
//   node --env-file=.env.explain scripts/explain/generate.mjs [options]
//     --only <testId>   just this test
//     --limit N         at most N tests this run
//     --dry-run         generate + validate + log, write nothing to the DB
//     --status          print the progress table and exit
//
// Scope is READING ONLY. The Explain surface is the reading practice page in
// review mode (QuestionReviewActions.jsx, rendered from ReadingPracticePage);
// listening review deliberately has none, so generating for it would write data
// nothing renders.
//
// Safety properties:
//   - never overwrites a non-empty explanation (the 27 prod / 31 dev
//     hand-authored ones are the style reference)
//   - never writes a row whose quote is not verbatim in the passage
//   - resumable per test; a replay cannot duplicate work

import { requireEnv, supabase, projectRef, sleep, fetchTest, resolveAnswer } from './lib.mjs';
import { locatePart, paragraphs, paragraphByLetter, norm, DETERMINISTIC_TYPES } from './locate.mjs';
import { buildGroupPrompt, parseResponse } from './prompts.mjs';
import { setTarget, newState, loadState, saveState, summarize, appendLog, appendFlags, priorRunRowIds } from './state.mjs';

const MODELS = (process.env.GEMINI_MODELS ?? 'gemini-flash-latest,gemini-flash-lite-latest')
  .split(',').map((m) => m.trim()).filter(Boolean);
const RPM = Number(process.env.GEMINI_RPM ?? 12);
const DELAY_MS = Number(process.env.GEMINI_DELAY_MS ?? Math.ceil(60_000 / RPM));
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const value = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : null);

const exhausted = new Set();
const pickModel = () => MODELS.find((m) => !exhausted.has(m)) ?? null;

// ------------------------------------------------------------------ gemini

async function callGemini(prompt, model) {
  const res = await fetch(`${ENDPOINT}/${model}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': requireEnv('GEMINI_API_KEY') },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 8192 },
    }),
  });

  if (res.status === 429) {
    // Two very different failures share this status, and conflating them cost a
    // run: a PER-MINUTE cap clears in under a minute, a PER-DAY cap does not
    // clear until tomorrow. Treating both as "model is finished" retired a model
    // that was merely pacing, then aborted the whole run when the second model
    // hit its real daily cap.
    const txt = await res.text();
    let violations = [];
    let retryAfterSec = null;
    try {
      const j = JSON.parse(txt);
      for (const d of j.error?.details ?? []) {
        if (d['@type']?.includes('QuotaFailure')) violations = d.violations ?? [];
        if (d['@type']?.includes('RetryInfo')) {
          retryAfterSec = Number(String(d.retryDelay ?? '').replace(/s$/, '')) || null;
        }
      }
    } catch { /* fall through to the conservative default below */ }

    const e = new Error(`429 on ${model}: ${violations.map((v) => v.quotaId).join(', ') || txt.slice(0, 120)}`);
    e.rateLimited = true;
    e.dailyExhausted = violations.some((v) => /PerDay/i.test(v.quotaId ?? ''));
    e.retryAfterSec = retryAfterSec;
    throw e;
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);

  const json = await res.json();
  const text = (json.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('').trim();
  if (!text) throw new Error(`empty response (finish=${json.candidates?.[0]?.finishReason})`);
  return { text, tokensIn: json.usageMetadata?.promptTokenCount ?? 0, tokensOut: json.usageMetadata?.candidatesTokenCount ?? 0 };
}

async function generateWithFallback(prompt, log = () => {}) {
  let paceWaits = 0;
  for (;;) {
    const model = pickModel();
    if (!model) throw new Error(`daily quota exhausted on all models: ${MODELS.join(', ')}`);
    try {
      return { ...(await callGemini(prompt, model)), model };
    } catch (err) {
      if (err.rateLimited) {
        if (err.dailyExhausted) {
          log(`   ${model}: daily quota gone, switching model`);
          exhausted.add(model);
          continue;
        }
        // Per-minute pacing: wait it out on the SAME model rather than burning
        // a model that still has daily allowance left.
        if (paceWaits >= 6) {
          log(`   ${model}: still rate limited after ${paceWaits} waits, switching model`);
          exhausted.add(model);
          paceWaits = 0;
          continue;
        }
        paceWaits += 1;
        const wait = (err.retryAfterSec ?? 60) + 2;
        log(`   ${model}: per-minute limit, waiting ${wait}s (${paceWaits}/6)`);
        await sleep(wait * 1000);
        continue;
      }
      const transient = /HTTP 5\d\d|fetch failed|ETIMEDOUT|ECONNRESET|socket hang up/i.test(String(err.message));
      if (!transient) throw err;
      await sleep(5000);
      return { ...(await callGemini(prompt, model)), model };
    }
  }
}

// -------------------------------------------------------------- validation

/**
 * The passage's own characters for an accepted quote, or null.
 *
 * Exact hit first; otherwise match with quote marks and whitespace treated as
 * equivalent and return what the PASSAGE says. Keeping the stored quote
 * byte-identical to the source is what lets a later exact search find it.
 */
function exactFromPassage(candidate, passage) {
  if (passage.includes(candidate)) return candidate;
  const loose = candidate
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/["“”'‘’]/g, '["“”\'‘’]')
    .replace(/\s+/g, '\\s+');
  const m = passage.match(new RegExp(loose, 'i'));
  return m ? m[0] : null;
}

/**
 * The content rule, enforced in code rather than trusted to the prompt: an
 * explanation may only ship if its quote really is in the passage. A quote the
 * model invented, paraphrased, or stitched together fails here and the question
 * is flagged instead - which is also how genuine content defects surface.
 */
function validate(parsed, item, passage, located) {
  if (parsed.flagged) return { ok: false, reason: parsed.reason };

  const hay = norm(passage);

  // Strict verbatim, with tolerance for BOUNDARY PUNCTUATION only. Two habits
  // of the model produce a non-verbatim string without altering a single word:
  //  - it ends a quote at a sentence boundary inside nested speech and appends
  //    the closing mark: `...not kept pace.'` where the passage runs
  //    `...not kept pace. Our company intends to turn that around.'`
  //  - it brackets the quote with "..." to be honest that it started or stopped
  //    mid-sentence.
  // Both are trimmed. Nothing else is forgiven: any difference in the words
  // themselves still fails and the question is flagged.
  //
  // The two character classes MUST stay identical. They were not: '.' was in the
  // leading class only, so a quote the model closed with "..." - the commonest
  // shape it produces - failed verbatim matching for its punctuation alone. That
  // one missing character discarded 13 correct citations out of 56 rejections on
  // the first prod run. Trimming a real trailing full stop costs nothing, because
  // the untrimmed string is tried first and wins whenever it matches.
  const EDGE = /^[\s"“”'‘’.…]+|[\s"“”'‘’.…]+$/g;
  const trimmed = parsed.quote.replace(EDGE, '');
  let quote = [parsed.quote, trimmed].find(
    (v) => norm(v).length >= 12 && hay.includes(norm(v))
  );

  // Second chance: the model reproduces the words exactly but re-styles the
  // punctuation - it emitted 'It's an act of gratitude,' where the passage has
  // "It's an act of gratitude,". The words are untouched, so this is still
  // verbatim evidence. Match with quote marks and whitespace treated as
  // equivalent, then store the PASSAGE's own text rather than the model's, so
  // what lands in the DB is always character-exact to the source.
  if (!quote && trimmed.length >= 12) {
    const loose = trimmed
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/["“”'‘’]/g, '["“”\'‘’]')
      .replace(/\s+/g, '\\s+');
    const m = passage.match(new RegExp(loose, 'i'));
    if (m) quote = m[0];
  }

  if (!quote) {
    return {
      ok: false,
      reason:
        norm(parsed.quote).length < 12
          ? 'quote too short to be evidence'
          : 'quote is not verbatim in the passage',
    };
  }

  // Store the PASSAGE's own rendering, never the model's.
  //
  // norm() runs NFKD, which folds curly quotes to straight, so a model that
  // retypes ‘...’ as '...' passes the match above and would then be stored with
  // its own punctuation. The words are identical, so it is still real evidence -
  // but the stored string is no longer findable in the passage by exact search,
  // which is exactly what the Locate highlight will do with it. Recover the
  // passage's characters, and reject if they cannot be recovered at all.
  const exact = exactFromPassage(quote, passage);
  if (!exact) {
    return { ok: false, reason: 'quote matched only after normalisation and could not be recovered from the passage' };
  }
  quote = exact;

  const needle = norm(quote);

  // GROUND TRUTH is the block that actually contains the verified quote. The
  // model's own Where line is never trusted - it was observed citing a real but
  // wrong paragraph, which a "is this a valid label?" check waves through.
  const blocks = paragraphs(passage);
  const host = blocks.find((b) => b.norm.includes(needle));
  if (!host) return { ok: false, reason: 'quote located in passage but not within any paragraph block' };

  let where = host.label;
  const det = located.get(item.id);

  if (det && det.label !== host.label) {
    // A deterministic location that disagrees with the quote means one of them
    // is wrong, and which one depends on how the location was derived.
    if (det.kind === 'letter') {
      // The answer letter is authoritative: the quote is from the wrong
      // paragraph, so the answer and the evidence disagree. That is a content
      // signal, not something to paper over.
      return {
        ok: false,
        reason: `quote sits in ${host.label} but the stored answer points at ${det.label}`,
      };
    }
    if (det.kind === 'search') {
      // The answer word's own position beats a sentence-boundary wobble.
      where = det.label;
    }
    // kind === 'positional': the letter->block guess is the weak party. Defer to
    // the quote and let the run report how often this happened.
  } else if (det) {
    where = det.label;
  }

  const why = parsed.why.replace(/\s+/g, ' ').trim();
  if (why.length < 15) return { ok: false, reason: 'why line too short' };

  // The quote being verbatim proves the EVIDENCE is real; it does not prove the
  // explanation is about the STORED answer. Observed on prod: a question whose
  // options are "is pleasing / is soothing / provokes hunger / requires thought"
  // has D flagged correct, but the passage says music "that a person likes ...
  // activates the higher thinking centers". The model quoted that honestly and
  // then argued for option A - a fluent, well-evidenced explanation of the wrong
  // answer, which every other check here passes.
  //
  // Whenever the model names a letter and the stored answer is itself a letter,
  // they must agree. A mismatch is the signature of an answer the passage does
  // not support, so it is flagged as the content defect it is rather than
  // shipped to a student who can see which option is marked correct.
  //
  // multiple_choice ONLY. On group-legend types (matching_information, table) the
  // check produced 4 false positives out of 4: the model's "option E" does not
  // reliably refer to the legend key the answer uses, so a disagreement says
  // nothing. Every true positive it has found was multiple_choice, where the
  // options belong to the one question and the letter is unambiguous.
  const storedLetter = String(item.answer ?? '').trim().toUpperCase();
  if (item.group?.type === 'multiple_choice' && /^[A-K]$/.test(storedLetter)) {
    const named = why.match(/\boption\s+([A-K])\b/i);
    if (named && named[1].toUpperCase() !== storedLetter) {
      return {
        ok: false,
        reason: `explanation argues for option ${named[1].toUpperCase()} but the stored answer is ${storedLetter}`,
      };
    }
  }

  return {
    ok: true,
    text: `Where: ${where}\nQuote: "${quote}"\nWhy: ${why}`,
    whereSource: det ? det.kind : 'quote',
    whereCorrected: det ? det.label !== where : false,
  };
}

// ------------------------------------------------------------------- main

async function processTest(db, testId, title, priorRunRows) {
  const { test, items } = await fetchTest(db, testId);
  const pending = items.filter((i) => !(i.explanation ?? '').trim());

  // A skipped row is either a human-written explanation we must never touch, or
  // output from an earlier run of this pipeline. Only the first number answers
  // "did we preserve the hand-authored ones?", so the two are counted apart.
  // Anything this pipeline has ever written is in generated_log.jsonl.
  const alreadyDone = items.filter((i) => (i.explanation ?? '').trim());
  const skippedPriorRun = alreadyDone.filter((i) => priorRunRows.has(i.id)).length;
  const skippedHandAuthored = alreadyDone.length - skippedPriorRun;

  const generated = [];
  const flagged = [];

  // Deterministic locations, computed per part in question order.
  const located = new Map();
  for (const partId of new Set(pending.map((i) => i.part_id))) {
    const partItems = pending.filter((i) => i.part_id === partId);
    const content = partItems[0].part.content ?? '';
    for (const [k, v] of locatePart(partItems, content)) located.set(k, v);
  }

  // Resolve answers first; unanswerable questions are content defects, not
  // model failures, and must never reach the API.
  const answerable = [];
  for (const item of pending) {
    const { answer, answerText, defect } = resolveAnswer(item);
    if (!answer) {
      flagged.push({ testId, title, questionNumber: item.question_number, type: item.group.type, reason: defect });
      continue;
    }
    if (!(item.question_text ?? '').trim() && !(item.group.question_text ?? '').trim()) {
      flagged.push({ testId, title, questionNumber: item.question_number, type: item.group.type, reason: 'question has no text' });
      continue;
    }
    answerable.push({ ...item, answer, answerText });
  }

  // One call per question group.
  const byGroup = new Map();
  for (const it of answerable) {
    if (!byGroup.has(it.question_id)) byGroup.set(it.question_id, []);
    byGroup.get(it.question_id).push(it);
  }

  for (const [, group] of byGroup) {
    const item0 = group[0];
    const passage = item0.part.content ?? '';
    const sorted = [...group].sort((a, b) => a.question_number - b.question_number);

    // `table` = "which paragraph contains X": the answer letter IS the location.
    const loc = new Map(located);
    if (item0.group.type === 'table') {
      for (const it of sorted) {
        const blk = paragraphByLetter(passage, it.answer);
        if (blk) loc.set(it.id, { label: blk.label, quote: null, exact: true, kind: blk.kind });
      }
    }

    const prompt = buildGroupPrompt({ item0, items: sorted, passage, located: loc });
    let res;
    try {
      res = await generateWithFallback(prompt, (m) => console.log('\n' + m));
    } catch (err) {
      for (const it of sorted) {
        flagged.push({ testId, title, questionNumber: it.question_number, type: it.group.type, reason: `API failure: ${err.message}` });
      }
      if (/quota exhausted/.test(err.message)) throw err;
      continue;
    }

    const parsed = parseResponse(res.text, sorted);
    for (const it of sorted) {
      const p = parsed.get(it.id);
      if (!p) {
        flagged.push({ testId, title, questionNumber: it.question_number, type: it.group.type, reason: 'no output returned for this question' });
        continue;
      }
      const v = validate(p, it, passage, loc);
      if (!v.ok) {
        flagged.push({ testId, title, questionNumber: it.question_number, type: it.group.type, reason: v.reason, rejectedQuote: p.quote ?? null });
        continue;
      }
      generated.push({
        rowId: it.id, testId, title, questionNumber: it.question_number,
        type: it.group.type, answer: it.answer, explanation: v.text,
        whereSource: v.whereSource, whereCorrected: v.whereCorrected, model: res.model,
      });
    }
    await sleep(DELAY_MS);
  }

  return { test, total: items.length, skippedHandAuthored, skippedPriorRun, generated, flagged };
}

async function main() {
  const db = supabase();
  const { ref, label } = projectRef();
  // MUST happen before any state/log read or write. state.mjs keys its files by
  // target precisely because 23 of dev's 24 reading test ids also exist in prod;
  // without this call every target shares one `*.unknown.*` state file, so a dev
  // run marks those ids done and the following prod run skips them - 270 prod
  // questions left unexplained while the summary reports success.
  setTarget(ref);

  if (flag('--status')) {
    const st = loadState();
    if (!st) return console.log('no state yet');
    return console.log(JSON.stringify(summarize(st), null, 2));
  }

  console.log(`Target project: ${ref} (${label})${flag('--dry-run') ? '  [DRY RUN - no writes]' : ''}`);
  if (label === 'PROD' && !flag('--dry-run')) {
    console.log('Writing to PRODUCTION in 5s - Ctrl-C to abort.');
    await sleep(5000);
  }

  let query = db.from('test').select('id, title').eq('type', 'reading').eq('is_active', true).order('title');
  const only = value('--only');
  if (only) query = db.from('test').select('id, title').eq('id', only);
  const { data: tests, error } = await query;
  if (error) throw new Error(error.message);

  // Row ids this pipeline has written before, so skipped rows can be split into
  // "hand-authored, protected" vs "already generated by an earlier run".
  const priorRunRows = priorRunRowIds();
  const state = newState({ model: MODELS.join(', '), target: `${ref} (${label})` });
  const queue = tests.filter((t) => state.entries[t.id]?.status !== 'done').slice(0, Number(value('--limit')) || Infinity);
  console.log(`${queue.length} test(s) to process\n`);

  // A dry run must leave NO trace. Persisting state would mark these tests
  // 'done' and log their rows into generated_log as if they had been written -
  // so the real run that follows would skip exactly the tests the rehearsal
  // covered, and priorRunRowIds() would count rows that were never committed.
  const isDry = flag('--dry-run');
  const dry = { tests: 0, generated: 0, flagged: 0, samples: [] };

  for (const t of queue) {
    process.stdout.write(`→ ${t.title} … `);
    try {
      const r = await processTest(db, t.id, t.title, priorRunRows);

      if (!isDry) {
        for (const g of r.generated) {
          const { error: upErr } = await db
            .from('questions')
            .update({ explanation: g.explanation })
            .eq('id', g.rowId)
            .or('explanation.is.null,explanation.eq.'); // never clobber an existing one
          if (upErr) throw new Error(`write failed on Q${g.questionNumber}: ${upErr.message}`);
        }

        appendLog(r.generated);
        appendFlags(r.flagged);
        state.entries[t.id] = {
          testId: t.id, title: t.title, status: 'done', questions: r.total,
          generated: r.generated.length,
          skippedHandAuthored: r.skippedHandAuthored, skippedPriorRun: r.skippedPriorRun,
          flagged: r.flagged.length,
          lastRunAt: new Date().toISOString(), error: null,
        };
        saveState(state);
      } else {
        dry.tests += 1;
        dry.generated += r.generated.length;
        dry.flagged += r.flagged.length;
        dry.samples.push(...r.generated, ...r.flagged.map((f) => ({ ...f, flaggedOnly: true })));
      }

      console.log(
        `${r.generated.length} generated, ${r.skippedHandAuthored} hand-authored kept, ` +
          `${r.skippedPriorRun} from prior run, ${r.flagged.length} flagged`
      );
    } catch (err) {
      if (!isDry) {
        state.entries[t.id] = {
          testId: t.id, title: t.title, status: 'failed', questions: null,
          generated: 0, skippedHandAuthored: 0, skippedPriorRun: 0, flagged: 0,
          lastRunAt: new Date().toISOString(), error: String(err.message).slice(0, 200),
        };
        saveState(state);
      }
      console.log(`FAILED: ${err.message}`);
      if (/quota exhausted/.test(err.message)) break;
    }
  }

  if (isDry) {
    console.log(`\n=== DRY RUN - nothing written to the DB, no state saved ===`);
    console.log(JSON.stringify({ tests: dry.tests, generated: dry.generated, flagged: dry.flagged }, null, 2));
    for (const s of dry.samples) {
      console.log(`\n--- Q${s.questionNumber} [${s.type}] ${s.flaggedOnly ? 'FLAGGED' : `answer: ${s.answer}`}`);
      console.log(s.flaggedOnly ? `    reason: ${s.reason}` : s.explanation);
    }
    return;
  }

  console.log('\n' + JSON.stringify(summarize(state), null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
