# IELTScore — platform (`web_app`)

The student-facing IELTS practice platform. React 19 + Vite + Tailwind 4 +
Radix/shadcn, Supabase for data and auth. Sibling repo: `../admin`
(`web_app_admin`), the staff panel over the **same** Supabase projects.

## Which database am I pointed at

Two Supabase projects, and the labels are not obvious:

| Ref | Role |
| --- | --- |
| `miyoovimtupziuehtcxi` | **DEV** |
| `oqzluzzctiirxxhxsboc` | **PROD** |

In *this* repo the env files are labelled correctly — `.env.dev` → DEV,
`.env.prod` → PROD. **In `../admin` they are inverted**: its `.env.dev` points at
PROD and its `.env.prod` at DEV. If you move between the two repos, re-read the
URL; do not carry the assumption across.

`npm run dev` is `vite --mode dev`, `npm run build` is `vite --mode prod`. The
mode selects the env file, and therefore the database.

## Commands

```bash
npm install          # node_modules is not in the tree
npm run dev          # Vite, --mode dev  → DEV database
npm test             # node --test — 138 unit tests, ~0.1s, needs NO node_modules
npm run lint         # eslint (requires npm install)
npm run build        # Vite, --mode prod → PROD database
npm run test:e2e     # Playwright
```

`npm test` is pure `node --test` over `src/**/*.test.js` and runs on a clean
checkout in under a second. There is no excuse for skipping it. Today it covers
`src/utils/premiumSubscription.test.js` and `src/lib/answerNormalization.test.js`
— premium/plan expiry and answer normalisation, the two places where a wrong
result silently costs a user money or a band score. Keep new logic of that kind
in plain `.js` modules so it stays testable without a build step.

## Content pipelines write to a real database

`scripts/ingest/`, `scripts/explain/` and `scripts/transcribe/` are run with
`node --env-file=…` and they **write**. Read `INGESTION_GUIDE.md` before running
any of them.

- **`INGESTION_GUIDE.md` is authoritative over `type_db/`.** `type_db/` was
  written from the admin form's point of view and is wrong about the schema in
  ways that would corrupt live content. Where they disagree, the guide wins.
- **There is no `--prod` flag, by design.** Targeting prod is a deliberate edit
  to `.env.ingest` / `.env.explain`. Do not add a convenience flag; the friction
  is the safety mechanism.
- The pipelines validate, then dry-run, then write. A failed validation writes
  nothing. Do not skip the dry run.
- Progress is recorded per target ref — `EXPLAIN_PROGRESS.<ref>.md`,
  `INGEST_PROGRESS.<ref>.md`, `scripts/explain/explain_state.<ref>.json`. These
  are generated; do not hand-edit them. The ref in the filename tells you which
  database that run touched.

Before running any pipeline, **state which project ref you are pointed at and
how you confirmed it.**

## Other documents in the tree

`PLATFORM_UI_SPEC.md`, the `MOCK_TEST_*.md` set (flow, writing, speaking storage,
IndexedDB archive), `full_db.md`, `AUDIT_OPEN_ITEMS.md`, `CONTENT_AUDIT_LOG.md`.
Read the one that covers what you are changing before changing it.

## Migrations

`supabase/migrations/` with `supabase/tests/`. A migration applies to a real
project — same rule as above: say which ref, and why that one.

## Worktrees and parallel agents

**Worktrees isolate files. They do not isolate the database.** That is the whole
constraint here, and it has already cost this codebase's siblings real time:
in `edu/crm`, two worktrees sharing one test database `TRUNCATE`d each other's
fixtures mid-run and produced 24 failures whose cause was not in the code at all.

So:

- **Code changes in a worktree: fine.** Components, pages, pure `.js` modules,
  tests. `npm test` is `node --test` over in-repo files and touches nothing
  shared — it is safe to run in as many worktrees as you like.
- **Content pipelines and migrations: one at a time, ever.**
  `scripts/ingest/`, `scripts/explain/`, `scripts/transcribe/` and anything under
  `supabase/migrations/` write to a real Supabase project. Two worktrees running
  them at once write to the *same* database and the progress files
  (`*_PROGRESS.<ref>.md`, `explain_state.<ref>.json`) overwrite each other, so
  the record of what happened is lost as well.
- **`npm run dev` in two worktrees** shares the DEV database. Fine for reading,
  not for a test that depends on a specific row you just wrote.

Worktrees branch from `origin/main` (`worktree.baseRef: fresh`), so `.env.dev`,
`.env.prod`, `.env.ingest` and `.env.explain` — all gitignored — **do not come
along.** A worktree therefore has no database target at all until you copy them
in. That is a feature: copy in only the env file you actually intend to use, and
leave `.env.prod` behind unless you have a reason for it.
