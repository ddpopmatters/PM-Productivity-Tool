import React, { useState } from 'react';
import clsx from 'clsx';
import Icon from '../../ui/Icon';

const TaskCard = ({ task, showDeadline, onDragStart, onClick, onToggleStatus }) => (
  <div
    draggable
    onDragStart={() => onDragStart(task)}
    onClick={() => onClick(task.id)}
    className="bg-white rounded-lg border border-graystone-200 p-3 cursor-pointer hover:shadow-md hover:border-ocean-300 transition group"
  >
    <div className="flex items-start gap-2">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleStatus(task);
        }}
        aria-label={task.status === 'done' ? 'Mark incomplete' : 'Mark complete'}
        className={clsx(
          "w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition",
          task.status === 'done'
            ? "bg-ocean-500 border-ocean-500 text-white"
            : "border-graystone-300 hover:border-ocean-500"
        )}
      >
        {task.status === 'done' && <Icon name="check" className="w-3 h-3" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={clsx(
          "text-sm font-medium",
          task.status === 'done' ? "text-graystone-400 line-through" : "text-graystone-900"
        )}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-1 text-xs text-graystone-400 flex-wrap">
          {task.task_type && (
            <span className="px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded text-xs">
              {task.task_type}
            </span>
          )}
          {showDeadline && task.deadline && (
            <span className={clsx(
              "flex items-center gap-1",
              task.deadline < new Date().toISOString().slice(0, 10) ? "text-red-500" : ""
            )}>
              <Icon name="calendar" className="w-3 h-3" />
              {new Date(task.deadline).toLocaleDateString()}
            </span>
          )}
          {task.assignee && (
            <span className="flex items-center gap-1">
              <Icon name="user" className="w-3 h-3" />
              {task.assignee}
            </span>
          )}
        </div>
      </div>
      <Icon name="grip-vertical" className="w-4 h-4 text-graystone-300 opacity-0 group-hover:opacity-100 cursor-grab" />
    </div>
  </div>
);

const PrioritySection = ({ priority, tasks: priorityTasks, label, isDragging, onDragOver, onDrop, renderTask }) => (
  <div
    onDragOver={onDragOver}
    onDrop={() => onDrop(priority)}
    className={clsx(
      "border rounded-lg p-3 transition",
      isDragging ? "border-dashed border-ocean-400 bg-ocean-50" : "border-graystone-200"
    )}
  >
    <div className="flex items-center justify-between mb-2">
      <h4 className="text-xs font-semibold text-graystone-500 uppercase">{label} ({priorityTasks.length})</h4>
    </div>
    <div className="space-y-2">
      {priorityTasks.map(task => renderTask(task))}
      {priorityTasks.length === 0 && isDragging && (
        <p className="text-xs text-graystone-400 text-center py-2">Drop tasks here</p>
      )}
    </div>
  </div>
);

