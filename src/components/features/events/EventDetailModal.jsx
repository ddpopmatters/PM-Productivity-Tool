import React, { useState } from 'react';
import clsx from 'clsx';
import Icon from '../../ui/Icon';
import { COLOR_CLASSES } from './EventChip';
import { CATEGORIES } from './EventCreateModal';

const EventDetailModal = ({
  event,
  onClose,
  onEdit,
  onDelete,
  entries = [],
  workstreams = [],
  onNavigateToEntry,
  onNavigateToWorkstream,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const colors = COLOR_CLASSES[event.color] || COLOR_CLASSES.ocean;
  const categoryLabel = CATEGORIES.find(c => c.id === event.category)?.label || event.category;
  const linkedEntry = event.linked_entry_id ? entries.find(e => e.id === event.linked_entry_id) : null;
  const linkedWorkstream = event.linked_workstream_id ? workstreams.find(w => w.id === event.linked_workstream_id) : null;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete(event.id);
    setDeleting(false);
  };

  const isMultiDay = event.end_date && event.end_date !== event.event_date;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        {/* Colour bar */}
        <div className={clsx("h-2 rounded-t-2xl", colors.bg)} />

        {/* Header */}
        <div className="p-6 pb-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold text-ocean-900">{event.title}</h3>
              {event.category && (
                <span className={clsx("inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium", colors.bg, colors.text)}>
                  {categoryLabel}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => onEdit(event)} className="p-2 hover:bg-graystone-100 rounded-lg transition" aria-label="Edit event">
                <Icon name="edit-2" className="w-4 h-4 text-graystone-500" />
              </button>
              <button onClick={onClose} className="p-2 hover:bg-graystone-100 rounded-lg transition" aria-label="Close">
                <Icon name="x" className="w-5 h-5 text-graystone-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-3">
          {/* Date */}
          <div className="flex items-center gap-2 text-sm">
            <Icon name="calendar" className="w-4 h-4 text-graystone-400" />
            <span className="text-ocean-900">
              {formatDate(event.event_date)}
              {isMultiDay && ` — ${formatDate(event.end_date)}`}
            </span>
          </div>

          {/* Location */}
          {event.location && (
            <div className="flex items-center gap-2 text-sm">
              <Icon name="map-pin" className="w-4 h-4 text-graystone-400" />
              <span className="text-ocean-900">{event.location}</span>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="pt-2">
              <p className="text-sm text-graystone-600 whitespace-pre-wrap">{event.description}</p>
            </div>
          )}

          {/* Linked project */}
          {linkedEntry && (
            <div className="flex items-center gap-2 text-sm pt-1">
              <Icon name="folder" className="w-4 h-4 text-graystone-400" />
              <button
                onClick={() => onNavigateToEntry && onNavigateToEntry(linkedEntry.id)}
                className="text-ocean-600 hover:text-ocean-700 hover:underline"
              >
                {linkedEntry.title}
              </button>
            </div>
          )}

          {/* Linked workstream */}
          {linkedWorkstream && (
            <div className="flex items-center gap-2 text-sm">
              <Icon name="layers" className="w-4 h-4 text-graystone-400" />
              <button
                onClick={() => onNavigateToWorkstream && onNavigateToWorkstream(linkedWorkstream.id)}
                className="text-ocean-600 hover:text-ocean-700 hover:underline"
              >
                {linkedWorkstream.title}
              </button>
            </div>
          )}

          {/* Footer meta */}
          <div className="pt-3 border-t border-graystone-200 text-xs text-graystone-400">
            Created by {event.created_by} on {new Date(event.created_at).toLocaleDateString('en-GB')}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-6 pb-6">
          {showDeleteConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-red-600">Delete this event?</span>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Yes, delete'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="px-3 py-1.5 text-graystone-600 text-sm hover:bg-graystone-100 rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-sm text-red-500 hover:text-red-600 transition"
            >
              Delete Event
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventDetailModal;
