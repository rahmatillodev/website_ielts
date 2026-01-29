import React, { useEffect, useState, useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useAnalyticsStore, calculateAnalytics } from '@/store/analyticsStore';
import PerformanceOverviewCards from '@/components/analytics/PerformanceOverviewCards';
import ScoreProgressionChart from '@/components/analytics/ScoreProgressionChart';
import InsightsSection from '@/components/analytics/InsightsSection';
import ReadingBreakdown from '@/components/analytics/ReadingBreakdown';
import ListeningBreakdown from '@/components/analytics/ListeningBreakdown';
import DashboardShimmer from '@/components/shimmer/DashboardShimmer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ComingSoonPage from './ComingSoonPage';

const AnalyticsPage = () => {

  return (
    <div>
      <ComingSoonPage title="Analytics" description="Detailed insights into your IELTS preparation journey." type="analytics" />
    </div>
  );

  const { authUser, userProfile } = useAuthStore();
  const { analyticsData, loading, fetchAnalyticsData } = useAnalyticsStore();
  const [testLimit, setTestLimit] = useState('5'); // '5', '10', or 'all'

  useEffect(() => {
    if (authUser?.id) {
      fetchAnalyticsData(authUser.id, false);
    }
  }, [authUser?.id, fetchAnalyticsData]);

  const targetBandScore = userProfile?.target_band_score || 7.5;

  // Calculate filtered analytics based on selected limit
  const filteredAnalyticsData = useMemo(() => {
    if (!analyticsData?.allAttempts) {
      return analyticsData;
    }

    const readingAttempts = analyticsData.allAttempts.reading || [];
    const listeningAttempts = analyticsData.allAttempts.listening || [];

    // Determine limit
    const limit = testLimit === 'all' 
      ? Math.max(readingAttempts.length, listeningAttempts.length) 
      : parseInt(testLimit, 10);

    // Take last N attempts for each type (they're already sorted newest first)
    const filteredReadingAttempts = readingAttempts.slice(0, limit);
    const filteredListeningAttempts = listeningAttempts.slice(0, limit);

    // Combine filtered attempts
    const filteredAttempts = [...filteredReadingAttempts, ...filteredListeningAttempts];

    // Filter userAnswers to only include answers from filtered attempts
    // Use empty array if userAnswers is not available (for backward compatibility)
    const userAnswers = analyticsData.userAnswers || [];
    const filteredAttemptIds = new Set(filteredAttempts.map(a => a.id));
    const filteredUserAnswers = userAnswers.filter(
      answer => filteredAttemptIds.has(answer.attempt_id)
    );

    // Recalculate analytics with filtered data
    const filteredAnalytics = calculateAnalytics(
      filteredAttempts,
      filteredUserAnswers,
      targetBandScore
    );

    // Calculate filtered score trends for chart
    const readingReversed = [...filteredReadingAttempts].reverse();
    const listeningReversed = [...filteredListeningAttempts].reverse();

    const maxLength = Math.max(readingReversed.length, listeningReversed.length);
    const combinedTrends = [];

    for (let i = 0; i < maxLength; i++) {
      const readingScore = readingReversed[i]?.score || null;
      const listeningScore = listeningReversed[i]?.score || null;

      if (readingScore !== null || listeningScore !== null) {
        combinedTrends.push({
          testNumber: i + 1,
          reading: readingScore,
          listening: listeningScore,
        });
      }
    }

    // Add filtered score trends
    filteredAnalytics.scoreTrends = {
      reading: readingReversed.map((attempt, index) => ({
        testNumber: index + 1,
        score: attempt.score,
      })),
      listening: listeningReversed.map((attempt, index) => ({
        testNumber: index + 1,
        score: attempt.score,
      })),
      combined: combinedTrends,
    };

    return filteredAnalytics;
  }, [analyticsData, testLimit, targetBandScore]);

  if (loading && !analyticsData) {
    return (
      <div className="min-h-screen bg-gray-50/50 p-6 lg:p-8">
        <DashboardShimmer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-black text-gray-900 mb-2">
                Performance Overview
              </h1>
              <p className="text-gray-500 font-medium">
                Detailed insights into your IELTS preparation journey.
              </p>
            </div>
            {/* Test Limit Selector */}
            {analyticsData && analyticsData.allAttempts && 
             (analyticsData.allAttempts.reading?.length > 0 || analyticsData.allAttempts.listening?.length > 0) && (
              <div className="flex items-center gap-3">
                <label className="text-sm font-semibold text-gray-600">
                  Show last:
                </label>
                <Select value={testLimit} onValueChange={setTestLimit}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 tests</SelectItem>
                    <SelectItem value="10">10 tests</SelectItem>
                    <SelectItem value="all">All tests</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="mb-8">
          <PerformanceOverviewCards
            analyticsData={filteredAnalyticsData}
            targetBandScore={targetBandScore}
          />
        </div>

        {/* Middle Section: Chart and Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Score Progression Chart */}
          <div>
            <ScoreProgressionChart
              scoreTrends={filteredAnalyticsData?.scoreTrends?.combined || []}
              testLimit={testLimit}
            />
          </div>

          {/* Insights */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <InsightsSection insights={filteredAnalyticsData?.insights} />
          </div>
        </div>

        {/* Bottom Section: Breakdowns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ReadingBreakdown readingBreakdown={filteredAnalyticsData?.readingBreakdown} />
          <ListeningBreakdown listeningBreakdown={filteredAnalyticsData?.listeningBreakdown} />
        </div>

        {/* Empty State */}
        {!loading && (!filteredAnalyticsData || filteredAnalyticsData.totalTests === 0) && (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm">
            <div className="text-gray-400 mb-4">
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
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Analytics Data Yet
            </h3>
            <p className="text-gray-500 mb-6">
              Complete some practice tests to see your performance analytics here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsPage;
