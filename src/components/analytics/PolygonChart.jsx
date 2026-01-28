import React, { useMemo } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts';

/**
 * PolygonChart - Displays data in an animated polygon (radar) format using Recharts
 * @param {Array} data - Array of { label, value, color } objects
 */
const PolygonChart = ({ data = [] }) => {
  // Prepare data for Recharts RadarChart
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    return data.map((item) => ({
      subject: item.label,
      value: item.value || 0,
      fullMark: 100,
    }));
  }, [data]);

  // Get the primary color for the filled area (use average or first item's color)
  const averageValue = useMemo(() => {
    if (data.length === 0) return 0;
    const sum = data.reduce((acc, item) => acc + (item.value || 0), 0);
    return sum / data.length;
  }, [data]);

  const getGradientColor = (value) => {
    if (value >= 80) return '#10b981'; // green
    if (value >= 60) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  // Use the most common color or average-based color
  const fillColor = useMemo(() => {
    if (data.length === 0) return '#3b82f6';
    
    // Count colors
    const colorCounts = {};
    data.forEach(item => {
      const color = item.color || getGradientColor(item.value || 0);
      colorCounts[color] = (colorCounts[color] || 0) + 1;
    });
    
    // Get most common color
    const mostCommonColor = Object.keys(colorCounts).reduce((a, b) => 
      colorCounts[a] > colorCounts[b] ? a : b
    );
    
    return mostCommonColor || getGradientColor(averageValue);
  }, [data, averageValue]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ width: "100%", height: "500px" }}>
        <p className="text-gray-400 text-sm">No data</p>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "500px" }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={chartData} margin={{ top: 50, right: 70, bottom: 50, left: 70 }}>
          <PolarGrid 
            stroke="#e5e7eb" 
            strokeWidth={1}
            gridType="polygon"
          />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ 
              fill: '#6b7280', 
              fontSize: 10,
              fontWeight: 600,
            }}
            tickLine={false}
            axisLine={false}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={false}
            axisLine={false}
            tickCount={5}
          />
          <Radar
            name="Performance"
            dataKey="value"
            stroke={fillColor}
            fill={fillColor}
            fillOpacity={0.3}
            strokeWidth={2}
            dot={{ fill: fillColor, r: 4 }}
            activeDot={{ r: 6 }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PolygonChart;
