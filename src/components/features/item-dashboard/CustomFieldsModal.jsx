import React from 'react';
import { Icon } from '../../ui';

/**
 * CustomFieldsModal - Modal for adding custom fields with name/type/value
 *
 * Props:
 * - newFieldName: Current field name value
 * - newFieldValue: Current field value
 * - newFieldType: Current field type ('text' | 'number' | 'date' | 'url')
 * - onSetNewFieldName: Setter for field name
 * - onSetNewFieldValue: Setter for field value
 * - onSetNewFieldType: Setter for field type
 * - onAdd: Handler to add the field
 * - onClose: Close/cancel the modal
 */
export default function CustomFieldsModal({
  newFieldName,
  newFieldValue,
  newFieldType,
  onSetNewFieldName,
  onSetNewFieldValue,
  onSetNewFieldType,
  onAdd,
  onClose,
}) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="custom-fields-modal-title"
    >
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-4">
          <h3 id="custom-fields-modal-title" className="text-lg font-bold text-ocean-900">
            Add Custom Field
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-ocean-500 hover:bg-ocean-600 transition-colors"
            aria-label="Close custom fields dialog"
          >
            <Icon name="x" className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-graystone-500 uppercase tracking-wider mb-1 block">
              Field Name
            </label>
            <input
              type="text"
              placeholder="e.g., Budget, Priority, External Link"
              value={newFieldName}
              onChange={(e) => onSetNewFieldName(e.target.value)}
              className="w-full px-3 py-2 border border-graystone-200 rounded-lg text-sm focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-100"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-graystone-500 uppercase tracking-wider mb-1 block">
              Field Type
            </label>
            <select
              value={newFieldType}
              onChange={(e) => onSetNewFieldType(e.target.value)}
              className="w-full px-3 py-2 border border-graystone-200 rounded-lg text-sm focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-100"
            >
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="date">Date</option>
              <option value="url">URL</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-graystone-500 uppercase tracking-wider mb-1 block">
              Value
            </label>
            {newFieldType === 'date' ? (
              <input
                type="date"
                value={newFieldValue}
                onChange={(e) => onSetNewFieldValue(e.target.value)}
                className="w-full px-3 py-2 border border-graystone-200 rounded-lg text-sm focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-100"
              />
            ) : newFieldType === 'number' ? (
              <input
                type="number"
                placeholder="Enter a number"
                value={newFieldValue}
                onChange={(e) => onSetNewFieldValue(e.target.value)}
                className="w-full px-3 py-2 border border-graystone-200 rounded-lg text-sm focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-100"
              />
            ) : newFieldType === 'url' ? (
              <input
                type="url"
                placeholder="https://..."
                value={newFieldValue}
                onChange={(e) => onSetNewFieldValue(e.target.value)}
                className="w-full px-3 py-2 border border-graystone-200 rounded-lg text-sm focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-100"
              />
            ) : (
              <input
                type="text"
                placeholder="Enter value"
                value={newFieldValue}
                onChange={(e) => onSetNewFieldValue(e.target.value)}
                className="w-full px-3 py-2 border border-graystone-200 rounded-lg text-sm focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-100"
              />
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-graystone-600 hover:text-graystone-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onAdd}
            disabled={!newFieldName.trim() || !newFieldValue.trim()}
            className="px-4 py-2 bg-ocean-600 text-white text-sm font-medium rounded-lg hover:bg-ocean-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Field
          </button>
        </div>
      </div>
    </div>
  );
}
