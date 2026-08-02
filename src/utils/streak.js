/**
 * Practice-streak helpers.
 *
 * Extracted from DashboardPage so the dashboard and analytics report the same
 * number. Two copies of a streak rule drift the moment one of them is fixed,
 * and a user seeing "5 days" on one page and "4 days" on another has no way to
 * tell which is lying.
 *
 * These read attempt records that are already loaded — they issue no requests
 * and know nothing about any store.
 */

/** Normalize a date to YYYY-MM-DD in local time (never UTC — a late-evening
 *  attempt must not land on tomorrow). */
export const normalizeDate = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getDateKey = (dateInput) => {
  if (!dateInput) return null;
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return null;
  return normalizeDate(date);
};

/** dateKey -> number of attempts that day. */
export const buildActivityMap = (attempts = []) => {
  const map = new Map();
  attempts.forEach((attempt) => {
    const attemptDate = attempt?.completed_at || attempt?.created_at;
    if (!attemptDate) return;
    const dateKey = getDateKey(attemptDate);
    if (dateKey) map.set(dateKey, (map.get(dateKey) || 0) + 1);
  });
  return map;
};

/**
 * Consecutive days of activity ending today or yesterday.
 *
 * Yesterday still counts so the streak does not appear broken simply because
 * today's session has not happened yet; two clear days ends it.
 */
export const calcStreak = (activityMap, now = new Date()) => {
  if (!activityMap || activityMap.size === 0) return 0;

  const today = normalizeDate(now);
  const yesterday = normalizeDate(new Date(now.getTime() - 24 * 60 * 60 * 1000));

  const dateKeys = Array.from(activityMap.keys()).sort().reverse();
  if (dateKeys.length === 0) return 0;

  const mostRecentDateKey = dateKeys[0];
  const hasToday = activityMap.has(today);
  const hasYesterday = activityMap.has(yesterday);

  if (!hasToday && !hasYesterday) {
    const mostRecentDate = new Date(mostRecentDateKey + 'T00:00:00');
    const todayDate = new Date(today + 'T00:00:00');
    const daysDiff = Math.floor((todayDate - mostRecentDate) / (1000 * 60 * 60 * 24));
    if (daysDiff > 1) return 0;
  }

  let startDateKey;
  if (hasToday) {
    startDateKey = today;
  } else if (hasYesterday) {
    startDateKey = yesterday;
  } else {
    const mostRecentDate = new Date(mostRecentDateKey + 'T00:00:00');
    const todayDate = new Date(today + 'T00:00:00');
    const daysDiff = Math.floor((todayDate - mostRecentDate) / (1000 * 60 * 60 * 24));
    if (daysDiff <= 1) startDateKey = mostRecentDateKey;
    else return 0;
  }

  let streak = 0;
  const checkDate = new Date(startDateKey + 'T00:00:00');
  while (true) {
    const checkDateKey = normalizeDate(checkDate);
    if (!activityMap.has(checkDateKey)) break;
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }
  return streak;
};
