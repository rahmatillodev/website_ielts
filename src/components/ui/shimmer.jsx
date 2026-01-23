import React from 'react';

/**
 * Base Shimmer Component
 * Provides the animated shimmer effect
 */
export const Shimmer = ({ className = '', children, ...props }) => {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      {...props}
    >
      {children}
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    </div>
  );
};

/**
 * Shimmer Box - A simple rectangular shimmer placeholder
 */
export const ShimmerBox = ({ 
  className = '', 
  width = '100%', 
  height = '1rem',
  rounded = 'md'
}) => {
  const roundedClass = rounded === 'lg' ? 'rounded-lg' : rounded === 'xl' ? 'rounded-xl' : rounded === 'full' ? 'rounded-full' : 'rounded-md';
  return (
    <Shimmer className={`bg-gray-200 ${roundedClass} ${className}`} style={{ width, height }} />
  );
};

/**
 * Shimmer Circle - A circular shimmer placeholder
 */
export const ShimmerCircle = ({ 
  className = '', 
  size = '3rem'
}) => {
  return (
    <Shimmer className={`bg-gray-200 rounded-full ${className}`} style={{ width: size, height: size }} />
  );
};

/**
 * Library Card Shimmer Component
 * Mimics the layout of CardOpen and CardLocked components
 */
export const LibraryCardShimmer = ({ isGridView = true }) => {
  if (isGridView) {
    return (
      <div className="bg-white border border-t-4 border-t-blue-500 rounded-2xl md:rounded-[32px] p-4 md:p-7 shadow-none flex flex-col relative h-full">
        <div className="absolute top-3 md:top-5 right-3 md:right-5 z-10">
          <ShimmerBox height="1.5rem" width="4rem" rounded="lg" />
        </div>
        <div className="size-12 md:size-16 mb-4 md:mb-6 rounded-xl md:rounded-2xl bg-gray-200 flex items-center justify-center shrink-0">
          <ShimmerCircle size="2rem" />
        </div>
        <div className="flex-1 min-w-0">
          <ShimmerBox height="1.5rem" width="90%" className="mb-2" />
          <ShimmerBox height="1.5rem" width="70%" className="mb-4" />
          <ShimmerBox height="0.75rem" width="100%" className="mb-2" />
          <div className="flex gap-2 md:gap-3 mt-2 md:mt-3 flex-wrap">
            <ShimmerBox height="0.75rem" width="4rem" />
            <ShimmerBox height="0.75rem" width="4rem" />
            <ShimmerBox height="0.75rem" width="5rem" />
          </div>
        </div>
        <div className="mt-4 md:mt-6">
          <Shimmer className="bg-gray-200 rounded-lg md:rounded-xl h-10 md:h-12 w-full" />
        </div>
      </div>
    );
  } else {
    return (
      <div className="bg-white border border-l-4 border-l-blue-500 rounded-xl md:rounded-[24px] p-3 md:p-4 shadow-none flex items-center gap-3 md:gap-4 mb-4 relative">
        <div className="size-10 md:size-14 rounded-xl md:rounded-2xl bg-gray-200 flex items-center justify-center shrink-0">
          <ShimmerCircle size="1.5rem" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <ShimmerBox height="1.25rem" width="40%" />
            <ShimmerBox height="1.5rem" width="4rem" rounded="lg" />
          </div>
          <ShimmerBox height="0.75rem" width="30%" className="mb-2" />
          <div className="flex gap-2 md:gap-3 mt-2 md:mt-3 flex-wrap">
            <ShimmerBox height="0.75rem" width="4rem" />
            <ShimmerBox height="0.75rem" width="4rem" />
            <ShimmerBox height="0.75rem" width="5rem" />
          </div>
        </div>
        <div className="flex items-center gap-3 md:gap-6 shrink-0">
          <Shimmer className="bg-gray-200 rounded-lg md:rounded-xl h-10 md:h-12 w-24 md:w-32" />
        </div>
      </div>
    );
  }
};

/**
 * Library Page Shimmer Component
 */
export const LibraryShimmer = ({ isGridView = true, count = 9 }) => {
  return (
    <div className="flex flex-col mx-auto bg-gray-50 h-[calc(100vh-64px)] overflow-hidden px-3 md:px-8">
      <div className="bg-gray-50 pt-4 pb-4 md:pb-6 shrink-0">
        <ShimmerBox height="2rem" width="50%" className="mb-2" />
        <ShimmerBox height="1.25rem" width="80%" className="mb-2" />
        <ShimmerBox height="1.25rem" width="60%" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mt-2 md:mt-4 gap-4">
          <div className="flex gap-1.5 md:gap-2 bg-gray-100/80 p-1 md:p-1.5 rounded-xl md:rounded-2xl border border-gray-200 w-full md:w-auto">
            <ShimmerBox height="2rem" width="6rem" rounded="lg" />
            <ShimmerBox height="2rem" width="5rem" rounded="lg" />
            <ShimmerBox height="2rem" width="6rem" rounded="lg" />
          </div>
          <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto">
            <ShimmerBox height="2.5rem" width="100%" className="md:w-80" rounded="xl" />
            <ShimmerBox height="2.5rem" width="4rem" rounded="xl" />
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto pb-4 -mx-3 md:-mx-8 px-3 md:px-8">
        <div className={isGridView ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8 mb-16" : "flex flex-col gap-1 mb-16"}>
          {Array.from({ length: count }).map((_, index) => (
            <LibraryCardShimmer key={index} isGridView={isGridView} />
          ))}
        </div>
      </div>
    </div>
  );
};

