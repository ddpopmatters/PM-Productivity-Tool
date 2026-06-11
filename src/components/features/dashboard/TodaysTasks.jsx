import { useState } from 'react';
import { Icon } from '../../ui';

export default function TodaysTasks({
  todaysTasks,
  newTaskText,
  setNewTaskText,
  onAddTask,
  onToggleTodo,
  onDeleteTodo,
  onUpdateTodo,
  onMarkJobComplete,
  onUpdateWorkstreamTask,
  onOpenEntry,
  onOpenWorkstreamTask,
}) {
  const [editingTodoId, setEditingTodoId] = useState(null);
  const [editingTodoDate, setEditingTodoDate] = useState('');

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
    if (onUpdateTodo) onUpdateTodo(todoId, { date: null });
    setEditingTodoId(null);
    setEditingTodoDate('');
  };

  const isTaskDone = (task) =>
    (task.taskType === 'todo' && task.completed) ||
    (task.taskType === 'job' && task.workflowStatus === 'done') ||
    (task.taskType === 'workstream' && task.status === 'done');

  return (
    <div className="bg-white rounded-xl border border-graystone-200 shadow-sm p-6">
      <h3 className="font-heading text-lg text-ocean-900 mb-4 flex items-center gap-2 tracking-wide">
        <Icon name="check-square" className="w-5 h-5" />
        Today's Tasks
      </h3>

      {/* Add Task Input */}
      <div className="flex gap-2 mb-4">
        <label htmlFor="new-task-input" className="sr-only">New task</label>
        <input
          id="new-task-input"
          name="new-task"
          type="text"
          value={newTaskText}
          onChange={(e) => setNewTaskText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onAddTask()}
          placeholder="Add a new task..."
          className="flex-1 px-3 py-2 text-sm border border-ocean-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
        />
        <button
          onClick={onAddTask}
          disabled={!newTaskText.trim()}
          aria-label="Add task"
          className="px-4 py-2 bg-ocean-500 hover:bg-ocean-600 disabled:bg-graystone-300 text-white rounded-lg transition text-sm font-medium"
        >
          <Icon name="plus" className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      <div className="space-y-2 max-h-[50vh] md:max-h-64 overflow-y-auto">
        {todaysTasks.length > 0 ? (
          todaysTasks.map((task, idx) => (
            <div
              key={`${task.taskType || 'task'}:${task.id || idx}`}
              className={`p-3 rounded-lg border flex items-start gap-3 ${
                task.taskType === 'job'
                  ? task.workflowStatus === 'done' ? 'bg-green-100 border-green-300' : 'bg-green-50 border-green-200'
                  : task.taskType === 'workstream'
                    ? task.status === 'done' ? 'bg-violet-100 border-violet-300' : 'bg-violet-50 border-violet-200'
                    : 'bg-graystone-50 border-graystone-200'
              }`}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (task.taskType === 'todo') onToggleTodo?.(task.id);
                  else if (task.taskType === 'job') onMarkJobComplete(task.id);
                  else if (task.taskType === 'workstream') {
                    onUpdateWorkstreamTask?.(task.id, { status: task.status === 'done' ? 'open' : 'done' });
                  }
                }}
                className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition ${
                  isTaskDone(task)
                    ? 'bg-green-500 border-green-500 text-white'
                    : task.taskType === 'job'
                      ? 'border-green-400 hover:border-green-600 hover:bg-green-100'
                      : task.taskType === 'workstream'
                        ? 'border-violet-400 hover:border-violet-600 hover:bg-violet-100'
                        : 'border-graystone-300 hover:border-ocean-500'
                }`}
                title={task.taskType === 'todo' ? 'Toggle complete' : 'Mark as done'}
              >
                {isTaskDone(task) && <Icon name="check" className="w-3 h-3" />}
              </button>

              <div
                className={`flex-1 min-w-0 ${task.taskType === 'job' || task.taskType === 'workstream' ? 'cursor-pointer' : ''}`}
                onClick={() => {
                  if (task.taskType === 'job') onOpenEntry?.(task.id);
                  else if (task.taskType === 'workstream') onOpenWorkstreamTask?.(task.workstream_id, task.id);
                }}
              >
                <div className={`text-sm ${isTaskDone(task) ? 'line-through text-graystone-400' : 'text-ocean-900'}`}>
                  {task.title || task.text}
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    task.taskType === 'job' ? 'bg-green-200 text-green-800'
                      : task.taskType === 'workstream' ? 'bg-violet-200 text-violet-800'
                        : 'bg-graystone-200 text-graystone-600'
                  }`}>
                    {task.taskType === 'job' ? 'Task' : task.taskType === 'workstream' ? 'Workstream' : 'Personal'}
                  </span>

                  {task.taskType === 'workstream' && task.workstreamTitle && (
                    <span className="text-xs text-violet-600">{task.workstreamTitle}</span>
                  )}

                  {task.taskType === 'todo' && (
                    editingTodoId === task.id ? (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="date"
                          value={editingTodoDate}
                          onChange={(e) => setEditingTodoDate(e.target.value)}
                          className="text-xs px-1.5 py-0.5 border border-ocean-300 rounded focus:outline-none focus:ring-1 focus:ring-ocean-500"
                        />
                        <button onClick={saveTodoDate} className="text-xs px-1.5 py-0.5 bg-ocean-500 text-white rounded hover:bg-ocean-600" title="Save date">
                          <Icon name="check" className="w-3 h-3" />
                        </button>
                        <button onClick={() => clearTodoDate(task.id)} className="text-xs px-1.5 py-0.5 bg-graystone-200 text-graystone-600 rounded hover:bg-graystone-300" title="Clear date">
                          <Icon name="x" className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); startEditingTodoDate(task); }}
                        className="text-xs px-1.5 py-0.5 rounded bg-ocean-100 text-ocean-700 hover:bg-ocean-200 flex items-center gap-1"
                        title="Edit date"
                      >
                        <Icon name="calendar" className="w-3 h-3" />
                        {task.date
                          ? new Date(task.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                          : 'No date'}
                      </button>
                    )
                  )}

                  {task.taskType === 'job' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onOpenEntry?.(task.id); }}
                      className="text-xs text-green-600 hover:text-green-800 flex items-center gap-1"
                    >
                      <Icon name="external-link" className="w-3 h-3" /> Open
                    </button>
                  )}

                  {task.taskType === 'workstream' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onOpenWorkstreamTask?.(task.workstream_id, task.id); }}
                      className="text-xs text-violet-600 hover:text-violet-800 flex items-center gap-1"
                    >
                      <Icon name="external-link" className="w-3 h-3" /> Open
                    </button>
                  )}

                  {task.taskType === 'todo' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteTodo?.(task.id); }}
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
        <div className="mt-4 pt-3 border-t border-graystone-200 text-sm text-graystone-500">
          {todaysTasks.length} task{todaysTasks.length !== 1 ? 's' : ''} &bull;{' '}
          {todaysTasks.filter((t) => t.completed || t.workflowStatus === 'done' || t.status === 'done').length} completed
        </div>
      )}
    </div>
  );
}
