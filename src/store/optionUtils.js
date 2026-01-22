/**
 * Utility functions for option handling across question components
 */

/**
 * Sort options by letter (A, B, C, D, etc.) or by index if no letter
 */
export const sortOptionsByLetter = (options = []) => {
  return [...options].sort((a, b) => {
    const aLetter = a.letter || '';
    const bLetter = b.letter || '';
    if (aLetter && bLetter) {
      return aLetter.localeCompare(bLetter);
    }
    // If no letter, maintain original order (by id or index)
    return (a.id || 0) - (b.id || 0);
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
 * For multiple_choice and table: use option_text (not letter)
 */
export const getOptionValue = (option) => {
  // For multiple_choice and table types, use option_text as the value
  return option.option_text || option.text || '';
};

/**
 * Check if an option matches the answer
 * For multiple_choice and table: match by option_text
 */
export const isOptionSelected = (option, answer) => {
  const optionValue = getOptionValue(option);
  // Match by option_text (primary) or letter (fallback for other types)
  return answer === optionValue || 
         answer === optionValue.toLowerCase() ||
         (option.letter && answer === option.letter) ||
         (option.letter && answer === option.letter.toLowerCase());
};

