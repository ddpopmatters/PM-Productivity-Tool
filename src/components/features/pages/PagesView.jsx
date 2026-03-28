import React, { useState } from 'react';
import { LayoutTemplate, Plus, X } from 'lucide-react';
import { LoadingSpinner } from '../../ui';
import { useLandingPageRequests } from '../../../hooks/useLandingPageRequests';
import { updateRequestStatus } from '../../../services/landingPageRequests';
import KanbanBoard from './board/KanbanBoard';
import NewRequestForm from './forms/NewRequestForm';
import RequestList from './requests/RequestList';

const LOCKED_STATUSES = new Set(['approved', 'in_progress', 'revision_1', 'revision_2', 'live']);

function getStatusUpdateFields(request, newStatus) {
  if (newStatus === 'needs_more_info') {
    return { brief_locked_at: null };
  }

  if (LOCKED_STATUSES.has(newStatus) && !request?.brief_locked_at) {
    return { brief_locked_at: new Date().toISOString() };
  }

  return {};
}

function getErrorMessage(error) {
  if (!error) return 'We could not load the Pages Hub right now.';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  return 'We could not load the Pages Hub right now.';
}

function getRoleLabel(role) {
  switch (role) {
    case 'builder':
      return 'Builder view';
    case 'approver':
      return 'Approver view';
    default:
      return 'Requester view';
  }
}

export default function PagesView({ pagesRole, userId, userEmail, currentUser, onOpenRequest }) {
  const { requests, loading, error, refetch } = useLandingPageRequests(pagesRole, userId);
  const [panelState, setPanelState] = useState(null);

  const handleStatusChange = async (requestId, newStatus) => {
    const targetRequest = requests.find((request) => request.id === requestId);
    const updated = await updateRequestStatus(
      requestId,
      newStatus,
      getStatusUpdateFields(targetRequest, newStatus)
    );

    if (!updated) {
      return false;
    }

    await refetch();

    if (newStatus === 'archived') {
      setPanelState(null);
    }

    return true;
  };

  const openNewRequest = () => setPanelState({ type: 'new' });
  const openRequest = (request) => onOpenRequest?.(request.id);
  const closePanel = () => setPanelState(null);

  if (!pagesRole) {
    return (
      <div className="rounded-xl border border-graystone-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-xl font-semibold text-ocean-900 dark:text-slate-100">Pages Hub unavailable</h2>
        <p className="mt-2 text-sm text-graystone-700 dark:text-slate-300">
          A Pages role is required before requests can be shown.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-graystone-200 bg-white p-10 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <LoadingSpinner text="Loading requests…" className="min-h-[180px]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-graystone-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-xl font-semibold text-ocean-900 dark:text-slate-100">Pages Hub error</h2>
        <p className="mt-2 text-sm text-graystone-700 dark:text-slate-300">{getErrorMessage(error)}</p>
        <button
          type="button"
          onClick={refetch}
          className="mt-5 rounded-lg bg-ocean-600 px-4 py-2 text-white transition-colors hover:bg-ocean-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const isRequester = pagesRole === 'requester';

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-graystone-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-ocean-100 p-3 text-ocean-700 dark:bg-ocean-500/15 dark:text-ocean-200">
              <LayoutTemplate className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-aqua-600 dark:text-aqua-300">{getRoleLabel(pagesRole)}</p>
              <h1 className="text-2xl font-semibold text-ocean-900 dark:text-slate-100">Pages Hub</h1>
              <p className="mt-1 text-sm text-graystone-700 dark:text-slate-300">
                {isRequester
                  ? 'Create a landing page brief, track progress, and submit revision feedback from one view.'
                  : 'Review the pipeline, move requests through the workflow, and keep launch dates on track.'}
              </p>
              <p className="mt-2 text-xs text-graystone-500 dark:text-slate-400">
                Signed in as {currentUser || userEmail || 'Unknown user'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openNewRequest}
            className="inline-flex items-center gap-2 rounded-lg bg-ocean-600 px-4 py-2 text-white transition-colors hover:bg-ocean-700"
          >
            <Plus className="h-4 w-4" />
            New request
          </button>
        </div>
      </div>

      {isRequester ? (
        <RequestList requests={requests} onSelectRequest={openRequest} onNewRequest={openNewRequest} />
      ) : (
        <>
          <KanbanBoard
            requests={requests}
            pagesRole={pagesRole}
            onSelectRequest={openRequest}
            onStatusChange={handleStatusChange}
          />
          {(() => {
            const myRequests = requests.filter(r => r.requester_email === userEmail);
            if (!myRequests.length) return null;
            return (
              <div>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-graystone-500 dark:text-slate-400">Your requests</h2>
                <RequestList requests={myRequests} onSelectRequest={openRequest} onNewRequest={openNewRequest} />
              </div>
            );
          })()}
        </>
      )}

      {panelState?.type === 'new' && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close panel"
            onClick={closePanel}
            className="absolute inset-0 bg-graystone-900/45 backdrop-blur-sm"
          />

          <div className="absolute left-1/2 top-1/2 flex max-h-[90vh] w-full max-w-[560px] -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-graystone-200 bg-graystone-50 shadow-2xl dark:border-slate-700 dark:bg-slate-950">
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex items-start justify-between gap-4 border-b border-graystone-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                <div>
                  <h2 className="text-xl font-semibold text-ocean-900 dark:text-slate-100">New request</h2>
                  <p className="mt-1 text-sm text-graystone-700 dark:text-slate-300">
                    Capture the full brief before it enters the Pages workflow.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closePanel}
                  className="rounded-full p-2 text-graystone-500 transition-colors hover:bg-graystone-100 hover:text-ocean-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                <NewRequestForm
                  userId={userId}
                  userEmail={userEmail}
                  onSubmitted={async () => {
                    await refetch();
                    closePanel();
                  }}
                  onCancel={closePanel}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
