import React, { useState } from 'react';
import clsx from 'clsx';
import Icon from '../../ui/Icon';
import Badge from '../../ui/Badge';

/**
 * ToDoList - Personal to-do list with calendar view
 *
 * Features:
 * - Add tasks with optional date scheduling
 * - Mini calendar with task indicators
 * - Full calendar modal view
 * - Today's tasks panel
 * - Group tasks by date
 *
 * @param {Array} todos - Array of todo items
 * @param {function} onAddTodo - Add todo callback
 * @param {function} onToggleTodo - Toggle todo completion callback
 * @param {function} onBack - Back navigation callback
 * @param {string} currentUser - Current user name
 * @param {string} selectBaseClasses - CSS classes for select/input elements
 */
const ToDoList = ({
  todos,
  onAddTodo,
  onToggleTodo,
  onBack,
  currentUser,
  selectBaseClasses = "px-3 py-2 border border-graystone-300 rounded-lg focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500 outline-none"
}) => {
  const [newTodoText, setNewTodoText] = useState('');
  const [newTodoDate, setNewTodoDate] = useState('');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const todoOwner = currentUser || 'Guest';

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

  const tasksByDate = todos.reduce((acc, todo) => {
    const key = todo.date || 'No Date';
    acc[key] = acc[key] || [];
    acc[key].push(todo);
    return acc;
  }, {});
  const noDateTasks = tasksByDate['No Date'] || [];

  const renderDayCell = (day, compact = false) => {
    const inMonth = day >= 1 && day <= daysInMonth;
    const dateKey = inMonth ? getDateString(day) : null;
    const dayTasks = dateKey ? tasksByDate[dateKey] || [] : [];

    return (
      <div
        key={day}
        className={clsx(
          compact ? "border border-graystone-100 rounded-lg p-2 bg-white" : "border border-graystone-100 rounded-lg p-2 min-h-[110px] bg-white",
          inMonth ? "text-ocean-900" : "text-graystone-300"
        )}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold">{inMonth ? day : ""}</span>
          {!compact && inMonth && (
            <button
              onClick={() => {
                setNewTodoDate(dateKey);
                setShowCalendar(true);
              }}
              className="text-[10px] px-2 py-1 rounded-full bg-ocean-50 text-ocean-700 border border-ocean-100 hover:bg-ocean-100"
            >
              +
            </button>
          )}
        </div>
        {compact ? (
          <div
            className="h-6 flex items-center gap-1 cursor-pointer"
            onClick={() => {
              setShowCalendar(true);
              if (inMonth) setNewTodoDate(dateKey);
            }}
          >
            {dayTasks.slice(0, 3).map((todo) => (
              <span key={todo.id} className={clsx(
                "w-2 h-2 rounded-full",
                todo.completed ? "bg-graystone-300" : "bg-ocean-500"
              )}></span>
            ))}
            {dayTasks.length > 3 && (
              <span className="text-[10px] text-graystone-500">+{dayTasks.length - 3}</span>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {dayTasks.map((todo) => (
              <div
                key={todo.id}
                className={clsx(
                  "flex items-center gap-2 p-2 rounded-lg border text-xs",
                  todo.completed
                    ? "bg-graystone-50 border-graystone-200 text-graystone-500 line-through"
                    : "bg-white border-ocean-200 hover:border-ocean-300 text-graystone-900"
                )}
              >
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => onToggleTodo(todo.id)}
                  className={clsx(
                    "w-4 h-4 rounded border-2 cursor-pointer transition-all",
                    todo.completed
                      ? "bg-ocean-600 border-ocean-600"
                      : "border-graystone-300 hover:border-ocean-400"
                  )}
                />
                <span className="truncate">{todo.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="bg-gradient-to-r from-ocean-500 to-ocean-600 rounded-2xl p-8 text-white shadow-xl mb-6">
        <h1 className="text-3xl font-bold mb-2">My To-Do Calendar</h1>
        <p className="text-ocean-100">Plan tasks by date and mark them done.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Add Task + Calendar link */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-ocean-100 shadow-sm p-6">
            <h3 className="text-lg font-bold text-ocean-900 mb-4">Add New Task</h3>
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
                  Add Task
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
                  Schedule Task
                </button>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-ocean-100 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-heading text-base text-ocean-900">To-Do Calendar</h4>
                <p className="text-xs text-graystone-600">Click a day to view tasks</p>
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
                <div key={idx} onClick={() => {
                  if (day >= 1 && day <= daysInMonth) {
                    setNewTodoDate(getDateString(day));
                    setShowCalendar(true);
                  }
                }}>
                  {renderDayCell(day, true)}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Today's tasks */}
        <div className="bg-white rounded-xl border border-ocean-100 shadow-sm p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-lg text-ocean-900">Today's Tasks</h3>
            <Badge variant="secondary">{(tasksByDate[new Date().toISOString().slice(0, 10)] || []).length}</Badge>
          </div>
          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
            {(tasksByDate[new Date().toISOString().slice(0, 10)] || []).length ? (
              (tasksByDate[new Date().toISOString().slice(0, 10)] || []).map((todo) => (
                <div
                  key={todo.id}
                  className={clsx(
                    "flex items-center gap-2 p-3 rounded-xl border transition-all text-sm",
                    todo.completed
                      ? "bg-graystone-50 border-graystone-200 text-graystone-500 line-through"
                      : "bg-white border-ocean-200 hover:border-ocean-300 text-graystone-900"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() => onToggleTodo(todo.id)}
                    className={clsx(
                      "w-4 h-4 rounded border-2 cursor-pointer transition-all",
                      todo.completed
                        ? "bg-ocean-600 border-ocean-600"
                        : "border-graystone-300 hover:border-ocean-400"
                    )}
                  />
                  <span className="truncate flex-1">{todo.text}</span>
                </div>
              ))
            ) : (
              <div className="text-xs text-graystone-500 text-center py-10">
                No tasks for today.
              </div>
            )}
          </div>
          {noDateTasks.length > 0 && (
            <div className="pt-3 border-t border-graystone-100">
              <h4 className="text-xs font-semibold text-graystone-600 mb-2">No Date</h4>
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                {noDateTasks.map((todo) => (
                  <div
                    key={todo.id}
                    className={clsx(
                      "flex items-center gap-2 p-3 rounded-xl border transition-all text-sm",
                      todo.completed
                        ? "bg-graystone-50 border-graystone-200 text-graystone-500 line-through"
                        : "bg-white border-ocean-200 hover:border-ocean-300 text-graystone-900"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={todo.completed}
                      onChange={() => onToggleTodo(todo.id)}
                      className={clsx(
                        "w-4 h-4 rounded border-2 cursor-pointer transition-all",
                        todo.completed
                          ? "bg-ocean-600 border-ocean-600"
                          : "border-graystone-300 hover:border-ocean-400"
                      )}
                    />
                    <span className="truncate flex-1">{todo.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showCalendar && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="calendar-modal-title"
        >
          <div className="fixed inset-0" onClick={() => setShowCalendar(false)} aria-hidden="true" />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-3xl max-h-[80vh] overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const prev = new Date(startOfMonth);
                    prev.setMonth(prev.getMonth() - 1);
                    setCurrentMonth(prev);
                  }}
                  className="w-8 h-8 rounded-full bg-ocean-50 text-ocean-700 border border-ocean-100 hover:bg-ocean-100 flex items-center justify-center"
                  aria-label="Previous month"
                >
                  <Icon name="chevron-left" className="w-4 h-4" />
                </button>
                <h3 id="calendar-modal-title" className="font-heading text-2xl text-ocean-900 tracking-wide">
                  {startOfMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h3>
                <button
                  onClick={() => {
                    const next = new Date(startOfMonth);
                    next.setMonth(next.getMonth() + 1);
                    setCurrentMonth(next);
                  }}
                  className="w-8 h-8 rounded-full bg-ocean-50 text-ocean-700 border border-ocean-100 hover:bg-ocean-100 flex items-center justify-center"
                  aria-label="Next month"
                >
                  <Icon name="chevron-right" className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => setShowCalendar(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-ocean-500 hover:bg-ocean-600 transition-colors"
                aria-label="Close calendar"
              >
                <Icon name="x" className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-2 text-xs font-semibold text-graystone-600 mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="text-center">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2 overflow-y-auto pr-1" style={{ maxHeight: '60vh' }}>
              {weeks.flat().map((day, idx) => renderDayCell(day, idx))}
            </div>
          </div>
        </div>
      )}

      {showScheduleModal && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="schedule-modal-title"
        >
          <div className="fixed inset-0" onClick={() => setShowScheduleModal(false)} aria-hidden="true" />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-3">
              <h3 id="schedule-modal-title" className="text-lg font-bold text-ocean-900">Schedule Task</h3>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-ocean-500 hover:bg-ocean-600 transition-colors"
                aria-label="Close schedule dialog"
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
