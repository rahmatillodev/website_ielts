/**
 * Writing Task Type Utilities
 * Defines the 9 writing task types for filtering
 */

// The 9 writing task types for filtering
export const WRITING_TASK_TYPES = [
  'tables',
  'line_graph',
  'bar_chart',
  'pie_chart',
  'map',
  'process_diagram',
  'formal_letter',
  'semi_formal',
  'informal',
];

/**
 * Get display name for writing task type
 * @param {string} taskType - The task type
 * @returns {string} - Display name
 */
export function getWritingTaskTypeDisplayName(taskType) {
  const displayNames = {
    'tables': 'Tables',
    'line_graph': 'Line Graph',
    'bar_chart': 'Bar Chart',
    'pie_chart': 'Pie Chart',
    'map': 'Map',
    'process_diagram': 'Process Diagram',
    'formal_letter': 'Formal Letter',
    'semi_formal': 'Semi-Formal Letter',
    'informal': 'Informal Letter',
  };
  
  return displayNames[taskType] || taskType;
}

