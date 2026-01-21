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
  JobCard,
  AddJobModal,
  JobDetailModal,
  WhiteboardPreviewCard,
  WHITEBOARD_API
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'mine'
  const [draggedJob, setDraggedJob] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  // Filter only jobs from entries
  const jobs = entries.filter(e => e.itemType === 'job' && !e.archived);

  // Apply user filter
  const filteredJobs = filter === 'mine'
    ? jobs.filter(j => j.owner === currentUser || j.ownerEmail === userEmail)
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
      <div className="p-6 border-b border-graystone-200 dark:border-graystone-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-ocean-900 dark:text-white">Jobs</h1>
            <p className="text-sm text-graystone-600 dark:text-graystone-400">Quick tasks that don't need full project tracking</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 transition-colors"
          >
            <Icon name="plus" className="w-4 h-4" />
            Add Job
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={cx(
              "px-3 py-1.5 text-sm rounded-lg transition-colors",
              filter === 'all' ? "bg-ocean-100 text-ocean-700" : "text-graystone-600 hover:bg-graystone-100"
            )}
          >
            All Jobs ({jobs.length})
          </button>
          <button
            onClick={() => setFilter('mine')}
            className={cx(
              "px-3 py-1.5 text-sm rounded-lg transition-colors",
              filter === 'mine' ? "bg-ocean-100 text-ocean-700" : "text-graystone-600 hover:bg-graystone-100"
            )}
          >
            My Jobs ({jobs.filter(j => j.owner === currentUser || j.ownerEmail === userEmail).length})
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-6">
        <div className="flex gap-4 min-w-max h-full">
          {JOB_STATUSES.map(status => (
            <div
              key={status.id}
              className={cx(
                "w-80 flex flex-col rounded-xl border transition-colors",
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
