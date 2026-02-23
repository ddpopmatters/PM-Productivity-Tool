import React, { useState, useEffect, useRef } from 'react';
import clsx from 'clsx';

/**
 * GlobalSearchModal - Global search modal with keyboard navigation
 *
 * Searches across workflow items, whiteboards, workstream tasks, events, and todos.
 *
 * @param {boolean} show - Whether the modal is visible
 * @param {function} onClose - Called when the modal should close
 * @param {Array} entries - Array of workflow entries to search
 * @param {Array} whiteboards - Array of whiteboards to search
 * @param {Array} workstreamTasks - Array of workstream tasks to search
 * @param {Array} workstreams - Array of workstreams (for task context)
 * @param {Array} events - Array of events to search
 * @param {Array} todos - Array of personal todos to search
 * @param {function} onSelectItem - Called with item when a workflow item is selected
 * @param {function} onSelectWhiteboard - Called with whiteboard when a whiteboard is selected
 * @param {function} onSelectWorkstreamTask - Called with task when a workstream task is selected
 * @param {function} onSelectEvent - Called with event when an event is selected
 * @param {function} onSelectTodo - Called with todo when a todo is selected
 */
function GlobalSearchModal({
  show,
  onClose,
  entries = [],
  whiteboards = [],
  workstreamTasks = [],
  workstreams = [],
  events = [],
  todos = [],
  onSelectItem,
  onSelectWhiteboard,
  onSelectWorkstreamTask,
  onSelectEvent,
  onSelectTodo,
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ items: [], whiteboards: [], tasks: [], events: [], todos: [] });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (show && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 50);
    }
    if (!show) {
      setQuery('');
      setResults({ items: [], whiteboards: [], tasks: [], events: [], todos: [] });
      setSelectedIndex(0);
    }
  }, [show]);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ items: [], whiteboards: [], tasks: [], events: [], todos: [] });
      setSelectedIndex(0);
      return;
    }

    const searchTerm = query.toLowerCase().trim();

    const matchedItems = entries.filter(item => {
      const titleMatch = item.title?.toLowerCase().includes(searchTerm);
      const captionMatch = item.caption?.toLowerCase().includes(searchTerm);
      const ownerMatch = Array.isArray(item.owner) ? item.owner.some(o => o.toLowerCase().includes(searchTerm)) : item.owner?.toLowerCase().includes(searchTerm);
      const tagsMatch = item.tags?.some(tag => tag.toLowerCase().includes(searchTerm));
      const teamMatch = item.team?.toLowerCase().includes(searchTerm);
      return titleMatch || captionMatch || ownerMatch || tagsMatch || teamMatch;
    }).slice(0, 5);

    const matchedWhiteboards = (whiteboards || []).filter(wb => {
      const titleMatch = wb.title?.toLowerCase().includes(searchTerm);
      const descMatch = wb.description?.toLowerCase().includes(searchTerm);
      return titleMatch || descMatch;
    }).slice(0, 3);

    const matchedTasks = (workstreamTasks || []).filter(task => {
      const titleMatch = task.title?.toLowerCase().includes(searchTerm);
      const descMatch = task.description?.toLowerCase().includes(searchTerm);
      const assigneeMatch = task.assignee?.toLowerCase().includes(searchTerm);
      const tagsMatch = task.tags?.some(tag => tag.toLowerCase().includes(searchTerm));
      return titleMatch || descMatch || assigneeMatch || tagsMatch;
    }).slice(0, 4);

    const matchedEvents = (events || []).filter(evt => {
      const titleMatch = evt.title?.toLowerCase().includes(searchTerm);
      const descMatch = evt.description?.toLowerCase().includes(searchTerm);
      const locationMatch = evt.location?.toLowerCase().includes(searchTerm);
      return titleMatch || descMatch || locationMatch;
    }).slice(0, 3);

    const matchedTodos = (todos || []).filter(todo => {
      const titleMatch = todo.title?.toLowerCase().includes(searchTerm);
      const descMatch = todo.description?.toLowerCase().includes(searchTerm);
      return titleMatch || descMatch;
    }).slice(0, 3);

    setResults({
      items: matchedItems,
      whiteboards: matchedWhiteboards,
      tasks: matchedTasks,
      events: matchedEvents,
      todos: matchedTodos,
    });
    setSelectedIndex(0);
  }, [query, entries, whiteboards, workstreamTasks, events, todos]);

  const totalResults = results.items.length + results.whiteboards.length + results.tasks.length + results.events.length + results.todos.length;

  const getResultAtIndex = (index) => {
    let offset = 0;
    if (index < offset + results.items.length) return { type: 'item', data: results.items[index - offset] };
    offset += results.items.length;
    if (index < offset + results.tasks.length) return { type: 'task', data: results.tasks[index - offset] };
    offset += results.tasks.length;
    if (index < offset + results.whiteboards.length) return { type: 'whiteboard', data: results.whiteboards[index - offset] };
    offset += results.whiteboards.length;
    if (index < offset + results.events.length) return { type: 'event', data: results.events[index - offset] };
    offset += results.events.length;
    if (index < offset + results.todos.length) return { type: 'todo', data: results.todos[index - offset] };
    return null;
  };

  const handleSelect = (result) => {
    if (!result) return;
    switch (result.type) {
      case 'item': onSelectItem?.(result.data); break;
      case 'whiteboard': onSelectWhiteboard?.(result.data); break;
      case 'task': onSelectWorkstreamTask?.(result.data); break;
      case 'event': onSelectEvent?.(result.data); break;
      case 'todo': onSelectTodo?.(result.data); break;
    }
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, totalResults - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && totalResults > 0) {
      e.preventDefault();
      handleSelect(getResultAtIndex(selectedIndex));
    }
  };

  if (!show) return null;

  const getStatusColor = (status) => {
    const colors = {
      'Done': 'bg-green-100 text-green-700',
      'In Progress': 'bg-blue-100 text-blue-700',
      'Ready for Review': 'bg-purple-100 text-purple-700',
      'Draft': 'bg-yellow-100 text-yellow-700',
      'Idea': 'bg-graystone-100 text-graystone-600'
    };
    return colors[status] || 'bg-graystone-100 text-graystone-600';
  };

  const getWorkstreamName = (workstreamId) => {
    const ws = workstreams.find(w => w.id === workstreamId);
    return ws?.name || 'Workstream';
  };

  let runningIndex = 0;

  return (
    <div className="fixed inset-0 flex items-start justify-center pt-[10vh] bg-black/40 z-50">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative bg-white dark:bg-graystone-800 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-graystone-100 dark:border-graystone-700 bg-graystone-50 dark:bg-graystone-900">
          <i data-lucide="search" className="w-5 h-5 text-graystone-400"></i>
          <div className="flex items-center gap-1 px-2 py-1 bg-graystone-200 dark:bg-graystone-700 rounded text-xs text-graystone-600 dark:text-graystone-300">
            <span className="font-mono">{navigator.platform.includes('Mac') ? '\u2318' : 'Ctrl'}</span>
            <span>+</span>
            <span className="font-mono">\u21E7</span>
            <span>+</span>
            <span className="font-mono">F</span>
          </div>
          <span className="text-sm text-graystone-600 dark:text-graystone-300">Global Search</span>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-graystone-100 dark:border-graystone-700">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search projects, tasks, whiteboards, events, todos..."
            className="w-full text-lg px-0 py-2 border-0 outline-none placeholder:text-graystone-400 bg-transparent dark:text-white"
            autoComplete="off"
          />
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto">
          {query.trim() && totalResults === 0 && (
            <div className="p-8 text-center text-graystone-500">
              <i data-lucide="search-x" className="w-12 h-12 mx-auto mb-3 opacity-50"></i>
              <p>No results found for &ldquo;{query}&rdquo;</p>
            </div>
          )}

          {/* Workflow Items */}
          {results.items.length > 0 && (
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-medium text-graystone-500 uppercase">Projects & Jobs</div>
              {results.items.map((item) => {
                const index = runningIndex++;
                const isJob = item.itemType === 'job';
                return (
                  <button
                    key={`item-${item.id}`}
                    onClick={() => handleSelect({ type: 'item', data: item })}
                    className={clsx(
                      "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors",
                      selectedIndex === index ? "bg-ocean-50 dark:bg-ocean-900/30" : "hover:bg-graystone-50 dark:hover:bg-graystone-700"
                    )}
                  >
                    <div className={clsx("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", isJob ? "bg-amber-100 dark:bg-amber-900" : "bg-ocean-100 dark:bg-ocean-900")}>
                      <i data-lucide={isJob ? "clipboard-list" : "folder"} className={clsx("w-5 h-5", isJob ? "text-amber-600" : "text-ocean-600")}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-ocean-900 dark:text-white truncate">{item.title}</span>
                        <span className={clsx("text-xs px-1.5 py-0.5 rounded", isJob ? "bg-amber-100 text-amber-700" : "bg-ocean-100 text-ocean-700")}>
                          {isJob ? 'Task' : 'Project'}
                        </span>
                      </div>
                      <div className="text-sm text-graystone-500 truncate">
                        {item.owner} {item.team && `\u2022 ${item.team}`}
                      </div>
                    </div>
                    <span className={clsx("px-2 py-1 text-xs rounded-full flex-shrink-0", getStatusColor(item.workflowStatus))}>
                      {item.workflowStatus}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Workstream Tasks */}
          {results.tasks.length > 0 && (
            <div className="p-2 border-t border-graystone-100 dark:border-graystone-700">
              <div className="px-3 py-2 text-xs font-medium text-graystone-500 uppercase">Workstream Tasks</div>
              {results.tasks.map((task) => {
                const index = runningIndex++;
                return (
                  <button
                    key={`task-${task.id}`}
                    onClick={() => handleSelect({ type: 'task', data: task })}
                    className={clsx(
                      "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors",
                      selectedIndex === index ? "bg-ocean-50 dark:bg-ocean-900/30" : "hover:bg-graystone-50 dark:hover:bg-graystone-700"
                    )}
                  >
                    <div className="w-10 h-10 bg-teal-100 dark:bg-teal-900 rounded-lg flex items-center justify-center flex-shrink-0">
                      <i data-lucide="list-checks" className="w-5 h-5 text-teal-600"></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-ocean-900 dark:text-white truncate">{task.title}</div>
                      <div className="text-sm text-graystone-500 truncate">
                        {getWorkstreamName(task.workstream_id)} {task.assignee && `\u2022 ${task.assignee}`}
                      </div>
                    </div>
                    <span className={clsx("px-2 py-1 text-xs rounded-full flex-shrink-0", task.status === 'done' ? 'bg-green-100 text-green-700' : task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-graystone-100 text-graystone-600')}>
                      {task.status?.replace('_', ' ')}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Whiteboards */}
          {results.whiteboards.length > 0 && (
            <div className="p-2 border-t border-graystone-100 dark:border-graystone-700">
              <div className="px-3 py-2 text-xs font-medium text-graystone-500 uppercase">Whiteboards</div>
              {results.whiteboards.map((wb) => {
                const index = runningIndex++;
                return (
                  <button
                    key={`wb-${wb.id}`}
                    onClick={() => handleSelect({ type: 'whiteboard', data: wb })}
                    className={clsx(
                      "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors",
                      selectedIndex === index ? "bg-ocean-50 dark:bg-ocean-900/30" : "hover:bg-graystone-50 dark:hover:bg-graystone-700"
                    )}
                  >
                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center flex-shrink-0">
                      <i data-lucide="presentation" className="w-5 h-5 text-purple-600"></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-ocean-900 dark:text-white truncate">{wb.title}</div>
                      <div className="text-sm text-graystone-500 truncate">{wb.description || 'Whiteboard'}</div>
                    </div>
                    <i data-lucide="arrow-right" className="w-4 h-4 text-graystone-400 flex-shrink-0"></i>
                  </button>
                );
              })}
            </div>
          )}

          {/* Events */}
          {results.events.length > 0 && (
            <div className="p-2 border-t border-graystone-100 dark:border-graystone-700">
              <div className="px-3 py-2 text-xs font-medium text-graystone-500 uppercase">Events</div>
              {results.events.map((evt) => {
                const index = runningIndex++;
                return (
                  <button
                    key={`evt-${evt.id}`}
                    onClick={() => handleSelect({ type: 'event', data: evt })}
                    className={clsx(
                      "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors",
                      selectedIndex === index ? "bg-ocean-50 dark:bg-ocean-900/30" : "hover:bg-graystone-50 dark:hover:bg-graystone-700"
                    )}
                  >
                    <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900 rounded-lg flex items-center justify-center flex-shrink-0">
                      <i data-lucide="calendar-days" className="w-5 h-5 text-rose-600"></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-ocean-900 dark:text-white truncate">{evt.title}</div>
                      <div className="text-sm text-graystone-500 truncate">
                        {evt.start_date && new Date(evt.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {evt.location && ` \u2022 ${evt.location}`}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Todos */}
          {results.todos.length > 0 && (
            <div className="p-2 border-t border-graystone-100 dark:border-graystone-700">
              <div className="px-3 py-2 text-xs font-medium text-graystone-500 uppercase">Personal Todos</div>
              {results.todos.map((todo) => {
                const index = runningIndex++;
                return (
                  <button
                    key={`todo-${todo.id}`}
                    onClick={() => handleSelect({ type: 'todo', data: todo })}
                    className={clsx(
                      "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors",
                      selectedIndex === index ? "bg-ocean-50 dark:bg-ocean-900/30" : "hover:bg-graystone-50 dark:hover:bg-graystone-700"
                    )}
                  >
                    <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900 rounded-lg flex items-center justify-center flex-shrink-0">
                      <i data-lucide={todo.completed ? "check-circle-2" : "circle"} className={clsx("w-5 h-5", todo.completed ? "text-emerald-600" : "text-emerald-400")}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={clsx("font-medium truncate", todo.completed ? "text-graystone-400 line-through" : "text-ocean-900 dark:text-white")}>{todo.title}</div>
                      {todo.due_date && (
                        <div className="text-sm text-graystone-500 truncate">
                          Due: {new Date(todo.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {!query.trim() && (
            <div className="p-6">
              <div className="text-sm text-graystone-500 mb-4">Quick Tips</div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 text-graystone-600 dark:text-graystone-300">
                  <i data-lucide="folder" className="w-4 h-4 text-ocean-500"></i>
                  <span>Search by project name, description, or owner</span>
                </div>
                <div className="flex items-center gap-3 text-graystone-600 dark:text-graystone-300">
                  <i data-lucide="list-checks" className="w-4 h-4 text-teal-500"></i>
                  <span>Find workstream tasks by title or assignee</span>
                </div>
                <div className="flex items-center gap-3 text-graystone-600 dark:text-graystone-300">
                  <i data-lucide="presentation" className="w-4 h-4 text-purple-500"></i>
                  <span>Find whiteboards by title</span>
                </div>
                <div className="flex items-center gap-3 text-graystone-600 dark:text-graystone-300">
                  <i data-lucide="calendar-days" className="w-4 h-4 text-rose-500"></i>
                  <span>Search events by name or location</span>
                </div>
                <div className="flex items-center gap-3 text-graystone-600 dark:text-graystone-300">
                  <i data-lucide="tag" className="w-4 h-4 text-green-500"></i>
                  <span>Search by tags like &ldquo;Priority&rdquo; or &ldquo;Report&rdquo;</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-graystone-100 dark:border-graystone-700 bg-graystone-50 dark:bg-graystone-900 text-xs text-graystone-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-graystone-200 dark:bg-graystone-700 rounded">&uarr;&darr;</kbd> Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-graystone-200 dark:bg-graystone-700 rounded">Enter</kbd> Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-graystone-200 dark:bg-graystone-700 rounded">Esc</kbd> Close
            </span>
          </div>
          {totalResults > 0 && (
            <span>{totalResults} result{totalResults !== 1 ? 's' : ''}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default GlobalSearchModal;
