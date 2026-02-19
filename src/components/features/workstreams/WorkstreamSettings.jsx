import React, { useState } from 'react';
import Icon from '../../ui/Icon';

// Local utility for conditional class names
const cx = (...args) => args.filter(Boolean).join(' ');

const WorkstreamSettings = ({ workstream, onClose, onUpdate, onDelete }) => {
  const [title, setTitle] = useState(workstream.title);
  const [description, setDescription] = useState(workstream.description || '');
  const [visibility, setVisibility] = useState(workstream.visibility);
  const [color, setColor] = useState(workstream.color || 'blue');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const colors = [
    { id: 'blue', bg: 'bg-blue-500' },
    { id: 'green', bg: 'bg-green-500' },
    { id: 'purple', bg: 'bg-purple-500' },
    { id: 'orange', bg: 'bg-orange-500' },
    { id: 'pink', bg: 'bg-pink-500' },
    { id: 'teal', bg: 'bg-teal-500' }
  ];

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const result = await onUpdate(workstream.id, {
      title: title.trim(),
      description: description.trim(),
      visibility,
      color
    });
    setSaving(false);
    if (result) {
      onClose();
    } else {
      setError('Failed to save. Please try again.');
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    setError(null);
    const result = await onDelete(workstream.id);
    setSaving(false);
    if (result) {
      onClose();
    } else {
      setError('Failed to delete. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-ocean-900">Workstream Settings</h2>
          <button onClick={onClose} className="p-2 hover:bg-graystone-100 rounded-lg transition">
            <Icon name="x" className="w-5 h-5 text-graystone-500" />
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-graystone-700 mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2 border border-graystone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-graystone-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full px-4 py-2 border border-graystone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-graystone-700 mb-1">Color</label>
          <div className="flex gap-2">
            {colors.map(c => (
              <button
                key={c.id}
                onClick={() => setColor(c.id)}
                className={cx(
                  "w-8 h-8 rounded-full transition",
                  c.bg,
                  color === c.id ? "ring-2 ring-offset-2 ring-ocean-500" : ""
                )}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-graystone-700 mb-1">Visibility</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={visibility === 'personal'}
                onChange={() => setVisibility('personal')}
                className="text-ocean-500 focus:ring-ocean-500"
              />
              <span className="text-sm">Personal</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={visibility === 'shared'}
                onChange={() => setVisibility('shared')}
                className="text-ocean-500 focus:ring-ocean-500"
              />
              <span className="text-sm">Shared</span>
            </label>
          </div>
        </div>

        <div className="border-t border-graystone-200 pt-4">
          <div className="text-xs text-graystone-400 mb-2">
            Owner: {workstream.owner}<br />
            Created: {new Date(workstream.created_at).toLocaleDateString()}
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
        )}

        <div className="flex items-center justify-between pt-2">
          {showDeleteConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-red-600">Delete workstream?</span>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition disabled:opacity-50"
              >
                {saving ? 'Deleting...' : 'Yes, delete'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={saving}
                className="px-3 py-1.5 text-graystone-600 text-sm hover:bg-graystone-100 rounded-lg transition disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-sm text-red-500 hover:text-red-600 transition"
            >
              Delete Workstream
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={!title.trim() || saving}
            className="px-4 py-2 bg-ocean-500 text-white rounded-lg hover:bg-ocean-600 transition disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkstreamSettings;
