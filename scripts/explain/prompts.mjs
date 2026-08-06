// Per-type explanation prompts.
//
// Built against the MEASURED shape of each type in the live DB, not against
// type_db/ListofHeadings.md - that doc is wrong about `table`, which is not
// table completion but "which paragraph contains the following information?"
// (40/45 groups). `matching_information` is likewise two different skills
// sharing one enum: List-of-Headings and statement/person matching. The
// per-type framing below keys off what the group's instruction actually says.

import { htmlToText, legendOf, choicesOf } from './lib.mjs';

const FORMAT = `Return EXACTLY three lines per question, in this order and with these exact labels:

Where: <the paragraph reference, e.g. "Paragraph C" or "Paragraph 3">
Quote: "<one sentence copied VERBATIM from the passage>"
Why: <one or two short sentences>

Rules that override everything else:
- The Quote line must be copied character-for-character from the passage. Never
  paraphrase it, never join two separate sentences, never trim it to a fragment
  that changes its meaning. If you cannot find a supporting sentence in the
  passage, output the single line  FLAG: <reason>  for that question instead.
- Everything you assert must come from the passage. You may not use outside
  knowledge, and you may not invent a justification for an answer the passage
  does not support. An unsupported answer is a content defect: FLAG it.
- The Why line must refer to the wording of the question itself, and explain why
  THIS answer follows. Keep it tight - this is a hint that closes a gap in a
  student's understanding, not an essay.
- Write plainly, for a student at IELTS band 6. No preamble, no meta-commentary.`;

/** Type-specific framing for the Why line. */
const FRAMING = {
  fill_in_blanks: `These are gap-fill questions. The answer is a word or phrase taken from the
passage. Explain WHERE the word comes from and why it fits the gap - point at the phrase in
the gapped sentence that signals it (a synonym, a defining phrase, a number).
Example of the right register: "The word must come from elsewhere in the text; 'rainforest'
is used throughout and fits 'a tropical ___'."`,

  table_completion: `These are table-completion questions. The answer is a word from the passage
that belongs in a table cell. Say which row/label of the table the gap sits in, then show the
sentence in the passage that supplies the word.`,

  drag_drop: `These are summary-completion questions answered from a supplied word bank, so the
chosen word is usually a PARAPHRASE of the passage, not a word you can find in it. Do not claim
the answer word appears in the passage unless it truly does. Instead, quote the passage sentence
the summary is compressing, and explain in the Why line how the bank word restates it.`,

  true_false_not_given: `These are TRUE / FALSE / NOT GIVEN questions about factual claims.
- TRUE: quote the sentence that states the same fact, and say how it matches the statement.
- FALSE: quote the sentence that CONTRADICTS the statement, and name the contradiction
  ("the passage says rarely, the statement says frequently").
- NOT GIVEN: this is the hard case. The passage must be silent on the specific claim. Quote the
  closest related sentence, then say precisely which part of the statement it does NOT address
  (a comparison, a cause, a superlative, a frequency). Never justify NOT GIVEN with "the passage
  does not mention it" alone - name the missing element.`,

  yes_no_not_given: `These are YES / NO / NOT GIVEN questions about the WRITER'S VIEWS, not about
facts. Anchor the Why line to what the writer thinks or claims.
- YES: quote where the writer expresses that view.
- NO: quote where the writer expresses the OPPOSITE view, and name the conflict.
- NOT GIVEN: quote the nearest related sentence, then say which specific opinion the writer never
  offers. Never justify NOT GIVEN with silence alone - name what is missing.`,

  table: `These questions ask WHICH PARAGRAPH contains a given piece of information. The answer is
a paragraph letter. The Where line is already fixed to that paragraph - your job is to quote the
sentence INSIDE that paragraph which carries the information, and explain in the Why line how that
sentence matches the wording of the prompt.`,

  matching_information: (item) => {
    const instr = htmlToText(item.group?.instruction ?? '').toLowerCase();
    if (/heading/.test(instr)) {
      return `These are List-of-Headings questions: match a heading to a paragraph. Quote the
sentence that carries the paragraph's main idea (usually the topic sentence), and explain in the
Why line how the heading summarises the paragraph AS A WHOLE - not just one detail in it.`;
    }
    return `These are matching questions: each statement must be matched to the correct
person/section from the list. Quote what that person actually said or what that section states,
and explain in the Why line how it restates the statement. If a nearby option is a plausible
distractor, one clause on why it does not fit is welcome - but only if the passage shows that.`;
  },

  multiple_choice: `These are multiple-choice questions. The correct option is a PARAPHRASE of
something in the passage. Quote the sentence the correct option paraphrases, and explain in the
Why line how the option restates it ("option B restates this as ..."). Do not discuss the wrong
options unless the passage makes the distinction explicit.`,

  multiple_answers: `These are multiple-answer questions (choose TWO or more letters). Each
correct option is separately supported somewhere in the passage. For the option you are given,
quote the sentence that supports THAT option and explain how it matches.`,

  universal: `Answer using only the passage. Follow the group instruction above for what the task
actually is.`,
};

