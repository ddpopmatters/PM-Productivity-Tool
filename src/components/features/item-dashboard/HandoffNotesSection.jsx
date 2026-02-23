import { useState } from 'react';
import clsx from 'clsx';
import { Icon } from '../../ui';

export default function HandoffNotesSection({
  entry,
  canEdit,
  currentUser,
  USERS,
  onUpdateEntry,
  userProfilesCache,
  sendNotificationEmail,
}) {
  const [showHandoffForm, setShowHandoffForm] = useState(false);
  const [handoffContent, setHandoffContent] = useState('');
  const [handoffRecipient, setHandoffRecipient] = useState('');

  const addHandoffNote = () => {
    if (!handoffContent.trim() || !handoffRecipient.trim()) return;

    const newNote = {
      id: `hn${Date.now()}`,
      author: currentUser,
      forWhom: handoffRecipient,
      content: handoffContent.trim(),
      timestamp: new Date().toISOString(),
      acknowledged: false,
    };

    const existingNotes = entry.handoff_notes || [];
    onUpdateEntry(entry.id, { handoff_notes: [...existingNotes, newNote] });

    const profile = userProfilesCache.find(
      (p) => p.name.toLowerCase() === handoffRecipient.toLowerCase()
    );
    if (profile?.email) {
      sendNotificationEmail(profile.email, profile.name, 'comment', entry.title, entry.id, {
        comment: `Handoff note from ${currentUser}: ${handoffContent.substring(0, 150)}...`,
      });
    }

    setHandoffContent('');
    setHandoffRecipient('');
    setShowHandoffForm(false);
  };

  const acknowledgeHandoffNote = (noteId) => {
    const existingNotes = entry.handoff_notes || [];
    const updatedNotes = existingNotes.map((note) =>
      note.id === noteId
        ? { ...note, acknowledged: true, acknowledgedBy: currentUser, acknowledgedAt: new Date().toISOString() }
        : note
    );
    onUpdateEntry(entry.id, { handoff_notes: updatedNotes });
  };

  const deleteHandoffNote = (noteId) => {
    if (!confirm('Delete this handoff note?')) return;
    const existingNotes = entry.handoff_notes || [];
    onUpdateEntry(entry.id, { handoff_notes: existingNotes.filter((note) => note.id !== noteId) });
  };

  const recipientPool = Array.from(
    new Set([...(entry.collaborators || []), ...(entry.owner || []), ...USERS])
  ).filter(Boolean);

  return (
    <div className="bg-white rounded-3xl p-6 border border-ocean-100 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-ocean-900 flex items-center gap-2">
          <Icon name="repeat" className="w-5 h-5 text-purple-500" />
          Handoff Notes
        </h3>
        {canEdit && !showHandoffForm && (
          <button
            onClick={() => setShowHandoffForm(true)}
            className="px-3 py-1.5 text-sm font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Icon name="plus" className="w-4 h-4" />
            Add Note
          </button>
        )}
      </div>

      {showHandoffForm && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-4">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-graystone-500 uppercase tracking-wider mb-1 block">
                Handing off to *
              </label>
              <select
                value={handoffRecipient}
                onChange={(e) => setHandoffRecipient(e.target.value)}
                className="w-full px-3 py-2 border border-graystone-200 rounded-lg text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-100 bg-white"
              >
                <option value="">Select recipient...</option>
                {recipientPool.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-graystone-500 uppercase tracking-wider mb-1 block">
                Note *
              </label>
              <textarea
                value={handoffContent}
                onChange={(e) => setHandoffContent(e.target.value)}
                placeholder="What should they know? Include context, next steps, blockers..."
                className="w-full px-3 py-2 border border-graystone-200 rounded-lg text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-100 bg-white min-h-[100px]"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => { setShowHandoffForm(false); setHandoffContent(''); setHandoffRecipient(''); }}
                className="px-3 py-1.5 text-sm font-medium text-graystone-600 hover:text-graystone-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addHandoffNote}
                disabled={!handoffContent.trim() || !handoffRecipient.trim()}
                className="px-4 py-1.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Handoff Note
              </button>
            </div>
          </div>
        </div>
      )}

      {entry.handoff_notes && entry.handoff_notes.length > 0 ? (
        <div className="space-y-3">
          {entry.handoff_notes.slice().reverse().map((note) => (
            <div
              key={note.id}
              className={clsx(
                'p-4 rounded-xl border',
                note.acknowledged ? 'bg-graystone-50 border-graystone-200' : 'bg-purple-50 border-purple-200'
              )}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-sm font-bold">
                    {note.author ? note.author.charAt(0) : 'U'}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-graystone-900">{note.author}</div>
                    <div className="text-xs text-graystone-500">
                      <Icon name="arrow-right" className="w-3 h-3 inline mr-1" />
                      {note.forWhom}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-graystone-500">
                    {note.timestamp ? new Date(note.timestamp).toLocaleDateString() : ''}
                  </span>
                  {note.acknowledged && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                      <Icon name="check" className="w-3 h-3" />
                      Acknowledged
                    </span>
                  )}
                </div>
              </div>
              <p className="text-sm text-graystone-700 whitespace-pre-wrap mb-3">{note.content}</p>
              <div className="flex items-center justify-between">
                {!note.acknowledged && note.forWhom?.toLowerCase() === currentUser?.toLowerCase() && (
                  <button
                    onClick={() => acknowledgeHandoffNote(note.id)}
                    className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1.5"
                  >
                    <Icon name="check" className="w-3 h-3" />
                    Acknowledge
                  </button>
                )}
                {note.acknowledged && note.acknowledgedBy && (
                  <span className="text-xs text-graystone-500">
                    Acknowledged by {note.acknowledgedBy} on {new Date(note.acknowledgedAt).toLocaleDateString()}
                  </span>
                )}
                {!note.acknowledged && note.forWhom?.toLowerCase() !== currentUser?.toLowerCase() && (
                  <span className="text-xs text-purple-600 font-medium">Awaiting acknowledgement</span>
                )}
                {note.author?.toLowerCase() === currentUser?.toLowerCase() && (
                  <button
                    onClick={() => deleteHandoffNote(note.id)}
                    className="text-xs text-graystone-400 hover:text-red-500 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-graystone-500 text-center py-6">
          <Icon name="repeat" className="w-8 h-8 mx-auto mb-2 text-graystone-300" />
          <p>No handoff notes yet.</p>
          <p className="text-xs mt-1">Add notes to share context when handing over work.</p>
        </div>
      )}
    </div>
  );
}
