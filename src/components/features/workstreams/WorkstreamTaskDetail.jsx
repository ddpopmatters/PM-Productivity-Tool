import React, { useState } from 'react';
import Icon from '../../ui/Icon';

// Local utility for conditional class names
const cx = (...args) => args.filter(Boolean).join(' ');

const WorkstreamTaskDetail = ({
  task,
  workstream,
  currentUser,
  userEmail,
  entries,
  onBack,
  onUpdate,
  onDelete,
  USERS,
  USERS_WITH_EMAILS
}) => {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [priority, setPriority] = useState(task.priority);
  const [status, setStatus] = useState(task.status);
  const [deadline, setDeadline] = useState(task.deadline || '');
  const [assignee, setAssignee] = useState(task.assignee || '');
  const [requester, setRequester] = useState(task.requester || '');
  const [tags, setTags] = useState(task.tags || []);
  const [newTag, setNewTag] = useState('');
  const [comments, setComments] = useState(task.comments || []);
  const [newComment, setNewComment] = useState('');
  const [editingDescription, setEditingDescription] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = (updates) => {
    onUpdate(task.id, workstream.id, updates);
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      const newTags = [...tags, newTag.trim()];
      setTags(newTags);
      handleSave({ tags: newTags });
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag) => {
    const newTags = tags.filter(t => t !== tag);
    setTags(newTags);
    handleSave({ tags: newTags });
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    const comment = {
      id: crypto.randomUUID(),
      author: currentUser,
      text: newComment.trim(),
      timestamp: new Date().toISOString()
    };
    const newComments = [...comments, comment];
    setComments(newComments);
    handleSave({ comments: newComments });
    setNewComment('');
  };

  const handleDelete = async () => {
    const deleted = await onDelete(task.id, workstream.id);
    if (deleted) {
      onBack();
    }
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-ocean-500 to-ocean-600 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/20 rounded-lg transition"
          >
            <Icon name="arrow-left" className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <p className="text-ocean-100 text-sm">{workstream.title}</p>
            <h2 className="text-2xl font-bold">{task.title}</h2>
          </div>
          <button
            onClick={() => {
              const newStatus = status === 'done' ? 'open' : 'done';
              setStatus(newStatus);
              handleSave({ status: newStatus });
            }}
            className={cx(
              "px-4 py-2 rounded-lg transition flex items-center gap-2",
              status === 'done'
                ? "bg-green-500 hover:bg-green-600"
                : "bg-white/20 hover:bg-white/30"
            )}
          >
            <Icon name={status === 'done' ? "check-circle" : "circle"} className="w-5 h-5" />
            {status === 'done' ? 'Completed' : 'Mark Done'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-white rounded-xl border border-graystone-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-graystone-500 uppercase">Description</h3>
              {!editingDescription && (
                <button
                  onClick={() => setEditingDescription(true)}
                  className="text-sm text-ocean-500 hover:text-ocean-600"
                >
                  Edit
                </button>
              )}
            </div>
            {editingDescription ? (
              <div className="space-y-2">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-graystone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                  placeholder="Add a description..."
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      handleSave({ description });
                      setEditingDescription(false);
                    }}
                    className="px-3 py-1.5 bg-ocean-500 text-white text-sm rounded-lg hover:bg-ocean-600 transition"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setDescription(task.description || '');
                      setEditingDescription(false);
                    }}
                    className="px-3 py-1.5 text-graystone-600 text-sm hover:bg-graystone-100 rounded-lg transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-graystone-700 whitespace-pre-wrap">
                {description || <span className="text-graystone-400 italic">No description</span>}
              </p>
            )}
          </div>

          {/* Comments */}
          <div className="bg-white rounded-xl border border-graystone-200 p-4">
            <h3 className="text-sm font-semibold text-graystone-500 uppercase mb-4">Comments</h3>
            <div className="space-y-4 mb-4">
              {comments.map(comment => (
                <div key={comment.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-ocean-100 flex items-center justify-center text-sm font-bold text-ocean-600 flex-shrink-0">
                    {comment.author?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-graystone-900">{comment.author}</span>
                      <span className="text-xs text-graystone-400">
                        {new Date(comment.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-graystone-700">{comment.text}</p>
                  </div>
                </div>
              ))}
              {comments.length === 0 && (
                <p className="text-graystone-400 text-sm">No comments yet</p>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                placeholder="Write a comment..."
                className="flex-1 px-3 py-2 border border-graystone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
              />
              <button
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                className="px-4 py-2 bg-ocean-500 text-white rounded-lg hover:bg-ocean-600 transition disabled:opacity-50"
              >
                Post
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Details */}
          <div className="bg-white rounded-xl border border-graystone-200 p-4 space-y-4">
            <h3 className="text-sm font-semibold text-graystone-500 uppercase">Details</h3>

            <div>
              <label className="text-xs text-graystone-500 block mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => {
                  setPriority(e.target.value);
                  handleSave({ priority: e.target.value });
                }}
                className="w-full px-3 py-2 border border-graystone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-graystone-500 block mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  handleSave({ status: e.target.value });
                }}
                className="w-full px-3 py-2 border border-graystone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-graystone-500 block mb-1">Deadline</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => {
                    setDeadline(e.target.value);
                    handleSave({ deadline: e.target.value || null });
                  }}
                  className="flex-1 px-3 py-2 border border-graystone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                />
                {deadline && (
                  <button
                    onClick={() => {
                      setDeadline('');
                      handleSave({ deadline: null });
                    }}
                    className="px-2 text-graystone-400 hover:text-graystone-600"
                  >
                    <Icon name="x" className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs text-graystone-500 block mb-1">Assignee</label>
              <select
                value={assignee}
                onChange={(e) => {
                  setAssignee(e.target.value);
                  const email = USERS_WITH_EMAILS?.find(u => u.name === e.target.value)?.email || '';
                  handleSave({ assignee: e.target.value, assigneeEmail: email });
                }}
                className="w-full px-3 py-2 border border-graystone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
              >
                <option value="">Unassigned</option>
                {(USERS || []).map(user => (
                  <option key={user} value={user}>{user}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-graystone-500 block mb-1">Requester</label>
              <input
                type="text"
                value={requester}
                onChange={(e) => setRequester(e.target.value)}
                onBlur={() => handleSave({ requester })}
                placeholder="Who requested this?"
                className="w-full px-3 py-2 border border-graystone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
              />
            </div>

            <div>
              <label className="text-xs text-graystone-500 block mb-1">Added</label>
              <p className="text-sm text-graystone-700">
                {new Date(task.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Tags */}
          <div className="bg-white rounded-xl border border-graystone-200 p-4">
            <h3 className="text-sm font-semibold text-graystone-500 uppercase mb-2">Tags</h3>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-ocean-100 text-ocean-700 rounded-full text-xs"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-ocean-900"
                  >
                    <Icon name="x" className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                placeholder="Add tag..."
                className="flex-1 px-3 py-1.5 text-sm border border-graystone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
              />
              <button
                onClick={handleAddTag}
                className="px-3 py-1.5 text-sm text-ocean-500 hover:bg-ocean-50 rounded-lg transition"
              >
                Add
              </button>
            </div>
          </div>

          {/* Delete */}
          <div className="bg-white rounded-xl border border-red-200 p-4">
            {showDeleteConfirm ? (
              <div className="space-y-2">
                <p className="text-sm text-red-600">Are you sure you want to delete this task?</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDelete}
                    className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3 py-1.5 text-graystone-600 text-sm hover:bg-graystone-100 rounded-lg transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="text-sm text-red-500 hover:text-red-600 transition"
              >
                Delete Task
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkstreamTaskDetail;
