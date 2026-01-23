import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import supabase from '@/lib/supabase';
import {
  LuHeadphones,
  LuBookOpen,
  LuPenTool,
  LuMic,
  LuArrowUp,
  LuFlame,
  LuChevronLeft,
  LuChevronRight,
} from 'react-icons/lu';

const SCORES = [
  { label: 'Listening', value: '8.5', icon: LuHeadphones, iconColor: 'text-blue-400', isActive: true },
  { label: 'Reading', value: '7.5', icon: LuBookOpen, iconColor: 'text-orange-500', isActive: true },
  { label: 'Writing', value: 'Coming Soon', icon: LuPenTool, iconColor: 'text-gray-400', isActive: false },
  { label: 'Speaking', value: 'Coming Soon', icon: LuMic, iconColor: 'text-gray-400', isActive: false },
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const SimpleCalendar = () => {
  const now = new Date();
  const userProfile = useAuthStore((state) => state.userProfile);
  const authUser = useAuthStore((state) => state.authUser);
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [userAttempts, setUserAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch user attempts from Supabase
  useEffect(() => {
  if (!authUser?.id) return;

  const fetchProgress = async () => {
    const { data, error } = await supabase
      .from('user_attempts')
      .select('section, score, created_at')
      .eq('user_id', authUser.id)
      .in('section', ['listening', 'reading'])
      .order('created_at', { ascending: false });

    if (error || !data) return;

    const lastListening = data.find(d => d.section === 'listening');
    const lastReading = data.find(d => d.section === 'reading');

    setListeningScore(lastListening?.score ?? null);
    setReadingScore(lastReading?.score ?? null);
    console.log(lastListening?.score, lastReading?.score);
  };

  fetchProgress();
}, [authUser?.id]);


  // Get enrollment date from user profile (joined_at)
  const getEnrollmentDate = () => {
    if (userProfile?.joined_at) {
      const enrollmentDate = new Date(userProfile.joined_at);
      return {
        month: enrollmentDate.getMonth(),
        year: enrollmentDate.getFullYear(),
      };
    }
    
    return {
      month: now.getMonth(),
      year: now.getFullYear(),
    };
  };

  const enrollmentDate = getEnrollmentDate();
  const minMonth = enrollmentDate.month;
  const minYear = enrollmentDate.year;
  const maxMonth = now.getMonth();
  const maxYear = now.getFullYear();

  // Get dates with attempts for a specific month
  const getDatesWithAttempts = (month, year) => {
    const datesWithAttempts = new Set();
    
    userAttempts.forEach((attempt) => {
      // Use created_at or completed_at, whichever is available
      const attemptDate = attempt.created_at || attempt.completed_at;
      if (!attemptDate) return;

      const date = new Date(attemptDate);
      if (date.getMonth() === month && date.getFullYear() === year) {
        datesWithAttempts.add(date.getDate());
      }
    });

    return Array.from(datesWithAttempts);
  };

  // Calculate streak (consecutive days with attempts, counting backwards from today or most recent attempt)
  const calculateStreak = () => {
    if (userAttempts.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get unique dates with attempts
    const datesWithAttempts = new Set();
    let mostRecentAttemptDate = null;
    
    userAttempts.forEach((attempt) => {
      const attemptDate = attempt.created_at || attempt.completed_at;
      if (!attemptDate) return;
      
      const date = new Date(attemptDate);
      date.setHours(0, 0, 0, 0);
      const dateTime = date.getTime();
      datesWithAttempts.add(dateTime);
      
      // Track the most recent attempt date
      if (!mostRecentAttemptDate || dateTime > mostRecentAttemptDate) {
        mostRecentAttemptDate = dateTime;
      }
    });

    if (!mostRecentAttemptDate) return 0;

    // Start from today if it has an attempt, otherwise from the most recent attempt date
    // But only count as active streak if the most recent attempt is today or yesterday
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const mostRecentDate = new Date(mostRecentAttemptDate);
    const daysSinceLastAttempt = Math.floor((today.getTime() - mostRecentDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // If the most recent attempt was more than 1 day ago, streak is broken
    if (daysSinceLastAttempt > 1) return 0;
    
    // Start counting from today (if it has an attempt) or from the most recent attempt date
    const startDate = datesWithAttempts.has(today.getTime()) ? today : mostRecentDate;
    
    // Count consecutive days backwards
    let streak = 0;
    let checkDate = new Date(startDate);
    
    while (datesWithAttempts.has(checkDate.getTime())) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    return streak;
  };

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

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const leadingBlanks = firstDay;
  const totalCells = 42;
  const trailingBlanks = totalCells - leadingBlanks - daysInMonth;

  // Check if currently viewed month is the current real-time month
  const isCurrentMonth = currentMonth === now.getMonth() && currentYear === now.getFullYear();
  const today = now.getDate();
  const activeStreakDates = getDatesWithAttempts(currentMonth, currentYear);
  const streakDays = calculateStreak();

  const leading = Array.from({ length: leadingBlanks }, (_, i) => ({ key: `b-${i}`, blank: true }));
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const dayNum = i + 1;
    return {
      key: `d-${i}`,
      num: dayNum,
      isToday: isCurrentMonth && dayNum === today,
      hasStreak: activeStreakDates.includes(dayNum),
    };
  });
  const trailing = Array.from({ length: Math.max(0, trailingBlanks) }, (_, i) => ({ key: `t-${i}`, blank: true }));
  const cells = [...leading, ...days, ...trailing];

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden px-4 sm:px-5 pt-3 sm:pt-4 pb-4 sm:pb-5 w-full h-full flex flex-col transition-all duration-200 ease-out hover:shadow-md hover:border-gray-200">
      {/* Month header with navigation */}
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        {canGoPrevious ? (
          <button
            onClick={handlePreviousMonth}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            aria-label="Previous month"
          >
            <LuChevronLeft className="size-4 sm:size-5 text-gray-600" />
          </button>
        ) : (
          <div className="w-8 sm:w-10" /> // Spacer to maintain layout
        )}
        <p className="text-sm sm:text-base font-semibold text-gray-900 leading-snug">
          {MONTH_NAMES[currentMonth]} {currentYear}
        </p>
        {canGoNext ? (
          <button
            onClick={handleNextMonth}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            aria-label="Next month"
          >
            <LuChevronRight className="size-4 sm:size-5 text-gray-600" />
          </button>
        ) : (
          <div className="w-8 sm:w-10" /> // Spacer to maintain layout
        )}
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-2 flex-1 mb-3 sm:mb-4">
        {DAY_NAMES.map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-gray-500 py-0.5 sm:py-1">
            {d}
          </div>
        ))}
        <AnimatePresence mode="wait">
          {cells.map((c) =>
            c.blank ? (
              <div key={c.key} className="aspect-square min-w-0" />
            ) : (
              <motion.div
                key={`${currentMonth}-${currentYear}-${c.key}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className={`aspect-square min-w-0 flex flex-col items-center justify-center text-sm sm:text-base font-medium rounded-md relative ${
                  c.isToday ? 'bg-blue-100 text-blue-600' : 'text-gray-700'
                }`}
              >
                <span className="leading-none">{c.num}</span>
                {c.hasStreak && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: [0, 1.2, 1], opacity: 1 }}
                    transition={{ 
                      delay: 0.25, 
                      duration: 0.5, 
                      type: 'spring', 
                      stiffness: 300,
                      damping: 10
                    }}
                  >
                    <LuFlame className="size-3 sm:size-3.5 text-orange-500 mt-0.5" />
                  </motion.div>
                )}
              </motion.div>
            )
          )}
        </AnimatePresence>
      </div>
      {/* Streak information at bottom of calendar */}
      <div className="border-t border-gray-100 pt-3 sm:pt-4 flex flex-col items-center gap-1 sm:gap-1.5">
        <p className="text-sm sm:text-base font-semibold text-gray-900">
          Streak: {streakDays} Days
        </p>
        <p className="text-xs sm:text-sm font-medium text-gray-600 flex items-center gap-1.5">
          Keep it up! <LuFlame className="size-3.5 sm:size-4 text-orange-500" />
        </p>
      </div>
    </div>
  );
};

const DashboardPage = () => {
  const userProfile = useAuthStore((state) => state.userProfile);
  const authUser = useAuthStore((state) => state.authUser);
  const displayName = userProfile?.full_name || authUser?.email?.split('@')[0] || 'User';
  const firstName = displayName.split(' ')[0] || displayName;

  const [attempts, setAttempts] = useState([]);
  const testsCompleted = attempts.length;
  const studyTimeSeconds = attempts.reduce((s, r) => s + (Number(r.time_taken) || 0), 0);
  const studyTimeHours = Math.round(studyTimeSeconds / 3600);

  useEffect(() => {
    const fetchAttempts = async () => {
      const userId = authUser?.id ?? null;
      console.log('AUTH USER ID:', userId);

      if (!userId) {
        setAttempts([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_attempts')
          .select('created_at, time_taken')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        console.log('ATTEMPTS:', data);

        if (error) {
          setAttempts([]);
          return;
        }
        setAttempts(Array.isArray(data) ? data : []);
      } catch {
        setAttempts([]);
      }
    };
    fetchAttempts();
  }, [authUser?.id]);

  const progressPercent = 70;
  const circleR = 40;
  const circumference = 2 * Math.PI * circleR;
  const strokeDashoffset = circumference * (1 - progressPercent / 100);

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 min-h-full">
      {/* Welcome */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-black text-gray-900">
          Welcome {firstName}
        </h1>
        <p className="text-sm sm:text-base font-medium text-gray-500 mt-1">
          Let&apos;s improve your band score today.
        </p>
      </div>

      {/* Responsive grid layout */}
      {/* Mobile: 1 column | Tablet: 2 columns | Desktop: 3 columns with equal heights */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr] gap-4 sm:gap-6 lg:items-stretch">
        {/* Left Column: My Progress (40-45% width on desktop) */}
        <div className="md:col-span-2 lg:col-span-1 h-full flex">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col w-full">
            <div className="p-6 sm:p-8 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-base sm:text-lg font-black text-gray-900">My Progress</h2>
                <span className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-green-100 text-green-700 text-xs font-semibold rounded-lg">
                  Active Session
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:gap-6 flex-1 mt-4 sm:mt-6">
                {SCORES.map(({ label, value, icon: Icon, iconColor, isActive }) => (
                  <div
                    key={label}
                    className={`p-5 sm:p-6 lg:p-7 border rounded-3xl ${
                      isActive
                        ? 'bg-white border-gray-200'
                        : 'bg-gray-100 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 sm:gap-2.5 mb-2 sm:mb-3.5">
                      <Icon className={`size-5 sm:size-6 shrink-0 ${iconColor}`} />
                      <span className={`text-xs sm:text-sm font-medium ${
                        isActive ? 'text-gray-600' : 'text-gray-400'
                      }`}>
                        {label}
                      </span>
                    </div>
                    <p className={`text-xl sm:text-2xl font-black ${
                      isActive ? 'text-gray-900' : 'text-gray-400'
                    }`}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Your Score footer - pinned to bottom */}
            <div className="bg-blue-50 px-6 sm:px-8 pt-5 sm:pt-6 pb-5 sm:pb-7 flex items-center justify-start w-full mt-auto">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  YOUR SCORE
                </p>
                <p className="text-lg sm:text-xl font-black text-gray-900">Band 8.5</p>
              </div>
            </div>
          </div>
        </div>

        {/* Middle Column: Tests Completed + Study Time stacked */}
        <div className="flex flex-col gap-4 sm:gap-5 h-full">
          {[
            { title: 'Tests Completed', subtitle: 'Total questions answered: 480', circleBg: '#F5F3FF' },
            { title: 'Study Time', subtitle: 'Last session: 2 hours ago', circleBg: '#FEFCE8' },
          ].map(({ title, subtitle, circleBg }) => {
            const value = title === 'Tests Completed'
              ? String(testsCompleted)
              : `${studyTimeHours} hrs`;
            return (
              <div
                key={title}
                className="relative overflow-hidden bg-white rounded-3xl shadow-sm px-4 sm:px-5 py-4 sm:py-5 border border-gray-100 flex-1 flex flex-col transition-all duration-200 ease-out hover:shadow hover:border-gray-200"
              >
                <div
                  className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-80"
                  style={{ backgroundColor: circleBg }}
                />
                <div className="relative flex-1 flex flex-col">
                  <p className="text-sm sm:text-base font-medium text-gray-500 mb-1.5 leading-snug">{title}</p>
                  <p className="text-xl sm:text-2xl font-semibold text-gray-900 leading-tight">{value}</p>
                  <p className="text-xs font-medium text-gray-400 mt-1">{subtitle}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Calendar with integrated streak */}
        <div className="h-full min-w-0 flex">
          <SimpleCalendar />
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
