import React, { useState } from 'react';
import clsx from 'clsx';
import Icon from '../../ui/Icon';
import Badge from '../../ui/Badge';
import Button from '../../ui/Button';

/**
 * CalendarScreen - Project calendar with board and timeline views
 *
 * Features:
 * - Board view with columns by timeline type
 * - Timeline view with horizontal bars
 * - Filter by date, week, month, quarter, year
 * - Week view with month navigation
 *
 * @param {Array} entries - Project/job entries
 * @param {function} onBack - Back navigation callback
 * @param {function} openSubtaskModal - Open subtask modal callback
 * @param {function} onOpen - Open entry callback
 * @param {boolean} isEmbedded - Whether embedded in another view (hides header)
 * @param {string} selectBaseClasses - CSS classes for select elements
 */
const CalendarScreen = ({
  entries,
  onBack,
  openSubtaskModal,
  onOpen,
  isEmbedded = false,
  selectBaseClasses = "px-3 py-2 border border-graystone-300 rounded-lg focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500 outline-none"
}) => {
  const [timelineType, setTimelineType] = useState('quarter'); // 'date', 'week', 'month', 'quarter', 'year'
  const [viewMode, setViewMode] = useState('board'); // 'board', 'timeline'
  const [selectedMonth, setSelectedMonth] = useState(new Date()); // For week view

  const TIMELINE_TYPES = {
    'date': { label: 'By Date', options: [] }, // Dynamic
    'week': { label: 'By Week', options: [] }, // Dynamic based on month
    'month': { label: 'By Month', options: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] },
    'quarter': { label: 'By Quarter', options: ['Q1', 'Q2', 'Q3', 'Q4'] },
    'year': { label: 'By Year', options: ['2024', '2025', '2026'] }
  };

  const getWeeksInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const weeks = [];
    let currentDate = new Date(firstDay);

    // Start from the first Monday of or before the month
    currentDate.setDate(currentDate.getDate() - currentDate.getDay() + (currentDate.getDay() === 0 ? -6 : 1));

    while (currentDate <= lastDay || currentDate.getMonth() === month) {
      const weekStart = new Date(currentDate);
      const weekLabel = `Week commencing ${weekStart.getDate()} ${weekStart.toLocaleString('default', { month: 'short' })}`;
      const weekValue = weekStart.toISOString().slice(0, 10);
      weeks.push({ label: weekLabel, value: weekValue });

      currentDate.setDate(currentDate.getDate() + 7);

      // Stop if we've gone past the month
      if (currentDate.getMonth() > month && weeks.length > 0) break;
    }

    return weeks;
  };

  const getColumns = () => {
    if (timelineType === 'week') {
      const weeks = getWeeksInMonth(selectedMonth);
      return weeks.map(w => w.label);
    }
    return TIMELINE_TYPES[timelineType].options;
  };

  const renderBoardView = () => {
    const weeks = timelineType === 'week' ? getWeeksInMonth(selectedMonth) : [];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 overflow-x-auto pb-4">
        {getColumns().map((column, idx) => {
          let columnEntries;

          if (timelineType === 'week') {
            // For weeks, match based on the week start date
            const weekData = weeks[idx];
            columnEntries = entries.filter(e => {
              if (e.timelineType !== 'week') return false;
              // Check if entry's timelineValue falls within this week
              const entryDate = new Date(e.timelineValue);
              const weekStart = new Date(weekData.value);
              const weekEnd = new Date(weekStart);
              weekEnd.setDate(weekEnd.getDate() + 7);
              return entryDate >= weekStart && entryDate < weekEnd;
            });
          } else {
            columnEntries = entries.filter(e =>
              e.timelineType === timelineType && e.timelineValue === column
            );
          }

          return (
            <div key={column} className="min-w-[300px] bg-graystone-50 rounded-xl p-4 border border-graystone-200 flex flex-col h-full max-h-[calc(100vh-12rem)]">
              <div className="flex items-center justify-between mb-4 sticky top-0 bg-graystone-50 z-10 pb-2 border-b border-graystone-200">
                <h3 className="font-bold text-ocean-900">{column}</h3>
                <Badge variant="neutral">{columnEntries.length}</Badge>
              </div>
              <div className="space-y-3 overflow-y-auto flex-1 pr-2">
                {columnEntries.map(entry => (
                  <div key={entry.id} className="bg-white p-3 rounded-lg border border-graystone-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-start gap-2">
                        <h4 className="font-medium text-ocean-900 group-hover:text-ocean-700 heading-font">{entry.title}</h4>
                        {onOpen && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onOpen(entry.id); }}
                            className="p-1.5 rounded-full hover:bg-ocean-50 transition-colors"
                            title="Open"
                          >
                            <Icon name="external-link" className="w-4 h-4 text-ocean-700" />
                          </button>
                        )}
                      </div>
                      <Badge variant={entry.workflowStatus === 'Done' ? 'success' : 'default'} className="text-[10px]">
                        {entry.workflowStatus}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-graystone-500">
                      <span>{entry.owner}</span>
                      {entry.team && <span className="bg-graystone-100 px-1.5 py-0.5 rounded">{entry.team}</span>}
                    </div>
                    <div className="mt-3 pt-3 border-t border-graystone-100 flex justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openSubtaskModal(entry.id);
                        }}
                        className="text-xs text-ocean-600 hover:text-ocean-800 flex items-center gap-1"
                      >
                        <Icon name="plus" className="w-3 h-3" />
                        Add Subtask
                      </button>
                    </div>
                  </div>
                ))}
                {columnEntries.length === 0 && (
                  <div className="text-center py-8 text-graystone-400 text-sm border-2 border-dashed border-graystone-200 rounded-lg">
                    No items
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderTimelineView = () => {
    const columns = getColumns();
    return (
      <div className="bg-white rounded-xl border border-graystone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="bg-graystone-50 border-b border-graystone-200">
                <th className="px-4 py-3 text-left text-xs font-bold text-ocean-900 uppercase tracking-wider w-64 sticky left-0 bg-graystone-50 z-20 border-r border-graystone-200">Item</th>
                {columns.map(col => (
                  <th key={col} className="px-4 py-3 text-center text-xs font-bold text-ocean-900 uppercase tracking-wider min-w-[100px] border-r border-graystone-100 last:border-r-0">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-graystone-100">
              {entries.filter(e => e.timelineType === timelineType).map(entry => (
                <tr key={entry.id} className="hover:bg-ocean-50/50 transition-colors">
                  <td className="px-4 py-3 sticky left-0 bg-white z-10 border-r border-graystone-200">
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-sm text-ocean-900 heading-font">{entry.title}</div>
                      <Icon name="external-link" className="w-4 h-4 text-graystone-300" />
                    </div>
                    <div className="text-xs text-graystone-500 flex items-center gap-2 mt-1">
                      <span>{entry.owner}</span>
                      <Badge variant="neutral" className="text-[10px] py-0">{entry.workflowStatus}</Badge>
                    </div>
                  </td>
                  {columns.map(col => {
                    const isMatch = entry.timelineValue === col;
                    return (
                      <td key={col} className="px-2 py-3 border-r border-graystone-100 last:border-r-0 relative">
                        {isMatch && (
                          <div className="bg-ocean-100 text-ocean-700 text-xs font-medium px-2 py-1 rounded-md text-center border border-ocean-200 shadow-sm whitespace-nowrap overflow-hidden text-ellipsis">
                            {entry.workflowStatus}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {entries.filter(e => e.timelineType === timelineType).length === 0 && (
                <tr>
                  <td colSpan={columns.length + 1} className="px-4 py-8 text-center text-graystone-400 text-sm">
                    No items found for this timeline type.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header - hidden when embedded */}
      {!isEmbedded && (
        <div className="bg-gradient-to-r from-ocean-500 to-ocean-600 rounded-2xl p-8 text-white shadow-xl flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Project Calendar</h1>
            <p className="text-ocean-100">Visualize workflows across time</p>
          </div>
          <div className="flex items-center gap-4">
            {/* View Mode Toggle */}
            <div className="bg-black/20 p-1 rounded-lg border border-white/10 flex items-center">
              <button
                onClick={() => setViewMode('board')}
                className={clsx(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2",
                  viewMode === 'board' ? "bg-white text-ocean-700 shadow-sm" : "text-white/80 hover:text-white hover:bg-white/10"
                )}
              >
                <Icon name="layout-grid" className="w-4 h-4" />
                Board
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={clsx(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2",
                  viewMode === 'timeline' ? "bg-white text-ocean-700 shadow-sm" : "text-white/80 hover:text-white hover:bg-white/10"
                )}
              >
                <Icon name="gantt-chart" className="w-4 h-4" />
                Timeline
              </button>
            </div>
            <Button variant="ghost" onClick={onBack} className="text-white hover:bg-white/20 hover:text-white">
              <Icon name="arrow-left" className="w-4 h-4 mr-2" />
              Back to Menu
            </Button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-ocean-100 shadow-sm p-6 flex-1 flex flex-col">

        {/* Timeline Type Selector */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {Object.entries(TIMELINE_TYPES).map(([type, { label }]) => (
            <button
              key={type}
              onClick={() => setTimelineType(type)}
              className={clsx(
                "px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap",
                timelineType === type
                  ? "bg-ocean-600 text-white shadow-md"
                  : "bg-white text-graystone-600 border border-graystone-200 hover:border-ocean-300 hover:text-ocean-700"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Month Navigation for Week View */}
        {timelineType === 'week' && (
          <div className="flex items-center justify-center gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm border border-ocean-100">
            <label className="text-sm font-medium text-graystone-700">Select Month:</label>
            <select
              value={`${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}`}
              onChange={(e) => {
                const [year, month] = e.target.value.split('-');
                setSelectedMonth(new Date(parseInt(year), parseInt(month) - 1, 1));
              }}
              className={clsx(selectBaseClasses, "min-w-[200px]")}
            >
              {Array.from({ length: 24 }, (_, i) => {
                const date = new Date();
                date.setMonth(date.getMonth() - 12 + i);
                const year = date.getFullYear();
                const month = date.getMonth();
                const value = `${year}-${String(month + 1).padStart(2, '0')}`;
                const label = date.toLocaleString('default', { month: 'long', year: 'numeric' });
                return <option key={value} value={value}>{label}</option>;
              })}
            </select>
          </div>
        )}

        {viewMode === 'board' ? renderBoardView() : renderTimelineView()}
      </div>
    </div>
  );
};

export default CalendarScreen;
