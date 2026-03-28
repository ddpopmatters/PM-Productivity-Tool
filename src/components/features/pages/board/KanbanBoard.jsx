import React, { useMemo, useState } from 'react';
import clsx from 'clsx';
import RequestCard from '../requests/RequestCard';

const STATUS_ORDER = [
  'submitted',
  'needs_more_info',
  'approved',
  'in_progress',
  'revision_1',
  'revision_2',
  'live',
];

const STATUS_LABELS = {
  submitted: 'Submitted',
  needs_more_info: 'Needs more info',
  approved: 'Approved',
  in_progress: 'In progress',
  revision_1: 'Revision 1',
  revision_2: 'Revision 2',
  live: 'Live',
};

function canMoveToStatus(request, newStatus) {
  switch (request?.status) {
    case 'submitted':
      return ['approved', 'needs_more_info'].includes(newStatus);
    case 'needs_more_info':
      return newStatus === 'approved';
    case 'approved':
      return newStatus === 'in_progress';
    case 'in_progress':
      return newStatus === 'revision_1';
    case 'revision_1':
      return Number(request?.revision_rounds_agreed) === 3
        ? newStatus === 'revision_2'
        : newStatus === 'live';
    case 'revision_2':
      return newStatus === 'live';
    default:
      return false;
  }
}

export default function KanbanBoard({ requests, pagesRole, onSelectRequest, onStatusChange }) {
  const [draggedRequest, setDraggedRequest] = useState(null);
  const [dragOverStatus, setDragOverStatus] = useState('');
  const isBuilder = pagesRole === 'builder';

  const requestsByStatus = useMemo(
    () =>
      STATUS_ORDER.reduce((accumulator, status) => {
        accumulator[status] = (requests || []).filter((request) => (request.status || 'submitted') === status);
        return accumulator;
      }, {}),
    [requests]
  );

  const handleDrop = async (status) => {
    if (!draggedRequest || !canMoveToStatus(draggedRequest, status)) {
      setDraggedRequest(null);
      setDragOverStatus('');
      return;
    }

    await onStatusChange?.(draggedRequest.id, status);
    setDraggedRequest(null);
    setDragOverStatus('');
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-graystone-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-ocean-900 dark:text-slate-100">Pages workflow</h2>
        <p className="mt-1 text-sm text-graystone-700 dark:text-slate-300">
          Track every request from submission through revision rounds and launch.
        </p>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max gap-4">
          {STATUS_ORDER.map((status) => {
            const columnRequests = requestsByStatus[status] || [];
            const canDropHere = isBuilder && draggedRequest && canMoveToStatus(draggedRequest, status);

            return (
              <div
                key={status}
                className="w-[320px] shrink-0"
                onDragOver={(event) => {
                  if (!canDropHere) return;
                  event.preventDefault();
                  setDragOverStatus(status);
                }}
                onDragLeave={() => {
                  if (dragOverStatus === status) setDragOverStatus('');
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  handleDrop(status);
                }}
              >
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-ocean-900 dark:text-slate-100">
                    {STATUS_LABELS[status]}
                  </h3>
                  <span className="inline-flex items-center rounded-full bg-graystone-100 px-2 py-0.5 text-xs font-medium text-graystone-700 dark:bg-slate-800 dark:text-slate-300">
                    {columnRequests.length}
                  </span>
                </div>

                <div
                  className={clsx(
                    'min-h-[240px] rounded-xl border border-graystone-200 bg-graystone-50/70 p-3 transition-colors dark:border-slate-700 dark:bg-slate-950/50',
                    dragOverStatus === status && canDropHere && 'border-dashed border-aqua-500 bg-aqua-50 dark:bg-aqua-500/10'
                  )}
                >
                  {columnRequests.length === 0 ? (
                    <div className="flex min-h-[180px] items-center justify-center rounded-xl border border-dashed border-graystone-300 text-center dark:border-slate-600">
                      <p className="px-6 text-sm text-graystone-500 dark:text-slate-400">Nothing here</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {columnRequests.map((request) => (
                        <div
                          key={request.id}
                          draggable={isBuilder}
                          onDragStart={() => setDraggedRequest(request)}
                          onDragEnd={() => {
                            setDraggedRequest(null);
                            setDragOverStatus('');
                          }}
                          className={clsx(isBuilder && 'cursor-grab active:cursor-grabbing')}
                        >
                          <RequestCard request={request} onClick={onSelectRequest} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
