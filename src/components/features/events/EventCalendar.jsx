import React, { useState, useMemo } from 'react';
import clsx from 'clsx';
import Icon from '../../ui/Icon';
import EventChip from './EventChip';
import EventCreateModal, { CATEGORIES } from './EventCreateModal';
import EventDetailModal from './EventDetailModal';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const EventCalendar = ({
  events = [],
  entries = [],
  workstreams = [],
  workstreamTasks = [],
  currentUser,
  onCreateEvent,
  onUpdateEvent,
  onDeleteEvent,
  onNavigateToEntry,
  onNavigateToWorkstream,
}) => {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-indexed
  const [activeCategories, setActiveCategories] = useState(new Set(CATEGORIES.map(c => c.id)));
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createDate, setCreateDate] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);

  // Navigation
  const goToMonth = (year, month) => {
    if (month < 0) { setViewYear(year - 1); setViewMonth(11); }
    else if (month > 11) { setViewYear(year + 1); setViewMonth(0); }
    else { setViewYear(year); setViewMonth(month); }
  };

  const goToToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  };

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);

    // Monday = 0, Sunday = 6 (ISO week)
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;

    const days = [];

    // Previous month padding
    for (let i = startDow - 1; i >= 0; i--) {
      const d = new Date(viewYear, viewMonth, -i);
      days.push({ date: d, isCurrentMonth: false });
    }

    // Current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(viewYear, viewMonth, i), isCurrentMonth: true });
    }

    // Next month padding (fill to complete 6 rows)
    const remaining = 42 - days.length; // 6 rows × 7 days
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(viewYear, viewMonth + 1, i), isCurrentMonth: false });
    }

    return days;
  }, [viewYear, viewMonth]);

  // Map events to date strings for quick lookup
  const eventsByDate = useMemo(() => {
    const map = {};
    events.forEach(event => {
      if (event.category && !activeCategories.has(event.category)) return;
      const start = event.event_date;
      const end = event.end_date || start;
      // Iterate each day of the event
      let current = new Date(start + 'T00:00:00');
      const endDate = new Date(end + 'T00:00:00');
      while (current <= endDate) {
        const key = current.toISOString().slice(0, 10);
        if (!map[key]) map[key] = [];
        map[key].push(event);
        current.setDate(current.getDate() + 1);
      }
    });
    return map;
  }, [events, activeCategories]);

  // Workstream task deadlines for projection
  const deadlinesByDate = useMemo(() => {
    const map = {};
    workstreamTasks.forEach(task => {
      if (task.deadline && task.status !== 'done') {
        const key = task.deadline;
        if (!map[key]) map[key] = [];
        map[key].push(task);
      }
    });
    return map;
  }, [workstreamTasks]);

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const toggleCategory = (catId) => {
    setActiveCategories(prev => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  const handleCellClick = (dateStr) => {
    setCreateDate(dateStr);
    setShowCreateModal(true);
  };

  const handleCreateSave = async (data) => {
    await onCreateEvent(data);
    setShowCreateModal(false);
    setCreateDate(null);
  };

  const handleEditSave = async (data) => {
    await onUpdateEvent(editingEvent.id, data);
    setEditingEvent(null);
    setSelectedEvent(null);
  };

  const handleDelete = async (id) => {
    await onDeleteEvent(id);
    setSelectedEvent(null);
  };

  const handleEditFromDetail = (event) => {
    setSelectedEvent(null);
    setEditingEvent(event);
  };

  const MAX_VISIBLE_EVENTS = 3;

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="bg-ocean-800 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Events Calendar</h2>
            <p className="text-ocean-100 text-sm mt-1">Track conferences, campaigns, and external events</p>
          </div>
          <button
            onClick={() => { setCreateDate(null); setShowCreateModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition"
          >
            <Icon name="plus" className="w-5 h-5" />
            <span>New Event</span>
          </button>
        </div>
      </div>

      {/* Category filter bar */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => toggleCategory(cat.id)}
            className={clsx(
              "px-3 py-1 rounded-full text-xs font-medium transition border",
              activeCategories.has(cat.id)
                ? "bg-ocean-100 text-ocean-700 border-ocean-200"
                : "bg-graystone-50 text-graystone-400 border-graystone-200"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => goToMonth(viewYear, viewMonth - 1)}
            className="p-2 hover:bg-graystone-100 rounded-lg transition"
            aria-label="Previous month"
          >
            <Icon name="chevron-left" className="w-5 h-5 text-ocean-900" />
          </button>
          <h3 className="text-xl font-bold text-ocean-900 min-w-[200px] text-center">{monthLabel}</h3>
          <button
            onClick={() => goToMonth(viewYear, viewMonth + 1)}
            className="p-2 hover:bg-graystone-100 rounded-lg transition"
            aria-label="Next month"
          >
            <Icon name="chevron-right" className="w-5 h-5 text-ocean-900" />
          </button>
        </div>
        <button
          onClick={goToToday}
          className="px-3 py-1.5 text-sm font-medium text-ocean-600 hover:bg-ocean-50 rounded-lg transition border border-ocean-200"
        >
          Today
        </button>
      </div>

      {/* Calendar grid */}
      <div className="bg-white rounded-xl border border-graystone-200 overflow-hidden shadow-sm">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-graystone-200">
          {DAY_NAMES.map(d => (
            <div key={d} className="px-2 py-2 text-center text-xs font-bold text-graystone-500 uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, idx) => {
            const dateStr = `${day.date.getFullYear()}-${String(day.date.getMonth() + 1).padStart(2, '0')}-${String(day.date.getDate()).padStart(2, '0')}`;
            const isToday = dateStr === todayStr;
            const isPast = dateStr < todayStr;
            const dayEvents = eventsByDate[dateStr] || [];
            const dayDeadlines = deadlinesByDate[dateStr] || [];
            const totalItems = dayEvents.length + dayDeadlines.length;
            const visibleEvents = dayEvents.slice(0, MAX_VISIBLE_EVENTS);
            const overflow = totalItems - MAX_VISIBLE_EVENTS;

            return (
              <div
                key={idx}
                onClick={() => handleCellClick(dateStr)}
                className={clsx(
                  "min-h-[100px] p-1.5 border-b border-r border-graystone-100 cursor-pointer hover:bg-ocean-50/30 transition",
                  !day.isCurrentMonth && "bg-graystone-50/50",
                  isToday && "ring-2 ring-inset ring-ocean-500 bg-ocean-50"
                )}
              >
                {/* Date number */}
                <div className={clsx(
                  "text-sm font-medium mb-1",
                  !day.isCurrentMonth ? "text-graystone-300" :
                  isPast ? "text-graystone-400" :
                  isToday ? "text-ocean-600 font-bold" :
                  "text-ocean-900"
                )}>
                  {day.date.getDate()}
                </div>

                {/* Events */}
                <div className="space-y-0.5">
                  {visibleEvents.map(event => (
                    <EventChip key={event.id} event={event} onClick={setSelectedEvent} />
                  ))}
                  {/* Deadline projections (dimmed) */}
                  {dayDeadlines.slice(0, Math.max(0, MAX_VISIBLE_EVENTS - dayEvents.length)).map(task => (
                    <div
                      key={task.id}
                      className="w-full text-left px-1.5 py-0.5 rounded text-[11px] leading-tight truncate bg-graystone-100 text-graystone-500"
                      title={`Deadline: ${task.title}`}
                    >
                      <Icon name="clock" className="w-3 h-3 inline mr-0.5" />
                      {task.title}
                    </div>
                  ))}
                  {overflow > 0 && (
                    <div className="text-[10px] text-graystone-400 pl-1">+{overflow} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create modal */}
      {showCreateModal && (
        <EventCreateModal
          onClose={() => { setShowCreateModal(false); setCreateDate(null); }}
          onSave={handleCreateSave}
          initialDate={createDate}
          entries={entries}
          workstreams={workstreams}
        />
      )}

      {/* Edit modal */}
      {editingEvent && (
        <EventCreateModal
          onClose={() => setEditingEvent(null)}
          onSave={handleEditSave}
          existingEvent={editingEvent}
          entries={entries}
          workstreams={workstreams}
        />
      )}

      {/* Detail modal */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onEdit={handleEditFromDetail}
          onDelete={handleDelete}
          entries={entries}
          workstreams={workstreams}
          onNavigateToEntry={onNavigateToEntry}
          onNavigateToWorkstream={onNavigateToWorkstream}
        />
      )}
    </div>
  );
};

export default EventCalendar;
