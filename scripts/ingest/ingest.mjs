// Load new test content into Supabase from a folder of materials.
//
//   node --env-file=.env.ingest scripts/ingest/ingest.mjs <folder> [options]
//     --apply           write to the database (default is parse + validate only)
//     --dry-run         with --apply: print the rows, write nothing
//     --yes             skip the confirmation prompt (for unattended runs)
//     --type <t>        force reading|listening instead of letting the parse decide
//     --title "..."     override the detected test title
//     --active          create the test as is_active (default: inactive)
//     --explain         after a successful reading write, run the explanation pipeline
//     --status          print the progress table and exit
//     --reparse         ignore a cached parse and call the model again
//
// Stages: extract -> parse -> validate -> (confirm) -> apply -> verify.
// Nothing is written until validation passes AND you confirm.
//
// See INGESTION_GUIDE.md for the rules this enforces and the checklist to follow.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { supabase, projectRef, slugify } from './lib.mjs';
import { extractAll } from './extract.mjs';
import { parseOutline, parsePart, slicePassage } from './parse.mjs';
import { validate, summarise } from './validate.mjs';
import { planRows, describePlan, applyTest, verifyWritten } from './apply.mjs';
import { setTarget, loadState, saveState, recordStage, jobStatus, summarize } from './state.mjs';

const execFileAsync = promisify(execFile);
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const value = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : null);
const positional = args.filter((a) => !a.startsWith('--') && args[args.indexOf(a) - 1]?.startsWith('--') !== true);

const CACHE_DIR = new URL('./jobs/', import.meta.url);

function log(...m) { console.log(...m); }
function section(title) { console.log(`\n${'─'.repeat(64)}\n${title}\n${'─'.repeat(64)}`); }

async function confirm(question) {
  if (flag('--yes')) return true;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question(`${question} [y/N] `)).trim().toLowerCase();
  rl.close();
  return answer === 'y' || answer === 'yes';
}

