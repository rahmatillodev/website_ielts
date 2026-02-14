import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  LuSparkles,
} from 'react-icons/lu';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Circular Progress Component
const CircularProgress = ({ progress, size = 80, strokeWidth = 8 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#F97316"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg sm:text-xl font-bold text-gray-900">
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
};

// Custom hook to fetch and share user attempts data
const useUserAttempts = () => {
  const authUser = useAuthStore((state) => state.authUser);
  const attempts = useDashboardStore((state) => state.attempts);
  const scores = useDashboardStore((state) => state.scores);
  const loading = useDashboardStore((state) => state.loading);
  const fetchDashboardData = useDashboardStore((state) => state.fetchDashboardData);

  // Trigger fetch only once on mount (with smart caching in store)
  useEffect(() => {
    if (authUser?.id) {
      fetchDashboardData(authUser.id, false); // false = don't force refresh, use cache if valid
    }
  }, [authUser?.id, fetchDashboardData]);

  return { attempts, loading, scores };
};

// Helper function to normalize date to YYYY-MM-DD string (timezone-safe)
const normalizeDate = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper function to get YYYY-MM-DD from a date string or Date object
const getDateKey = (dateInput) => {
  if (!dateInput) return null;
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return null;
  return normalizeDate(date);
};

const SimpleCalendar = ({ userAttempts = [] }) => {
  const now = new Date();
  const userProfile = useAuthStore((state) => state.userProfile);
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());

  // Get enrollment date from user profile (joined_at or created_at)
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
  }, [userProfile]);

  const minMonth = enrollmentDate.month;
  const minYear = enrollmentDate.year;
  const maxMonth = now.getMonth();
  const maxYear = now.getFullYear();

  // Build activity map: dateKey -> count of attempts
  const activityMap = useMemo(() => {
    const map = new Map();
    userAttempts.forEach((attempt) => {
      const attemptDate = attempt.completed_at || attempt.created_at;
      if (!attemptDate) return;
      const dateKey = getDateKey(attemptDate);
      if (dateKey) {
        map.set(dateKey, (map.get(dateKey) || 0) + 1);
      }
    });
    return map;
  }, [userAttempts]);

  // Get activity data for a specific day in the current month view
  // Memoized to prevent recreation on every render
  const getDayActivity = useMemo(() => {
    return (dayNum, month, year) => {
      const date = new Date(year, month, dayNum);
      const dateKey = normalizeDate(date);
      const count = activityMap.get(dateKey) || 0;
      return {
        count,
        hasActivity: count > 0,
        activityLevel: count === 0 ? 'none' : count <= 2 ? 'light' : 'medium',
      };
    };
  }, [activityMap]);

  // Calculate streak (consecutive days with attempts) - enhanced logic
  // Use normalized date strings for stable dependencies
  const todayKey = normalizeDate(now);
  const yesterdayKey = normalizeDate(new Date(now.getTime() - 24 * 60 * 60 * 1000));

  const streakDays = useMemo(() => {
    if (userAttempts.length === 0 || activityMap.size === 0) return 0;

    const today = todayKey;
    const yesterday = yesterdayKey;

    // Get all date keys sorted in descending order
    const dateKeys = Array.from(activityMap.keys()).sort().reverse();

    if (dateKeys.length === 0) return 0;

    // Find the most recent date with activity
    const mostRecentDateKey = dateKeys[0];

    // Check if user has activity today or yesterday
    const hasToday = activityMap.has(today);
    const hasYesterday = activityMap.has(yesterday);

    // If no activity today or yesterday, check days since last activity
    if (!hasToday && !hasYesterday) {
      const mostRecentDate = new Date(mostRecentDateKey + 'T00:00:00');
      const todayDate = new Date(today + 'T00:00:00');
      const daysDiff = Math.floor((todayDate - mostRecentDate) / (1000 * 60 * 60 * 24));

      // If more than 1 day has passed, streak is broken
      if (daysDiff > 1) return 0;
    }

    // Start counting from today if today has activity, otherwise from yesterday
    // If neither has activity but streak should continue, start from most recent
    let startDateKey;
    if (hasToday) {
      startDateKey = today;
    } else if (hasYesterday) {
      startDateKey = yesterday;
    } else {
      // Check if most recent was yesterday (streak continues)
      const mostRecentDate = new Date(mostRecentDateKey + 'T00:00:00');
      const todayDate = new Date(today + 'T00:00:00');
      const daysDiff = Math.floor((todayDate - mostRecentDate) / (1000 * 60 * 60 * 24));
      if (daysDiff <= 1) {
        startDateKey = mostRecentDateKey;
      } else {
        return 0;
      }
    }

    // Count consecutive days backwards
    let streak = 0;
    let checkDate = new Date(startDateKey + 'T00:00:00');

    while (true) {
      const checkDateKey = normalizeDate(checkDate);
      if (!activityMap.has(checkDateKey)) break;

      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    return streak;
  }, [userAttempts, activityMap, todayKey, yesterdayKey]);

  // Check if current view is at minimum month (enrollment month)
  const isAtMinMonth = currentMonth === minMonth && currentYear === minYear;
  // Check if current view is at maximum month (current month)
  const isAtMaxMonth = currentMonth === maxMonth && currentYear === maxYear;

  const canGoPrevious = !isAtMinMonth;
  const canGoNext = !isAtMaxMonth;

  // Ensure calendar stays within bounds
  useEffect(() => {
    const currentDate = new Date(currentYear, currentMonth);
    const minDate = new Date(minYear, minMonth);
    const maxDate = new Date(maxYear, maxMonth);

    // If current view is before enrollment date, clamp to enrollment date
    if (currentDate < minDate) {
      setCurrentMonth(minMonth);
      setCurrentYear(minYear);
    }
    // If current view is after current month, clamp to current month
    else if (currentDate > maxDate) {
      setCurrentMonth(maxMonth);
      setCurrentYear(maxYear);
    }
  }, [userProfile, minMonth, minYear, maxMonth, maxYear, currentMonth, currentYear]);

  const handlePreviousMonth = () => {
    if (canGoPrevious) {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    }
  };

  const handleNextMonth = () => {
    if (canGoNext) {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    }
  };

  // Memoize calendar cell calculations to prevent recalculation on every render
  const calendarCells = useMemo(() => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const leadingBlanks = firstDay;
    const totalCells = 42;
    const trailingBlanks = totalCells - leadingBlanks - daysInMonth;

    // Check if currently viewed month is the current real-time month
    const isCurrentMonth = currentMonth === now.getMonth() && currentYear === now.getFullYear();
    const today = now.getDate();

    const leading = Array.from({ length: leadingBlanks }, (_, i) => ({
      key: `b-${i}`,
      blank: true,
    }));
    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const dayNum = i + 1;
      const activity = getDayActivity(dayNum, currentMonth, currentYear);
      return {
        key: `d-${i}`,
        num: dayNum,
        isToday: isCurrentMonth && dayNum === today,
        ...activity,
      };
    });
    const trailing = Array.from(
      { length: Math.max(0, trailingBlanks) },
      (_, i) => ({ key: `t-${i}`, blank: true })
    );
    return [...leading, ...days, ...trailing];
  }, [currentMonth, currentYear, getDayActivity, now]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-3xl shadow-md border border-gray-200 overflow-hidden px-3 sm:px-4 md:px-5 pt-3 sm:pt-4 pb-4 sm:pb-5 w-full h-full flex flex-col transition-all duration-300 ease-out hover:shadow-lg hover:border-gray-300"
    >
      {/* Month header with navigation */}
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        {canGoPrevious ? (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={handlePreviousMonth}
            className="p-1.5 sm:p-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors duration-200"
            aria-label="Previous month"
          >
            <LuChevronLeft className="size-4 sm:size-5 text-gray-600" />
          </motion.button>
        ) : (
          <div className="w-8 sm:w-10" />
        )}
        <motion.p
          key={`${currentMonth}-${currentYear}`}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          className="text-sm sm:text-base md:text-lg font-bold text-gray-900 leading-snug"
        >
          {MONTH_NAMES[currentMonth]} {currentYear}
        </motion.p>
        {canGoNext ? (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleNextMonth}
            className="p-1.5 sm:p-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors duration-200"
            aria-label="Next month"
          >
            <LuChevronRight className="size-4 sm:size-5 text-gray-600" />
          </motion.button>
        ) : (
          <div className="w-8 sm:w-10" />
        )}
      </div>

      <div className="grid grid-cols-7 gap-0.5 sm:gap-1 md:gap-1.5 flex-1 mb-3 sm:mb-4">
        {DAY_NAMES.map((d) => (
          <div
            key={d}
            className="text-center text-[10px] sm:text-xs font-bold text-gray-500 py-1 sm:py-1.5"
          >
            {d}
          </div>
        ))}
        <AnimatePresence mode="popLayout">
          {calendarCells.map((c, index) =>
            c.blank ? (
              <div key={c.key} className="aspect-square min-w-0" />
            ) : (
              <motion.div
                key={`${currentMonth}-${currentYear}-${c.key}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{
                  duration: 0.3,
                  ease: 'easeOut',
                  delay: index * 0.01,
                }}
                whileHover={c.hasActivity ? { scale: 1.05 } : { scale: 1.02 }}
                className={`aspect-square min-w-0 flex flex-col items-center justify-center text-xs sm:text-sm md:text-base font-semibold rounded-lg relative transition-all duration-200 group ${c.isToday
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md shadow-blue-200'
                    : c.hasActivity
                      ? c.activityLevel === 'light'
                        ? 'bg-[#FFF7ED] text-gray-800 hover:bg-[#FFEDD5]'
                        : 'bg-[#FFEDD5] text-gray-800 hover:bg-[#FED7AA]'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
              >
                <span className="leading-none z-10">{c.num}</span>
                {c.hasActivity && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0, rotate: -180 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    transition={{
                      delay: 0.2 + index * 0.01,
                      duration: 0.4,
                      type: 'spring',
                      stiffness: 200,
                      damping: 10,
                    }}
                    className="absolute -top-0.5 -right-0.5"
                  >
                    <LuFlame className="size-3 sm:size-3.5 md:size-4 text-orange-500 drop-shadow-sm" />
                  </motion.div>
                )}
                {/* Hover tooltip */}
                {c.hasActivity && (
                  <div className="absolute bottom-full left-1/2 z-50 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-[10px] font-medium rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none ">
                    {c.count} test{c.count !== 1 ? 's' : ''} completed
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                  </div>
                )}
              </motion.div>
            )
          )}
        </AnimatePresence>
      </div>
      {/* Streak information at bottom of calendar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="border-t border-gray-100 pt-2 sm:pt-3 pb-1 flex flex-col items-center gap-1 sm:gap-1.5"
      >
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <LuFlame className="size-4 sm:size-5 text-orange-500" />
          </motion.div>
          <p className="text-sm sm:text-base md:text-lg font-bold text-gray-900">
            {streakDays} Day{streakDays !== 1 ? 's' : ''} Streak
          </p>
        </div>
        <p className="text-[10px] sm:text-xs font-medium text-gray-500">
          Keep it up! 🔥
        </p>
      </motion.div>
    </motion.div>
  );
};

const DashboardPage = () => {
  const userProfile = useAuthStore((state) => state.userProfile);
  const authUser = useAuthStore((state) => state.authUser);
  const displayName =
    userProfile?.full_name || authUser?.email?.split('@')[0] || 'User';
  const firstName = displayName.split(' ')[0] || displayName;

  // Use shared hook for attempts data
  const { attempts, scores, loading } = useUserAttempts();

  // Calculate statistics
  const testsCompleted = attempts.length;
  const studyTimeSeconds = attempts.reduce(
    (s, r) => s + (Number(r.time_taken) || 0),
    0
  );
  const studyTimeDisplay = useMemo(() => {
    if (!studyTimeSeconds) return '0m';
    const totalMinutes = Math.round(studyTimeSeconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }, [studyTimeSeconds]);

  // Format last session time
  const lastSessionTime = useMemo(() => {
    if (attempts.length === 0) return 'No sessions yet';
    const lastAttempt = attempts[0];
    const lastDate = new Date(
      lastAttempt.completed_at || lastAttempt.created_at
    );
    const now = new Date();
    const diffMs = now - lastDate;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    }
    if (diffHours > 0) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    }
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
    }
    return 'Just now';
  }, [attempts]);

  // Calculate total questions answered
  const totalQuestionsAnswered = useMemo(() => {
    return attempts.reduce((sum, attempt) => {
      return sum + (Number(attempt.total_questions) || 0);
    }, 0);
  }, [attempts]);

  // Calculate today's test count
  const todayTestsCount = useMemo(() => {
    const today = normalizeDate(new Date());
    return attempts.filter((attempt) => {
      const attemptDate = attempt.completed_at || attempt.created_at;
      if (!attemptDate) return false;
      const dateKey = getDateKey(attemptDate);
      return dateKey === today;
    }).length;
  }, [attempts]);

  const dailyTarget = 3; // Target tests per day
  const dailyProgress = Math.min((todayTestsCount / dailyTarget) * 100, 100);

  // Create scores array with actual data
  const SCORES = useMemo(
    () => [
      {
        label: 'Listening',
        value: scores.listening ? scores.listening.toFixed(1) : '0.0',
        icon: LuHeadphones,
        iconColor: 'text-blue-500',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        isActive: true,
      },
      {
        label: 'Reading',
        value: scores.reading ? scores.reading.toFixed(1) : '0.0',
        icon: LuBookOpen,
        iconColor: 'text-orange-500',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        isActive: true,
      },
      {
        label: 'Writing',
        value: 'Coming Soon',
        icon: LuPenTool,
        iconColor: 'text-gray-400',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        isActive: false,
      },
      {
        label: 'Speaking',
        value: 'Coming Soon',
        icon: LuMic,
        iconColor: 'text-gray-400',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        isActive: false,
      },
    ],
    [scores]
  );

  // Show shimmer ONLY when we have no cached data AND are loading
  // This prevents layout shifts when we have cached data
  const shouldShowShimmer = loading && attempts.length === 0;
  
  if (shouldShowShimmer) {
    return <DashboardShimmer />;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 min-h-full">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-4 sm:mb-6"
      >
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
          Welcome {firstName} 👋
        </h1>
        <p className="text-sm sm:text-base font-medium text-gray-600 mt-1">
          Let&apos;s improve your band score today.
        </p>
      </motion.div>

      {/* Responsive grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2  xl:grid-cols-[4fr_2fr_3fr] gap-4 sm:gap-5 md:gap-6 lg:items-stretch">
        {/* Left Column: My Progress */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="md:col-span-2 lg:col-span-1 h-full flex"
        >
          <div className="bg-white/95 backdrop-blur rounded-2xl sm:rounded-3xl shadow-[0_25px_60px_rgba(15,23,42,0.12)] p-4 sm:p-6 xl:p-8 2xl:p-10 
            max-w-md xl:max-w-lg 2xl:max-w-2xl w-full mx-auto lg:mx-0 hover:shadow-[0_30px_70px_rgba(15,23,42,0.18)] transition-shadow duration-300 border border-white/60"
          >
            <div className="flex items-start justify-between mb-4 sm:mb-6 xl:mb-8">
              <div>
                <h3 className="text-lg sm:text-xl xl:text-2xl 2xl:text-3xl font-semibold text-gray-900">My Progress</h3>
              </div>
              <motion.span 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.6, type: "spring" }}
                className="px-2 sm:px-3 xl:px-4 py-1 xl:py-1.5 text-[10px] sm:text-xs xl:text-sm 2xl:text-base font-semibold rounded-full bg-green-100 text-green-600 whitespace-nowrap"
              >
                Active Session
              </motion.span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6 xl:mb-8">
              {SCORES.map((s, index) => {
                const isDisabled = !s.isActive;
                return (
                <motion.div 
                  key={s.label} 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 + index * 0.1, duration: 0.4 }}
                  whileHover={isDisabled ? undefined : { scale: 1.05 }}
                  className={`rounded-2xl sm:rounded-3xl p-3.5 border shadow-[0_12px_30px_rgba(15,23,42,0.08)] transition-all ${
                    isDisabled
                      ? "bg-gray-50 border-gray-200 opacity-70 cursor-not-allowed"
                      : "bg-linear-to-br from-white via-[#F7FBFF] to-[#ECF4FF] border-white/70 hover:shadow-[0_16px_36px_rgba(15,23,42,0.12)] cursor-pointer"
                  }`}
                >
                  <div className="flex items-center gap-2 sm:gap-2.5 xl:gap-3 mb-2 sm:mb-2.5 xl:mb-3">
                    <span className="w-8 h-8 sm:w-9 sm:h-9 xl:w-10 xl:h-10 2xl:w-12 2xl:h-12 rounded-xl sm:rounded-2xl bg-white/80 shadow-[0_6px_16px_rgba(15,23,42,0.08)] flex items-center justify-center">
                      <s.icon className={`${s.iconColor} text-base sm:text-lg xl:text-xl 2xl:text-2xl`} />
                    </span>
                    <p className="text-[10px] sm:text-xs xl:text-sm 2xl:text-base font-semibold text-gray-500 uppercase tracking-wide">{s.label}</p>
                  </div>
                  <p
                    className={`font-semibold ${
                      isDisabled
                        ? "text-sm sm:text-base xl:text-lg text-gray-400 leading-snug"
                        : "text-xl sm:text-2xl xl:text-3xl 2xl:text-4xl text-gray-900"
                    }`}
                  >
                    {s.value}
                  </p>
                </motion.div>
              )})}
            </div>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="bg-blue-50 rounded-xl sm:rounded-2xl p-4 sm:p-5 xl:p-6 2xl:p-8 flex items-center justify-between"
            >
              <div>
                <p className="text-[10px] sm:text-xs xl:text-sm 2xl:text-base font-semibold text-gray-500 uppercase">
                  Average Score
                </p>
                <p className="text-xl sm:text-2xl xl:text-3xl 2xl:text-4xl font-semibold">
                  {scores.average ? `Band ${scores.average.toFixed(1)}` : '0.0'}
                </p>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Middle Column: Tests Completed + Study Time + Daily Target */}
        <div className="flex flex-col gap-4 sm:gap-5 h-full">
          {/* Tests Completed Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            whileHover={{ scale: 1.02, y: -4 }}
            className="relative overflow-hidden bg-white rounded-3xl shadow-md border border-gray-200 px-4 sm:px-5 md:px-6 py-5 sm:py-6 flex flex-col transition-all duration-300 ease-out hover:shadow-lg hover:border-gray-300"
          >
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="absolute -top-10 -right-10 w-28 h-28 sm:w-32 sm:h-32 rounded-full opacity-60"
              style={{ backgroundColor: '#F5F3FF' }}
            />
            <div className="relative flex flex-col justify-center min-h-[100px] sm:min-h-[120px]">
              <p className="text-xs sm:text-sm font-bold text-gray-500 mb-2 uppercase tracking-wide">
                Tests Completed
              </p>
              <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 leading-tight mb-2">
                {testsCompleted}
              </p>
              <p className="text-[10px] sm:text-xs font-medium text-gray-500">
                Total questions: {totalQuestionsAnswered}
              </p>
            </div>
          </motion.div>

          {/* Study Time Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            whileHover={{ scale: 1.02, y: -4 }}
            className="relative overflow-hidden bg-white rounded-3xl shadow-md border border-gray-200 px-4 sm:px-5 md:px-6 py-5 sm:py-6 flex flex-col transition-all duration-300 ease-out hover:shadow-lg hover:border-gray-300"
          >
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="absolute -top-10 -right-10 w-28 h-28 sm:w-32 sm:h-32 rounded-full opacity-60"
              style={{ backgroundColor: '#FEFCE8' }}
            />
            <div className="relative flex flex-col justify-center min-h-[100px] sm:min-h-[120px]">
              <p className="text-xs sm:text-sm font-bold text-gray-500 mb-2 uppercase tracking-wide">
                Study Time
              </p>
              <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 leading-tight mb-2">
                {studyTimeDisplay}
              </p>
              <p className="text-[10px] sm:text-xs font-medium text-gray-500">
                Last session: {lastSessionTime}
              </p>
            </div>
          </motion.div>

          {/* Daily Target Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            whileHover={{ scale: 1.02, y: -4 }}
            className="relative overflow-hidden bg-white rounded-3xl shadow-md border border-gray-200 px-4 sm:px-5 md:px-6 py-5 sm:py-6 flex flex-col flex-1 transition-all duration-300 ease-out hover:shadow-lg hover:border-gray-300"
          >
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="absolute -top-10 -right-10 w-28 h-28 sm:w-32 sm:h-32 rounded-full opacity-60"
              style={{ backgroundColor: '#FEF3C7' }}
            />
            <div className="relative flex flex-col justify-center items-center flex-1 min-h-[140px] sm:min-h-[160px] overflow-visible">
              <div className="flex items-center gap-2 mb-3 sm:mb-4 z-10">
                {todayTestsCount >= dailyTarget ? (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                      type: 'spring',
                      stiffness: 200,
                      damping: 15,
                      delay: 0.1,
                    }}
                  >
                    <LuTrophy className="size-5 sm:size-6 text-yellow-500" />
                  </motion.div>
                ) : (
                  <LuTarget className="size-5 sm:size-6 text-orange-500" />
                )}
                <p className="text-xs sm:text-sm font-bold text-gray-500 uppercase tracking-wide">
                  Daily Target
                </p>
              </div>
              <div className="relative overflow-visible">
                <CircularProgress progress={dailyProgress} size={100} strokeWidth={10} />
                {/* Celebration sparkles when target is reached */}
                {todayTestsCount >= dailyTarget && (
                  <>
                    {[...Array(8)].map((_, i) => {
                      const angle = (i * 360) / 8;
                      const radius = 70;
                      const x = Math.cos((angle * Math.PI) / 180) * radius;
                      const y = Math.sin((angle * Math.PI) / 180) * radius;
                      return (
                        <motion.div
                          key={i}
                          initial={{ scale: 0, opacity: 0, x: 0, y: 0 }}
                          animate={{
                            scale: [0, 1.2, 1],
                            opacity: [0, 1, 1, 0],
                            x: [0, x, x * 1.2],
                            y: [0, y, y * 1.2],
                          }}
                          transition={{
                            duration: 1.5,
                            delay: 0.2 + i * 0.05,
                            repeat: Infinity,
                            repeatDelay: 2,
                            ease: 'easeOut',
                          }}
                          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                        >
                          <LuSparkles className="size-4 text-yellow-400" />
                        </motion.div>
                      );
                    })}
                    {/* Pulsing glow effect */}
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{
                        scale: [0.8, 1.2, 0.8],
                        opacity: [0.3, 0.6, 0.3],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                      className="absolute inset-0 rounded-full bg-yellow-200 blur-xl -z-10"
                    />
                  </>
                )}
              </div>
              <p className="text-sm sm:text-base font-bold text-gray-900 mt-4 sm:mt-5">
                {todayTestsCount}/{dailyTarget} Tests Done
              </p>
              <p className="text-[10px] sm:text-xs font-medium text-gray-500 mt-1">
                {todayTestsCount >= dailyTarget ? 'Target achieved! 🎉' : 'Keep going! 💪'}
              </p>

            </div>
          </motion.div>
        </div>

        {/* Right Column: Calendar */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="h-full min-w-0 flex"
        >
          <SimpleCalendar userAttempts={attempts} />
        </motion.div>
      </div>
    </div>
  );
};

export default DashboardPage;
