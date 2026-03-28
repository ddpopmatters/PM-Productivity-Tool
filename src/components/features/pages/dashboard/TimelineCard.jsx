import React from 'react';
import { CalendarDays } from 'lucide-react';
import { formatDate, getTimelineMilestones, parseDateValue } from './dashboardUtils';

function TodayMarker() {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-aqua-200 dark:bg-aqua-500/30" />
      <span className="rounded-full bg-aqua-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-aqua-700 dark:bg-aqua-500/15 dark:text-aqua-300">
        Today
      </span>
      <div className="h-px flex-1 bg-aqua-200 dark:bg-aqua-500/30" />
    </div>
  );
}

export default function TimelineCard({ request }) {
  if (!request?.go_live_date) {
    return (
      <div className="rounded-xl border border-graystone-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-base font-semibold text-ocean-900 dark:text-slate-100">Project timeline</h2>
        <p className="mt-3 text-sm text-graystone-700 dark:text-slate-300">
          Set a go-live date to see the timeline.
        </p>
      </div>
    );
  }

  const milestones = getTimelineMilestones(request.go_live_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let todayInserted = false;
  const markerIndex = milestones.findIndex((milestone) => {
    const milestoneDate = parseDateValue(milestone.date);
    if (!milestoneDate) return false;
    milestoneDate.setHours(0, 0, 0, 0);
    return milestoneDate >= today;
  });

  return (
    <div className="rounded-xl border border-graystone-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-aqua-500" />
        <h2 className="text-base font-semibold text-ocean-900 dark:text-slate-100">Project timeline</h2>
      </div>

      <div className="mt-4 space-y-3">
        {milestones.map((milestone, index) => {
          const shouldShowMarker = !todayInserted && markerIndex === index;
          if (shouldShowMarker) todayInserted = true;

          return (
            <React.Fragment key={milestone.label}>
              {shouldShowMarker && <TodayMarker />}
              <div className="flex items-start gap-3">
                <span className="mt-1 h-3 w-3 rounded-full bg-ocean-500" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-ocean-900 dark:text-slate-100">{milestone.label}</p>
                    <p className="text-xs text-graystone-600 dark:text-slate-400">
                      {formatDate(milestone.date, 'TBC')}
                    </p>
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })}

        {!todayInserted && <TodayMarker />}
      </div>
    </div>
  );
}
