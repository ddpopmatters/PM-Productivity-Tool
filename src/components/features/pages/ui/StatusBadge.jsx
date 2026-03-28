import React from 'react';
import clsx from 'clsx';

const STATUS_STYLES = {
  submitted: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  pending_review: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  needs_more_info: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  approved: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
  in_progress: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
  first_draft: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
  revision_1: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
  revision_2: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
  live: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  archived: 'bg-graystone-100 text-graystone-700 dark:bg-slate-800 dark:text-slate-300',
};

const STATUS_LABELS = {
  submitted: 'Submitted',
  pending_review: 'Awaiting review',
  needs_more_info: 'Needs more info',
  approved: 'Approved',
  in_progress: 'In progress',
  first_draft: 'First draft',
  revision_1: 'Revision 1',
  revision_2: 'Revision 2',
  live: 'Live',
  archived: 'Archived',
};

export default function StatusBadge({ status }) {
  const safeStatus = status || 'submitted';
  const label = STATUS_LABELS[safeStatus] || 'Submitted';

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        STATUS_STYLES[safeStatus] || STATUS_STYLES.submitted
      )}
    >
      {label}
    </span>
  );
}
