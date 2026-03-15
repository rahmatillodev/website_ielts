## Universal (HTML content with blanks)

Flexible IELTS content builder supporting full HTML (headings, paragraphs, lists, tables, styled boxes) with inline blanks. Same blank/answer logic as fill_in_blanks. Content is sanitized (DOMPurify) before storage.

### How the information is stored

**Form/state (question_groups):**
- `type`: `"universal"`
- `instruction`: string (optional)
- `content`: sanitized HTML string with `___` for each blank
- `question_text`: same as `content` (kept in sync for DB)
- `answers`: string array, one correct answer per blank in order
- `_startQuestionNumber`: computed; first question number for this group
- `image_url` / `image_file` / `image_url_original` / `image_url_to_delete`: optional image (same pattern as map); stored in question table as `image_url`

**Database (same as fill_in_blanks, plus optional image):**
- **question** table: one row per group with `type: "universal"`, `question_text` = full HTML (with `___`), `question_range` = number of blanks, `image_url` = optional image URL (uploaded and stored like map type).
- **questions** table: one row per blank; `question_number` = global index, `question_text` and `correct_answer` = the answer for that blank.

```json
{
  "id": "test-uuid-123",
  "title": "IELTS Reading Practice Test",
  "type": "reading",
  "duration": 60,
  "difficulty": "MEDIUM",
  "is_premium": false,
  "is_active": true,
  "question_quantity": 2,
  "part": [
    {
      "id": "part-uuid-456",
      "test_id": "test-uuid-123",
      "part_number": 1,
      "title": "Part 1",
      "content": "Reading passage text here...",
      "image_url": null,
      "listening_url": null,
      "question": [
        {
          "id": "group-uuid-789",
          "test_id": "test-uuid-123",
          "part_id": "part-uuid-456",
          "type": "universal",
          "instruction": "Write NO MORE THAN TWO WORDS",
          "question_text": "<p>The table below shows data.</p><table><tbody><tr><td>Country</td><td>Population</td></tr><tr><td>Japan</td><td>___</td></tr></tbody></table><div class=\"info-box\">Important notice.</div>",
          "question_range": 1,
          "image_url": null, // link
          "questions": [
            {
              "id": "question-uuid-101",
              "test_id": "test-uuid-123",
              "question_id": "group-uuid-789",
              "part_id": "part-uuid-456",
              "question_number": 1,
              "question_text": "125 million",
              "correct_answer": "125 million",
              "explanation": null,
              "is_correct": true
            }
          ],
          "options": []
        }
      ]
    }
  ]
}
```

### Behaviour

- **Editor**: Plain ReactQuill (no table plugin). Headers, bold/italic/underline, lists, alignment, colors. Tables and box divs are not rendered inside Quill; they appear as `[Table]` and `[Box]` placeholders. Full HTML (including `<table>`, `<div class="info-box">`, etc.) is stored in `content` / `question_text`.
- **Add Blank**: Inserts `___` at cursor; blank count and answers stay in sync.
- **Insert Table**: Table builder lets you set rows/columns, header row toggle, “blanks in last column”, and **editable header and body cell text**. Inserts raw table HTML (with `class="question-table"`, `<tbody>`) at the end of content.
- **Insert Box**: Box builder (type, title, content) inserts a styled `<div class="info-box">` (or tip-box, warning-box, note-box) at the end of content.
- **Paste**: Pasting HTML that contains a table or box is intercepted; the fragment is sanitized and appended to content (added at end), so table/box markup is preserved.
- **Sanitization**: All HTML is sanitized with DOMPurify before storing; allowed tags include table, thead, tbody, tr, th, td, and div with box classes. Table structure is normalized (tbody added if missing, `question-table` class).
- **Preview (editor)**: Sanitize → ensure table structure → wrap tables in `.table-wrapper` (horizontal scroll) → replace `___` with `<span class="blank-slot">[N]</span>` (sequential numbering). Rendered with `dangerouslySetInnerHTML` so tables and boxes display correctly; blanks in cells and boxes are numbered like blanks in paragraphs.
- **Practice/result (input–output)**: Same as fill_in_blanks. Content is sanitized and table structure/wrappers applied; each `___` is rendered as an **inline text input** (not three underscores). Answers are keyed by question id / question_number; one sub-question per blank. Optional **image** is shown above the content when `image_url` is set on the question group (same pattern as map type).
- **Save/load**: Same as fill_in_blanks — one question row per answer; group `question_text` holds the full HTML (valid `<table><tbody><tr><td>…</td></tbody></table>` and box divs). Optional image is uploaded on publish and stored in the question table row as `image_url` (same as map type).