function framingFor(item) {
  const f = FRAMING[item.group?.type];
  if (!f) return FRAMING.universal;
  return typeof f === 'function' ? f(item) : f;
}

/**
 * One prompt per question GROUP: the passage is sent once and every question in
 * the group shares the type framing, which is both cheaper and more consistent
 * than a call per question.
 *
 * `located` supplies the deterministic Where line where we have one; the model
 * is told to reuse it verbatim rather than guess a paragraph.
 */
export function buildGroupPrompt({ item0, items, passage, located }) {
  const group = item0.group;
  const instruction = htmlToText(group.instruction);
  const groupText = htmlToText(group.question_text);
  // multiple_choice carries a DIFFERENT option list per question, so it gets its
  // list printed under each question instead of once as a shared group legend.
  const perQuestionChoices = group.type === 'multiple_choice';
  const legend = perQuestionChoices ? [] : legendOf(item0);

  const lines = [];
  lines.push(
    `You are writing answer explanations for an IELTS Reading test. A student has just finished`,
    `the test and wants to understand why each answer is correct.`,
    ''
  );
  lines.push('===== PASSAGE =====', passage.trim(), '', '===== END PASSAGE =====', '');

  if (instruction) lines.push('===== TASK INSTRUCTION =====', instruction, '');
  if (groupText) lines.push('===== TASK BODY (summary / table / stem) =====', groupText, '');
  if (legend.length) {
    lines.push(
      '===== OPTION LIST =====',
      ...legend.map((o) => `${o.key}. ${o.text}`),
      ''
    );
  }

  lines.push('===== QUESTION TYPE GUIDANCE =====', framingFor(item0), '');
  lines.push('===== QUESTIONS =====');
  for (const it of items) {
    const qt = (it.question_text ?? '').trim();
    let ansLabel = it.answer;
    if (it.answerText) {
      ansLabel = `${it.answer} — "${it.answerText}"`;
    } else if (legend.length) {
      // Keys are not always single letters: 153 of the 393 matching_information
      // questions are List-of-Headings and answer with Roman numerals (II, VII).
      // Looking up only /^[A-K]$/ left those prompts saying "Correct answer: II"
      // with no indication of what heading II actually is.
      const hit = legend.find(
        (o) => o.key.trim().toUpperCase() === String(it.answer).trim().toUpperCase()
      );
      ansLabel = hit ? `${it.answer} (${hit.text})` : it.answer;
    }
    lines.push(
      `[Q${it.question_number}]`,
      qt ? `Question: ${qt}` : `Question: (gap ${it.question_number} in the task body above)`
    );
    if (perQuestionChoices) {
      const choices = choicesOf(it);
      if (choices.length) lines.push('Options:', ...choices.map((c) => `  ${c.key}. ${c.text}`));
    }
    lines.push(`Correct answer: ${ansLabel}`);
    const loc = located.get(it.id);
    if (loc) {
      lines.push(
        `Where (ALREADY RESOLVED - copy this exactly onto the Where line): ${loc.label}`
      );
    }
    lines.push('');
  }

  lines.push('===== OUTPUT FORMAT =====', FORMAT, '');
  lines.push(
    `Output one block per question, each headed by its [Q<number>] tag on its own line, followed`,
    `by the three lines. Cover all ${items.length} question(s): ${items.map((i) => `Q${i.question_number}`).join(', ')}.`,
    `No other text.`
  );

  return lines.join('\n');
}

/** Parse the model's per-question blocks back out. */
export function parseResponse(text, items) {
  const out = new Map();
  const byNumber = new Map(items.map((i) => [String(i.question_number), i]));
  const chunks = text.split(/^\s*\[Q(\d+)\]\s*$/gm);

  for (let i = 1; i < chunks.length; i += 2) {
    const num = chunks[i];
    const body = (chunks[i + 1] ?? '').trim();
    const item = byNumber.get(num);
    if (!item) continue;

    const flag = body.match(/^\s*FLAG:\s*(.+)$/im);
    if (flag) {
      out.set(item.id, { flagged: true, reason: flag[1].trim() });
      continue;
    }
    const where = body.match(/^\s*Where:\s*(.+)$/im)?.[1]?.trim();
    const quote = body.match(/^\s*Quote:\s*(.+)$/im)?.[1]?.trim();
    const why = body.match(/^\s*Why:\s*([\s\S]+?)(?=\n\s*(?:Where|Quote|\[Q)|$)/im)?.[1]?.trim();

    if (!where || !quote || !why) {
      out.set(item.id, { flagged: true, reason: `malformed model output for Q${num}` });
      continue;
    }
    out.set(item.id, { where, quote: quote.replace(/^["“]|["”]$/g, '').trim(), why });
  }
  return out;
}
