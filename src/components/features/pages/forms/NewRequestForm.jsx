import React, { useMemo, useState } from 'react';
import clsx from 'clsx';
import { createRequest, uploadRequestFile } from '../../../../services/landingPageRequests';

const PAGE_TYPE_OPTIONS = [
  { value: 'appeal', label: 'Appeal' },
  { value: 'evergreen', label: 'Evergreen' },
  { value: 'expedited', label: 'Expedited' },
];

const PAGE_GOAL_OPTIONS = [
  { value: 'donate', label: 'Donate' },
  { value: 'signup', label: 'Signup' },
  { value: 'share', label: 'Share' },
  { value: 'other', label: 'Other' },
];

const ASSET_OPTIONS = [
  { value: 'attached', label: 'Attached' },
  { value: 'owner_pending', label: 'Owner pending' },
];

function subtractWorkingDays(date, n) {
  const d = new Date(date);
  let removed = 0;
  while (removed < n) {
    d.setDate(d.getDate() - 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) removed++;
  }
  return d;
}

function getTimelineMilestones(goLiveDate) {
  // Standard 28-working-day turnaround
  const offsets = [28, 20, 14, 7, 3, 0];
  const labels = ['Brief confirmed', 'Build starts', 'First draft', 'Revision 1', 'Revision 2', 'Go-live'];
  return labels.map((label, i) => ({
    label,
    date: offsets[i] === 0 ? goLiveDate : subtractWorkingDays(goLiveDate, offsets[i]),
    isLive: offsets[i] === 0,
  }));
}

