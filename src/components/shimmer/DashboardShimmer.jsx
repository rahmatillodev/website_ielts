import React from 'react';
import { Shimmer, ShimmerBox, ShimmerCircle } from '@/components/ui/shimmer';

/**
 * Dashboard Shimmer Component
 * Mimics the layout of the DashboardPage
 */
const DashboardShimmer = () => {
  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 min-h-full">
      {/* Welcome Section Shimmer */}
      <div className="mb-4 sm:mb-6">
        <ShimmerBox height="2rem" width="60%" className="mb-2" />
        <ShimmerBox height="1.25rem" width="40%" />
      </div>

      {/* Grid Layout Shimmer */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr] gap-4 sm:gap-5 md:gap-6">
        {/* Left Column: My Progress Card */}
        <div className="md:col-span-2 lg:col-span-1">
          <div className="bg-white rounded-3xl shadow-md border border-gray-200 overflow-hidden p-5 sm:p-6 md:p-8 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <ShimmerBox height="1.5rem" width="40%" />
              <ShimmerBox height="1.75rem" width="4rem" rounded="lg" />
            </div>

            {/* Score Cards Grid */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-6 flex-1 mt-3 sm:mt-4 md:mt-6">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="p-4 sm:p-5 md:p-6 lg:p-7 border-2 rounded-2xl bg-gray-50 border-gray-200"
                >
                  <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
                    <ShimmerBox height="0.875rem" width="60%" />
                    <ShimmerCircle size="2rem" />
                  </div>
                  <ShimmerBox height="2rem" width="70%" />
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="bg-gradient-to-r from-blue-50 via-blue-100/50 to-blue-50 px-5 sm:px-6 md:px-8 pt-4 sm:pt-5 md:pt-6 pb-4 sm:pb-5 md:pb-7 mt-5 border-t border-blue-100">
              <ShimmerBox height="0.75rem" width="50%" className="mb-2" />
              <ShimmerBox height="1.75rem" width="40%" />
            </div>
          </div>
        </div>

        {/* Middle Column: Stats Cards */}
        <div className="flex flex-col gap-4 sm:gap-5 h-full">
          {/* Tests Completed Card */}
          <div className="bg-white rounded-3xl shadow-md border border-gray-200 px-4 sm:px-5 md:px-6 py-5 sm:py-6 flex flex-col min-h-[100px] sm:min-h-[120px]">
            <ShimmerBox height="0.875rem" width="50%" className="mb-2" />
            <ShimmerBox height="2.5rem" width="60%" className="mb-2" />
            <ShimmerBox height="0.75rem" width="70%" />
          </div>

          {/* Study Time Card */}
          <div className="bg-white rounded-3xl shadow-md border border-gray-200 px-4 sm:px-5 md:px-6 py-5 sm:py-6 flex flex-col min-h-[100px] sm:min-h-[120px]">
            <ShimmerBox height="0.875rem" width="50%" className="mb-2" />
            <ShimmerBox height="2.5rem" width="60%" className="mb-2" />
            <ShimmerBox height="0.75rem" width="70%" />
          </div>

          {/* Daily Target Card */}
          <div className="bg-white rounded-3xl shadow-md border border-gray-200 px-4 sm:px-5 md:px-6 py-5 sm:py-6 flex flex-col flex-1 min-h-[140px] sm:min-h-[160px] items-center justify-center">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <ShimmerCircle size="1.5rem" />
              <ShimmerBox height="0.875rem" width="5rem" />
            </div>
            <ShimmerCircle size="6.25rem" className="mb-4 sm:mb-5" />
            <ShimmerBox height="1rem" width="6rem" className="mb-1" />
            <ShimmerBox height="0.75rem" width="8rem" />
          </div>
        </div>

        {/* Right Column: Calendar */}
        <div className="h-full">
          <div className="bg-white rounded-3xl shadow-md border border-gray-200 overflow-hidden px-3 sm:px-4 md:px-5 pt-3 sm:pt-4 pb-4 sm:pb-5 w-full h-full flex flex-col">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <ShimmerBox height="1.25rem" width="2.5rem" />
              <ShimmerBox height="1.25rem" width="8rem" />
              <ShimmerBox height="1.25rem" width="2.5rem" />
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-0.5 sm:gap-1 md:gap-1.5 flex-1 mb-3 sm:mb-4">
              {/* Day names */}
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <ShimmerBox key={i} height="1rem" width="100%" />
              ))}
              {/* Calendar days */}
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="aspect-square">
                  <Shimmer className="bg-gray-200 rounded-lg h-full" />
                </div>
              ))}
            </div>

            {/* Streak Section */}
            <div className="border-t border-gray-100 pt-2 sm:pt-3 pb-1 flex flex-col items-center gap-1 sm:gap-1.5">
              <div className="flex items-center gap-2">
                <ShimmerCircle size="1.25rem" />
                <ShimmerBox height="1.25rem" width="6rem" />
              </div>
              <ShimmerBox height="0.75rem" width="5rem" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardShimmer;

