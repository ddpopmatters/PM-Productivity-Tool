import React, { useState, useEffect } from 'react';
import Icon from '../../ui/Icon';
import WhiteboardThumbnail from '../whiteboards/WhiteboardThumbnail';

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

  const myWhiteboards = whiteboards.filter(wb => wb.owner_email === userEmail);
  const sharedWhiteboards = whiteboards.filter(wb => wb.owner_email !== userEmail);

  return (
    <div className="p-6 animate-in fade-in duration-500 space-y-6">
      {/* Header */}
      <div className="bg-ocean-800 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-1">Whiteboards</h1>
            <p className="text-ocean-100 text-sm">Create and collaborate on visual boards</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors border border-white/20"
          >
            <Icon name="plus" className="w-4 h-4" />
            New Whiteboard
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => setFilter('all')}
          className={`bg-white rounded-xl p-6 border shadow-sm cursor-pointer hover:shadow-md transition-all ${
            filter === 'all' ? 'border-ocean-500 ring-2 ring-ocean-200' : 'border-graystone-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-heading text-sm text-graystone-600 mb-1 tracking-wide">All</p>
              <p className="text-3xl font-bold text-ocean-900">{whiteboards.length}</p>
            </div>
            <div className="w-12 h-12 bg-ocean-500 rounded-xl flex items-center justify-center">
              <Icon name="layout" className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-xs text-graystone-500 mt-2">All whiteboards</p>
        </div>
        <div
          onClick={() => setFilter('mine')}
          className={`bg-white rounded-xl p-6 border shadow-sm cursor-pointer hover:shadow-md transition-all ${
            filter === 'mine' ? 'border-ocean-500 ring-2 ring-ocean-200' : 'border-graystone-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-heading text-sm text-graystone-600 mb-1 tracking-wide">My Whiteboards</p>
              <p className="text-3xl font-bold text-ocean-900">{myWhiteboards.length}</p>
            </div>
            <div className="w-12 h-12 bg-ocean-500 rounded-xl flex items-center justify-center">
              <Icon name="user" className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-xs text-graystone-500 mt-2">Created by you</p>
        </div>
        <div
          onClick={() => setFilter('shared')}
          className={`bg-white rounded-xl p-6 border shadow-sm cursor-pointer hover:shadow-md transition-all ${
            filter === 'shared' ? 'border-ocean-500 ring-2 ring-ocean-200' : 'border-graystone-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-heading text-sm text-graystone-600 mb-1 tracking-wide">Shared With Me</p>
              <p className="text-3xl font-bold text-ocean-900">{sharedWhiteboards.length}</p>
            </div>
            <div className="w-12 h-12 bg-ocean-500 rounded-xl flex items-center justify-center">
              <Icon name="users" className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-xs text-graystone-500 mt-2">Shared by others</p>
        </div>
      </div>

      {/* Whiteboard Grid */}
      {loading ? (
        <div className="bg-white rounded-xl border border-graystone-200 p-12 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ocean-600"></div>
        </div>
      ) : filteredWhiteboards.length === 0 ? (
        <div className="bg-white rounded-xl border border-graystone-200 p-12 text-center">
          <Icon name="layout" className="w-12 h-12 text-graystone-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-graystone-600 mb-2">No whiteboards yet</h3>
          <p className="text-graystone-400 mb-4">Create your first whiteboard to get started</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-ocean-500 text-white rounded-lg hover:bg-ocean-600 transition-colors"
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
              className="bg-white rounded-xl border border-graystone-200 p-4 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 hover:border-ocean-300 transition-all group"
            >
              {/* Preview Area */}
              <div className="mb-3">
                <WhiteboardThumbnail
                  whiteboardId={whiteboard.id}
                  WHITEBOARD_API={WHITEBOARD_API}
                />
              </div>

              {/* Info */}
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-ocean-900 truncate">{whiteboard.title}</h3>
                  <p className="text-sm text-graystone-500">
                    {whiteboard.owner_email === userEmail ? 'You' : whiteboard.owner_name || 'Unknown'}
                  </p>
                  <p className="text-xs text-graystone-400 mt-1">
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
                <div className="mt-2 flex items-center gap-1 text-xs text-ocean-600">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-graystone-200">
              <h3 className="text-xl font-bold text-ocean-900">Create New Whiteboard</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-graystone-100 rounded-lg transition"
              >
                <Icon name="x" className="w-5 h-5 text-graystone-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <label className="block text-sm font-medium text-graystone-700 mb-1">Name</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g., Project Brainstorm"
                className="w-full px-4 py-2 border border-graystone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-2 p-6 border-t border-graystone-200">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-graystone-600 hover:bg-graystone-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newTitle.trim()}
                className="px-4 py-2 bg-ocean-500 text-white rounded-lg hover:bg-ocean-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Whiteboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhiteboardsView;
