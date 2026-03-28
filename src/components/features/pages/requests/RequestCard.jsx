import React from 'react';
import clsx from 'clsx';
import { CalendarDays, Mail } from 'lucide-react';
import PageTypeBadge from '../ui/PageTypeBadge';
import StatusBadge from '../ui/StatusBadge';

function formatDate(dateValue) {
  if (!dateValue) return 'Date to confirm';
  return new Date(`${dateValue}T00:00:00`).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getTodayString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = `${today.getMonth() + 1}`.padStart(2, '0');
  const day = `${today.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function RequestCard({ request, onClick }) {
  const pendingAmendmentCount =
    request?.pending_amendment_count ??
    request?.pendingAmendmentCount ??
    request?.amendment_count ??
    request?.amendmentCount ??
    0;

  const isOverdue =
    Boolean(request?.go_live_date) &&
    request.go_live_date < getTodayString() &&
    !['live', 'archived'].includes(request?.status);

  return (
    <button
      type="button"
      onClick={() => onClick?.(request)}
      className={clsx(
        'w-full rounded-xl border border-graystone-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900',
        isOverdue && 'border-l-4 border-l-rose-500'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <PageTypeBadge type={request?.page_type} />
            <StatusBadge status={request?.status} />
          </div>
          <h3 className="text-base font-semibold text-ocean-900 dark:text-slate-100">
            {request?.title || 'Untitled request'}
          </h3>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-graystone-700 dark:text-slate-300">
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="h-4 w-4 text-aqua-500" />
          {formatDate(request?.go_live_date)}
        </span>
        <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
          <Mail className="h-4 w-4 shrink-0 text-aqua-500" />
          <span className="truncate">{request?.requester_email || 'Requester email unavailable'}</span>
        </span>
      </div>

      {pendingAmendmentCount > 0 && (
        <div className="mt-3">
          <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
            {pendingAmendmentCount} amendment{pendingAmendmentCount === 1 ? '' : 's'} pending
          </span>
        </div>
      )}
    </button>
  );
}
