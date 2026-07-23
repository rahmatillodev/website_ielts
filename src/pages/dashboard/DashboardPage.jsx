import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import { AXIS, SERIES } from '@/lib/chartPalette';
import { normalizeDate, getDateKey, buildActivityMap, calcStreak } from '@/utils/streak';
import { useAuthStore } from '@/store/authStore';
import { useDashboardStore } from '@/store/dashboardStore';
import DashboardShimmer from '@/components/shimmer/DashboardShimmer';
import {
  LuHeadphones,
  LuBookOpen,
  LuPenTool,
  LuMic,
  LuFlame,
  LuChevronLeft,
  LuChevronRight,
  LuTarget,
  LuTrophy,
  LuArrowRight,
} from 'react-icons/lu';

/**
 * The dashboard.
 *
 * Laid out on one 12-column grid so every block snaps to the same rhythm, with
 * spacing on an 8px step (gap-4 / p-4 / p-6). Cards share a single surface
 * recipe — white, hairline border, one very soft shadow — and a single hover
 * recipe: border and halo turn brand red, nothing moves. That is deliberately
 * the same treatment the library cards use, so the two screens read as one
 * product.
 *
 * The decorative rotating blobs, page gradient and per-card scale/lift that the
 * previous version carried are gone. They were what made the page feel busy and
 * unbalanced, and they were the only thing several cards had in common.
 *
 * Nothing about the data changed. Every figure comes from the same
 * dashboardStore fields as before, and the streak algorithm is carried over
 * verbatim — it just moved out of the calendar so the stat card, the streak card
 * and the calendar can all read one value.
 */

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const SKILLS = [
  { key: 'reading', label: 'Reading', icon: LuBookOpen, path: '/reading' },
  { key: 'listening', label: 'Listening', icon: LuHeadphones, path: '/listening' },
  { key: 'writing', label: 'Writing', icon: LuPenTool, path: '/writing' },
  { key: 'speaking', label: 'Speaking', icon: LuMic, path: '/speaking' },
];

/* One surface, one hover. Every card on the page uses these two strings. */
const CARD =
  'rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04)]';
const CARD_HOVER =
  'transition-[border-color,box-shadow] duration-200 hover:border-brand-300 hover:shadow-[0_0_0_3px_var(--primary-subtle),0_1px_2px_rgba(16,24,40,0.04)]';

const LABEL = 'text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500';
const CARD_TITLE = 'text-sm font-semibold tracking-tight text-gray-900';
/* Hero figures share one treatment: tight tracking, tabular so digits do not
   jitter between renders, and a flat baseline via leading-none. */
const HERO = 'font-semibold tracking-tight tabular-nums text-gray-900';
/* Icon chip. Brand-tinted, small, and the only place a stat tile carries hue —
   the numbers themselves stay in ink, never the series colour. */
const CHIP = 'flex shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600';

/* ------------------------------------------------------------------ helpers */


const relativeTime = (dateInput) => {
  if (!dateInput) return '';
  const then = new Date(dateInput);
  if (isNaN(then.getTime())) return '';
  const diffMs = Date.now() - then.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  if (diffHours > 0) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  if (diffMinutes > 0) return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  return 'Just now';
};

const useUserAttempts = () => {
  const authUser = useAuthStore((state) => state.authUser);
  const attempts = useDashboardStore((state) => state.attempts);
  const scores = useDashboardStore((state) => state.scores);
  const loading = useDashboardStore((state) => state.loading);
  const fetchDashboardData = useDashboardStore((state) => state.fetchDashboardData);

  useEffect(() => {
    if (authUser?.id) {
      fetchDashboardData(authUser.id, false); // use cache if valid
    }
  }, [authUser?.id, fetchDashboardData]);

  return { attempts, loading, scores };
};

/* -------------------------------------------------------------- small parts */

const WeeklyTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const day = payload[0].payload;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-[11px] font-medium text-gray-500">{day.label}</p>
      <p className="text-[13px] font-semibold tabular-nums text-gray-900">
        {day.count} test{day.count !== 1 ? 's' : ''}
      </p>
    </div>
  );
};

