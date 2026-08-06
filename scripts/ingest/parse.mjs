// Source text -> structured test JSON, using Gemini for structure only.
//
// The model decides WHAT IS WHAT (this run of text is a passage, this is a stem,
// these are options, this is the answer key). It is never the authority on the
// words themselves:
//
//  - Passages are never re-emitted by the model. It returns short anchors - the
//    opening and closing words - and the passage is SLICED out of the source text
//    here, so part.content is byte-identical to the material by construction and
//    costs no output tokens.
//  - Everything else it does emit (stems, options, instructions, answers) is
//    checked back against the source by validate.mjs.
//
// Work is split one call per part, which keeps every response far below the output
// limit that a whole 40-question paper would blow through.

import { requireEnv, sleep, norm } from './lib.mjs';
import { TYPES, describe } from './types.mjs';

const MODELS = (process.env.GEMINI_MODELS ?? 'gemini-flash-latest,gemini-flash-lite-latest')
  .split(',').map((m) => m.trim()).filter(Boolean);
const DELAY_MS = Number(process.env.GEMINI_DELAY_MS ?? 5000);
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

const exhausted = new Set();
const pickModel = () => MODELS.find((m) => !exhausted.has(m)) ?? null;

async function callGemini(prompt, model) {
  const res = await fetch(`${ENDPOINT}/${model}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': requireEnv('GEMINI_API_KEY') },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0, maxOutputTokens: 16384, responseMimeType: 'application/json' },
    }),
  });

  if (res.status === 429) {
    const txt = await res.text();
    const e = new Error(`429 on ${model}`);
    e.rateLimited = true;
    e.dailyExhausted = /PerDay/i.test(txt);
    throw e;
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);

  const json = await res.json();
  const text = (json.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('').trim();
  if (!text) throw new Error(`empty response (finish=${json.candidates?.[0]?.finishReason})`);
  return text;
}

async function generate(prompt, log = () => {}) {
  for (;;) {
    const model = pickModel();
    if (!model) throw new Error(`quota exhausted on all models: ${MODELS.join(', ')}`);
    try {
      return await callGemini(prompt, model);
    } catch (err) {
      if (err.rateLimited) {
        if (err.dailyExhausted) { log(`   ${model}: daily quota gone, switching`); exhausted.add(model); continue; }
        log(`   ${model}: rate limited, waiting 60s`);
        await sleep(60_000);
        continue;
      }
      throw err;
    }
  }
}

function parseJson(text, what) {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    throw new Error(`${what}: model did not return valid JSON (${e.message}). Got: ${cleaned.slice(0, 200)}`);
  }
}

/** The per-type authoring rules, rendered for the prompt from types.mjs. */
function typeRules() {
  return Object.entries(TYPES)
    .map(([key, t]) => {
      const bits = [`- "${key}" — ${describe(key)}`];
      if (t.groupText) bits.push(`    group question_text: ${t.groupText}`);
      bits.push(`    each question's question_text: ${t.itemText}`);
      if (t.verdicts) bits.push(`    correct_answer must be exactly one of: ${t.verdicts.join(' / ')}`);
      return bits.join('\n');
    })
    .join('\n');
}

const OUTLINE_SCHEMA = `{
  "title": "<the test's title as printed>",
  "testType": "reading" | "listening",
  "parts": [
    {
      "part_number": 1,
      "title": "<short label, e.g. 'Reading Passage 1'>",
      "passageStart": "<the FIRST 8-12 words of this part's passage, copied exactly>",
      "passageEnd": "<the LAST 8-12 words of this part's passage, copied exactly>",
      "questionNumbers": [1, 13]
    }
  ]
}`;

/** Stage 1: what is in this material, and where does each passage begin and end. */
export async function parseOutline(sourceText, log) {
  const prompt = [
    'You are indexing an IELTS test paper so it can be loaded into a database.',
    '',
    'Identify the test title, whether it is a reading or listening paper, and each part.',
    'For every part give the first and last few words of its passage EXACTLY as printed,',
    'so the passage can be sliced out of the source. Do not reproduce the whole passage.',
    'part_number must be between 1 and 5. Question numbers are the printed ones.',
    '',
    '===== SOURCE =====',
    sourceText.slice(0, 120_000),
    '===== END SOURCE =====',
    '',
    'Return ONLY JSON of this shape:',
    OUTLINE_SCHEMA,
  ].join('\n');

  return parseJson(await generate(prompt, log), 'outline');
}

/**
 * Slice a passage out of the source using the model's anchors.
 *
 * Anchors are matched on normalised text so punctuation styling cannot break the
 * lookup, but the slice returned is the SOURCE's own characters.
 */
