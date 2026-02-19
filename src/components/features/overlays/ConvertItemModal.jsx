import React, { useState, useEffect, useMemo } from 'react';
import Icon from '../../ui/Icon';

const cx = (...args) => args.filter(Boolean).join(' ');

/**
 * ConvertItemModal - Convert items between Tasks, Projects, and Workstream Tasks
 *
 * Handles field mapping and allows user to fill in missing required fields
 */
const ConvertItemModal = ({
  show,
  onClose,
  sourceItem,
  sourceType, // 'task', 'project', 'workstream'
  workstreams = [],
  teams = [],
  userProfiles = [],
  currentUser,
  userEmail,
  onConvertToTask,
  onConvertToProject,
  onConvertToWorkstream
}) => {
  const [targetType, setTargetType] = useState(null);
  const [formData, setFormData] = useState({});
  const [selectedWorkstream, setSelectedWorkstream] = useState('');
  const [isConverting, setIsConverting] = useState(false);

  // Reset when modal opens with new item
  useEffect(() => {
    if (show && sourceItem) {
      setTargetType(null);
      setFormData({});
      setSelectedWorkstream('');
    }
  }, [show, sourceItem?.id]);

  // Map source data to target format when target type is selected
  useEffect(() => {
    if (!targetType || !sourceItem) return;

    const mapped = mapDataToTarget(sourceItem, sourceType, targetType);
    setFormData(mapped);
  }, [targetType, sourceItem, sourceType]);

  // Field mapping logic
  const mapDataToTarget = (item, fromType, toType) => {
    const base = {
      title: item.title || '',
      tags: item.tags || []
    };

    if (toType === 'task') {
      return {
        ...base,
        caption: item.caption || item.description || '',
        owner: Array.isArray(item.owner) ? item.owner : (item.assignee ? [item.assignee] : [currentUser]),
        ownerEmail: Array.isArray(item.ownerEmail) ? item.ownerEmail : (item.assigneeEmail ? [item.assigneeEmail] : [userEmail]),
        date: item.date || item.deadline || item.timelineValue || '',
        workflowStatus: mapWorkflowStatus(item, fromType, 'task'),
        team: item.team || ''
      };
    }

    if (toType === 'project') {
      return {
        ...base,
        caption: item.caption || item.description || '',
        owner: Array.isArray(item.owner) ? item.owner : (item.assignee ? [item.assignee] : [currentUser]),
        ownerEmail: Array.isArray(item.ownerEmail) ? item.ownerEmail : (item.assigneeEmail ? [item.assigneeEmail] : [userEmail]),
        date: item.date || item.deadline || '',
        timelineValue: item.timelineValue || item.deadline || '',
        workflowStatus: mapWorkflowStatus(item, fromType, 'project'),
        team: item.team || '',
        collaborators: item.collaborators || [],
        subtasks: [],
        documents: [],
        comments: item.comments || []
      };
    }

    if (toType === 'workstream') {
      const firstOwner = Array.isArray(item.owner) ? item.owner[0] : item.owner;
      const firstOwnerEmail = Array.isArray(item.ownerEmail) ? item.ownerEmail[0] : item.ownerEmail;
      return {
        ...base,
        description: item.caption || item.description || '',
        assignee: item.assignee || firstOwner || '',
        assigneeEmail: item.assigneeEmail || firstOwnerEmail || '',
        requester: item.requester || '',
        deadline: item.deadline || item.date || item.timelineValue || '',
        priority: item.priority || (item.tags?.includes('high') ? 'high' : item.tags?.includes('low') ? 'low' : 'medium'),
        status: mapWorkflowStatus(item, fromType, 'workstream')
      };
    }

    return base;
  };

  const mapWorkflowStatus = (item, fromType, toType) => {
    const status = item.workflowStatus || item.status || 'todo';

    if (toType === 'task') {
      // Map to: todo, in_progress
      if (['done', 'Complete', 'completed', 'Archived'].includes(status)) return 'todo'; // Reset completed items
      if (['in_progress', 'In Progress', 'Review', 'Blocked'].includes(status)) return 'in_progress';
      return 'todo';
    }

    if (toType === 'project') {
      // Map to: Idea, Planning, In Progress, Blocked, Review, Complete
      if (['todo', 'open', 'Idea'].includes(status)) return 'Idea';
      if (['in_progress', 'In Progress'].includes(status)) return 'In Progress';
      if (['done', 'Complete', 'completed'].includes(status)) return 'Complete';
      return 'Idea';
    }

    if (toType === 'workstream') {
      // Map to: open, in_progress, done
      if (['todo', 'Idea', 'Planning', 'open'].includes(status)) return 'open';
      if (['in_progress', 'In Progress', 'Review', 'Blocked'].includes(status)) return 'in_progress';
      if (['done', 'Complete', 'completed'].includes(status)) return 'done';
      return 'open';
    }

    return status;
  };

  const handleConvert = async () => {
    if (!targetType || !formData.title?.trim()) return;

    setIsConverting(true);
    try {
      if (targetType === 'task') {
        await onConvertToTask(sourceItem, sourceType, formData);
      } else if (targetType === 'project') {
        await onConvertToProject(sourceItem, sourceType, formData);
      } else if (targetType === 'workstream') {
        if (!selectedWorkstream) {
          alert('Please select a workstream');
          setIsConverting(false);
          return;
        }
        await onConvertToWorkstream(sourceItem, sourceType, formData, selectedWorkstream);
      }
      onClose();
    } catch (err) {
      console.error('Conversion failed:', err);
    } finally {
      setIsConverting(false);
    }
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Available target types (exclude current type)
  const targetOptions = useMemo(() => {
    const options = [
      { id: 'task', label: 'Task', icon: 'clipboard-list', description: 'Simple items to tick off' },
      { id: 'project', label: 'Project', icon: 'folder', description: 'Bigger work with stages' },
      { id: 'workstream', label: 'Workstream Request', icon: 'layers', description: 'Add to a request queue' }
    ];
    return options.filter(o => o.id !== sourceType);
  }, [sourceType]);

  if (!show) return null;

  const sourceLabel = sourceType === 'task' ? 'Task' : sourceType === 'project' ? 'Project' : 'Workstream Request';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-graystone-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-ocean-900">Convert {sourceLabel}</h2>
              <p className="text-sm text-graystone-500 mt-1">"{sourceItem?.title}"</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-graystone-100 rounded-lg transition"
            >
              <Icon name="x" className="w-5 h-5 text-graystone-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Step 1: Choose target type */}
          {!targetType && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-graystone-700">Convert to:</h3>
              {targetOptions.map(option => (
                <button
                  key={option.id}
                  onClick={() => setTargetType(option.id)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-graystone-200 hover:border-ocean-300 hover:bg-ocean-50 transition text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-ocean-100 flex items-center justify-center">
                    <Icon name={option.icon} className="w-5 h-5 text-ocean-600" />
                  </div>
                  <div>
                    <p className="font-medium text-graystone-900">{option.label}</p>
                    <p className="text-sm text-graystone-500">{option.description}</p>
                  </div>
                  <Icon name="chevron-right" className="w-5 h-5 text-graystone-400 ml-auto" />
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Edit mapped fields */}
          {targetType && (
            <div className="space-y-4">
              <button
                onClick={() => setTargetType(null)}
                className="flex items-center gap-2 text-sm text-ocean-600 hover:text-ocean-700"
              >
                <Icon name="arrow-left" className="w-4 h-4" />
                Back to type selection
              </button>

              <div className="p-3 bg-ocean-50 rounded-lg border border-ocean-200">
                <p className="text-sm text-ocean-700">
                  Converting to <strong>{targetType === 'task' ? 'Task' : targetType === 'project' ? 'Project' : 'Workstream Request'}</strong>.
                  Review and edit the fields below.
                </p>
              </div>

              {/* Workstream selector */}
              {targetType === 'workstream' && (
                <div>
                  <label className="block text-sm font-medium text-graystone-700 mb-1">
                    Add to Workstream <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedWorkstream}
                    onChange={(e) => setSelectedWorkstream(e.target.value)}
                    className="w-full px-3 py-2 border border-graystone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                  >
                    <option value="">Select a workstream...</option>
                    {workstreams.map(ws => (
                      <option key={ws.id} value={ws.id}>{ws.title}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-graystone-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => updateField('title', e.target.value)}
                  className="w-full px-3 py-2 border border-graystone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                />
              </div>

              {/* Description/Caption */}
              <div>
                <label className="block text-sm font-medium text-graystone-700 mb-1">
                  {targetType === 'workstream' ? 'Description' : 'Caption'}
                </label>
                <textarea
                  value={targetType === 'workstream' ? (formData.description || '') : (formData.caption || '')}
                  onChange={(e) => updateField(targetType === 'workstream' ? 'description' : 'caption', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-graystone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                />
              </div>

              {/* Owner/Assignee */}
              <div>
                <label className="block text-sm font-medium text-graystone-700 mb-1">
                  {targetType === 'workstream' ? 'Assignee' : 'Owner'}
                </label>
                <select
                  value={targetType === 'workstream' ? (formData.assignee || '') : (formData.owner || '')}
                  onChange={(e) => {
                    const field = targetType === 'workstream' ? 'assignee' : 'owner';
                    const emailField = targetType === 'workstream' ? 'assigneeEmail' : 'ownerEmail';
                    const profile = userProfiles.find(p => p.full_name === e.target.value);
                    updateField(field, e.target.value);
                    if (profile) updateField(emailField, profile.email);
                  }}
                  className="w-full px-3 py-2 border border-graystone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                >
                  <option value="">Unassigned</option>
                  {userProfiles.map(profile => (
                    <option key={profile.email} value={profile.full_name}>{profile.full_name}</option>
                  ))}
                </select>
              </div>

              {/* Date/Deadline */}
              <div>
                <label className="block text-sm font-medium text-graystone-700 mb-1">
                  {targetType === 'workstream' ? 'Deadline' : 'Due Date'}
                </label>
                <input
                  type="date"
                  value={targetType === 'workstream' ? (formData.deadline || '') : (formData.date || '')}
                  onChange={(e) => updateField(targetType === 'workstream' ? 'deadline' : 'date', e.target.value)}
                  className="w-full px-3 py-2 border border-graystone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                />
              </div>

              {/* Team (for task/project) */}
              {targetType !== 'workstream' && teams.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-graystone-700 mb-1">Team</label>
                  <select
                    value={formData.team || ''}
                    onChange={(e) => updateField('team', e.target.value)}
                    className="w-full px-3 py-2 border border-graystone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                  >
                    <option value="">No team</option>
                    {teams.map(team => (
                      <option key={team.id} value={team.name}>{team.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Priority (for workstream) */}
              {targetType === 'workstream' && (
                <div>
                  <label className="block text-sm font-medium text-graystone-700 mb-1">Priority</label>
                  <select
                    value={formData.priority || 'medium'}
                    onChange={(e) => updateField('priority', e.target.value)}
                    className="w-full px-3 py-2 border border-graystone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              )}

              {/* Requester (for workstream) */}
              {targetType === 'workstream' && (
                <div>
                  <label className="block text-sm font-medium text-graystone-700 mb-1">Requester</label>
                  <input
                    type="text"
                    value={formData.requester || ''}
                    onChange={(e) => updateField('requester', e.target.value)}
                    placeholder="Who requested this?"
                    className="w-full px-3 py-2 border border-graystone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                  />
                </div>
              )}

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-graystone-700 mb-1">Status</label>
                <select
                  value={targetType === 'workstream' ? (formData.status || 'open') : (formData.workflowStatus || 'todo')}
                  onChange={(e) => updateField(targetType === 'workstream' ? 'status' : 'workflowStatus', e.target.value)}
                  className="w-full px-3 py-2 border border-graystone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                >
                  {targetType === 'task' && (
                    <>
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                    </>
                  )}
                  {targetType === 'project' && (
                    <>
                      <option value="Idea">Idea</option>
                      <option value="Planning">Planning</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Blocked">Blocked</option>
                      <option value="Review">Review</option>
                    </>
                  )}
                  {targetType === 'workstream' && (
                    <>
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                    </>
                  )}
                </select>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-graystone-700 mb-1">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {(formData.tags || []).map((tag, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-ocean-100 text-ocean-700 rounded-full text-xs">
                      {tag}
                      <button
                        type="button"
                        onClick={() => updateField('tags', formData.tags.filter((_, idx) => idx !== i))}
                        className="hover:text-ocean-900"
                      >
                        <Icon name="x" className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {(formData.tags || []).length === 0 && (
                    <span className="text-sm text-graystone-400">No tags</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {targetType && (
          <div className="p-6 border-t border-graystone-200 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-graystone-700 hover:bg-graystone-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              onClick={handleConvert}
              disabled={isConverting || !formData.title?.trim() || (targetType === 'workstream' && !selectedWorkstream)}
              className="px-4 py-2 bg-ocean-500 text-white rounded-lg hover:bg-ocean-600 transition disabled:opacity-50 flex items-center gap-2"
            >
              {isConverting ? (
                <>
                  <Icon name="loader-2" className="w-4 h-4 animate-spin" />
                  Converting...
                </>
              ) : (
                <>
                  <Icon name="refresh-cw" className="w-4 h-4" />
                  Convert
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConvertItemModal;
