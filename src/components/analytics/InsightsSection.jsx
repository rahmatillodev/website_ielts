import React from 'react';
import { FaThumbsUp, FaExclamationTriangle } from 'react-icons/fa';
import { Button } from '@/components/ui/button';

const InsightsSection = ({ insights }) => {
  if (!insights) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Insights</h3>
        <div className="text-gray-500 text-sm">No insights available</div>
      </div>
    );
  }

  const { strongestArea, needsFocus } = insights;

  const getRecommendation = (type, questionType) => {
    if (type === 'Reading') {
      if (questionType.includes('Multiple Choice')) {
        return 'You consistently identify keywords correctly.';
      }
      if (questionType.includes('True / False')) {
        return 'Focus on understanding the difference between False and Not Given.';
      }
      if (questionType.includes('Fill in')) {
        return 'Pay attention to word limits and spelling.';
      }
      return 'Keep up the good work!';
    } else {
      if (questionType.includes('Part 1')) {
        return 'You handle everyday conversations well.';
      }
      if (questionType.includes('Part 3') || questionType.includes('Part 4')) {
        return 'Try following directions while visualizing the context.';
      }
      return 'Continue practicing regularly.';
    }
  };

  const getFocusRecommendation = (type, questionType) => {
    if (type === 'Reading') {
      if (questionType.includes('True / False')) {
        return 'Focus on understanding the difference between False and Not Given.';
      }
      if (questionType.includes('Matching')) {
        return 'Practice identifying key information in passages.';
      }
      return 'Review the question type and practice more.';
    } else {
      if (questionType.includes('Part 3') || questionType.includes('Part 4')) {
        return 'Try following directions while visualizing the map.';
      }
      return 'Practice this section more frequently.';
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Insights</h3>

      {/* Strongest Area */}
      {strongestArea && (
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-5">
          <div className="flex items-start gap-3 mb-3">
            <FaThumbsUp className="text-green-600 text-xl mt-1" />
            <div className="flex-1">
              <h4 className="text-sm font-black text-green-900 uppercase tracking-wide mb-2">
                STRONGEST AREA
              </h4>
              <div className="text-lg font-semibold text-gray-900 mb-1">
                {strongestArea.type}: {strongestArea.questionType}
              </div>
              <div className="text-sm font-semibold text-green-700 mb-2">
                {strongestArea.accuracy.toFixed(0)}% accuracy in last 5 tests
              </div>
              <p className="text-sm text-gray-600">
                {getRecommendation(strongestArea.type, strongestArea.questionType)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Needs Focus */}
      {needsFocus && (
        <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-5">
          <div className="flex items-start gap-3 mb-3">
            <FaExclamationTriangle className="text-orange-600 text-xl mt-1" />
            <div className="flex-1">
              <h4 className="text-sm font-black text-orange-900 uppercase tracking-wide mb-2">
                NEEDS FOCUS
              </h4>
              <div className="text-lg font-semibold text-gray-900 mb-1">
                {needsFocus.type}: {needsFocus.questionType}
              </div>
              <div className="text-sm font-semibold text-orange-700 mb-2">
                {needsFocus.accuracy.toFixed(0)}% accuracy
              </div>
              <p className="text-sm text-gray-600 mb-3">
                {getFocusRecommendation(needsFocus.type, needsFocus.questionType)}
              </p>
              
            </div>
          </div>
        </div>
      )}

      {!strongestArea && !needsFocus && (
        <div className="text-gray-500 text-sm text-center py-8">
          Complete more tests to see insights
        </div>
      )}
    </div>
  );
};

export default InsightsSection;

