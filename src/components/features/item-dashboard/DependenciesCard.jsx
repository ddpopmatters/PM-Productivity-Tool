import clsx from 'clsx';
import { Icon } from '../../ui';

export default function DependenciesCard({ entry, allEntries, canEdit, onUpdateEntry, onOpenModal }) {
  const deps = entry.dependencies || [];

  return (
    <div className="bg-white rounded-3xl p-6 border border-graystone-200 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-ocean-900">Dependencies</h3>
        {canEdit && (
          <button
            onClick={onOpenModal}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-ocean-50 transition-colors"
          >
            <Icon name="plus" className="w-5 h-5 text-ocean-600" />
          </button>
        )}
      </div>
      {deps.length > 0 ? (
        <div className="space-y-2">
          {deps.map((depId) => {
            const depEntry = allEntries.find((e) => e.id === depId);
            if (!depEntry) return null;
            const isBlocked = depEntry.workflowStatus !== 'Done';
            return (
              <div
                key={depId}
                className={clsx(
                  'flex items-center justify-between p-3 rounded-xl border transition-colors',
                  isBlocked ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                )}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Icon
                    name={isBlocked ? 'circle-alert' : 'circle-check'}
                    className={clsx('w-4 h-4 shrink-0', isBlocked ? 'text-red-500' : 'text-green-500')}
                  />
                  <span className="text-sm font-medium text-graystone-900 truncate">
                    {depEntry.title}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span
                    className={clsx(
                      'text-[10px] px-2 py-0.5 rounded-full font-medium',
                      isBlocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    )}
                  >
                    {depEntry.workflowStatus}
                  </span>
                  {canEdit && (
                    <button
                      onClick={() => {
                        const newDeps = deps.filter((d) => d !== depId);
                        onUpdateEntry(entry.id, { dependencies: newDeps });
                      }}
                      className="p-1 hover:bg-red-100 rounded transition-colors"
                    >
                      <Icon name="x" className="w-3 h-3 text-graystone-500" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-sm text-graystone-500 text-center py-4 bg-graystone-50 rounded-xl border border-dashed border-graystone-200">
          No dependencies
        </div>
      )}
      {deps.length > 0 && (
        <div
          className={clsx(
            'mt-3 text-xs font-medium px-3 py-2 rounded-lg text-center',
            deps.some((depId) => {
              const dep = allEntries.find((e) => e.id === depId);
              return dep && dep.workflowStatus !== 'Done';
            })
              ? 'bg-red-100 text-red-700'
              : 'bg-green-100 text-green-700'
          )}
        >
          {deps.some((depId) => {
            const dep = allEntries.find((e) => e.id === depId);
            return dep && dep.workflowStatus !== 'Done';
          })
            ? 'Blocked by incomplete dependencies'
            : 'All dependencies complete'}
        </div>
      )}
    </div>
  );
}
