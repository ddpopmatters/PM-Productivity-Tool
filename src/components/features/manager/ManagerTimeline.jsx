import React, { useState, useMemo, useRef, useCallback } from 'react';
import Icon from '../../ui/Icon';

const cx = (...xs) => xs.filter(Boolean).join(" ");

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const STATUS_COLORS = {
  'Idea':              { bg: 'bg-graystone-300', ring: 'ring-graystone-400', hex: '#9ca3af' },
  'Discovery':         { bg: 'bg-purple-400',    ring: 'ring-purple-500',    hex: '#a855f7' },
  'Preparation':       { bg: 'bg-amber-400',     ring: 'ring-amber-500',     hex: '#f59e0b' },
  'In Delivery':       { bg: 'bg-ocean-500',      ring: 'ring-ocean-600',     hex: '#0ea5e9' },
  'Delivered':         { bg: 'bg-teal-400',       ring: 'ring-teal-500',      hex: '#2dd4bf' },
  'Impact Assessment': { bg: 'bg-indigo-400',     ring: 'ring-indigo-500',    hex: '#818cf8' },
  'Done':              { bg: 'bg-green-500',       ring: 'ring-green-600',     hex: '#22c55e' },
};

const DEFAULT_COLOR = { bg: 'bg-graystone-400', ring: 'ring-graystone-500', hex: '#9ca3af' };

function getStatusColor(status) {
  if (!status) return DEFAULT_COLOR;
  return STATUS_COLORS[status] || DEFAULT_COLOR;
}

/**
 * Parse a date-like value to a day-of-year (0-based) within the given year.
 * Returns null if the item doesn't fall in the target year.
 */
function parseDatePosition(dateStr, timelineValue, year) {
  const raw = dateStr || timelineValue;
  if (!raw) return null;

  // Full date: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const d = new Date(raw);
    if (d.getFullYear() !== year) return null;
    const start = new Date(year, 0, 1);
    return Math.floor((d - start) / 86400000);
  }

  // Month: YYYY-MM
  if (/^\d{4}-\d{2}$/.test(raw)) {
    const [y, m] = raw.split('-').map(Number);
    if (y !== year) return null;
    // Place at the 15th of the month
    const d = new Date(year, m - 1, 15);
    const start = new Date(year, 0, 1);
    return Math.floor((d - start) / 86400000);
  }

  // Quarter: YYYY-Q1..Q4
  if (/^\d{4}-Q[1-4]$/.test(raw)) {
    const y = parseInt(raw.slice(0, 4));
    const q = parseInt(raw.slice(6));
    if (y !== year) return null;
    // Place at mid-quarter
    const midMonth = (q - 1) * 3 + 1; // 0-indexed: Q1→1 (Feb), Q2→4 (May), etc.
    const d = new Date(year, midMonth, 15);
    const start = new Date(year, 0, 1);
    return Math.floor((d - start) / 86400000);
  }

  // Year only
  if (/^\d{4}$/.test(raw)) {
    if (parseInt(raw) !== year) return null;
    return 182; // mid-year
  }

  return null;
}

function getDaysInYear(year) {
  return ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) ? 366 : 365;
}

