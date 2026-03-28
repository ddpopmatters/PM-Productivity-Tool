import React, { useCallback, useEffect, useState } from 'react';
import clsx from 'clsx';
import { fetchAmendments, resolveAmendment } from '../../../../services/landingPageRequests';

function formatDate(dateValue) {
  if (!dateValue) return 'Just now';
  return new Date(dateValue).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getBadgeClasses(status) {
  switch (status) {
    case 'accepted':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300';
    case 'rejected':
      return 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300';
    default:
      return 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300';
  }
}

export default function AmendmentQueue({ requestId, pagesRole, onResolved }) {
  const [amendments, setAmendments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeDecision, setActiveDecision] = useState('');

  const loadAmendments = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await fetchAmendments(requestId);
      setAmendments(data || []);
    } catch (err) {
      setError(err?.message || 'We could not load amendments right now.');
      setAmendments([]);
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    loadAmendments();
  }, [loadAmendments]);

  const handleResolve = async (amendmentId, decision) => {
    setActiveDecision(`${amendmentId}:${decision}`);
    setError('');

    try {
      const updated = await resolveAmendment(amendmentId, decision);

      if (!updated) {
        setError('We could not update that amendment.');
        return;
      }

      await loadAmendments();
      await onResolved?.();
    } catch (err) {
      setError(err?.message || 'We could not update that amendment.');
    } finally {
      setActiveDecision('');
    }
  };

  return (
    <div className="rounded-xl border border-graystone-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h3 className="text-sm font-semibold text-ocean-900 dark:text-slate-100">Amendment queue</h3>

      {loading ? (
        <p className="mt-3 text-sm text-graystone-600 dark:text-slate-400">Loading amendments…</p>
      ) : amendments.length === 0 ? (
        <p className="mt-3 text-sm text-graystone-700 dark:text-slate-300">
          Any requested amendments will appear here once the brief is locked.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {amendments.map((amendment) => {
            const actionKey = `${amendment.id}:accepted`;
            const rejectKey = `${amendment.id}:rejected`;

            return (
              <div
                key={amendment.id}
                className="rounded-lg border border-graystone-200 p-3 dark:border-slate-700"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span
                    className={clsx(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                      getBadgeClasses(amendment.status)
                    )}
                  >
                    {amendment.status === 'pending'
                      ? 'Pending'
                      : amendment.status === 'accepted'
                      ? 'Accepted'
                      : 'Rejected'}
                  </span>
                  <span className="text-xs text-graystone-600 dark:text-slate-400">
                    {formatDate(amendment.created_at)}
                  </span>
                </div>
                <p className="mt-3 text-sm text-graystone-800 dark:text-slate-200">{amendment.justification}</p>

                {pagesRole === 'builder' && amendment.status === 'pending' && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleResolve(amendment.id, 'accepted')}
                      disabled={Boolean(activeDecision)}
                      className="rounded-lg bg-ocean-600 px-4 py-2 text-white transition-colors hover:bg-ocean-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {activeDecision === actionKey ? 'Accepting…' : 'Accept'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResolve(amendment.id, 'rejected')}
                      disabled={Boolean(activeDecision)}
                      className="rounded-lg border border-graystone-300 px-4 py-2 text-graystone-700 transition-colors hover:bg-graystone-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      {activeDecision === rejectKey ? 'Rejecting…' : 'Reject'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {error && <p className="mt-3 text-sm text-rose-600 dark:text-rose-300">{error}</p>}
    </div>
  );
}
