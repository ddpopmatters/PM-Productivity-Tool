import React, { useState, useEffect } from 'react';
import Icon from '../../ui/Icon';

// Local utility for conditional class names
const cx = (...args) => args.filter(Boolean).join(' ');

// Job status configuration
const JOB_STATUSES = [
  { id: 'todo', label: 'To Do', color: 'gray' },
  { id: 'in_progress', label: 'In Progress', color: 'blue' },
  { id: 'done', label: 'Done', color: 'green' }
];

const JobDetailModal = ({
  job,
  show,
  onClose,
  onUpdate,
  onDelete,
  onPromote,
  onConvert,
  userProfiles,
  teams,
  userEmail,
  currentUser,
  onNavigateToWhiteboard,
  WhiteboardPreviewCard,
  WHITEBOARD_API
}) => {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(job?.title || '');
  const [description, setDescription] = useState(job?.caption || '');
  const [status, setStatus] = useState(job?.workflowStatus || 'todo');
  const [owner, setOwner] = useState(job?.owner || '');
  const [dueDate, setDueDate] = useState(job?.date || job?.timelineValue || '');
  const [priority, setPriority] = useState(
    job?.tags?.find(t => ['high', 'medium', 'low'].includes(t?.toLowerCase?.()))?.toLowerCase() || 'medium'
  );
  const [saving, setSaving] = useState(false);

  // Reset form when job changes
  useEffect(() => {
    if (job) {
      setTitle(job.title || '');
      setDescription(job.caption || '');
      setStatus(job.workflowStatus || 'todo');
      setOwner(job.owner || '');
      setDueDate(job.date || job.timelineValue || '');
      setPriority(job.tags?.find(t => ['high', 'medium', 'low'].includes(t?.toLowerCase?.()))?.toLowerCase() || 'medium');
      setEditing(false);
    }
  }, [job]);

  const handleSave = async () => {
    setSaving(true);
    const otherTags = job.tags?.filter(t => !['high', 'medium', 'low'].includes(t?.toLowerCase?.())) || [];
    const updatedJob = {
      ...job,
      title,
      caption: description,
      workflowStatus: status,
      owner,
      ownerEmail: userProfiles.find(p => p.name === owner)?.email || job.ownerEmail,
      date: dueDate || null,
      timelineValue: dueDate || null,
      tags: [priority, ...otherTags]
    };
    await onUpdate(updatedJob);
    setSaving(false);
    setEditing(false);
  };

  const handleStatusChange = async (newStatus) => {
    setStatus(newStatus);
    const updatedJob = { ...job, workflowStatus: newStatus };
    await onUpdate(updatedJob);
  };

  if (!show || !job) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-graystone-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-ocean-50 rounded-lg">
              <Icon name="clipboard-list" className="w-5 h-5 text-ocean-600" />
            </div>
            <span className="text-sm font-medium text-graystone-500">Task</span>
          </div>
          <div className="flex items-center gap-2">
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="p-2 hover:bg-graystone-100 rounded-lg"
                title="Edit"
              >
                <Icon name="pencil" className="w-4 h-4 text-graystone-500" />
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-graystone-100 rounded-full">
              <Icon name="x" className="w-5 h-5 text-graystone-500" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {editing ? (
            <div className="space-y-4">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-xl font-bold text-ocean-900 border border-graystone-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-ocean-500 outline-none"
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Add a description..."
                className="w-full border border-graystone-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-ocean-500 outline-none resize-none"
              />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-graystone-700 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-graystone-200 rounded-lg outline-none"
                  >
                    {JOB_STATUSES.map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-graystone-700 mb-1">Assignee</label>
                  <select
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    className="w-full px-3 py-2 border border-graystone-200 rounded-lg outline-none"
                  >
                    {userProfiles.map(p => (
                      <option key={p.email} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-graystone-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-graystone-200 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-graystone-700 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 border border-graystone-200 rounded-lg outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-ocean-900 mb-2">{job.title}</h2>
              {job.caption && (
                <p className="text-graystone-600 mb-4 whitespace-pre-wrap">{job.caption}</p>
              )}

              {/* Status Pills */}
              <div className="flex items-center gap-2 mb-6">
                {JOB_STATUSES.map(s => (
                  <button
                    key={s.id}
                    onClick={() => handleStatusChange(s.id)}
                    className={cx(
                      "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                      status === s.id
                        ? s.color === 'green' ? "bg-green-500 text-white"
                        : s.color === 'blue' ? "bg-blue-500 text-white"
                        : "bg-graystone-500 text-white"
                        : "bg-graystone-100 text-graystone-600 hover:bg-graystone-200"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-3 bg-graystone-50 rounded-lg">
                  <div className="text-xs text-graystone-500 mb-1">Assignee</div>
                  <div className="font-medium text-graystone-800">{job.owner || 'Unassigned'}</div>
                </div>
                <div className="p-3 bg-graystone-50 rounded-lg">
                  <div className="text-xs text-graystone-500 mb-1">Due Date</div>
                  <div className="font-medium text-graystone-800">
                    {(job.date || job.timelineValue) ? new Date(job.date || job.timelineValue).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No due date'}
                  </div>
                </div>
                <div className="p-3 bg-graystone-50 rounded-lg">
                  <div className="text-xs text-graystone-500 mb-1">Priority</div>
                  <div className={cx(
                    "font-medium capitalize",
                    priority === 'high' ? "text-red-600" :
                    priority === 'medium' ? "text-amber-600" :
                    "text-green-600"
                  )}>
                    {priority}
                  </div>
                </div>
                {job.team && (
                  <div className="p-3 bg-graystone-50 rounded-lg">
                    <div className="text-xs text-graystone-500 mb-1">Team</div>
                    <div className="font-medium text-graystone-800">{job.team}</div>
                  </div>
                )}
              </div>

              {/* Created date */}
              <div className="text-xs text-graystone-400 mb-6">
                Created {job.createdAt ? new Date(job.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Unknown'}
              </div>

              {/* Whiteboard Section */}
              {WhiteboardPreviewCard && (
                <div className="border-t border-graystone-200 pt-4">
                  <h4 className="text-sm font-medium text-graystone-700 mb-3 flex items-center gap-2">
                    <Icon name="layout" className="w-4 h-4" />
                    Whiteboard
                  </h4>
                  <WhiteboardPreviewCard
                    workflowItemId={job.id}
                    itemTitle={job.title}
                    userEmail={userEmail}
                    currentUser={currentUser}
                    onNavigate={(whiteboardId) => {
                      onClose();
                      onNavigateToWhiteboard(whiteboardId);
                    }}
                    WHITEBOARD_API={WHITEBOARD_API}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-graystone-50 border-t border-graystone-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {onConvert && (
              <button
                onClick={() => {
                  onConvert(job, 'task');
                  onClose();
                }}
                className="px-3 py-1.5 text-sm text-ocean-600 hover:bg-ocean-50 rounded-lg transition-colors flex items-center gap-1"
              >
                <Icon name="refresh-cw" className="w-4 h-4" />
                Convert
              </button>
            )}
            <button
              onClick={() => {
                if (confirm('Delete this task? This cannot be undone.')) {
                  onDelete(job.id);
                  onClose();
                }
              }}
              className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1"
            >
              <Icon name="trash-2" className="w-4 h-4" />
              Delete
            </button>
          </div>
          {editing ? (
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(false)}
                className="px-4 py-2 text-graystone-600 hover:bg-graystone-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Icon name="loader-2" className="w-4 h-4 animate-spin" />}
                Save Changes
              </button>
            </div>
          ) : (
            <button onClick={onClose} className="px-4 py-2 bg-graystone-100 text-graystone-700 rounded-lg hover:bg-graystone-200 transition-colors">
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobDetailModal;
