import { useState } from 'react';
import { Icon } from '../../ui';

function getDaysInMonth(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDay = (firstDay.getDay() + 6) % 7; // Monday = 0
  return { daysInMonth, startingDay, year, month };
}

function getWeekDays(baseDate) {
  const startOfWeek = new Date(baseDate);
  const day = startOfWeek.getDay();
  const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
  startOfWeek.setDate(diff);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    days.push(d);
  }
  return days;
}

export default function DashboardCalendar({
  today,
  getScheduledItems,
  onOpenEntry,
  onOpenWorkstreamTask,
}) {
  const [calendarView, setCalendarView] = useState('month');
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  const { daysInMonth, startingDay, year, month } = getDaysInMonth(calendarMonth);

  const navigateCalendar = (direction) => {
    const newDate = new Date(calendarMonth);
    if (calendarView === 'month') newDate.setMonth(newDate.getMonth() + direction);
    else if (calendarView === 'week') newDate.setDate(newDate.getDate() + direction * 7);
    else newDate.setDate(newDate.getDate() + direction);
    setCalendarMonth(newDate);
  };

  const renderItemRow = (item, idx, { compact } = {}) => {
    const clickable = item.type !== 'todo';
    const handleClick = () => {
      if (item.type === 'workstream') onOpenWorkstreamTask?.(item.workstream_id, item.id);
      else if (clickable) onOpenEntry?.(item.parentId || item.id);
    };
    const typeBg = {
      project: 'bg-ocean-200 text-ocean-800',
      job: 'bg-green-200 text-green-800',
      subtask: 'bg-blue-200 text-blue-800',
      workstream: 'bg-violet-200 text-violet-800',
    }[item.type] || 'bg-graystone-200 text-graystone-800';

    const borderBg = {
      project: 'bg-ocean-50 border-ocean-200',
      job: 'bg-green-50 border-green-200',
      subtask: 'bg-blue-50 border-blue-200',
      workstream: 'bg-violet-50 border-violet-200',
    }[item.type] || 'bg-graystone-50 border-graystone-200';

    if (compact) {
      return (
        <div
          key={idx}
          onClick={handleClick}
          className={`p-2 rounded-lg text-sm flex items-center gap-2 ${clickable ? 'cursor-pointer hover:bg-ocean-100' : ''} bg-ocean-50`}
        >
          <span className={`text-xs px-1.5 py-0.5 rounded ${typeBg}`}>{item.type}</span>
          <span className="truncate">{item.title || item.text}</span>
        </div>
      );
    }

    return (
      <div
        key={idx}
        onClick={handleClick}
        className={`p-3 rounded-lg border ${clickable ? 'cursor-pointer hover:border-ocean-500' : ''} ${borderBg}`}
      >
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full ${typeBg}`}>{item.type}</span>
          <span className="font-medium text-sm truncate">{item.title || item.text}</span>
        </div>
        {item.parentTitle && (
          <div className="text-xs text-graystone-500 mt-1">From: {item.parentTitle}</div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-graystone-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-lg text-ocean-900 flex items-center gap-2 tracking-wide">
          <Icon name="calendar" className="w-5 h-5" />
          Calendar
        </h3>
        <select
          value={calendarView}
          onChange={(e) => setCalendarView(e.target.value)}
          className="text-sm border border-ocean-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-ocean-500"
        >
          <option value="month">Month</option>
          <option value="week">Week</option>
          <option value="day">Day</option>
        </select>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigateCalendar(-1)} className="p-2 hover:bg-ocean-50 rounded-lg transition">
          <Icon name="chevron-left" className="w-4 h-4 text-ocean-600" />
        </button>
        <span className="font-medium text-ocean-900">
          {calendarView === 'day'
            ? calendarMonth.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
            : calendarMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
        </span>
        <button onClick={() => navigateCalendar(1)} className="p-2 hover:bg-ocean-50 rounded-lg transition">
          <Icon name="chevron-right" className="w-4 h-4 text-ocean-600" />
        </button>
      </div>

      {/* Month View */}
      {calendarView === 'month' && (
        <div>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
              <div key={d} className="text-center text-xs font-medium text-graystone-500 py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startingDay }).map((_, i) => (
              <div key={`empty-${i}`} className="h-10" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const items = getScheduledItems(dateStr);
              const isToday = dateStr === today;
              const isSelected = selectedDate === dateStr;
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  className={`h-10 rounded-lg text-sm relative flex flex-col items-center justify-center transition ${
                    isToday ? 'bg-ocean-500 text-white font-bold' : isSelected ? 'bg-ocean-100 text-ocean-900' : 'hover:bg-ocean-50 text-ocean-900'
                  }`}
                >
                  <span>{day}</span>
                  {items.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5">
                      {items.slice(0, 3).map((_, idx) => (
                        <div key={idx} className={`w-1 h-1 rounded-full ${isToday ? 'bg-white' : 'bg-ocean-500'}`} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Week View */}
      {calendarView === 'week' && (
        <div className="grid grid-cols-7 gap-2">
          {getWeekDays(calendarMonth).map((d) => {
            const dateStr = d.toISOString().slice(0, 10);
            const items = getScheduledItems(dateStr);
            const isToday = dateStr === today;
            const isSelected = selectedDate === dateStr;
            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                className={`p-2 rounded-lg text-center transition ${
                  isToday ? 'bg-ocean-500 text-white' : isSelected ? 'bg-ocean-100' : 'hover:bg-ocean-50'
                }`}
              >
                <div className="text-xs font-medium">{d.toLocaleDateString('en-GB', { weekday: 'short' })}</div>
                <div className="text-lg font-bold">{d.getDate()}</div>
                {items.length > 0 && (
                  <div className={`text-xs ${isToday ? 'text-white/80' : 'text-ocean-600'}`}>
                    {items.length} item{items.length !== 1 ? 's' : ''}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Day View */}
      {calendarView === 'day' && (() => {
        const dateStr = calendarMonth.toISOString().slice(0, 10);
        const items = getScheduledItems(dateStr);
        return items.length > 0 ? (
          <div className="space-y-2">{items.map((item, idx) => renderItemRow(item, idx))}</div>
        ) : (
          <div className="text-center py-8 text-graystone-400">
            <Icon name="calendar-x" className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No items scheduled</p>
          </div>
        );
      })()}

      {/* Selected Date Detail */}
      {selectedDate && calendarView !== 'day' && (
        <div className="mt-4 pt-4 border-t border-graystone-200">
          <h4 className="font-medium text-sm text-ocean-900 mb-2">
            {new Date(selectedDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h4>
          {(() => {
            const items = getScheduledItems(selectedDate);
            return items.length > 0 ? (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {items.map((item, idx) => renderItemRow(item, idx, { compact: true }))}
              </div>
            ) : (
              <p className="text-sm text-graystone-400">No items scheduled</p>
            );
          })()}
        </div>
      )}
    </div>
  );
}
