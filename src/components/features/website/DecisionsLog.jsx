import React, { useMemo, useState } from 'react';
import clsx from 'clsx';
import { ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react';
import Button from '../../ui/Button';
import Badge from '../../ui/Badge';

const FIELD_CLASSES =
  'w-full rounded-lg border border-graystone-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-aqua-200';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'deferred', label: 'Deferred' },
  { id: 'decided', label: 'Decided' },
];

const STATUS_META = {
  open: { label: 'Open', badge: 'warning' },
  deferred: { label: 'Deferred', badge: 'neutral' },
  decided: { label: 'Decided', badge: 'success' },
};

function createBlankDecisionForm(ownerEmail = '') {
  return {
    title: '',
    description: '',
    owner_email: ownerEmail,
    due_date: '',
    status: 'open',
    related_page_ids: [],
    outcome: '',
  };
}

function formatDate(dateValue) {
  if (!dateValue) return 'No date';
  return new Date(`${dateValue}T00:00:00`).toLocaleDateString();
}

function isOverdue(dateValue) {
  if (!dateValue) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(`${dateValue}T00:00:00`);
  return dueDate < today;
}

function getSelectedValues(event) {
  return Array.from(event.target.selectedOptions).map((option) => option.value);
}

export default function DecisionsLog({
  decisions = [],
  pages = [],
  isAdminUser,
  userEmail,
  handlers,
}) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState(() => createBlankDecisionForm(userEmail));
  const [editingDecisionId, setEditingDecisionId] = useState(null);
  const [editForm, setEditForm] = useState(() => createBlankDecisionForm(userEmail));
  const [expandedDecisionId, setExpandedDecisionId] = useState(null);
  const [decidingDecisionId, setDecidingDecisionId] = useState(null);
  const [decisionOutcome, setDecisionOutcome] = useState('');

  const projectId = decisions[0]?.project_id || pages[0]?.project_id || null;

  const pageMap = useMemo(
    () => new Map(pages.map((page) => [page.id, page])),
    [pages]
  );

  const filteredDecisions = useMemo(() => {
    if (activeFilter === 'all') return decisions;
    return decisions.filter((decision) => decision.status === activeFilter);
  }, [activeFilter, decisions]);

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!projectId) return;

    const created = await handlers.handleCreateDecision({
      ...createForm,
      project_id: projectId,
      due_date: createForm.due_date || null,
      related_page_ids: createForm.related_page_ids,
      outcome: createForm.status === 'decided' ? createForm.outcome.trim() : null,
    });

    if (created) {
      setCreateForm(createBlankDecisionForm(userEmail));
      setShowCreateForm(false);
    }
  };

  const startEditing = (decision) => {
    setEditingDecisionId(decision.id);
    setEditForm({
      title: decision.title || '',
      description: decision.description || '',
      owner_email: decision.owner_email || '',
      due_date: decision.due_date || '',
      status: decision.status || 'open',
      related_page_ids: decision.related_page_ids || [],
      outcome: decision.outcome || '',
    });
  };

  const saveEdit = async (decisionId) => {
    const updated = await handlers.handleUpdateDecision(decisionId, {
      ...editForm,
      due_date: editForm.due_date || null,
      related_page_ids: editForm.related_page_ids,
      outcome: editForm.status === 'decided' ? editForm.outcome.trim() || null : null,
    });

    if (updated) {
      setEditingDecisionId(null);
    }
  };

  const confirmDecided = async (decisionId) => {
    const updated = await handlers.handleUpdateDecision(decisionId, {
      status: 'decided',
      outcome: decisionOutcome.trim(),
    });

    if (updated) {
      setDecidingDecisionId(null);
      setDecisionOutcome('');
    }
  };

  return (
    <section className="rounded-2xl border border-graystone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-ocean-900">Decisions log</h3>
          <p className="text-sm text-graystone-500">
            Track questions, owners, and outcomes before launch.
          </p>
        </div>
        <Button
          size="sm"
          variant={showCreateForm ? 'secondary' : 'solid'}
          onClick={() => setShowCreateForm((previous) => !previous)}
        >
          <Plus className="h-4 w-4" />
          {showCreateForm ? 'Close form' : 'Add decision'}
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => setActiveFilter(filter.id)}
            className={clsx(
              'rounded-full px-4 py-2 text-sm transition',
              activeFilter === filter.id
                ? 'bg-ocean-600 text-white shadow-sm'
                : 'bg-graystone-100 text-graystone-600 hover:bg-graystone-200'
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {showCreateForm ? (
        <form
          onSubmit={handleCreate}
          className="mt-5 rounded-xl border border-graystone-200 bg-graystone-50 p-4"
        >
          <div className="grid gap-3 lg:grid-cols-2">
            <input
              type="text"
              required
              value={createForm.title}
              onChange={(event) => setCreateForm((previous) => ({ ...previous, title: event.target.value }))}
              placeholder="Decision title"
              className={FIELD_CLASSES}
            />
            <input
              type="email"
              value={createForm.owner_email}
              onChange={(event) => setCreateForm((previous) => ({ ...previous, owner_email: event.target.value }))}
              placeholder="Owner email"
              className={FIELD_CLASSES}
            />
            <input
              type="date"
              value={createForm.due_date}
              onChange={(event) => setCreateForm((previous) => ({ ...previous, due_date: event.target.value }))}
              className={FIELD_CLASSES}
            />
            <select
              value={createForm.status}
              onChange={(event) => setCreateForm((previous) => ({ ...previous, status: event.target.value }))}
              className={FIELD_CLASSES}
            >
              <option value="open">Open</option>
              <option value="deferred">Deferred</option>
              <option value="decided">Decided</option>
            </select>
          </div>

          <textarea
            value={createForm.description}
            onChange={(event) => setCreateForm((previous) => ({ ...previous, description: event.target.value }))}
            rows={3}
            placeholder="Description"
            className={clsx(FIELD_CLASSES, 'mt-3')}
          />

          <label className="mt-3 block text-sm font-medium text-ocean-900">
            Related pages
          </label>
          <select
            multiple
            value={createForm.related_page_ids}
            onChange={(event) =>
              setCreateForm((previous) => ({
                ...previous,
                related_page_ids: getSelectedValues(event),
              }))
            }
            className={clsx(FIELD_CLASSES, 'mt-2 min-h-[140px]')}
          >
            {pages.map((page) => (
              <option key={page.id} value={page.id}>
                {page.name}
              </option>
            ))}
          </select>

          {createForm.status === 'decided' ? (
            <textarea
              value={createForm.outcome}
              onChange={(event) => setCreateForm((previous) => ({ ...previous, outcome: event.target.value }))}
              rows={2}
              placeholder="Outcome"
              className={clsx(FIELD_CLASSES, 'mt-3')}
            />
          ) : null}

          <div className="mt-4 flex justify-end">
            <Button type="submit" size="sm" disabled={!projectId}>
              Save decision
            </Button>
          </div>
        </form>
      ) : null}

      <div className="mt-5 overflow-x-auto">
        {filteredDecisions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-graystone-300 bg-graystone-50 px-4 py-8 text-center text-sm text-graystone-500">
            No open decisions — add questions that need resolving before launch.
          </div>
        ) : (
          <table className="w-full min-w-[1180px]">
            <thead>
              <tr className="border-b border-graystone-200 text-left text-xs uppercase tracking-wide text-graystone-500">
                <th className="pb-3 pr-4 font-medium">Title</th>
                <th className="pb-3 pr-4 font-medium">Owner</th>
                <th className="pb-3 pr-4 font-medium">Due date</th>
                <th className="pb-3 pr-4 font-medium">Status</th>
                <th className="pb-3 pr-4 font-medium">Related pages</th>
                <th className="pb-3 pr-4 font-medium">Outcome</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredDecisions.map((decision) => {
                const relatedPages = (decision.related_page_ids || [])
                  .map((pageId) => pageMap.get(pageId))
                  .filter(Boolean);
                const status = STATUS_META[decision.status] || STATUS_META.open;
                const showOutcome = decision.status === 'decided' && decision.outcome;
                const isExpanded = expandedDecisionId === decision.id;
                const isDueSoon = decision.status === 'open' && isOverdue(decision.due_date);

                return (
                  <React.Fragment key={decision.id}>
                    <tr className="border-b border-graystone-100 align-top">
                      <td className="py-4 pr-4">
                        <div className="font-medium text-ocean-900">{decision.title}</div>
                        {decision.description ? (
                          <p className="mt-1 max-w-sm text-sm text-graystone-500">
                            {decision.description}
                          </p>
                        ) : null}
                      </td>
                      <td className="py-4 pr-4 text-sm text-graystone-600">
                        {decision.owner_email || 'Unassigned'}
                      </td>
                      <td
                        className={clsx(
                          'py-4 pr-4 text-sm',
                          isDueSoon ? 'font-medium text-red-600' : 'text-graystone-600'
                        )}
                      >
                        {formatDate(decision.due_date)}
                      </td>
                      <td className="py-4 pr-4">
                        <Badge variant={status.badge}>{status.label}</Badge>
                      </td>
                      <td className="py-4 pr-4">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedDecisionId((previous) =>
                              previous === decision.id ? null : decision.id
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-full border border-graystone-200 bg-graystone-50 px-3 py-1 text-xs font-medium text-graystone-700 hover:border-ocean-200 hover:bg-aqua-50"
                        >
                          <Badge variant="outline" className="rounded-full px-2 py-0.5">
                            {relatedPages.length}
                          </Badge>
                          <span>pages</span>
                          <ChevronDown
                            className={clsx(
                              'h-3.5 w-3.5 transition-transform',
                              isExpanded && 'rotate-180'
                            )}
                          />
                        </button>
                      </td>
                      <td className="py-4 pr-4 text-sm text-graystone-600">
                        {showOutcome ? decision.outcome : ' '}
                      </td>
                      <td className="py-4">
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => startEditing(decision)}>
                            <Pencil className="h-4 w-4" />
                            Edit
                          </Button>
                          {decision.status !== 'decided' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setDecidingDecisionId((previous) =>
                                  previous === decision.id ? null : decision.id
                                );
                                setDecisionOutcome(decision.outcome || '');
                              }}
                            >
                              Mark decided
                            </Button>
                          ) : null}
                          {decision.status !== 'deferred' ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                handlers.handleUpdateDecision(decision.id, {
                                  status: 'deferred',
                                  outcome: null,
                                })
                              }
                            >
                              Mark deferred
                            </Button>
                          ) : null}
                          {isAdminUser ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="px-3 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                              onClick={() => {
                                if (window.confirm(`Delete ${decision.title}?`)) {
                                  handlers.handleDeleteDecision(decision.id);
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

                    {editingDecisionId === decision.id ? (
                      <tr className="border-b border-graystone-100 bg-graystone-50">
                        <td colSpan={7} className="p-4">
                          <div className="grid gap-3 lg:grid-cols-2">
                            <input
                              type="text"
                              value={editForm.title}
                              onChange={(event) => setEditForm((previous) => ({ ...previous, title: event.target.value }))}
                              className={FIELD_CLASSES}
                            />
                            <input
                              type="email"
                              value={editForm.owner_email}
                              onChange={(event) => setEditForm((previous) => ({ ...previous, owner_email: event.target.value }))}
                              placeholder="Owner email"
                              className={FIELD_CLASSES}
                            />
                            <input
                              type="date"
                              value={editForm.due_date}
                              onChange={(event) => setEditForm((previous) => ({ ...previous, due_date: event.target.value }))}
                              className={FIELD_CLASSES}
                            />
                            <select
                              value={editForm.status}
                              onChange={(event) => setEditForm((previous) => ({ ...previous, status: event.target.value }))}
                              className={FIELD_CLASSES}
                            >
                              <option value="open">Open</option>
                              <option value="deferred">Deferred</option>
                              <option value="decided">Decided</option>
                            </select>
                          </div>

                          <textarea
                            value={editForm.description}
                            onChange={(event) => setEditForm((previous) => ({ ...previous, description: event.target.value }))}
                            rows={3}
                            className={clsx(FIELD_CLASSES, 'mt-3')}
                          />

                          <label className="mt-3 block text-sm font-medium text-ocean-900">
                            Related pages
                          </label>
                          <select
                            multiple
                            value={editForm.related_page_ids}
                            onChange={(event) =>
                              setEditForm((previous) => ({
                                ...previous,
                                related_page_ids: getSelectedValues(event),
                              }))
                            }
                            className={clsx(FIELD_CLASSES, 'mt-2 min-h-[140px]')}
                          >
                            {pages.map((page) => (
                              <option key={page.id} value={page.id}>
                                {page.name}
                              </option>
                            ))}
                          </select>

                          {editForm.status === 'decided' ? (
                            <textarea
                              value={editForm.outcome}
                              onChange={(event) => setEditForm((previous) => ({ ...previous, outcome: event.target.value }))}
                              rows={2}
                              placeholder="Outcome"
                              className={clsx(FIELD_CLASSES, 'mt-3')}
                            />
                          ) : null}

                          <div className="mt-4 flex flex-wrap justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingDecisionId(null)}
                            >
                              Cancel
                            </Button>
                            <Button size="sm" onClick={() => saveEdit(decision.id)}>
                              Save changes
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ) : null}

                    {decidingDecisionId === decision.id ? (
                      <tr className="border-b border-graystone-100 bg-aqua-50">
                        <td colSpan={7} className="p-4">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                            <div className="flex-1">
                              <label className="mb-2 block text-sm font-medium text-ocean-900">
                                Outcome
                              </label>
                              <textarea
                                value={decisionOutcome}
                                onChange={(event) => setDecisionOutcome(event.target.value)}
                                rows={2}
                                placeholder="What was decided?"
                                className={FIELD_CLASSES}
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setDecidingDecisionId(null);
                                  setDecisionOutcome('');
                                }}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => confirmDecided(decision.id)}
                                disabled={!decisionOutcome.trim()}
                              >
                                Confirm
                              </Button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : null}

                    {isExpanded ? (
                      <tr className="border-b border-graystone-100 bg-graystone-50">
                        <td colSpan={7} className="p-4">
                          <div className="rounded-xl border border-graystone-200 bg-white p-4">
                            <h4 className="text-sm font-semibold text-ocean-900">
                              Related pages
                            </h4>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {relatedPages.length === 0 ? (
                                <p className="text-sm text-graystone-500">
                                  No pages linked to this decision yet.
                                </p>
                              ) : (
                                relatedPages.map((page) => (
                                  <Badge key={page.id} variant="secondary">
                                    {page.name}
                                  </Badge>
                                ))
                              )}
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
