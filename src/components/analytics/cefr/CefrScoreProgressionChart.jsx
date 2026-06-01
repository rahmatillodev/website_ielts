import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { cefrLevelToOrdinal, CEFR_LEVEL_ORDER } from '@/lib/cefrAnalytics';

const READING_COLOR = '#10b981';
const LISTENING_COLOR = '#ef4444';

const toChartOrdinal = (level) => {
  const ordinal = cefrLevelToOrdinal(level);
  return ordinal != null ? ordinal : null;
};

const formatLevelLabel = (ordinal) => {
  if (ordinal == null || !Number.isFinite(ordinal)) return '';
  const idx = Math.round(ordinal) - 1;
  return CEFR_LEVEL_ORDER[idx] ?? '';
};

const CefrScoreProgressionChart = ({ scoreTrends, testLimit = '5' }) => {
  if (!scoreTrends || scoreTrends.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Level Progression
        </h3>
        <div className="h-[360px] flex items-center justify-center text-gray-500">
          No CEFR data available
        </div>
      </div>
    );
  }

  const chartData = scoreTrends.map((trend) => ({
    test: trend.dateLabel || `T${trend.testNumber}`,
    fullTestName: trend.dateLabel || `Test ${trend.testNumber}`,
    date: trend.date || null,
    readingOrdinal: toChartOrdinal(trend.reading),
    listeningOrdinal: toChartOrdinal(trend.listening),
    readingLabel: trend.reading || null,
    listeningLabel: trend.listening || null,
  }));

  const minChartWidth = Math.max(scoreTrends.length * 60, 500);

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const row = payload[0]?.payload;
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="text-xs font-bold text-gray-500 mb-2">{row.fullTestName}</p>
        {row.readingLabel && (
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: READING_COLOR }}
            />
            Reading: {row.readingLabel}
          </div>
        )}
        {row.listeningLabel && (
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mt-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: LISTENING_COLOR }}
            />
            Listening: {row.listeningLabel}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm overflow-hidden">
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Level Progression</h3>
          <div className="flex gap-3">
            <div className="flex items-center gap-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: READING_COLOR }}
              />
              <p>Reading</p>
            </div>
            <div className="flex items-center gap-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: LISTENING_COLOR }}
              />
              <p>Listening</p>
            </div>
          </div>
        </div>
        {testLimit !== 'all' && (
          <p className="text-sm text-gray-500 italic">
            Best CEFR level per day for the last {testLimit} days
          </p>
        )}
        {testLimit === 'all' && (
          <p className="text-sm text-gray-500 italic">
            Best level per day — scroll horizontally for more history →
          </p>
        )}
      </div>

      <div className="overflow-x-auto custom-scrollbar pb-2">
        <div
          style={{ width: testLimit === 'all' ? `${minChartWidth}px` : '100%' }}
        >
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis
                dataKey="test"
                axisLine={false}
                tickLine={false}
                fontSize={11}
                tick={{ fill: '#9ca3af' }}
                interval={0}
              />
              <YAxis
                domain={[1, 6]}
                ticks={[1, 2, 3, 4, 5, 6]}
                tickFormatter={formatLevelLabel}
                axisLine={false}
                tickLine={false}
                fontSize={11}
                tick={{ fill: '#9ca3af' }}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
              <Bar
                dataKey="readingOrdinal"
                name="Reading"
                fill={READING_COLOR}
                radius={[4, 4, 0, 0]}
                barSize={testLimit === 'all' ? 20 : 35}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`r-${index}`}
                    fill={entry.readingOrdinal != null ? READING_COLOR : 'transparent'}
                  />
                ))}
              </Bar>
              <Bar
                dataKey="listeningOrdinal"
                name="Listening"
                fill={LISTENING_COLOR}
                radius={[4, 4, 0, 0]}
                barSize={testLimit === 'all' ? 20 : 35}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`l-${index}`}
                    fill={
                      entry.listeningOrdinal != null ? LISTENING_COLOR : 'transparent'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default CefrScoreProgressionChart;
