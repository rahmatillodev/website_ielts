/**
 * Converts test duration to seconds
 * If duration is a simple number, it's treated as minutes
 * Examples:
 * - 10 = 10 minutes = 600 seconds
 * - 60 = 60 minutes = 3600 seconds
 * - 120 = 120 minutes = 7200 seconds (2 hours)
 * 
 * @param {number|null|undefined} duration - Duration value from test table
 * @returns {number} Duration in seconds (defaults to 3600 seconds / 1 hour if invalid)
 */
export const convertDurationToSeconds = (duration) => {
  // If duration is null, undefined, or not a number, default to 1 hour (3600 seconds)
  if (duration === null || duration === undefined || typeof duration !== 'number' || isNaN(duration)) {
    return 60 * 60; // Default to 1 hour
  }
  
  // Treat the number as minutes and convert to seconds
  return duration * 60;
};

