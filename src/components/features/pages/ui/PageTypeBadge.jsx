import React from 'react';
import clsx from 'clsx';

const TYPE_STYLES = {
  appeal: 'bg-ocean-100 text-ocean-700 dark:bg-ocean-500/15 dark:text-ocean-200',
  evergreen: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  expedited: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
};

const TYPE_LABELS = {
  appeal: 'Appeal',
  evergreen: 'Evergreen',
  expedited: 'Expedited',
};

export default function PageTypeBadge({ type }) {
  const safeType = type || 'appeal';

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        TYPE_STYLES[safeType] || TYPE_STYLES.appeal
      )}
    >
      {TYPE_LABELS[safeType] || 'Appeal'}
    </span>
  );
}
