import { useState } from 'react';
import clsx from 'clsx';
import Icon from '../../ui/Icon';
import {
  EFFORT_LABELS,
  getTaskEffort,
  setTaskEffort,
} from '../../../utils/workstreamEffort';

const PRIORITY_COLUMNS = [
  { key: 'high', label: 'High priority', accent: 'text-red-700 bg-red-50 border-red-200' },
  { key: 'medium', label: 'Medium priority', accent: 'text-amber-700 bg-amber-50 border-amber-200' },
  { key: 'low', label: 'Low priority', accent: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
];

const EFFORT_ROWS = [
  { key: 'low', label: 'Low effort', hint: 'Quick wins' },
  { key: 'medium', label: 'Medium effort', hint: 'Balanced work' },
  { key: 'high', label: 'High effort', hint: 'Larger lifts' },
  { key: '', label: 'No estimate', hint: 'Needs sizing' },
];

const EffortSelect = ({ value, onChange, ariaLabel = 'New task effort' }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    aria-label={ariaLabel}
    className="w-full px-3 py-2 text-sm border border-graystone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
  >
    <option value="">No effort estimate</option>
    <option value="low">Low effort</option>
    <option value="medium">Medium effort</option>
    <option value="high">High effort</option>
  </select>
);

const TaskCard = ({ task, showDeadline, onDragStart, onDragEnd, onClick, onToggleStatus, isDragging }) => {
  const effort = getTaskEffort(task);

  return (
    <div
      draggable
      onDragStart={() => onDragStart(task)}
      onDragEnd={onDragEnd}
      onClick={() => onClick(task.id)}
      className={clsx(
        "bg-white rounded-lg border border-graystone-200 p-3 cursor-pointer hover:shadow-md hover:border-ocean-300 transition group",
        isDragging && "pointer-events-none"
      )}
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
            {effort && (
              <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs">
                {EFFORT_LABELS[effort]}
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
};

const BacklogMatrixCell = ({ priorityLabel, effortLabel, tasks, isDragging, onDragOver, onDrop, renderTask }) => (
  <div
    onDragOver={onDragOver}
    onDrop={onDrop}
    aria-label={`${priorityLabel}, ${effortLabel}`}
    className={clsx(
      "min-h-[8rem] rounded-xl border p-3 transition",
      isDragging ? "border-dashed border-ocean-400 bg-ocean-50" : "border-graystone-200 bg-graystone-50/60"
    )}
  >
    <div className="flex items-center justify-between mb-2">
      <h4 className="text-[11px] font-semibold text-graystone-500 uppercase tracking-wide">
        {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
      </h4>
    </div>
    <div className="space-y-2">
      {tasks.map(task => renderTask(task))}
      {tasks.length === 0 && isDragging && (
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
  const [newTaskEffort, setNewTaskEffort] = useState('');
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

  const completedTasks = (taskList || [])
    .filter(t => t.status === 'done')
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

  const getBacklogCellTasks = (priority, effort) => (
    backlogTasks
      .filter((task) => task.priority === priority && (getTaskEffort(task) || '') === effort)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  );

  const backlogGrid = EFFORT_ROWS.map((effortRow) => ({
    ...effortRow,
    totalTasks: PRIORITY_COLUMNS.reduce(
      (count, priorityColumn) => count + getBacklogCellTasks(priorityColumn.key, effortRow.key).length,
      0
    ),
    cells: PRIORITY_COLUMNS.map((priorityColumn) => ({
      ...priorityColumn,
      tasks: getBacklogCellTasks(priorityColumn.key, effortRow.key),
    })),
  }));

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim() || isSubmitting) return;
    setIsSubmitting(true);

    const task = {
      workstreamId: workstream.id,
      title: newTaskTitle.trim(),
      priority: showNewTaskForm === 'deadline' ? 'medium' : newTaskPriority,
      deadline: showNewTaskForm === 'deadline' ? newTaskDeadline : null,
      taskType: newTaskType,
      tags: setTaskEffort([], newTaskEffort),
      assignee: currentUser,
      assigneeEmail: userEmail,
      sortOrder: showNewTaskForm === 'backlog'
        ? getBacklogCellTasks(newTaskPriority, newTaskEffort).length
        : 0
    };

    const result = await onCreateTask(task);
    setIsSubmitting(false);
    if (result) {
      setNewTaskTitle('');
      setNewTaskDeadline('');
      setNewTaskPriority('medium');
      setNewTaskEffort('');
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

  const handleDragEnd = () => {
    setDraggedTask(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDropOnBacklogCell = async (targetPriority, targetEffort) => {
    if (!draggedTask) return;
    const taskToMove = draggedTask;
    setDraggedTask(null);
    const targetList = getBacklogCellTasks(targetPriority, targetEffort);

    const updates = {
      priority: targetPriority,
      sortOrder: targetList.length,
      tags: setTaskEffort(taskToMove.tags || [], targetEffort),
    };
    if (taskToMove.deadline) {
      updates.deadline = null;
    }
    await onUpdateTask(taskToMove.id, workstream.id, updates);
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
      onDragEnd={handleDragEnd}
      onClick={onOpenTask}
      onToggleStatus={handleToggleStatus}
      isDragging={!!draggedTask}
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
          className={clsx(
            "bg-white rounded-xl border p-4 transition",
            draggedTask ? "border-dashed border-ocean-300" : "border-graystone-200"
          )}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-ocean-900">
              Time-Sensitive ({timeSensitiveTasks.length})
            </h3>
            {draggedTask && (
              <span className="text-xs text-ocean-500 font-medium">Drop to set deadline</span>
            )}
          </div>

          <div className="space-y-2 mb-4">
            {timeSensitiveTasks.map(task => renderTask(task, true))}
            {timeSensitiveTasks.length === 0 && !showNewTaskForm && !pendingDeadlineTask && (
              <p className="text-sm text-graystone-400 text-center py-4">
                {draggedTask ? 'Drop here to assign a deadline' : 'No time-sensitive tasks'}
              </p>
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
              <EffortSelect value={newTaskEffort} onChange={setNewTaskEffort} ariaLabel="Time-sensitive task effort" />
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
                  onClick={() => {
                    setShowNewTaskForm(null);
                    setNewTaskTitle('');
                    setNewTaskDeadline('');
                    setNewTaskEffort('');
                    setNewTaskType('Issue');
                  }}
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
        <div
          onDragOver={handleDragOver}
          className="bg-white rounded-xl border border-graystone-200 p-4"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-ocean-900">Backlog</h3>
            {draggedTask && (
              <span className="text-xs text-ocean-500 font-medium">Drop into a priority and effort cell</span>
            )}
          </div>
          <p className="text-xs text-graystone-500 mb-4">
            Priority runs left to right. Effort runs top to bottom.
          </p>

          <div className="overflow-x-auto mb-4">
            <div className="min-w-[46rem] grid grid-cols-[8rem_repeat(3,minmax(0,1fr))] gap-3">
              <div className="rounded-xl border border-graystone-200 bg-graystone-50/80 p-3 flex items-end">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-graystone-500">Effort</p>
                  <p className="text-xs text-graystone-400">Priority</p>
                </div>
              </div>
              {PRIORITY_COLUMNS.map((priorityColumn) => (
                <div
                  key={priorityColumn.key}
                  className={clsx(
                    "rounded-xl border p-3",
                    priorityColumn.accent
                  )}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide">{priorityColumn.label}</p>
                </div>
              ))}

              {backlogGrid.map((effortRow) => (
                <div key={effortRow.key || 'none'} className="contents">
                  <div className="rounded-xl border border-graystone-200 bg-white p-3">
                    <p className="text-sm font-semibold text-ocean-900">{effortRow.label}</p>
                    <p className="text-xs text-graystone-500">{effortRow.hint}</p>
                    <p className="mt-2 text-xs text-graystone-400">
                      {effortRow.totalTasks} {effortRow.totalTasks === 1 ? 'task' : 'tasks'}
                    </p>
                  </div>
                  {effortRow.cells.map((cell) => (
                    <BacklogMatrixCell
                      key={`${effortRow.key || 'none'}-${cell.key}`}
                      priorityLabel={cell.label}
                      effortLabel={effortRow.label}
                      tasks={cell.tasks}
                      isDragging={!!draggedTask}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDropOnBacklogCell(cell.key, effortRow.key)}
                      renderTask={renderTask}
                    />
                  ))}
                </div>
              ))}
            </div>
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
              <EffortSelect value={newTaskEffort} onChange={setNewTaskEffort} ariaLabel="Backlog task effort" />
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
                  onClick={() => {
                    setShowNewTaskForm(null);
                    setNewTaskTitle('');
                    setNewTaskEffort('');
                    setNewTaskType('Issue');
                  }}
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
