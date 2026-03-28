import React, { useEffect, useState } from 'react';
import { updateBuilderNotes } from '../../../../services/landingPageRequests';

export default function BuilderNotesCard({ request, onUpdated }) {
  const [builderNotes, setBuilderNotes] = useState(request?.builder_notes || '');
  const [notesState, setNotesState] = useState('idle');

  useEffect(() => {
    setBuilderNotes(request?.builder_notes || '');
    setNotesState('idle');
  }, [request?.builder_notes, request?.id]);

  const handleNotesBlur = async () => {
    if ((request?.builder_notes || '') === builderNotes) return;

    setNotesState('saving');
    const updated = await updateBuilderNotes(request.id, builderNotes);

    if (!updated) {
      setNotesState('error');
      return;
    }

    await onUpdated?.(updated);
    setNotesState('saved');
  };

  return (
    <div className="rounded-xl border border-graystone-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h2 className="text-base font-semibold text-ocean-900 dark:text-slate-100">Builder notes</h2>
      <textarea
        value={builderNotes}
        onChange={(event) => setBuilderNotes(event.target.value)}
        onBlur={handleNotesBlur}
        rows={5}
        className="mt-3 w-full rounded-lg border border-graystone-300 px-3 py-2 text-sm text-graystone-800 outline-none transition focus:border-ocean-600 focus:ring-2 focus:ring-ocean-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-ocean-500/20"
        placeholder="Add internal notes for the build team."
      />
      {notesState === 'saving' && (
        <p className="mt-2 text-sm text-graystone-600 dark:text-slate-400">Saving notes…</p>
      )}
      {notesState === 'saved' && (
        <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-300">Notes saved.</p>
      )}
      {notesState === 'error' && (
        <p className="mt-2 text-sm text-rose-600 dark:text-rose-300">We could not save those notes.</p>
      )}
    </div>
  );
}
