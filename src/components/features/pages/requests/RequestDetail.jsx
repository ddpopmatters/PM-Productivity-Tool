import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Lock, RefreshCcw, User, X } from 'lucide-react';
import {
  fetchRevisionFeedback,
  raiseAmendment,
  updateBuilderNotes,
  updateRequestStatus,
} from '../../../../services/landingPageRequests';
import RevisionFeedbackForm from '../forms/RevisionFeedbackForm';
import PageTypeBadge from '../ui/PageTypeBadge';
import StatusBadge from '../ui/StatusBadge';
import RequestTimeline from './RequestTimeline';
import RequestStatusActions from './RequestStatusActions';
import AmendmentQueue from './AmendmentQueue';

const LOCKED_STATUSES = new Set(['approved', 'in_progress', 'revision_1', 'revision_2', 'live']);

function formatDate(dateValue) {
  if (!dateValue) return 'Not set';

  const parsedDate =
    typeof dateValue === 'string' && dateValue.includes('T')
      ? new Date(dateValue)
      : new Date(`${dateValue}T00:00:00`);

  return parsedDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getStatusUpdateFields(request, newStatus) {
  if (newStatus === 'needs_more_info') {
    return { brief_locked_at: null };
  }

  if (LOCKED_STATUSES.has(newStatus) && !request?.brief_locked_at) {
    return { brief_locked_at: new Date().toISOString() };
  }

  return {};
}

function getPageGoalLabel(goal) {
  switch (goal) {
    case 'signup':
      return 'Signup';
    case 'share':
      return 'Share';
    case 'other':
      return 'Other';
    default:
      return 'Donate';
  }
}

function getAssetStatusLabel(status) {
  return status === 'owner_pending' ? 'Owner pending' : 'Attached';
}

function getFeedbackTypeLabel(type) {
  switch (type) {
    case 'copy_edit':
      return 'Copy edit';
    case 'broken_element':
      return 'Broken element';
    default:
      return 'Content change';
  }
}

function DetailItem({ label, value, fullWidth = false }) {
  return (
    <div className={fullWidth ? 'sm:col-span-2' : ''}>
      <p className="text-xs font-medium text-graystone-600 dark:text-slate-400">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-graystone-800 dark:text-slate-200">{value}</p>
    </div>
  );
}

export default function RequestDetail({ request, pagesRole, userId, onClose, onUpdated }) {
  const [feedbackItems, setFeedbackItems] = useState([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [builderNotes, setBuilderNotes] = useState(request?.builder_notes || '');
  const [notesState, setNotesState] = useState('idle');
  const [amendmentOpen, setAmendmentOpen] = useState(false);
  const [amendmentText, setAmendmentText] = useState('');
  const [amendmentState, setAmendmentState] = useState('idle');
  const [actionError, setActionError] = useState('');

  const currentRound = request?.status === 'revision_2' ? 2 : request?.status === 'revision_1' ? 1 : null;

  useEffect(() => {
    setBuilderNotes(request?.builder_notes || '');
    setNotesState('idle');
  }, [request?.builder_notes, request?.id]);

  const loadFeedback = useCallback(async () => {
    if (!request?.id) return;

    setFeedbackLoading(true);
    const data = await fetchRevisionFeedback(request.id);
    setFeedbackItems(data || []);
    setFeedbackLoading(false);
  }, [request?.id]);

  useEffect(() => {
    loadFeedback();
  }, [loadFeedback]);

  const summaryItems = useMemo(
    () => [
      { label: 'Requester', value: request?.requester_email || 'Unknown requester' },
      { label: 'Page goal', value: getPageGoalLabel(request?.page_goal) },
      { label: 'Audience', value: request?.audience || 'No audience provided', fullWidth: true },
      { label: 'Copy status', value: getAssetStatusLabel(request?.copy_status) },
      { label: 'Copy owner', value: request?.copy_owner || 'Not needed' },
      { label: 'Copy due date', value: request?.copy_due_date ? formatDate(request.copy_due_date) : 'Not needed' },
      { label: 'Asset status', value: getAssetStatusLabel(request?.asset_status) },
      { label: 'Asset owner', value: request?.asset_owner || 'Not needed' },
      { label: 'Asset due date', value: request?.asset_due_date ? formatDate(request.asset_due_date) : 'Not needed' },
      { label: 'Go-live date', value: request?.go_live_date ? formatDate(request.go_live_date) : 'Not set' },
      {
        label: 'Expedited justification',
        value: request?.expedited_justification || 'Not provided',
        fullWidth: true,
      },
      { label: 'Named approver', value: request?.named_approver || 'Not set' },
      { label: 'Revision rounds agreed', value: `${request?.revision_rounds_agreed || 2}` },
      {
        label: 'Extended rounds reason',
        value: request?.extended_rounds_reason || 'Not needed',
        fullWidth: true,
      },
    ],
    [request]
  );

  const handleStatusChange = async (requestId, newStatus) => {
    setActionError('');

    const updated = await updateRequestStatus(requestId, newStatus, getStatusUpdateFields(request, newStatus));

    if (!updated) {
      setActionError('We could not update this request status.');
      return false;
    }

    await onUpdated?.(updated);

    if (newStatus === 'archived') {
      onClose?.();
    }

    return true;
  };

  const handleNotesBlur = async () => {
    if (pagesRole !== 'builder') return;
    if ((request?.builder_notes || '') === builderNotes) return;

    setNotesState('saving');

    const updated = await updateBuilderNotes(request.id, builderNotes);

    if (!updated) {
      setNotesState('error');
      return;
    }

    await onUpdated?.(updated);
    setNotesState('saved');
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

    setAmendmentState('submitting');
    setActionError('');

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

  if (!request) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-graystone-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <PageTypeBadge type={request.page_type} />
              <StatusBadge status={request.status} />
            </div>
            <h2 className="mt-3 text-xl font-semibold text-ocean-900 dark:text-slate-100">{request.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-graystone-500 transition-colors hover:bg-graystone-100 hover:text-ocean-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            aria-label="Close request details"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-4 text-sm text-graystone-700 dark:text-slate-300">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 text-aqua-500" />
            Go live {formatDate(request.go_live_date)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <User className="h-4 w-4 text-aqua-500" />
            {request.requester_email}
          </span>
        </div>

        {request.brief_locked_at && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
            <Lock className="h-3.5 w-3.5" />
            Brief locked {formatDate(request.brief_locked_at)}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-graystone-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h3 className="text-sm font-semibold text-ocean-900 dark:text-slate-100">Brief summary</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {summaryItems.map((item) => (
            <DetailItem
              key={item.label}
              label={item.label}
              value={item.value}
              fullWidth={item.fullWidth}
            />
          ))}
        </div>
      </div>

      <RequestTimeline status={request.status} />
      <RequestStatusActions request={request} pagesRole={pagesRole} onStatusChange={handleStatusChange} />

      <div className="rounded-xl border border-graystone-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-ocean-900 dark:text-slate-100">Revision history</h3>
          <button
            type="button"
            onClick={loadFeedback}
            className="inline-flex items-center gap-2 rounded-lg border border-graystone-300 px-3 py-1.5 text-sm text-graystone-700 transition-colors hover:bg-graystone-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {feedbackLoading ? (
          <p className="mt-3 text-sm text-graystone-600 dark:text-slate-400">Loading revision feedback…</p>
        ) : feedbackItems.length === 0 ? (
          <p className="mt-3 text-sm text-graystone-700 dark:text-slate-300">
            Feedback from revision rounds will appear here once it has been submitted.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {feedbackItems.map((feedback) => (
              <div
                key={feedback.id}
                className="rounded-lg border border-graystone-200 p-3 dark:border-slate-700"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-ocean-900 dark:text-slate-100">
                    Round {feedback.round_number} · {getFeedbackTypeLabel(feedback.feedback_type)}
                  </p>
                  <span className="text-xs text-graystone-600 dark:text-slate-400">
                    {formatDate(feedback.created_at)}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-graystone-800 dark:text-slate-200">
                  {feedback.description}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {pagesRole === 'requester' && currentRound && (
        <RevisionFeedbackForm
          requestId={request.id}
          roundNumber={currentRound}
          createdBy={userId}
          onSubmitted={async () => {
            await loadFeedback();
            await onUpdated?.();
          }}
        />
      )}

      {pagesRole === 'builder' && (
        <AmendmentQueue
          requestId={request.id}
          pagesRole={pagesRole}
          onResolved={async () => {
            await onUpdated?.();
          }}
        />
      )}

      {pagesRole === 'builder' && (
        <div className="rounded-xl border border-graystone-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h3 className="text-sm font-semibold text-ocean-900 dark:text-slate-100">Builder notes</h3>
          <textarea
            value={builderNotes}
            onChange={(event) => setBuilderNotes(event.target.value)}
            onBlur={handleNotesBlur}
            rows={5}
            className="mt-3 w-full rounded-lg border border-graystone-300 px-3 py-2 text-sm text-graystone-800 outline-none transition focus:border-ocean-600 focus:ring-2 focus:ring-ocean-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-ocean-500/20"
            placeholder="Add internal notes for the build team."
          />
          {notesState === 'saving' && (
            <p className="mt-2 text-sm text-graystone-600 dark:text-slate-400">Saving notes…</p>
          )}
          {notesState === 'saved' && (
            <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-300">Notes saved.</p>
          )}
          {notesState === 'error' && (
            <p className="mt-2 text-sm text-rose-600 dark:text-rose-300">We could not save those notes.</p>
          )}
        </div>
      )}

      {pagesRole === 'requester' && request.brief_locked_at && (
        <div className="rounded-xl border border-graystone-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-ocean-900 dark:text-slate-100">Need an amendment?</h3>
              <p className="mt-2 text-sm text-graystone-700 dark:text-slate-300">
                Raise a brief amendment so the builder can review and accept or reject it.
              </p>
            </div>
            {!amendmentOpen && (
              <button
                type="button"
                onClick={() => setAmendmentOpen(true)}
                className="rounded-lg bg-ocean-600 px-4 py-2 text-white transition-colors hover:bg-ocean-700"
              >
                Request amendment
              </button>
            )}
          </div>

          {amendmentOpen && (
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
          )}
        </div>
      )}

      {actionError && <p className="text-sm text-rose-600 dark:text-rose-300">{actionError}</p>}
    </div>
  );
}
