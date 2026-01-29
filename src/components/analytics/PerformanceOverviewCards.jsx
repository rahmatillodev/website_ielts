import React from 'react';
import { LuBookOpen, LuHeadphones, LuClock } from 'react-icons/lu';
import { FaArrowUp, FaChartSimple } from 'react-icons/fa6';
import {  FaExclamationTriangle } from 'react-icons/fa';

const PerformanceOverviewCards = ({ analyticsData, targetBandScore = 7.5 }) => {
  if (!analyticsData) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          </div>
        ))}
      </div>
    );
  }

  const {
    overallBand,
    readingAvg,
    listeningAvg,
    totalPracticeHours,
    totalTests,
  } = analyticsData;

  // Calculate progress to target
  const overallProgress = overallBand ? (overallBand / targetBandScore) * 100 : 0;
  const needsImprovement = overallBand && overallBand < targetBandScore;

  // Calculate reading trend (compare last 2 tests)
  const readingTrends = analyticsData.scoreTrends?.reading || [];
  const readingTrend = readingTrends.length >= 2
    ? readingTrends[readingTrends.length - 1]?.score - readingTrends[readingTrends.length - 2]?.score
    : null;

  // Determine listening status
  const listeningStatus = listeningAvg
    ? listeningAvg >= 7.0
      ? 'Consistent performance'
      : listeningAvg >= 6.0
      ? 'Plateaued'
      : 'Needs improvement'
    : 'No data';

  const listeningRecommendation = listeningAvg && listeningAvg < 7.0
    ? 'Focus on Section 3 & 4'
    : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Est. Overall Band */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FaChartSimple className="text-blue-600 text-xl" />
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
              Est. Overall Band
            </h3>
          </div>
        </div>
        <div className="mb-4">
          <div className="text-4xl font-black text-gray-900 mb-2">
            {overallBand ? overallBand.toFixed(1) : '—'}
          </div>
          <div className="text-sm text-gray-500">
            Target: {targetBandScore}
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
          <div
            className={`h-2.5 rounded-full transition-all duration-500 ${
              needsImprovement ? 'bg-orange-500' : 'bg-blue-600'
            }`}
            style={{ width: `${Math.min(overallProgress, 100)}%` }}
          ></div>
        </div>
        <div className="text-xs font-semibold text-gray-500">
          {needsImprovement ? 'Needs Improvement' : 'On Track'}
        </div>
      </div>

      {/* Reading Avg */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
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
            {readingAvg ? readingAvg.toFixed(1) : '—'}
          </div>
          {readingTrend !== null && readingTrend !== 0 && (
            <div className={`flex items-center gap-1 text-sm font-semibold ${
              readingTrend > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {readingTrend > 0 ? (
                <>
                  <FaArrowUp size={12} />
                  <span>+{Math.abs(readingTrend).toFixed(1)} last 2 tests</span>
                </>
              ) : (
                <>
                  <FaArrowUp size={12} className="rotate-180" />
                  <span>{Math.abs(readingTrend).toFixed(1)} last 2 tests</span>
                </>
              )}
            </div>
          )}
        </div>
        <div className="text-xs font-semibold text-gray-500">
          {readingAvg && readingAvg >= 7.0 ? 'Consistent performance' : 'Keep practicing'}
        </div>
      </div>

      {/* Listening Avg */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
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
            {listeningAvg ? listeningAvg.toFixed(1) : '—'}
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
      </div>

      {/* Total Practice */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
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
            {totalPracticeHours}h
          </div>
          <div className="text-sm text-gray-500">
            {totalTests} Tests completed
          </div>
        </div>
       
      </div>
    </div>
  );
};

export default PerformanceOverviewCards;

