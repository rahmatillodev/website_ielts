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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Score Progression</h3>
        <div className="h-[300px] flex items-center justify-center text-gray-500">No data available</div>
      </div>
    );
  }

  const chartData = scoreTrends.map((trend) => ({
    test: `T${trend.testNumber}`, // X-axis'da joy tejash uchun qisqartma
    fullTestName: `Test ${trend.testNumber}`,
    Reading: trend.reading !== null ? Number(trend.reading.toFixed(1)) : null,
    Listening: trend.listening !== null ? Number(trend.listening.toFixed(1)) : null,
  }));

  // Dinamik kenglikni hisoblash: har bir test uchun kamida 60px joy ajratamiz
  const minChartWidth = Math.max(scoreTrends.length * 60, 500);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="text-xs font-bold text-gray-500 mb-2">{payload[0].payload.fullTestName}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
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
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm overflow-hidden">
      <div className="mb-4">
        <div className='flex items-center justify-between'>
        <h3 className="text-lg font-semibold text-gray-900">Score Progression</h3>
        <div className='flex gap-3'>
        <div className='flex items-center gap-1'>
          <div className='w-2 h-2 rounded-full' style={{ backgroundColor: '#3b82f6' }}></div>
         <p>Reading</p>
         </div>
         <div className='flex items-center gap-1'>
          <div className='w-2 h-2 rounded-full' style={{ backgroundColor: '#ef4444' }}></div>
         <p>Listening</p>
        </div>
        </div>
        </div>
        { testLimit !== 'all' && <p className="text-sm text-gray-500 italic">Showing last {testLimit} tests</p> }
       
        { testLimit == 'all' && <p className="text-sm text-gray-500 italic">
          Scroll horizontally to see history →
        </p> }
      </div>

      {/* Scrollable Container */}
      <div className="overflow-x-auto custom-scrollbar pb-2">
        <div style={{ width: testLimit === 'all' ? `${minChartWidth}px` : '100%' }}>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis
                dataKey="test"
                axisLine={false}
                tickLine={false}
                fontSize={11}
                tick={{ fill: '#9ca3af' }}
                interval={0} // Barcha test raqamlarini majburan ko'rsatish
              />
              <YAxis
                domain={[0, 9]}
                ticks={[0, 2, 4, 6, 8, 9]}
                axisLine={false}
                tickLine={false}
                fontSize={11}
                tick={{ fill: '#9ca3af' }}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
              {/* <Legend verticalAlign="top" align="left" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '12px' }} /> */}
              <Bar
                dataKey="Reading"
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
                barSize={testLimit === 'all' ? 20 : 35} // "All" bo'lganda ustunlarni ingichka qilamiz
              />
              <Bar
                dataKey="Listening"
                fill="#ef4444"
                radius={[4, 4, 0, 0]}
                barSize={testLimit === 'all' ? 20 : 35}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default ScoreProgressionChart;