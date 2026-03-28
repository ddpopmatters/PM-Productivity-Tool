import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import { CheckCircle2, ChevronLeft, Globe } from 'lucide-react';
import { updatePageUrl } from '../../../../services/landingPageRequests';
import PageTypeBadge from '../ui/PageTypeBadge';
import StatusBadge from '../ui/StatusBadge';
import MilestoneProgressBar from './MilestoneProgressBar';
import { getDaysToGoLive } from './dashboardUtils';

function getDaysChip(daysToGoLive) {
  if (daysToGoLive === null) {
    return {
      label: 'Go-live not set',
      className: 'bg-graystone-100 text-graystone-700 dark:bg-slate-800 dark:text-slate-300',
    };
  }

  if (daysToGoLive >= 14) {
    return {
      label: `${daysToGoLive} day${daysToGoLive === 1 ? '' : 's'} to go-live`,
      className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    };
  }

  if (daysToGoLive >= 7) {
    return {
      label: `${daysToGoLive} day${daysToGoLive === 1 ? '' : 's'} to go-live`,
      className: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    };
  }

  return {
    label:
      daysToGoLive >= 0
        ? `${daysToGoLive} day${daysToGoLive === 1 ? '' : 's'} to go-live`
        : `${Math.abs(daysToGoLive)} day${Math.abs(daysToGoLive) === 1 ? '' : 's'} overdue`,
    className: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  };
}

export default function DashboardHero({ request, pagesRole, onBack, onUpdated }) {
  const [pageUrl, setPageUrl] = useState(request?.page_url || '');
  const [saveState, setSaveState] = useState('idle');

  useEffect(() => {
    setPageUrl(request?.page_url || '');
    setSaveState('idle');
  }, [request?.id, request?.page_url]);

  const daysToGoLive = getDaysToGoLive(request?.go_live_date);
  const daysChip = getDaysChip(daysToGoLive);

  const handlePageUrlBlur = async () => {
    if (pagesRole !== 'builder') return;

    const nextUrl = pageUrl.trim();
    if ((request?.page_url || '') === nextUrl) return;

    setSaveState('saving');
    const updated = await updatePageUrl(request.id, nextUrl || null);

    if (!updated) {
      setSaveState('error');
      return;
    }

    await onUpdated?.(updated);
    setSaveState('saved');
  };

  return (
    <div className="sticky top-0 z-20 border-b border-graystone-200 bg-white/95 backdrop-blur dark:border-slate-700 dark:bg-slate-950/95">
      <div className="mx-auto w-full max-w-7xl px-6 py-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 rounded-lg border border-graystone-300 px-3 py-2 text-sm text-graystone-700 transition-colors hover:bg-graystone-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Pages
            </button>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <PageTypeBadge type={request?.page_type} />
              <StatusBadge status={request?.status} />
              <span
                className={clsx(
                  'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium',
                  daysChip.className
                )}
              >
                {daysChip.label}
              </span>
            </div>

            <h1 className="mt-3 text-2xl font-bold text-ocean-900 dark:text-slate-100">
              {request?.title || 'Untitled request'}
            </h1>
          </div>

          <div className="w-full max-w-md rounded-xl border border-graystone-200 bg-graystone-50 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center gap-2 text-sm font-semibold text-ocean-900 dark:text-slate-100">
              <Globe className="h-4 w-4 text-aqua-500" />
              Page URL
            </div>

            {pagesRole === 'builder' ? (
              <>
                <input
                  id="request-page-url"
                  type="url"
                  value={pageUrl}
                  onChange={(event) => {
                    setPageUrl(event.target.value);
                    if (saveState !== 'idle') setSaveState('idle');
                  }}
                  onBlur={handlePageUrlBlur}
                  placeholder="Add staging or live URL"
                  className="mt-3 w-full rounded-lg border border-graystone-300 px-3 py-2 text-sm text-graystone-800 outline-none transition focus:border-ocean-600 focus:ring-2 focus:ring-ocean-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-ocean-500/20"
                />
                <div className="mt-2 min-h-5 text-sm">
                  {saveState === 'saving' && (
                    <span className="text-graystone-600 dark:text-slate-400">Saving page URL…</span>
                  )}
                  {saveState === 'saved' && (
                    <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-300">
                      <CheckCircle2 className="h-4 w-4" />
                      Saved
                    </span>
                  )}
                  {saveState === 'error' && (
                    <span className="text-rose-600 dark:text-rose-300">We could not save that URL.</span>
                  )}
                </div>
              </>
            ) : request?.page_url ? (
              <a
                href={request.page_url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex max-w-full items-center gap-2 text-sm font-medium text-ocean-700 hover:text-ocean-800 dark:text-ocean-300 dark:hover:text-ocean-200"
              >
                <span className="truncate">{request.page_url}</span>
              </a>
            ) : (
              <p className="mt-3 text-sm text-graystone-600 dark:text-slate-400">No page URL has been added yet.</p>
            )}
          </div>
        </div>

        <MilestoneProgressBar goLiveDate={request?.go_live_date} status={request?.status} />
      </div>
    </div>
  );
}
