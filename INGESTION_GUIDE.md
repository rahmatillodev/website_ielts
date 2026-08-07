# Content Ingestion Guide

How to add a new test to EDU correctly and completely.

This is the authoritative document. Where it disagrees with `type_db/`, this document
wins — `type_db/` was written from the admin form's point of view and has been wrong about
the schema in ways that would corrupt live content (see [Documentation corrections](#documentation-corrections)).
Everything here was verified against live prod data in August 2026.

---

## The checklist

To add a new test:

1. **Put the materials in one folder.** A PDF, HTML or plain-text file containing the
   passages and questions; optionally an answer key (same file or a separate one); for
   listening, the audio file.
2. **Point `.env.ingest` at the right project.** `SUPABASE_URL` decides where content
   lands. There is no `--prod` flag by design — targeting prod is a deliberate edit to
   that file. Dev is `miyoovimtupziuehtcxi`, prod is `oqzluzzctiirxxhxsboc`.
3. **Parse and validate.** Nothing is written:
   ```bash
   cd platform
   node --env-file=.env.ingest scripts/ingest/ingest.mjs /path/to/materials
   ```
   Read the report: title, parts, question count per type, answers found, anything
   ambiguous. Fix errors before continuing — a failed validation writes nothing.
4. **Dry run.** See the exact rows, table by table:
   ```bash
   node --env-file=.env.ingest scripts/ingest/ingest.mjs /path/to/materials --apply --dry-run
   ```
5. **Write it.** You are asked to confirm before anything is inserted:
   ```bash
   node --env-file=.env.ingest scripts/ingest/ingest.mjs /path/to/materials --apply
   ```
   The test is created **inactive**. It verifies itself afterwards: counts match, every
   question resolves an answer, gap answers appear in their own part's passage.
6. **Listening only — upload the audio by hand** to the `listening-test` bucket and set
   part 1's `listening_url`. (Deliberately manual: see [Listening](#listening).)
7. **Check it in the app**, then activate:
   `update test set is_active = true where id = '<id>';`
8. **Optional — generate explanations** for the new reading questions:
   ```bash
   node --env-file=.env.ingest scripts/explain/generate.mjs --only <testId>
   ```
   (or pass `--explain` in step 5).

`--status` prints progress; a job that reached `applied` is never re-applied.

---

## The schema

```
test
└── part                 (1–5 per test; the passage or transcript lives here)
    └── question         (a GROUP: carries `type` and `instruction`)
        ├── questions    (the individual numbered items)
        └── options      (answer choices — see the two conventions below)
```

The confusing part of this schema is that `question` (singular) is a **group** and
`questions` (plural) are the **items**. A group is one instruction block — "Questions 1–5,
choose the correct heading" — and holds no answers itself.

### `test`

| Column | Notes |
|---|---|
| `title` | **NOT NULL** |
| `type` | `reading` / `listening` / `speaking` / `shadowing` / `podcast` / `writing` |
| `duration` | minutes, default 60 (use 30 for listening) |
| `difficulty` | `EASY` / `MEDIUM` / `HARD`, default `MEDIUM` |
| `is_active` | default true — **ingestion writes false**, you activate deliberately |
| `question_quantity` | count of answerable questions; excludes word-bank rows |

### `part`

| Column | Notes |
|---|---|
| `test_id` | **NOT NULL** |
| `title` | **NOT NULL** |
| `part_number` | **NOT NULL**, and `CHECK (part_number BETWEEN 1 AND 5)` |
| `content` | the passage (reading) or transcript (listening) |
| `listening_url` | audio URL — **part 1 only**, by convention |
| `image_url` | optional |
| `video_url` | podcast / shadowing video — a YouTube link or a direct media file |
| `video_duration_seconds` | **seconds**, the real length of `video_url`. See below |

`part_number` outside 1–5 is rejected by the database. Validate before writing: a
rejection halfway through a multi-table write is how you get a half-built test.

#### Video duration (podcast / shadowing)

The Speaking library cards print a duration badge from `video_duration_seconds`.
It is **seconds**, and it belongs to that specific video. Do not confuse it with
`test.duration`, which is the exam time limit in minutes and defaults to 60 —
podcast and shadowing rows inherit that default, which is why the badge used to
be wrong.

Rules for anything that writes `part`:

- set it whenever `video_url` is set or changed;
- store the video's real length, not a rounded estimate;
- leave it `NULL` rather than guessing. `NULL` means "not measured yet" and the
  client measures the video in the browser; a wrong number is shown as fact.

To fill in rows that are missing it, or to find rows whose stored value no
longer matches the file:

```bash
node --env-file=.env.explain scripts/media/backfillVideoDurations.mjs --dry-run
node --env-file=.env.explain scripts/media/backfillVideoDurations.mjs
node --env-file=.env.explain scripts/media/backfillVideoDurations.mjs --recheck
```

The column ships in `supabase/migrations/20260807120000_part_video_duration.sql`
and **must be applied before** a client build that reads it — though the client
degrades safely if it is not: it retries the query without the column and falls
back to measuring each video.

### `question` (the group)

| Column | Notes |
|---|---|
| `test_id`, `part_id` | **NOT NULL** |
| `type` | the `question_type` enum — 11 values apply to reading/listening |
| `instruction` | the printed instruction; may contain HTML |
| `question_text` | group-level body: the gapped summary, the HTML table. NULL for types that don't need one |
| `question_range` | **TEXT**, not integer |
| `image_url` | map/diagram image |

There is **no `question_number` column on `question`**. Any doc that says otherwise is
describing a schema that does not exist.

### `questions` (the items)

| Column | Notes |
|---|---|
| `test_id`, `question_id` (→ group), `part_id` | `part_id`'s FK is the **only one without `ON DELETE CASCADE`** — delete parts after questions |
| `question_number` | the printed number. NULL **only** for drag-drop word-bank rows |
| `question_text` | meaning varies by type — see the table below |
| `correct_answer` | the answer, **or NULL for `multiple_choice`** |
| `explanation` | the Explain surface (reading only) — see `scripts/explain/` |
| `is_correct` | true for real questions; false marks a word-bank distractor |

### `options`

| Column | Notes |
|---|---|
| `question_id` | points at the **group**, never at a `questions` row |
| `question_number` | set for per-question choices, NULL for a group legend |
| `option_key` | `A`–`F` or roman numerals for a legend; NULL for per-question choices |
| `option_text` | the option's text — or a bare letter for the `table` type |
| `is_correct` | authoritative **only** for per-question choices |

---

## The two option conventions

This is the single biggest trap in the schema. One table carries two incompatible
conventions, and mixing them silently corrupts a test.

### Group legend — `matching_information`, `table`, `multiple_answers`

One shared list per group. `option_key` is set (`A`–`F`, or roman numerals for headings),
`question_number` is **NULL**, and each question's answer is the key stored in
`questions.correct_answer`.

`options.is_correct` is **unreliable here and must not be used for grading**. On
list-of-headings groups it is `false` on every row, including the correct headings.

### Per-question choices — `multiple_choice`, `map`

Each question has its own options. `option_key` is **NULL**, `question_number` identifies
the owning question, `questions.correct_answer` is **NULL**, and the answer is the single
row flagged `is_correct`.

All 211 live multiple-choice questions in prod have `correct_answer = NULL`. Code that
reads the answer from `correct_answer` finds nothing; it must resolve through the options.

> **The letter a student sees is not stored.** For per-question choices the platform
> derives it at render time: `testDetailStore` fetches options `.order("option_text")` and
> letters them by array index. So "option C" means *the third option alphabetically by
> text*. Any tool that names a letter must reproduce that sort — `displayLetters()` in
> `scripts/ingest/types.mjs` does — or its letters will disagree with the screen.

#### The `option_key` trap — read this before importing multiple choice

`options.option_key` is **stored but ignored** for per-question types. The app never reads
it; it letters by the alphabetical sort above. Measured in prod on 2026-08-06:

> **131 of the 156** multiple-choice questions that carry an authored `option_key` display
> a **different letter** than the one the author assigned.

Example, from *A great leap forward* Q7: the option "is pleasing." was authored as **D**
and renders to the student as **A**.

Grading is unaffected — it matches on `option_text` and `is_correct`, never on the letter.
The damage is to **auditing**: when you check our content against the source paper's answer
key, their "D" and our "D" are different options. That is the mechanism by which a wrong
`is_correct` flag survives review, and it is how the two confirmed mis-keys in
*A great leap forward* got in.

**Decided 2026-08-06: `option_key` is not stored for per-question types.** The pipeline
drops it on write for `multiple_choice` and `map`. The app has never read it there, grading
has never depended on it, and keeping it only maintained a second, invisible lettering
scheme that disagreed with the screen. Existing rows are left as they are — the column is
simply ignored, as it always has been.

> ### The rule: **compare by text, never by letter**
>
> For per-question types the answer is *the option whose text says X*, not "option C".
>
> - **Importing an answer key.** When the source paper says "the answer is C", resolve C
>   **in the source paper's own lettering** to get the option's *text*, then flag the row
>   whose `option_text` matches that text. Never carry the letter across — our C is not
>   their C.
> - **Auditing content against a paper.** Match on option text. A letter-to-letter
>   comparison is meaningless and is exactly how the two confirmed mis-keys in
>   *A great leap forward* survived review.
> - **Writing about a question** (explanations, reports, bug tickets) — if you must name a
>   letter, derive it with `displayLetters()` so it matches what the student sees. Better:
>   quote the option text.
>
> Group legends (`matching_information`, `table`, `multiple_answers`) are the exception and
> keep their keys, because there the key **is** the answer — it is what
> `questions.correct_answer` stores.

### No options — everything else

Gap fill, table completion, universal, drag-drop, TFNG and YNNG have no option rows at
all. The answer is text or a verdict in `correct_answer`.

---

## The types

| Type | Options | `correct_answer` | `questions.question_text` holds |
|---|---|---|---|
| `multiple_choice` | per-question | **NULL** (answer is on the option) | the stem |
| `fill_in_blanks` | none | the answer text | the answer text |
| `table_completion` | none | the answer text | the answer text |
| `universal` | none | the answer text | the answer text |
| `drag_drop` | none | the answer word | the answer word |
| `true_false_not_given` | none | `TRUE` / `FALSE` / `NOT GIVEN` | the statement |
| `yes_no_not_given` | none | `YES` / `NO` / `NOT GIVEN` | the claim |
| `matching_information` | group legend | a letter, or a roman numeral for headings | the statement, or `"Paragraph A"` |
| `table` | group legend | a paragraph letter | the information to locate |
| `multiple_answers` | group legend | the option key, one row per correct answer | that option's text |
| `map` | per-question | the letter | the label — **unverified for reading** |

Notes that matter when authoring:

- **`fill_in_blanks` / `table_completion` / `universal` / `drag_drop`** — the group's
  `question_text` carries the body with `___` marking each blank. **One `___` per blank**,
  however many words the answer has, and the count must equal the number of numbered
  questions. Answers are matched to blanks by order, so a miscount misaligns everything
  after it.
- **`drag_drop`** — the word bank's distractors are *also* rows in `questions`, with
  `question_number` NULL and `is_correct` false. They are not questions: never number
  them, never explain them, never count them in `question_quantity`. There are 84 in prod.
- **`multiple_answers`** — one `questions` row **per correct answer**, each holding that
  option's key. `question_range` is the number of correct answers.
- **`map`** — prod has zero map groups in reading (active or inactive). The row above
  comes from `type_db` and listening usage; verify by hand the first time you ingest one.

### `matching_information` is two different skills

One enum value covers two tasks that must be authored differently.

| | Statement matching | List of headings |
|---|---|---|
| `correct_answer` | a letter, `"B"` | a roman numeral, `"IV"` |
| `questions.question_text` | the statement to match | the target paragraph, literally `"Paragraph A"` |
| `options.option_text` | a person, section or claim | the **heading prose** |
| `options.option_key` | the letter | the roman numeral |
| Live volume (reading) | 250 questions | 143 questions |

**Telling them apart:** a roman-numeral `correct_answer` means list of headings. Because
`i`, `v` and `x` collide with option keys `I`, `V` and `X`, require either more than one
character or a `heading` instruction before deciding.

For list of headings the heading text exists **only** in `options` — there is no heading
on the question row. To highlight the passage region, read the paragraph from
`questions.question_text`, not from the answer: the answer names a heading, which says
nothing about where in the passage to look.

---

## Content rules

These come from audits of live content. Each one is enforced by
`scripts/ingest/validate.mjs`; the rule is here so the tooling can be changed without
losing the reason.

**Every answerable question must have a recoverable answer.** Either a non-empty
`correct_answer`, or exactly one option flagged `is_correct`. This started as 19 ungradeable
live prod questions; after the 2026-08-06 repairs it is **1** (*Aphantasia* Q4) — six answers
were authored, and *Ancient Egypt*, whose whole 13-question paper was ungradeable, was
deactivated. Content that cannot answer its own questions is rejected.

**Free-text answers must match the passage's own spelling exactly.** Grading normalises
case and spacing but is only variant-tolerant for documented rules — a key that says
"colour" against a passage that says "color" is a live grading bug. Ingestion checks each
gap answer against the passage text.

**Questions must be attached to the part whose content contains their answer.** A question
filed under the wrong part cannot be answered from the passage the student is shown. The
validator checks that every gap answer appears in *its own part's* content.

**If questions answer with paragraph letters, the passage must contain those letters.**
Passages letter paragraphs in three observed styles: a capital alone on its own line,
`A.`/`A)` starting a line, or `A ` followed by the first word. If the stored passage
doesn't carry the markers the questions refer to, the test is unanswerable as written.
Around 31 such questions exist in prod. Watch for this when a passage is copied from a
source that used visual indentation instead of letters — and note that slicing a passage
can *drop* a leading marker, which the parser now explicitly reaches back to recover.

**Question numbers must be unique and are expected to be contiguous.** Gaps are a warning,
not an error — some papers genuinely renumber — but they are usually a sign a group was
missed.

**The instruction's stated range must match the numbers actually rendered.** An instruction
reading *"In boxes 12-17 on your answer sheet"* above questions numbered **1–6** is a bug the
student sees. 33 live groups across 25 tests had this; 20 were single-passage practice tests
that kept the caption from the 40-question paper they were cut from. Validation compares the
first numeric range in `instruction` against the group's own `min`/`max` `question_number`.
A *different-sized* range is the more serious case — it means a question is missing or extra,
so it is an error rather than something to rewrite automatically.

**The passage's text layer must be undamaged.** This is the rule that costs the most to skip,
because slicing makes it invisible. See below.

### Passage text integrity

Passages are sliced from the source rather than re-emitted, so `part.content` is byte-identical
to the material **by construction**. That is a guarantee we never invent text. It is *not* a
guarantee the text is good: when a PDF's text layer is broken, the damage is stored exactly as
faithfully as clean prose would be, and the student reads it.

This is measured, not theoretical. Of the 56 citations the explanation pipeline rejected on prod:

> **30 were rejected because the passage was broken, not the model.** The generator quoted
> correctly; `part.content` said `highly com p etitive`, `the property o f preserving`,
> `the research teamat brigham& women's hospital`. The model read the damage, silently
> repaired it, and was rejected for not being verbatim.

**28 of those 30 are in `Full Reading *` and `Mock Test - Reading *`** — the bulk-imported
tests. Hand-authored single-passage tests are essentially clean. Bulk import is where this
defect enters, which is exactly why it belongs in this pipeline.

`scripts/ingest/textIntegrity.mjs` runs on every part before any write. Signatures that
**block the write** — none of these can occur in correctly extracted prose, and each changes
what the student reads:

| Signature | Live hits | Example |
|---|---|---|
| hyphenated word broken after the hyphen | 72 | `red- cockaded`, `Balsari- Palsule` |
| word split by a space | 10 | `the property o f preserving`, `em p loyees` |
| comma with no space after it | 1 | `Pitt,Emeritus` |
| ampersand that lost its spacing | 1 | `Brigham& Women` |

Reported as **warnings** only, because they are cosmetic or have measured false positives:

- a quotation mark detached from its word (`as he called himself, ” breathed`) — 14 of 14
  sampled hits genuine, but it never changes meaning;
- a capital inside a word — catches `TheOhio State University` and `ofCambridge`, but also
  `PowerPoint` and `MacNaughton`, so roughly half its hits are legitimate;
- a floating footnote marker — only 2 live hits, and they are structurally identical while
  meaning opposite things: `an adobe * conservation project` is damage, `followed by * A Bug's
  Life*` is emphasis markup with a stray space.

Calibration against all 480 live passages: **84 errors across 21 reading tests, and zero
across the 79 listening transcripts** — those are machine-transcribed rather than
PDF-extracted, so a clean source really does score zero. Enforcing this strictly costs nothing
on good material, which is the whole argument for making it an error rather than a warning.

> **The known gap: deleted spaces.** `teamat`, `theycan`, `badnews` leave no signature a regex
> can find, and both dictionary approaches were measured and rejected as worse than useless —
> `/usr/share/dict/words` flags *countries*, *copies* and *colour* as damage (4,123 false
> hits), and a function-word split test flags *there* as `the|re` (3,512 hits across 175 of
> 176 tests). Catching this class needs a spell-checker with real morphology, or a second
> extraction of the same PDF to diff against. Until then it is an accepted gap — which is the
> argument for enforcing the detectable half strictly rather than loosely.

---

## Listening

- **Audio goes to the `listening-test` storage bucket** (public). Images go to
  `test-assets`.
- **`listening_url` belongs on part 1.** All 82 prod listening tests with audio follow
  this, and the player reads part 1. Putting it elsewhere works only by accident.
- **Transcripts go in `part.content`, split per part, with `[mm:ss]` timestamps.** This is
  a deliberate decision: transcripts are readable by the client, and that is accepted, in
  exchange for audio seek and answer location.
- **Audio upload is deliberately manual.** The pipeline reports the file and reminds you,
  but does not upload: bucket writes are not covered by the compensating-delete rollback,
  so an upload could survive a failed write and leave an orphan object.
- **Transcribing new audio** is already solved — `scripts/transcribe/` chunks the audio,
  runs Gemini, splits on part markers and writes `part.content`, resumably. Reuse it
  rather than writing something new.

---

## Writing rules

**Validate everything before the first insert.** Never delete or partially insert and then
discover the content is unusable. The pipeline runs extract → parse → validate → confirm
→ apply, and the first four touch nothing.

**Writes are atomic by compensating delete.** PostgREST has no multi-statement
transaction, but every child table cascades from `test`, so a failed write is undone by
deleting the one test row. This is sound **only for a brand-new test** — nothing else
references a test created seconds ago. That is why this pipeline creates new tests and
never edits existing ones. Editing existing content is an admin-UI or hand-written job,
and would need a real transaction (a Postgres function) to be safe.

**Never overwrite existing content silently.** The explanation pipeline's rule —
`.or('explanation.is.null,explanation.eq.')` on every update — applies to any tool that
touches content that might already be populated.

**New tests land inactive.** Look at it in the app before students can.

**Prod and dev stay in schema parity.** Content lives where you put it; schema changes go
to both.

---

## Documentation corrections

`type_db/` predates these audits and was wrong in ways that matter. Corrected 2026-08 —
the fixed statements are in `type_db/ListofHeadings.md`, `MatchingInformation.md`,
`TableCompletion.md` and `full_db.md`.

**`table` is not table completion.** It is *"Which paragraph contains the following
information?"* — 40 of its 45 live groups. Table completion is `table_completion` (and
`fill_in_blanks`, which is used interchangeably for the same skill). Building against the
old mapping mistreats 387 questions. The `table` type's options hold **bare letters** in
`option_text` with `option_key` NULL on every row, so resolving one of its answers by
`option_key` silently returns nothing.

**List of headings is not `table`.** It lives in `matching_information` with roman-numeral
keys (143 live reading questions).

**`multiple_choice` items are rows in `questions`.** `full_db.md` claimed they live in
`question` with a `question_number` column and that `questions` is "NOT used for
multiple_choice". Both are false: `question` has no such column, and all 211 live MC
questions are `questions` rows. It also omitted the most important fact about the type —
that `correct_answer` is NULL and the answer is on the option row.

**`question.question_range` is TEXT**, not integer.

**`map` is documented for reading but has no reading content.**

---

## The tooling

`scripts/ingest/` follows the same shape as `scripts/explain/` and `scripts/transcribe/`:
an `.env.<name>` file chooses the target, state is resumable and keyed by project ref, and
progress is mirrored to a regenerated Markdown file.

| File | Role |
|---|---|
| `ingest.mjs` | the CLI: extract → parse → validate → confirm → apply → verify |
| `extract.mjs` | PDF/HTML/text → plain text. **Ground truth** — never paraphrases |
| `parse.mjs` | Gemini structures the text; passages are *sliced*, never re-emitted |
| `validate.mjs` | every rule above, as errors and warnings |
| `textIntegrity.mjs` | passage damage detection — the one check that slicing cannot provide |
| `apply.mjs` | ordered insert, compensating-delete rollback, post-write verification |
| `types.mjs` | the per-type rules — the prompt, the validator and this guide share it |
| `state.mjs` | resumable job state + `INGEST_PROGRESS.<ref>.md` |

### How parsing stays honest

Layout varies too much for a heuristic parser, and a language model will quietly drop a
question or reword an option. So the model is used for **structure only**, and never
trusted for words:

- **Passages are never re-emitted.** The model returns the opening and closing words, and
  the passage is *sliced out of the source text*. `part.content` is byte-identical to the
  material by construction, and long passages cost no output tokens.

  > Byte-identical to a **broken** source is still broken. Slicing rules out invented text; it
  > says nothing about the quality of what was extracted, and it makes bad extraction invisible
  > precisely because every downstream check compares against the same damaged string.
  > `textIntegrity.mjs` is the only check in the pipeline that looks at the passage on its own
  > terms rather than against the source — see [Passage text integrity](#passage-text-integrity).
- **Everything the model does emit is checked back against the source.** Stems, options
  and instructions must be recoverable from the extracted text, comparing with punctuation
  style and whitespace normalised — the same technique the explanation pipeline uses for
  quotes. Anything unrecoverable is an error, not a warning.
- **A scanned PDF is refused.** If a PDF yields almost no text there is nothing to verify
  against, so the run stops and asks for a text-based version rather than trusting a
  model's reading of a picture.

The model still makes mistakes — in testing it classified a "which paragraph contains"
group as `matching_information`, and wrote `___ ___` for a two-word answer. Both were
caught by validation before any write. That is the intended division of labour: the model
proposes, the validator disposes.