export function slicePassage(sourceText, startAnchor, endAnchor) {
  const hay = norm(sourceText);
  const s = norm(startAnchor);
  const e = norm(endAnchor);
  if (!s || !e) return null;

  const startNorm = hay.indexOf(s);
  const endNorm = hay.indexOf(e, startNorm + s.length);
  if (startNorm < 0 || endNorm < 0) return null;

  // Map normalised offsets back to raw offsets by walking both strings together.
  let rawStart = rawOffsetOf(sourceText, startNorm);
  const rawEnd = rawOffsetOf(sourceText, endNorm + e.length);
  if (rawStart == null || rawEnd == null || rawEnd <= rawStart) return null;

  // Reach back over a paragraph label if the anchor started just after one.
  //
  // A lettered passage whose "A" is left outside the slice is unanswerable for
  // "which paragraph contains..." questions: the letter the answer names is not
  // in the stored content. The model tends to anchor on the first real words, so
  // this recovers the marker rather than relying on it to include one.
  const before = sourceText.slice(Math.max(0, rawStart - 6), rawStart);
  const label = before.match(/(?:^|\n)\s*([A-Z])[.)]?\s+$/);
  if (label) rawStart -= before.length - before.indexOf(label[1]);

  return sourceText.slice(rawStart, rawEnd).trim();
}

/** Raw index in `raw` corresponding to index `target` in norm(raw). */
function rawOffsetOf(raw, target) {
  let normCount = 0;
  let lastWasSpace = true;
  for (let i = 0; i < raw.length; i++) {
    if (normCount >= target) return i;
    const ch = raw[i];
    const isSpace = /\s/.test(ch);
    if (isSpace) {
      if (!lastWasSpace) normCount += 1; // collapsed run counts as one space
      lastWasSpace = true;
    } else {
      normCount += norm(ch).length || 1;
      lastWasSpace = false;
    }
  }
  return normCount >= target ? raw.length : null;
}

const PART_SCHEMA = `{
  "groups": [
    {
      "type": "<one of the type keys listed above>",
      "instruction": "<the printed instruction for this group>",
      "question_text": "<group-level text (gapped summary/table) or null>",
      "questions": [
        { "question_number": 1, "question_text": "...", "correct_answer": "..." }
      ],
      "options": [
        { "option_key": "A", "option_text": "...", "question_number": null, "is_correct": false }
      ]
    }
  ]
}`;

/** Stage 2: the question groups of one part. */
export async function parsePart(sourceText, part, answerKeyText, log) {
  const prompt = [
    'You are converting one part of an IELTS paper into database rows.',
    '',
    '===== QUESTION TYPES AND THEIR RULES =====',
    typeRules(),
    '',
    'Option conventions - getting this wrong corrupts the test:',
    '  * group legend (matching_information, table, multiple_answers): options carry option_key',
    '    ("A".."F" or roman numerals), question_number is null, and each question\'s answer is that',
    '    key in correct_answer.',
    '  * per-question choices (multiple_choice, map): options carry question_number, option_key is',
    '    null, correct_answer on the question is null, and exactly ONE option per question has',
    '    is_correct true.',
    '  * no options (gap fill, table completion, universal, drag_drop, TFNG, YNNG): correct_answer',
    '    holds the answer text or verdict.',
    '',
    'Choosing between the two look-alike types - get this right or 387 live questions worth of',
    'precedent is broken:',
    '  * "Which paragraph contains the following information?" / "In which section is..." with',
    '    answers that are PARAGRAPH LETTERS -> type "table". Its options are the bare letters',
    '    themselves ("A", "B", "C"), one per available paragraph, with option_key null.',
    '  * "Choose the correct heading for each section" with ROMAN NUMERAL answers -> type',
    '    "matching_information"; questions are "Paragraph A" and options hold the heading prose',
    '    keyed by roman numeral.',
    '  * Matching statements to named people/sections with letter answers -> also',
    '    "matching_information", options hold the person or section name keyed by letter.',
    '  * "table_completion" is a table with GAPS to fill, which is a different thing again.',
    '',
    'Copy every stem, option and instruction EXACTLY as printed - they are checked against the',
    'source afterwards and anything you reword will be rejected. If a question has no answer in',
    'the material, set correct_answer to null rather than guessing.',
    '',
    'Blanks: write EXACTLY ONE ___ per numbered blank in the group question_text, however many',
    'words that answer contains. A two-word answer like "four hundred" is still one ___, never',
    '"___ ___". Drop the printed question number from the gapped text - the ___ markers are matched',
    'to questions by their order, and a count that disagrees is rejected.',
    '',
    `===== PART ${part.part_number} covers printed questions ${part.questionNumbers?.join('-') ?? '?'} =====`,
    '',
    '===== SOURCE =====',
    sourceText.slice(0, 120_000),
    '===== END SOURCE =====',
    answerKeyText ? `\n===== ANSWER KEY =====\n${answerKeyText}\n` : '',
    'Return ONLY JSON of this shape:',
    PART_SCHEMA,
  ].join('\n');

  const out = parseJson(await generate(prompt, log), `part ${part.part_number}`);
  await sleep(DELAY_MS);
  return out;
}
