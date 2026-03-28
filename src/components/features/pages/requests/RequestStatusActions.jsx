import React, { useState } from 'react';

function getActions(request) {
  switch (request?.status) {
    case 'submitted':
      return [
        { label: 'Approve', status: 'approved', variant: 'primary' },
        { label: 'Request more info', status: 'needs_more_info', variant: 'secondary' },
      ];
    case 'needs_more_info':
      return [{ label: 'Approve', status: 'approved', variant: 'primary' }];
    case 'approved':
      return [{ label: 'Start build', status: 'in_progress', variant: 'primary' }];
    case 'in_progress':
      return [{ label: 'Send for revision 1', status: 'revision_1', variant: 'primary' }];
    case 'revision_1':
      return Number(request?.revision_rounds_agreed) === 3
        ? [{ label: 'Open revision 2', status: 'revision_2', variant: 'primary' }]
        : [{ label: 'Mark live', status: 'live', variant: 'primary' }];
    case 'revision_2':
      return [{ label: 'Mark live', status: 'live', variant: 'primary' }];
    case 'live':
      return [{ label: 'Archive', status: 'archived', variant: 'secondary' }];
    default:
      return [];
  }
}

export default function RequestStatusActions({ request, pagesRole, onStatusChange }) {
  const [pendingStatus, setPendingStatus] = useState(null);

  if (pagesRole !== 'builder') {
    return null;
  }

  const actions = getActions(request);

  if (!actions.length) {
    return (
      <div className="rounded-xl border border-graystone-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h3 className="text-sm font-semibold text-ocean-900 dark:text-slate-100">Builder actions</h3>
        <p className="mt-2 text-sm text-graystone-700 dark:text-slate-300">
          This request has reached the end of its workflow.
        </p>
      </div>
    );
  }

  const handleAction = async (newStatus) => {
    setPendingStatus(newStatus);
    try {
      await onStatusChange?.(request.id, newStatus);
    } finally {
      setPendingStatus(null);
    }
  };

  return (
    <div className="rounded-xl border border-graystone-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h3 className="text-sm font-semibold text-ocean-900 dark:text-slate-100">Builder actions</h3>
      <p className="mt-2 text-sm text-graystone-700 dark:text-slate-300">
        Move the request to the next valid status based on the current brief and review round.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        {actions.map((action) => (
          <button
            key={action.status}
            type="button"
            disabled={pendingStatus === action.status}
            onClick={() => handleAction(action.status)}
            className={
              action.variant === 'primary'
                ? 'rounded-lg bg-ocean-600 px-4 py-2 text-white transition-colors hover:bg-ocean-700 disabled:cursor-not-allowed disabled:opacity-60'
                : 'rounded-lg border border-graystone-300 px-4 py-2 text-graystone-700 transition-colors hover:bg-graystone-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800'
            }
          >
            {pendingStatus === action.status ? 'Updating…' : action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
