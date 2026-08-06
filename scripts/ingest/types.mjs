// The authoring rules for every question type, in one place.
//
// This module is the single source of truth: the extraction prompt is generated
// from it, the validator checks against it, and INGESTION_GUIDE.md documents it.
// Change a rule here and all three follow.
//
// Everything below was verified against live prod data (2026-08), not taken from
// type_db/ - which was wrong about `table` in a way that would mistreat 387
// questions. See the "Documentation corrections" section of the guide.

/**
 * How a type stores its options. This is the single biggest trap in the schema:
 * two different conventions share one `options` table.
 *
 *  GROUP_LEGEND    option_key = 'A'..'F' (or roman numerals), question_number NULL.
 *                  One shared list per group. The answer is the key stored in
 *                  questions.correct_answer. options.is_correct is unreliable here
 *                  and must not be used for grading.
 *
 *  PER_QUESTION    option_key NULL, question_number identifies which question the
 *                  option belongs to. questions.correct_answer is NULL; the answer
 *                  is the single row flagged is_correct.
 *
 *  NONE            the type has no options at all; the answer is free text in
 *                  questions.correct_answer.
 */
export const OPTIONS = {
  GROUP_LEGEND: 'group_legend',
  PER_QUESTION: 'per_question',
  NONE: 'none',
};

/**
 * For PER_QUESTION types the letter a student sees (A, B, C, D) is NOT stored.
 * The platform derives it at render time: testDetailStore fetches options
 * `.order("option_text")` and processMultipleChoice() letters them by array index.
 * Any tool that needs to talk about "option C" must reproduce that sort, or the
 * letter will disagree with the screen.
 */
export function displayLetters(optionTexts) {
  return [...optionTexts]
    .sort((a, b) => String(a).localeCompare(String(b)))
    .map((text, i) => ({ letter: String.fromCharCode(65 + i), text }));
}

