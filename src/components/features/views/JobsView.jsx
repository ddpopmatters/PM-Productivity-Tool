import React, { useState, useEffect } from 'react';
import Icon from '../../ui/Icon';
import AddJobModal from '../overlays/AddJobModal';
import JobDetailModal from '../overlays/JobDetailModal';
import JobCard from '../cards/JobCard';

// Local utility for conditional class names
const cx = (...args) => args.filter(Boolean).join(' ');

// Job status configuration
const JOB_STATUSES = [
  { id: 'todo', label: 'To Do', color: 'gray' },
  { id: 'in_progress', label: 'In Progress', color: 'blue' },
  { id: 'done', label: 'Done', color: 'green' }
];

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
  const [filter, setFilter] = useState('all'); // 'all', 'mine', 'assigned'
  const [draggedJob, setDraggedJob] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  // Filter only jobs from entries
  const jobs = entries.filter(e => e.itemType === 'job' && !e.archived);

  // Helper filters
  const myJobs = jobs.filter(j => j.owner === currentUser || j.ownerEmail === userEmail);
  const assignedToMe = jobs.filter(j => j.owner !== currentUser && j.ownerEmail !== userEmail && j.collaborators?.includes(currentUser));

  // Apply user filter
  const filteredJobs = filter === 'mine'
    ? myJobs
    : filter === 'assigned'
    ? assignedToMe
    : jobs;

  // Group by status
  const jobsByStatus = {
    todo: filteredJobs.filter(j => j.workflowStatus === 'todo'),
    in_progress: filteredJobs.filter(j => j.workflowStatus === 'in_progress'),
    done: filteredJobs.filter(j => j.workflowStatus === 'done')
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
      owner: jobData.owner,
      owner_email: jobData.ownerEmail,
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
      owner: updatedJob.owner,
      owner_email: updatedJob.ownerEmail,
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

  // Drag and drop handlers
  const handleDragStart = (e, job) => {
    setDraggedJob(job);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedJob(null);
    setDragOverColumn(null);
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
        <div className="bg-gradient-to-r from-ocean-500 to-ocean-600 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Jobs</h1>
              <p className="text-ocean-100 text-sm">Quick tasks that don't need full project tracking</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors border border-white/20"
            >
              <Icon name="plus" className="w-4 h-4" />
              Add Job
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
                <p className="font-heading text-sm text-graystone-600 mb-1 tracking-wide">All Jobs</p>
                <p className="text-3xl font-bold text-ocean-900">{jobs.length}</p>
              </div>
              <div className="w-12 h-12 bg-ocean-500 rounded-xl flex items-center justify-center">
                <Icon name="briefcase" className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-xs text-graystone-500 mt-2">All active jobs</p>
          </div>
          <div
            onClick={() => setFilter('mine')}
            className={cx(
              "bg-white rounded-xl p-6 border shadow-sm cursor-pointer hover:shadow-md transition-all",
              filter === 'mine' ? "border-ocean-500 ring-2 ring-ocean-200" : "border-ocean-100"
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-heading text-sm text-graystone-600 mb-1 tracking-wide">My Jobs</p>
                <p className="text-3xl font-bold text-ocean-900">{myJobs.length}</p>
              </div>
              <div className="w-12 h-12 bg-ocean-500 rounded-xl flex items-center justify-center">
                <Icon name="user" className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-xs text-graystone-500 mt-2">Jobs you created</p>
          </div>
          <div
            onClick={() => setFilter('assigned')}
            className={cx(
              "bg-white rounded-xl p-6 border shadow-sm cursor-pointer hover:shadow-md transition-all",
              filter === 'assigned' ? "border-ocean-500 ring-2 ring-ocean-200" : "border-ocean-100"
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
            <p className="text-xs text-graystone-500 mt-2">Jobs assigned by others</p>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-hidden p-6">
        <div className="grid grid-cols-3 gap-4 h-full">
          {JOB_STATUSES.map(status => (
            <div
              key={status.id}
              className={cx(
                "flex flex-col rounded-xl border transition-colors min-w-0",
                dragOverColumn === status.id ? "border-ocean-400 bg-ocean-50" : "border-graystone-200 bg-graystone-50/50"
              )}
              onDragOver={(e) => handleDragOver(e, status.id)}
              onDrop={(e) => handleDrop(e, status.id)}
            >
              {/* Column Header */}
              <div className="p-4 border-b border-graystone-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cx(
                      "w-3 h-3 rounded-full",
                      status.color === 'green' ? "bg-green-500" :
                      status.color === 'blue' ? "bg-blue-500" :
                      "bg-graystone-400"
                    )}></div>
                    <span className="font-semibold text-graystone-800">{status.label}</span>
                  </div>
                  <span className="text-sm text-graystone-500 bg-graystone-200 px-2 py-0.5 rounded-full">
                    {jobsByStatus[status.id].length}
                  </span>
                </div>
              </div>

              {/* Cards */}
              <div className="flex-1 p-3 space-y-3 overflow-y-auto min-h-[200px]">
                {jobsByStatus[status.id].length === 0 ? (
                  <div className="text-center py-8 text-graystone-400 text-sm">
                    {dragOverColumn === status.id ? 'Drop here' : 'No jobs'}
                  </div>
                ) : (
                  jobsByStatus[status.id].map(job => (
                    <JobCard
                      key={job.id}
                      job={job}
                      onClick={setSelectedJob}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      userProfiles={userProfiles}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
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