const StatCard = ({ label, value, meta, icon: Icon }) => (
  <div className={`${CARD} ${CARD_HOVER} col-span-12 sm:col-span-6 xl:col-span-3 flex min-w-0 flex-col p-5`}>
    <div className="flex items-center gap-2.5">
      <span className={`${CHIP} size-8`}>
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <p className={`${LABEL} truncate`}>{label}</p>
    </div>
    <p className={`${HERO} mt-4 truncate text-[28px] leading-none`}>{value}</p>
    {meta && <p className="mt-2 truncate text-xs text-gray-500">{meta}</p>}
  </div>
);

/**
 * A band meter. The track is notched into the nine IELTS bands, so the scale is
 * legible from the mark itself instead of needing an axis or a caption, while
 * the fill underneath stays continuous and can land on a half band.
 *
 * The notches are surface-coloured, drawn over the whole track rather than only
 * the filled part — so the nine bands stay countable ahead of the fill, not just
 * behind it.
 */
const SkillRow = ({ skill, band, muted, note }) => {
  const pct = muted || band == null ? 0 : Math.max(0, Math.min(100, (band / 9) * 100));
  return (
    <div className="group/skill flex min-w-0 items-center gap-3">
      <span className={`${CHIP} size-9 transition-colors group-hover/skill:bg-brand-100`}>
        <skill.icon className="text-[16px]" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[13px] font-medium text-gray-900">{skill.label}</span>
          <span className={`shrink-0 text-[15px] font-semibold tabular-nums tracking-tight ${muted ? 'text-gray-300' : 'text-gray-900'}`}>
            {note}
          </span>
        </div>
        <div
          className="relative mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100"
          role="progressbar"
          aria-label={`${skill.label} band`}
          aria-valuenow={muted || band == null ? undefined : band}
          aria-valuemin={0}
          aria-valuemax={9}
        >
          <div
            className={`h-full rounded-full transition-[width] duration-700 ease-out ${muted ? 'bg-gray-200' : 'bg-brand-600'}`}
            style={{ width: `${pct}%` }}
          />
          <div className="pointer-events-none absolute inset-0 flex" aria-hidden="true">
            {Array.from({ length: 9 }).map((_, i) => (
              <span key={i} className="flex-1 border-r-2 border-card last:border-r-0" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * A ring cut into one arc per required test rather than a single sweep. At a
 * target of three, a continuous arc at 33% reads as an abstract percentage,
 * whereas one filled segment of three reads as "one done, two to go" — the
 * quantity the card is actually about. Segments count, so no percentage label.
 */
const SegmentedRing = ({ value, total, size = 76, strokeWidth = 7 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  // Round caps extend each arc by half the stroke at both ends, so the drawn gap
  // has to exceed strokeWidth for any gap to survive visually.
  const gap = strokeWidth * 2;
  const segment = circumference / total - gap;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg className="-rotate-90" width={size} height={size} aria-hidden="true">
        {Array.from({ length: total }).map((_, i) => (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className={`transition-[stroke] duration-500 ${i < value ? 'stroke-brand-600' : 'stroke-gray-100'}`}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${segment} ${circumference - segment}`}
            strokeDashoffset={-((i * circumference) / total)}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`${HERO} text-xl leading-none`}>{value}</span>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ calendar */

const SimpleCalendar = ({ activityMap }) => {
  const now = new Date();
  const userProfile = useAuthStore((state) => state.userProfile);
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());

  const enrollmentDate = useMemo(() => {
    if (userProfile?.joined_at) {
      const date = new Date(userProfile.joined_at);
      return { month: date.getMonth(), year: date.getFullYear() };
    }
    if (userProfile?.created_at) {
      const date = new Date(userProfile.created_at);
      return { month: date.getMonth(), year: date.getFullYear() };
    }
    return { month: now.getMonth(), year: now.getFullYear() };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile]);

  const minMonth = enrollmentDate.month;
  const minYear = enrollmentDate.year;
  const maxMonth = now.getMonth();
  const maxYear = now.getFullYear();

  const canGoPrevious = !(currentMonth === minMonth && currentYear === minYear);
  const canGoNext = !(currentMonth === maxMonth && currentYear === maxYear);

  useEffect(() => {
    const currentDate = new Date(currentYear, currentMonth);
    const minDate = new Date(minYear, minMonth);
    const maxDate = new Date(maxYear, maxMonth);

    if (currentDate < minDate) {
      setCurrentMonth(minMonth);
      setCurrentYear(minYear);
    } else if (currentDate > maxDate) {
      setCurrentMonth(maxMonth);
      setCurrentYear(maxYear);
    }
  }, [userProfile, minMonth, minYear, maxMonth, maxYear, currentMonth, currentYear]);

  const handlePreviousMonth = () => {
    if (!canGoPrevious) return;
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (!canGoNext) return;
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const calendarCells = useMemo(() => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const leadingBlanks = new Date(currentYear, currentMonth, 1).getDay();
    // 6 rows would leave a permanently empty trailing row most months; size the
    // grid to the content instead, which is what keeps the card compact.
    const isCurrentMonth = currentMonth === now.getMonth() && currentYear === now.getFullYear();
    const today = now.getDate();

    const leading = Array.from({ length: leadingBlanks }, (_, i) => ({ key: `b-${i}`, blank: true }));
    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const dayNum = i + 1;
      const dateKey = normalizeDate(new Date(currentYear, currentMonth, dayNum));
      const count = activityMap.get(dateKey) || 0;
      return {
        key: `d-${i}`,
        num: dayNum,
        isToday: isCurrentMonth && dayNum === today,
        count,
        hasActivity: count > 0,
        activityLevel: count === 0 ? 'none' : count <= 2 ? 'light' : 'medium',
      };
    });
    return [...leading, ...days];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth, currentYear, activityMap]);

  const navBtn =
    'inline-flex size-7 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:pointer-events-none disabled:opacity-30';

  return (
    <div className={`${CARD} ${CARD_HOVER} col-span-12 lg:col-span-4 flex min-w-0 flex-col p-5`}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <p className={CARD_TITLE}>
          {MONTH_NAMES[currentMonth]} {currentYear}
        </p>
        <div className="flex shrink-0 items-center gap-0.5">
          <button type="button" onClick={handlePreviousMonth} disabled={!canGoPrevious} className={navBtn} aria-label="Previous month">
            <LuChevronLeft className="size-3.5" />
          </button>
          <button type="button" onClick={handleNextMonth} disabled={!canGoNext} className={navBtn} aria-label="Next month">
            <LuChevronRight className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Two activity levels on one hue, so density reads as depth of colour
          rather than as four different categories. */}
      <div className="grid grid-cols-7 gap-0.5">
        {DAY_NAMES.map((d) => (
          <div key={d} className="pb-1.5 text-center text-[10px] font-medium uppercase tracking-wide text-gray-300">
            {d.slice(0, 1)}
          </div>
        ))}
        {calendarCells.map((c) =>
          c.blank ? (
            <div key={c.key} className="aspect-square min-w-0" />
          ) : (
            <div
              key={`${currentMonth}-${currentYear}-${c.key}`}
              className={`group relative flex aspect-square min-w-0 items-center justify-center rounded-lg text-[11px] tabular-nums transition-colors ${
                c.isToday
                  ? 'bg-brand-600 font-semibold text-white'
                  : c.hasActivity
                    ? c.activityLevel === 'light'
                      ? 'bg-brand-50 font-medium text-brand-700'
                      : 'bg-brand-100 font-medium text-brand-700'
                    : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {c.num}
              {c.hasActivity && (
                <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-[10px] font-medium text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  {c.count} test{c.count !== 1 ? 's' : ''} completed
                </span>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
};

/* ----------------------------------------------------------------- the page */

const DashboardPage = () => {
  const userProfile = useAuthStore((state) => state.userProfile);
  const authUser = useAuthStore((state) => state.authUser);
  const displayName = userProfile?.full_name || authUser?.email?.split('@')[0] || 'User';
  const firstName = displayName.split(' ')[0] || displayName;

  const { attempts, scores, loading } = useUserAttempts();

  const activityMap = useMemo(() => buildActivityMap(attempts), [attempts]);
  const streakDays = useMemo(() => calcStreak(activityMap, new Date()), [activityMap]);

  const testsCompleted = attempts.length;

  const studyTimeDisplay = useMemo(() => {
    const seconds = attempts.reduce((s, r) => s + (Number(r.time_taken) || 0), 0);
    if (!seconds) return '0m';
    const totalMinutes = Math.round(seconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  }, [attempts]);

  const lastSessionTime = useMemo(() => {
    if (attempts.length === 0) return 'No sessions yet';
    return relativeTime(attempts[0].completed_at || attempts[0].created_at);
  }, [attempts]);

  const totalQuestionsAnswered = useMemo(
    () => attempts.reduce((sum, a) => sum + (Number(a.total_questions) || 0), 0),
    [attempts]
  );

  const todayTestsCount = useMemo(() => {
    const today = normalizeDate(new Date());
    return attempts.filter((a) => getDateKey(a.completed_at || a.created_at) === today).length;
  }, [attempts]);

  const dailyTarget = 3;

  // Last 7 days including today.
  const weeklyActivity = useMemo(() => {
    const base = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() - (6 - i));
      const key = normalizeDate(d);
      return {
        key,
        label: DAY_NAMES[d.getDay()],
        count: activityMap.get(key) || 0,
        isToday: i === 6,
      };
    });
  }, [activityMap]);

  const weeklyTotal = weeklyActivity.reduce((s, d) => s + d.count, 0);

  // Most recent attempt per skill, used for both recommendations and the
  // Continue Practice target.
  const lastPracticed = useMemo(() => {
    const map = {};
    attempts.forEach((a) => {
      if (!a.testType) return;
      const when = a.completed_at || a.created_at;
      if (!when) return;
      if (!map[a.testType] || new Date(when) > new Date(map[a.testType])) {
        map[a.testType] = when;
      }
    });
    return map;
  }, [attempts]);

  // Never-practised skills first, then whichever was practised longest ago.
  const recommendations = useMemo(
    () =>
      [...SKILLS]
        .sort((a, b) => {
          const aDate = lastPracticed[a.key] ? new Date(lastPracticed[a.key]).getTime() : -1;
          const bDate = lastPracticed[b.key] ? new Date(lastPracticed[b.key]).getTime() : -1;
          return aDate - bDate;
        })
        .slice(0, 3),
    [lastPracticed]
  );

  // Two, so the card sits at the same natural height as Recommended Practice
  // beside it and neither has to stretch to meet the other.
  const recentActivity = useMemo(() => attempts.slice(0, 2), [attempts]);

  // Bands come from the store exactly as the previous version read them:
  // listening and reading are computed there, writing has no entry (so it shows
  // 0.0, as before) and speaking is not scored yet.
  const skillBands = {
    reading: { band: scores.reading, note: scores.reading ? scores.reading.toFixed(1) : '0.0' },
    listening: { band: scores.listening, note: scores.listening ? scores.listening.toFixed(1) : '0.0' },
    writing: { band: scores.writing ?? null, note: scores.writing ? scores.writing.toFixed(1) : '0.0' },
    speaking: { band: null, note: 'Coming soon', muted: true },
  };

  const shouldShowShimmer = loading && attempts.length === 0;
  if (shouldShowShimmer) return <DashboardShimmer />;

  return (
    <div className="min-h-full bg-gray-50 p-4 sm:p-6">
      {/* 1 — compact header */}
      <header className="mb-6 min-w-0">
        <h1 className="truncate text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl">
          Welcome back, {firstName}
        </h1>
        <p className="mt-0.5 text-[13px] text-gray-500">
          {testsCompleted > 0
            ? `${testsCompleted} test${testsCompleted !== 1 ? 's' : ''} completed · last session ${lastSessionTime}`
            : "Let's get your first practice test done."}
        </p>
      </header>

      <div className="grid grid-cols-12 gap-4">
        {/* 2 — four compact statistics */}
        <StatCard
          label="Overall Band"
          value={scores.average ? scores.average.toFixed(1) : '0.0'}
          meta="Average of latest scores"
          icon={LuTrophy}
        />
        <StatCard
          label="Tests Completed"
          value={testsCompleted}
          meta={`${totalQuestionsAnswered} questions answered`}
          icon={LuBookOpen}
        />
        <StatCard
          label="Study Time"
          value={studyTimeDisplay}
          meta={`Last session ${lastSessionTime}`}
          icon={LuTarget}
        />
        <StatCard
          label="Study Streak"
          value={`${streakDays} day${streakDays !== 1 ? 's' : ''}`}
          meta={streakDays > 0 ? 'Keep it going' : 'Practice today to start'}
          icon={LuFlame}
        />

        {/* 3 — skill progress */}
        <section className={`${CARD} ${CARD_HOVER} col-span-12 flex min-w-0 flex-col p-6 lg:col-span-8`}>
          <div className="mb-5 flex items-center justify-between gap-2">
            <h2 className={CARD_TITLE}>Skill Progress</h2>
            <span className="text-[11px] text-gray-400">Band scale 0–9</span>
          </div>
          <div className="flex flex-col gap-4">
            {SKILLS.map((skill) => (
              <SkillRow
                key={skill.key}
                skill={skill}
                band={skillBands[skill.key].band}
                note={skillBands[skill.key].note}
                muted={skillBands[skill.key].muted}
              />
            ))}
          </div>
        </section>

        {/* 5 + 6 — daily target and streak, stacked beside skill progress */}
        <div className="col-span-12 flex min-w-0 flex-col gap-4 lg:col-span-4">
          <div className={`${CARD} ${CARD_HOVER} group/target flex min-w-0 flex-1 items-center gap-5 p-5`}>
            <SegmentedRing value={Math.min(todayTestsCount, dailyTarget)} total={dailyTarget} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {todayTestsCount >= dailyTarget ? (
                  <LuTrophy className="size-4 shrink-0 text-brand-600" aria-hidden="true" />
                ) : (
                  <LuTarget className="size-4 shrink-0 text-gray-400" aria-hidden="true" />
                )}
                <p className={`${LABEL} truncate`}>Daily Target</p>
              </div>
              <p className="mt-2 truncate text-[13px] text-gray-500">
                {todayTestsCount >= dailyTarget ? 'Target reached' : `of ${dailyTarget} today`}
              </p>
            </div>
          </div>

          <div className={`${CARD} ${CARD_HOVER} group/streak flex min-w-0 flex-1 items-center gap-5 p-5`}>
            {/* The ring echoes the target card's geometry so the two stack as a
                matched pair rather than two unrelated widgets. */}
            <span
              className={`relative flex size-[76px] shrink-0 items-center justify-center rounded-full transition-colors duration-300 ${
                streakDays > 0 ? 'bg-brand-50 group-hover/streak:bg-brand-100' : 'bg-gray-50'
              }`}
            >
              <LuFlame
                className={`size-7 transition-colors ${streakDays > 0 ? 'text-brand-600' : 'text-gray-300'}`}
                aria-hidden="true"
              />
            </span>
            <div className="min-w-0">
              <p className={`${LABEL} truncate`}>Study Streak</p>
              <p className={`${HERO} mt-2 text-2xl leading-none`}>{streakDays}</p>
              <p className="mt-1.5 truncate text-[13px] text-gray-500">
                {streakDays === 1 ? 'day in a row' : 'days in a row'}
              </p>
            </div>
          </div>
        </div>

        {/* 4 — weekly activity */}
        <section className={`${CARD} ${CARD_HOVER} col-span-12 flex min-w-0 flex-col p-6 lg:col-span-8`}>
          <div className="mb-5 flex items-center justify-between gap-2">
            <h2 className={CARD_TITLE}>Weekly Activity</h2>
            <span className="text-[11px] text-gray-400">
              {weeklyTotal} test{weeklyTotal !== 1 ? 's' : ''} this week
            </span>
          </div>
          {/* One series, so one hue and no legend — the card title names it.
              A flat week of zeros is a real line but an unreadable one, so zero
              activity gets a stated empty state instead of a line pinned to the
              floor.

              Colour comes from the shared chartPalette rather than a literal hex:
              --chart-1 is #E30613 in light mode and re-steps to #ff6457 for the
              dark canvas, so the token stays on brand in both. */}
          {weeklyTotal === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-gray-200">
              <p className="text-[13px] font-medium text-gray-900">No activity this week</p>
              <p className="mt-1 text-xs text-gray-500">Completed tests will appear here.</p>
            </div>
          ) : (
            <div className="h-32 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyActivity} margin={{ top: 18, right: 12, left: 12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="weeklyAreaFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={SERIES[0]} stopOpacity={0.18} />
                      <stop offset="100%" stopColor={SERIES[0]} stopOpacity={0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={AXIS.grid} />

                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    fontSize={11}
                    tick={{ fill: AXIS.tick }}
                    tickFormatter={(v) => v.slice(0, 2)}
                  />
                  {/* Hidden, so the grid has a scale to sit on without the axis
                      itself adding furniture. The floor is pinned at 0 — letting
                      recharts pick it would rescale a quiet week to look busy —
                      and the ceiling never drops below 1, so a single-test week
                      cannot collapse the domain to zero height. */}
                  <YAxis hide domain={[0, (dataMax) => Math.max(1, dataMax)]} allowDecimals={false} />

                  <Tooltip
                    content={<WeeklyTooltip />}
                    cursor={{ stroke: AXIS.grid, strokeWidth: 1 }}
                  />

                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke={SERIES[0]}
                    strokeWidth={3}
                    fill="url(#weeklyAreaFill)"
                    dot={{ r: 3, fill: SERIES[0], stroke: 'var(--card)', strokeWidth: 2 }}
                    activeDot={{ r: 5, fill: SERIES[0], stroke: 'var(--card)', strokeWidth: 2 }}
                  >
                    <LabelList
                      dataKey="count"
                      position="top"
                      offset={10}
                      fontSize={11}
                      fill={AXIS.tick}
                    />
                  </Area>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* 9 — calendar, no longer the largest thing on the page */}
        <SimpleCalendar activityMap={activityMap} />

        {/* 7 — recommended practice */}
        <section className={`${CARD} ${CARD_HOVER} col-span-12 flex min-w-0 flex-col p-6 lg:col-span-7`}>
          <h2 className={`${CARD_TITLE} mb-4`}>Recommended Practice</h2>
          {/* Each recommendation is its own target, so each gets its own hit area
              and its own affordance rather than being a row in a list. */}
          <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
            {recommendations.map((skill) => (
              <Link
                key={skill.key}
                to={skill.path}
                className="group/rec flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-[border-color,box-shadow] duration-200 hover:border-brand-300 hover:shadow-[0_0_0_3px_var(--primary-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
              >
                {/* The arrow rides up beside the chip rather than sitting on its
                    own line — same affordance, one row less height, which is what
                    lets this card match Recent Activity without either stretching. */}
                <div className="flex items-center justify-between gap-2">
                  <span className={`${CHIP} size-8 transition-colors group-hover/rec:bg-brand-100`}>
                    <skill.icon className="text-[15px]" aria-hidden="true" />
                  </span>
                  <LuArrowRight
                    className="size-4 shrink-0 text-gray-300 transition-[color,transform] duration-200 group-hover/rec:translate-x-0.5 group-hover/rec:text-brand-600"
                    aria-hidden="true"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-gray-900">{skill.label}</p>
                  <p className="mt-1 truncate text-xs text-gray-500">
                    {lastPracticed[skill.key]
                      ? relativeTime(lastPracticed[skill.key])
                      : 'Not started'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* 8 — recent activity */}
        <section className={`${CARD} ${CARD_HOVER} col-span-12 flex min-w-0 flex-col p-6 lg:col-span-5`}>
          <h2 className={`${CARD_TITLE} mb-4`}>Recent Activity</h2>
          {recentActivity.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-gray-500">No activity yet.</p>
          ) : (
            /* A rail behind the markers turns five separate rows into one
               sequence, which is what a history actually is. The rail is inset
               to the marker's centre and stops at the first and last marker so
               it never dangles past the ends. */
            <ol className="relative flex flex-col">
              <span
                className="absolute left-4 top-4 bottom-4 w-px bg-gray-100"
                aria-hidden="true"
              />
              {recentActivity.map((a) => {
                const skill = SKILLS.find((s) => s.key === a.testType);
                const Icon = skill?.icon || LuBookOpen;
                return (
                  <li key={a.id} className="group/act relative flex min-w-0 items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <span className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-card text-gray-500 ring-1 ring-gray-200 transition-colors group-hover/act:text-brand-600 group-hover/act:ring-brand-200">
                      <Icon className="text-[13px]" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-gray-900">
                        {a.testTitle || `${skill?.label || 'Practice'} test`}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {relativeTime(a.completed_at || a.created_at)}
                      </p>
                    </div>
                    {a.score != null && (
                      <span className="shrink-0 rounded-md bg-gray-50 px-2 py-1 text-[12px] font-semibold tabular-nums text-gray-900">
                        {Number(a.score).toFixed(1)}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
};

export default DashboardPage;
