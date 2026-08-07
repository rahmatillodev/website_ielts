-- Store the real length of a podcast / shadowing video.
--
-- The Speaking library cards show a duration badge on the thumbnail. There was
-- no column holding a media length, so the badge had nothing correct to read:
-- `test.duration` is the exam time limit in minutes (INTEGER, default 60) and
-- podcast/shadowing rows inherit whatever limit was set at creation, which is
-- why a 40-minute recording could be captioned "20 min".
--
-- This adds the missing field next to the URL it describes. The client prefers
-- it and falls back to measuring the video in the browser when it is NULL
-- (src/utils/mediaDuration.js), so the column can be filled in gradually and a
-- row that has never been touched still shows the right number.
--
-- Contract for anything that writes `part` (the admin create/edit app,
-- scripts/media/backfillVideoDurations.mjs, hand-edited rows):
--
--   * set `video_duration_seconds` whenever `video_url` is set or changed;
--   * it is the length of THAT video in seconds — not minutes, not the exam
--     time limit, not a rounded estimate;
--   * leave it NULL rather than guessing. NULL means "not measured yet" and the
--     client measures it; a wrong number would be shown as fact.
--
-- Idempotent: safe to re-run.

alter table public.part
  add column if not exists video_duration_seconds integer;

comment on column public.part.video_duration_seconds is
  'Real length of part.video_url in SECONDS. NULL = not measured yet (the client measures it from the source). Not related to test.duration, which is the exam time limit in minutes.';

-- A duration is positive. This rejects the two mistakes that would otherwise be
-- stored silently: 0 from an empty form field, and a negative from a bad parse.
-- Minutes-instead-of-seconds cannot be caught here (30 is a valid 30s clip), so
-- it is only guarded by the comment above and by the backfill script.
alter table public.part
  drop constraint if exists part_video_duration_seconds_positive;

alter table public.part
  add constraint part_video_duration_seconds_positive
  check (video_duration_seconds is null or video_duration_seconds > 0)
  not valid;

-- `not valid` above skips the scan of existing rows; validate separately so the
-- add itself does not take a long lock on a large table.
alter table public.part
  validate constraint part_video_duration_seconds_positive;


-- ---------------------------------------------------------------------------
-- Reporting: which library rows still need a measurement
-- ---------------------------------------------------------------------------

do $$
declare
  v_missing integer;
begin
  select count(*)
    into v_missing
    from public.part p
    join public.test t on t.id = p.test_id
   where t.type in ('podcast', 'shadowing')
     and coalesce(p.video_url, '') <> ''
     and p.video_duration_seconds is null;

  if v_missing > 0 then
    raise notice
      'podcast/shadowing parts with a video but no stored duration: % - run scripts/media/backfillVideoDurations.mjs to fill them in',
      v_missing;
  end if;
end;
$$;
