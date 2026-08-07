import { format } from "date-fns";

export const formatDateToDayMonth = (dateString) => {
  if (!dateString) return "";
  return format(new Date(dateString), "MMM d HH:mm");
};

/**
 * The date a library item was published, e.g. `Aug 6, 2026`.
 *
 * Postgres hands back an ISO string with its UTC offset, so `new Date` fixes the
 * instant and `format` renders it in the reader's own zone — a podcast added at
 * 23:40 UTC does not read as the previous day in Tashkent.
 *
 * Returns "" for anything the reader should not see, and the cards drop the date
 * row entirely when it is empty:
 *   - a missing or unparseable value (`format` throws on an Invalid Date);
 *   - a timestamp in the future. The library has no scheduled-publishing
 *     concept, so a future date is bad data rather than an upcoming release.
 */
export const formatPublishedDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  if (date.getTime() > Date.now()) return "";
  return format(date, "MMM d, yyyy");
};
