import React, { useState, useMemo } from 'react';
import clsx from 'clsx';
import Icon from '../../ui/Icon';
import Badge from '../../ui/Badge';

/**
 * ToDoList - Personal planner with calendar view
 *
 * Features:
 * - Add personal tasks with optional date scheduling
 * - Mini calendar with task indicators
 * - Full calendar modal view
 * - Today's tasks panel
 * - Toggle visibility of Projects, Tasks, and Workstreams
 *
 * @param {Array} todos - Array of personal todo items
 * @param {function} onAddTodo - Add todo callback
 * @param {function} onToggleTodo - Toggle todo completion callback
 * @param {Array} entries - Array of projects and tasks (jobs)
 * @param {Array} workstreamTasks - Array of workstream tasks
 * @param {Array} workstreams - Array of workstream objects
 * @param {string} currentUser - Current user name
 * @param {function} onOpenEntry - Callback to open an entry
 */
const ToDoList = ({
  todos = [],
  onAddTodo,
  onToggleTodo,
  entries = [],
  workstreamTasks = [],
  workstreams = [],
  currentUser,
  onOpenEntry,
  selectBaseClasses = "px-3 py-2 border border-graystone-300 rounded-lg focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500 outline-none"
}) => {
  const [newTodoText, setNewTodoText] = useState('');
  const [newTodoDate, setNewTodoDate] = useState('');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const todoOwner = currentUser || 'Guest';

  // Toggle states for calendar sources
  const [showPersonal, setShowPersonal] = useState(true);
  const [showProjects, setShowProjects] = useState(true);
  const [showTasks, setShowTasks] = useState(true);
  const [showWorkstreams, setShowWorkstreams] = useState(true);

  const handleAdd = () => {
    if (!newTodoText.trim()) return;
    onAddTodo({
      text: newTodoText,
      date: newTodoDate || '',
      completed: false,
      user: todoOwner
    });
    setNewTodoText('');
    setNewTodoDate('');
  };

  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const startOfMonth = new Date(currentMonth);
  startOfMonth.setDate(1);
  const daysInMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0).getDate();
  const firstDay = startOfMonth.getDay();
  const weeks = [];
  let currentDay = 1 - firstDay;
  while (currentDay <= daysInMonth) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      week.push(currentDay);
      currentDay++;
    }
    weeks.push(week);
  }

  const getDateString = (day) => {
    const d = new Date(startOfMonth);
    d.setDate(day);
    return d.toISOString().slice(0, 10);
  };

  // Merge all calendar items by date
  const allItemsByDate = useMemo(() => {
    const itemsByDate = {};

    // Helper to add item to date bucket
    const addToDate = (dateStr, item) => {
      if (!dateStr) return;
      // Normalize date string to YYYY-MM-DD
      const normalizedDate = dateStr.slice(0, 10);
      if (!itemsByDate[normalizedDate]) {
        itemsByDate[normalizedDate] = [];
      }
      itemsByDate[normalizedDate].push(item);
    };

    // Personal todos
    if (showPersonal) {
      todos.forEach(todo => {
        if (todo.date) {
          addToDate(todo.date, {
            ...todo,
            itemSource: 'personal',
            displayTitle: todo.text
          });
        }
      });
    }

    // Projects (entries where itemType !== 'job') - exclude archived and completed
    if (showProjects) {
      entries
        .filter(e => e.itemType !== 'job' && !e.archived && e.workflowStatus !== 'Complete')
        .forEach(entry => {
          const dateStr = entry.date || entry.timelineValue;
          if (dateStr) {
            addToDate(dateStr, {
              ...entry,
              itemSource: 'project',
              displayTitle: entry.title
            });
          }
        });
    }

    // Tasks (entries where itemType === 'job') - exclude archived and done
    if (showTasks) {
      entries
        .filter(e => e.itemType === 'job' && !e.archived && e.workflowStatus !== 'done')
        .forEach(entry => {
          const dateStr = entry.date || entry.timelineValue;
          if (dateStr) {
            addToDate(dateStr, {
              ...entry,
              itemSource: 'task',
              displayTitle: entry.title
            });
          }
        });
    }

    // Workstream tasks
    if (showWorkstreams) {
      workstreamTasks
        .filter(t => t.status !== 'done')
        .forEach(task => {
          if (task.deadline) {
            const ws = workstreams.find(w => w.id === task.workstream_id);
            addToDate(task.deadline, {
              ...task,
              itemSource: 'workstream',
              displayTitle: task.title,
              workstreamName: ws?.title || 'Workstream'
            });
          }
        });
    }

    return itemsByDate;
  }, [todos, entries, workstreamTasks, workstreams, showPersonal, showProjects, showTasks, showWorkstreams]);

  // Get color for item source
  const getSourceColor = (source) => {
    switch (source) {
      case 'personal': return { bg: 'bg-ocean-500', light: 'bg-ocean-100', text: 'text-ocean-700', border: 'border-ocean-200' };
      case 'project': return { bg: 'bg-violet-500', light: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200' };
      case 'task': return { bg: 'bg-amber-500', light: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' };
      case 'workstream': return { bg: 'bg-emerald-500', light: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' };
      default: return { bg: 'bg-graystone-500', light: 'bg-graystone-100', text: 'text-graystone-700', border: 'border-graystone-200' };
    }
  };

  const getSourceLabel = (source) => {
    switch (source) {
      case 'personal': return 'Personal';
      case 'project': return 'Project';
      case 'task': return 'Task';
      case 'workstream': return 'Workstream';
      default: return '';
    }
  };

  // Items for today
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayItems = allItemsByDate[todayStr] || [];

  // Items without dates (personal only)
  const noDateTodos = showPersonal ? todos.filter(t => !t.date) : [];

  const handleItemClick = (item) => {
    if (item.itemSource === 'personal') {
      // Toggle personal todo
      if (onToggleTodo) onToggleTodo(item.id);
    } else if (item.itemSource === 'project' || item.itemSource === 'task') {
      // Open entry detail
      if (onOpenEntry) onOpenEntry(item.id);
    }
    // Workstream tasks - could add navigation later
  };

  const renderDayCell = (day, compact = false) => {
    const inMonth = day >= 1 && day <= daysInMonth;
    const dateKey = inMonth ? getDateString(day) : null;
    const dayItems = dateKey ? allItemsByDate[dateKey] || [] : [];
    const isToday = dateKey === todayStr;
    const isSelected = dateKey === selectedDate;

    return (
      <div
        key={day}
        onClick={() => {
          if (inMonth) {
            setSelectedDate(dateKey);
            if (compact) setShowCalendar(true);
          }
        }}
        className={clsx(
          "border rounded-lg p-2 cursor-pointer transition-all",
          compact ? "border-graystone-100 bg-white" : "border-graystone-100 min-h-[110px] bg-white",
          inMonth ? "text-ocean-900 hover:border-ocean-300" : "text-graystone-300",
          isToday && "ring-2 ring-ocean-400",
          isSelected && !compact && "border-ocean-500 bg-ocean-50"
        )}
      >
        <div className="flex items-center justify-between mb-1">
          <span className={clsx(
            "text-xs font-semibold",
            isToday && "bg-ocean-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
          )}>
            {inMonth ? day : ""}
          </span>
          {!compact && inMonth && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setNewTodoDate(dateKey);
                setShowScheduleModal(true);
              }}
              className="text-[10px] px-2 py-1 rounded-full bg-ocean-50 text-ocean-700 border border-ocean-100 hover:bg-ocean-100"
            >
              +
            </button>
          )}
        </div>
        {compact ? (
          <div className="h-6 flex items-center gap-0.5 flex-wrap">
            {dayItems.slice(0, 4).map((item, idx) => (
              <span
                key={`${item.itemSource}-${item.id}-${idx}`}
                className={clsx("w-2 h-2 rounded-full", getSourceColor(item.itemSource).bg)}
              />
            ))}
            {dayItems.length > 4 && (
              <span className="text-[10px] text-graystone-500">+{dayItems.length - 4}</span>
            )}
          </div>
        ) : (
          <div className="space-y-1 max-h-[80px] overflow-y-auto">
            {dayItems.slice(0, 3).map((item, idx) => {
              const colors = getSourceColor(item.itemSource);
              const isCompleted = item.itemSource === 'personal' && item.completed;
              return (
                <div
                  key={`${item.itemSource}-${item.id}-${idx}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleItemClick(item);
                  }}
                  className={clsx(
                    "flex items-center gap-1.5 p-1.5 rounded border text-xs cursor-pointer transition-all",
                    isCompleted
                      ? "bg-graystone-50 border-graystone-200 text-graystone-400 line-through"
                      : `${colors.light} ${colors.border} ${colors.text} hover:opacity-80`
                  )}
                >
                  <span className={clsx("w-1.5 h-1.5 rounded-full flex-shrink-0", colors.bg)} />
                  <span className="truncate">{item.displayTitle}</span>
                </div>
              );
            })}
            {dayItems.length > 3 && (
              <div className="text-[10px] text-graystone-500 pl-1">+{dayItems.length - 3} more</div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Toggle checkbox component
  const SourceToggle = ({ label, enabled, setEnabled, color }) => (
    <label
      className={clsx(
        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer select-none",
        enabled
          ? `${color.light} ${color.text} border ${color.border}`
          : "bg-graystone-50 text-graystone-400 border border-graystone-200"
      )}
    >
      <input
        type="checkbox"
        checked={enabled}
        onChange={() => setEnabled(!enabled)}
        className={clsx(
          "w-4 h-4 rounded border-2 cursor-pointer transition-all",
          enabled ? `${color.text} accent-current` : "accent-graystone-300"
        )}
      />
      <span className={clsx("w-2 h-2 rounded-full", enabled ? color.bg : "bg-graystone-300")} />
      {label}
    </label>
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="bg-gradient-to-r from-ocean-500 to-ocean-600 rounded-2xl p-6 text-white shadow-xl mb-6">
        <h1 className="text-2xl font-bold">My Planner</h1>
        <p className="text-ocean-100 text-sm">Plan your day and track personal reminders.</p>
      </div>

      {/* Source Toggles */}
      <div className="bg-white rounded-xl border border-ocean-100 shadow-sm p-4 mb-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-sm font-medium text-graystone-600">Show in calendar:</span>
          <div className="flex items-center gap-2 flex-wrap">
            <SourceToggle
              label="Personal"
              enabled={showPersonal}
              setEnabled={setShowPersonal}
              color={getSourceColor('personal')}
            />
            <SourceToggle
              label="Projects"
              enabled={showProjects}
              setEnabled={setShowProjects}
              color={getSourceColor('project')}
            />
            <SourceToggle
              label="Tasks"
              enabled={showTasks}
              setEnabled={setShowTasks}
              color={getSourceColor('task')}
            />
            <SourceToggle
              label="Workstreams"
              enabled={showWorkstreams}
              setEnabled={setShowWorkstreams}
              color={getSourceColor('workstream')}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Add Task + Calendar */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-ocean-100 shadow-sm p-6">
            <h3 className="text-lg font-bold text-ocean-900 mb-4">Add Personal Reminder</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={newTodoText}
                onChange={(e) => setNewTodoText(e.target.value)}
                placeholder="What needs to be done?"
                className="w-full px-4 py-2 border border-graystone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              />
              <div className="flex gap-2">
                <button
                  className="flex-1 px-4 py-2 rounded-xl font-semibold bg-ocean-500 text-white border border-ocean-500 shadow-md hover:bg-ocean-600 transition inline-flex items-center justify-center gap-2"
                  onClick={handleAdd}
                >
                  <Icon name="plus" className="w-4 h-4" />
                  Add
                </button>
                <button
                  className="flex-1 px-4 py-2 rounded-xl font-semibold bg-ocean-500 text-white border border-ocean-500 shadow-md hover:bg-ocean-600 transition disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                  onClick={() => {
                    if (!newTodoText.trim()) return;
                    setShowScheduleModal(true);
                  }}
                  disabled={!newTodoText.trim()}
                >
                  <Icon name="calendar-plus" className="w-4 h-4" />
                  Schedule
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-ocean-100 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-heading text-base text-ocean-900">Calendar</h4>
                <p className="text-xs text-graystone-600">Click a day to view details</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const prev = new Date(startOfMonth);
                    prev.setMonth(prev.getMonth() - 1);
                    setCurrentMonth(prev);
                  }}
                  className="w-8 h-8 rounded-full bg-ocean-50 text-ocean-700 border border-ocean-100 hover:bg-ocean-100 flex items-center justify-center"
                >
                  <Icon name="chevron-left" className="w-4 h-4" />
                </button>
                <div className="text-sm font-semibold text-ocean-900">
                  {startOfMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </div>
                <button
                  onClick={() => {
                    const next = new Date(startOfMonth);
                    next.setMonth(next.getMonth() + 1);
                    setCurrentMonth(next);
                  }}
                  className="w-8 h-8 rounded-full bg-ocean-50 text-ocean-700 border border-ocean-100 hover:bg-ocean-100 flex items-center justify-center"
                >
                  <Icon name="chevron-right" className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-2 text-xs font-semibold text-graystone-600 mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="text-center">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {weeks.flat().map((day, idx) => (
                <div key={idx}>
                  {renderDayCell(day, true)}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Today's items + Selected day */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-ocean-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg text-ocean-900">Today</h3>
              <Badge variant="secondary">{todayItems.length}</Badge>
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {todayItems.length > 0 ? (
                todayItems.map((item, idx) => {
                  const colors = getSourceColor(item.itemSource);
                  const isCompleted = item.itemSource === 'personal' && item.completed;
                  return (
                    <div
                      key={`${item.itemSource}-${item.id}-${idx}`}
                      onClick={() => handleItemClick(item)}
                      className={clsx(
                        "flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer",
                        isCompleted
                          ? "bg-graystone-50 border-graystone-200"
                          : `bg-white ${colors.border} hover:shadow-sm`
                      )}
                    >
                      {item.itemSource === 'personal' ? (
                        <input
                          type="checkbox"
                          checked={item.completed}
                          onChange={() => onToggleTodo(item.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 rounded border-2 cursor-pointer"
                        />
                      ) : (
                        <span className={clsx("w-3 h-3 rounded-full flex-shrink-0", colors.bg)} />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className={clsx(
                          "text-sm font-medium truncate",
                          isCompleted ? "text-graystone-400 line-through" : "text-ocean-900"
                        )}>
                          {item.displayTitle}
                        </div>
                        {item.workstreamName && (
                          <div className="text-xs text-graystone-500">{item.workstreamName}</div>
                        )}
                      </div>
                      <span className={clsx(
                        "text-[10px] px-2 py-0.5 rounded-full",
                        colors.light, colors.text
                      )}>
                        {getSourceLabel(item.itemSource)}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="text-sm text-graystone-500 text-center py-8">
                  Nothing scheduled for today
                </div>
              )}
            </div>
          </div>

          {/* No-date personal todos */}
          {noDateTodos.length > 0 && (
            <div className="bg-white rounded-xl border border-ocean-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading text-lg text-ocean-900">Unscheduled</h3>
                <Badge variant="neutral">{noDateTodos.length}</Badge>
              </div>
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                {noDateTodos.map((todo) => (
                  <div
                    key={todo.id}
                    className={clsx(
                      "flex items-center gap-3 p-3 rounded-xl border transition-all",
                      todo.completed
                        ? "bg-graystone-50 border-graystone-200"
                        : "bg-white border-ocean-200 hover:border-ocean-300"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={todo.completed}
                      onChange={() => onToggleTodo(todo.id)}
                      className="w-4 h-4 rounded border-2 cursor-pointer"
                    />
                    <span className={clsx(
                      "text-sm flex-1 truncate",
                      todo.completed && "text-graystone-400 line-through"
                    )}>
                      {todo.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Full Calendar Modal */}
      {showCalendar && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50"
          role="dialog"
          aria-modal="true"
        >
          <div className="fixed inset-0" onClick={() => setShowCalendar(false)} aria-hidden="true" />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const prev = new Date(startOfMonth);
                    prev.setMonth(prev.getMonth() - 1);
                    setCurrentMonth(prev);
                  }}
                  className="w-8 h-8 rounded-full bg-ocean-50 text-ocean-700 border border-ocean-100 hover:bg-ocean-100 flex items-center justify-center"
                >
                  <Icon name="chevron-left" className="w-4 h-4" />
                </button>
                <h3 className="font-heading text-2xl text-ocean-900 tracking-wide">
                  {startOfMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h3>
                <button
                  onClick={() => {
                    const next = new Date(startOfMonth);
                    next.setMonth(next.getMonth() + 1);
                    setCurrentMonth(next);
                  }}
                  className="w-8 h-8 rounded-full bg-ocean-50 text-ocean-700 border border-ocean-100 hover:bg-ocean-100 flex items-center justify-center"
                >
                  <Icon name="chevron-right" className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => setShowCalendar(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-ocean-500 hover:bg-ocean-600 transition-colors"
              >
                <Icon name="x" className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mb-4 text-xs">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-ocean-500" /> Personal</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-500" /> Projects</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Tasks</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Workstreams</span>
            </div>

            <div className="grid grid-cols-7 gap-2 text-xs font-semibold text-graystone-600 mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="text-center">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2 overflow-y-auto pr-1" style={{ maxHeight: '60vh' }}>
              {weeks.flat().map((day, idx) => renderDayCell(day, false))}
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50"
          role="dialog"
          aria-modal="true"
        >
          <div className="fixed inset-0" onClick={() => setShowScheduleModal(false)} aria-hidden="true" />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-ocean-900">Schedule Reminder</h3>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-ocean-500 hover:bg-ocean-600 transition-colors"
              >
                <Icon name="x" className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-graystone-600">Date</label>
                <input
                  type="date"
                  value={newTodoDate}
                  onChange={(e) => setNewTodoDate(e.target.value)}
                  className={clsx(selectBaseClasses, "w-full")}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 text-sm font-medium text-graystone-600 hover:text-graystone-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!newTodoText.trim() || !newTodoDate) return;
                    handleAdd();
                    setShowScheduleModal(false);
                  }}
                  className="px-4 py-2 bg-ocean-600 text-white text-sm font-medium rounded-lg hover:bg-ocean-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!newTodoText.trim() || !newTodoDate}
                >
                  Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ToDoList;
