/**
 * localStorage utility for Listening Practice
 * Stores answers and elapsed time for a specific test
 */

const STORAGE_KEY_PREFIX = 'listening_practice_';

/**
 * Get storage key for a specific test
 */
const getStorageKey = (testId) => `${STORAGE_KEY_PREFIX}${testId}`;

/**
 * Save listening practice data to localStorage
 * @param {string|number} testId - The test ID
 * @param {object} data - Data to save { answers, timeRemaining, elapsedTime, startTime }
 */
export const saveListeningPracticeData = (testId, data) => {
  try {
    const key = getStorageKey(testId);
    const storageData = {
      testId,
      answers: data.answers || {},
      timeRemaining: data.timeRemaining || 0,
      elapsedTime: data.elapsedTime || 0,
      startTime: data.startTime || Date.now(),
      bookmarks: data.bookmarks || new Set(),
      lastSaved: Date.now(),
    };
    // Convert Set to Array for JSON serialization
    if (storageData.bookmarks instanceof Set) {
      storageData.bookmarks = Array.from(storageData.bookmarks);
    }
    localStorage.setItem(key, JSON.stringify(storageData));
  } catch (error) {
    console.error('Error saving listening practice data:', error);
  }
};

/**
 * Load listening practice data from localStorage
 * @param {string|number} testId - The test ID
 * @returns {object|null} Saved data or null
 */
export const loadListeningPracticeData = (testId) => {
  try {
    const key = getStorageKey(testId);
    const data = localStorage.getItem(key);
    if (!data) return null;
    
    const parsed = JSON.parse(data);
    return parsed;
  } catch (error) {
    console.error('Error loading listening practice data:', error);
    return null;
  }
};

/**
 * Clear listening practice data from localStorage
 * @param {string|number} testId - The test ID
 */
export const clearListeningPracticeData = (testId) => {
  try {
    const key = getStorageKey(testId);
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error clearing listening practice data:', error);
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
 * Get all listening practice keys (for debugging/cleanup)
 */
export const getAllListeningPracticeKeys = () => {
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
 * Save listening result data (used after finishing test)
 * This is separate from practice data and persists for display
 */
const RESULT_KEY_PREFIX = 'listening_result_';

const getResultStorageKey = (testId) => `${RESULT_KEY_PREFIX}${testId}`;

export const saveListeningResultData = (testId, data) => {
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
    console.error('Error saving listening result data:', error);
  }
};

export const loadListeningResultData = (testId) => {
  try {
    const key = getResultStorageKey(testId);
    const data = localStorage.getItem(key);
    if (!data) return null;
    
    const parsed = JSON.parse(data);
    return parsed;
  } catch (error) {
    console.error('Error loading listening result data:', error);
    return null;
  }
};

export const clearListeningResultData = (testId) => {
  try {
    const key = getResultStorageKey(testId);
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error clearing listening result data:', error);
  }
};

