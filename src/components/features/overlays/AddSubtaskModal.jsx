import React from 'react';
import { Icon } from '../../ui';

const AddSubtaskModal = ({ entryId, entries, users, currentUser, onAdd, onClose }) => {
  const [title, setTitle] = React.useState('');
  const [assignedTo, setAssignedTo] = React.useState(currentUser || '');
  const [adding, setAdding] = React.useState(false);
  const entry = entries.find(e => e.id === entryId);

  const handleSubmit = async () => {
    if (!title.trim() || adding) return;
    setAdding(true);
    await onAdd(title, assignedTo);
    setAdding(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-graystone-200">
          <h3 className="text-lg font-bold text-ocean-900">Add Subtask</h3>
          <button onClick={onClose} className="p-1 hover:bg-graystone-100 rounded-lg transition">
            <Icon name="x" className="w-5 h-5 text-graystone-500" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          {entry && (
            <p className="text-xs text-graystone-500">Adding to: <span className="font-medium text-graystone-700">{entry.title}</span></p>
          )}
          <div>
            <label className="block text-sm font-medium text-graystone-700 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="Subtask title..."
              className="w-full px-3 py-2 text-sm border border-graystone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-graystone-700 mb-1">Assign to</label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-graystone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
            >
              {(users || []).map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-graystone-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-graystone-600 hover:bg-graystone-100 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || adding}
            className="px-4 py-2 text-sm bg-ocean-500 text-white rounded-lg hover:bg-ocean-600 transition disabled:opacity-50"
          >
            {adding ? 'Adding...' : 'Add Subtask'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddSubtaskModal;
