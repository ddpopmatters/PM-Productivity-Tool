import React from 'react';
import { Icon } from '../../ui';

const cx = (...classes) => classes.filter(Boolean).join(' ');

/**
 * DependenciesModal - Modal for searching and selecting dependency items
 *
 * Props:
 * - entry: The current entry (used for id and existing dependencies)
 * - allEntries: Array of all entries to search through
 * - dependencySearch: Current search query
 * - onSetDependencySearch: Setter for search query
 * - onAddDependency: Handler to add a dependency (receives item id)
 * - onClose: Close the modal
 */
export default function DependenciesModal({
  entry,
  allEntries,
  dependencySearch,
  onSetDependencySearch,
  onAddDependency,
  onClose,
}) {
  const filteredEntries = allEntries.filter(
    (e) =>
      e.id !== entry.id &&
      !(entry.dependencies || []).includes(e.id) &&
      (dependencySearch === '' ||
        e.title.toLowerCase().includes(dependencySearch.toLowerCase()) ||
        e.owner?.some(o => o.toLowerCase().includes(dependencySearch.toLowerCase())))
  );

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dependencies-modal-title"
    >
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-4">
          <h3 id="dependencies-modal-title" className="text-lg font-bold text-ocean-900">
            Add Dependencies
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-ocean-500 hover:bg-ocean-600 transition-colors"
            aria-label="Close dependencies dialog"
          >
            <Icon name="x" className="w-5 h-5 text-white" />
          </button>
        </div>
        <p className="text-sm text-graystone-600 mb-4">
          Select items that must be completed before this item can progress.
        </p>

        {/* Search */}
        <div className="relative mb-4">
          <span className="absolute left-3 top-1/2 -translate-y-1/2">
            <Icon name="search" className="w-4 h-4 text-graystone-400" />
          </span>
          <input
            type="text"
            placeholder="Search items..."
            value={dependencySearch}
            onChange={(e) => onSetDependencySearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-graystone-200 rounded-lg text-sm focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-100"
          />
        </div>

        {/* Available Items */}
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {filteredEntries
            .slice(0, 20)
            .map((item) => (
              <button
                key={item.id}
                onClick={() => onAddDependency(item.id)}
                className="w-full text-left p-3 rounded-xl border border-graystone-200 hover:border-ocean-300 hover:bg-ocean-50 transition-all flex items-center justify-between group"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-graystone-900 truncate">
                    {item.title}
                  </div>
                  <div className="text-xs text-graystone-500 flex items-center gap-2 mt-0.5">
                    <span>{item.owner}</span>
                    <span>&bull;</span>
                    <span
                      className={cx(
                        'px-1.5 py-0.5 rounded text-[10px] font-medium',
                        item.workflowStatus === 'Done'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      )}
                    >
                      {item.workflowStatus}
                    </span>
                  </div>
                </div>
                <Icon
                  name="plus"
                  className="w-4 h-4 text-ocean-500 opacity-0 group-hover:opacity-100 transition-opacity"
                />
              </button>
            ))}
          {filteredEntries.length === 0 && (
            <div className="text-sm text-graystone-500 text-center py-6 bg-graystone-50 rounded-xl">
              No matching items found
            </div>
          )}
        </div>

        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-ocean-600 text-white text-sm font-medium rounded-lg hover:bg-ocean-700 transition-colors shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
