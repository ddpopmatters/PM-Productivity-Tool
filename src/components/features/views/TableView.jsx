import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import { Badge } from '../../ui';

/**
 * TableView - Tabular view for entries with bulk actions
 *
 * Displays entries in a table format with selection, bulk status change,
 * and bulk delete capabilities.
 *
 * @param {Array} entries - Array of entry objects
 * @param {function} onOpen - Called with entry.id when a row is clicked
 * @param {function} onBulkStatusChange - Called with (selectedIds, newStatus) for bulk status updates
 * @param {function} onBulkDelete - Called with selectedIds for bulk deletion
 * @param {Array} statuses - Array of available status strings (defaults to standard statuses)
 */
function TableView({
  entries,
  onOpen,
  onBulkStatusChange,
  onBulkDelete,
  statuses = ['Idea', 'Discovery', 'Preparation', 'In Delivery', 'Delivered', 'Impact Assessment', 'Done']
}) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [showBulkStatusMenu, setShowBulkStatusMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Reset selection when entries change
  useEffect(() => {
    setSelectedIds([]);
  }, [entries.length]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(entries.map(e => e.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (e, id) => {
    e.stopPropagation();
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkStatusChange = (newStatus) => {
    if (onBulkStatusChange && selectedIds.length > 0) {
      onBulkStatusChange(selectedIds, newStatus);
      setSelectedIds([]);
    }
    setShowBulkStatusMenu(false);
  };

  const handleBulkDelete = () => {
    if (onBulkDelete && selectedIds.length > 0) {
      onBulkDelete(selectedIds);
      setSelectedIds([]);
    }
    setShowDeleteConfirm(false);
  };

  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-graystone-200 shadow-sm p-12 text-center">
        <i data-lucide="table" className="w-12 h-12 text-graystone-300 mx-auto mb-3" aria-hidden="true"></i>
        <div className="text-sm text-graystone-500 mb-3">No items to display</div>
        <p className="text-xs text-graystone-400">Try adjusting your filters or create a new item</p>
      </div>
    );
  }

  const isAllSelected = selectedIds.length === entries.length && entries.length > 0;
  const isSomeSelected = selectedIds.length > 0 && selectedIds.length < entries.length;

  return (
    <div className="bg-white rounded-xl border border-graystone-200 shadow-sm overflow-hidden max-w-full">
      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-ocean-50 border-b border-ocean-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-ocean-900">
              {selectedIds.length} item{selectedIds.length > 1 ? 's' : ''} selected
            </span>
            <button
              onClick={() => setSelectedIds([])}
              className="text-xs text-ocean-600 hover:text-ocean-800 underline"
            >
              Clear selection
            </button>
          </div>
          <div className="flex items-center gap-2">
            {/* Bulk Status Change */}
            <div className="relative">
              <button
                onClick={() => setShowBulkStatusMenu(!showBulkStatusMenu)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-ocean-300 rounded-lg text-sm font-medium text-ocean-700 hover:bg-ocean-100 transition"
              >
                <i data-lucide="refresh-cw" className="w-4 h-4"></i>
                Change Status
                <i data-lucide="chevron-down" className="w-3 h-3"></i>
              </button>
              {showBulkStatusMenu && (
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-graystone-200 py-1 z-10">
                  {statuses.map(status => (
                    <button
                      key={status}
                      onClick={() => handleBulkStatusChange(status)}
                      className="w-full px-4 py-2 text-left text-sm text-graystone-700 hover:bg-ocean-50 transition"
                    >
                      {status}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Bulk Delete */}
            {onBulkDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-300 rounded-lg text-sm font-medium text-red-700 hover:bg-red-100 transition"
              >
                <i data-lucide="trash-2" className="w-4 h-4"></i>
                Delete
              </button>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-confirm-title"
          aria-describedby="delete-confirm-desc"
        >
          <div className="fixed inset-0" onClick={() => setShowDeleteConfirm(false)} aria-hidden="true" />
          <div className="relative bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <i data-lucide="alert-triangle" className="w-5 h-5 text-red-600" aria-hidden="true"></i>
              </div>
              <div>
                <h3 id="delete-confirm-title" className="font-bold text-ocean-900">Delete {selectedIds.length} item{selectedIds.length > 1 ? 's' : ''}?</h3>
                <p id="delete-confirm-desc" className="text-sm text-graystone-600">This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-graystone-700 hover:bg-graystone-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead className="bg-graystone-50 border-b border-graystone-200">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={el => el && (el.indeterminate = isSomeSelected)}
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded border-graystone-300 text-ocean-600 focus:ring-ocean-500"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-ocean-900 uppercase tracking-wider">Title</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-ocean-900 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-ocean-900 uppercase tracking-wider">Owner</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-ocean-900 uppercase tracking-wider">Team</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-ocean-900 uppercase tracking-wider">Deadline</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-graystone-100">
            {entries.map(entry => {
              const isSelected = selectedIds.includes(entry.id);
              return (
                <tr
                  key={entry.id}
                  onClick={() => onOpen(entry.id)}
                  className={clsx(
                    "hover:bg-ocean-50 cursor-pointer transition-colors",
                    isSelected && "bg-ocean-50/50"
                  )}
                >
                  <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => handleSelectOne(e, entry.id)}
                      className="w-4 h-4 rounded border-graystone-300 text-ocean-600 focus:ring-ocean-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-start gap-2">
                      <div className="font-medium text-ocean-900 heading-font">{entry.title}</div>
                      <i data-lucide="external-link" className="w-4 h-4 text-graystone-300"></i>
                    </div>
                    <div className="text-xs text-graystone-500 truncate max-w-[200px]">{entry.caption}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={entry.workflowStatus === 'Done' ? 'success' : 'default'}>{entry.workflowStatus}</Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-graystone-700">{entry.owner}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {entry.team && <span className="bg-graystone-100 px-2 py-1 rounded text-xs font-medium text-graystone-700">{entry.team}</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-graystone-700">
                    {entry.timelineValue}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TableView;
