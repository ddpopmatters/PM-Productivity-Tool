import React, { useState } from 'react';
import Icon from '../../ui/Icon';

// Local utility for conditional class names
const cx = (...args) => args.filter(Boolean).join(' ');

const WorkstreamList = ({ workstreams, workstreamTasks = [], currentUser, userEmail, onOpenWorkstream, onCreateWorkstream }) => {
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newVisibility, setNewVisibility] = useState('personal');
  const [newColor, setNewColor] = useState('blue');
  const [filter, setFilter] = useState('all'); // all, personal, shared
  const [isCreating, setIsCreating] = useState(false);

  const colors = [
    { id: 'blue', bg: 'bg-blue-500', light: 'bg-blue-100' },
    { id: 'green', bg: 'bg-green-500', light: 'bg-green-100' },
    { id: 'purple', bg: 'bg-purple-500', light: 'bg-purple-100' },
    { id: 'orange', bg: 'bg-orange-500', light: 'bg-orange-100' },
    { id: 'pink', bg: 'bg-pink-500', light: 'bg-pink-100' },
    { id: 'teal', bg: 'bg-teal-500', light: 'bg-teal-100' }
  ];

  const getColorClasses = (colorId) => colors.find(c => c.id === colorId) || colors[0];

  const getTaskCounts = (workstreamId) => {
    const tasks = workstreamTasks.filter(t => t.workstream_id === workstreamId);
    const open = tasks.filter(t => t.status !== 'done');
    const timeSensitive = open.filter(t => t.deadline);
    const todayStr = new Date().toISOString().slice(0, 10);
    const overdue = timeSensitive.filter(t => t.deadline < todayStr);
    return { total: tasks.length, open: open.length, timeSensitive: timeSensitive.length, overdue: overdue.length };
  };

  const personalWorkstreams = workstreams.filter(w => w.visibility === 'personal');
  const sharedWorkstreams = workstreams.filter(w => w.visibility === 'shared');

  const filteredWorkstreams = workstreams.filter(w => {
    if (filter === 'personal') return w.visibility === 'personal';
    if (filter === 'shared') return w.visibility === 'shared';
    return true;
  });

  const handleCreate = async () => {
    const trimmedTitle = newTitle.trim();
    const trimmedDescription = newDescription.trim();

    // Validate inputs
    if (!trimmedTitle || isCreating) return;
    if (trimmedTitle.length > 200) return; // Max title length
    if (trimmedDescription.length > 2000) return; // Max description length

    setIsCreating(true);
    const result = await onCreateWorkstream({
      title: trimmedTitle,
      description: trimmedDescription,
      owner: currentUser,
      visibility: newVisibility,
      color: newColor
    });
    setIsCreating(false);
    if (result) {
      setNewTitle('');
      setNewDescription('');
      setNewVisibility('personal');
      setNewColor('blue');
      setShowNewForm(false);
    }
  };

  return (
    <div className="p-6 animate-in fade-in duration-500 space-y-6">
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

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => setFilter('all')}
          className={cx(
            "bg-white rounded-xl p-6 border shadow-sm cursor-pointer hover:shadow-md transition-all",
            filter === 'all' ? "border-ocean-500 ring-2 ring-ocean-200" : "border-ocean-100"
          )}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-heading text-sm text-graystone-600 mb-1 tracking-wide">All</p>
              <p className="text-3xl font-bold text-ocean-900">{workstreams.length}</p>
            </div>
            <div className="w-12 h-12 bg-ocean-500 rounded-xl flex items-center justify-center">
              <Icon name="layers" className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-xs text-graystone-500 mt-2">All workstreams</p>
        </div>
        <div
          onClick={() => setFilter('personal')}
          className={cx(
            "bg-white rounded-xl p-6 border shadow-sm cursor-pointer hover:shadow-md transition-all",
            filter === 'personal' ? "border-ocean-500 ring-2 ring-ocean-200" : "border-ocean-100"
          )}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-heading text-sm text-graystone-600 mb-1 tracking-wide">Personal</p>
              <p className="text-3xl font-bold text-ocean-900">{personalWorkstreams.length}</p>
            </div>
            <div className="w-12 h-12 bg-ocean-500 rounded-xl flex items-center justify-center">
              <Icon name="user" className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-xs text-graystone-500 mt-2">Private to you</p>
        </div>
        <div
          onClick={() => setFilter('shared')}
          className={cx(
            "bg-white rounded-xl p-6 border shadow-sm cursor-pointer hover:shadow-md transition-all",
            filter === 'shared' ? "border-ocean-500 ring-2 ring-ocean-200" : "border-ocean-100"
          )}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-heading text-sm text-graystone-600 mb-1 tracking-wide">Shared</p>
              <p className="text-3xl font-bold text-ocean-900">{sharedWorkstreams.length}</p>
            </div>
            <div className="w-12 h-12 bg-ocean-500 rounded-xl flex items-center justify-center">
              <Icon name="users" className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-xs text-graystone-500 mt-2">Visible to team</p>
        </div>
      </div>

      {/* New Workstream Modal */}
      {showNewForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-graystone-200">
              <h3 className="text-xl font-bold text-ocean-900">Create New Workstream</h3>
              <button
                onClick={() => setShowNewForm(false)}
                className="p-2 hover:bg-graystone-100 rounded-lg transition"
              >
                <Icon name="x" className="w-5 h-5 text-graystone-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-graystone-700 mb-1">Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Website Requests"
                  className="w-full px-4 py-2 border border-graystone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-graystone-700 mb-1">Description</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="What is this workstream for?"
                  rows={3}
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
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-2 p-6 border-t border-graystone-200">
              <button
                onClick={() => setShowNewForm(false)}
                className="px-4 py-2 text-graystone-600 hover:bg-graystone-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newTitle.trim() || isCreating}
                className="px-4 py-2 bg-ocean-500 text-white rounded-lg hover:bg-ocean-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? 'Creating...' : 'Create Workstream'}
              </button>
            </div>
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
            const counts = getTaskCounts(ws.id);
            return (
              <button
                key={ws.id}
                onClick={() => onOpenWorkstream && onOpenWorkstream(ws.id)}
                className="bg-white rounded-xl border border-graystone-200 p-5 text-left hover:shadow-md hover:-translate-y-0.5 transition group"
              >
                <div className="flex items-start gap-3">
                  <div className={cx("w-3 h-3 rounded-full mt-1.5", colorClasses.bg)} />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-ocean-900 truncate">{ws.title}</h3>
                    {ws.description && (
                      <p className="text-sm text-graystone-500 mt-1 line-clamp-2">{ws.description}</p>
                    )}
                    {/* Task counts */}
                    <div className="flex items-center gap-3 mt-2 text-xs">
                      <span className="text-graystone-500">
                        {counts.open} open
                      </span>
                      {counts.timeSensitive > 0 && (
                        <span className="flex items-center gap-1 text-ocean-600">
                          <Icon name="clock" className="w-3 h-3" />
                          {counts.timeSensitive} deadline
                        </span>
                      )}
                      {counts.overdue > 0 && (
                        <span className="flex items-center gap-1 text-red-500">
                          <Icon name="alert-circle" className="w-3 h-3" />
                          {counts.overdue} overdue
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-graystone-400">
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