async function main() {
  const { ref, label } = projectRef();
  setTarget(ref);
  const state = loadState();

  if (flag('--status')) {
    console.log(JSON.stringify(summarize(state), null, 2));
    for (const j of Object.values(state.jobs)) {
      console.log(`  ${j.status?.padEnd(10)} ${j.jobId}  ${j.stages[j.status]?.title ?? ''}`);
    }
    return;
  }

  const folder = positional[0];
  if (!folder) throw new Error('Usage: ingest.mjs <folder of materials> [--apply] [--dry-run]');
  const dir = resolve(folder);
  if (!existsSync(dir)) throw new Error(`no such folder: ${dir}`);

  const jobId = slugify(basename(dir));
  console.log(`Target project: ${ref} (${label})`);
  console.log(`Job: ${jobId}   materials: ${dir}`);

  if (jobStatus(state, jobId) === 'applied' && flag('--apply')) {
    console.log(`\nJob "${jobId}" has already been applied to ${label}. Nothing to do.`);
    console.log('Delete its entry from the state file if you genuinely need to re-run it.');
    return;
  }

  // ------------------------------------------------------------ 1. extract
  section('1. Reading the materials');
  const source = await extractAll(dir);
  for (const d of source.documents) {
    console.log(`  ${d.kind.padEnd(5)} ${basename(d.path)}  ${d.text.length} chars${d.pages > 1 ? `, ${d.pages} pages` : ''}`);
  }
  for (const a of source.audio) console.log(`  audio ${basename(a)}`);
  for (const i of source.images) console.log(`  image ${basename(i)}`);
  for (const x of source.ignored) console.log(`  (ignored) ${basename(x)}`);
  if (!source.documents.length) throw new Error('no PDF, HTML or text documents found in that folder');
  if (source.warnings.length) {
    console.log('');
    for (const w of source.warnings) console.log(`  ! ${w}`);
    throw new Error('cannot verify content against a scanned document - see above');
  }

  // -------------------------------------------------------------- 2. parse
  mkdirSync(CACHE_DIR, { recursive: true });
  const cachePath = new URL(`./${jobId}.parsed.json`, CACHE_DIR);
  let parsed;

  if (existsSync(cachePath) && !flag('--reparse')) {
    parsed = JSON.parse(readFileSync(cachePath, 'utf8'));
    section('2. Structure (from cached parse - use --reparse to redo)');
  } else {
    section('2. Structuring the material');
    const outline = await parseOutline(source.text, log);
    console.log(`  title: ${outline.title}`);
    console.log(`  type:  ${outline.testType}`);
    console.log(`  parts: ${outline.parts?.length}`);

    parsed = {
      test: {
        title: value('--title') ?? outline.title,
        type: value('--type') ?? outline.testType,
        difficulty: 'MEDIUM',
        is_active: flag('--active'),
      },
      parts: [],
    };

    for (const p of outline.parts ?? []) {
      const content = slicePassage(source.text, p.passageStart, p.passageEnd);
      if (!content) {
        throw new Error(
          `part ${p.part_number}: could not locate the passage in the source using the model's anchors ` +
            `("${p.passageStart?.slice(0, 40)}..."). The passage must be sliced from the material, never retyped.`
        );
      }
      console.log(`  part ${p.part_number}: sliced ${content.length} chars of passage`);
      const { groups } = await parsePart(source.text, p, null, log);
      parsed.parts.push({ part_number: p.part_number, title: p.title, content, groups: groups ?? [] });
    }
    writeFileSync(cachePath, JSON.stringify(parsed, null, 2));
  }

  // Listening audio: one file, on part 1, by convention.
  if (parsed.test.type === 'listening' && source.audio.length) {
    parsed.parts.find((p) => p.part_number === 1).listening_url = `PENDING_UPLOAD:${basename(source.audio[0])}`;
  }

  // ----------------------------------------------------------- 3. validate
  section('3. Validation');
  const summary = summarise(parsed);
  console.log(`  "${summary.title}"  (${summary.testType})`);
  for (const p of summary.parts) {
    console.log(`  part ${p.part_number}  ${p.groups} group(s), ${p.questions} question(s), ${p.contentChars} chars`);
  }
  console.log(`  questions by type:`);
  for (const [t, n] of Object.entries(summary.byType)) console.log(`     ${String(n).padStart(3)}  ${t}`);
  if (summary.bankRows) console.log(`     ${String(summary.bankRows).padStart(3)}  (drag_drop word-bank rows, not questions)`);
  console.log(`  total answerable questions: ${summary.questions}`);
  if (source.audio.length) console.log(`  audio: ${basename(source.audio[0])} -> part 1`);

  const result = validate(parsed, source.text);
  console.log('');
  for (const w of result.warnings) console.log(`  ⚠ ${w.where}: ${w.msg}`);
  for (const e of result.errors) console.log(`  ✗ ${e.where}: ${e.msg}`);
  if (!result.errors.length) console.log('  ✓ all checks passed');

  recordStage(state, jobId, result.ok ? 'validated' : 'failed', {
    title: summary.title, testType: summary.testType, questions: summary.questions,
    errors: result.errors.length, warnings: result.warnings.length,
  });

  if (!result.ok) {
    console.log(`\n${result.errors.length} error(s). Nothing was written. Fix the material or the parse and run again.`);
    process.exitCode = 1;
    return;
  }

  if (!flag('--apply')) {
    console.log('\nValidation only. Re-run with --apply to write (you will be asked to confirm).');
    return;
  }

  // -------------------------------------------------------------- 4. apply
  section(`4. ${flag('--dry-run') ? 'Dry run - rows that WOULD be written' : `Writing to ${label}`}`);
  console.log(describePlan(parsed));
  const plan = planRows(parsed);
  console.log(`\n  totals: ${Object.entries(plan).map(([k, v]) => `${k}=${v}`).join('  ')}`);

  if (flag('--dry-run')) {
    console.log('\nDry run - nothing was written.');
    return;
  }

  if (!(await confirm(`\nWrite this test to ${label}?`))) {
    console.log('Aborted. Nothing was written.');
    return;
  }

  const db = supabase();
  const { testId } = await applyTest(db, parsed, log);

  // ------------------------------------------------------------- 5. verify
  section('5. Verifying what was written');
  const check = await verifyWritten(db, testId, parsed);
  for (const p of check.problems) console.log(`  ✗ ${p}`);
  if (check.ok) console.log('  ✓ counts match, every question resolves an answer, gap answers are in their own part');

  recordStage(state, jobId, check.ok ? 'applied' : 'failed', {
    title: summary.title, testType: summary.testType, questions: summary.questions, testId,
    verified: check.ok, problems: check.problems.length,
  });

  console.log(`\nTest ${testId} written to ${label}${parsed.test.is_active ? '' : ' as INACTIVE'}.`);
  if (!parsed.test.is_active) console.log('Activate it when you are happy: update test set is_active = true.');
  if (source.audio.length) {
    console.log(`\nAudio NOT uploaded: put ${basename(source.audio[0])} in the listening-test bucket and set`);
    console.log(`part 1's listening_url to its public URL. (Upload is deliberately manual - see the guide.)`);
  }

  if (flag('--explain') && parsed.test.type === 'reading' && check.ok) {
    section('6. Generating explanations for the new questions');
    const { stdout } = await execFileAsync('node', [
      '--env-file=.env.ingest', 'scripts/explain/generate.mjs', '--only', testId,
    ], { cwd: resolve(new URL('../../', import.meta.url).pathname) });
    console.log(stdout);
  }
}

main().catch((e) => { console.error(`\n${e.message}`); process.exit(1); });