const ManagerTimeline = ({
  items,
  selectedManager,
  selectedYear,
  setSelectedYear,
  onOpen,
  Badge,
}) => {
  const [hoveredItem, setHoveredItem] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [statusFilter, setStatusFilter] = useState('all');
  const containerRef = useRef(null);

  const reports = selectedManager?.reports || [];
  const totalDays = getDaysInYear(selectedYear);

  // Today marker position
  const now = new Date();
  const todayPosition = useMemo(() => {
    if (now.getFullYear() !== selectedYear) return null;
    const start = new Date(selectedYear, 0, 1);
    return Math.floor((now - start) / 86400000);
  }, [selectedYear]);

  // Month boundary positions (percentage)
  const monthBoundaries = useMemo(() => {
    return MONTHS.map((_, i) => {
      const d = new Date(selectedYear, i, 1);
      const start = new Date(selectedYear, 0, 1);
      return (d - start) / 86400000 / totalDays * 100;
    });
  }, [selectedYear, totalDays]);

  // Group items by member, compute positions
  const memberRows = useMemo(() => {
    return reports.map(memberName => {
      const memberItems = items
        .filter(i => i.owner?.some(o => o.toLowerCase() === memberName.toLowerCase()))
        .map(item => {
          const dayPos = parseDatePosition(item.date, item.timelineValue, selectedYear);
          if (dayPos === null) return null;
          return {
            ...item,
            dayPos,
            pct: (dayPos / totalDays) * 100,
          };
        })
        .filter(Boolean);

      // Filter by status
      const filtered = statusFilter === 'all'
        ? memberItems
        : memberItems.filter(i => i.workflowStatus === statusFilter);

      return {
        name: memberName,
        displayName: memberName.split('@')[0]?.replace('.', ' ').replace(/\b\w/g, c => c.toUpperCase()) || memberName,
        items: filtered,
        total: memberItems.length,
      };
    });
  }, [reports, items, selectedYear, totalDays, statusFilter]);

  // All unique statuses in the data for the legend
  const activeStatuses = useMemo(() => {
    const set = new Set();
    items.forEach(i => { if (i.workflowStatus) set.add(i.workflowStatus); });
    return Array.from(set);
  }, [items]);

  const handleDotHover = useCallback((e, item) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setTooltipPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
    setHoveredItem(item);
  }, []);

  const handleDotLeave = useCallback(() => {
    setHoveredItem(null);
  }, []);

  const todayPct = todayPosition !== null ? (todayPosition / totalDays) * 100 : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h3 className="text-lg font-semibold text-ocean-900">Visual Timeline</h3>
        <div className="flex items-center gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border border-graystone-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-ocean-500"
          >
            <option value="all">All statuses</option>
            {activeStatuses.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <button onClick={() => setSelectedYear(y => y - 1)} className="p-2 hover:bg-graystone-100 rounded-lg transition">
              <Icon name="chevron-left" className="w-4 h-4" />
            </button>
            <span className="font-semibold text-ocean-900 min-w-[60px] text-center">{selectedYear}</span>
            <button onClick={() => setSelectedYear(y => y + 1)} className="p-2 hover:bg-graystone-100 rounded-lg transition">
              <Icon name="chevron-right" className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {activeStatuses.map(status => {
          const color = getStatusColor(status);
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(prev => prev === status ? 'all' : status)}
              className={cx(
                "flex items-center gap-1.5 px-2 py-1 rounded-full border transition",
                statusFilter === status
                  ? "border-ocean-400 bg-ocean-50"
                  : "border-graystone-200 hover:border-graystone-300"
              )}
            >
              <span className={cx("w-2.5 h-2.5 rounded-full", color.bg)} />
              <span className="text-graystone-700">{status}</span>
            </button>
          );
        })}
        {statusFilter !== 'all' && (
          <button
            onClick={() => setStatusFilter('all')}
            className="text-xs text-ocean-600 hover:text-ocean-800 underline ml-1"
          >
            Clear filter
          </button>
        )}
      </div>

      {/* Timeline chart */}
      <div
        ref={containerRef}
        className="relative bg-white rounded-xl border border-graystone-200 shadow-sm overflow-hidden"
      >
        {/* Month header */}
        <div className="flex border-b border-graystone-200 bg-graystone-50">
          <div className="w-40 shrink-0 px-4 py-2 text-xs font-semibold text-ocean-900 border-r border-graystone-200">
            Team Member
          </div>
          <div className="flex-1 relative h-8">
            {MONTHS.map((month, i) => {
              const nextBound = i < 11 ? monthBoundaries[i + 1] : 100;
              const width = nextBound - monthBoundaries[i];
              return (
                <div
                  key={month}
                  className="absolute top-0 h-full flex items-center justify-center text-xs font-medium text-graystone-600 border-r border-graystone-200 last:border-r-0"
                  style={{ left: `${monthBoundaries[i]}%`, width: `${width}%` }}
                >
                  {month}
                </div>
              );
            })}
          </div>
        </div>

        {/* Member rows */}
        {memberRows.map((member, idx) => (
          <div
            key={member.name}
            className={cx(
              "flex border-b border-graystone-100 last:border-b-0 group/row",
              idx % 2 === 0 ? "bg-white" : "bg-graystone-50/50"
            )}
          >
            {/* Name column */}
            <div className="w-40 shrink-0 px-4 py-3 border-r border-graystone-200 flex items-center gap-2">
              <div className="min-w-0">
                <div className="text-sm font-medium text-ocean-900 truncate">{member.displayName}</div>
                <div className="text-xs text-graystone-400">{member.items.length} project{member.items.length !== 1 ? 's' : ''}</div>
              </div>
            </div>

            {/* Timeline bar */}
            <div className="flex-1 relative h-14">
              {/* Month grid lines */}
              {monthBoundaries.map((pct, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 border-r border-graystone-100"
                  style={{ left: `${pct}%` }}
                />
              ))}

              {/* Today line */}
              {todayPct !== null && (
                <div
                  className="absolute top-0 bottom-0 w-px bg-red-400 z-10"
                  style={{ left: `${todayPct}%` }}
                />
              )}

              {/* Project dots */}
              {member.items.map((item, dotIdx) => {
                const color = getStatusColor(item.workflowStatus);
                // Vertical jitter to avoid overlap
                const yOffset = 50 + (dotIdx % 3 - 1) * 14;
                return (
                  <button
                    key={item.id}
                    className={cx(
                      "absolute w-3.5 h-3.5 rounded-full -translate-x-1/2 -translate-y-1/2 transition-all ring-2 ring-white hover:ring-4 hover:scale-150 z-20 cursor-pointer",
                      color.bg,
                      hoveredItem?.id === item.id && "scale-150 ring-4 " + color.ring
                    )}
                    style={{
                      left: `${item.pct}%`,
                      top: `${yOffset}%`,
                    }}
                    onMouseEnter={(e) => handleDotHover(e, item)}
                    onMouseLeave={handleDotLeave}
                    onClick={() => onOpen && onOpen(item.id)}
                    title={item.title}
                  />
                );
              })}
            </div>
          </div>
        ))}

        {/* Empty state */}
        {memberRows.length === 0 && (
          <div className="py-12 text-center text-graystone-500">
            <Icon name="calendar" className="w-10 h-10 mx-auto mb-2 text-graystone-300" />
            <p className="text-sm">No team members to display</p>
          </div>
        )}

        {/* Today label at top */}
        {todayPct !== null && (
          <div
            className="absolute top-0 z-30 -translate-x-1/2"
            style={{ left: `calc(160px + (100% - 160px) * ${todayPct / 100})` }}
          >
            <div className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-b">
              Today
            </div>
          </div>
        )}

        {/* Tooltip */}
        {hoveredItem && (
          <div
            className="absolute z-50 pointer-events-none"
            style={{
              left: Math.min(tooltipPos.x, (containerRef.current?.offsetWidth || 600) - 260),
              top: tooltipPos.y - 80,
            }}
          >
            <div className="bg-ocean-900 text-white rounded-lg shadow-xl px-4 py-3 max-w-[250px]">
              <div className="font-semibold text-sm truncate">{hoveredItem.title}</div>
              <div className="flex items-center gap-2 mt-1.5 text-xs text-ocean-200">
                <span className={cx("w-2 h-2 rounded-full", getStatusColor(hoveredItem.workflowStatus).bg)} />
                {hoveredItem.workflowStatus || 'No status'}
              </div>
              {(hoveredItem.date || hoveredItem.timelineValue) && (
                <div className="text-xs text-ocean-300 mt-1">
                  {hoveredItem.date
                    ? new Date(hoveredItem.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                    : hoveredItem.timelineValue}
                </div>
              )}
              {hoveredItem.owner && (
                <div className="text-xs text-ocean-300 mt-0.5">
                  {Array.isArray(hoveredItem.owner) ? hoveredItem.owner.join(', ') : hoveredItem.owner}
                </div>
              )}
              <div className="text-[10px] text-ocean-400 mt-1.5">Click to open</div>
            </div>
          </div>
        )}
      </div>

      {/* Summary row */}
      <div className="flex items-center justify-between text-xs text-graystone-500 px-2">
        <span>
          {memberRows.reduce((sum, m) => sum + m.items.length, 0)} project{memberRows.reduce((sum, m) => sum + m.items.length, 0) !== 1 ? 's' : ''} shown
          {statusFilter !== 'all' && ` (filtered: ${statusFilter})`}
        </span>
        {todayPct !== null && (
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-px bg-red-400 inline-block" />
            Today ({now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })})
          </span>
        )}
      </div>
    </div>
  );
};

export default ManagerTimeline;
