import React, { useState } from 'react';
import Icon from '../../ui/Icon';

// Local utility for conditional class names
const cx = (...args) => args.filter(Boolean).join(' ');

const WorkstreamList = ({ workstreams, currentUser, userEmail, onOpenWorkstream, onCreateWorkstream }) => {
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newVisibility, setNewVisibility] = useState('personal');
  const [newColor, setNewColor] = useState('blue');
  const [filter, setFilter] = useState('all'); // all, personal, shared

  const colors = [
    { id: 'blue', bg: 'bg-blue-500', light: 'bg-blue-100' },
    { id: 'green', bg: 'bg-green-500', light: 'bg-green-100' },
    { id: 'purple', bg: 'bg-purple-500', light: 'bg-purple-100' },
    { id: 'orange', bg: 'bg-orange-500', light: 'bg-orange-100' },
    { id: 'pink', bg: 'bg-pink-500', light: 'bg-pink-100' },
    { id: 'teal', bg: 'bg-teal-500', light: 'bg-teal-100' }
  ];

  const getColorClasses = (colorId) => colors.find(c => c.id === colorId) || colors[0];

  const filteredWorkstreams = workstreams.filter(w => {
    if (filter === 'personal') return w.visibility === 'personal';
    if (filter === 'shared') return w.visibility === 'shared';
    return true;
  });

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    const result = await onCreateWorkstream({
      title: newTitle.trim(),
      description: newDescription.trim(),
      owner: currentUser,
      visibility: newVisibility,
      color: newColor
    });
    if (result) {
      setNewTitle('');
      setNewDescription('');
      setNewVisibility('personal');
      setNewColor('blue');
      setShowNewForm(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-ocean-500 to-ocean-600 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Workstreams</h2>
            <p className="text-ocean-100 text-sm mt-1">Manage ongoing work and backlogs</p>
          </div>
          <button
            onClick={() => setShowNewForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition"
          >
            <Icon name="plus" className="w-5 h-5" />
            <span>New Workstream</span>
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[
          { id: 'all', label: 'All' },
          { id: 'personal', label: 'Personal' },
          { id: 'shared', label: 'Shared' }
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cx(
              "px-4 py-2 rounded-lg text-sm font-medium transition",
              filter === f.id
                ? "bg-ocean-500 text-white"
                : "bg-white text-graystone-600 hover:bg-ocean-50 border border-graystone-200"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* New workstream form */}
      {showNewForm && (
        <div className="bg-white rounded-xl border border-ocean-200 p-6 shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-ocean-900">Create New Workstream</h3>

          <div>
            <label className="block text-sm font-medium text-graystone-700 mb-1">Title</label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g., Website Requests"
              className="w-full px-4 py-2 border border-graystone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-graystone-700 mb-1">Description</label>
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="What is this workstream for?"
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
                  onClick={() => setNewColor(c.id)}
                  className={cx(
                    "w-8 h-8 rounded-full transition",
                    c.bg,
                    newColor === c.id ? "ring-2 ring-offset-2 ring-ocean-500" : ""
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
                  name="visibility"
                  checked={newVisibility === 'personal'}
                  onChange={() => setNewVisibility('personal')}
                  className="text-ocean-500 focus:ring-ocean-500"
                />
                <span className="text-sm">Personal</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="visibility"
                  checked={newVisibility === 'shared'}
                  onChange={() => setNewVisibility('shared')}
                  className="text-ocean-500 focus:ring-ocean-500"
                />
                <span className="text-sm">Shared with team</span>
              </label>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleCreate}
              disabled={!newTitle.trim()}
              className="px-4 py-2 bg-ocean-500 text-white rounded-lg hover:bg-ocean-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Workstream
            </button>
            <button
              onClick={() => setShowNewForm(false)}
              className="px-4 py-2 text-graystone-600 hover:bg-graystone-100 rounded-lg transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Workstream cards */}
      {filteredWorkstreams.length === 0 ? (
        <div className="bg-white rounded-xl border border-graystone-200 p-12 text-center">
          <Icon name="layers" className="w-12 h-12 text-graystone-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-graystone-600 mb-2">No workstreams yet</h3>
          <p className="text-graystone-400 mb-4">Create your first workstream to start tracking ongoing work</p>
          <button
            onClick={() => setShowNewForm(true)}
            className="px-4 py-2 bg-ocean-500 text-white rounded-lg hover:bg-ocean-600 transition"
          >
            Create Workstream
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWorkstreams.map(ws => {
            const colorClasses = getColorClasses(ws.color);
            return (
              <button
                key={ws.id}
                onClick={() => onOpenWorkstream(ws.id)}
                className="bg-white rounded-xl border border-graystone-200 p-5 text-left hover:shadow-md hover:-translate-y-0.5 transition group"
              >
                <div className="flex items-start gap-3">
                  <div className={cx("w-3 h-3 rounded-full mt-1.5", colorClasses.bg)} />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-ocean-900 truncate">{ws.title}</h3>
                    {ws.description && (
                      <p className="text-sm text-graystone-500 mt-1 line-clamp-2">{ws.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-3 text-xs text-graystone-400">
                      <span className={cx(
                        "px-2 py-0.5 rounded-full",
                        ws.visibility === 'shared' ? "bg-ocean-100 text-ocean-700" : "bg-graystone-100 text-graystone-600"
                      )}>
                        {ws.visibility === 'shared' ? 'Shared' : 'Personal'}
                      </span>
                      <span>Owner: {ws.owner}</span>
                    </div>
                  </div>
                  <Icon name="chevron-right" className="w-5 h-5 text-graystone-300 group-hover:text-ocean-500 transition" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WorkstreamList;
