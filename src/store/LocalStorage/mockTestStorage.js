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
 * Save section-specific data
 * @param {string} mockTestId - Mock test ID
 * @param {string} section - Section name: 'listening' | 'reading' | 'writing'
 * @param {object} sectionData - Section-specific data
 */
export const saveSectionData = (mockTestId, section, sectionData) => {
  const currentData = loadMockTestData(mockTestId) || {};
  const updatedData = {
    ...currentData,
    [`${section}Answers`]: sectionData.answers || currentData[`${section}Answers`] || {},
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

