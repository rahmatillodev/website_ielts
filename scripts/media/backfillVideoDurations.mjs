// Fill in `part.video_duration_seconds` for podcast / shadowing rows.
//
// The Speaking cards prefer the stored length and measure the video in the
// browser when it is NULL, so nothing is broken without this script - it just
// makes the badge exact on first paint and removes a range request per card.
//
// Run it after adding or re-pointing a video. The admin create/edit app lives in
// a different codebase; until it writes the column itself, this is what keeps
// the data correct.
//
// Secrets come from the process environment only. Put SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY in an untracked env file - `.env.scripts` below -
// and choose the target project by editing that file:
//
//   node --env-file=.env.scripts scripts/media/backfillVideoDurations.mjs
//   node --env-file=.env.scripts scripts/media/backfillVideoDurations.mjs --dry-run
//   node --env-file=.env.scripts scripts/media/backfillVideoDurations.mjs --recheck
//
//   --dry-run   measure and report, write nothing
//   --recheck   also re-measure rows that already have a value, and report any
//               that disagree with the file (a video swapped without the
//               duration being updated). Only writes with --fix-mismatched.
//   --fix-mismatched  with --recheck, overwrite stored values that disagree
//
// YOUTUBE_API_KEY is optional. With it, YouTube rows resolve in one batched
// request; without it each one is read from its watch page instead, so the
// backfill works with no credentials beyond the Supabase service role key.

import { createClient } from '@supabase/supabase-js';
import {
  fetchYoutubeDurations,
  probeDirectDuration,
  youtubeVideoId,
  youtubeWatchDuration,
} from './probeDuration.mjs';

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has('--dry-run');
const RECHECK = args.has('--recheck');
const FIX_MISMATCHED = args.has('--fix-mismatched');

/** A stored value more than this far from the measured one is a real mismatch. */
const TOLERANCE_SECONDS = 2;

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. Run with: node --env-file=.env.scripts scripts/media/backfillVideoDurations.mjs`
    );
  }
  return value;
}

function projectLabel(url) {
  const ref = url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1] ?? 'unknown';
  const KNOWN = { miyoovimtupziuehtcxi: 'DEV', oqzluzzctiirxxhxsboc: 'PROD' };
  return `${ref} (${KNOWN[ref] ?? 'UNKNOWN'})`;
}

const clock = (seconds) => {
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

async function main() {
  const url = requireEnv('SUPABASE_URL');
  const db = createClient(url, requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  });

  console.log(`project: ${projectLabel(url)}`);
  console.log(`mode:    ${DRY_RUN ? 'dry run' : 'write'}${RECHECK ? ' + recheck' : ''}\n`);

  const { data, error } = await db
    .from('part')
    .select('id, video_url, video_duration_seconds, test:test_id (id, title, type)')
    .not('video_url', 'is', null);
  if (error) throw new Error(`could not read part: ${error.message}`);

  const rows = (data ?? [])
    .filter((row) => ['podcast', 'shadowing'].includes(row.test?.type))
    .filter((row) => row.video_url?.trim())
    .filter((row) => RECHECK || row.video_duration_seconds == null);

  if (rows.length === 0) {
    console.log('Nothing to do - every podcast/shadowing video already has a stored duration.');
    return;
  }

  console.log(`${rows.length} row(s) to measure\n`);

  // YouTube rows resolve in one batched call rather than one per row.
  const youtubeRows = rows.filter((row) => youtubeVideoId(row.video_url));
  const youtubeKey = process.env.YOUTUBE_API_KEY;
  let youtubeDurations = new Map();
  if (youtubeRows.length > 0 && youtubeKey) {
    youtubeDurations = await fetchYoutubeDurations(
      youtubeRows.map((row) => youtubeVideoId(row.video_url)),
      youtubeKey
    );
  }

  const measured = [];
  const skipped = [];
  const mismatched = [];

  for (const row of rows) {
    const label = `${row.test.type.padEnd(9)} ${(row.test.title ?? row.test.id).slice(0, 44).padEnd(44)}`;
    const ytId = youtubeVideoId(row.video_url);

    let seconds = null;
    let reason = '';
    if (ytId) {
      seconds = youtubeDurations.get(ytId) ?? null;
      // No key, or a key that did not cover this id: the watch page still has
      // the length. This is the path that actually runs today, since these rows
      // are YouTube-hosted and no YOUTUBE_API_KEY is configured.
      if (!seconds) seconds = await youtubeWatchDuration(ytId);
      if (!seconds) reason = 'YouTube video is private, deleted, or has no length';
    } else {
      const result = await probeDirectDuration(row.video_url);
      seconds = result.seconds;
      reason = result.reason ?? '';
    }

    if (!seconds) {
      skipped.push({ row, reason });
      console.log(`  skip  ${label} ${reason}`);
      continue;
    }

    const rounded = Math.round(seconds);
    const stored = row.video_duration_seconds;

    if (stored != null && Math.abs(stored - rounded) > TOLERANCE_SECONDS) {
      mismatched.push({ row, rounded, stored });
      console.log(`  DIFF  ${label} stored ${clock(stored)} vs actual ${clock(rounded)}`);
      if (!FIX_MISMATCHED) continue;
    } else if (stored != null) {
      console.log(`  ok    ${label} ${clock(stored)}`);
      continue;
    } else {
      console.log(`  set   ${label} ${clock(rounded)}`);
    }

    measured.push({ id: row.id, seconds: rounded });
  }

  if (!DRY_RUN && measured.length > 0) {
    // One statement per row: `part` has columns this script must not touch, so
    // an upsert of a partial row is not safe here.
    for (const { id, seconds } of measured) {
      const { error: writeError } = await db
        .from('part')
        .update({ video_duration_seconds: seconds })
        .eq('id', id);
      if (writeError) throw new Error(`could not write part ${id}: ${writeError.message}`);
    }
  }

  console.log('');
  console.log(`measured: ${measured.length}${DRY_RUN ? ' (not written - dry run)' : ' written'}`);
  console.log(`skipped:  ${skipped.length}`);
  if (mismatched.length > 0) {
    console.log(
      `MISMATCH: ${mismatched.length} row(s) hold a duration that is not the video's` +
        (FIX_MISMATCHED ? ' (overwritten)' : ' - re-run with --fix-mismatched to correct them')
    );
  }
  if (skipped.length > 0) {
    console.log('\nSkipped rows keep NULL, so the cards measure those videos in the browser instead.');
  }
}

main().catch((error) => {
  console.error(`\n${error.message}`);
  process.exitCode = 1;
});
