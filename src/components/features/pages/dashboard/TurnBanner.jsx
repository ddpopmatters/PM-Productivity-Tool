import React from 'react';
import { CheckCircle, Clock, User } from 'lucide-react';
import { getTurnInfo } from './dashboardUtils';

export default function TurnBanner({ request, pagesRole, feedbackItems }) {
  const { party, isYourTurn, heading, description } = getTurnInfo(request, pagesRole, feedbackItems);
  const isDone = party === 'done';
  const badgeLabel = isDone ? 'Complete' : party;
  const Icon = isDone ? CheckCircle : isYourTurn ? User : Clock;

  const bannerClassName = isDone
    ? 'rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 dark:border-emerald-500/30 dark:bg-emerald-500/10'
    : isYourTurn
      ? 'rounded-xl border border-ocean-200 bg-ocean-50 px-5 py-4 dark:border-ocean-500/30 dark:bg-ocean-500/10'
      : 'rounded-xl border border-graystone-200 bg-graystone-50 px-5 py-4 dark:border-slate-700 dark:bg-slate-900';

  const iconClassName = isDone
    ? 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white'
    : isYourTurn
      ? 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ocean-600 text-white'
      : 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-graystone-200 text-graystone-600 dark:bg-slate-700 dark:text-slate-400';

  const headingClassName = isDone
    ? 'text-sm font-semibold text-emerald-900 dark:text-emerald-200'
    : isYourTurn
      ? 'text-sm font-semibold text-ocean-900 dark:text-ocean-200'
      : 'text-sm font-semibold text-graystone-800 dark:text-slate-200';

  const descriptionClassName = isDone
    ? 'text-sm text-emerald-700 dark:text-emerald-300'
    : isYourTurn
      ? 'text-sm text-ocean-700 dark:text-ocean-300'
      : 'text-sm text-graystone-600 dark:text-slate-400';

  const badgeClassName = isDone
    ? 'ml-auto shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
    : isYourTurn
      ? 'ml-auto shrink-0 rounded-full bg-ocean-100 px-3 py-1 text-xs font-medium text-ocean-700 dark:bg-ocean-500/20 dark:text-ocean-300 capitalize'
      : 'ml-auto shrink-0 rounded-full bg-graystone-100 px-3 py-1 text-xs font-medium text-graystone-600 dark:bg-slate-700 dark:text-slate-400 capitalize';

  return (
    <div className={bannerClassName}>
      <div className="flex items-center gap-3">
        <div className={iconClassName}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className={headingClassName}>{heading}</p>
          <p className={descriptionClassName}>{description}</p>
        </div>
        <span className={badgeClassName}>{badgeLabel}</span>
      </div>
    </div>
  );
}