export const TYPES = {
  multiple_choice: {
    label: 'Multiple choice',
    options: OPTIONS.PER_QUESTION,
    correctAnswer: null, // MUST be null - the answer lives on the option row
    itemText: 'the question stem',
    groupText: false,
    notes:
      'questions.correct_answer is NULL for all 211 live prod rows. Exactly one option per ' +
      'question_number carries is_correct=true. Negative stems ("which is NOT mentioned") are ' +
      'legitimate but cannot be explained by the Explain pipeline - flag them for a human.',
  },

  fill_in_blanks: {
    label: 'Gap fill / note completion',
    options: OPTIONS.NONE,
    correctAnswer: 'text',
    itemText: 'the answer word or phrase (same as correct_answer)',
    groupText: 'the gapped text, with ___ marking each blank',
    notes:
      'The number of ___ markers in the group question_text MUST equal the number of question ' +
      'rows, in order. correct_answer has to match the passage spelling exactly.',
  },

  table_completion: {
    label: 'Table completion',
    options: OPTIONS.NONE,
    correctAnswer: 'text',
    itemText: 'the answer word or phrase',
    groupText: 'an HTML <table> whose cells contain ___ for each blank',
    notes: 'Identical to fill_in_blanks except the group text is a table. Both enums are used in prod for this skill.',
  },

  universal: {
    label: 'Universal (free HTML with blanks)',
    options: OPTIONS.NONE,
    correctAnswer: 'text',
    itemText: 'the answer word or phrase',
    groupText: 'sanitised HTML (headings, lists, tables, boxes) containing ___ per blank',
    notes: 'Same answer logic as fill_in_blanks. May carry image_url on the group.',
  },

  drag_drop: {
    label: 'Summary completion from a word bank',
    options: OPTIONS.NONE,
    correctAnswer: 'text',
    itemText: 'the answer word',
    groupText: 'the summary text with ___ per blank',
    notes:
      'The word bank distractors are ALSO rows in `questions`, with question_number NULL and ' +
      'is_correct=false. They are not questions: never number them, never explain them, never ' +
      'count them in question_quantity. 84 such rows exist in prod.',
  },

  true_false_not_given: {
    label: 'True / False / Not Given',
    options: OPTIONS.NONE,
    correctAnswer: 'verdict',
    verdicts: ['TRUE', 'FALSE', 'NOT GIVEN'],
    itemText: 'the statement being judged',
    groupText: false,
    notes: 'About facts in the passage. Use YES/NO/NOT GIVEN instead when the question is about the writer\'s views.',
  },

  yes_no_not_given: {
    label: 'Yes / No / Not Given',
    options: OPTIONS.NONE,
    correctAnswer: 'verdict',
    verdicts: ['YES', 'NO', 'NOT GIVEN'],
    itemText: 'the claim being judged',
    groupText: false,
    notes: 'About the writer\'s views or claims, not about facts.',
  },

  matching_information: {
    label: 'Matching information / List of headings (TWO skills)',
    options: OPTIONS.GROUP_LEGEND,
    correctAnswer: 'key',
    itemText: 'the statement (statement-matching) or "Paragraph X" (list of headings)',
    groupText: false,
    twoSkills: {
      statement_matching: {
        correctAnswer: 'a letter A-F matching options.option_key',
        itemText: 'the statement to match',
        optionText: 'the person, section or claim being matched to',
        liveVolume: '250 reading questions',
      },
      list_of_headings: {
        correctAnswer: 'a roman numeral (I, II, IV...) matching options.option_key',
        itemText: 'the target paragraph, literally "Paragraph A"',
        optionText: 'the heading prose - it exists ONLY here, never on the question row',
        liveVolume: '143 reading questions',
      },
    },
    notes:
      'Discriminator: a roman-numeral correct_answer means list of headings. Because i, v and x ' +
      'collide with option keys I, V and X, require either more than one character or a ' +
      '"heading" instruction before treating it as headings. options.is_correct is false on ' +
      'every legend row for headings - do not grade from it.',
  },

  table: {
    label: 'Which paragraph contains… (NOT table completion)',
    options: OPTIONS.GROUP_LEGEND,
    correctAnswer: 'key',
    itemText: 'the piece of information to locate',
    groupText: false,
    notes:
      'Despite the name this is NOT table completion - that is table_completion/fill_in_blanks. ' +
      '40 of 45 live groups ask which paragraph contains something. options hold BARE LETTERS in ' +
      'option_text (average length 1) and option_key is NULL on every row, so resolving an answer ' +
      'by option_key returns nothing. The passage MUST letter its paragraphs.',
  },

  multiple_answers: {
    label: 'Choose TWO or more',
    options: OPTIONS.GROUP_LEGEND,
    correctAnswer: 'key',
    itemText: 'the text of the correct option this row represents',
    groupText: 'the question being asked',
    notes:
      'One `questions` row PER CORRECT ANSWER, each holding that option\'s key in correct_answer. ' +
      'question_range = the number of correct answers. Options are group-level with is_correct ' +
      'true on the correct ones.',
  },

  map: {
    label: 'Map / diagram labelling',
    options: OPTIONS.PER_QUESTION,
    correctAnswer: 'key',
    itemText: 'the label to place',
    groupText: false,
    unverified: true,
    notes:
      'Group carries image_url. NOT VERIFIED against reading data: prod has zero map groups in ' +
      'reading (active or inactive), so this row is from type_db and listening usage only. ' +
      'Validate by hand the first time a reading map test is ingested.',
  },
};

export const READING_TYPES = Object.keys(TYPES);

/** Is this correct_answer a roman numeral (i.e. list-of-headings)? */
export function isRomanNumeral(answer, instruction = '') {
  const a = String(answer ?? '').trim();
  if (!/^[IVXivx]+$/.test(a)) return false;
  return a.length > 1 || /heading/i.test(instruction);
}

/** Human-readable one-liner per type, used in reports and the guide. */
export function describe(type) {
  const t = TYPES[type];
  if (!t) return `${type}: UNKNOWN TYPE`;
  const opt = { group_legend: 'group legend', per_question: 'per-question choices', none: 'no options' }[t.options];
  const ans = t.correctAnswer === null ? 'options.is_correct' : `correct_answer (${t.correctAnswer})`;
  return `${t.label} — options: ${opt}; answer: ${ans}`;
}
