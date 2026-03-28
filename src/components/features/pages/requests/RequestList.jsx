import React from 'react';
import { Plus } from 'lucide-react';
import RequestCard from './RequestCard';

function formatDate(dateValue) {
  if (!dateValue) return 'Recently created';
  return new Date(dateValue).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function RequestList({ requests, onSelectRequest, onNewRequest }) {
  if (!requests?.length) {
    return (
      <div className="rounded-xl border border-graystone-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-xl font-semibold text-ocean-900 dark:text-slate-100">Start your first page brief</h2>
        <p className="mt-2 text-sm text-graystone-700 dark:text-slate-300">
          Capture the key details once and keep revisions, approvals, and launch dates in one place.
        </p>
        <button
          type="button"
          onClick={onNewRequest}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-ocean-600 px-4 py-2 text-white transition-colors hover:bg-ocean-700"
        >
          <Plus className="h-4 w-4" />
          New request
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <div key={request.id} className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-medium text-graystone-600 dark:text-slate-400">
              Updated {formatDate(request.updated_at || request.created_at)}
            </p>
          </div>
          <RequestCard request={request} onClick={onSelectRequest} />
        </div>
      ))}
    </div>
  );
}