function getTodayString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = `${today.getMonth() + 1}`.padStart(2, '0');
  const day = `${today.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addWorkingDays(date, workingDays) {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);

  let addedDays = 0;
  while (addedDays < workingDays) {
    nextDate.setDate(nextDate.getDate() + 1);
    const day = nextDate.getDay();
    if (day !== 0 && day !== 6) {
      addedDays += 1;
    }
  }

  return nextDate;
}

function formatDate(dateValue) {
  return dateValue.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function parseDateInput(value) {
  return value ? new Date(`${value}T00:00:00`) : null;
}

function RadioCards({ name, options, value, onChange }) {
  return (
    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
      {options.map((option) => {
        const checked = value === option.value;

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
              name={name}
              value={option.value}
              checked={checked}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            <span className="text-sm font-medium">{option.label}</span>
          </label>
        );
      })}
    </div>
  );
}

export default function NewRequestForm({ userId, userEmail, onSubmitted, onCancel }) {
  const [formData, setFormData] = useState({
    title: '',
    pageType: 'appeal',
    pageGoal: 'donate',
    audience: '',
    keyMessages: '',
    pricePoints: [{ amount: '', description: '' }],
    suggestedHeadline: '',
    copyStatus: 'attached',
    copyOwner: '',
    copyDueDate: '',
    assetStatus: 'attached',
    assetOwner: '',
    assetDueDate: '',
    goLiveDate: '',
    expeditedJustification: '',
    namedApprover: '',
    revisionRoundsAgreed: 2,
    extendedRoundsReason: '',
    documentLinks: [{ url: '', label: '' }],
  });
  const [pendingFiles, setPendingFiles] = useState([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const minimumWorkingDays = useMemo(() => {
    if (formData.pageType === 'appeal') return 10;
    if (formData.pageType === 'evergreen') return 15;
    return 0;
  }, [formData.pageType]);

  const earliestRecommendedDate = useMemo(() => {
    if (!minimumWorkingDays) return null;
    return addWorkingDays(new Date(), minimumWorkingDays);
  }, [minimumWorkingDays]);

  const updateField = (field, value) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const addPricePoint = () =>
    updateField('pricePoints', [...formData.pricePoints, { amount: '', description: '' }]);

  const removePricePoint = (index) =>
    updateField(
      'pricePoints',
      formData.pricePoints.filter((_, i) => i !== index)
    );

  const updatePricePoint = (index, key, value) => {
    const next = formData.pricePoints.map((pricePoint, i) =>
      i === index ? { ...pricePoint, [key]: value } : pricePoint
    );
    updateField('pricePoints', next);
  };

  const validate = () => {
    if (!userId || !userEmail) return 'Your account details are missing, so this request cannot be submitted yet.';
    if (!formData.title.trim()) return 'Add a title for the request.';
    if (!formData.audience.trim()) return 'Add the audience for this page.';
    if (!formData.goLiveDate) return 'Choose a go-live date.';
    if (!formData.namedApprover.trim()) return 'Add the named approver.';

    if (formData.copyStatus === 'owner_pending' && (!formData.copyOwner.trim() || !formData.copyDueDate)) {
      return 'Add both a copy owner and copy due date when copy is owner pending.';
    }

    if (formData.assetStatus === 'owner_pending' && (!formData.assetOwner.trim() || !formData.assetDueDate)) {
      return 'Add both an asset owner and asset due date when assets are owner pending.';
    }

    if (formData.pageType === 'expedited' && !formData.expeditedJustification.trim()) {
      return 'Explain why this request needs expedited handling.';
    }

    if (minimumWorkingDays) {
      const selectedDate = parseDateInput(formData.goLiveDate);
      if (selectedDate && earliestRecommendedDate && selectedDate < earliestRecommendedDate) {
        return `Choose a go-live date at least ${minimumWorkingDays} working days away for this request type.`;
      }
    }

    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const created = await createRequest(
        {
          ...formData,
          title: formData.title.trim(),
          audience: formData.audience.trim(),
          keyMessages: formData.keyMessages.trim() || null,
          pricePoints:
            formData.pageGoal === 'donate'
              ? formData.pricePoints
                  .filter((pricePoint) => pricePoint.amount.trim())
                  .map((pricePoint) => ({
                    amount: pricePoint.amount.trim(),
                    description: pricePoint.description.trim(),
                  }))
              : [],
          suggestedHeadline: formData.suggestedHeadline.trim() || null,
          copyOwner: formData.copyStatus === 'owner_pending' ? formData.copyOwner.trim() : '',
          copyDueDate: formData.copyStatus === 'owner_pending' ? formData.copyDueDate : '',
          assetOwner: formData.assetStatus === 'owner_pending' ? formData.assetOwner.trim() : '',
          assetDueDate: formData.assetStatus === 'owner_pending' ? formData.assetDueDate : '',
          expeditedJustification:
            formData.pageType === 'expedited' ? formData.expeditedJustification.trim() : '',
          namedApprover: formData.namedApprover.trim(),
          revisionRoundsAgreed: Number(formData.revisionRoundsAgreed),
          extendedRoundsReason:
            Number(formData.revisionRoundsAgreed) === 3 ? formData.extendedRoundsReason.trim() : '',
          documentLinks: formData.documentLinks.filter(l => l.url.trim()),
        },
        userId,
        userEmail
      );

      if (!created) {
        setError('We could not create the request right now.');
        return;
      }

      // Upload any pending files
      await Promise.all(
        pendingFiles.map(file => uploadRequestFile(file, created.id, userId))
      );

      await onSubmitted?.(created);
    } catch (err) {
      setError(err?.message || 'We could not create the request right now.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-xl border border-graystone-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <p className="text-sm text-graystone-700 dark:text-slate-300">
          Submitting as <span className="font-medium text-ocean-900 dark:text-slate-100">{userEmail || 'Unknown user'}</span>
        </p>
      </div>

      <div className="rounded-xl border border-graystone-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h3 className="text-sm font-semibold text-ocean-900 dark:text-slate-100">Brief</h3>

        <label className="mt-4 block">
          <span className="text-sm font-medium text-graystone-800 dark:text-slate-200">Title</span>
          <input
            type="text"
            value={formData.title}
            onChange={(event) => updateField('title', event.target.value)}
            className="mt-2 w-full rounded-lg border border-graystone-300 px-3 py-2 text-sm text-graystone-800 outline-none transition focus:border-ocean-600 focus:ring-2 focus:ring-ocean-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-ocean-500/20"
            placeholder="Give the page request a clear title"
          />
        </label>

        <div className="mt-4">
          <span className="text-sm font-medium text-graystone-800 dark:text-slate-200">Page type</span>
          <RadioCards
            name="pageType"
            options={PAGE_TYPE_OPTIONS}
            value={formData.pageType}
            onChange={(value) => updateField('pageType', value)}
          />
        </div>

        <div className="mt-4">
          <span className="text-sm font-medium text-graystone-800 dark:text-slate-200">Page goal</span>
          <RadioCards
            name="pageGoal"
            options={PAGE_GOAL_OPTIONS}
            value={formData.pageGoal}
            onChange={(value) => updateField('pageGoal', value)}
          />
        </div>

        <label className="mt-4 block">
          <span className="text-sm font-medium text-graystone-800 dark:text-slate-200">Audience</span>
          <textarea
            value={formData.audience}
            onChange={(event) => updateField('audience', event.target.value)}
            rows={4}
            className="mt-2 w-full rounded-lg border border-graystone-300 px-3 py-2 text-sm text-graystone-800 outline-none transition focus:border-ocean-600 focus:ring-2 focus:ring-ocean-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-ocean-500/20"
            placeholder="Who is this page for and what should resonate with them?"
          />
        </label>
      </div>

      <div className="rounded-xl border border-graystone-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h3 className="text-sm font-semibold text-ocean-900 dark:text-slate-100">Copy brief</h3>

        <label className="mt-4 block">
          <span className="text-sm font-medium text-graystone-800 dark:text-slate-200">Key messages</span>
          <textarea
            value={formData.keyMessages}
            onChange={(event) => updateField('keyMessages', event.target.value)}
            rows={4}
            className="mt-2 w-full rounded-lg border border-graystone-300 px-3 py-2 text-sm text-graystone-800 outline-none transition focus:border-ocean-600 focus:ring-2 focus:ring-ocean-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-ocean-500/20"
            placeholder="What are the 2–3 core things this page must communicate? List each message on a new line."
          />
        </label>

        {formData.pageGoal === 'donate' && (
          <div className="mt-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-graystone-800 dark:text-slate-200">Price points</span>
              <button
                type="button"
                onClick={addPricePoint}
                className="text-xs font-medium text-ocean-600 hover:text-ocean-800 dark:text-ocean-300"
              >
                Add price point
              </button>
            </div>
            <div className="mt-3 space-y-3">
              {formData.pricePoints.map((pricePoint, index) => (
                <div key={index} className="flex flex-col gap-2 sm:flex-row sm:items-start">
                  <input
                    type="text"
                    value={pricePoint.amount}
                    onChange={(event) => updatePricePoint(index, 'amount', event.target.value)}
                    placeholder="e.g. £10"
                    className="w-full rounded-lg border border-graystone-300 px-3 py-2 text-sm text-graystone-800 outline-none transition focus:border-ocean-600 focus:ring-2 focus:ring-ocean-100 sm:w-40 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-ocean-500/20"
                  />
                  <input
                    type="text"
                    value={pricePoint.description}
                    onChange={(event) => updatePricePoint(index, 'description', event.target.value)}
                    placeholder="e.g. Plants 10 trees"
                    className="flex-1 rounded-lg border border-graystone-300 px-3 py-2 text-sm text-graystone-800 outline-none transition focus:border-ocean-600 focus:ring-2 focus:ring-ocean-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-ocean-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => removePricePoint(index)}
                    className="rounded-lg border border-graystone-300 px-3 py-2 text-sm text-graystone-600 transition hover:border-rose-300 hover:text-rose-600 dark:border-slate-600 dark:text-slate-300"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <label className="mt-4 block">
          <span className="text-sm font-medium text-graystone-800 dark:text-slate-200">Suggested headline</span>
          <input
            type="text"
            value={formData.suggestedHeadline}
            onChange={(event) => updateField('suggestedHeadline', event.target.value)}
            className="mt-2 w-full rounded-lg border border-graystone-300 px-3 py-2 text-sm text-graystone-800 outline-none transition focus:border-ocean-600 focus:ring-2 focus:ring-ocean-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-ocean-500/20"
            placeholder="Any headline ideas or requirements? (optional)"
          />
        </label>

      </div>

      <div className="rounded-xl border border-graystone-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h3 className="text-sm font-semibold text-ocean-900 dark:text-slate-100">Assets</h3>

        <div className="mt-4">
          <span className="text-sm font-medium text-graystone-800 dark:text-slate-200">Copy status</span>
          <RadioCards
            name="copyStatus"
            options={ASSET_OPTIONS}
            value={formData.copyStatus}
            onChange={(value) => updateField('copyStatus', value)}
          />
        </div>

        {formData.copyStatus === 'owner_pending' && (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-graystone-800 dark:text-slate-200">Copy owner</span>
              <input
                type="text"
                value={formData.copyOwner}
                onChange={(event) => updateField('copyOwner', event.target.value)}
                className="mt-2 w-full rounded-lg border border-graystone-300 px-3 py-2 text-sm text-graystone-800 outline-none transition focus:border-ocean-600 focus:ring-2 focus:ring-ocean-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-ocean-500/20"
                placeholder="Who owns the copy?"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-graystone-800 dark:text-slate-200">Copy due date</span>
              <input
                type="date"
                value={formData.copyDueDate}
                min={getTodayString()}
                onChange={(event) => updateField('copyDueDate', event.target.value)}
                className="mt-2 w-full rounded-lg border border-graystone-300 px-3 py-2 text-sm text-graystone-800 outline-none transition focus:border-ocean-600 focus:ring-2 focus:ring-ocean-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-ocean-500/20"
              />
            </label>
          </div>
        )}

        <div className="mt-4">
          <span className="text-sm font-medium text-graystone-800 dark:text-slate-200">Asset status</span>
          <RadioCards
            name="assetStatus"
            options={ASSET_OPTIONS}
            value={formData.assetStatus}
            onChange={(value) => updateField('assetStatus', value)}
          />
        </div>

        {formData.assetStatus === 'owner_pending' && (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-graystone-800 dark:text-slate-200">Asset owner</span>
              <input
                type="text"
                value={formData.assetOwner}
                onChange={(event) => updateField('assetOwner', event.target.value)}
                className="mt-2 w-full rounded-lg border border-graystone-300 px-3 py-2 text-sm text-graystone-800 outline-none transition focus:border-ocean-600 focus:ring-2 focus:ring-ocean-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-ocean-500/20"
                placeholder="Who owns the assets?"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-graystone-800 dark:text-slate-200">Asset due date</span>
              <input
                type="date"
                value={formData.assetDueDate}
                min={getTodayString()}
                onChange={(event) => updateField('assetDueDate', event.target.value)}
                className="mt-2 w-full rounded-lg border border-graystone-300 px-3 py-2 text-sm text-graystone-800 outline-none transition focus:border-ocean-600 focus:ring-2 focus:ring-ocean-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-ocean-500/20"
              />
            </label>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-graystone-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h3 className="text-sm font-semibold text-ocean-900 dark:text-slate-100">Schedule</h3>

        <label className="mt-4 block">
          <span className="text-sm font-medium text-graystone-800 dark:text-slate-200">Go-live date</span>
          <input
            type="date"
            value={formData.goLiveDate}
            min={getTodayString()}
            onChange={(event) => updateField('goLiveDate', event.target.value)}
            className="mt-2 w-full rounded-lg border border-graystone-300 px-3 py-2 text-sm text-graystone-800 outline-none transition focus:border-ocean-600 focus:ring-2 focus:ring-ocean-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-ocean-500/20"
          />
          <p className="mt-2 text-xs text-graystone-600 dark:text-slate-400">
            Minimum 10 working days for appeals, 15 for evergreen.
            {earliestRecommendedDate ? ` Earliest suggested date: ${formatDate(earliestRecommendedDate)}.` : ''}
          </p>
        </label>

        {formData.pageType === 'expedited' && (
          <label className="mt-4 block">
            <span className="text-sm font-medium text-graystone-800 dark:text-slate-200">Expedited justification</span>
            <textarea
              value={formData.expeditedJustification}
              onChange={(event) => updateField('expeditedJustification', event.target.value)}
              rows={3}
              className="mt-2 w-full rounded-lg border border-graystone-300 px-3 py-2 text-sm text-graystone-800 outline-none transition focus:border-ocean-600 focus:ring-2 focus:ring-ocean-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-ocean-500/20"
              placeholder="Explain why this request needs to move faster than the standard lead time."
            />
          </label>
        )}
      </div>

      <div className="rounded-xl border border-graystone-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h3 className="text-sm font-semibold text-ocean-900 dark:text-slate-100">Governance</h3>

        <label className="mt-4 block">
          <span className="text-sm font-medium text-graystone-800 dark:text-slate-200">Approval owner</span>
          <input
            type="text"
            value={formData.namedApprover}
            onChange={(event) => updateField('namedApprover', event.target.value)}
            className="mt-2 w-full rounded-lg border border-graystone-300 px-3 py-2 text-sm text-graystone-800 outline-none transition focus:border-ocean-600 focus:ring-2 focus:ring-ocean-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-ocean-500/20"
            placeholder="Who is responsible for approvals on this page?"
          />
        </label>

        <div className="mt-4">
          <span className="text-sm font-medium text-graystone-800 dark:text-slate-200">Project timeline</span>
          {parseDateInput(formData.goLiveDate) ? (
            <ol className="mt-3 space-y-0">
              {getTimelineMilestones(parseDateInput(formData.goLiveDate)).map((milestone, i, arr) => (
                <li key={milestone.label} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`mt-0.5 h-2.5 w-2.5 rounded-full border-2 ${milestone.isLive ? 'border-ocean-600 bg-ocean-600' : 'border-graystone-400 bg-white dark:border-slate-500 dark:bg-slate-900'}`} />
                    {i < arr.length - 1 && <div className="w-px flex-1 bg-graystone-200 dark:bg-slate-700" style={{ minHeight: '20px' }} />}
                  </div>
                  <div className="pb-4 last:pb-0">
                    <span className={`text-sm font-medium ${milestone.isLive ? 'text-ocean-700 dark:text-ocean-300' : 'text-graystone-800 dark:text-slate-200'}`}>{milestone.label}</span>
                    <span className="ml-2 text-xs text-graystone-500 dark:text-slate-400">{formatDate(milestone.date)}</span>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-2 text-sm text-graystone-500 dark:text-slate-400">Set a go-live date above to see the project timeline.</p>
          )}
        </div>
      </div>

      {/* Document links */}
      <div className="rounded-xl border border-graystone-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ocean-900 dark:text-slate-100">Document links</h3>
          <button
            type="button"
            onClick={() => updateField('documentLinks', [...formData.documentLinks, { url: '', label: '' }])}
            className="text-xs font-medium text-ocean-600 hover:text-ocean-800 dark:text-ocean-300"
          >
            + Add link
          </button>
        </div>
        <p className="mt-1 text-xs text-graystone-500 dark:text-slate-400">Google Docs, Dropbox, Figma, or any shared resource.</p>
        <div className="mt-3 space-y-2">
          {formData.documentLinks.map((link, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                type="url"
                value={link.url}
                onChange={e => {
                  const next = formData.documentLinks.map((l, i) => i === idx ? { ...l, url: e.target.value } : l);
                  updateField('documentLinks', next);
                }}
                placeholder="https://docs.google.com/..."
                className="flex-1 rounded-lg border border-graystone-300 px-3 py-2 text-sm text-graystone-800 outline-none transition focus:border-ocean-600 focus:ring-2 focus:ring-ocean-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-ocean-500/20"
              />
              <input
                type="text"
                value={link.label}
                onChange={e => {
                  const next = formData.documentLinks.map((l, i) => i === idx ? { ...l, label: e.target.value } : l);
                  updateField('documentLinks', next);
                }}
                placeholder="Label (optional)"
                className="w-32 rounded-lg border border-graystone-300 px-3 py-2 text-sm text-graystone-800 outline-none transition focus:border-ocean-600 focus:ring-2 focus:ring-ocean-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-ocean-500/20"
              />
              {formData.documentLinks.length > 1 && (
                <button
                  type="button"
                  onClick={() => updateField('documentLinks', formData.documentLinks.filter((_, i) => i !== idx))}
                  className="px-2 text-graystone-400 hover:text-rose-500"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* File attachments */}
      <div className="rounded-xl border border-graystone-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h3 className="text-sm font-semibold text-ocean-900 dark:text-slate-100">File attachments</h3>
        <p className="mt-1 text-xs text-graystone-500 dark:text-slate-400">Copy docs, images, brand assets — uploaded when you submit.</p>
        <label className="mt-3 flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-graystone-300 px-4 py-3 text-sm text-graystone-600 hover:border-ocean-400 hover:text-ocean-700 dark:border-slate-600 dark:text-slate-400">
          <input
            type="file"
            multiple
            className="sr-only"
            onChange={e => setPendingFiles(prev => [...prev, ...Array.from(e.target.files)])}
          />
          Choose files
        </label>
        {pendingFiles.length > 0 && (
          <ul className="mt-3 space-y-2">
            {pendingFiles.map((file, idx) => (
              <li key={idx} className="flex items-center gap-3 rounded-lg border border-graystone-200 p-2 dark:border-slate-700">
                {file.type.startsWith('image/') ? (
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="h-12 w-12 shrink-0 rounded object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-graystone-100 text-xs font-medium uppercase text-graystone-500 dark:bg-slate-800 dark:text-slate-400">
                    {file.name.split('.').pop()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-graystone-800 dark:text-slate-200">{file.name}</p>
                  <p className="text-xs text-graystone-400 dark:text-slate-500">{(file.size / 1024).toFixed(0)} KB</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingFiles(prev => prev.filter((_, i) => i !== idx))}
                  className="shrink-0 text-graystone-400 hover:text-rose-500"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>}

      <div className="flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-graystone-300 px-4 py-2 text-graystone-700 transition-colors hover:bg-graystone-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-ocean-600 px-4 py-2 text-white transition-colors hover:bg-ocean-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Submitting…' : 'Submit request'}
        </button>
      </div>
    </form>
  );
}
