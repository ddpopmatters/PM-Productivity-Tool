import React, { useState, useEffect, useRef } from 'react';
import Icon from '../../ui/Icon';

const AddJobModal = ({ show, onClose, onSave, userProfiles, teams, currentUser, userEmail }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [owner, setOwner] = useState(currentUser);
  const [ownerEmail, setOwnerEmail] = useState(userEmail);
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('medium');
  const [team, setTeam] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [saving, setSaving] = useState(false);

  const inputRef = useRef(null);

  useEffect(() => {
    if (show) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      // Reset form
      setTitle('');
      setDescription('');
      setOwner(currentUser);
      setOwnerEmail(userEmail);
      setDueDate('');
      setPriority('medium');
      setTeam('');
      setSelectedTags([]);
    }
  }, [show, currentUser, userEmail]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    const newJob = {
      title: title.trim(),
      caption: description.trim(),
      owner,
      ownerEmail,
      team,
      date: dueDate || null,
      timelineValue: dueDate || null,
      tags: priority ? [priority, ...selectedTags] : selectedTags,
      workflowStatus: 'todo',
      itemType: 'job',
      collaborators: [],
      subtasks: [],
      dependencies: [],
      documents: [],
      comments: [],
      attachments: [],
      archived: false
    };

    await onSave(newJob);
    setSaving(false);
    onClose();
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="px-6 py-4 border-b border-graystone-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-ocean-900">New Job</h2>
            <button type="button" onClick={onClose} className="p-2 hover:bg-graystone-100 rounded-full">
              <Icon name="x" className="w-5 h-5 text-graystone-500" />
            </button>
          </div>

          {/* Form Body */}
          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-graystone-700 mb-1">Title *</label>
              <input
                ref={inputRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to be done?"
                className="w-full px-4 py-2 border border-graystone-200 rounded-lg focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500 outline-none"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-graystone-700 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add more details (optional)"
                rows={3}
                className="w-full px-4 py-2 border border-graystone-200 rounded-lg focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500 outline-none resize-none"
              />
            </div>

            {/* Owner & Team Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-graystone-700 mb-1">Assignee</label>
                <select
                  value={owner}
                  onChange={(e) => {
                    const selected = userProfiles.find(p => p.name === e.target.value);
                    setOwner(e.target.value);
                    setOwnerEmail(selected?.email || userEmail);
                  }}
                  className="w-full px-4 py-2 border border-graystone-200 rounded-lg focus:ring-2 focus:ring-ocean-500 outline-none"
                >
                  <option value={currentUser}>{currentUser} (me)</option>
                  {userProfiles.filter(p => p.name !== currentUser).map(p => (
                    <option key={p.email} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-graystone-700 mb-1">Team</label>
                <select
                  value={team}
                  onChange={(e) => setTeam(e.target.value)}
                  className="w-full px-4 py-2 border border-graystone-200 rounded-lg focus:ring-2 focus:ring-ocean-500 outline-none"
                >
                  <option value="">No team</option>
                  {teams.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Due Date & Priority Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-graystone-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-4 py-2 border border-graystone-200 rounded-lg focus:ring-2 focus:ring-ocean-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-graystone-700 mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-4 py-2 border border-graystone-200 rounded-lg focus:ring-2 focus:ring-ocean-500 outline-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-graystone-50 border-t border-graystone-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-graystone-600 hover:bg-graystone-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || saving}
              className="px-6 py-2 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <Icon name="loader-2" className="w-4 h-4 animate-spin" />}
              Create Job
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddJobModal;
