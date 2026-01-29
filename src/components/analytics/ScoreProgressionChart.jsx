import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const ScoreProgressionChart = ({ scoreTrends, testLimit = '5' }) => {
  if (!scoreTrends || scoreTrends.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Score Progression
        </h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          No data available
        </div>
      </div>
    );
  }

  // Prepare data for chart (data is already in chronological order: oldest to newest)
  const chartData = scoreTrends.map((trend) => ({
    test: `Test ${trend.testNumber}`,
    Reading: trend.reading !== null ? Number(trend.reading.toFixed(1)) : null,
    Listening: trend.listening !== null ? Number(trend.listening.toFixed(1)) : null,
  }));

  const limitText = testLimit === 'all' 
    ? (scoreTrends.length > 0 ? `all ${scoreTrends.length} tests` : 'all tests')
    : `last ${testLimit} tests`;

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              ></div>
              <span className="text-sm font-semibold text-gray-700">
                {entry.name}: {entry.value !== null ? entry.value.toFixed(1) : 'N/A'}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Score Progression
      </h3>
      <p className="text-sm text-gray-500 mb-6">
        Reading vs Listening over the {limitText}
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="test"
            stroke="#6b7280"
            fontSize={12}
            tick={{ fill: '#6b7280' }}
          />
          <YAxis
            domain={[3, 9]}
            stroke="#6b7280"
            fontSize={12}
            tick={{ fill: '#6b7280' }}
            label={{ value: 'Score', angle: -90, position: 'insideLeft', style: { fill: '#6b7280' } }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="circle"
          />
          <Bar
            dataKey="Reading"
            fill="#3b82f6"
            radius={[4, 4, 0, 0]}
            name="Reading"
          />
          <Bar
            dataKey="Listening"
            fill="#ef4444"
            radius={[4, 4, 0, 0]}
            name="Listening"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ScoreProgressionChart;

