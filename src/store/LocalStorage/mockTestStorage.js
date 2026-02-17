/**
 * LocalStorage utilities for Mock Test
 * Stores progress across Listening, Reading, and Writing sections
 */

const STORAGE_KEY_PREFIX = 'mock_test_';

/**
 * Save mock test progress
 * @param {string} mockTestId - Mock test ID
 * @param {object} data - Progress data
 * @param {string} data.currentSection - Current section: 'listening' | 'reading' | 'writing'
 * @param {object} data.listeningAnswers - Listening section answers
 * @param {object} data.readingAnswers - Reading section answers
 * @param {object} data.writingAnswers - Writing section answers
 * @param {number} data.listeningTimeRemaining - Listening time remaining in seconds
 * @param {number} data.readingTimeRemaining - Reading time remaining in seconds
 * @param {number} data.writingTimeRemaining - Writing time remaining in seconds
 * @param {number} data.listeningStartTime - Listening start timestamp
 * @param {number} data.readingStartTime - Reading start timestamp
 * @param {number} data.writingStartTime - Writing start timestamp
 * @param {boolean} data.listeningCompleted - Whether listening is completed
 * @param {boolean} data.readingCompleted - Whether reading is completed
 * @param {boolean} data.writingCompleted - Whether writing is completed
 * @param {string} data.mockTestId - Mock test ID
 */
export const saveMockTestData = (mockTestId, data) => {
  try {
    const key = `${STORAGE_KEY_PREFIX}${mockTestId}`;
    const storageData = {
      ...data,
      mockTestId,
      lastSaved: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(storageData));
  } catch (error) {
    console.error('[mockTestStorage] Error saving mock test data:', error);
  }
};

/**
 * Load mock test progress
 * @param {string} mockTestId - Mock test ID
 * @returns {object|null} Saved progress data or null
 */
export const loadMockTestData = (mockTestId) => {
  try {
    const key = `${STORAGE_KEY_PREFIX}${mockTestId}`;
    const data = localStorage.getItem(key);
    if (!data) return null;
    return JSON.parse(data);
  } catch (error) {
    console.error('[mockTestStorage] Error loading mock test data:', error);
    return null;
  }
};

/**
 * Clear mock test progress
 * @param {string} mockTestId - Mock test ID
 */
export const clearMockTestData = (mockTestId) => {
  try {
    const key = `${STORAGE_KEY_PREFIX}${mockTestId}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.error('[mockTestStorage] Error clearing mock test data:', error);
  }
};

/**
 * Clear all mock test data
 */
export const clearAllMockTestData = () => {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith(STORAGE_KEY_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('[mockTestStorage] Error clearing all mock test data:', error);
  }
};

/**
 * Clear all mock test data for a specific mock test ID
 * This includes:
 * - Main progress data (mock_test_${mockTestId})
 * - Completion signals (mock_test_${mockTestId}_listening_completed, etc.)
 * - Result data (mock_test_${mockTestId}_listening_result, etc.)
 * @param {string} mockTestId - Mock test ID
 */
export const clearAllMockTestDataForId = (mockTestId) => {
  try {
    if (!mockTestId) {
      console.warn('[mockTestStorage] clearAllMockTestDataForId: mockTestId is required');
      return;
    }

    // List of all possible localStorage keys for this mock test
    const keysToRemove = [
      // Main progress data
      `${STORAGE_KEY_PREFIX}${mockTestId}`,
      // Listening completion signals
      `${STORAGE_KEY_PREFIX}${mockTestId}_listening_completed`,
      `${STORAGE_KEY_PREFIX}${mockTestId}_listening_result`,
      // Reading completion signals
      `${STORAGE_KEY_PREFIX}${mockTestId}_reading_completed`,
      `${STORAGE_KEY_PREFIX}${mockTestId}_reading_result`,
      // Writing completion signals
      `${STORAGE_KEY_PREFIX}${mockTestId}_writing_completed`,
      `${STORAGE_KEY_PREFIX}${mockTestId}_writing_result`,
    ];

    // Remove each key
    keysToRemove.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch (err) {
        console.warn(`[mockTestStorage] Error removing key ${key}:`, err);
      }
    });

    // Also check for any other keys that might start with the pattern
    // (in case there are other variations we haven't accounted for)
    const allKeys = Object.keys(localStorage);
    allKeys.forEach((key) => {
      if (key.startsWith(`${STORAGE_KEY_PREFIX}${mockTestId}_`) || 
          key === `${STORAGE_KEY_PREFIX}${mockTestId}`) {
        try {
          localStorage.removeItem(key);
        } catch (err) {
          console.warn(`[mockTestStorage] Error removing key ${key}:`, err);
        }
      }
    });

    console.log(`[mockTestStorage] Cleared all data for mock test: ${mockTestId}`);
  } catch (error) {
    console.error('[mockTestStorage] Error clearing all mock test data for ID:', error);
  }
};

/**
 * Save section-specific data
 * @param {string} mockTestId - Mock test ID
 * @param {string} section - Section name: 'listening' | 'reading' | 'writing'
 * @param {object} sectionData - Section-specific data
 */
export const saveSectionData = (mockTestId, section, sectionData) => {
  const currentData = loadMockTestData(mockTestId) || {};
  // Always use sectionData.answers if provided, even if it's an empty object
  // This ensures answers are saved correctly and not lost
  const answersToSave = sectionData.answers !== undefined 
    ? sectionData.answers 
    : (currentData[`${section}Answers`] || {});
  
  const updatedData = {
    ...currentData,
    [`${section}Answers`]: answersToSave,
    [`${section}TimeRemaining`]: sectionData.timeRemaining ?? currentData[`${section}TimeRemaining`],
    [`${section}StartTime`]: sectionData.startTime ?? currentData[`${section}StartTime`],
    [`${section}Completed`]: sectionData.completed ?? currentData[`${section}Completed`] ?? false,
    currentSection: section,
  };
  saveMockTestData(mockTestId, updatedData);
};

/**
 * Load section-specific data
 * @param {string} mockTestId - Mock test ID
 * @param {string} section - Section name: 'listening' | 'reading' | 'writing'
 * @returns {object|null} Section data or null
 */
export const loadSectionData = (mockTestId, section) => {
  const data = loadMockTestData(mockTestId);
  if (!data) return null;

  return {
    answers: data[`${section}Answers`] || {},
    timeRemaining: data[`${section}TimeRemaining`],
    startTime: data[`${section}StartTime`],
    completed: data[`${section}Completed`] || false,
  };
};

