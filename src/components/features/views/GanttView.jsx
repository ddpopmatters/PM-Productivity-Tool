import React from 'react';
import clsx from 'clsx';

/**
 * GanttView - Timeline/Gantt chart view for entries
 *
 * Displays entries on a horizontal timeline based on their dates.
 * Entries without valid dates are filtered out.
 *
 * @param {Array} entries - Array of entry objects with date/timelineValue fields
 * @param {function} onOpen - Called with entry.id when an entry bar is clicked
 */
function GanttView({ entries, onOpen }) {
  // Filter entries with valid dates
  const validEntries = entries.filter(entry => {
    const dateStr = entry.date || entry.timelineValue;
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return !isNaN(d.getTime());
  });

  // Empty state
  if (validEntries.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-graystone-200 shadow-sm p-12 text-center">
        <i data-lucide="calendar-x" className="w-12 h-12 text-graystone-300 mx-auto mb-3" aria-hidden="true"></i>
        <div className="text-sm text-graystone-500 mb-3">No items with valid dates to display</div>
        <p className="text-xs text-graystone-400">Items need a date or deadline to appear in the Gantt view</p>
      </div>
    );
  }

  // Calculate date range for valid entries
  const allDates = validEntries.flatMap(entry => {
    const deadline = new Date(entry.date || entry.timelineValue);
    const start = entry.startDate ? new Date(entry.startDate) : new Date(deadline.getTime() - 7 * 24 * 60 * 60 * 1000);
    return [start, deadline];
  }).filter(d => !isNaN(d.getTime()));

  const minDate = new Date(Math.min(...allDates));
  const maxDate = new Date(Math.max(...allDates));
  const totalDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) || 1;

  const sortedEntries = [...validEntries].sort((a, b) => {
    const aStart = a.startDate ? new Date(a.startDate) : new Date(new Date(a.date || a.timelineValue).getTime() - 7 * 24 * 60 * 60 * 1000);
    const bStart = b.startDate ? new Date(b.startDate) : new Date(new Date(b.date || b.timelineValue).getTime() - 7 * 24 * 60 * 60 * 1000);
    return aStart - bStart;
  });

  return (
    <div className="bg-white rounded-xl border border-graystone-200 shadow-sm overflow-x-auto max-w-full">
      <div className="min-w-[800px] p-6">
        <div className="space-y-6">
          {sortedEntries.map(entry => {
            const deadline = new Date(entry.date || entry.timelineValue);
            const start = new Date(entry.startDate || deadline.getTime() - 7 * 24 * 60 * 60 * 1000);

            const daysFromStart = Math.ceil((start - minDate) / (1000 * 60 * 60 * 24));
            const duration = Math.ceil((deadline - start) / (1000 * 60 * 60 * 24)) || 1;

            const leftPercent = (daysFromStart / totalDays) * 100;
            const widthPercent = (duration / totalDays) * 100;

            return (
              <div key={entry.id} className="relative">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-sm text-ocean-900 w-48 truncate heading-font" title={entry.title}>{entry.title}</div>
                  <div className="text-xs text-graystone-500">
                    {entry.startDate ? `${entry.startDate} → ${entry.date || entry.timelineValue}` : entry.timelineValue}
                  </div>
                </div>
                <div className="h-8 bg-graystone-50 rounded-full relative overflow-hidden">
                  <div
                    className={clsx(
                      "absolute top-0 bottom-0 rounded-full flex items-center px-3 text-xs font-medium text-white transition-all hover:opacity-90 cursor-pointer",
                      entry.workflowStatus === 'Done' ? "bg-green-500" : "bg-ocean-500"
                    )}
                    style={{
                      width: `${Math.max(widthPercent, 5)}%`,
                      left: `${leftPercent}%`
                    }}
                    onClick={() => onOpen(entry.id)}
                    title={`${duration} day${duration !== 1 ? 's' : ''}`}
                  >
                    <span className="truncate">{entry.workflowStatus}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default GanttView;
