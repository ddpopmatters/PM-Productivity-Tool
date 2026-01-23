import React from 'react';
import clsx from 'clsx';

/**
 * Skeleton - Loading placeholder component
 *
 * Displays an animated pulse effect for content placeholders.
 *
 * @param {string} className - Additional CSS classes for sizing
 */
export function Skeleton({ className = '' }) {
  return (
    <div
      className={clsx('animate-pulse bg-graystone-200 dark:bg-graystone-700 rounded', className)}
      aria-hidden="true"
    />
  );
}

/**
 * CardSkeleton - Loading placeholder for stat cards
 */
export function CardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-ocean-100 dark:border-slate-700">
      <Skeleton className="h-4 w-24 mb-2" />
      <Skeleton className="h-8 w-16 mb-4" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

/**
 * ListItemSkeleton - Loading placeholder for list items
 */
export function ListItemSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-graystone-200 dark:border-slate-700 flex items-center gap-4">
      <Skeleton className="w-2 h-12 rounded-full" />
      <div className="flex-1">
        <Skeleton className="h-5 w-48 mb-2" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-6 w-20 rounded-full" />
    </div>
  );
}

/**
 * ListSkeleton - Loading placeholder for lists
 *
 * @param {number} rows - Number of skeleton rows to display
 */
export function ListSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <ListItemSkeleton key={i} />
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  );
}

/**
 * TableSkeleton - Loading placeholder for tables
 *
 * @param {number} rows - Number of skeleton rows to display
 * @param {number} cols - Number of columns
 */
export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-graystone-200 dark:border-slate-700 overflow-hidden" role="status" aria-label="Loading">
      <div className="p-4 border-b border-graystone-200 dark:border-slate-700">
        <div className="flex gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-graystone-100 dark:divide-slate-700">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 flex gap-4">
            {Array.from({ length: cols }).map((_, j) => (
              <Skeleton key={j} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
      <span className="sr-only">Loading...</span>
    </div>
  );
}

/**
 * DashboardSkeleton - Full dashboard loading state
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300" role="status" aria-label="Loading dashboard">
      {/* Header skeleton */}
      <div className="bg-gradient-to-r from-ocean-500 to-ocean-600 rounded-2xl p-6">
        <Skeleton className="h-8 w-64 mb-2 bg-white/20" />
        <Skeleton className="h-4 w-48 bg-white/20" />
      </div>

      {/* Stats cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>

      {/* Content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-ocean-100 dark:border-slate-700 p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <Skeleton className="h-48 w-full" />
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-ocean-100 dark:border-slate-700 p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <ListSkeleton rows={4} />
        </div>
      </div>
      <span className="sr-only">Loading dashboard...</span>
    </div>
  );
}

export default Skeleton;
