import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { useCefrAnalyticsStore } from '@/store/cefrAnalyticsStore';
import {
  calculateCefrAnalytics,
  formatDateToDayMonth,
  getDateKey,
  compareCefrLevels,
  normalizeCefrLevel,
  DEFAULT_TARGET_CEFR_LEVEL,
} from '@/lib/cefrAnalytics';
import CefrPerformanceOverviewCards from '@/components/analytics/cefr/CefrPerformanceOverviewCards';
import CefrScoreProgressionChart from '@/components/analytics/cefr/CefrScoreProgressionChart';
import InsightsSection from '@/components/analytics/InsightsSection';
import ReadingBreakdown from '@/components/analytics/ReadingBreakdown';
import ListeningBreakdown from '@/components/analytics/ListeningBreakdown';
import DashboardShimmer from '@/components/shimmer/DashboardShimmer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import AnalyticsWarningModal, {
  hasSeenAnalyticsWarning,
} from '@/components/modal/AnalyticsWarningModal';

const CefrAnalyticsPage = () => {
  const { authUser } = useAuthStore();
  const { analyticsData, loading, fetchCefrAnalyticsData } = useCefrAnalyticsStore();
  const [testLimit, setTestLimit] = useState('5');
  const [showWarningModal, setShowWarningModal] = useState(false);

  const targetCefrLevel = DEFAULT_TARGET_CEFR_LEVEL;

  useEffect(() => {
    if (authUser?.id) {
      fetchCefrAnalyticsData(authUser.id, false);
    }
  }, [authUser?.id, fetchCefrAnalyticsData]);

  useEffect(() => {
    if (
      !loading &&
      analyticsData &&
      analyticsData.totalTests < 5 &&
      !hasSeenAnalyticsWarning()
    ) {
      setShowWarningModal(true);
    }
  }, [loading, analyticsData]);

  const filteredAnalyticsData = useMemo(() => {
    if (!analyticsData?.allAttempts) {
      return analyticsData;
    }

    const readingAttempts = analyticsData.allAttempts.reading || [];
    const listeningAttempts = analyticsData.allAttempts.listening || [];

    const limit =
      testLimit === 'all'
        ? Math.max(readingAttempts.length, listeningAttempts.length)
        : parseInt(testLimit, 10);

    const filteredReadingAttempts = readingAttempts.slice(0, limit);
    const filteredListeningAttempts = listeningAttempts.slice(0, limit);
    const filteredAttempts = [
      ...filteredReadingAttempts,
      ...filteredListeningAttempts,
    ];

    const userAnswers = analyticsData.userAnswers || [];
    const filteredAttemptIds = new Set(filteredAttempts.map((a) => a.id));
    const filteredUserAnswers = userAnswers.filter((answer) =>
      filteredAttemptIds.has(answer.attempt_id)
    );

    const filteredAnalytics = calculateCefrAnalytics(
      filteredAttempts,
      filteredUserAnswers,
      targetCefrLevel
    );

    const readingByDay = {};
    filteredReadingAttempts.forEach((attempt) => {
      if (!attempt.completed_at) return;
      const dateKey = getDateKey(attempt.completed_at);
      const level = normalizeCefrLevel(attempt.score);
      if (
        !readingByDay[dateKey] ||
        compareCefrLevels(level, readingByDay[dateKey].score) > 0
      ) {
        readingByDay[dateKey] = { date: attempt.completed_at, score: level };
      }
    });

    const listeningByDay = {};
    filteredListeningAttempts.forEach((attempt) => {
      if (!attempt.completed_at) return;
      const dateKey = getDateKey(attempt.completed_at);
      const level = normalizeCefrLevel(attempt.score);
      if (
        !listeningByDay[dateKey] ||
        compareCefrLevels(level, listeningByDay[dateKey].score) > 0
      ) {
        listeningByDay[dateKey] = { date: attempt.completed_at, score: level };
      }
    });

    const allDates = new Set([
      ...Object.keys(readingByDay),
      ...Object.keys(listeningByDay),
    ]);
    const sortedDates = Array.from(allDates).sort((a, b) => a.localeCompare(b));

    const datesToShow =
      testLimit === 'all' || parseInt(testLimit, 10) >= sortedDates.length
        ? sortedDates
        : sortedDates.slice(-parseInt(testLimit, 10));

    const combinedTrends = datesToShow.map((dateKey, index) => {
      const readingDayData = readingByDay[dateKey];
      const listeningDayData = listeningByDay[dateKey];
      const date = readingDayData?.date || listeningDayData?.date || dateKey;

      return {
        testNumber: index + 1,
        date,
        dateKey,
        dateLabel: formatDateToDayMonth(date),
        reading: readingDayData?.score || null,
        listening: listeningDayData?.score || null,
      };
    });

    filteredAnalytics.scoreTrends = {
      reading: datesToShow.map((dateKey, index) => {
        const dayData = readingByDay[dateKey];
        return {
          testNumber: index + 1,
          date: dayData?.date || null,
          dateKey,
          dateLabel: formatDateToDayMonth(dayData?.date || dateKey),
          score: dayData?.score || null,
        };
      }),
      listening: datesToShow.map((dateKey, index) => {
        const dayData = listeningByDay[dateKey];
        return {
          testNumber: index + 1,
          date: dayData?.date || null,
          dateKey,
          dateLabel: formatDateToDayMonth(dayData?.date || dateKey),
          score: dayData?.score || null,
        };
      }),
      combined: combinedTrends,
    };

    return filteredAnalytics;
  }, [analyticsData, testLimit, targetCefrLevel]);

  if (loading && !analyticsData) {
    return (
      <div className="min-h-screen bg-gray-50/50 p-6 lg:p-8">
        <DashboardShimmer />
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.6, -0.05, 0.01, 0.99] },
    },
  };

  const headerVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.6, -0.05, 0.01, 0.99] },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.4, ease: [0.6, -0.05, 0.01, 0.99] },
    },
  };

  const gridVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.3 },
    },
  };

  return (
    <motion.div
      className="min-h-screen bg-gray-50/50 p-6 lg:p-8 font-sans"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <AnalyticsWarningModal
        isOpen={showWarningModal}
        onClose={() => setShowWarningModal(false)}
      />
      <div className="max-w-7xl mx-auto">
        <motion.div className="mb-8" variants={headerVariants}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-black text-gray-900 mb-2">
                CEFR Performance Overview
              </h1>
              <p className="text-gray-500 font-medium">
                Detailed insights into your CEFR preparation journey (A1–C2).
              </p>
            </div>
            {analyticsData &&
              analyticsData.allAttempts &&
              (analyticsData.allAttempts.reading?.length > 0 ||
                analyticsData.allAttempts.listening?.length > 0) && (
                <motion.div
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <label className="text-sm font-semibold text-gray-600">
                    Show last:
                  </label>
                  <Select value={testLimit} onValueChange={setTestLimit}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 days</SelectItem>
                      <SelectItem value="10">10 days</SelectItem>
                      <SelectItem value="all">All days</SelectItem>
                    </SelectContent>
                  </Select>
                </motion.div>
              )}
          </div>
        </motion.div>

        <motion.div className="mb-8" variants={itemVariants}>
          <CefrPerformanceOverviewCards
            analyticsData={filteredAnalyticsData}
            targetCefrLevel={targetCefrLevel}
          />
        </motion.div>

        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8"
          variants={gridVariants}
        >
          <motion.div variants={cardVariants}>
            <CefrScoreProgressionChart
              scoreTrends={filteredAnalyticsData?.scoreTrends?.combined || []}
              testLimit={testLimit}
            />
          </motion.div>

          <motion.div
            className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm"
            variants={cardVariants}
          >
            <InsightsSection insights={filteredAnalyticsData?.insights} />
          </motion.div>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          variants={gridVariants}
        >
          <motion.div variants={cardVariants}>
            <ReadingBreakdown
              readingBreakdown={filteredAnalyticsData?.readingBreakdown}
            />
          </motion.div>
          <motion.div variants={cardVariants}>
            <ListeningBreakdown
              listeningBreakdown={filteredAnalyticsData?.listeningBreakdown}
            />
          </motion.div>
        </motion.div>

        {!loading &&
          (!filteredAnalyticsData || filteredAnalyticsData.totalTests === 0) && (
            <motion.div
              className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm mt-4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <motion.div
                className="text-gray-400 mb-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                <svg
                  className="mx-auto h-24 w-24"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </motion.div>
              <motion.h3
                className="text-xl font-semibold text-gray-900 mb-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.7 }}
              >
                No CEFR Analytics Data Yet
              </motion.h3>
              <motion.p
                className="text-gray-500 mb-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.8 }}
              >
                Complete CEFR practice tests to see your performance analytics here.
              </motion.p>
            </motion.div>
          )}
      </div>
    </motion.div>
  );
};

export default CefrAnalyticsPage;
