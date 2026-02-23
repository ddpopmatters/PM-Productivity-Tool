import { useState } from 'react';
import clsx from 'clsx';
import { Icon, Button, Badge } from '../../ui';

export default function ItemHeader({
  entry,
  canEdit,
  onBack,
  onUpdateEntry,
  onConvert,
  KANBAN_STATUSES,
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState(entry?.title || '');

  return (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack} className="rounded-full p-2 hover:bg-ocean-50">
          <Icon name="arrow-left" className="w-6 h-6 text-ocean-600" />
        </Button>
        <div>
          <div className="flex items-center gap-3">
            {editingTitle ? (
              <input
                type="text"
                value={editTitleValue}
                onChange={(e) => setEditTitleValue(e.target.value)}
                onBlur={() => {
                  if (editTitleValue.trim() && editTitleValue !== entry.title) {
                    onUpdateEntry(entry.id, { title: editTitleValue.trim() });
                  }
                  setEditingTitle(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.target.blur();
                  if (e.key === 'Escape') { setEditTitleValue(entry.title); setEditingTitle(false); }
                }}
                autoFocus
                className="text-3xl font-bold text-ocean-900 bg-transparent border-b-2 border-ocean-400 outline-none w-full"
              />
            ) : (
              <h1
                className={clsx('text-3xl font-bold text-ocean-900', canEdit && 'cursor-pointer hover:text-ocean-700 transition-colors')}
                onClick={() => canEdit && (setEditTitleValue(entry.title), setEditingTitle(true))}
                title={canEdit ? 'Click to edit title' : undefined}
              >
                {entry.title}
              </h1>
            )}
            {entry.archived && (
              <span className="px-3 py-1 bg-amber-100 text-amber-800 text-sm font-medium rounded-full flex items-center gap-1.5">
                <Icon name="archive" className="w-4 h-4" />
                Archived
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline">{entry.workflowStatus}</Badge>
            <span className="text-sm text-graystone-500">
              Created on {new Date(entry.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {canEdit && onConvert && (
          <button
            onClick={() => onConvert(entry, 'project')}
            className="px-4 py-3 rounded-xl border-2 bg-ocean-50 border-ocean-200 text-ocean-700 hover:bg-ocean-100 hover:border-ocean-300 font-medium transition-all flex items-center gap-2"
          >
            <Icon name="refresh-cw" className="w-5 h-5" />
            Convert
          </button>
        )}
        {canEdit && (
          <button
            onClick={() => onUpdateEntry(entry.id, { archived: !entry.archived })}
            className={clsx(
              'px-4 py-3 rounded-xl border-2 font-medium transition-all flex items-center gap-2',
              entry.archived
                ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100 hover:border-green-300'
                : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 hover:border-amber-300'
            )}
          >
            <Icon name={entry.archived ? 'archive-restore' : 'archive'} className="w-5 h-5" />
            {entry.archived ? 'Restore' : 'Archive'}
          </button>
        )}
        <select
          className="px-4 py-3 rounded-xl bg-white border-2 border-ocean-200 text-ocean-900 font-medium hover:border-ocean-400 focus:border-ocean-500 focus:outline-none transition-all cursor-pointer shadow-sm"
          value={entry.workflowStatus}
          onChange={(e) => onUpdateEntry(entry.id, { workflowStatus: e.target.value })}
        >
          {KANBAN_STATUSES.map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
