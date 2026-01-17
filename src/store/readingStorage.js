/**
 * localStorage utility for Reading Practice
 * Stores answers and elapsed time for a specific test
 */

const STORAGE_KEY_PREFIX = 'reading_practice_';

/**
 * Get storage key for a specific test
 */
const getStorageKey = (testId) => `${STORAGE_KEY_PREFIX}${testId}`;

/**
 * Save reading practice data to localStorage
 * @param {string|number} testId - The test ID
 * @param {object} data - Data to save { answers, timeRemaining, elapsedTime, startTime }
 */
export const saveReadingPracticeData = (testId, data) => {
  try {
    const key = getStorageKey(testId);
    const storageData = {
      testId,
      answers: data.answers || {},
      timeRemaining: data.timeRemaining || 0,
      elapsedTime: data.elapsedTime || 0,
      startTime: data.startTime || Date.now(),
      lastSaved: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(storageData));
  } catch (error) {
    console.error('Error saving reading practice data:', error);
  }
};

/**
 * Load reading practice data from localStorage
 * @param {string|number} testId - The test ID
 * @returns {object|null} Saved data or null
 */
export const loadReadingPracticeData = (testId) => {
  try {
    const key = getStorageKey(testId);
    const data = localStorage.getItem(key);
    if (!data) return null;
    
    const parsed = JSON.parse(data);
    return parsed;
  } catch (error) {
    console.error('Error loading reading practice data:', error);
    return null;
  }
};

/**
 * Clear reading practice data from localStorage
 * @param {string|number} testId - The test ID
 */
export const clearReadingPracticeData = (testId) => {
  try {
    const key = getStorageKey(testId);
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error clearing reading practice data:', error);
  }
};

/**
 * Calculate elapsed time from saved start time
 * @param {number} startTime - Timestamp when practice started
 * @returns {number} Elapsed time in seconds
 */
export const calculateElapsedTime = (startTime) => {
  if (!startTime) return 0;
  return Math.floor((Date.now() - startTime) / 1000);
};

/**
 * Get all reading practice keys (for debugging/cleanup)
 */
export const getAllReadingPracticeKeys = () => {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
      keys.push(key);
    }
  }
  return keys;
};

/**
 * Save reading result data (used after finishing test)
 * This is separate from practice data and persists for display
 */
const RESULT_KEY_PREFIX = 'reading_result_';

const getResultStorageKey = (testId) => `${RESULT_KEY_PREFIX}${testId}`;

export const saveReadingResultData = (testId, data) => {
  try {
    const key = getResultStorageKey(testId);
    const storageData = {
      testId,
      answers: data.answers || {},
      timeRemaining: data.timeRemaining || 0,
      elapsedTime: data.elapsedTime || 0,
      startTime: data.startTime || null,
      completedAt: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(storageData));
  } catch (error) {
    console.error('Error saving reading result data:', error);
  }
};

export const loadReadingResultData = (testId) => {
  try {
    const key = getResultStorageKey(testId);
    const data = localStorage.getItem(key);
    if (!data) return null;
    
    const parsed = JSON.parse(data);
    return parsed;
  } catch (error) {
    console.error('Error loading reading result data:', error);
    return null;
  }
};

export const clearReadingResultData = (testId) => {
  try {
    const key = getResultStorageKey(testId);
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error clearing reading result data:', error);
  }
};

