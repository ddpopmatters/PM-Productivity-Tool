import React, { useState } from 'react';
import clsx from 'clsx';
import Icon from '../../ui/Icon';

const CATEGORIES = [
  { id: 'conference', label: 'Conference' },
  { id: 'media', label: 'Media' },
  { id: 'campaign', label: 'Campaign Launch' },
  { id: 'publication', label: 'Publication' },
  { id: 'webinar', label: 'Webinar' },
  { id: 'partner', label: 'Partner Meeting' },
  { id: 'other', label: 'Other' },
];

const COLORS = [
  { id: 'ocean', bg: 'bg-ocean-500' },
  { id: 'green', bg: 'bg-green-500' },
  { id: 'purple', bg: 'bg-purple-500' },
  { id: 'orange', bg: 'bg-orange-500' },
  { id: 'pink', bg: 'bg-pink-500' },
  { id: 'teal', bg: 'bg-teal-500' },
  { id: 'red', bg: 'bg-red-500' },
];

const EventCreateModal = ({
  onClose,
  onSave,
  initialDate,
  entries = [],
  workstreams = [],
  existingEvent,
}) => {
  const isEdit = !!existingEvent;
  const [title, setTitle] = useState(existingEvent?.title || '');
  const [eventDate, setEventDate] = useState(existingEvent?.event_date || initialDate || '');
  const [endDate, setEndDate] = useState(existingEvent?.end_date || '');
  const [category, setCategory] = useState(existingEvent?.category || '');
  const [color, setColor] = useState(existingEvent?.color || 'ocean');
  const [location, setLocation] = useState(existingEvent?.location || '');
  const [description, setDescription] = useState(existingEvent?.description || '');
  const [linkedEntryId, setLinkedEntryId] = useState(existingEvent?.linked_entry_id || '');
  const [linkedWorkstreamId, setLinkedWorkstreamId] = useState(existingEvent?.linked_workstream_id || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !eventDate || saving) return;
    setSaving(true);
    await onSave({
      title: title.trim(),
      eventDate,
      endDate: endDate || null,
      category: category || null,
      color,
      location: location.trim() || null,
      description: description.trim() || null,
      linkedEntryId: linkedEntryId || null,
      linkedWorkstreamId: linkedWorkstreamId || null,
    });
    setSaving(false);
  };

  const activeProjects = entries.filter(e => !e.archived && e.itemType !== 'job');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-graystone-200">
          <h3 className="text-xl font-bold text-ocean-900">{isEdit ? 'Edit Event' : 'New Event'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-graystone-100 rounded-lg transition">
            <Icon name="x" className="w-5 h-5 text-graystone-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-graystone-700 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., COP31 Conference"
              className="w-full px-4 py-2 border border-graystone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
              autoFocus
              required
            />
          </div>

          {/* Date row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-graystone-700 mb-1">Date</label>
              <input
                type="date"
                value={eventDate}
                onChange={e => setEventDate(e.target.value)}
                className="w-full px-4 py-2 border border-graystone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-graystone-700 mb-1">End date <span className="text-graystone-400">(optional)</span></label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                min={eventDate}
                className="w-full px-4 py-2 border border-graystone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-graystone-700 mb-1">Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full px-4 py-2 border border-graystone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500 bg-white"
            >
              <option value="">No category</option>
              {CATEGORIES.map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-graystone-700 mb-1">Colour</label>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColor(c.id)}
                  aria-label={`${c.id} colour`}
                  className={clsx(
                    "w-8 h-8 rounded-full transition",
                    c.bg,
                    color === c.id ? "ring-2 ring-offset-2 ring-ocean-500" : ""
                  )}
                />
              ))}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-graystone-700 mb-1">Location <span className="text-graystone-400">(optional)</span></label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="e.g., London, Online"
              className="w-full px-4 py-2 border border-graystone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-graystone-700 mb-1">Description <span className="text-graystone-400">(optional)</span></label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Notes about this event..."
              className="w-full px-4 py-2 border border-graystone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
            />
          </div>

          {/* Link to project */}
          {activeProjects.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-graystone-700 mb-1">Link to project <span className="text-graystone-400">(optional)</span></label>
              <select
                value={linkedEntryId}
                onChange={e => setLinkedEntryId(e.target.value)}
                className="w-full px-4 py-2 border border-graystone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500 bg-white"
              >
                <option value="">None</option>
                {activeProjects.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
          )}

          {/* Link to workstream */}
          {workstreams.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-graystone-700 mb-1">Link to workstream <span className="text-graystone-400">(optional)</span></label>
              <select
                value={linkedWorkstreamId}
                onChange={e => setLinkedWorkstreamId(e.target.value)}
                className="w-full px-4 py-2 border border-graystone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500 bg-white"
              >
                <option value="">None</option>
                {workstreams.map(w => (
                  <option key={w.id} value={w.id}>{w.title}</option>
                ))}
              </select>
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-graystone-600 hover:bg-graystone-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || !eventDate || saving}
              className="px-4 py-2 bg-ocean-500 text-white rounded-lg hover:bg-ocean-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export { CATEGORIES, COLORS };
export default EventCreateModal;
