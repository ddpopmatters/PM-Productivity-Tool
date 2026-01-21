import React, { useState, useEffect } from 'react';
import Icon from '../../ui/Icon';

const WhiteboardsView = ({
  whiteboards,
  setWhiteboards,
  onOpenWhiteboard,
  currentUser,
  userEmail,
  WHITEBOARD_API
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'mine', 'shared'

  // Load whiteboards on mount
  useEffect(() => {
    const loadWhiteboards = async () => {
      setLoading(true);
      const data = await WHITEBOARD_API.fetchWhiteboards(userEmail);
      setWhiteboards(data);
      setLoading(false);
    };
    loadWhiteboards();
  }, [userEmail]);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    const whiteboard = await WHITEBOARD_API.createWhiteboard({
      title: newTitle.trim(),
      owner_email: userEmail,
      owner_name: currentUser
    });
    if (whiteboard) {
      setWhiteboards(prev => [whiteboard, ...prev]);
      setShowCreateModal(false);
      setNewTitle('');
      onOpenWhiteboard(whiteboard.id);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this whiteboard?')) return;
    const success = await WHITEBOARD_API.deleteWhiteboard(id);
    if (success) {
      setWhiteboards(prev => prev.filter(wb => wb.id !== id));
    }
  };

  const filteredWhiteboards = whiteboards.filter(wb => {
    if (filter === 'mine') return wb.owner_email === userEmail;
    if (filter === 'shared') return wb.owner_email !== userEmail;
    return true;
  });

  return (
    <div className="flex flex-col animate-in fade-in duration-500 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-graystone-900 dark:text-white">Whiteboards</h1>
          <p className="text-graystone-600 dark:text-graystone-400">Create and collaborate on visual boards</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 transition-colors"
        >
          <Icon name="plus" className="w-4 h-4" />
          New Whiteboard
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-graystone-200 dark:border-graystone-700">
        {[
          { id: 'all', label: 'All' },
          { id: 'mine', label: 'My Whiteboards' },
          { id: 'shared', label: 'Shared With Me' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              filter === tab.id
                ? 'border-ocean-600 text-ocean-600 dark:text-ocean-400'
                : 'border-transparent text-graystone-600 hover:text-graystone-900 dark:text-graystone-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Whiteboard Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ocean-600"></div>
        </div>
      ) : filteredWhiteboards.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-graystone-100 dark:bg-graystone-800 mb-4">
            <Icon name="layout" className="w-8 h-8 text-graystone-400" />
          </div>
          <h3 className="text-lg font-medium text-graystone-900 dark:text-white mb-2">No whiteboards yet</h3>
          <p className="text-graystone-600 dark:text-graystone-400 mb-4">Create your first whiteboard to get started</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 transition-colors"
          >
            Create Whiteboard
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredWhiteboards.map(whiteboard => (
            <div
              key={whiteboard.id}
              onClick={() => onOpenWhiteboard(whiteboard.id)}
              className="bg-white dark:bg-graystone-800 rounded-xl border border-graystone-200 dark:border-graystone-700 p-4 cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all group"
            >
              {/* Preview Area */}
              <div className="aspect-video bg-graystone-50 dark:bg-graystone-900 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                <Icon name="layout" className="w-12 h-12 text-graystone-300 dark:text-graystone-600" />
              </div>

              {/* Info */}
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-graystone-900 dark:text-white truncate">{whiteboard.title}</h3>
                  <p className="text-sm text-graystone-500 dark:text-graystone-400">
                    {whiteboard.owner_email === userEmail ? 'You' : whiteboard.owner_name || 'Unknown'}
                  </p>
                  <p className="text-xs text-graystone-400 dark:text-graystone-500 mt-1">
                    Updated {new Date(whiteboard.updated_at).toLocaleDateString()}
                  </p>
                </div>

                {/* Actions */}
                {whiteboard.owner_email === userEmail && (
                  <button
                    onClick={(e) => handleDelete(whiteboard.id, e)}
                    className="p-1 text-graystone-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete"
                  >
                    <Icon name="trash-2" className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Shared Badge */}
              {whiteboard.is_shared && (
                <div className="mt-2 flex items-center gap-1 text-xs text-ocean-600 dark:text-ocean-400">
                  <Icon name="users" className="w-3 h-3" />
                  Shared
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white dark:bg-graystone-800 rounded-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-graystone-900 dark:text-white mb-4">Create New Whiteboard</h2>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Whiteboard name"
              className="w-full px-4 py-2 border border-graystone-300 dark:border-graystone-600 rounded-lg bg-white dark:bg-graystone-900 text-graystone-900 dark:text-white focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-graystone-600 dark:text-graystone-400 hover:bg-graystone-100 dark:hover:bg-graystone-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newTitle.trim()}
                className="px-4 py-2 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 transition-colors disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhiteboardsView;
