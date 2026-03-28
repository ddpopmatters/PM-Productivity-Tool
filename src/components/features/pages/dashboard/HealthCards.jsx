import React from 'react';
import clsx from 'clsx';
import { getDaysToGoLive } from './dashboardUtils';

function getDaysState(daysToGoLive) {
  if (daysToGoLive === null) {
    return {
      value: '—',
      label: 'Date needed',
      className: 'text-graystone-600 dark:text-slate-300',
    };
  }

  if (daysToGoLive >= 14) {
    return {
      value: `${daysToGoLive}`,
      label: 'On track',
      className: 'text-emerald-600 dark:text-emerald-300',
    };
  }

  if (daysToGoLive >= 1) {
    return {
      value: `${daysToGoLive}`,
      label: 'At risk',
      className: 'text-amber-600 dark:text-amber-300',
    };
  }

  return {
    value: `${daysToGoLive}`,
    label: 'Overdue',
    className: 'text-rose-600 dark:text-rose-300',
  };
}

function getResponsibleOwner(status) {
  switch (status) {
    case 'approved':
    case 'in_progress':
    case 'first_draft':
    case 'live':
      return 'Builder';
    case 'revision_1':
    case 'revision_2':
      return 'Requester';
    case 'needs_more_info':
      return 'Requester';
    default:
      return 'Approver';
  }
}

function getStageLabel(status) {
  switch (status) {
    case 'submitted':
    case 'pending_review':
      return 'Awaiting review';
    case 'approved':
      return 'Approved';
    case 'in_progress':
      return 'Build in progress';
    case 'first_draft':
      return 'First draft';
    case 'revision_1':
      return 'Revision 1';
    case 'revision_2':
      return 'Revision 2';
    case 'live':
      return 'Live';
    default:
      return 'Needs more info';
  }
}

function getAssetReadiness(request) {
  const copyReady = request?.copy_status === 'attached';
  const assetReady = request?.asset_status === 'attached';

  if (copyReady && assetReady) {
    return {
      label: 'Both ready',
      className: 'text-emerald-600 dark:text-emerald-300',
    };
  }

  if (copyReady || assetReady) {
    return {
      label: 'One pending',
      className: 'text-amber-600 dark:text-amber-300',
    };
  }

  return {
    label: 'Both pending',
    className: 'text-rose-600 dark:text-rose-300',
  };
}

function MetricCard({ title, value, subtitle, accentClassName }) {
  return (
    <div className="rounded-xl border border-graystone-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <p className="text-sm font-medium text-graystone-600 dark:text-slate-400">{title}</p>
      <p className="mt-3 text-3xl font-bold text-ocean-900 dark:text-slate-100">{value}</p>
      <p className={clsx('mt-2 text-sm font-medium', accentClassName)}>{subtitle}</p>
    </div>
  );
}

export default function HealthCards({ request }) {
  const daysState = getDaysState(getDaysToGoLive(request?.go_live_date));
  const assetReadiness = getAssetReadiness(request);
  const stageLabel = getStageLabel(request?.status);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <MetricCard
        title="Days to go-live"
        value={daysState.value}
        subtitle={daysState.label}
        accentClassName={daysState.className}
      />
      <MetricCard
        title="Current stage"
        value={stageLabel}
        subtitle={`Owner: ${getResponsibleOwner(request?.status)}`}
        accentClassName="text-aqua-600 dark:text-aqua-300"
      />
      <MetricCard
        title="Assets ready"
        value={assetReadiness.label}
        subtitle={`${request?.copy_status === 'attached' ? 'Copy ready' : 'Copy pending'} · ${request?.asset_status === 'attached' ? 'Assets ready' : 'Assets pending'}`}
        accentClassName={assetReadiness.className}
      />
    </div>
  );
}
