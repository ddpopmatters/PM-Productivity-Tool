import React from 'react';
import clsx from 'clsx';

/**
 * JobCard - Draggable card component for jobs
 *
 * @param {Object} job - Job object with title, tags, date, owner, workflowStatus
 * @param {function} onClick - Called with job when card is clicked
 * @param {function} onDragStart - Called with (event, job) when drag starts
 * @param {function} onDragEnd - Called when drag ends
 * @param {Object} userProfiles - Map of user profiles for avatars
 */
function JobCard({ job, onClick, onDragStart, onDragEnd, userProfiles }) {
  const priorityColors = {
    high: 'bg-red-100 text-red-700 border-red-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    low: 'bg-green-100 text-green-700 border-green-200'
  };

  const priority = job.tags?.find(t => ['high', 'medium', 'low'].includes(t?.toLowerCase?.()))?.toLowerCase() || null;

  const dueDate = job.date || job.timelineValue;
  const isOverdue = dueDate && new Date(dueDate) < new Date() && job.workflowStatus !== 'done';
  const isDueSoon = dueDate && !isOverdue && new Date(dueDate) <= new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, job)}
      onDragEnd={onDragEnd}
      onClick={() => onClick(job)}
      className={clsx(
        "p-3 bg-white rounded-lg border shadow-sm cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5",
        isOverdue ? "border-red-300" : isDueSoon ? "border-amber-300" : "border-graystone-200"
      )}
    >
      <div className="font-medium text-sm text-graystone-800 mb-2 line-clamp-2">
        {job.title}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {/* Owner */}
        {job.owner && (
          <span className="text-xs text-graystone-500 flex items-center gap-1">
            <i data-lucide="user" className="w-3 h-3"></i>
            {job.owner.split(' ')[0]}
          </span>
        )}

        {/* Due date */}
        {dueDate && (
          <span className={clsx(
            "text-xs flex items-center gap-1 px-1.5 py-0.5 rounded",
            isOverdue ? "bg-red-100 text-red-700" :
            isDueSoon ? "bg-amber-100 text-amber-700" :
            "text-graystone-500"
          )}>
            <i data-lucide="calendar" className="w-3 h-3"></i>
            {new Date(dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </span>
        )}

        {/* Priority */}
        {priority && (
          <span className={clsx("text-xs px-1.5 py-0.5 rounded border", priorityColors[priority])}>
            {priority.charAt(0).toUpperCase() + priority.slice(1)}
          </span>
        )}
      </div>

      {/* Tags (excluding priority) */}
      {job.tags?.filter(t => !['high', 'medium', 'low'].includes(t?.toLowerCase?.())).length > 0 && (
        <div className="flex gap-1 mt-2 flex-wrap">
          {job.tags.filter(t => !['high', 'medium', 'low'].includes(t?.toLowerCase?.())).slice(0, 3).map((tag, i) => (
            <span key={i} className="text-xs px-1.5 py-0.5 bg-ocean-50 text-ocean-700 rounded">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default JobCard;
