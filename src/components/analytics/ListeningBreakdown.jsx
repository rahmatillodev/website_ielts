import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { LuHeadphones } from 'react-icons/lu';
import PolygonChart from './PolygonChart';

const ListeningBreakdown = ({ listeningBreakdown }) => {
  // Format question type names (maps enum values to display names)
  const formatQuestionType = (type) => {
    const typeMap = {
      'multiple_choice': 'Multiple Choice',
      'fill_in_blanks': 'Fill in the Blanks',
      'table_completion': 'Table Completion',
      'drag_drop': 'Drag and Drop',
      'table': 'Matching Headings',
      'matching_information': 'Matching Information',
      'map': 'Map Labelling',
      'true_false_not_given': 'True / False / Not Given',
      'yes_no_not_given': 'Yes / No / Not Given',
    };
    return typeMap[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Prepare chart data - show all question types, even with 0 data
  const chartData = useMemo(() => {
    if (!listeningBreakdown) {
      return [];
    }

    const colors = [
      '#ef4444', // red
      '#f97316', // orange
      '#f59e0b', // yellow
      '#10b981', // green
      '#8b5cf6', // purple
      '#ec4899', // pink
      '#06b6d4', // cyan
      '#6366f1', // indigo
    ];

    return Object.entries(listeningBreakdown)
      .map(([type, stats], index) => {
        const accuracy = stats?.accuracy || 0;
        const total = stats?.total || 0;
        const correct = stats?.correct || 0;
        
        let color = colors[index % colors.length];
        
        // Color based on performance (only if there's data)
        if (total > 0) {
          if (accuracy >= 80) color = '#10b981'; // green
          else if (accuracy >= 60) color = '#f59e0b'; // yellow
          else color = '#ef4444'; // red
        } else {
          // Gray for no data
          color = '#9ca3af';
        }

        return {
          label: formatQuestionType(type),
          value: Math.min(accuracy, 100),
          color,
          correct,
          total,
        };
      })
      .sort((a, b) => {
        // Sort: data with answers first (by accuracy), then no data
        if (a.total > 0 && b.total === 0) return -1;
        if (a.total === 0 && b.total > 0) return 1;
        return b.value - a.value; // Sort by accuracy (highest first)
      });
  }, [listeningBreakdown]);

  // Always show the breakdown, even if all values are 0
  if (!listeningBreakdown) {
    return (
      <motion.div
        className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <LuHeadphones className="text-red-600 text-xl" />
          <h3 className="text-lg font-semibold text-gray-900">Listening Breakdown</h3>
        </div>
        <div className="text-gray-500 text-sm">Loading...</div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center gap-2 mb-6">
        <LuHeadphones className="text-red-600 text-xl" />
        <h3 className="text-lg font-semibold text-gray-900">Listening Breakdown</h3>
      </div>
      
      {/* Polygon Chart */}
      <div className="flex justify-center mb-6">
        <PolygonChart data={chartData} />
      </div>

      {/* Detailed List */}
      <div className="space-y-3 mt-6">
        {chartData.map((item, index) => (
          <motion.div
            key={index}
            className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 1.2 + index * 0.1 }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm font-semibold text-gray-700">
                {item.label}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span
                className="text-sm font-bold"
                style={{ color: item.color }}
              >
                {item.value.toFixed(0)}%
              </span>
              <span className="text-xs text-gray-500">
                {item.correct} / {item.total}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default ListeningBreakdown;

