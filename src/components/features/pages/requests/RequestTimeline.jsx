import React from 'react';
import clsx from 'clsx';
import { CheckCircle2 } from 'lucide-react';

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

export default function RequestTimeline({ status }) {
  const currentIndex = STATUS_ORDER.indexOf(status);

  return (
    <div className="rounded-xl border border-graystone-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h3 className="text-sm font-semibold text-ocean-900 dark:text-slate-100">Timeline</h3>
      <div className="mt-4 space-y-3">
        {STATUS_ORDER.map((item, index) => {
          const isComplete = currentIndex > index;
          const isCurrent = currentIndex === index;
          const isUpcoming = currentIndex !== -1 && currentIndex < index;

          return (
            <div key={item} className="flex items-start gap-3">
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                {isComplete ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <span
                    className={clsx(
                      'h-3.5 w-3.5 rounded-full border',
                      isCurrent
                        ? 'border-aqua-500 bg-aqua-500'
                        : 'border-graystone-300 bg-white dark:border-slate-500 dark:bg-slate-900'
                    )}
                  />
                )}
              </div>
              <div>
                <p
                  className={clsx(
                    'text-sm font-medium',
                    isComplete && 'text-emerald-700 dark:text-emerald-300',
                    isCurrent && 'text-ocean-900 dark:text-slate-100',
                    isUpcoming && 'text-graystone-500 dark:text-slate-400',
                    currentIndex === -1 && 'text-graystone-500 dark:text-slate-400'
                  )}
                >
                  {STATUS_LABELS[item]}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
