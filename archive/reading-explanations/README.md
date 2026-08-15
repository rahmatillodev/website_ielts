# Archived explanation records

These files are a **read-only record** of the reading explanations that were generated
before the automated explanation pipeline was removed. They are kept as a local backup of
content that also lives in `questions.explanation` in Supabase — nothing in the app reads
them, and nothing regenerates them.

| File | What it holds |
|---|---|
| `generated_log.<ref>.jsonl` | every explanation produced — test id, question number, type, answer, the explanation text |
| `flagged.<ref>.jsonl` | questions that were flagged instead of explained, with the reason |
| `flagged_before_retry.jsonl` | the flag list from before the final retry pass |
| `EXPLAIN_PROGRESS.<ref>.md` | the per-test coverage report as it stood at the last run |

`<ref>` is the Supabase project ref: `miyoovimtupziuehtcxi` is dev, `oqzluzzctiirxxhxsboc`
is prod.

The tooling that wrote these files (`scripts/explain/`, `scripts/ingest/`,
`scripts/transcribe/`) was deleted when Gemini was removed from the project; it can be
recovered from git history if it is ever needed. The `model` field inside these records
names the model that produced each explanation and is historical metadata only — the
project no longer calls any model API.

**Do not edit these files, and do not use them to overwrite live content.** The database is
authoritative; this is a snapshot.
