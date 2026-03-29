import React, { useMemo } from 'react';
import Button from '../../ui/Button';

const TRACKS = [
  { id: 'cms_done', label: 'CMS', fillClass: 'bg-teal-500' },
  { id: 'content_done', label: 'Content', fillClass: 'bg-blue-500' },
  { id: 'design_done', label: 'Design', fillClass: 'bg-sky-500' },
  { id: 'approval_done', label: 'Approval', fillClass: 'bg-green-500' },
];

function getPercent(done, total) {
  if (!total) return 0;
  return Math.round((done / total) * 100);
}

function SegmentedProgressBar({ label, done, total, fillClass }) {
  const percent = getPercent(done, total);
  const totalSegments = 10;
  const filledSegments = total
    ? Math.max(0, Math.min(totalSegments, Math.round((done / total) * totalSegments)))
    : 0;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-medium text-ocean-900">{label}</span>
        <span className="text-graystone-500">
          {done}/{total} · {percent}%
        </span>
      </div>
      <div className="grid grid-cols-10 gap-1">
        {Array.from({ length: totalSegments }).map((_, index) => (
          <span
            key={`${label}-${index}`}
            className={[
              'h-2 rounded-full bg-graystone-200',
              index < filledSegments ? fillClass : '',
            ]
              .filter(Boolean)
              .join(' ')}
          />
        ))}
      </div>
    </div>
  );
}

export default function LaunchReadiness({
  launchReadiness = [],
  pages = [],
  decisions = [],
  onRefresh,
}) {
  const sectionPageIds = useMemo(() => {
    const map = new Map();

    pages.forEach((page) => {
      if (!page.section) return;
      if (!map.has(page.section)) {
        map.set(page.section, new Set());
      }
      map.get(page.section).add(page.id);
    });

    return map;
  }, [pages]);

  const summary = useMemo(() => {
    return launchReadiness.reduce(
      (accumulator, row) => {
        accumulator.total += row.total_pages || row.total || 0;
        accumulator.cms_done += row.cms_done || 0;
        accumulator.content_done += row.content_done || 0;
        accumulator.design_done += row.design_done || 0;
        accumulator.approval_done += row.approval_done || 0;
        return accumulator;
      },
      {
        total: 0,
        cms_done: 0,
        content_done: 0,
        design_done: 0,
        approval_done: 0,
      }
    );
  }, [launchReadiness]);

  const openDecisionCounts = useMemo(() => {
    const counts = new Map();

    decisions
      .filter((decision) => decision.status === 'open')
      .forEach((decision) => {
        sectionPageIds.forEach((pageIds, section) => {
          const hasMatch = (decision.related_page_ids || []).some((pageId) => pageIds.has(pageId));
          if (hasMatch) {
            counts.set(section, (counts.get(section) || 0) + 1);
          }
        });
      });

    return counts;
  }, [decisions, sectionPageIds]);

  if (launchReadiness.length === 0) {
    return (
      <section className="rounded-2xl border border-graystone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-ocean-900">Launch readiness</h3>
            <p className="text-sm text-graystone-500">
              Progress by section across CMS, content, design, and approval.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={onRefresh}>
            Refresh
          </Button>
        </div>

        <div className="mt-5 rounded-xl border border-dashed border-graystone-300 bg-graystone-50 px-4 py-8 text-center text-sm text-graystone-500">
          No pages with sections assigned yet — add sections to your pages in the Page Inventory.
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-graystone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-ocean-900">Launch readiness</h3>
          <p className="text-sm text-graystone-500">
            Progress by section across CMS, content, design, and approval.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onRefresh}>
          Refresh
        </Button>
      </div>

      <div className="mt-5 rounded-2xl border border-graystone-200 bg-graystone-50 p-4">
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-ocean-900">Overall progress</h4>
          <p className="text-sm text-graystone-500">
            Combined readiness across all sections.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {TRACKS.map((track) => (
            <SegmentedProgressBar
              key={track.id}
              label={track.label}
              done={summary[track.id]}
              total={summary.total}
              fillClass={track.fillClass}
            />
          ))}
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {launchReadiness.map((row) => (
          <div
            key={row.section}
            className="rounded-2xl border border-graystone-200 bg-white p-4 shadow-sm"
          >
            <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h4 className="text-lg font-semibold text-ocean-900">{row.section}</h4>
                <p className="text-sm text-graystone-500">
                  {row.total_pages || row.total} pages · {row.dependency_count || 0} dependencies
                </p>
              </div>
              <div className="text-sm text-graystone-500">
                {openDecisionCounts.get(row.section) || 0} open decisions
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {TRACKS.map((track) => (
                <SegmentedProgressBar
                  key={`${row.section}-${track.id}`}
                  label={track.label}
                  done={row[track.id]}
                  total={row.total_pages || row.total}
                  fillClass={track.fillClass}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
