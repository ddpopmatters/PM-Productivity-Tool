import React, { useState } from 'react';
import clsx from 'clsx';
import { addRevisionFeedback } from '../../../../services/landingPageRequests';

const FEEDBACK_OPTIONS = [
  { value: 'content_change', label: 'Content change' },
  { value: 'copy_edit', label: 'Copy edit' },
  { value: 'broken_element', label: 'Broken element' },
];

export default function RevisionFeedbackForm({ requestId, roundNumber, createdBy, onSubmitted }) {
  const [feedbackType, setFeedbackType] = useState('content_change');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!requestId || !createdBy) {
      setError('Your account details are missing, so feedback cannot be submitted yet.');
      return;
    }

    if (!description.trim()) {
      setError('Add the feedback you want the builder to address.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const created = await addRevisionFeedback(
        requestId,
        feedbackType,
        description.trim(),
        roundNumber,
        createdBy
      );

      if (!created) {
        setError('We could not save your revision feedback.');
        return;
      }

      setDescription('');
      setFeedbackType('content_change');
      await onSubmitted?.(created);
    } catch (err) {
      setError(err?.message || 'We could not save your revision feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-graystone-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
    >
      <h3 className="text-sm font-semibold text-ocean-900 dark:text-slate-100">Share revision feedback</h3>
      <p className="mt-2 text-sm text-graystone-700 dark:text-slate-300">
        Round {roundNumber} feedback goes straight into the revision history for this request.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-2">
        {FEEDBACK_OPTIONS.map((option) => {
          const checked = feedbackType === option.value;

          return (
            <label
              key={option.value}
              className={clsx(
                'cursor-pointer rounded-lg border px-3 py-2 transition-colors',
                checked
                  ? 'border-ocean-600 bg-ocean-50 text-ocean-900 dark:bg-ocean-500/10 dark:text-ocean-200'
                  : 'border-graystone-300 text-graystone-700 hover:bg-graystone-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800'
              )}
            >
              <input
                type="radio"
                name="feedbackType"
                value={option.value}
                checked={checked}
                onChange={(event) => setFeedbackType(event.target.value)}
                className="sr-only"
              />
              <span className="text-sm font-medium">{option.label}</span>
            </label>
          );
        })}
      </div>

      <label className="mt-4 block">
        <span className="text-sm font-medium text-graystone-800 dark:text-slate-200">Feedback</span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={4}
          className="mt-2 w-full rounded-lg border border-graystone-300 px-3 py-2 text-sm text-graystone-800 outline-none transition focus:border-ocean-600 focus:ring-2 focus:ring-ocean-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-ocean-500/20"
          placeholder="Describe the change needed for this revision round."
        />
      </label>

      {error && <p className="mt-3 text-sm text-rose-600 dark:text-rose-300">{error}</p>}

      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-ocean-600 px-4 py-2 text-white transition-colors hover:bg-ocean-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Submitting…' : 'Submit feedback'}
        </button>
      </div>
    </form>
  );
}
