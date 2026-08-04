## 6. List of Headings

> **Corrected 2026-08-04.** This file previously documented List of Headings as schema type
> `table` and showed a JSON example matching neither skill. Verified against prod: **List of
> Headings is stored under `matching_information` with roman-numeral keys**, and `table` is a
> *different* skill — "Which paragraph contains the following information?" (see §6b below).
> A treatment keyed off the old mapping mistreats 387 live questions.

List of Headings and the `table` skill are near-mirror images, which is what made them easy to
conflate. The difference is **which side holds the paragraph and which holds the prose**:

| | List of Headings | `table` (§6b) |
|---|---|---|
| `question.type` | `matching_information` | `table` |
| `instruction` | "Choose the correct heading for each section…" | "Which paragraph contains the following information?" |
| `questions.question_text` | the **target paragraph** — `"Paragraph A"` | the **statement** — `"a definition of the two main aims of biophilia"` |
| `questions.correct_answer` | roman numeral — `"IV"` | paragraph letter — `"A"` |
| `options.option_text` | the **heading prose** — `"Famous cases in literature of sleep problems"` | a bare letter — `"A"` |
| `options.option_key` | roman numeral — `"IV"` | `null` |
| Live volume (active prod) | 143 questions | 244 questions |

Practical consequences:

- **To highlight the passage region for List of Headings, read the paragraph from
  `questions.question_text`, not from the answer.** The answer names a heading in the bank; it says
  nothing about where in the passage to look. All 143 live questions carry a parseable
  `"Paragraph X"`, and the label is locatable in the passage for 131 of them (91.6%).
- **The heading prose lives only in `options`**, resolved by `option_key` = the roman numeral. There is
  no heading text on the question row.
- Roman numerals are the reliable discriminator between the two skills inside
  `matching_information` — see the warning in `MatchingInformation.md`. Note `i`, `v` and `x` are
  ambiguous with option keys `I`, `V`, `X`, so pair the numeral test with the instruction text.

```json
{
  "id": "group-uuid-789",
  "test_id": "test-uuid-123",
  "part_id": "part-uuid-456",
  "type": "matching_information",
  "instruction": "<p>Choose the correct heading for each section from the list of headings below. Write the correct number, i-vii, in boxes 1-5.</p>",
  "question_text": null,
  "question_range": 5,
  "image_url": null,
  "questions": [
    {
      "id": "question-uuid-101",
      "question_id": "group-uuid-789",
      "part_id": "part-uuid-456",
      "question_number": 1,
      "question_text": "Paragraph A",
      "correct_answer": "V",
      "explanation": null
    },
    {
      "id": "question-uuid-102",
      "question_id": "group-uuid-789",
      "part_id": "part-uuid-456",
      "question_number": 2,
      "question_text": "Paragraph B",
      "correct_answer": "VII",
      "explanation": null
    }
  ],
  "options": [
    {
      "id": "option-uuid-201",
      "question_id": "group-uuid-789",
      "part_id": "part-uuid-456",
      "question_number": null,
      "option_key": "V",
      "option_text": "An analysis of old documents to discover sleep patterns",
      "is_correct": false
    },
    {
      "id": "option-uuid-202",
      "question_id": "group-uuid-789",
      "part_id": "part-uuid-456",
      "question_number": null,
      "option_key": "VII",
      "option_text": "Scientific evidence that divided sleep is a natural phenomenon",
      "is_correct": false
    }
  ]
}
```

Note `options.is_correct` is **not** the key for this skill — it is `false` on every row, including the
correct headings. Grading compares `questions.correct_answer` to the selected `option_key`.

---

## 6b. Table — "Which paragraph contains…"

Despite the name, schema type `table` is **not** table completion (that is `table_completion`, and
also `fill_in_blanks`). 40 of its 45 live groups ask which paragraph contains a given piece of
information; the rest are letter-bank matching of the same shape. It is Matching Information against
paragraph labels.

```json
{
  "id": "group-uuid-790",
  "part_id": "part-uuid-456",
  "type": "table",
  "instruction": "<p>Which paragraph contains the following information?</p><p>Write the correct letter, <strong>A-F</strong>, in boxes 1-5.</p>",
  "question_text": null,
  "questions": [
    {
      "question_number": 1,
      "question_text": "a definition of the two main aims of biophilia",
      "correct_answer": "A"
    }
  ],
  "options": [
    { "question_number": null, "option_key": null, "option_text": "A", "is_correct": true },
    { "question_number": null, "option_key": null, "option_text": "B", "is_correct": false }
  ]
}
```

- `options` carries **only the letters** — average `option_text` length is 1 character. There is no
  prose to resolve, so a letter answer cannot be turned into text the way `matching_information`
  answers can.
- `option_key` is `null` on every row; the letter sits in `option_text`. Resolving a `table` answer by
  `option_key` returns nothing — a real trap, since the same lookup works for
  `matching_information`.
- The paragraph label is recoverable from the passage for 240 of 244 live questions (98.4%). Passages
  letter their paragraphs in plain text, in three observed styles: a capital alone on its own line
  (41 parts), `A.` or `A)` starting a line (5 parts), and `A ` followed by the first word (19 parts).
  3 parts carry no detectable scheme.

---
