import React from 'react';
import clsx from 'clsx';
import { formatDate, getMilestoneIndex, getTimelineMilestones } from './dashboardUtils';

export default function MilestoneProgressBar({ goLiveDate, status }) {
  const milestones = goLiveDate ? getTimelineMilestones(goLiveDate) : getTimelineMilestones(new Date());
  const currentIndex = getMilestoneIndex(status);

  return (
    <div className="mt-5 overflow-x-auto pb-1">
      <div className="flex min-w-[720px] items-start px-1">
        {milestones.map((milestone, index) => {
          const isComplete = index < currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <React.Fragment key={milestone.label}>
              <div className="flex flex-1 flex-col items-center text-center">
                <div
                  className={clsx(
                    'flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                    isComplete && 'bg-ocean-500 text-white',
                    isCurrent && 'bg-ocean-600 text-white ring-2 ring-ocean-300 dark:ring-ocean-400/50',
                    !isComplete &&
                      !isCurrent &&
                      'border-2 border-graystone-300 bg-white text-graystone-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-400'
                  )}
                >
                  {index + 1}
                </div>
                <p className="mt-2 text-xs font-medium text-ocean-900 dark:text-slate-100">{milestone.label}</p>
                <p className="mt-1 text-xs text-graystone-600 dark:text-slate-400">
                  {goLiveDate ? formatDate(milestone.date, 'TBC') : 'TBC'}
                </p>
              </div>
              {index < milestones.length - 1 && (
                <div className="mt-4 h-0.5 flex-1 rounded-full bg-graystone-200 dark:bg-slate-700">
                  <div
                    className={clsx(
                      'h-full rounded-full transition-all',
                      index < currentIndex ? 'w-full bg-ocean-500' : 'w-0 bg-ocean-500'
                    )}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
