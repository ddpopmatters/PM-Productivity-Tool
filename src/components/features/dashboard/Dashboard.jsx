import React, { useState, useMemo } from 'react';
import { Icon } from '../../ui';

/**
 * Dashboard - Main dashboard view with stats, calendar, tasks, and activity feed
 *
 * Props:
 * - entries: Array of all entries
 * - currentUser: Current username
 * - onOpenEntry: Function to open entry details
 * - onOpenPdfExport: Function to open PDF export modal
 * - onNavigate: Function to navigate to different views
 * - todos: Array of personal todos
 * - onToggleTodo: Function to toggle todo completion
 * - onAddTodo: Function to add a new todo
 * - onUpdateTodo: Function to update a todo
 * - onDeleteTodo: Function to delete a todo
 * - onUpdateEntry: Function to update an entry
 * - onEditSubtask: Function to edit a subtask
 * - workstreamTasks: Array of workstream tasks
 * - onOpenWorkstreamTask: Function to open workstream task detail
 * - onUpdateWorkstreamTask: Function to update a workstream task
 * - Badge: Badge component for status display
 */
export default function Dashboard({
  entries,
  currentUser,
  userEmail,
  onOpenEntry,
  onOpenPdfExport,
  onNavigate,
  todos = [],
  onToggleTodo,
  onAddTodo,
  onUpdateTodo,
  onDeleteTodo,
  onUpdateEntry,
  onEditSubtask,
  workstreamTasks = [],
  onOpenWorkstreamTask,
  onUpdateWorkstreamTask,
  Badge,
}) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  // New task input state
  const [newTaskText, setNewTaskText] = useState('');
  const [editingTodoId, setEditingTodoId] = useState(null);
  const [editingTodoDate, setEditingTodoDate] = useState('');

  // Modal item date editing state
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingItemDate, setEditingItemDate] = useState('');
  const [editingItemType, setEditingItemType] = useState(null); // 'project', 'job', 'subtask'

  const handleAddTask = () => {
    if (newTaskText.trim() && onAddTodo) {
      onAddTodo({
        text: newTaskText.trim(),
        date: today,
        completed: false,
      });
      setNewTaskText('');
    }
  };

  const handleMarkJobComplete = (jobId) => {
    if (onUpdateEntry) {
      onUpdateEntry(jobId, { workflowStatus: 'done' });
    }
  };

  const startEditingTodoDate = (todo) => {
    setEditingTodoId(todo.id);
    setEditingTodoDate(todo.date || '');
  };

  const saveTodoDate = () => {
    if (editingTodoId && onUpdateTodo) {
      onUpdateTodo(editingTodoId, { date: editingTodoDate || null });
    }
    setEditingTodoId(null);
    setEditingTodoDate('');
  };

  const clearTodoDate = (todoId) => {
    if (onUpdateTodo) {
      onUpdateTodo(todoId, { date: null });
    }
    setEditingTodoId(null);
    setEditingTodoDate('');
  };

  // Modal item date editing handlers
  const startEditingItemDate = (item, type) => {
    setEditingItemId(item.id);
    setEditingItemType(type);
    if (type === 'subtask') {
      setEditingItemDate(item.deadline || '');
    } else {
      setEditingItemDate(item.date || item.timelineValue || '');
    }
  };

  const saveItemDate = (item) => {
    if (editingItemType === 'subtask') {
      // For subtasks, we need to call onEditSubtask
      if (onEditSubtask && item.parentId) {
        onEditSubtask(item.parentId, item.id, { deadline: editingItemDate || null });
      }
    } else {
      // For projects and jobs
      if (onUpdateEntry) {
        onUpdateEntry(item.id, { date: editingItemDate || null });
      }
    }
    setEditingItemId(null);
    setEditingItemDate('');
    setEditingItemType(null);
  };

  const clearItemDate = (item) => {
    if (editingItemType === 'subtask') {
      if (onEditSubtask && item.parentId) {
        onEditSubtask(item.parentId, item.id, { deadline: null });
      }
    } else {
      if (onUpdateEntry) {
        onUpdateEntry(item.id, { date: null });
      }
    }
    setEditingItemId(null);
    setEditingItemDate('');
    setEditingItemType(null);
  };

  // Stats calculations (memoized for performance)
  const myProjects = useMemo(
    () =>
      entries.filter(
        (e) =>
          e.itemType !== 'job' &&
          !e.archived &&
          (e.owner === currentUser || e.ownerEmail === userEmail || (e.collaborators && e.collaborators.includes(currentUser)))
      ),
    [entries, currentUser, userEmail]
  );

  const myJobs = useMemo(
    () =>
      entries.filter(
        (e) =>
          e.itemType === 'job' &&
          !e.archived &&
          (e.owner === currentUser || e.ownerEmail === userEmail || (e.collaborators && e.collaborators.includes(currentUser)))
      ),
    [entries, currentUser, userEmail]
  );

  const mySubtasks = useMemo(
    () =>
      entries.flatMap((e) =>
        (e.subtasks || [])
          .filter((st) => st.assignedTo === currentUser)
          .map((st) => ({ ...st, parentId: e.id, parentTitle: e.title }))
      ),
    [entries, currentUser]
  );

  // Calendar state
  const [calendarView, setCalendarView] = useState('month');
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  // Get all scheduled items for calendar
  const getScheduledItems = (dateStr) => {
    const items = [];

    // Projects/Jobs with dates
    entries.forEach((e) => {
      const itemDate = e.date || e.timelineValue;
      if (itemDate && itemDate.slice(0, 10) === dateStr) {
        items.push({ type: e.itemType === 'job' ? 'job' : 'project', ...e });
      }
    });

    // Subtasks with deadlines
    entries.forEach((e) => {
      (e.subtasks || []).forEach((st) => {
        if (st.deadline && st.deadline.slice(0, 10) === dateStr) {
          items.push({ type: 'subtask', parentTitle: e.title, parentId: e.id, ...st });
        }
      });
    });

    // Personal todos
    (todos || []).forEach((t) => {
      if (t.date === dateStr) {
        items.push({ type: 'todo', ...t });
      }
    });

    // Workstream tasks with deadlines
    (workstreamTasks || []).forEach((t) => {
      if (t.deadline && t.deadline.slice(0, 10) === dateStr) {
        items.push({ type: 'workstream', ...t });
      }
    });

    return items;
  };

  // Today's tasks - only items explicitly scheduled for today (memoized)
  const todaysTodos = useMemo(
    () => (todos || []).filter((t) => t.date === today && !t.completed),
    [todos, today]
  );

  const jobsForToday = useMemo(
    () =>
      myJobs.filter((j) => {
        if (j.workflowStatus === 'done') return false;
        const jobDate = j.date || j.timelineValue;
        return jobDate && jobDate.slice(0, 10) === today;
      }),
    [myJobs, today]
  );

  const workstreamTasksForToday = useMemo(
    () =>
      (workstreamTasks || []).filter((t) => {
        if (t.status === 'done') return false;
        return t.deadline && t.deadline.slice(0, 10) === today;
      }),
    [workstreamTasks, today]
  );

  const todaysTasks = useMemo(
    () => [
      ...todaysTodos.map((t) => ({ ...t, taskType: 'todo' })),
      ...jobsForToday.map((j) => ({ ...j, taskType: 'job' })),
      ...workstreamTasksForToday.map((t) => ({ ...t, taskType: 'workstream' })),
    ],
    [todaysTodos, jobsForToday, workstreamTasksForToday]
  );

  // Mentions & Activity (memoized)
  const mentionsAndActivity = useMemo(() => {
    const mentions = [];
    const currentUserLower = (currentUser || '').toLowerCase();

    entries.forEach((entry) => {
      const isMyProject =
        entry.owner === currentUser ||
        (entry.collaborators && entry.collaborators.includes(currentUser));

      (entry.comments || []).forEach((comment) => {
        const mentionsMe =
          comment.text && comment.text.toLowerCase().includes(`@${currentUserLower}`);

        if (mentionsMe || isMyProject) {
          mentions.push({
            id: comment.id,
            type: mentionsMe ? 'mention' : 'activity',
            entryId: entry.id,
            entryTitle: entry.title,
            author: comment.author,
            text: comment.text,
            timestamp: comment.timestamp,
          });
        }
      });
    });

    return mentions
      .filter((m) => m.author !== currentUser) // Don't show own comments
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10);
  }, [entries, currentUser]);

  // Time ago helper
  const timeAgo = (timestamp) => {
    if (!timestamp) return '';
    const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  // Calendar helpers
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = (firstDay.getDay() + 6) % 7; // Monday = 0
    return { daysInMonth, startingDay, year, month };
  };

  const { daysInMonth, startingDay, year, month } = getDaysInMonth(calendarMonth);

  // Week view helpers
  const getWeekDays = () => {
    const startOfWeek = new Date(calendarMonth);
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
  };

  // Task List Modal State (keeping for subtasks)
  const [showTaskListModal, setShowTaskListModal] = useState(false);
  const [taskListType, setTaskListType] = useState('');
  const [taskListItems, setTaskListItems] = useState([]);

  const openTaskList = (type) => {
    setTaskListType(type);
    if (type === 'projects') {
      setTaskListItems(myProjects);
    } else if (type === 'subtasks') {
      setTaskListItems(mySubtasks.map((st) => ({ ...st, isSubtask: true })));
    } else if (type === 'jobs') {
      setTaskListItems(myJobs);
    } else if (type === 'workstream') {
      setTaskListItems((workstreamTasks || []).map((t) => ({ ...t, isWorkstreamTask: true })));
    }
    setShowTaskListModal(true);
  };

  return (
    <div className="p-6 space-y-6" id="dashboard-export-content">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-ocean-500 to-ocean-600 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Welcome back, {(currentUser || 'User').split(' ')[0]}!
            </h1>
            <p className="text-ocean-100">Here's your momentum for today</p>
          </div>
          <button
            onClick={() => onOpenPdfExport && onOpenPdfExport('dashboard')}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition text-sm font-medium border border-white/20"
          >
            <Icon name="download" className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Stats Cards - Projects, Subtasks, Jobs, Workstream Tasks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          className="bg-white rounded-xl p-6 border border-ocean-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
          onClick={() => openTaskList('projects')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-heading text-sm text-graystone-600 mb-1 tracking-wide">Projects</p>
              <div className="relative inline-flex items-center justify-center">
                <div
                  className="absolute rounded-full transition-all duration-300 scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100"
                  style={{ backgroundColor: '#0CFFFF', width: '43px', height: '43px' }}
                ></div>
                <p className="text-3xl font-bold text-ocean-900 relative z-10">
                  {myProjects.length}
                </p>
              </div>
            </div>
            <div className="w-12 h-12 bg-ocean-500 rounded-xl flex items-center justify-center">
              <Icon name="folder" className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-xs text-graystone-500 mt-2">View all</p>
        </div>

        <div
          className="bg-white rounded-xl p-6 border border-ocean-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
          onClick={() => openTaskList('subtasks')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-heading text-sm text-graystone-600 mb-1 tracking-wide">Subtasks</p>
              <div className="relative inline-flex items-center justify-center">
                <div
                  className="absolute rounded-full transition-all duration-300 scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100"
                  style={{ backgroundColor: '#0CFFFF', width: '43px', height: '43px' }}
                ></div>
                <p className="text-3xl font-bold text-ocean-900 relative z-10">
                  {mySubtasks.length}
                </p>
              </div>
            </div>
            <div className="w-12 h-12 bg-ocean-500 rounded-xl flex items-center justify-center">
              <Icon name="list-checks" className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-xs text-graystone-500 mt-2">Assigned to you</p>
        </div>

        <div
          className="bg-white rounded-xl p-6 border border-ocean-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
          onClick={() => openTaskList('jobs')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-heading text-sm text-graystone-600 mb-1 tracking-wide">Jobs</p>
              <div className="relative inline-flex items-center justify-center">
                <div
                  className="absolute rounded-full transition-all duration-300 scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100"
                  style={{ backgroundColor: '#0CFFFF', width: '43px', height: '43px' }}
                ></div>
                <p className="text-3xl font-bold text-ocean-900 relative z-10">{myJobs.length}</p>
              </div>
            </div>
            <div className="w-12 h-12 bg-ocean-500 rounded-xl flex items-center justify-center">
              <Icon name="briefcase" className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-xs text-graystone-500 mt-2">View all</p>
        </div>

        <div
          className="bg-white rounded-xl p-6 border border-ocean-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
          onClick={() => openTaskList('workstream')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-heading text-sm text-graystone-600 mb-1 tracking-wide">
                Workstream Tasks
              </p>
              <div className="relative inline-flex items-center justify-center">
                <div
                  className="absolute rounded-full transition-all duration-300 scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100"
                  style={{ backgroundColor: '#0CFFFF', width: '43px', height: '43px' }}
                ></div>
                <p className="text-3xl font-bold text-ocean-900 relative z-10">
                  {(workstreamTasks || []).filter((t) => t.status !== 'done').length}
                </p>
              </div>
            </div>
            <div className="w-12 h-12 bg-ocean-500 rounded-xl flex items-center justify-center">
              <Icon name="layers" className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-xs text-graystone-500 mt-2">Assigned to you</p>
        </div>
      </div>

      {/* Calendar and Today's Tasks Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendar Section */}
        <div className="bg-white rounded-xl border border-ocean-100 shadow-sm p-6">
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

          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => {
                const newDate = new Date(calendarMonth);
                if (calendarView === 'month') {
                  newDate.setMonth(newDate.getMonth() - 1);
                } else if (calendarView === 'week') {
                  newDate.setDate(newDate.getDate() - 7);
                } else {
                  newDate.setDate(newDate.getDate() - 1);
                }
                setCalendarMonth(newDate);
              }}
              className="p-2 hover:bg-ocean-50 rounded-lg transition"
            >
              <Icon name="chevron-left" className="w-4 h-4 text-ocean-600" />
            </button>
            <span className="font-medium text-ocean-900">
              {calendarView === 'day'
                ? calendarMonth.toLocaleDateString('en-GB', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })
                : calendarMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
            </span>
            <button
              onClick={() => {
                const newDate = new Date(calendarMonth);
                if (calendarView === 'month') {
                  newDate.setMonth(newDate.getMonth() + 1);
                } else if (calendarView === 'week') {
                  newDate.setDate(newDate.getDate() + 7);
                } else {
                  newDate.setDate(newDate.getDate() + 1);
                }
                setCalendarMonth(newDate);
              }}
              className="p-2 hover:bg-ocean-50 rounded-lg transition"
            >
              <Icon name="chevron-right" className="w-4 h-4 text-ocean-600" />
            </button>
          </div>

          {/* Month View */}
          {calendarView === 'month' && (
            <div>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
                  <div key={d} className="text-center text-xs font-medium text-graystone-500 py-1">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: startingDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-10"></div>
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
                        isToday
                          ? 'bg-ocean-500 text-white font-bold'
                          : isSelected
                            ? 'bg-ocean-100 text-ocean-900'
                            : 'hover:bg-ocean-50 text-ocean-900'
                      }`}
                    >
                      <span>{day}</span>
                      {items.length > 0 && (
                        <div className="flex gap-0.5 mt-0.5">
                          {items.slice(0, 3).map((_, idx) => (
                            <div
                              key={idx}
                              className={`w-1 h-1 rounded-full ${isToday ? 'bg-white' : 'bg-ocean-500'}`}
                            ></div>
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
              {getWeekDays().map((d) => {
                const dateStr = d.toISOString().slice(0, 10);
                const items = getScheduledItems(dateStr);
                const isToday = dateStr === today;
                const isSelected = selectedDate === dateStr;

                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                    className={`p-2 rounded-lg text-center transition ${
                      isToday
                        ? 'bg-ocean-500 text-white'
                        : isSelected
                          ? 'bg-ocean-100'
                          : 'hover:bg-ocean-50'
                    }`}
                  >
                    <div className="text-xs font-medium">
                      {d.toLocaleDateString('en-GB', { weekday: 'short' })}
                    </div>
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
          {calendarView === 'day' && (
            <div>
              {(() => {
                const dateStr = calendarMonth.toISOString().slice(0, 10);
                const items = getScheduledItems(dateStr);
                return items.length > 0 ? (
                  <div className="space-y-2">
                    {items.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() =>
                          item.type !== 'todo' && onOpenEntry && onOpenEntry(item.parentId || item.id)
                        }
                        className={`p-3 rounded-lg border ${item.type !== 'todo' ? 'cursor-pointer hover:border-ocean-500' : ''} ${
                          item.type === 'project'
                            ? 'bg-ocean-50 border-ocean-200'
                            : item.type === 'job'
                              ? 'bg-green-50 border-green-200'
                              : item.type === 'subtask'
                                ? 'bg-blue-50 border-blue-200'
                                : 'bg-graystone-50 border-graystone-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              item.type === 'project'
                                ? 'bg-ocean-200 text-ocean-800'
                                : item.type === 'job'
                                  ? 'bg-green-200 text-green-800'
                                  : item.type === 'subtask'
                                    ? 'bg-blue-200 text-blue-800'
                                    : 'bg-graystone-200 text-graystone-800'
                            }`}
                          >
                            {item.type}
                          </span>
                          <span className="font-medium text-sm truncate">
                            {item.title || item.text}
                          </span>
                        </div>
                        {item.parentTitle && (
                          <div className="text-xs text-graystone-500 mt-1">
                            From: {item.parentTitle}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-graystone-400">
                    <Icon name="calendar-x" className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No items scheduled</p>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Selected Date Detail Panel */}
          {selectedDate && calendarView !== 'day' && (
            <div className="mt-4 pt-4 border-t border-ocean-100">
              <h4 className="font-medium text-sm text-ocean-900 mb-2">
                {new Date(selectedDate).toLocaleDateString('en-GB', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </h4>
              {(() => {
                const items = getScheduledItems(selectedDate);
                return items.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {items.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() =>
                          item.type !== 'todo' && onOpenEntry && onOpenEntry(item.parentId || item.id)
                        }
                        className={`p-2 rounded-lg text-sm flex items-center gap-2 ${item.type !== 'todo' ? 'cursor-pointer hover:bg-ocean-100' : ''} bg-ocean-50`}
                      >
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded ${
                            item.type === 'project'
                              ? 'bg-ocean-200 text-ocean-800'
                              : item.type === 'job'
                                ? 'bg-green-200 text-green-800'
                                : item.type === 'subtask'
                                  ? 'bg-blue-200 text-blue-800'
                                  : 'bg-graystone-200 text-graystone-800'
                          }`}
                        >
                          {item.type}
                        </span>
                        <span className="truncate">{item.title || item.text}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-graystone-400">No items scheduled</p>
                );
              })()}
            </div>
          )}
        </div>

        {/* Today's Tasks */}
        <div className="bg-white rounded-xl border border-ocean-100 shadow-sm p-6">
          <h3 className="font-heading text-lg text-ocean-900 mb-4 flex items-center gap-2 tracking-wide">
            <Icon name="check-square" className="w-5 h-5" />
            Today's Tasks
          </h3>

          {/* Add Task Input */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
              placeholder="Add a new task..."
              className="flex-1 px-3 py-2 text-sm border border-ocean-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
            />
            <button
              onClick={handleAddTask}
              disabled={!newTaskText.trim()}
              className="px-4 py-2 bg-ocean-500 hover:bg-ocean-600 disabled:bg-graystone-300 text-white rounded-lg transition text-sm font-medium"
            >
              <Icon name="plus" className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {todaysTasks.length > 0 ? (
              todaysTasks.map((task, idx) => (
                <div
                  key={task.id || idx}
                  className={`p-3 rounded-lg border flex items-start gap-3 ${
                    task.taskType === 'job'
                      ? task.workflowStatus === 'done'
                        ? 'bg-green-100 border-green-300'
                        : 'bg-green-50 border-green-200'
                      : task.taskType === 'workstream'
                        ? task.status === 'done'
                          ? 'bg-violet-100 border-violet-300'
                          : 'bg-violet-50 border-violet-200'
                        : 'bg-graystone-50 border-graystone-200'
                  }`}
                >
                  {/* Checkbox for todos, jobs, and workstream tasks */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (task.taskType === 'todo') {
                        onToggleTodo && onToggleTodo(task.id);
                      } else if (task.taskType === 'job') {
                        handleMarkJobComplete(task.id);
                      } else if (task.taskType === 'workstream') {
                        onUpdateWorkstreamTask &&
                          onUpdateWorkstreamTask(task.id, {
                            status: task.status === 'done' ? 'open' : 'done',
                          });
                      }
                    }}
                    className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition ${
                      (task.taskType === 'todo' && task.completed) ||
                      (task.taskType === 'job' && task.workflowStatus === 'done') ||
                      (task.taskType === 'workstream' && task.status === 'done')
                        ? 'bg-green-500 border-green-500 text-white'
                        : task.taskType === 'job'
                          ? 'border-green-400 hover:border-green-600 hover:bg-green-100'
                          : task.taskType === 'workstream'
                            ? 'border-violet-400 hover:border-violet-600 hover:bg-violet-100'
                            : 'border-graystone-300 hover:border-ocean-500'
                    }`}
                    title={
                      task.taskType === 'workstream'
                        ? 'Mark as done'
                        : task.taskType === 'job'
                          ? 'Mark as done'
                          : 'Toggle complete'
                    }
                  >
                    {((task.taskType === 'todo' && task.completed) ||
                      (task.taskType === 'job' && task.workflowStatus === 'done') ||
                      (task.taskType === 'workstream' && task.status === 'done')) && (
                      <Icon name="check" className="w-3 h-3" />
                    )}
                  </button>

                  <div
                    className={`flex-1 min-w-0 ${task.taskType === 'job' || task.taskType === 'workstream' ? 'cursor-pointer' : ''}`}
                    onClick={() => {
                      if (task.taskType === 'job') {
                        onOpenEntry && onOpenEntry(task.id);
                      } else if (task.taskType === 'workstream') {
                        onOpenWorkstreamTask && onOpenWorkstreamTask(task.workstream_id, task.id);
                      }
                    }}
                  >
                    <div
                      className={`text-sm ${
                        (task.taskType === 'todo' && task.completed) ||
                        (task.taskType === 'job' && task.workflowStatus === 'done') ||
                        (task.taskType === 'workstream' && task.status === 'done')
                          ? 'line-through text-graystone-400'
                          : 'text-ocean-900'
                      }`}
                    >
                      {task.title || task.text}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          task.taskType === 'job'
                            ? 'bg-green-200 text-green-800'
                            : task.taskType === 'workstream'
                              ? 'bg-violet-200 text-violet-800'
                              : 'bg-graystone-200 text-graystone-600'
                        }`}
                      >
                        {task.taskType === 'job'
                          ? 'Job'
                          : task.taskType === 'workstream'
                            ? 'Workstream'
                            : 'Personal'}
                      </span>

                      {/* Workstream name for workstream tasks */}
                      {task.taskType === 'workstream' && task.workstreamTitle && (
                        <span className="text-xs text-violet-600">{task.workstreamTitle}</span>
                      )}

                      {/* Date editing for personal todos */}
                      {task.taskType === 'todo' &&
                        (editingTodoId === task.id ? (
                          <div
                            className="flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="date"
                              value={editingTodoDate}
                              onChange={(e) => setEditingTodoDate(e.target.value)}
                              className="text-xs px-1.5 py-0.5 border border-ocean-300 rounded focus:outline-none focus:ring-1 focus:ring-ocean-500"
                            />
                            <button
                              onClick={saveTodoDate}
                              className="text-xs px-1.5 py-0.5 bg-ocean-500 text-white rounded hover:bg-ocean-600"
                              title="Save date"
                            >
                              <Icon name="check" className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => clearTodoDate(task.id)}
                              className="text-xs px-1.5 py-0.5 bg-graystone-200 text-graystone-600 rounded hover:bg-graystone-300"
                              title="Clear date"
                            >
                              <Icon name="x" className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditingTodoDate(task);
                            }}
                            className="text-xs px-1.5 py-0.5 rounded bg-ocean-100 text-ocean-700 hover:bg-ocean-200 flex items-center gap-1"
                            title="Edit date"
                          >
                            <Icon name="calendar" className="w-3 h-3" />
                            {task.date
                              ? new Date(task.date).toLocaleDateString('en-GB', {
                                  day: 'numeric',
                                  month: 'short',
                                })
                              : 'No date'}
                          </button>
                        ))}

                      {task.taskType === 'job' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenEntry && onOpenEntry(task.id);
                          }}
                          className="text-xs text-green-600 hover:text-green-800 flex items-center gap-1"
                        >
                          <Icon name="external-link" className="w-3 h-3" />
                          Open
                        </button>
                      )}

                      {task.taskType === 'workstream' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenWorkstreamTask &&
                              onOpenWorkstreamTask(task.workstream_id, task.id);
                          }}
                          className="text-xs text-violet-600 hover:text-violet-800 flex items-center gap-1"
                        >
                          <Icon name="external-link" className="w-3 h-3" />
                          Open
                        </button>
                      )}

                      {/* Delete button for personal todos */}
                      {task.taskType === 'todo' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteTodo && onDeleteTodo(task.id);
                          }}
                          className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1 ml-auto"
                          title="Delete task"
                        >
                          <Icon name="trash-2" className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-graystone-400">
                <Icon name="check-circle" className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No tasks for today</p>
                <p className="text-xs mt-1">Add a task above to get started</p>
              </div>
            )}
          </div>
          {todaysTasks.length > 0 && (
            <div className="mt-4 pt-3 border-t border-ocean-100 text-sm text-graystone-500">
              {todaysTasks.length} task{todaysTasks.length !== 1 ? 's' : ''} &bull;{' '}
              {
                todaysTasks.filter(
                  (t) =>
                    t.completed || t.workflowStatus === 'done' || t.status === 'done'
                ).length
              }{' '}
              completed
            </div>
          )}
        </div>
      </div>

      {/* Mentions & Activity Feed */}
      <div className="bg-white rounded-xl border border-ocean-100 shadow-sm p-6">
        <h3 className="font-heading text-lg text-ocean-900 mb-4 flex items-center gap-2 tracking-wide">
          <Icon name="at-sign" className="w-5 h-5" />
          Mentions & Activity
        </h3>
        <div className="space-y-3">
          {mentionsAndActivity.length > 0 ? (
            mentionsAndActivity.map((item) => (
              <div
                key={item.id}
                onClick={() => onOpenEntry && onOpenEntry(item.entryId)}
                className="p-4 rounded-xl border border-ocean-100 hover:border-ocean-300 cursor-pointer transition bg-gradient-to-r from-white to-ocean-50"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-ocean-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {(item.author || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm">
                        {item.type === 'mention' ? (
                          <span>
                            <strong className="text-ocean-900">{item.author}</strong> mentioned you
                            in <strong className="text-ocean-900">"{item.entryTitle}"</strong>
                          </span>
                        ) : (
                          <span>
                            New comment on{' '}
                            <strong className="text-ocean-900">"{item.entryTitle}"</strong>
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-graystone-400 flex-shrink-0">
                        {timeAgo(item.timestamp)}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-graystone-600 line-clamp-2 bg-white/50 p-2 rounded border-l-2 border-ocean-300">
                      "{item.text}"
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-graystone-400">
              <Icon name="message-circle" className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No recent mentions or activity</p>
            </div>
          )}
        </div>
      </div>

      {/* Task List Modal for Subtasks */}
      {showTaskListModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="task-list-modal-title"
        >
          <div
            className="fixed inset-0"
            onClick={() => setShowTaskListModal(false)}
            aria-hidden="true"
          />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3
                id="task-list-modal-title"
                className="font-heading text-2xl text-ocean-900 tracking-wide"
              >
                {taskListType === 'projects' && 'My Projects'}
                {taskListType === 'subtasks' && 'My Subtasks'}
                {taskListType === 'jobs' && 'My Jobs'}
                {taskListType === 'workstream' && 'My Workstream Tasks'}
              </h3>
              <button
                onClick={() => setShowTaskListModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-ocean-500 hover:bg-ocean-600 transition-colors"
                aria-label="Close task list"
              >
                <Icon name="x" className="w-5 h-5 text-white" aria-hidden="true" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[60vh] space-y-2">
              {taskListItems.length > 0 ? (
                taskListItems.map((task, idx) => {
                  const itemType = task.isWorkstreamTask
                    ? 'workstream'
                    : task.isSubtask
                      ? 'subtask'
                      : task.itemType === 'job'
                        ? 'job'
                        : 'project';
                  const currentDate = task.isWorkstreamTask
                    ? task.deadline
                    : task.isSubtask
                      ? task.deadline
                      : task.date || task.timelineValue;
                  const isEditing = editingItemId === task.id;

                  return (
                    <div
                      key={task.id || idx}
                      className="w-full p-4 rounded-xl border border-ocean-100 hover:border-ocean-300 transition-all group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div
                            className="font-medium text-sm text-ocean-900 truncate mb-1 heading-font cursor-pointer hover:text-ocean-600"
                            onClick={() => {
                              setShowTaskListModal(false);
                              if (task.isWorkstreamTask) {
                                onOpenWorkstreamTask &&
                                  onOpenWorkstreamTask(task.workstream_id, task.id);
                              } else if (task.isSubtask && task.parentId) {
                                onOpenEntry(task.parentId);
                              } else {
                                onOpenEntry(task.id);
                              }
                            }}
                          >
                            {task.title}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-graystone-600 flex-wrap">
                            {task.isSubtask && task.parentTitle && (
                              <div className="flex items-center gap-1">
                                <Icon name="folder" className="w-3 h-3" />
                                <span>{task.parentTitle}</span>
                              </div>
                            )}
                            {task.isWorkstreamTask && task.workstreamTitle && (
                              <div className="flex items-center gap-1">
                                <Icon name="layers" className="w-3 h-3 text-violet-600" />
                                <span className="text-violet-600">{task.workstreamTitle}</span>
                              </div>
                            )}
                            {task.isWorkstreamTask && task.priority && (
                              <span
                                className={`px-1.5 py-0.5 rounded text-xs ${
                                  task.priority === 'high'
                                    ? 'bg-red-100 text-red-700'
                                    : task.priority === 'medium'
                                      ? 'bg-amber-100 text-amber-700'
                                      : 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                              </span>
                            )}
                            {(task.owner || task.assignedTo || task.assignee) && (
                              <div className="flex items-center gap-1">
                                <Icon name="user" className="w-3 h-3" />
                                <span>{task.owner || task.assignedTo || task.assignee}</span>
                              </div>
                            )}

                            {/* Date editing */}
                            {isEditing ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="date"
                                  value={editingItemDate}
                                  onChange={(e) => setEditingItemDate(e.target.value)}
                                  className="text-xs px-1.5 py-0.5 border border-ocean-300 rounded focus:outline-none focus:ring-1 focus:ring-ocean-500"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    saveItemDate(task);
                                  }}
                                  className="text-xs px-1.5 py-0.5 bg-ocean-500 text-white rounded hover:bg-ocean-600"
                                  title="Save date"
                                >
                                  <Icon name="check" className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    clearItemDate(task);
                                  }}
                                  className="text-xs px-1.5 py-0.5 bg-graystone-200 text-graystone-600 rounded hover:bg-graystone-300"
                                  title="Clear date"
                                >
                                  <Icon name="x" className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEditingItemDate(task, itemType);
                                }}
                                className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-ocean-100 text-ocean-700 hover:bg-ocean-200"
                                title="Edit date"
                              >
                                <Icon name="calendar" className="w-3 h-3" />
                                <span>
                                  {currentDate
                                    ? new Date(currentDate).toLocaleDateString('en-GB', {
                                        day: 'numeric',
                                        month: 'short',
                                      })
                                    : 'No date'}
                                </span>
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {task.workflowStatus && Badge && (
                            <Badge
                              variant={task.workflowStatus === 'Done' ? 'success' : 'default'}
                              className="text-[10px]"
                            >
                              {task.workflowStatus}
                            </Badge>
                          )}
                          {task.isSubtask && (
                            <span
                              className={`text-xs px-2 py-0.5 rounded ${task.completed ? 'bg-green-100 text-green-700' : 'bg-graystone-100 text-graystone-600'}`}
                            >
                              {task.completed ? 'Done' : 'Pending'}
                            </span>
                          )}
                          <button
                            onClick={() => {
                              setShowTaskListModal(false);
                              if (task.isSubtask && task.parentId) {
                                onOpenEntry(task.parentId);
                              } else {
                                onOpenEntry(task.id);
                              }
                            }}
                            className="p-1 rounded hover:bg-ocean-100 transition"
                            title="Open details"
                          >
                            <Icon
                              name="external-link"
                              className="w-4 h-4 text-graystone-400 group-hover:text-ocean-500"
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 text-graystone-400">
                  <Icon name="inbox" className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No items found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
