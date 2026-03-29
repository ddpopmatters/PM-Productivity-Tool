import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

/**
 * AnalyticsWidget - Dashboard widget showing task completion trends
 *
 * @param {Array} todos - Array of personal todo items
 * @param {Array} entries - Array of project entries
 */
export default function AnalyticsWidget({ todos = [], entries = [] }) {
  // Calculate completion stats for last 7 days
  const stats = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().slice(0, 10);

      // Count completed todos for this date
      const completedTodos = todos.filter(t =>
        t.completed && t.completed_at?.slice(0, 10) === dateStr
      ).length;

      // Count todos that were scheduled for this date and completed
      const scheduledCompleted = todos.filter(t =>
        t.completed && t.date === dateStr
      ).length;

      // Use the higher of the two counts
      const completed = Math.max(completedTodos, scheduledCompleted);

      days.push({
        date: date.toLocaleDateString('en-GB', { weekday: 'short' }),
        fullDate: dateStr,
        completed,
      });
    }
    return days;
  }, [todos]);

  // Calculate total stats
  const totalStats = useMemo(() => {
    const totalTodos = todos.length;
    const completedTodos = todos.filter(t => t.completed).length;
    const completionRate = totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0;

    const totalProjects = entries.filter(e => e.itemType !== 'job').length;
    const activeProjects = entries.filter(e =>
      e.itemType !== 'job' &&
      e.workflowStatus?.toLowerCase() !== 'done' &&
      !e.archived
    ).length;

    return {
      totalTodos,
      completedTodos,
      completionRate,
      totalProjects,
      activeProjects,
    };
  }, [todos, entries]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white px-3 py-2 border border-ocean-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-ocean-900">{label}</p>
          <p className="text-sm text-graystone-600">
            {payload[0].value} task{payload[0].value !== 1 ? 's' : ''} completed
          </p>
        </div>
      );
    }
    return null;
  };

  const hasData = stats.some(day => day.completed > 0);

  return (
    <div className="bg-white rounded-xl border border-graystone-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-lg text-ocean-900">Task Completion</h3>
        <span className="text-sm text-graystone-500">Last 7 days</span>
      </div>

      {hasData ? (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={stats} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6d6d6d', fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6d6d6d', fontSize: 12 }}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="completed"
              fill="#0077b6"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[180px] flex items-center justify-center text-graystone-400 text-sm">
          No completed tasks in the last 7 days
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-graystone-200">
        <div className="text-center">
          <p className="text-2xl font-bold text-ocean-900">{totalStats.completedTodos}</p>
          <p className="text-xs text-graystone-500">Completed</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-ocean-900">{totalStats.completionRate}%</p>
          <p className="text-xs text-graystone-500">Completion Rate</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-ocean-900">{totalStats.activeProjects}</p>
          <p className="text-xs text-graystone-500">Active Projects</p>
        </div>
      </div>
    </div>
  );
}
