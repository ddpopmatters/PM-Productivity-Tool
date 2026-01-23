import React, { useState, useEffect, useRef } from 'react';

/**
 * QuickAddModal - Quick add modal for creating todos, jobs, or projects
 *
 * @param {boolean} show - Whether the modal is visible
 * @param {function} onClose - Called when the modal should close
 * @param {function} onAddTodo - Called with todo object when creating a todo
 * @param {function} onAddProject - Called with project object when creating a project
 * @param {function} onAddJob - Called with job object when creating a job
 * @param {string} currentUser - Current user name
 */
function QuickAddModal({ show, onClose, onAddTodo, onAddProject, onAddJob, currentUser }) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('todo');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('medium');
  const inputRef = useRef(null);

  useEffect(() => {
    if (show && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 50);
    }
    if (!show) {
      setTitle('');
      setType('todo');
      setDueDate('');
      setPriority('medium');
    }
  }, [show]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (type === 'todo') {
      onAddTodo({
        text: title.trim(),
        completed: false,
        priority,
        dueDate: dueDate || null,
        createdAt: new Date().toISOString()
      });
    } else if (type === 'job') {
      onAddJob({
        title: title.trim(),
        description: '',
        workflowStatus: 'todo',
        owner: currentUser,
        date: dueDate || null,
        priority
      });
    } else {
      onAddProject({
        title: title.trim(),
        description: '',
        workflowStatus: 'Idea',
        owner: currentUser,
        date: dueDate || null,
        priority
      });
    }
    onClose();
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 flex items-start justify-center pt-[15vh] bg-black/40 z-50">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-graystone-100 bg-graystone-50">
          <div className="flex items-center gap-1 px-2 py-1 bg-graystone-200 rounded text-xs text-graystone-600">
            <span className="font-mono">{navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}</span>
            <span>+</span>
            <span className="font-mono">K</span>
          </div>
          <span className="text-sm text-graystone-600">Quick Add</span>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Main Input */}
          <div className="p-4">
            <input
              ref={inputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="w-full text-lg px-0 py-2 border-0 outline-none placeholder:text-graystone-400"
              autoComplete="off"
            />
          </div>

          {/* Options Row */}
          <div className="px-4 pb-4 flex flex-wrap items-center gap-3">
            {/* Type Toggle */}
            <div className="flex bg-graystone-100 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setType('todo')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  type === 'todo' ? 'bg-white shadow text-ocean-600 font-medium' : 'text-graystone-600'
                }`}
              >
                To-Do
              </button>
              <button
                type="button"
                onClick={() => setType('job')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  type === 'job' ? 'bg-white shadow text-ocean-600 font-medium' : 'text-graystone-600'
                }`}
              >
                Task
              </button>
              <button
                type="button"
                onClick={() => setType('project')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  type === 'project' ? 'bg-white shadow text-ocean-600 font-medium' : 'text-graystone-600'
                }`}
              >
                Project
              </button>
            </div>

            {/* Priority */}
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="px-3 py-1.5 text-sm bg-graystone-100 rounded-lg border-0 outline-none cursor-pointer"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
            </select>

            {/* Due Date */}
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="px-3 py-1.5 text-sm bg-graystone-100 rounded-lg border-0 outline-none cursor-pointer"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-graystone-100 bg-graystone-50">
            <div className="text-xs text-graystone-500">
              Press <kbd className="px-1.5 py-0.5 bg-graystone-200 rounded text-graystone-600">Enter</kbd> to create, <kbd className="px-1.5 py-0.5 bg-graystone-200 rounded text-graystone-600">Esc</kbd> to cancel
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-graystone-600 hover:bg-graystone-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!title.trim()}
                className="px-4 py-2 text-sm bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 transition-colors disabled:opacity-50"
              >
                Create {type === 'todo' ? 'To-Do' : type === 'job' ? 'Task' : 'Project'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default QuickAddModal;
