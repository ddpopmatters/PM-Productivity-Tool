import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Lock } from 'lucide-react';
import { formatDate, getRequestSummaryItems } from './dashboardUtils';

const COPY_BRIEF_LABELS = new Set([
  'Key messages',
  'Price points',
  'Tone / voice',
  'Suggested headline',
  'CTA copy',
]);

function DetailItem({ label, value, fullWidth = false }) {
  return (
    <div className={fullWidth ? 'sm:col-span-2' : ''}>
      <p className="text-xs font-medium text-graystone-600 dark:text-slate-400">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-graystone-800 dark:text-slate-200">{value}</p>
    </div>
  );
}

export default function BriefPanel({ request }) {
  const [isOpen, setIsOpen] = useState(!request?.brief_locked_at);
  const summaryItems = useMemo(() => getRequestSummaryItems(request), [request]);
  const baseSummaryItems = useMemo(
    () => summaryItems.filter((item) => !COPY_BRIEF_LABELS.has(item.label)),
    [summaryItems]
  );
  const copyBriefItems = useMemo(
    () => summaryItems.filter((item) => COPY_BRIEF_LABELS.has(item.label)),
    [summaryItems]
  );
  const hasCopyBrief = !!(
    request?.key_messages ||
    request?.price_points?.length ||
    request?.copy_tone ||
    request?.suggested_headline ||
    request?.cta_copy
  );

  useEffect(() => {
    setIsOpen(!request?.brief_locked_at);
  }, [request?.id, request?.brief_locked_at]);

  return (
    <div className="rounded-xl border border-graystone-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-4 p-4 text-left"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-ocean-900 dark:text-slate-100">Brief summary</h2>
          {request?.brief_locked_at && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
              <Lock className="h-3 w-3" />
              Locked {formatDate(request.brief_locked_at)}
            </span>
          )}
        </div>
        <ChevronDown
          className={`h-4 w-4 text-graystone-500 transition-transform dark:text-slate-400 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="border-t border-graystone-200 p-4 dark:border-slate-700">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {baseSummaryItems.map((item) => (
              <DetailItem
                key={item.label}
                label={item.label}
                value={item.value}
                fullWidth={item.fullWidth}
              />
            ))}
          </div>

          {hasCopyBrief && copyBriefItems.length > 0 && (
            <>
              <div className="pt-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-graystone-500 dark:text-slate-500">Copy brief</p>
              </div>
              <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
                {copyBriefItems.map((item) => (
                  <DetailItem
                    key={item.label}
                    label={item.label}
                    value={item.value}
                    fullWidth={item.fullWidth}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
