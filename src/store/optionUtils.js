/**
 * Utility functions for option handling across question components
 */

/**
 * Sort options by letter (A, B, C, D, etc.)
 */
export const sortOptionsByLetter = (options = []) => {
  return [...options].sort((a, b) => {
    const aLetter = a.letter || '';
    const bLetter = b.letter || '';
    return aLetter.localeCompare(bLetter);
  });
};

/**
 * Get option display text (with letter prefix if available)
 */
export const getOptionDisplayText = (option) => {
  if (option.letter) {
    return `${option.letter}. ${option.option_text || option.text || ''}`;
  }
  return option.option_text || option.text || '';
};

/**
 * Get option value for comparison/answer storage
 */
export const getOptionValue = (option) => {
  return option.option_text || option.text || option.letter || '';
};

/**
 * Check if an option matches the answer
 */
export const isOptionSelected = (option, answer) => {
  const optionValue = getOptionValue(option);
  return answer === optionValue || (option.letter && answer === option.letter);
};

