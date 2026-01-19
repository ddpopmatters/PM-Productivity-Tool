import React from 'react';
import clsx from 'clsx';

/**
 * ViewSwitcher - Toggle between different view modes
 *
 * Provides buttons to switch between kanban, table, list, and gantt views.
 *
 * @param {string} currentView - Currently active view ('kanban'|'table'|'list'|'gantt')
 * @param {function} onViewChange - Callback when view changes
 * @param {string} variant - Visual variant ('light'|'dark')
 */
function ViewSwitcher({ currentView, onViewChange, variant = 'light' }) {
  const containerClass = variant === 'dark'
    ? "flex bg-black/20 p-1 rounded-lg border border-white/10"
    : "flex bg-graystone-100 p-1 rounded-lg";

  const activeClass = variant === 'dark'
    ? "bg-white text-ocean-700 shadow-sm"
    : "bg-white text-ocean-700 shadow-sm";

  const inactiveClass = variant === 'dark'
    ? "text-white/80 hover:text-white hover:bg-white/10"
    : "text-graystone-600 hover:text-ocean-700";

  const views = [
    { id: 'kanban', icon: 'kanban', label: 'Board' },
    { id: 'table', icon: 'table', label: 'Table' },
    { id: 'list', icon: 'list', label: 'List' },
    { id: 'gantt', icon: 'bar-chart-2', label: 'Gantt' },
  ];

  return (
    <div className={containerClass}>
      {views.map(({ id, icon, label }) => (
        <button
          key={id}
          onClick={() => onViewChange(id)}
          className={clsx(
            "px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2",
            currentView === id ? activeClass : inactiveClass
          )}
        >
          <i data-lucide={icon} className="w-4 h-4"></i>
          {label}
        </button>
      ))}
    </div>
  );
}

export default ViewSwitcher;
