import React from 'react';
import { Icon } from '../../ui';

const cx = (...classes) => classes.filter(Boolean).join(' ');

/**
 * DescriptionModal - Modal for editing item description with @mention autocomplete
 *
 * Props:
 * - descriptionDraft: Current draft text
 * - descMentionOptions: Array of mention suggestion names
 * - onDescriptionChange: Handler for textarea onChange
 * - onDescMentionPick: Handler when a mention suggestion is selected
 * - onSave: Save the description
 * - onClose: Close/cancel the modal (resets draft)
 */
export default function DescriptionModal({
  descriptionDraft,
  descMentionOptions,
  onDescriptionChange,
  onDescMentionPick,
  onSave,
  onClose,
}) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="description-modal-title"
    >
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-xl shadow-xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-3">
          <h3 id="description-modal-title" className="text-lg font-bold text-ocean-900">
            Edit description
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-ocean-500 hover:bg-ocean-600 transition-colors"
            aria-label="Close description editor"
          >
            <Icon name="x" className="w-5 h-5 text-white" />
          </button>
        </div>
        <p className="text-sm text-graystone-600 mb-3">
          Keep this concise—the first few lines appear in the task preview. Use @name to
          mention someone.
        </p>
        <div className="relative">
          <textarea
            value={descriptionDraft}
            onChange={onDescriptionChange}
            className="w-full rounded-xl border border-graystone-200 px-3 py-2 text-sm shadow-sm focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-aqua-200"
            rows="5"
            placeholder="Add a short description... Use @ to mention someone"
          />
          {descMentionOptions.length > 0 && (
            <div className="absolute left-0 right-0 mt-1 rounded-xl border border-ocean-200 bg-white shadow-xl z-10 overflow-hidden">
              <div className="px-3 py-2 bg-ocean-50 border-b border-ocean-100">
                <span className="text-xs font-medium text-ocean-700">Mention someone</span>
              </div>
              {descMentionOptions.map((name, idx) => (
                <button
                  type="button"
                  key={name}
                  onClick={() => onDescMentionPick(name)}
                  className={cx(
                    'w-full text-left px-3 py-2.5 text-sm text-graystone-800 hover:bg-ocean-50 flex items-center gap-3 transition-colors',
                    idx === 0 && 'bg-ocean-50/50'
                  )}
                >
                  <span className="w-8 h-8 rounded-full bg-ocean-100 text-ocean-700 flex items-center justify-center text-sm font-bold">
                    {name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .substring(0, 2)}
                  </span>
                  <span className="font-medium">{name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-graystone-600 hover:text-graystone-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="px-4 py-2 bg-ocean-600 text-white text-sm font-medium rounded-lg hover:bg-ocean-700 transition-colors shadow-sm"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
