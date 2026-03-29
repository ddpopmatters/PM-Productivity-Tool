import React, { useState } from 'react';
import clsx from 'clsx';
import { FileText, Pencil, Plus, RefreshCcw, Trash2 } from 'lucide-react';
import Button from '../../ui/Button';
import Badge from '../../ui/Badge';

const FIELD_CLASSES =
  'w-full rounded-lg border border-graystone-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-aqua-200';

const PAGE_STATUS_META = {
  draft: { label: 'Draft', badge: 'neutral' },
  in_review: { label: 'In review', badge: 'info' },
  live: { label: 'Live', badge: 'success' },
  needs_update: { label: 'Needs update', badge: 'warning' },
};

function createBlankForm() {
  return {
    name: '',
    slug: '',
    description: '',
    owner_email: '',
    editor_email: '',
    reviewer_email: '',
    status: 'draft',
    review_interval_days: 180,
  };
}

function formatDate(dateValue) {
  if (!dateValue) return 'Not scheduled';
  return new Date(`${dateValue}T00:00:00`).toLocaleDateString();
}

function getReviewDateClass(dateValue) {
  if (!dateValue) return 'text-graystone-400';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${dateValue}T00:00:00`);
  const daysUntilDue = Math.ceil((due - today) / 86400000);

  if (daysUntilDue < 0) return 'font-medium text-red-600';
  if (daysUntilDue <= 30) return 'font-medium text-amber-600';
  return 'text-graystone-600';
}

function formatEmail(email) {
  return email || 'Unassigned';
}

export default function PageRegistry({ pages = [], isAdminUser, handlers, projectId }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [createForm, setCreateForm] = useState(createBlankForm());
  const [editingPageId, setEditingPageId] = useState(null);
  const [editForm, setEditForm] = useState(createBlankForm());
  const [reviewingPageId, setReviewingPageId] = useState(null);
  const [reviewNote, setReviewNote] = useState('');

  const handleCreate = async (event) => {
    event.preventDefault();
    const created = await handlers.handleCreatePage({
      ...createForm,
      project_id: projectId,
      review_interval_days: Number(createForm.review_interval_days || 180),
    });

    if (created) {
      setCreateForm(createBlankForm());
      setShowAddForm(false);
    }
  };

  const startEditing = (page) => {
    setEditingPageId(page.id);
    setEditForm({
      name: page.name || '',
      slug: page.slug || '',
      description: page.description || '',
      owner_email: page.owner_email || '',
      editor_email: page.editor_email || '',
      reviewer_email: page.reviewer_email || '',
      status: page.status || 'draft',
      review_interval_days: page.review_interval_days || 180,
    });
  };

  const saveEdit = async (pageId) => {
    const updated = await handlers.handleUpdatePage(pageId, {
      ...editForm,
      review_interval_days: Number(editForm.review_interval_days || 180),
    });

    if (updated) {
      setEditingPageId(null);
    }
  };

  const submitReview = async (pageId) => {
    const updated = await handlers.handleMarkPageReviewed(pageId, reviewNote);
    if (updated) {
      setReviewingPageId(null);
      setReviewNote('');
    }
  };

  return (
    <section className="rounded-2xl border border-graystone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-ocean-900">Page registry</h3>
          <p className="text-sm text-graystone-500">
            Ownership, review cadence, and live page health in one place.
          </p>
        </div>
        {isAdminUser ? (
          <Button size="sm" variant={showAddForm ? 'secondary' : 'solid'} onClick={() => setShowAddForm((prev) => !prev)}>
            <Plus className="h-4 w-4" />
            {showAddForm ? 'Close form' : 'Add page'}
          </Button>
        ) : null}
      </div>

      {isAdminUser && showAddForm ? (
        <form onSubmit={handleCreate} className="mt-5 rounded-xl border border-graystone-200 bg-graystone-50 p-4">
          <div className="mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-ocean-600" />
            <h4 className="text-sm font-semibold text-ocean-900">Add page</h4>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <input
              type="text"
              required
              value={createForm.name}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Page name"
              className={FIELD_CLASSES}
            />
            <input
              type="text"
              required
              value={createForm.slug}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, slug: event.target.value }))}
              placeholder="Slug"
              className={FIELD_CLASSES}
            />
            <input
              type="email"
              value={createForm.owner_email}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, owner_email: event.target.value }))}
              placeholder="Owner email"
              className={FIELD_CLASSES}
            />
            <input
              type="email"
              value={createForm.editor_email}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, editor_email: event.target.value }))}
              placeholder="Editor email"
              className={FIELD_CLASSES}
            />
            <input
              type="email"
              value={createForm.reviewer_email}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, reviewer_email: event.target.value }))}
              placeholder="Reviewer email"
              className={FIELD_CLASSES}
            />
            <input
              type="number"
              min="1"
              value={createForm.review_interval_days}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, review_interval_days: event.target.value }))
              }
              placeholder="Review interval days"
              className={FIELD_CLASSES}
            />
          </div>
          <textarea
            value={createForm.description}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, description: event.target.value }))}
            rows={3}
            placeholder="Description"
            className={clsx(FIELD_CLASSES, 'mt-3')}
          />
          <div className="mt-4 flex justify-end">
            <Button type="submit" size="sm">
              Save page
            </Button>
          </div>
        </form>
      ) : null}

      <div className="mt-5 overflow-x-auto">
        {pages.length === 0 ? (
          <div className="rounded-xl border border-dashed border-graystone-300 bg-graystone-50 px-4 py-8 text-center text-sm text-graystone-500">
            No pages yet, add the first page to start the registry.
          </div>
        ) : (
          <table className="w-full min-w-[980px]">
            <thead>
              <tr className="border-b border-graystone-200 text-left text-xs uppercase tracking-wide text-graystone-500">
                <th className="pb-3 pr-4 font-medium">Page name</th>
                <th className="pb-3 pr-4 font-medium">Slug</th>
                <th className="pb-3 pr-4 font-medium">Owner</th>
                <th className="pb-3 pr-4 font-medium">Editor</th>
                <th className="pb-3 pr-4 font-medium">Reviewer</th>
                <th className="pb-3 pr-4 font-medium">Status</th>
                <th className="pb-3 pr-4 font-medium">Next review due</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => {
                const pageStatus = PAGE_STATUS_META[page.status] || PAGE_STATUS_META.draft;

                return (
                  <React.Fragment key={page.id}>
                    <tr className="border-b border-graystone-100 align-top">
                      <td className="py-4 pr-4">
                        <div className="font-medium text-ocean-900">{page.name}</div>
                        {page.description ? (
                          <p className="mt-1 max-w-sm text-sm text-graystone-500">
                            {page.description}
                          </p>
                        ) : null}
                      </td>
                      <td className="py-4 pr-4 text-sm text-graystone-600">/{page.slug}</td>
                      <td className="py-4 pr-4 text-sm text-graystone-600">{formatEmail(page.owner_email)}</td>
                      <td className="py-4 pr-4 text-sm text-graystone-600">{formatEmail(page.editor_email)}</td>
                      <td className="py-4 pr-4 text-sm text-graystone-600">{formatEmail(page.reviewer_email)}</td>
                      <td className="py-4 pr-4">
                        <Badge variant={pageStatus.badge}>{pageStatus.label}</Badge>
                      </td>
                      <td className={clsx('py-4 pr-4 text-sm', getReviewDateClass(page.next_review_due))}>
                        {formatDate(page.next_review_due)}
                      </td>
                      <td className="py-4">
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => startEditing(page)}>
                            <Pencil className="h-4 w-4" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setReviewingPageId((prev) => (prev === page.id ? null : page.id))
                            }
                          >
                            <RefreshCcw className="h-4 w-4" />
                            Mark reviewed
                          </Button>
                          {isAdminUser ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="px-3 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                              onClick={() => {
                                if (window.confirm(`Delete ${page.name}?`)) {
                                  handlers.handleDeletePage(page.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>

                    {editingPageId === page.id ? (
                      <tr className="border-b border-graystone-100 bg-graystone-50">
                        <td colSpan={8} className="p-4">
                          <div className="grid gap-3 lg:grid-cols-2">
                            <input
                              type="text"
                              value={editForm.name}
                              onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))}
                              className={FIELD_CLASSES}
                            />
                            <input
                              type="text"
                              value={editForm.slug}
                              onChange={(event) => setEditForm((prev) => ({ ...prev, slug: event.target.value }))}
                              className={FIELD_CLASSES}
                            />
                            <input
                              type="email"
                              value={editForm.owner_email}
                              onChange={(event) => setEditForm((prev) => ({ ...prev, owner_email: event.target.value }))}
                              placeholder="Owner email"
                              className={FIELD_CLASSES}
                            />
                            <input
                              type="email"
                              value={editForm.editor_email}
                              onChange={(event) => setEditForm((prev) => ({ ...prev, editor_email: event.target.value }))}
                              placeholder="Editor email"
                              className={FIELD_CLASSES}
                            />
                            <input
                              type="email"
                              value={editForm.reviewer_email}
                              onChange={(event) => setEditForm((prev) => ({ ...prev, reviewer_email: event.target.value }))}
                              placeholder="Reviewer email"
                              className={FIELD_CLASSES}
                            />
                            <input
                              type="number"
                              min="1"
                              value={editForm.review_interval_days}
                              onChange={(event) =>
                                setEditForm((prev) => ({ ...prev, review_interval_days: event.target.value }))
                              }
                              className={FIELD_CLASSES}
                            />
                            <select
                              value={editForm.status}
                              onChange={(event) => setEditForm((prev) => ({ ...prev, status: event.target.value }))}
                              className={FIELD_CLASSES}
                            >
                              <option value="draft">Draft</option>
                              <option value="in_review">In review</option>
                              <option value="live">Live</option>
                              <option value="needs_update">Needs update</option>
                            </select>
                            <div />
                          </div>
                          <textarea
                            value={editForm.description}
                            onChange={(event) => setEditForm((prev) => ({ ...prev, description: event.target.value }))}
                            rows={3}
                            className={clsx(FIELD_CLASSES, 'mt-3')}
                          />
                          <div className="mt-4 flex flex-wrap justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => setEditingPageId(null)}>
                              Cancel
                            </Button>
                            <Button size="sm" onClick={() => saveEdit(page.id)}>
                              Save changes
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ) : null}

                    {reviewingPageId === page.id ? (
                      <tr className="border-b border-graystone-100 bg-aqua-50">
                        <td colSpan={8} className="p-4">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                            <div className="flex-1">
                              <label className="mb-2 block text-sm font-medium text-ocean-900">
                                Review note
                              </label>
                              <textarea
                                value={reviewNote}
                                onChange={(event) => setReviewNote(event.target.value)}
                                rows={2}
                                placeholder="What changed in this review?"
                                className={FIELD_CLASSES}
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => setReviewingPageId(null)}>
                                Cancel
                              </Button>
                              <Button size="sm" onClick={() => submitReview(page.id)}>
                                Save review
                              </Button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
