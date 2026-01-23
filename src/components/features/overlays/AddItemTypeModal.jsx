import React, { useState, useEffect, useRef } from 'react';
import Icon from '../../ui/Icon';

/**
 * AddItemTypeModal - Modal for selecting item type and creating items
 * Each item type shows all available fields for that type
 */
function AddItemTypeModal({
  show,
  onClose,
  onCreateProject,
  onCreateJob,
  onCreateWorkstream,
  currentUser,
  userEmail,
  users = [],
  teams = [],
  initialStep = 'select'
}) {
  const [step, setStep] = useState(initialStep);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  // Common fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [owner, setOwner] = useState(currentUser);
  const [ownerEmail, setOwnerEmail] = useState(userEmail);
  const [team, setTeam] = useState('');

  // Project-specific fields
  const [collaborators, setCollaborators] = useState([]);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [dateOption, setDateOption] = useState('none'); // 'none', 'range', 'month', 'quarter', 'year'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [monthValue, setMonthValue] = useState(new Date().toISOString().slice(0, 7));
  const [yearValue, setYearValue] = useState(String(new Date().getFullYear()));
  const [quarterValue, setQuarterValue] = useState(String(Math.floor(new Date().getMonth() / 3) + 1));

  // Job-specific fields
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [jobStatus, setJobStatus] = useState('todo');

  // Workstream-specific fields
  const [visibility, setVisibility] = useState('personal');
  const [color, setColor] = useState('blue');

  const colors = [
    { id: 'blue', bg: 'bg-blue-500' },
    { id: 'green', bg: 'bg-green-500' },
    { id: 'purple', bg: 'bg-purple-500' },
    { id: 'orange', bg: 'bg-orange-500' },
    { id: 'pink', bg: 'bg-pink-500' },
    { id: 'teal', bg: 'bg-teal-500' }
  ];

  const jobStatuses = [
    { id: 'todo', label: 'To Do' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'done', label: 'Done' }
  ];

  useEffect(() => {
    if (show) {
      setStep(initialStep);
      resetForm();
    }
  }, [show, initialStep]);

  useEffect(() => {
    if (step !== 'select' && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [step]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setOwner(currentUser);
    setOwnerEmail(userEmail);
    setTeam('');
    setCollaborators([]);
    setTags([]);
    setTagInput('');
    setDateOption('none');
    setStartDate('');
    setEndDate('');
    setMonthValue(new Date().toISOString().slice(0, 7));
    setYearValue(String(new Date().getFullYear()));
    setQuarterValue(String(Math.floor(new Date().getMonth() / 3) + 1));
    setPriority('medium');
    setDueDate('');
    setJobStatus('todo');
    setVisibility('personal');
    setColor('blue');
  };

  const handleClose = () => {
    setStep('select');
    resetForm();
    onClose();
  };

  const handleBack = () => {
    setStep('select');
    resetForm();
  };

  const getTimelineData = () => {
    switch (dateOption) {
      case 'none':
        return { timelineType: null, timelineValue: null, startDate: null, date: null };
      case 'range':
        return { timelineType: 'date', timelineValue: endDate || null, startDate: startDate || null, date: endDate || null };
      case 'month':
        return { timelineType: 'month', timelineValue: monthValue, startDate: null, date: null };
      case 'quarter':
        return { timelineType: 'quarter', timelineValue: `${yearValue}-Q${quarterValue}`, startDate: null, date: null };
      case 'year':
        return { timelineType: 'year', timelineValue: yearValue, startDate: null, date: null };
      default:
        return { timelineType: null, timelineValue: null, startDate: null, date: null };
    }
  };

  const handleSubmitProject = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    const timelineData = getTimelineData();
    await onCreateProject({
      title: title.trim(),
      caption: description.trim(),
      owner,
      ownerEmail,
      team,
      collaborators,
      tags,
      startDate: timelineData.startDate,
      date: timelineData.date,
      timelineType: timelineData.timelineType,
      timelineValue: timelineData.timelineValue,
      workflowStatus: 'Idea',
      itemType: 'project',
      subtasks: [],
      dependencies: [],
      documents: [],
      comments: [],
      attachments: [],
      archived: false
    });
    setSaving(false);
    handleClose();
  };

  const handleSubmitJob = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    await onCreateJob({
      title: title.trim(),
      caption: description.trim(),
      owner,
      ownerEmail,
      team,
      date: dueDate || null,
      timelineValue: dueDate || null,
      workflowStatus: jobStatus,
      itemType: 'job',
      tags: [priority],
      collaborators: [],
      subtasks: [],
      dependencies: [],
      documents: [],
      comments: [],
      attachments: [],
      archived: false
    });
    setSaving(false);
    handleClose();
  };

  const handleSubmitWorkstream = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    await onCreateWorkstream({
      title: title.trim(),
      description: description.trim(),
      owner: currentUser,
      visibility,
      color
    });
    setSaving(false);
    handleClose();
  };

  if (!show) return null;

  const options = [
    { id: 'project', title: 'Project', description: 'Track goals, milestones, and deliverables', icon: 'folder' },
    { id: 'job', title: 'Task', description: 'Quick task or request to complete', icon: 'clipboard-list' },
    { id: 'workstream', title: 'Workstream', description: 'Organize ongoing work and backlogs', icon: 'layers' }
  ];

  const inputClasses = "w-full px-4 py-2 border border-graystone-200 rounded-lg focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500 outline-none";
  const selectClasses = "w-full px-4 py-2 border border-graystone-200 rounded-lg focus:ring-2 focus:ring-ocean-500 outline-none";
  const labelClasses = "block text-sm font-medium text-graystone-700 mb-1";

  const renderSelectStep = () => (
    <>
      <div className="px-6 py-4 border-b border-graystone-100">
        <h2 className="text-xl font-bold text-ocean-900">Add New Item</h2>
        <p className="text-sm text-graystone-600 mt-1">What would you like to create?</p>
      </div>
      <div className="p-4 space-y-3">
        {options.map(option => (
          <button
            key={option.id}
            onClick={() => setStep(option.id)}
            className="w-full flex items-start gap-4 p-4 rounded-xl border-2 transition-all bg-ocean-50 border-ocean-200 hover:border-ocean-400 hover:shadow-md text-left group"
          >
            <div className="w-12 h-12 rounded-xl bg-ocean-500 flex items-center justify-center flex-shrink-0">
              <Icon name={option.icon} className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-ocean-700">{option.title}</h3>
              <p className="text-sm text-graystone-600 mt-0.5">{option.description}</p>
            </div>
            <Icon name="chevron-right" className="w-5 h-5 text-graystone-400 group-hover:text-ocean-500 mt-3 transition-colors" />
          </button>
        ))}
      </div>
      <div className="px-6 py-4 border-t border-graystone-100 bg-graystone-50">
        <button onClick={handleClose} className="w-full px-4 py-2 text-sm text-graystone-600 hover:bg-graystone-200 rounded-lg transition-colors">
          Cancel
        </button>
      </div>
    </>
  );

  const renderProjectForm = () => (
    <form onSubmit={handleSubmitProject}>
      <div className="px-6 py-4 border-b border-graystone-100 flex items-center gap-3">
        <button type="button" onClick={handleBack} className="p-1 hover:bg-graystone-100 rounded-full">
          <Icon name="arrow-left" className="w-5 h-5 text-graystone-500" />
        </button>
        <h2 className="text-lg font-bold text-ocean-900">New Project</h2>
      </div>

      <div className="p-6 space-y-6 max-h-[65vh] overflow-y-auto">
        {/* Project Details */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-ocean-900 flex items-center gap-2 border-b border-ocean-100 pb-2">
            <Icon name="file-text" className="w-4 h-4 text-ocean-500" />
            Project Details
          </h3>
          <div>
            <label className={labelClasses}>Title *</label>
            <input ref={inputRef} type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Q4 Marketing Campaign" className={inputClasses} />
          </div>
          <div>
            <label className={labelClasses}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of the project..." rows={3} className={`${inputClasses} resize-none`} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClasses}>Team</label>
              <select value={team} onChange={(e) => setTeam(e.target.value)} className={selectClasses}>
                <option value="">No team</option>
                {teams.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClasses}>Owner</label>
              <select value={owner} onChange={(e) => { setOwner(e.target.value); setOwnerEmail(users.find(u => u.name === e.target.value)?.email || userEmail); }} className={selectClasses}>
                <option value={currentUser}>{currentUser} (me)</option>
                {users.filter(u => u.name !== currentUser).map(u => <option key={u.email} value={u.name}>{u.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Collaboration */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-ocean-900 flex items-center gap-2 border-b border-ocean-100 pb-2">
            <Icon name="users" className="w-4 h-4 text-ocean-500" />
            Collaboration
          </h3>
          <div>
            <label className={labelClasses}>Collaborators</label>
            <div className="flex flex-wrap gap-2">
              {users.map(userName => {
                const isSelected = collaborators.includes(userName);
                return (
                  <button key={userName} type="button" onClick={() => setCollaborators(isSelected ? collaborators.filter(c => c !== userName) : [...collaborators, userName])}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${isSelected ? "bg-ocean-100 text-ocean-700 border-ocean-200" : "bg-white text-graystone-600 border-graystone-200 hover:border-ocean-300"}`}>
                    {isSelected && <span className="mr-1">✓</span>}{userName}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className={labelClasses}>Tags</label>
            <div className="flex gap-2">
              <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="Add a tag and press Enter..."
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (tagInput.trim()) { setTags([...tags, tagInput.trim()]); setTagInput(''); } } }}
                className={`flex-1 ${inputClasses}`} />
              <button type="button" onClick={() => { if (tagInput.trim()) { setTags([...tags, tagInput.trim()]); setTagInput(''); } }}
                className="px-4 py-2 bg-ocean-500 text-white rounded-lg hover:bg-ocean-600 transition-colors">Add</button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-graystone-100 text-graystone-700 text-xs font-medium">
                    {tag}
                    <button type="button" onClick={() => setTags(tags.filter((_, index) => index !== i))} className="text-graystone-400 hover:text-red-500">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-ocean-900 flex items-center gap-2 border-b border-ocean-100 pb-2">
            <Icon name="calendar" className="w-4 h-4 text-ocean-500" />
            Timeline
          </h3>

          {/* Date Option Selection */}
          <div>
            <label className={labelClasses}>Date Type</label>
            <div className="grid grid-cols-5 gap-2">
              {[
                { id: 'none', label: 'No Date' },
                { id: 'range', label: 'Date Range' },
                { id: 'month', label: 'Month' },
                { id: 'quarter', label: 'Quarter' },
                { id: 'year', label: 'Year' }
              ].map(opt => (
                <button key={opt.id} type="button" onClick={() => setDateOption(opt.id)}
                  className={`py-2 text-xs rounded-lg border transition-all ${dateOption === opt.id ? "bg-ocean-500 text-white border-ocean-500" : "bg-white text-graystone-600 border-graystone-200 hover:border-ocean-300"}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conditional Date Inputs */}
          {dateOption === 'range' && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-ocean-50 rounded-xl border border-ocean-100">
              <div>
                <label className="text-sm font-medium text-ocean-900 mb-1 block">Start Date</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClasses} />
              </div>
              <div>
                <label className="text-sm font-medium text-ocean-900 mb-1 block">End Date</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate || undefined} className={inputClasses} />
              </div>
            </div>
          )}

          {dateOption === 'month' && (
            <div className="p-4 bg-ocean-50 rounded-xl border border-ocean-100">
              <label className="text-sm font-medium text-ocean-900 mb-1 block">Target Month</label>
              <input type="month" value={monthValue} onChange={(e) => setMonthValue(e.target.value)} className={inputClasses} />
            </div>
          )}

          {dateOption === 'quarter' && (
            <div className="p-4 bg-ocean-50 rounded-xl border border-ocean-100">
              <label className="text-sm font-medium text-ocean-900 mb-2 block">Target Quarter</label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <input type="number" value={yearValue} onChange={(e) => setYearValue(e.target.value)} placeholder="Year" className={inputClasses} />
                </div>
                <div className="w-24">
                  <select value={quarterValue} onChange={(e) => setQuarterValue(e.target.value)} className={selectClasses}>
                    {[1, 2, 3, 4].map(q => <option key={q} value={q}>Q{q}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {dateOption === 'year' && (
            <div className="p-4 bg-ocean-50 rounded-xl border border-ocean-100">
              <label className="text-sm font-medium text-ocean-900 mb-1 block">Target Year</label>
              <input type="number" value={yearValue} onChange={(e) => setYearValue(e.target.value)} placeholder="Year" className={inputClasses} />
            </div>
          )}
        </div>
      </div>

      <div className="px-6 py-4 bg-graystone-50 border-t border-graystone-100 flex justify-end gap-3">
        <button type="button" onClick={handleClose} className="px-4 py-2 text-graystone-600 hover:bg-graystone-100 rounded-lg transition-colors">Cancel</button>
        <button type="submit" disabled={!title.trim() || saving} className="px-6 py-2 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 transition-colors disabled:opacity-50 flex items-center gap-2">
          {saving && <Icon name="loader-2" className="w-4 h-4 animate-spin" />}
          Create Project
        </button>
      </div>
    </form>
  );

  const renderJobForm = () => (
    <form onSubmit={handleSubmitJob}>
      <div className="px-6 py-4 border-b border-graystone-100 flex items-center gap-3">
        <button type="button" onClick={handleBack} className="p-1 hover:bg-graystone-100 rounded-full">
          <Icon name="arrow-left" className="w-5 h-5 text-graystone-500" />
        </button>
        <h2 className="text-lg font-bold text-ocean-900">New Task</h2>
      </div>

      <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
        <div>
          <label className={labelClasses}>Title *</label>
          <input ref={inputRef} type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs to be done?" className={inputClasses} />
        </div>

        <div>
          <label className={labelClasses}>Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add more details (optional)" rows={3} className={`${inputClasses} resize-none`} />
        </div>

        <div>
          <label className={labelClasses}>Status</label>
          <div className="flex gap-2">
            {jobStatuses.map(s => (
              <button key={s.id} type="button" onClick={() => setJobStatus(s.id)}
                className={`flex-1 py-2 text-sm rounded-lg border transition-all ${jobStatus === s.id ? "bg-ocean-500 text-white border-ocean-500" : "bg-white text-graystone-600 border-graystone-200 hover:border-ocean-300"}`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClasses}>Assignee</label>
            <select value={owner} onChange={(e) => { setOwner(e.target.value); setOwnerEmail(users.find(u => u.name === e.target.value)?.email || userEmail); }} className={selectClasses}>
              <option value={currentUser}>{currentUser} (me)</option>
              {users.filter(u => u.name !== currentUser).map(u => <option key={u.email} value={u.name}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClasses}>Team</label>
            <select value={team} onChange={(e) => setTeam(e.target.value)} className={selectClasses}>
              <option value="">No team</option>
              {teams.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClasses}>Due Date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClasses} />
          </div>
          <div>
            <label className={labelClasses}>Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className={selectClasses}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 bg-graystone-50 border-t border-graystone-100 flex justify-end gap-3">
        <button type="button" onClick={handleClose} className="px-4 py-2 text-graystone-600 hover:bg-graystone-100 rounded-lg transition-colors">Cancel</button>
        <button type="submit" disabled={!title.trim() || saving} className="px-6 py-2 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 transition-colors disabled:opacity-50 flex items-center gap-2">
          {saving && <Icon name="loader-2" className="w-4 h-4 animate-spin" />}
          Create Task
        </button>
      </div>
    </form>
  );

  const renderWorkstreamForm = () => (
    <form onSubmit={handleSubmitWorkstream}>
      <div className="px-6 py-4 border-b border-graystone-100 flex items-center gap-3">
        <button type="button" onClick={handleBack} className="p-1 hover:bg-graystone-100 rounded-full">
          <Icon name="arrow-left" className="w-5 h-5 text-graystone-500" />
        </button>
        <h2 className="text-lg font-bold text-ocean-900">New Workstream</h2>
      </div>

      <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
        <div>
          <label className={labelClasses}>Title *</label>
          <input ref={inputRef} type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Website Requests" className={inputClasses} />
        </div>

        <div>
          <label className={labelClasses}>Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this workstream for?" rows={3} className={`${inputClasses} resize-none`} />
        </div>

        <div>
          <label className={labelClasses}>Color</label>
          <div className="flex gap-2 py-1">
            {colors.map(c => (
              <button key={c.id} type="button" onClick={() => setColor(c.id)}
                className={`w-8 h-8 rounded-full transition ${c.bg} ${color === c.id ? 'ring-2 ring-offset-2 ring-ocean-500' : ''}`} />
            ))}
          </div>
        </div>

        <div>
          <label className={labelClasses}>Visibility</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="visibility" checked={visibility === 'personal'} onChange={() => setVisibility('personal')} className="text-ocean-500 focus:ring-ocean-500" />
              <span className="text-sm">Personal</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="visibility" checked={visibility === 'shared'} onChange={() => setVisibility('shared')} className="text-ocean-500 focus:ring-ocean-500" />
              <span className="text-sm">Shared with team</span>
            </label>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 bg-graystone-50 border-t border-graystone-100 flex justify-end gap-3">
        <button type="button" onClick={handleClose} className="px-4 py-2 text-graystone-600 hover:bg-graystone-100 rounded-lg transition-colors">Cancel</button>
        <button type="submit" disabled={!title.trim() || saving} className="px-6 py-2 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 transition-colors disabled:opacity-50 flex items-center gap-2">
          {saving && <Icon name="loader-2" className="w-4 h-4 animate-spin" />}
          Create Workstream
        </button>
      </div>
    </form>
  );

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
      <div className="fixed inset-0" onClick={handleClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {step === 'select' && renderSelectStep()}
        {step === 'project' && renderProjectForm()}
        {step === 'job' && renderJobForm()}
        {step === 'workstream' && renderWorkstreamForm()}
      </div>
    </div>
  );
}

export default AddItemTypeModal;
