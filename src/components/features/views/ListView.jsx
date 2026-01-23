import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import { Badge, Icon } from '../../ui';

/**
 * ListView - List view for entries with bulk actions
 *
 * Displays entries in a list format with selection, bulk status change,
 * and bulk delete capabilities.
 *
 * @param {Array} entries - Array of entry objects to display
 * @param {function} onOpen - Called with entry.id when an entry is clicked
 * @param {function} onBulkStatusChange - Called with (selectedIds, newStatus) for bulk status updates
 * @param {function} onBulkDelete - Called with selectedIds for bulk deletion
 * @param {Array} statuses - Array of available status strings
 */
function ListView({
  entries,
  onOpen,
  onBulkStatusChange,
  onBulkDelete,
  statuses = ['Idea', 'Discovery', 'Preparation', 'In Delivery', 'Delivered', 'Impact Assessment', 'Done']
}) {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showBulkStatusMenu, setShowBulkStatusMenu] = useState(false);

  // Reset selection when entries change (filter out any selected IDs no longer in entries)
  useEffect(() => {
    const currentIds = new Set(entries.map(e => e.id));
    setSelectedIds(prev => {
      const filtered = new Set([...prev].filter(id => currentIds.has(id)));
      return filtered.size !== prev.size ? filtered : prev;
    });
  }, [entries]);

  const toggleSelection = (e, id) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === entries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(entries.map(e => e.id)));
    }
  };

  const handleBulkStatusChange = (newStatus) => {
    if (onBulkStatusChange && selectedIds.size > 0) {
      onBulkStatusChange(Array.from(selectedIds), newStatus);
      setSelectedIds(new Set());
    }
    setShowBulkStatusMenu(false);
  };

  const handleBulkDelete = () => {
    if (onBulkDelete && selectedIds.size > 0) {
      if (window.confirm(`Are you sure you want to archive ${selectedIds.size} item(s)?`)) {
        onBulkDelete(Array.from(selectedIds));
        setSelectedIds(new Set());
      }
    }
  };

  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-graystone-200 shadow-sm p-12 text-center">
        <Icon name="list" className="w-12 h-12 text-graystone-300 mx-auto mb-3" />
        <div className="text-sm text-graystone-500 mb-3">No items to display</div>
        <p className="text-xs text-graystone-400">Try adjusting your filters or create a new item</p>
      </div>
    );
  }

  const isAllSelected = selectedIds.size === entries.length && entries.length > 0;

  return (
    <div className="space-y-2">
      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="sticky top-0 z-10 bg-ocean-500 text-white p-3 rounded-lg flex items-center justify-between shadow-lg animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-4">
            <span className="font-medium">{selectedIds.size} selected</span>
            <div className="relative">
              <button
                onClick={() => setShowBulkStatusMenu(!showBulkStatusMenu)}
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition flex items-center gap-2"
              >
                <Icon name="edit-3" className="w-4 h-4" />
                Change Status
              </button>
              {showBulkStatusMenu && (
                <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-ocean-100 py-1 min-w-[160px] z-20">
                  {statuses.map(status => (
                    <button
                      key={status}
                      onClick={() => handleBulkStatusChange(status)}
                      className="w-full px-3 py-2 text-left text-sm text-ocean-900 hover:bg-ocean-50 transition"
                    >
                      {status}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={handleBulkDelete}
              className="px-3 py-1.5 bg-red-500/80 hover:bg-red-500 rounded-lg text-sm font-medium transition flex items-center gap-2"
            >
              <Icon name="archive" className="w-4 h-4" />
              Archive
            </button>
          </div>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition"
          >
            Clear Selection
          </button>
        </div>
      )}

      {/* Select All Header */}
      <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-lg border border-graystone-200">
        <input
          type="checkbox"
          checked={isAllSelected}
          onChange={selectAll}
          className="w-4 h-4 rounded border-graystone-300 text-ocean-600 focus:ring-ocean-500 cursor-pointer"
          aria-label="Select all items"
        />
        <span className="text-sm text-graystone-600">
          {isAllSelected ? 'Deselect all' : 'Select all'} ({entries.length} items)
        </span>
      </div>

      {/* Entry List */}
      {entries.map(entry => (
        <div
          key={entry.id}
          onClick={() => onOpen(entry.id)}
          className={clsx(
            "bg-white p-4 rounded-xl border shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-between group",
            selectedIds.has(entry.id)
              ? "border-ocean-400 bg-ocean-50/50"
              : "border-graystone-200"
          )}
        >
          <div className="flex items-center gap-4">
            <input
              type="checkbox"
              checked={selectedIds.has(entry.id)}
              onChange={(e) => toggleSelection(e, entry.id)}
              onClick={(e) => e.stopPropagation()}
              className="w-4 h-4 rounded border-graystone-300 text-ocean-600 focus:ring-ocean-500 cursor-pointer"
              aria-label={`Select ${entry.title}`}
            />
            <div className={clsx(
              "w-2 h-12 rounded-full",
              entry.workflowStatus === 'Done' ? "bg-green-500" : "bg-ocean-500"
            )}></div>
            <div>
              <h4 className="font-bold text-ocean-900 group-hover:text-ocean-700 heading-font">{entry.title}</h4>
              <div className="flex items-center gap-2 text-xs text-graystone-500 mt-1">
                <span>{entry.owner}</span>
                <span>-</span>
                <span>{entry.team}</span>
                <span>-</span>
                <span>{entry.timelineValue}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
              {entry.collaborators && entry.collaborators.slice(0, 3).map((collab, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full bg-ocean-100 border-2 border-white flex items-center justify-center text-xs font-bold text-ocean-700"
                  title={collab}
                >
                  {collab.charAt(0)}
                </div>
              ))}
              {entry.collaborators && entry.collaborators.length > 3 && (
                <div className="w-8 h-8 rounded-full bg-graystone-100 border-2 border-white flex items-center justify-center text-xs font-bold text-graystone-600">
                  +{entry.collaborators.length - 3}
                </div>
              )}
            </div>
            <Badge variant="neutral">{entry.workflowStatus}</Badge>
            <Icon name="external-link" className="w-5 h-5 text-graystone-300 group-hover:text-ocean-500" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default ListView;
