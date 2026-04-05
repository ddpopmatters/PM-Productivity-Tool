import React, { useState, useEffect } from 'react';
import Icon from '../../ui/Icon';
import AddJobModal from '../overlays/AddJobModal';
import JobDetailModal from '../overlays/JobDetailModal';
import JobCard from '../cards/JobCard';

// Local utility for conditional class names
const cx = (...args) => args.filter(Boolean).join(' ');

// Job status configuration (Done removed - completing archives the task)
const JOB_STATUSES = [
  { id: 'todo', label: 'To Do', color: 'gray' },
  { id: 'in_progress', label: 'In Progress', color: 'blue' }
];

const PRIORITY_SECTIONS = [
  { id: 'high', label: 'High', dotColor: 'bg-red-500' },
  { id: 'medium', label: 'Medium', dotColor: 'bg-amber-500' },
  { id: 'low', label: 'Low', dotColor: 'bg-green-500' },
  { id: 'none', label: 'Uncategorized', dotColor: 'bg-graystone-400' },
];

const getJobPriority = (job) => {
  const p = job.tags?.find(t => ['high', 'medium', 'low'].includes(t?.toLowerCase?.()))?.toLowerCase();
  return p || 'none';
};

const JobsView = ({
  entries,
  setEntries,
  userEmail,
  currentUser,
  darkMode,
  userProfiles,
  teams,
  onNavigateToWhiteboard,
  supabase,
  Logger,
  WhiteboardPreviewCard,
  WHITEBOARD_API
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [filter, setFilter] = useState('mine'); // 'all', 'mine', 'assigned'
  const [draggedJob, setDraggedJob] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [dragOverPriority, setDragOverPriority] = useState(null);

  // Filter only jobs from entries
  const jobs = entries.filter(e => e.itemType === 'job' && !e.archived);

  // Helper filters
  const myJobs = jobs.filter(j => j.owner?.includes(currentUser) || j.ownerEmail?.includes(userEmail));
  const assignedToMe = jobs.filter(j => !j.owner?.includes(currentUser) && !j.ownerEmail?.includes(userEmail) && j.collaborators?.includes(currentUser));

  // Apply user filter
  const filteredJobs = filter === 'mine'
    ? myJobs
    : filter === 'assigned'
    ? assignedToMe
    : [...myJobs, ...assignedToMe]; // 'all' = owned + assigned tasks

  // Group by status (no done - completing archives)
  // Any status that isn't explicitly 'in_progress' lands in To Do
  const jobsByStatus = {
    todo: filteredJobs.filter(j => j.workflowStatus !== 'in_progress'),
    in_progress: filteredJobs.filter(j => j.workflowStatus === 'in_progress')
  };

  // Handle creating a new job
  const handleCreateJob = async (jobData) => {
    if (!supabase) return;

    const dbItem = {
      title: jobData.title,
      caption: jobData.caption,
      workflow_status: jobData.workflowStatus,
      team: jobData.team,
      timeline_value: jobData.timelineValue,
      owner: Array.isArray(jobData.owner) ? jobData.owner : [jobData.owner].filter(Boolean),
      owner_email: Array.isArray(jobData.ownerEmail) ? jobData.ownerEmail : [jobData.ownerEmail].filter(Boolean),
      collaborators: [],
      tags: jobData.tags,
      subtasks: [],
      documents: [],
      date: jobData.date,
      comments: [],
      archived: false,
      dependencies: [],
      custom_fields: {},
      attachments: [],
      item_type: 'job'
    };

    const { data, error } = await supabase
      .from('workflow_items')
      .insert([dbItem])
      .select()
      .single();

    if (error) {
      Logger.error(error, 'Error creating job');
      return;
    }

    // Map to app format and add to state
    const newJob = {
      id: data.id,
      title: data.title,
      caption: data.caption,
      workflowStatus: data.workflow_status,
      team: data.team,
      timelineValue: data.timeline_value,
      owner: data.owner,
      ownerEmail: data.owner_email,
      collaborators: data.collaborators || [],
      tags: data.tags || [],
      subtasks: data.subtasks || [],
      documents: data.documents || [],
      date: data.date,
      comments: data.comments || [],
      archived: data.archived,
      dependencies: data.dependencies || [],
      customFields: data.custom_fields || {},
      attachments: data.attachments || [],
      itemType: data.item_type || 'job',
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };

    setEntries(prev => [newJob, ...prev]);
  };

  // Handle updating a job
  const handleUpdateJob = async (updatedJob) => {
    if (!supabase) return;

    const dbItem = {
      title: updatedJob.title,
      caption: updatedJob.caption,
      workflow_status: updatedJob.workflowStatus,
      team: updatedJob.team,
      timeline_value: updatedJob.timelineValue,
      owner: Array.isArray(updatedJob.owner) ? updatedJob.owner : [updatedJob.owner].filter(Boolean),
      owner_email: Array.isArray(updatedJob.ownerEmail) ? updatedJob.ownerEmail : [updatedJob.ownerEmail].filter(Boolean),
      tags: updatedJob.tags,
      date: updatedJob.date,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('workflow_items')
      .update(dbItem)
      .eq('id', updatedJob.id);

    if (error) {
      Logger.error(error, 'Error updating job');
      return;
    }

    setEntries(prev => prev.map(e =>
      e.id === updatedJob.id ? { ...e, ...updatedJob } : e
    ));

    // Update selected job if it's the one being edited
    if (selectedJob?.id === updatedJob.id) {
      setSelectedJob({ ...selectedJob, ...updatedJob });
    }
  };

  // Handle deleting a job
  const handleDeleteJob = async (jobId) => {
    if (!supabase) return;

    const { error } = await supabase
      .from('workflow_items')
      .delete()
      .eq('id', jobId);

    if (error) {
      Logger.error(error, 'Error deleting job');
      return;
    }

    setEntries(prev => prev.filter(e => e.id !== jobId));
  };

  // Handle promoting job to project
  const handlePromoteToProject = async (jobId) => {
    if (!supabase) return;

    const { error } = await supabase
      .from('workflow_items')
      .update({
        item_type: 'project',
        workflow_status: 'Idea',
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    if (error) {
      Logger.error(error, 'Error promoting job');
      return;
    }

    setEntries(prev => prev.map(e =>
      e.id === jobId ? { ...e, itemType: 'project', workflowStatus: 'Idea' } : e
    ));
  };

  // Handle completing (archiving) a job
  const handleCompleteJob = async (jobId) => {
    if (!supabase) return;

    const { error } = await supabase
      .from('workflow_items')
      .update({
        archived: true,
        workflow_status: 'done',
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    if (error) {
      Logger.error(error, 'Error completing job');
      return;
    }

    setEntries(prev => prev.map(e =>
      e.id === jobId ? { ...e, archived: true, workflowStatus: 'done' } : e
    ));

    // Close detail modal if this job was selected
    if (selectedJob?.id === jobId) {
      setSelectedJob(null);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e, job) => {
    setDraggedJob(job);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', job.id || '');
  };

  const handleDragEnd = () => {
    setDraggedJob(null);
    setDragOverColumn(null);
    setDragOverPriority(null);
  };

  const handleDropOnPriority = async (e, targetPriority) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedJob) return;
    const cleanTags = (draggedJob.tags || []).filter(t => !['high', 'medium', 'low'].includes(t?.toLowerCase?.()));
    const newTags = targetPriority === 'none' ? cleanTags : [...cleanTags, targetPriority];
    const updatedJob = {
      ...draggedJob,
      tags: newTags,
      workflowStatus: draggedJob.workflowStatus === 'in_progress' ? 'todo' : draggedJob.workflowStatus,
    };
    await handleUpdateJob(updatedJob);
    setDraggedJob(null);
    setDragOverColumn(null);
    setDragOverPriority(null);
  };

  const handleDragOver = (e, status) => {
    e.preventDefault();
    setDragOverColumn(status);
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    if (!draggedJob || draggedJob.workflowStatus === newStatus) {
      setDraggedJob(null);
      setDragOverColumn(null);
      return;
    }

    const updatedJob = { ...draggedJob, workflowStatus: newStatus };
    await handleUpdateJob(updatedJob);
    setDraggedJob(null);
    setDragOverColumn(null);
  };

  return (
    <div className={cx("h-full flex flex-col", darkMode && "dark")}>
      {/* Header */}
      <div className="p-6 space-y-6">
        <div className="bg-ocean-800 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Tasks</h1>
              <p className="text-ocean-100 text-sm">Quick tasks that don't need full project tracking</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors border border-white/20"
            >
              <Icon name="plus" className="w-4 h-4" />
              Add Task
            </button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            onClick={() => setFilter('all')}
            className={cx(
              "bg-white rounded-xl p-6 border shadow-sm cursor-pointer hover:shadow-md transition-all",
              filter === 'all' ? "border-ocean-500 ring-2 ring-ocean-200" : "border-graystone-200"
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-heading text-sm text-graystone-600 mb-1 tracking-wide">All Tasks</p>
                <p className="text-3xl font-bold text-ocean-900">{myJobs.length + assignedToMe.length}</p>
              </div>
              <div className="w-12 h-12 bg-ocean-500 rounded-xl flex items-center justify-center">
                <Icon name="clipboard-list" className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-xs text-graystone-500 mt-2">Your owned + assigned tasks</p>
          </div>
          <div
            onClick={() => setFilter('mine')}
            className={cx(
              "bg-white rounded-xl p-6 border shadow-sm cursor-pointer hover:shadow-md transition-all",
              filter === 'mine' ? "border-ocean-500 ring-2 ring-ocean-200" : "border-graystone-200"
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-heading text-sm text-graystone-600 mb-1 tracking-wide">My Tasks</p>
                <p className="text-3xl font-bold text-ocean-900">{myJobs.length}</p>
              </div>
              <div className="w-12 h-12 bg-ocean-500 rounded-xl flex items-center justify-center">
                <Icon name="user" className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-xs text-graystone-500 mt-2">Tasks you created</p>
          </div>
          <div
            onClick={() => setFilter('assigned')}
            className={cx(
              "bg-white rounded-xl p-6 border shadow-sm cursor-pointer hover:shadow-md transition-all",
              filter === 'assigned' ? "border-ocean-500 ring-2 ring-ocean-200" : "border-graystone-200"
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-heading text-sm text-graystone-600 mb-1 tracking-wide">Assigned to Me</p>
                <p className="text-3xl font-bold text-ocean-900">{assignedToMe.length}</p>
              </div>
              <div className="w-12 h-12 bg-ocean-500 rounded-xl flex items-center justify-center">
                <Icon name="users" className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-xs text-graystone-500 mt-2">Tasks assigned by others</p>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-hidden p-6">
        <div className="flex flex-col h-full gap-4">
          {/* Main columns: High | Medium | Low | In Progress (top), Uncategorized | In Progress (bottom) */}
          <div className="grid grid-cols-4 gap-4 flex-1" style={{ gridTemplateRows: 'auto 1fr' }}>
            {/* Priority columns — High, Medium, Low */}
            {PRIORITY_SECTIONS.filter(s => s.id !== 'none').map(section => {
              const sectionJobs = jobsByStatus.todo.filter(j => getJobPriority(j) === section.id);
              const isOver = dragOverPriority === section.id;
              return (
                <div
                  key={section.id}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOverPriority(section.id); setDragOverColumn('todo'); }}
                  onDrop={(e) => handleDropOnPriority(e, section.id)}
                  className={cx(
                    "flex flex-col rounded-xl border transition-colors min-w-0",
                    isOver ? "border-dashed border-ocean-400 bg-ocean-50" : "border-graystone-200 bg-graystone-50/50"
                  )}
                >
                  <div className="p-3 border-b border-graystone-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cx("w-3 h-3 rounded-full", section.dotColor)} />
                        <span className="font-semibold text-graystone-800 text-sm">{section.label}</span>
                      </div>
                      <span className="text-xs text-graystone-500 bg-graystone-200 px-2 py-0.5 rounded-full">
                        {sectionJobs.length}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[120px]" onDragOver={(e) => e.preventDefault()}>
                    {sectionJobs.map(job => (
                      <JobCard
                        key={job.id}
                        job={job}
                        onClick={setSelectedJob}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        userProfiles={userProfiles}
                        onComplete={() => handleCompleteJob(job.id)}
                        isDragging={!!draggedJob}
                      />
                    ))}
                    {sectionJobs.length === 0 && (
                      <div className="text-center py-6 text-graystone-400 text-xs">
                        {isOver ? 'Drop here' : 'None'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* In Progress — spans both rows */}
            <div
              className={cx(
                "flex flex-col rounded-xl border transition-colors min-w-0 row-span-2",
                dragOverColumn === 'in_progress' ? "border-ocean-400 bg-ocean-50" : "border-graystone-200 bg-graystone-50/50"
              )}
              onDragOver={(e) => handleDragOver(e, 'in_progress')}
              onDrop={(e) => handleDrop(e, 'in_progress')}
            >
              <div className="p-4 border-b border-graystone-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="font-semibold text-graystone-800">In Progress</span>
                  </div>
                  <span className="text-sm text-graystone-500 bg-graystone-200 px-2 py-0.5 rounded-full">
                    {jobsByStatus.in_progress.length}
                  </span>
                </div>
              </div>
              <div className="flex-1 p-3 space-y-3 overflow-y-auto min-h-[200px]">
                {jobsByStatus.in_progress.length === 0 ? (
                  <div className="text-center py-8 text-graystone-400 text-sm">
                    {dragOverColumn === 'in_progress' ? 'Drop here' : 'No tasks'}
                  </div>
                ) : (
                  jobsByStatus.in_progress.map(job => (
                    <JobCard
                      key={job.id}
                      job={job}
                      onClick={setSelectedJob}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      userProfiles={userProfiles}
                      onComplete={() => handleCompleteJob(job.id)}
                      isDragging={!!draggedJob}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Uncategorized To Do — spans 3 cols in the second row */}
            <div
              className={cx(
                "flex flex-col rounded-xl border transition-colors min-w-0 col-span-3",
                dragOverPriority === 'none' ? "border-dashed border-ocean-400 bg-ocean-50" : "border-graystone-200 bg-graystone-50/50"
              )}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOverPriority('none'); setDragOverColumn('todo'); }}
              onDrop={(e) => handleDropOnPriority(e, 'none')}
            >
              <div className="p-3 border-b border-graystone-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-graystone-400" />
                    <span className="font-semibold text-graystone-800 text-sm">To Do</span>
                    <span className="text-xs text-graystone-500">— no priority assigned</span>
                  </div>
                  <span className="text-xs text-graystone-500 bg-graystone-200 px-2 py-0.5 rounded-full">
                    {jobsByStatus.todo.filter(j => getJobPriority(j) === 'none').length}
                  </span>
                </div>
              </div>
              <div className="p-3 overflow-y-auto min-h-[80px]" onDragOver={(e) => e.preventDefault()}>
                <div className="flex flex-wrap gap-2">
                  {jobsByStatus.todo.filter(j => getJobPriority(j) === 'none').map(job => (
                    <div key={job.id} className={cx("w-56", !!draggedJob && "pointer-events-none")}>
                      <JobCard
                        job={job}
                        onClick={setSelectedJob}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        userProfiles={userProfiles}
                        onComplete={() => handleCompleteJob(job.id)}
                        isDragging={!!draggedJob}
                      />
                    </div>
                  ))}
                  {jobsByStatus.todo.filter(j => getJobPriority(j) === 'none').length === 0 && (
                    <p className="text-xs text-graystone-400 py-2">
                      {dragOverPriority === 'none' ? 'Drop here to remove priority' : 'All tasks have been prioritised'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Complete drop zone - shown when dragging */}
          <div
            className={cx(
              "rounded-xl border-2 border-dashed transition-all",
              draggedJob
                ? dragOverColumn === 'done'
                  ? "border-green-500 bg-green-50 py-6"
                  : "border-graystone-300 bg-graystone-50 py-4"
                : "hidden"
            )}
            onDragOver={(e) => { e.preventDefault(); setDragOverColumn('done'); }}
            onDrop={(e) => {
              e.preventDefault();
              if (draggedJob) {
                handleCompleteJob(draggedJob.id);
              }
              setDraggedJob(null);
              setDragOverColumn(null);
            }}
          >
            <div className="flex items-center justify-center gap-2 text-green-600">
              <Icon name="check-circle" className="w-5 h-5" />
              <span className="font-medium">Drop here to complete</span>
            </div>
          </div>
        </div>
      </div>

      {/* Add Job Modal */}
      <AddJobModal
        show={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleCreateJob}
        userProfiles={userProfiles}
        teams={teams}
        currentUser={currentUser}
        userEmail={userEmail}
      />

      {/* Job Detail Modal */}
      <JobDetailModal
        job={selectedJob}
        show={!!selectedJob}
        onClose={() => setSelectedJob(null)}
        onUpdate={handleUpdateJob}
        onDelete={handleDeleteJob}
        onPromote={handlePromoteToProject}
        userProfiles={userProfiles}
        teams={teams}
        userEmail={userEmail}
        currentUser={currentUser}
        onNavigateToWhiteboard={onNavigateToWhiteboard}
        WhiteboardPreviewCard={WhiteboardPreviewCard}
        WHITEBOARD_API={WHITEBOARD_API}
      />
    </div>
  );
};

export default JobsView;
