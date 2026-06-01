import React from 'react';
import { motion } from 'framer-motion';
import { LuBookOpen, LuHeadphones, LuClock } from 'react-icons/lu';
import { FaArrowUp, FaChartSimple } from 'react-icons/fa6';
import { FaExclamationTriangle } from 'react-icons/fa';
import { useResponsiveGridCols } from '@/hooks/useResponsiveGridCols';
import {
  cefrLevelToOrdinal,
  compareCefrLevels,
  DEFAULT_TARGET_CEFR_LEVEL,
} from '@/lib/cefrAnalytics';

const CefrPerformanceOverviewCards = ({
  analyticsData,
  targetCefrLevel = DEFAULT_TARGET_CEFR_LEVEL,
}) => {
  const cols = useResponsiveGridCols();

  if (!analyticsData) {
    return (
      <div className={`grid ${cols} gap-4`}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white border border-gray-200 rounded-xl p-6 animate-pulse"
          >
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
            <div className="h-8 bg-gray-200 rounded w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  const {
    overallLevel,
    readingAvg,
    listeningAvg,
    totalPracticeHours,
    totalPracticeMinutes,
    totalTests,
  } = analyticsData;

  const targetOrdinal = cefrLevelToOrdinal(targetCefrLevel) ?? 4;
  const overallOrdinal = cefrLevelToOrdinal(overallLevel) ?? 0;
  const overallProgress =
    overallOrdinal > 0 ? (overallOrdinal / targetOrdinal) * 100 : 0;
  const needsImprovement =
    overallOrdinal > 0 && overallOrdinal < targetOrdinal;

  const readingTrends = analyticsData.scoreTrends?.reading || [];
  const readingTrend =
    readingTrends.length >= 2
      ? compareCefrLevels(
          readingTrends[readingTrends.length - 1]?.score,
          readingTrends[readingTrends.length - 2]?.score
        )
      : null;

  const listeningOrdinal = cefrLevelToOrdinal(listeningAvg) ?? 0;
  const listeningStatus =
    listeningOrdinal >= 5
      ? 'Consistent performance'
      : listeningOrdinal >= 3
        ? 'Steady progress'
        : listeningAvg
          ? 'Needs improvement'
          : 'No data';

  const listeningRecommendation =
    listeningOrdinal > 0 && listeningOrdinal < 4
      ? 'Focus on longer listening passages'
      : null;

  const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        delay: i * 0.1,
        duration: 0.5,
        ease: [0.6, -0.05, 0.01, 0.99],
      },
    }),
  };

  const progressBarVariants = {
    hidden: { width: 0 },
    visible: {
      width: `${Math.min(overallProgress, 100)}%`,
      transition: {
        duration: 1,
        delay: 0.5,
        ease: [0.6, -0.05, 0.01, 0.99],
      },
    },
  };

  return (
    <div className={`grid ${cols} gap-4`}>
      <motion.div
        className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm"
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        custom={0}
        whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FaChartSimple className="text-emerald-600 text-xl" />
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
              Est. Overall Level
            </h3>
          </div>
        </div>
        <div className="mb-4">
          <div className="text-4xl font-black text-gray-900 mb-2">
            {overallLevel || '—'}
          </div>
          <div className="text-sm text-gray-500">Target: {targetCefrLevel}</div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2 overflow-hidden">
          <motion.div
            className={`h-2.5 rounded-full ${
              needsImprovement ? 'bg-orange-500' : 'bg-emerald-600'
            }`}
            variants={progressBarVariants}
            initial="hidden"
            animate="visible"
          />
        </div>
        <div className="text-xs font-semibold text-gray-500">
          {needsImprovement ? 'Below target' : 'On track'}
        </div>
      </motion.div>

      <motion.div
        className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm"
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        custom={1}
        whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <LuBookOpen className="text-green-600 text-xl" />
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
              Reading Avg
            </h3>
          </div>
        </div>
        <div className="mb-4">
          <div className="text-4xl font-black text-gray-900 mb-2">
            {readingAvg || '—'}
          </div>
          {readingTrend !== null && readingTrend !== 0 && (
            <div
              className={`flex items-center gap-1 text-sm font-semibold ${
                readingTrend > 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              <FaArrowUp size={12} className={readingTrend < 0 ? 'rotate-180' : ''} />
              <span>
                {readingTrend > 0 ? 'Up' : 'Down'} vs previous session
              </span>
            </div>
          )}
        </div>
        <div className="text-xs font-semibold text-gray-500">
          {readingAvg ? 'Based on CEFR reading tests' : 'Complete a reading test'}
        </div>
      </motion.div>

      <motion.div
        className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm"
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        custom={2}
        whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <LuHeadphones className="text-red-600 text-xl" />
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
              Listening Avg
            </h3>
          </div>
        </div>
        <div className="mb-4">
          <div className="text-4xl font-black text-gray-900 mb-2">
            {listeningAvg || '—'}
          </div>
          {listeningRecommendation && (
            <div className="flex items-center gap-1 text-sm font-semibold text-orange-600">
              <FaExclamationTriangle size={12} />
              <span>{listeningStatus}</span>
            </div>
          )}
        </div>
        <div className="text-xs font-semibold text-gray-500">
          {listeningRecommendation || listeningStatus}
        </div>
      </motion.div>

      <motion.div
        className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm"
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        custom={3}
        whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <LuClock className="text-purple-600 text-xl" />
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
              Total Practice
            </h3>
          </div>
        </div>
        <div className="mb-4">
          <div className="text-4xl font-black text-gray-900 mb-2">
            {totalPracticeHours > 0 && `${totalPracticeHours}h`}
            {totalPracticeMinutes > 0 &&
              `${totalPracticeHours > 0 ? ' ' : ''}${totalPracticeMinutes}m`}
            {totalPracticeHours === 0 && totalPracticeMinutes === 0 && '0m'}
          </div>
          <div className="text-sm text-gray-500">{totalTests} Tests completed</div>
        </div>
      </motion.div>
    </div>
  );
};

export default CefrPerformanceOverviewCards;
