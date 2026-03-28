import React, { useMemo } from 'react';
import clsx from 'clsx';
import {
  formatRelativeDate,
  getFeedbackTypeLabel,
  getStatusLabel,
} from './dashboardUtils';

function getDotClasses(type) {
  switch (type) {
    case 'created':
      return 'bg-sky-500';
    case 'locked':
      return 'bg-amber-500';
    case 'feedback':
      return 'bg-orange-500';
    default:
      return 'bg-ocean-500';
  }
}

export default function ActivityFeed({ request, feedbackItems }) {
  const entries = useMemo(() => {
    const nextEntries = [
      {
        id: 'created',
        type: 'created',
        date: request?.created_at,
        label: 'Request submitted',
      },
    ];

    if (request?.brief_locked_at) {
      nextEntries.push({
        id: 'locked',
        type: 'locked',
        date: request.brief_locked_at,
        label: 'Brief locked',
      });
    }

    (request?.status_history || []).forEach((entry, index) => {
      nextEntries.push({
        id: `status-${index}-${entry.changed_at}`,
        type: 'status',
        date: entry.changed_at,
        label: `Status → ${getStatusLabel(entry.status)}`,
      });
    });

    (feedbackItems || []).forEach((feedback) => {
      nextEntries.push({
        id: feedback.id,
        type: 'feedback',
        date: feedback.created_at,
        label: `Round ${feedback.round_number} feedback: ${getFeedbackTypeLabel(feedback.feedback_type)}`,
        description: feedback.description,
      });
    });

    return nextEntries
      .filter((entry) => entry.date)
      .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
  }, [feedbackItems, request]);

  return (
    <div className="rounded-xl border border-graystone-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h2 className="text-base font-semibold text-ocean-900 dark:text-slate-100">Activity</h2>

      <div className="mt-4 space-y-4">
        {entries.map((entry) => (
          <div key={entry.id} className="flex items-start gap-3">
            <span className={clsx('mt-1.5 h-3 w-3 rounded-full', getDotClasses(entry.type))} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-ocean-900 dark:text-slate-100">{entry.label}</p>
                <p className="text-xs text-graystone-600 dark:text-slate-400">{formatRelativeDate(entry.date)}</p>
              </div>
              {entry.description && (
                <p className="mt-2 whitespace-pre-wrap text-sm text-graystone-700 dark:text-slate-300">
                  {entry.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
