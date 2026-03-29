import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { LoadingSpinner } from '../../../ui';
import {
  fetchRequestById,
  fetchRevisionFeedback,
} from '../../../../services/landingPageRequests';
import AmendmentQueue from '../requests/AmendmentQueue';
import ActionsBar from './ActionsBar';
import ActivityFeed from './ActivityFeed';
import BriefPanel from './BriefPanel';
import { BuilderDraftCard } from './BuilderDraftCard';
import BuilderNotesCard from './BuilderNotesCard';
import CommentThread from './CommentThread';
import ContactsCard from './ContactsCard';
import DashboardHero from './DashboardHero';
import { DraftPreviewPanel } from './DraftPreviewPanel';
import FilesCard from './FilesCard';
import HealthCards from './HealthCards';
import TimelineCard from './TimelineCard';
import TurnBanner from './TurnBanner';

function EmptyState({ message, onBack }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-graystone-50 px-6 dark:bg-slate-950">
      <div className="max-w-lg rounded-2xl border border-graystone-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <AlertCircle className="mx-auto h-10 w-10 text-amber-500" />
        <h1 className="mt-4 text-xl font-semibold text-ocean-900 dark:text-slate-100">Request unavailable</h1>
        <p className="mt-2 text-sm text-graystone-700 dark:text-slate-300">{message}</p>
        <button
          type="button"
          onClick={onBack}
          className="mt-5 rounded-lg bg-ocean-600 px-4 py-2 text-white transition-colors hover:bg-ocean-700"
        >
          Back to Pages
        </button>
      </div>
    </div>
  );
}

export default function RequestDashboard({
  requestId,
  pagesRole,
  userId,
  userEmail,
  currentUser,
  onBack,
}) {
  const [request, setRequest] = useState(null);
  const [feedbackItems, setFeedbackItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadRequest = useCallback(async () => {
    if (!requestId) return null;
    return fetchRequestById(requestId);
  }, [requestId]);

  const loadFeedback = useCallback(async () => {
    if (!requestId) return [];
    return fetchRevisionFeedback(requestId);
  }, [requestId]);

  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      if (!requestId) {
        setRequest(null);
        setFeedbackItems([]);
        setError('Select a request to view its dashboard.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      const [requestData, feedbackData] = await Promise.all([loadRequest(), loadFeedback()]);

      if (isCancelled) return;

      setRequest(requestData);
      setFeedbackItems(feedbackData || []);
      setError(requestData ? '' : 'We could not find that request.');
      setLoading(false);
    }

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [loadFeedback, loadRequest, requestId]);

  const handleUpdated = useCallback(async (updated) => {
    const nextRequest = updated && updated.id === requestId ? updated : await loadRequest();
    const nextFeedback = await loadFeedback();

    setRequest(nextRequest);
    setFeedbackItems(nextFeedback || []);
    setError(nextRequest ? '' : 'We could not find that request.');
  }, [loadFeedback, loadRequest, requestId]);

  const handleStatusChange = useCallback(async (_status, updatedRequest) => {
    if (updatedRequest?.id === requestId) {
      setRequest(updatedRequest);
    } else {
      const nextRequest = await loadRequest();
      setRequest(nextRequest);
    }

    const nextFeedback = await loadFeedback();
    setFeedbackItems(nextFeedback || []);
  }, [loadFeedback, loadRequest, requestId]);

  const signedInUser = currentUser || userEmail;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-graystone-50 px-6 dark:bg-slate-950">
        <LoadingSpinner text="Loading request dashboard…" className="min-h-[180px]" />
      </div>
    );
  }

  if (!request || error) {
    return <EmptyState message={error || 'We could not load this request.'} onBack={onBack} />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-graystone-50 dark:bg-slate-950">
      <DashboardHero request={request} pagesRole={pagesRole} onBack={onBack} onUpdated={handleUpdated} />

      <div className="mx-auto w-full max-w-7xl flex-1 px-6 py-6">
        <div className="mb-6 rounded-xl border border-graystone-200 bg-white px-4 py-3 text-sm text-graystone-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          Signed in as <span className="font-medium text-ocean-900 dark:text-slate-100">{signedInUser || 'Unknown user'}</span>
        </div>

        <HealthCards request={request} />

        <div className="mt-6">
          <TurnBanner request={request} pagesRole={pagesRole} feedbackItems={feedbackItems} />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_400px]">
          <div className="space-y-6">
            <DraftPreviewPanel requestId={request.id} request={request} />
            <BriefPanel request={request} />
            <ActivityFeed request={request} feedbackItems={feedbackItems} />
            <CommentThread
              requestId={request.id}
              userId={userId}
              userEmail={userEmail}
              currentUser={currentUser}
            />
          </div>

          <div className="space-y-6">
            <ContactsCard request={request} />
            <TimelineCard request={request} />
            <FilesCard requestId={request.id} request={request} />
            <BuilderDraftCard
              requestId={request.id}
              userId={userId}
              pagesRole={pagesRole}
              request={request}
              onUploaded={handleUpdated}
            />
            {pagesRole === 'builder' && <BuilderNotesCard request={request} onUpdated={handleUpdated} />}
            {pagesRole === 'builder' && (
              <AmendmentQueue
                requestId={request.id}
                pagesRole={pagesRole}
                onResolved={handleUpdated}
              />
            )}
          </div>
        </div>
      </div>

      <ActionsBar
        request={request}
        pagesRole={pagesRole}
        userId={userId}
        feedbackItems={feedbackItems}
        onUpdated={handleUpdated}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}
