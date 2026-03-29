import { useState, useEffect } from 'react';
import { Icon } from '../../ui';

export default function TaskListModal({
  show,
  taskListType,
  taskListItems,
  onClose,
  onOpenEntry,
  onOpenWorkstreamTask,
  onUpdateEntry,
  onEditSubtask,
  Badge,
}) {
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingItemDate, setEditingItemDate] = useState('');
  const [editingItemType, setEditingItemType] = useState(null);

  useEffect(() => {
    const handleEscape = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!show) return null;

  const startEditingItemDate = (item, type) => {
    setEditingItemId(item.id);
    setEditingItemType(type);
    setEditingItemDate(type === 'subtask' ? (item.deadline || '') : (item.date || item.timelineValue || ''));
  };

  const saveItemDate = (item) => {
    if (editingItemType === 'subtask') {
      if (onEditSubtask && item.parentId) onEditSubtask(item.parentId, item.id, { deadline: editingItemDate || null });
    } else {
      if (onUpdateEntry) onUpdateEntry(item.id, { date: editingItemDate || null });
    }
    setEditingItemId(null);
    setEditingItemDate('');
    setEditingItemType(null);
  };

  const clearItemDate = (item) => {
    if (editingItemType === 'subtask') {
      if (onEditSubtask && item.parentId) onEditSubtask(item.parentId, item.id, { deadline: null });
    } else {
      if (onUpdateEntry) onUpdateEntry(item.id, { date: null });
    }
    setEditingItemId(null);
    setEditingItemDate('');
    setEditingItemType(null);
  };

  const titleMap = {
    projects: 'My Projects',
    subtasks: 'My Subtasks',
    jobs: 'My Jobs',
    workstream: 'My Workstream Tasks',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-list-modal-title"
    >
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-4">
          <h3 id="task-list-modal-title" className="font-heading text-2xl text-ocean-900 tracking-wide">
            {titleMap[taskListType] || 'Tasks'}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-ocean-500 hover:bg-ocean-600 transition-colors"
            aria-label="Close task list"
          >
            <Icon name="x" className="w-5 h-5 text-white" aria-hidden="true" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[60vh] space-y-2">
          {taskListItems.length > 0 ? (
            taskListItems.map((task, idx) => {
              const itemType = task.isWorkstreamTask ? 'workstream' : task.isSubtask ? 'subtask' : task.itemType === 'job' ? 'job' : 'project';
              const currentDate = task.isWorkstreamTask ? task.deadline : task.isSubtask ? task.deadline : task.date || task.timelineValue;
              const isEditing = editingItemId === task.id;

              const handleOpen = () => {
                onClose();
                if (task.isWorkstreamTask) onOpenWorkstreamTask?.(task.workstream_id, task.id);
                else if (task.isSubtask && task.parentId) onOpenEntry(task.parentId);
                else onOpenEntry(task.id);
              };

              return (
                <div key={task.id || idx} className="w-full p-4 rounded-xl border border-graystone-200 hover:border-ocean-300 transition-all group">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div
                        className="font-medium text-sm text-ocean-900 truncate mb-1 heading-font cursor-pointer hover:text-ocean-600"
                        onClick={handleOpen}
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
                          <span className={`px-1.5 py-0.5 rounded text-xs ${
                            task.priority === 'high' ? 'bg-red-100 text-red-700'
                              : task.priority === 'medium' ? 'bg-amber-100 text-amber-700'
                                : 'bg-gray-100 text-gray-700'
                          }`}>
                            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                          </span>
                        )}
                        {(task.owner || task.assignedTo || task.assignee) && (
                          <div className="flex items-center gap-1">
                            <Icon name="user" className="w-3 h-3" />
                            <span>{task.owner || task.assignedTo || task.assignee}</span>
                          </div>
                        )}

                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="date"
                              value={editingItemDate}
                              onChange={(e) => setEditingItemDate(e.target.value)}
                              className="text-xs px-1.5 py-0.5 border border-ocean-300 rounded focus:outline-none focus:ring-1 focus:ring-ocean-500"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <button onClick={(e) => { e.stopPropagation(); saveItemDate(task); }} className="text-xs px-1.5 py-0.5 bg-ocean-500 text-white rounded hover:bg-ocean-600" title="Save date">
                              <Icon name="check" className="w-3 h-3" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); clearItemDate(task); }} className="text-xs px-1.5 py-0.5 bg-graystone-200 text-graystone-600 rounded hover:bg-graystone-300" title="Clear date">
                              <Icon name="x" className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); startEditingItemDate(task, itemType); }}
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-ocean-100 text-ocean-700 hover:bg-ocean-200"
                            title="Edit date"
                          >
                            <Icon name="calendar" className="w-3 h-3" />
                            <span>
                              {currentDate
                                ? new Date(currentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                                : 'No date'}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {task.workflowStatus && Badge && (
                        <Badge variant={task.workflowStatus === 'Done' ? 'success' : 'default'} className="text-[10px]">
                          {task.workflowStatus}
                        </Badge>
                      )}
                      {task.isSubtask && (
                        <span className={`text-xs px-2 py-0.5 rounded ${task.completed ? 'bg-green-100 text-green-700' : 'bg-graystone-100 text-graystone-600'}`}>
                          {task.completed ? 'Done' : 'Pending'}
                        </span>
                      )}
                      <button onClick={handleOpen} className="p-1 rounded hover:bg-ocean-100 transition" title="Open details">
                        <Icon name="external-link" className="w-4 h-4 text-graystone-400 group-hover:text-ocean-500" />
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
  );
}
