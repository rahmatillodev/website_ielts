/**
 * Question Type Utilities
 * Maps question types to 7 grouped types for filtering
 */

// The 7 grouped question types for filtering
export const QUESTION_TYPE_GROUPS = [
  'multiple_choice',  // multiple_choice + multiple_answers
  'matching',         // 'table' + 'matching_information'
  'summary',          // 'fill_in_blanks' + 'drag_drop'
  'true_false_not_given',
  'yes_no_not_given',
  'map',
  'table_completion',
];

/**
 * Maps a question type to its grouped type (7 groups)
 * @param {string} type - The question type from the database
 * @returns {string} - The grouped question type
 */
export function mapQuestionTypeToGroup(type) {
  if (!type) return null;
  
  // Map combined types
  if (type === 'table' || type === 'matching_information') return 'matching';
  if (type === 'fill_in_blanks' || type === 'drag_drop') return 'summary';
  if (type === 'multiple_answers') return 'multiple_choice';
  
  // Direct 1:1 mapping for other types
  if (QUESTION_TYPE_GROUPS.includes(type)) return type;
  
  return null;
}

/**
 * Get display name for question type group
 * @param {string} groupType - The grouped question type
 * @returns {string} - Display name
 */
export function getQuestionTypeDisplayName(groupType) {
  const displayNames = {
    'multiple_choice': 'Multiple Choice',
    'matching': 'Matching',
    'summary': 'Summary',
    'true_false_not_given': 'True/False/Not Given',
    'yes_no_not_given': 'Yes/No/Not Given',
    'map': 'Map',
    'table_completion': 'Table Completion',
  };
  
  return displayNames[groupType] || groupType;
}

