# Reading Explanation Progress

<!-- ARCHIVED SNAPSHOT. Written by scripts/explain/, which no longer exists - the
     explanation pipeline was removed with the Gemini API. Nothing regenerates this file
     and the commands it names cannot be run. Kept as a record; see README.md. -->

**Last updated:** 2026-08-06T07:08:50.411Z  
**Model:** `gemini-flash-lite-latest, gemini-3.1-flash-lite`  
**Target project:** `miyoovimtupziuehtcxi (DEV)`  
**Target column:** `questions.explanation` (reading only)

## Summary

| | Count |
|---|---|
| tests completed | 24 |
| tests failed | 0 |
| **explanations generated** | **0** |
| skipped — hand-authored, preserved | 31 |
| skipped — written by an earlier run | 276 |
| flagged (not explained) | 3 |

## Tests

| | Test | Questions | Generated | Hand-authored kept | Prior run | Flagged | Last run | Note |
|---|---|---|---|---|---|---|---|---|
| ✅ | Reading Passage 1 - Arctic Warming | 13 | 0 | 0 | 13 | 0 | 2026-08-06 07:08:30 |  |
| ✅ | Reading Passage 1 - Dolls through the ages | 13 | 0 | 0 | 13 | 0 | 2026-08-06 07:08:31 |  |
| ✅ | Reading Passage 1 - Herding | 13 | 0 | 6 | 7 | 0 | 2026-08-06 07:08:32 |  |
| ✅ | Reading Passage 1 - Rubber | 13 | 0 | 0 | 13 | 0 | 2026-08-06 07:08:32 |  |
| ✅ | Reading Passage 1 - Scented Plants | 13 | 0 | 4 | 9 | 0 | 2026-08-06 07:08:33 |  |
| ✅ | Reading Passage 1 - The introduction of gas and electricity to the US | 13 | 0 | 6 | 7 | 0 | 2026-08-06 07:08:33 |  |
| ✅ | Reading Passage 1 - The National Parks of America | 13 | 0 | 0 | 13 | 0 | 2026-08-06 07:08:34 |  |
| ✅ | Reading Passage 1 - The Pyramid of Cestius | 13 | 0 | 0 | 13 | 0 | 2026-08-06 07:08:35 |  |
| ✅ | Reading Passage 2 - Achieving a Work–Life Balance | 13 | 0 | 0 | 13 | 0 | 2026-08-06 07:08:35 |  |
| ✅ | Reading Passage 2 - Creating Meaningful Discussions in the Classroom | 3 | 0 | 0 | 0 | 3 | 2026-08-06 07:08:42 |  |
| ✅ | Reading Passage 2 - Farmers Centenary Celebration | 13 | 0 | 0 | 13 | 0 | 2026-08-06 07:08:42 |  |
| ✅ | Reading Passage 2 - STRESS LESS | 13 | 0 | 0 | 13 | 0 | 2026-08-06 07:08:43 |  |
| ✅ | Reading Passage 2 - Surviving city life | 13 | 0 | 0 | 13 | 0 | 2026-08-06 07:08:43 |  |
| ✅ | Reading Passage 2 - The Importance of Law | 13 | 0 | 0 | 13 | 0 | 2026-08-06 07:08:44 |  |
| ✅ | Reading Passage 2 - The Purpose of Facial Expressions | 13 | 0 | 0 | 13 | 0 | 2026-08-06 07:08:45 |  |
| ✅ | Reading Passage 2 - The Science of “Sleeping on It” | 13 | 0 | 0 | 13 | 0 | 2026-08-06 07:08:45 |  |
| ✅ | Reading Passage 3 - A closer examination of a study on verbal and non-verbal messages | 14 | 0 | 0 | 14 | 0 | 2026-08-06 07:08:46 |  |
| ✅ | Reading Passage 3 - Book Review: False Prophets: The Gurus Who Created Modern Management and Why Their Ideas Are Bad for Business Today by James Hoopes | 14 | 0 | 5 | 9 | 0 | 2026-08-06 07:08:46 |  |
| ✅ | Reading Passage 3 - Inside the Mind of a Fan | 14 | 0 | 0 | 14 | 0 | 2026-08-06 07:08:47 |  |
| ✅ | Reading Passage 3 - New Zealand Short Stories | 14 | 0 | 6 | 8 | 0 | 2026-08-06 07:08:48 |  |
| ✅ | Reading Passage 3 - The ability to communicate using language | 14 | 0 | 0 | 14 | 0 | 2026-08-06 07:08:48 |  |
| ✅ | Reading Passage 3 - The Pirah people of Brazil | 14 | 0 | 0 | 14 | 0 | 2026-08-06 07:08:49 |  |
| ✅ | Reading Passage 3 - The tuatara – past and future | 14 | 0 | 4 | 10 | 0 | 2026-08-06 07:08:49 |  |
| ✅ | Reading Passage 3 - Unlocking the Mystery of Dreams | 14 | 0 | 0 | 14 | 0 | 2026-08-06 07:08:50 |  |

## Artefacts

- `scripts/explain/generated_log.miyoovimtupziuehtcxi.jsonl` — every explanation produced (test, question, output)
- `scripts/explain/flagged.miyoovimtupziuehtcxi.jsonl` — every question flagged instead of explained

## Resuming

```bash
cd platform
node --env-file=.env.explain scripts/explain/generate.mjs           # continue
node --env-file=.env.explain scripts/explain/generate.mjs --status  # report only
```

Completed tests are skipped. Questions that already have an explanation are never
overwritten, so a replay is always safe.
