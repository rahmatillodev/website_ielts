import supabase from "@/lib/supabase";

/**
 * The row query behind both Speaking media libraries (`podcast` and `shadowing`).
 *
 * It lives here rather than in the two pages because of the duration column.
 * `part.video_duration_seconds` ships in
 * supabase/migrations/20260807120000_part_video_duration.sql, and PostgREST
 * rejects an entire select that names a column the database does not have — so
 * asking for it before the migration is applied would empty the library instead
 * of merely losing the badge. Both pages need the same fallback, and having one
 * copy of it means they cannot drift apart.
 *
 * With the column: the stored length is used, exact on first paint.
 * Without it: every row comes back with `video_duration_seconds: null` and the
 * cards measure their videos in the browser, exactly as they did before.
 */

const COLUMNS = (withDuration) => `
  id,
  title,
  image_url,
  created_at,
  is_premium,
  part (
    video_url${withDuration ? ",\n    video_duration_seconds" : ""}
  )
`;

/** PostgREST's SQLSTATE for "column does not exist". */
const UNDEFINED_COLUMN = "42703";

const missingDurationColumn = (error) =>
  error?.code === UNDEFINED_COLUMN && /video_duration_seconds/.test(error?.message ?? "");

/**
 * Remembered per session so a library that has already discovered the column is
 * absent does not spend a failed round trip on every visit.
 */
let durationColumnExists = true;

/**
 * Fetch the active rows of one media library, newest first.
 *
 * @param {"podcast" | "shadowing"} type
 * @returns {Promise<{ data: Array<object>, error: object | null }>}
 */
export async function fetchMediaLibraryRows(type) {
  const run = (withDuration) =>
    supabase
      .from("test")
      .select(COLUMNS(withDuration))
      .eq("type", type)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

  let { data, error } = await run(durationColumnExists);

  if (error && durationColumnExists && missingDurationColumn(error)) {
    durationColumnExists = false;
    ({ data, error } = await run(false));
  }

  return { data: Array.isArray(data) ? data : [], error: error ?? null };
}

/**
 * Shared mapping of a `test` row + its nested `part[]` onto what the cards read.
 *
 * `test.duration` is deliberately not read: it is the exam time limit in minutes
 * (default 60), which podcast and shadowing rows inherit from whatever was set
 * at creation. The video's own length is `part.video_duration_seconds`, and
 * `useMediaDurations` measures it from the source wherever that is still empty.
 */
export function mapMediaLibraryRow(item, formatDate) {
  const parts = Array.isArray(item.part) ? item.part : item.part ? [item.part] : [];
  const part0 = parts[0];

  return {
    id: item.id,
    title: item.title ?? "Untitled",
    image: item.image_url?.trim?.() || "",
    videoUrl: part0?.video_url?.trim?.() || "",
    durationSeconds: part0?.video_duration_seconds ?? null,
    date: formatDate(item.created_at),
    isPremium: item.is_premium,
  };
}
