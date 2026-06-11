import React, { useState, useMemo, useCallback } from 'react';
import { Icon } from '../../ui';
import DashboardCalendar from './DashboardCalendar';
import TodaysTasks from './TodaysTasks';
import TaskListModal from './TaskListModal';

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
  workstreams = [],
  workstreamTasks = [],
  onOpenWorkstreamTask,
  onUpdateWorkstreamTask,
  Badge,
  events = [],
}) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  // New task input
  const [newTaskText, setNewTaskText] = useState('');

  // Task list modal
  const [showTaskListModal, setShowTaskListModal] = useState(false);
  const [taskListType, setTaskListType] = useState('');
  const [taskListItems, setTaskListItems] = useState([]);

  const handleAddTask = () => {
    const trimmed = newTaskText.trim();
    if (!trimmed || !onAddTodo || trimmed.length > 500) return;
    onAddTodo({ text: trimmed, date: today, completed: false });
    setNewTaskText('');
  };

  const handleMarkJobComplete = (jobId) => {
    if (onUpdateEntry) onUpdateEntry(jobId, { workflowStatus: 'done', archived: true });
  };

  // Stats (memoized)
  const myProjects = useMemo(
    () => entries.filter((e) =>
      e.itemType !== 'job' && !e.archived &&
      (e.owner?.includes(currentUser) || e.ownerEmail?.includes(userEmail) || e.collaborators?.includes(currentUser))
    ),
    [entries, currentUser, userEmail]
  );

  const myJobs = useMemo(
    () => entries.filter((e) =>
      e.itemType === 'job' && !e.archived &&
      (e.owner?.includes(currentUser) || e.ownerEmail?.includes(userEmail) || e.collaborators?.includes(currentUser))
    ),
    [entries, currentUser, userEmail]
  );

  const mySubtasks = useMemo(
    () => entries.flatMap((e) =>
      (e.subtasks || [])
        .filter((st) => st.assignedTo === currentUser)
        .map((st) => ({ ...st, parentId: e.id, parentTitle: e.title }))
    ),
    [entries, currentUser]
  );

  const myWorkstreamTasks = useMemo(
    () => (workstreamTasks || []).filter((task) =>
      task.assignee === currentUser || task.assignee_email === userEmail
    ),
    [workstreamTasks, currentUser, userEmail]
  );

  // Calendar scheduled items lookup
  const getScheduledItems = (dateStr) => {
    const items = [];
    entries.forEach((e) => {
      if (e.archived || e.workflowStatus === 'Complete' || e.workflowStatus === 'done') return;
      const itemDate = e.date || e.timelineValue;
      if (itemDate && itemDate.slice(0, 10) === dateStr) {
        items.push({ type: e.itemType === 'job' ? 'job' : 'project', ...e });
      }
    });
    entries.forEach((e) => {
      if (e.archived) return;
      (e.subtasks || []).forEach((st) => {
        if (st.completed) return;
        if (st.deadline && st.deadline.slice(0, 10) === dateStr) {
          items.push({ type: 'subtask', parentTitle: e.title, parentId: e.id, ...st });
        }
      });
    });
    (todos || []).forEach((t) => {
      if (t.completed) return;
      if (t.date === dateStr) items.push({ type: 'todo', ...t });
    });
    myWorkstreamTasks.forEach((t) => {
      if (t.status === 'done') return;
      if (t.deadline && t.deadline.slice(0, 10) === dateStr) items.push({ type: 'workstream', ...t });
    });
    return items;
  };

  // Today's tasks
  const todaysTodos = useMemo(() => (todos || []).filter((t) => t.date === today && !t.completed), [todos, today]);
  const jobsForToday = useMemo(
    () => myJobs.filter((j) => {
      if (j.workflowStatus === 'done') return false;
      const jobDate = j.date || j.timelineValue;
      return jobDate && jobDate.slice(0, 10) === today;
    }),
    [myJobs, today]
  );
  const workstreamTasksForToday = useMemo(
    () => myWorkstreamTasks.filter((t) => t.status !== 'done' && t.deadline?.slice(0, 10) === today),
    [myWorkstreamTasks, today]
  );
  const todaysTasks = useMemo(
    () => [
      ...todaysTodos.map((t) => ({ ...t, taskType: 'todo' })),
      ...jobsForToday.map((j) => ({ ...j, taskType: 'job' })),
      ...workstreamTasksForToday.map((t) => ({
        ...t, taskType: 'workstream',
        workstreamTitle: (workstreams || []).find((w) => w.id === t.workstream_id)?.title,
      })),
    ],
    [todaysTodos, jobsForToday, workstreamTasksForToday, workstreams]
  );

  // Mentions & Activity
  const mentionsAndActivity = useMemo(() => {
    const mentions = [];
    const currentUserLower = (currentUser || '').toLowerCase();

    entries.forEach((entry) => {
      const isMyProject = entry.owner?.includes(currentUser) || entry.collaborators?.includes(currentUser);
      (entry.comments || []).forEach((comment) => {
        const mentionsMe = comment.text?.toLowerCase().includes(`@${currentUserLower}`);
        if (mentionsMe || isMyProject) {
          mentions.push({
            id: comment.id, type: mentionsMe ? 'mention' : 'activity',
            entryId: entry.id, entryTitle: entry.title,
            author: comment.author, text: comment.text, timestamp: comment.timestamp,
          });
        }
      });
    });

    (workstreamTasks || []).forEach((task) => {
      const isAssigned = task.assignee === currentUser || task.assignee_email === userEmail;
      (task.comments || []).forEach((comment) => {
        const mentionsMe = comment.text?.toLowerCase().includes(`@${currentUserLower}`);
        if (mentionsMe || isAssigned) {
          mentions.push({
            id: comment.id, type: mentionsMe ? 'mention' : 'activity',
            entryId: task.id, entryTitle: task.title,
            author: comment.author, text: comment.text, timestamp: comment.timestamp,
            isWorkstreamTask: true, workstreamId: task.workstream_id,
          });
        }
      });
    });

    return mentions.filter((m) => m.author !== currentUser)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10);
  }, [entries, workstreamTasks, currentUser, userEmail]);

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

  const openTaskList = useCallback((type) => {
    setTaskListType(type);
    if (type === 'projects') setTaskListItems(myProjects);
    else if (type === 'subtasks') setTaskListItems(mySubtasks.map((st) => ({ ...st, isSubtask: true })));
    else if (type === 'jobs') setTaskListItems(myJobs);
    else if (type === 'workstream') setTaskListItems(myWorkstreamTasks.map((t) => ({ ...t, isWorkstreamTask: true })));
    setShowTaskListModal(true);
  }, [myProjects, mySubtasks, myJobs, myWorkstreamTasks]);

  const statCards = [
    { type: 'projects', label: 'Projects', count: myProjects.length, icon: 'folder', sub: 'View all' },
    { type: 'subtasks', label: 'Subtasks', count: mySubtasks.length, icon: 'list-checks', sub: 'Assigned to you' },
    { type: 'jobs', label: 'Tasks', count: myJobs.length, icon: 'briefcase', sub: 'View all' },
    { type: 'workstream', label: 'Workstream Tasks', count: myWorkstreamTasks.filter((t) => t.status !== 'done').length, icon: 'layers', sub: 'Assigned to you' },
  ];

  return (
    <div className="p-6 space-y-6" id="dashboard-export-content">
      {/* Welcome Header */}
      <div className="bg-ocean-800 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Welcome back, {(currentUser || 'User').split(' ')[0]}!</h1>
            <p className="text-ocean-100 text-sm">Here's your momentum for today</p>
          </div>
          <button
            onClick={() => onOpenPdfExport?.('dashboard')}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition text-sm font-medium border border-white/20"
          >
            <Icon name="download" className="w-4 h-4" /> Export PDF
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.type}
            className="bg-white rounded-xl p-6 border border-graystone-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
            onClick={() => openTaskList(card.type)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openTaskList(card.type); } }}
            role="button"
            tabIndex={0}
            aria-label={`View ${card.count} ${card.label.toLowerCase()}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-heading text-sm text-graystone-600 mb-1 tracking-wide">{card.label}</p>
                <div className="relative inline-flex items-center justify-center">
                  <div className="absolute rounded-full transition-all duration-300 scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100" style={{ backgroundColor: '#0CFFFF', width: '43px', height: '43px' }} />
                  <p className="text-3xl font-bold text-ocean-900 relative z-10">{card.count}</p>
                </div>
              </div>
              <div className="w-12 h-12 bg-ocean-500 rounded-xl flex items-center justify-center">
                <Icon name={card.icon} className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-xs text-graystone-500 mt-2">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Calendar and Today's Tasks Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardCalendar
          today={today}
          getScheduledItems={getScheduledItems}
          onOpenEntry={onOpenEntry}
          onOpenWorkstreamTask={onOpenWorkstreamTask}
        />
        <TodaysTasks
          todaysTasks={todaysTasks}
          newTaskText={newTaskText}
          setNewTaskText={setNewTaskText}
          onAddTask={handleAddTask}
          onToggleTodo={onToggleTodo}
          onDeleteTodo={onDeleteTodo}
          onUpdateTodo={onUpdateTodo}
          onMarkJobComplete={handleMarkJobComplete}
          onUpdateWorkstreamTask={onUpdateWorkstreamTask}
          onOpenEntry={onOpenEntry}
          onOpenWorkstreamTask={onOpenWorkstreamTask}
        />
      </div>

      {/* Upcoming Events */}
      {events && events.length > 0 && (() => {
        const next7 = new Date();
        next7.setDate(next7.getDate() + 7);
        const next7Str = next7.toISOString().slice(0, 10);
        const upcoming = events.filter((e) => e.event_date >= today && e.event_date <= next7Str).slice(0, 5);
        if (upcoming.length === 0) return null;

        const COLOR_MAP = {
          ocean: 'bg-ocean-100 text-ocean-700', green: 'bg-green-100 text-green-700',
          purple: 'bg-purple-100 text-purple-700', orange: 'bg-orange-100 text-orange-700',
          pink: 'bg-pink-100 text-pink-700', teal: 'bg-teal-100 text-teal-700', red: 'bg-red-100 text-red-700',
        };

        return (
          <div className="bg-white rounded-xl border border-graystone-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg text-ocean-900 flex items-center gap-2 tracking-wide">
                <Icon name="calendar" className="w-5 h-5" /> Upcoming Events
              </h3>
              <button onClick={() => onNavigate('events-calendar')} className="text-sm text-ocean-600 hover:text-ocean-700 hover:underline">
                View all
              </button>
            </div>
            <div className="space-y-2">
              {upcoming.map((event) => {
                const colorCls = COLOR_MAP[event.color] || COLOR_MAP.ocean;
                const dateLabel = new Date(event.event_date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
                return (
                  <button
                    key={event.id}
                    onClick={() => onNavigate('events-calendar')}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-graystone-200 hover:border-ocean-300 hover:bg-ocean-50/30 transition text-left"
                  >
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colorCls}`}>{dateLabel}</span>
                    <span className="text-sm text-ocean-900 truncate flex-1">{event.title}</span>
                    {event.location && <span className="text-xs text-graystone-400 hidden sm:inline">{event.location}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Mentions & Activity */}
      <div className="bg-white rounded-xl border border-graystone-200 shadow-sm p-6">
        <h3 className="font-heading text-lg text-ocean-900 mb-4 flex items-center gap-2 tracking-wide">
          <Icon name="at-sign" className="w-5 h-5" /> Mentions & Activity
        </h3>
        <div className="space-y-3">
          {mentionsAndActivity.length > 0 ? (
            mentionsAndActivity.map((item, index) => (
              <div
                key={`${item.type}:${item.entryId}:${item.id || item.timestamp || index}`}
                onClick={() => {
                  if (item.isWorkstreamTask) onOpenWorkstreamTask?.(item.workstreamId, item.entryId);
                  else onOpenEntry?.(item.entryId);
                }}
                className="p-4 rounded-xl border border-graystone-200 hover:border-ocean-300 cursor-pointer transition bg-gradient-to-r from-white to-ocean-50"
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
                            <strong className="text-ocean-900">{item.author}</strong> mentioned you in{' '}
                            <strong className="text-ocean-900">"{item.entryTitle}"</strong>
                            {item.isWorkstreamTask && <span className="ml-1 text-xs text-violet-600">(Workstream)</span>}
                          </span>
                        ) : (
                          <span>
                            New comment on <strong className="text-ocean-900">"{item.entryTitle}"</strong>
                            {item.isWorkstreamTask && <span className="ml-1 text-xs text-violet-600">(Workstream)</span>}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-graystone-400 flex-shrink-0">{timeAgo(item.timestamp)}</span>
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

      <TaskListModal
        show={showTaskListModal}
        taskListType={taskListType}
        taskListItems={taskListItems}
        onClose={() => setShowTaskListModal(false)}
        onOpenEntry={onOpenEntry}
        onOpenWorkstreamTask={onOpenWorkstreamTask}
        onUpdateEntry={onUpdateEntry}
        onEditSubtask={onEditSubtask}
        Badge={Badge}
      />
    </div>
  );
}
