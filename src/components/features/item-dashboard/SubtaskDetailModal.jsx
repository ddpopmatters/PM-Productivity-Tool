import React from 'react';
import { Icon } from '../../ui';

const cx = (...classes) => classes.filter(Boolean).join(' ');

/**
 * SubtaskDetailModal - Modal overlay for viewing/editing a single subtask
 *
 * Props:
 * - activeSubtask: The subtask object being viewed
 * - editingSubtask: Boolean whether in edit mode
 * - editSubtaskTitle: Current edit title value
 * - editSubtaskDeadline: Current edit deadline value
 * - editSubtaskOwner: Current edit owner value
 * - editSubtaskContext: Current edit context value
 * - onSetEditSubtaskTitle: Setter for title
 * - onSetEditSubtaskDeadline: Setter for deadline
 * - onSetEditSubtaskOwner: Setter for owner
 * - onSetEditSubtaskContext: Setter for context
 * - onClose: Close the modal
 * - onStartEditing: Enter edit mode for the active subtask
 * - onCancelEditing: Cancel edit mode
 * - onSaveEdit: Save edits to the subtask
 * - onDelete: Delete the subtask
 * - canEdit: Whether the current user can edit
 * - USERS: Array of all user names
 */
export default function SubtaskDetailModal({
  activeSubtask,
  editingSubtask,
  editSubtaskTitle,
  editSubtaskDeadline,
  editSubtaskOwner,
  editSubtaskContext,
  onSetEditSubtaskTitle,
  onSetEditSubtaskDeadline,
  onSetEditSubtaskOwner,
  onSetEditSubtaskContext,
  onClose,
  onStartEditing,
  onCancelEditing,
  onSaveEdit,
  onDelete,
  canEdit,
  USERS,
}) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="subtask-detail-title"
    >
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-3">
          <h3 id="subtask-detail-title" className="text-lg font-bold text-ocean-900">
            {editingSubtask ? 'Edit Subtask' : 'Subtask Details'}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-ocean-500 hover:bg-ocean-600 transition-colors"
            aria-label="Close subtask details"
          >
            <Icon name="x" className="w-5 h-5 text-white" />
          </button>
        </div>

        {editingSubtask ? (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-graystone-500 uppercase tracking-wider mb-1 block">
                Title
              </label>
              <input
                type="text"
                value={editSubtaskTitle}
                onChange={(e) => onSetEditSubtaskTitle(e.target.value)}
                className="w-full px-3 py-2 border border-graystone-200 rounded-lg text-sm focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-100"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-graystone-500 uppercase tracking-wider mb-1 block">
                  Assignee
                </label>
                <select
                  value={editSubtaskOwner}
                  onChange={(e) => onSetEditSubtaskOwner(e.target.value)}
                  className="w-full px-3 py-2 border border-graystone-200 rounded-lg text-sm focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-100"
                >
                  <option value="">Unassigned</option>
                  {USERS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-graystone-500 uppercase tracking-wider mb-1 block">
                  Deadline
                </label>
                <input
                  type="date"
                  value={editSubtaskDeadline}
                  onChange={(e) => onSetEditSubtaskDeadline(e.target.value)}
                  className="w-full px-3 py-2 border border-graystone-200 rounded-lg text-sm focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-100"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-graystone-500 uppercase tracking-wider mb-1 block">
                Context / Notes
              </label>
              <textarea
                value={editSubtaskContext}
                onChange={(e) => onSetEditSubtaskContext(e.target.value)}
                className="w-full px-3 py-2 border border-graystone-200 rounded-lg text-sm focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-100 min-h-[80px]"
                placeholder="Add any extra details..."
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={onCancelEditing}
                className="px-4 py-2 text-sm font-medium text-graystone-600 hover:text-graystone-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onSaveEdit}
                disabled={!editSubtaskTitle.trim()}
                className="px-4 py-2 bg-ocean-600 text-white text-sm font-medium rounded-lg hover:bg-ocean-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                Save Changes
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <div className="text-xs font-semibold text-graystone-500 uppercase tracking-wider mb-1">
                Title
              </div>
              <div className="text-sm font-medium text-ocean-900">{activeSubtask.title}</div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs font-semibold text-graystone-500 uppercase tracking-wider mb-1">
                  Assignee
                </div>
                <div className="text-graystone-800">
                  {activeSubtask.assignedTo || 'Unassigned'}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-graystone-500 uppercase tracking-wider mb-1">
                  Deadline
                </div>
                <div className="text-graystone-800">{activeSubtask.deadline || 'None'}</div>
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-graystone-500 uppercase tracking-wider mb-1">
                Context
              </div>
              <div className="text-sm text-graystone-700 whitespace-pre-line bg-graystone-50 border border-graystone-200 rounded-xl px-3 py-2">
                {activeSubtask.context || 'No additional context provided.'}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!activeSubtask.completed}
                readOnly
                className="w-4 h-4 rounded border-graystone-300"
              />
              <span className="text-sm text-graystone-700">
                {activeSubtask.completed ? 'Completed' : 'Open'}
              </span>
            </div>

            {canEdit && (
              <div className="flex justify-between items-center pt-4 border-t border-graystone-200 mt-4">
                <button
                  onClick={onDelete}
                  className="px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Icon name="trash-2" className="w-4 h-4" />
                  Delete
                </button>
                <button
                  onClick={onStartEditing}
                  className="px-4 py-2 bg-ocean-600 text-white text-sm font-medium rounded-lg hover:bg-ocean-700 transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <Icon name="edit" className="w-4 h-4" />
                  Edit Subtask
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
