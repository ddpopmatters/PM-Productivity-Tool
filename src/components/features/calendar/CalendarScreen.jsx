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

  const currentYear = new Date().getFullYear();
  const TIMELINE_TYPES = {
    'date': { label: 'By Date', options: [] }, // Dynamic
    'week': { label: 'By Week', options: [] }, // Dynamic based on month
    'month': { label: 'By Month', options: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] },
    'quarter': { label: 'By Quarter', options: ['Q1', 'Q2', 'Q3', 'Q4'] },
    'year': { label: 'By Year', options: [String(currentYear - 1), String(currentYear), String(currentYear + 1)] }
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
    if (timelineType === 'date') {
      // Get unique dates from entries
      const dates = entries
        .map(e => e.date || e.timelineValue)
        .filter(d => d && !isNaN(new Date(d).getTime()))
        .map(d => new Date(d).toISOString().slice(0, 10))
        .filter((v, i, a) => a.indexOf(v) === i)
        .sort();
      return dates.length > 0 ? dates : ['No dated items'];
    }
    return TIMELINE_TYPES[timelineType].options;
  };

  // Helper to get entry date
  const getEntryDate = (entry) => {
    const dateStr = entry.date || entry.timelineValue;
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  };

  // Helper to get quarter from date
  const getQuarter = (date) => {
    const month = date.getMonth();
    return `Q${Math.floor(month / 3) + 1}`;
  };

  // Helper to get month name from date
  const getMonthName = (date) => {
    return date.toLocaleString('default', { month: 'long' });
  };

  const renderBoardView = () => {
    const weeks = timelineType === 'week' ? getWeeksInMonth(selectedMonth) : [];
    const columns = getColumns();

    // Pre-calculate entries for each column
    const columnData = columns.map((column, idx) => {
      let columnEntries;

      if (timelineType === 'week') {
        const weekData = weeks[idx];
        columnEntries = entries.filter(e => {
          const entryDate = getEntryDate(e);
          if (!entryDate) return false;
          const weekStart = new Date(weekData.value);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 7);
          return entryDate >= weekStart && entryDate < weekEnd;
        });
      } else if (timelineType === 'quarter') {
        columnEntries = entries.filter(e => {
          const entryDate = getEntryDate(e);
          return entryDate && getQuarter(entryDate) === column;
        });
      } else if (timelineType === 'month') {
        columnEntries = entries.filter(e => {
          const entryDate = getEntryDate(e);
          return entryDate && getMonthName(entryDate) === column;
        });
      } else if (timelineType === 'year') {
        columnEntries = entries.filter(e => {
          const entryDate = getEntryDate(e);
          return entryDate && String(entryDate.getFullYear()) === column;
        });
      } else {
        columnEntries = entries.filter(e => {
          const entryDate = getEntryDate(e);
          return entryDate && entryDate.toISOString().slice(0, 10) === column;
        });
      }

      return { column, entries: columnEntries };
    });

    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
        {columnData.map(({ column, entries: columnEntries }) => (
          <div
            key={column}
            style={{
              flex: '1 1 280px',
              maxWidth: '400px',
              backgroundColor: '#f8fafc',
              borderRadius: '12px',
              padding: '16px',
              border: '1px solid #e2e8f0'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ fontWeight: 'bold', color: '#0c4a6e', margin: 0 }}>{column}</h3>
              <span style={{ backgroundColor: '#e2e8f0', padding: '2px 8px', borderRadius: '9999px', fontSize: '12px' }}>{columnEntries.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {columnEntries.map(entry => (
                <div
                  key={entry.id}
                  onClick={() => onOpen && onOpen(entry.id)}
                  style={{
                    backgroundColor: 'white',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                    <h4 style={{ fontWeight: '500', color: '#0c4a6e', fontSize: '14px', margin: 0, lineHeight: '1.3' }}>{entry.title}</h4>
                    <span style={{
                      backgroundColor: entry.workflowStatus === 'Done' ? '#dcfce7' : '#f1f5f9',
                      color: entry.workflowStatus === 'Done' ? '#166534' : '#475569',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      whiteSpace: 'nowrap'
                    }}>
                      {entry.workflowStatus}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#64748b' }}>
                    <span>{entry.owner}</span>
                    {entry.team && <span style={{ backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{entry.team}</span>}
                  </div>
                </div>
              ))}
              {columnEntries.length === 0 && (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: '#94a3b8', fontSize: '14px', border: '2px dashed #e2e8f0', borderRadius: '8px' }}>
                  No items
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Helper to check if entry matches a column
  const entryMatchesColumn = (entry, column) => {
    const entryDate = getEntryDate(entry);
    if (!entryDate) return false;

    if (timelineType === 'quarter') {
      return getQuarter(entryDate) === column;
    } else if (timelineType === 'month') {
      return getMonthName(entryDate) === column;
    } else if (timelineType === 'year') {
      return String(entryDate.getFullYear()) === column;
    } else if (timelineType === 'date') {
      return entryDate.toISOString().slice(0, 10) === column;
    }
    return false;
  };

  // Get entries that have dates
  const entriesWithDates = entries.filter(e => getEntryDate(e) !== null);

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
              {entriesWithDates.map(entry => (
                <tr key={entry.id} className="hover:bg-ocean-50/50 transition-colors">
                  <td className="px-4 py-3 sticky left-0 bg-white z-10 border-r border-graystone-200">
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-sm text-ocean-900 heading-font">{entry.title}</div>
                      {onOpen && (
                        <button onClick={() => onOpen(entry.id)} className="p-1 hover:bg-ocean-50 rounded">
                          <Icon name="external-link" className="w-4 h-4 text-graystone-400 hover:text-ocean-600" />
                        </button>
                      )}
                    </div>
                    <div className="text-xs text-graystone-500 flex items-center gap-2 mt-1">
                      <span>{entry.owner}</span>
                      <Badge variant="neutral" className="text-[10px] py-0">{entry.workflowStatus}</Badge>
                    </div>
                  </td>
                  {columns.map(col => {
                    const isMatch = entryMatchesColumn(entry, col);
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
              {entriesWithDates.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 1} className="px-4 py-8 text-center text-graystone-400 text-sm">
                    No items with dates found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderYearHeatmap = () => {
    const year = new Date().getFullYear();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Count entries per month for current year
    const monthCounts = months.map((_, monthIndex) => {
      return entries.filter(e => {
        const entryDate = getEntryDate(e);
        if (!entryDate) return false;
        return entryDate.getFullYear() === year && entryDate.getMonth() === monthIndex;
      }).length;
    });

    const maxCount = Math.max(...monthCounts, 1);

    // Color scale function
    const getHeatColor = (count) => {
      if (count === 0) return '#f1f5f9'; // gray-100
      const intensity = count / maxCount;
      if (intensity < 0.25) return '#bae6fd'; // sky-200
      if (intensity < 0.5) return '#38bdf8'; // sky-400
      if (intensity < 0.75) return '#0284c7'; // sky-600
      return '#075985'; // sky-800
    };

    const totalItems = monthCounts.reduce((a, b) => a + b, 0);

    return (
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '16px',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontWeight: '600', color: '#0c4a6e', margin: 0, fontSize: '14px' }}>
            {year} Overview
          </h3>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            {totalItems} items
          </span>
        </div>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end' }}>
          {months.map((month, idx) => (
            <div key={month} style={{ flex: 1, textAlign: 'center' }}>
              <div
                style={{
                  height: `${Math.max(8, (monthCounts[idx] / maxCount) * 40)}px`,
                  backgroundColor: getHeatColor(monthCounts[idx]),
                  borderRadius: '4px',
                  marginBottom: '4px',
                  transition: 'all 0.2s'
                }}
                title={`${month}: ${monthCounts[idx]} items`}
              />
              <div style={{ fontSize: '10px', color: '#64748b' }}>{month}</div>
              {monthCounts[idx] > 0 && (
                <div style={{ fontSize: '10px', fontWeight: '600', color: '#0c4a6e' }}>{monthCounts[idx]}</div>
              )}
            </div>
          ))}
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

      <div className={clsx(!isEmbedded && "bg-white rounded-xl border border-ocean-100 shadow-sm p-6", "flex-1 flex flex-col")}>

        {/* Timeline Type Selector and View Toggle */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2">
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
          {/* View Mode Toggle for embedded */}
          <div className="flex items-center gap-1 bg-graystone-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('board')}
              className={clsx(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2",
                viewMode === 'board' ? "bg-white text-ocean-700 shadow-sm" : "text-graystone-600 hover:text-ocean-700"
              )}
            >
              <Icon name="layout-grid" className="w-4 h-4" />
              Board
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={clsx(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2",
                viewMode === 'timeline' ? "bg-white text-ocean-700 shadow-sm" : "text-graystone-600 hover:text-ocean-700"
              )}
            >
              <Icon name="gantt-chart" className="w-4 h-4" />
              Timeline
            </button>
          </div>
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

        {/* Year Heatmap */}
        {renderYearHeatmap()}

        {viewMode === 'board' ? renderBoardView() : renderTimelineView()}
      </div>
    </div>
  );
};

export default CalendarScreen;