const TaskTypeSelector = ({ allTaskTypes, value, onChange, showAddInput, onToggleAddInput, customValue, onCustomChange, onAddCustom }) => (
  <div className="relative">
    {showAddInput ? (
      <div className="flex gap-2">
        <input
          type="text"
          value={customValue}
          onChange={(e) => onCustomChange(e.target.value)}
          placeholder="New type name..."
          className="flex-1 px-3 py-2 text-sm border border-graystone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
          onKeyDown={(e) => e.key === 'Enter' && onAddCustom()}
        />
        <button
          onClick={onAddCustom}
          disabled={!customValue.trim()}
          className="px-3 py-2 bg-ocean-500 text-white text-sm rounded-lg hover:bg-ocean-600 transition disabled:opacity-50"
        >
          Add
        </button>
        <button
          onClick={() => { onToggleAddInput(false); onCustomChange(''); }}
          className="px-3 py-2 text-graystone-600 text-sm hover:bg-graystone-100 rounded-lg transition"
        >
          Cancel
        </button>
      </div>
    ) : (
      <div className="flex gap-2">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3 py-2 text-sm border border-graystone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
        >
          {allTaskTypes.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
        <button
          onClick={() => onToggleAddInput(true)}
          className="px-3 py-2 text-ocean-600 text-sm hover:bg-ocean-50 rounded-lg transition flex items-center gap-1"
          title="Add new type"
          aria-label="Add new task type"
        >
          <Icon name="plus" className="w-4 h-4" />
        </button>
      </div>
    )}
  </div>
);

const WorkstreamView = ({
  workstream,
  workstreamTasks = [],
  currentUser,
  userEmail,
  onBack,
  onCreateTask,
  onUpdateTask,
  onUpdateWorkstream,
  onDeleteWorkstream,
  onOpenTask,
  WorkstreamSettings,
}) => {
  const taskList = workstreamTasks;
  const [showSettings, setShowSettings] = useState(false);
  const [showNewTaskForm, setShowNewTaskForm] = useState(null); // 'deadline' or 'backlog'
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');
  const [newTaskType, setNewTaskType] = useState('Issue');
  const [showAddTypeInput, setShowAddTypeInput] = useState(false);
  const [newCustomType, setNewCustomType] = useState('');
  const [draggedTask, setDraggedTask] = useState(null);
  const [pendingDeadlineTask, setPendingDeadlineTask] = useState(null);
  const [pendingDeadlineDate, setPendingDeadlineDate] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Default task types + any custom types used in this workstream
  const defaultTaskTypes = ['Issue', 'Feature Request', 'Feature Improvement'];
  const existingTypes = [...new Set((taskList || []).map(t => t.task_type).filter(Boolean))];
  const allTaskTypes = [...new Set([...defaultTaskTypes, ...existingTypes])];

  // Split tasks into time-sensitive and backlog
  const timeSensitiveTasks = (taskList || [])
    .filter(t => t.deadline && t.status !== 'done')
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

  const backlogTasks = (taskList || [])
    .filter(t => !t.deadline && t.status !== 'done');

  const highPriority = backlogTasks.filter(t => t.priority === 'high').sort((a, b) => a.sort_order - b.sort_order);
  const mediumPriority = backlogTasks.filter(t => t.priority === 'medium').sort((a, b) => a.sort_order - b.sort_order);
  const lowPriority = backlogTasks.filter(t => t.priority === 'low').sort((a, b) => a.sort_order - b.sort_order);

  const completedTasks = (taskList || [])
    .filter(t => t.status === 'done')
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim() || isSubmitting) return;
    setIsSubmitting(true);

    const task = {
      workstreamId: workstream.id,
      title: newTaskTitle.trim(),
      priority: showNewTaskForm === 'deadline' ? 'medium' : newTaskPriority,
      deadline: showNewTaskForm === 'deadline' ? newTaskDeadline : null,
      taskType: newTaskType,
      assignee: currentUser,
      assigneeEmail: userEmail,
      sortOrder: showNewTaskForm === 'backlog'
        ? (newTaskPriority === 'high' ? highPriority.length : newTaskPriority === 'medium' ? mediumPriority.length : lowPriority.length)
        : 0
    };

    const result = await onCreateTask(task);
    setIsSubmitting(false);
    if (result) {
      setNewTaskTitle('');
      setNewTaskDeadline('');
      setNewTaskPriority('medium');
      setNewTaskType('Issue');
      setShowNewTaskForm(null);
    }
  };

  const handleAddCustomType = () => {
    if (newCustomType.trim() && !allTaskTypes.includes(newCustomType.trim())) {
      setNewTaskType(newCustomType.trim());
      setNewCustomType('');
      setShowAddTypeInput(false);
    }
  };

  const handleDragStart = (task) => {
    setDraggedTask(task);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDropOnPriority = async (targetPriority) => {
    if (!draggedTask) return;

    const targetList = targetPriority === 'high' ? highPriority
      : targetPriority === 'medium' ? mediumPriority
      : lowPriority;

    const newSortOrder = targetList.length;

    const updates = {
      priority: targetPriority,
      sortOrder: newSortOrder,
    };
    if (draggedTask.deadline) {
      updates.deadline = null;
    }
    await onUpdateTask(draggedTask.id, workstream.id, updates);

    setDraggedTask(null);
  };

  const handleDropOnTimeSensitive = () => {
    if (!draggedTask) return;
    setPendingDeadlineTask(draggedTask);
    setPendingDeadlineDate('');
    setDraggedTask(null);
  };

  const handleConfirmDeadline = async () => {
    if (!pendingDeadlineTask || !pendingDeadlineDate) return;
    await onUpdateTask(pendingDeadlineTask.id, workstream.id, {
      deadline: pendingDeadlineDate
    });
    setPendingDeadlineTask(null);
    setPendingDeadlineDate('');
  };

  const handleCancelDeadline = () => {
    setPendingDeadlineTask(null);
    setPendingDeadlineDate('');
  };

  const handleToggleStatus = (task) => {
    onUpdateTask(task.id, workstream.id, { status: task.status === 'done' ? 'open' : 'done' });
  };

  const renderTask = (task, showDeadline = false) => (
    <TaskCard
      key={task.id}
      task={task}
      showDeadline={showDeadline}
      onDragStart={handleDragStart}
      onClick={onOpenTask}
      onToggleStatus={handleToggleStatus}
    />
  );

  const taskTypeProps = {
    allTaskTypes,
    value: newTaskType,
    onChange: setNewTaskType,
    showAddInput: showAddTypeInput,
    onToggleAddInput: setShowAddTypeInput,
    customValue: newCustomType,
    onCustomChange: setNewCustomType,
    onAddCustom: handleAddCustomType,
  };

  if (!workstream) return null;

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      {/* Header */}
      <div className="bg-ocean-800 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/20 rounded-lg transition"
            aria-label="Back to workstreams"
          >
            <Icon name="arrow-left" className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h2 className="text-2xl font-bold">{workstream.title}</h2>
            {workstream.description && (
              <p className="text-ocean-100 text-sm mt-1">{workstream.description}</p>
            )}
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 hover:bg-white/20 rounded-lg transition"
            aria-label="Workstream settings"
          >
            <Icon name="settings" className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Time-sensitive column */}
        <div
          onDragOver={handleDragOver}
          onDrop={handleDropOnTimeSensitive}
          className="bg-white rounded-xl border border-graystone-200 p-4"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-ocean-900">
              Time-Sensitive ({timeSensitiveTasks.length})
            </h3>
          </div>

          <div className="space-y-2 mb-4">
            {timeSensitiveTasks.map(task => renderTask(task, true))}
            {timeSensitiveTasks.length === 0 && !showNewTaskForm && !pendingDeadlineTask && (
              <p className="text-sm text-graystone-400 text-center py-4">No time-sensitive tasks</p>
            )}
          </div>

          {/* Inline deadline picker after drag-drop */}
          {pendingDeadlineTask && (
            <div className="border border-ocean-300 bg-ocean-50 rounded-lg p-3 mb-4 space-y-2">
              <p className="text-sm font-medium text-ocean-900">
                Set deadline for <span className="font-bold">{pendingDeadlineTask.title}</span>
              </p>
              <input
                type="date"
                value={pendingDeadlineDate}
                onChange={(e) => setPendingDeadlineDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-graystone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleConfirmDeadline}
                  disabled={!pendingDeadlineDate}
                  className="px-3 py-1.5 bg-ocean-500 text-white text-sm rounded-lg hover:bg-ocean-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Set Deadline
                </button>
                <button
                  onClick={handleCancelDeadline}
                  className="px-3 py-1.5 text-graystone-600 text-sm hover:bg-graystone-100 rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {showNewTaskForm === 'deadline' ? (
            <div className="border border-ocean-200 rounded-lg p-3 space-y-2">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Task title..."
                className="w-full px-3 py-2 text-sm border border-graystone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                autoFocus
              />
              <input
                type="date"
                value={newTaskDeadline}
                onChange={(e) => setNewTaskDeadline(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-graystone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
              />
              <TaskTypeSelector {...taskTypeProps} />
              <div className="flex gap-2">
                <button
                  onClick={handleCreateTask}
                  disabled={!newTaskTitle.trim() || !newTaskDeadline || isSubmitting}
                  className="px-3 py-1.5 bg-ocean-500 text-white text-sm rounded-lg hover:bg-ocean-600 transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Adding...' : 'Add'}
                </button>
                <button
                  onClick={() => { setShowNewTaskForm(null); setNewTaskTitle(''); setNewTaskDeadline(''); setNewTaskType('Issue'); }}
                  className="px-3 py-1.5 text-graystone-600 text-sm hover:bg-graystone-100 rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowNewTaskForm('deadline')}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-ocean-600 hover:bg-ocean-50 rounded-lg transition"
            >
              <Icon name="plus" className="w-4 h-4" />
              Add time-sensitive task
            </button>
          )}
        </div>

        {/* Backlog column */}
        <div className="bg-white rounded-xl border border-graystone-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-ocean-900">Backlog</h3>
          </div>

          <div className="space-y-4 mb-4">
            <PrioritySection priority="high" tasks={highPriority} label="High" isDragging={!!draggedTask} onDragOver={handleDragOver} onDrop={handleDropOnPriority} renderTask={task => renderTask(task)} />
            <PrioritySection priority="medium" tasks={mediumPriority} label="Medium" isDragging={!!draggedTask} onDragOver={handleDragOver} onDrop={handleDropOnPriority} renderTask={task => renderTask(task)} />
            <PrioritySection priority="low" tasks={lowPriority} label="Low" isDragging={!!draggedTask} onDragOver={handleDragOver} onDrop={handleDropOnPriority} renderTask={task => renderTask(task)} />
          </div>

          {showNewTaskForm === 'backlog' ? (
            <div className="border border-ocean-200 rounded-lg p-3 space-y-2">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Task title..."
                className="w-full px-3 py-2 text-sm border border-graystone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                autoFocus
              />
              <select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-graystone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
              >
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
              <TaskTypeSelector {...taskTypeProps} />
              <div className="flex gap-2">
                <button
                  onClick={handleCreateTask}
                  disabled={!newTaskTitle.trim() || isSubmitting}
                  className="px-3 py-1.5 bg-ocean-500 text-white text-sm rounded-lg hover:bg-ocean-600 transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Adding...' : 'Add'}
                </button>
                <button
                  onClick={() => { setShowNewTaskForm(null); setNewTaskTitle(''); setNewTaskType('Issue'); }}
                  className="px-3 py-1.5 text-graystone-600 text-sm hover:bg-graystone-100 rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowNewTaskForm('backlog')}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-ocean-600 hover:bg-ocean-50 rounded-lg transition"
            >
              <Icon name="plus" className="w-4 h-4" />
              Add to backlog
            </button>
          )}
        </div>
      </div>

      {/* Completed tasks */}
      {completedTasks.length > 0 && (
        <div className="bg-white rounded-xl border border-graystone-200">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="w-full flex items-center justify-between p-4 hover:bg-graystone-50 transition rounded-xl"
          >
            <div className="flex items-center gap-2">
              <Icon name="check-circle" className="w-5 h-5 text-green-500" />
              <h3 className="text-sm font-semibold text-graystone-600">
                Completed ({completedTasks.length})
              </h3>
            </div>
            <Icon
              name={showCompleted ? "chevron-up" : "chevron-down"}
              className="w-5 h-5 text-graystone-400"
            />
          </button>
          {showCompleted && (
            <div className="px-4 pb-4 space-y-2">
              {completedTasks.map(task => (
                <div
                  key={task.id}
                  onClick={() => onOpenTask(task.id)}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-graystone-50 cursor-pointer transition"
                >
                  <div className="w-5 h-5 rounded border-2 bg-green-500 border-green-500 text-white flex items-center justify-center flex-shrink-0">
                    <Icon name="check" className="w-3 h-3" />
                  </div>
                  <span className="text-sm text-graystone-400 line-through flex-1 truncate">
                    {task.title}
                  </span>
                  {task.updated_at && (
                    <span className="text-xs text-graystone-300 flex-shrink-0">
                      {new Date(task.updated_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && WorkstreamSettings && (
        <WorkstreamSettings
          workstream={workstream}
          onClose={() => setShowSettings(false)}
          onUpdate={onUpdateWorkstream}
          onDelete={onDeleteWorkstream}
        />
      )}
    </div>
  );
};

export default WorkstreamView;
