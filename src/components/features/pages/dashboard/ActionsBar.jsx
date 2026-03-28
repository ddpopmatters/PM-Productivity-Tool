import React, { useState } from 'react';
import {
  appendStatusHistory,
  raiseAmendment,
  updateRequestStatus,
} from '../../../../services/landingPageRequests';
import RevisionFeedbackForm from '../forms/RevisionFeedbackForm';
import {
  getCurrentRound,
  getNextStatusAction,
  getStatusUpdateFields,
} from './dashboardUtils';

export default function ActionsBar({ request, pagesRole, userId, onUpdated, onStatusChange }) {
  const [pendingStatus, setPendingStatus] = useState('');
  const [actionError, setActionError] = useState('');
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [amendmentOpen, setAmendmentOpen] = useState(false);
  const [amendmentText, setAmendmentText] = useState('');
  const [amendmentState, setAmendmentState] = useState('idle');

  const nextAction = getNextStatusAction(request);
  const currentRound = getCurrentRound(request?.status);
  const canApprove = ['submitted', 'pending_review'].includes(request?.status);
  const canSubmitFeedback = pagesRole === 'requester' && Boolean(currentRound);
  const canRequestAmendment = pagesRole === 'requester' && Boolean(request?.brief_locked_at);

  const handleStatusChange = async (newStatus) => {
    setPendingStatus(newStatus);
    setActionError('');

    const updated = await updateRequestStatus(
      request.id,
      newStatus,
      getStatusUpdateFields(request, newStatus)
    );

    if (!updated) {
      setActionError('We could not update this request status.');
      setPendingStatus('');
      return false;
    }

    const historyUpdated = await appendStatusHistory(request.id, newStatus, userId);
    const nextRequest = historyUpdated || updated;

    await onUpdated?.(nextRequest);
    await onStatusChange?.(newStatus, nextRequest);
    setPendingStatus('');
    return true;
  };

  const handleScrollToPageUrl = () => {
    const input = document.getElementById('request-page-url');
    if (!input) return;

    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    input.focus();
  };

  const handleAmendmentSubmit = async (event) => {
    event.preventDefault();

    if (!userId) {
      setActionError('Your account details are missing, so the amendment cannot be submitted yet.');
      return;
    }

    if (!amendmentText.trim()) {
      setActionError('Add a reason for the amendment request.');
      return;
    }

    setActionError('');
    setAmendmentState('submitting');

    const created = await raiseAmendment(request.id, amendmentText.trim(), userId);

    if (!created) {
      setActionError('We could not submit that amendment request.');
      setAmendmentState('idle');
      return;
    }

    setAmendmentText('');
    setAmendmentOpen(false);
    setAmendmentState('idle');
    await onUpdated?.(created);
  };

  return (
    <div className="sticky bottom-0 z-20 border-t border-graystone-200 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="mx-auto w-full max-w-7xl">
        {feedbackOpen && canSubmitFeedback && (
          <div className="mb-4">
            <RevisionFeedbackForm
              requestId={request.id}
              roundNumber={currentRound}
              createdBy={userId}
              onSubmitted={async () => {
                setFeedbackOpen(false);
                await onUpdated?.();
              }}
            />
          </div>
        )}

        {amendmentOpen && canRequestAmendment && (
          <div className="mb-4 rounded-xl border border-graystone-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-950">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-ocean-900 dark:text-slate-100">Request amendment</h3>
                <p className="mt-1 text-sm text-graystone-700 dark:text-slate-300">
                  Explain what needs to change now that the brief is locked.
                </p>
              </div>
            </div>

            <form onSubmit={handleAmendmentSubmit} className="mt-4 space-y-3">
              <textarea
                value={amendmentText}
                onChange={(event) => setAmendmentText(event.target.value)}
                rows={4}
                className="w-full rounded-lg border border-graystone-300 px-3 py-2 text-sm text-graystone-800 outline-none transition focus:border-ocean-600 focus:ring-2 focus:ring-ocean-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-ocean-500/20"
                placeholder="Explain what needs to change and why."
              />
              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setAmendmentOpen(false);
                    setAmendmentText('');
                    setActionError('');
                  }}
                  className="rounded-lg border border-graystone-300 px-4 py-2 text-graystone-700 transition-colors hover:bg-graystone-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={amendmentState === 'submitting'}
                  className="rounded-lg bg-ocean-600 px-4 py-2 text-white transition-colors hover:bg-ocean-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {amendmentState === 'submitting' ? 'Submitting…' : 'Send amendment'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-ocean-900 dark:text-slate-100">Next actions</p>
            <p className="text-sm text-graystone-700 dark:text-slate-300">
              Actions are scoped to your Pages role and the current request stage.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {pagesRole === 'builder' && nextAction && (
              <button
                type="button"
                disabled={pendingStatus === nextAction.status}
                onClick={() => handleStatusChange(nextAction.status)}
                className="rounded-lg bg-ocean-600 px-4 py-2 text-white transition-colors hover:bg-ocean-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pendingStatus === nextAction.status ? 'Updating…' : `Move to ${nextAction.label}`}
              </button>
            )}

            {pagesRole === 'builder' && !request?.page_url && (
              <button
                type="button"
                onClick={handleScrollToPageUrl}
                className="rounded-lg border border-graystone-300 px-4 py-2 text-graystone-700 transition-colors hover:bg-graystone-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Add page URL
              </button>
            )}

            {pagesRole === 'approver' && canApprove && (
              <>
                <button
                  type="button"
                  disabled={pendingStatus === 'approved'}
                  onClick={() => handleStatusChange('approved')}
                  className="rounded-lg bg-ocean-600 px-4 py-2 text-white transition-colors hover:bg-ocean-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pendingStatus === 'approved' ? 'Updating…' : 'Approve'}
                </button>
                <button
                  type="button"
                  disabled={pendingStatus === 'needs_more_info'}
                  onClick={() => handleStatusChange('needs_more_info')}
                  className="rounded-lg border border-graystone-300 px-4 py-2 text-graystone-700 transition-colors hover:bg-graystone-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {pendingStatus === 'needs_more_info' ? 'Updating…' : 'Request changes'}
                </button>
              </>
            )}

            {pagesRole === 'requester' && canSubmitFeedback && (
              <button
                type="button"
                onClick={() => {
                  setFeedbackOpen((current) => !current);
                  if (amendmentOpen) setAmendmentOpen(false);
                  setActionError('');
                }}
                className="rounded-lg bg-ocean-600 px-4 py-2 text-white transition-colors hover:bg-ocean-700"
              >
                {feedbackOpen ? 'Hide feedback form' : 'Submit feedback'}
              </button>
            )}

            {pagesRole === 'requester' && canRequestAmendment && (
              <button
                type="button"
                onClick={() => {
                  setAmendmentOpen((current) => !current);
                  if (feedbackOpen) setFeedbackOpen(false);
                  setActionError('');
                }}
                className="rounded-lg border border-graystone-300 px-4 py-2 text-graystone-700 transition-colors hover:bg-graystone-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {amendmentOpen ? 'Hide amendment form' : 'Request amendment'}
              </button>
            )}
          </div>
        </div>

        {actionError && <p className="mt-3 text-sm text-rose-600 dark:text-rose-300">{actionError}</p>}
      </div>
    </div>
  );
}
