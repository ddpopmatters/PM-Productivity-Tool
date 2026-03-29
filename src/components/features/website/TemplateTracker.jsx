import React, { useMemo, useState } from 'react';
import clsx from 'clsx';
import { ChevronDown, Layers3, Pencil, Plus, Trash2 } from 'lucide-react';
import Button from '../../ui/Button';
import Badge from '../../ui/Badge';

const FIELD_CLASSES =
  'w-full rounded-lg border border-graystone-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-aqua-200';

const DESIGN_STATUS_META = {
  not_started: { label: 'Not started', badge: 'neutral' },
  in_review: { label: 'In review', badge: 'warning' },
  signed_off: { label: 'Signed off', badge: 'success' },
};

const BUILD_STATUS_META = {
  not_started: { label: 'Not started', badge: 'neutral' },
  in_progress: { label: 'In progress', badge: 'warning' },
  complete: { label: 'Complete', badge: 'success' },
};

function createBlankTemplateForm() {
  return {
    name: '',
    description: '',
    developer_notes: '',
    flagged_for_early_signoff: true,
    design_status: 'not_started',
    build_status: 'not_started',
  };
}

export default function TemplateTracker({
  templates = [],
  pages = [],
  isAdminUser,
  handlers,
}) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState(createBlankTemplateForm());
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [editForm, setEditForm] = useState(createBlankTemplateForm());
  const [expandedTemplateId, setExpandedTemplateId] = useState(null);

  const projectId = templates[0]?.project_id || pages[0]?.project_id || null;

  const pagesByTemplate = useMemo(() => {
    const map = new Map();

    pages.forEach((page) => {
      if (!page.template_id) return;
      if (!map.has(page.template_id)) {
        map.set(page.template_id, []);
      }
      map.get(page.template_id).push(page);
    });

    map.forEach((templatePages) => {
      templatePages.sort((left, right) => (left.name || '').localeCompare(right.name || ''));
    });

    return map;
  }, [pages]);

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!projectId) return;

    const created = await handlers.handleCreateTemplate({
      ...createForm,
      project_id: projectId,
    });

    if (created) {
      setCreateForm(createBlankTemplateForm());
      setShowCreateForm(false);
    }
  };

  const startEditing = (template) => {
    setEditingTemplateId(template.id);
    setEditForm({
      name: template.name || '',
      description: template.description || '',
      developer_notes: template.developer_notes || '',
      flagged_for_early_signoff: Boolean(template.flagged_for_early_signoff),
      design_status: template.design_status || 'not_started',
      build_status: template.build_status || 'not_started',
    });
  };

  const saveEdit = async (templateId) => {
    const updated = await handlers.handleUpdateTemplate(templateId, {
      ...editForm,
    });

    if (updated) {
      setEditingTemplateId(null);
    }
  };

  return (
    <section className="rounded-2xl border border-graystone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-ocean-900">Template tracker</h3>
          <p className="text-sm text-graystone-500">
            Track bespoke templates, sign-off risk, and page reuse.
          </p>
        </div>
        {isAdminUser ? (
          <Button
            size="sm"
            variant={showCreateForm ? 'secondary' : 'solid'}
            onClick={() => setShowCreateForm((previous) => !previous)}
          >
            <Plus className="h-4 w-4" />
            {showCreateForm ? 'Close form' : 'Add template'}
          </Button>
        ) : null}
      </div>

      {isAdminUser && showCreateForm ? (
        <form
          onSubmit={handleCreate}
          className="mt-5 rounded-xl border border-graystone-200 bg-graystone-50 p-4"
        >
          <div className="mb-3 flex items-center gap-2">
            <Layers3 className="h-4 w-4 text-ocean-600" />
            <h4 className="text-sm font-semibold text-ocean-900">Add template</h4>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <input
              type="text"
              required
              value={createForm.name}
              onChange={(event) => setCreateForm((previous) => ({ ...previous, name: event.target.value }))}
              placeholder="Template name"
              className={FIELD_CLASSES}
            />
            <label className="flex items-center gap-2 rounded-lg border border-graystone-200 bg-white px-3 py-2 text-sm text-graystone-700">
              <input
                type="checkbox"
                checked={createForm.flagged_for_early_signoff}
                onChange={(event) =>
                  setCreateForm((previous) => ({
                    ...previous,
                    flagged_for_early_signoff: event.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-graystone-300 text-ocean-600 focus:ring-ocean-500"
              />
              Flagged for early sign-off
            </label>
          </div>

          <textarea
            value={createForm.description}
            onChange={(event) => setCreateForm((previous) => ({ ...previous, description: event.target.value }))}
            rows={3}
            placeholder="Description"
            className={clsx(FIELD_CLASSES, 'mt-3')}
          />
          <textarea
            value={createForm.developer_notes}
            onChange={(event) => setCreateForm((previous) => ({ ...previous, developer_notes: event.target.value }))}
            rows={3}
            placeholder="Developer notes"
            className={clsx(FIELD_CLASSES, 'mt-3')}
          />

          <div className="mt-4 flex justify-end">
            <Button type="submit" size="sm" disabled={!projectId}>
              Save template
            </Button>
          </div>
        </form>
      ) : null}

      <div className="mt-5 overflow-x-auto">
        {templates.length === 0 ? (
          <div className="rounded-xl border border-dashed border-graystone-300 bg-graystone-50 px-4 py-8 text-center text-sm text-graystone-500">
            No bespoke templates yet — flag templates that need custom development early.
          </div>
        ) : (
          <table className="w-full min-w-[1120px]">
            <thead>
              <tr className="border-b border-graystone-200 text-left text-xs uppercase tracking-wide text-graystone-500">
                <th className="pb-3 pr-4 font-medium">Template name</th>
                <th className="pb-3 pr-4 font-medium">Pages using it</th>
                <th className="pb-3 pr-4 font-medium">Design status</th>
                <th className="pb-3 pr-4 font-medium">Build status</th>
                <th className="pb-3 pr-4 font-medium">Flagged</th>
                <th className="pb-3 pr-4 font-medium">Developer notes</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>

            <tbody>
              {templates.map((template) => {
                const templatePages = pagesByTemplate.get(template.id) || [];
                const designStatus =
                  DESIGN_STATUS_META[template.design_status] || DESIGN_STATUS_META.not_started;
                const buildStatus =
                  BUILD_STATUS_META[template.build_status] || BUILD_STATUS_META.not_started;
                const isExpanded = expandedTemplateId === template.id;

                return (
                  <React.Fragment key={template.id}>
                    <tr className="border-b border-graystone-100 align-top">
                      <td className="py-4 pr-4">
                        <div className="font-medium text-ocean-900">{template.name}</div>
                        {template.description ? (
                          <p className="mt-1 max-w-sm text-sm text-graystone-500">
                            {template.description}
                          </p>
                        ) : null}
                      </td>
                      <td className="py-4 pr-4">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedTemplateId((previous) =>
                              previous === template.id ? null : template.id
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-full border border-graystone-200 bg-graystone-50 px-3 py-1 text-xs font-medium text-graystone-700 hover:border-ocean-200 hover:bg-aqua-50"
                        >
                          <Badge variant="outline" className="rounded-full px-2 py-0.5">
                            {templatePages.length}
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
                      <td className="py-4 pr-4">
                        <Badge variant={designStatus.badge}>{designStatus.label}</Badge>
                      </td>
                      <td className="py-4 pr-4">
                        <Badge variant={buildStatus.badge}>{buildStatus.label}</Badge>
                      </td>
                      <td className="py-4 pr-4">
                        {template.flagged_for_early_signoff ? (
                          <Badge variant="warning">Early sign-off</Badge>
                        ) : (
                          <span className="text-sm text-graystone-400">No</span>
                        )}
                      </td>
                      <td className="py-4 pr-4 text-sm text-graystone-600">
                        {template.developer_notes || 'No notes yet.'}
                      </td>
                      <td className="py-4">
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => startEditing(template)}>
                            <Pencil className="h-4 w-4" />
                            Edit
                          </Button>
                          {isAdminUser ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="px-3 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                              onClick={() => {
                                if (window.confirm(`Delete ${template.name}?`)) {
                                  handlers.handleDeleteTemplate(template.id);
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

                    {editingTemplateId === template.id ? (
                      <tr className="border-b border-graystone-100 bg-graystone-50">
                        <td colSpan={7} className="p-4">
                          <div className="grid gap-3 lg:grid-cols-2">
                            <input
                              type="text"
                              value={editForm.name}
                              onChange={(event) => setEditForm((previous) => ({ ...previous, name: event.target.value }))}
                              className={FIELD_CLASSES}
                            />
                            <label className="flex items-center gap-2 rounded-lg border border-graystone-200 bg-white px-3 py-2 text-sm text-graystone-700">
                              <input
                                type="checkbox"
                                checked={editForm.flagged_for_early_signoff}
                                onChange={(event) =>
                                  setEditForm((previous) => ({
                                    ...previous,
                                    flagged_for_early_signoff: event.target.checked,
                                  }))
                                }
                                className="h-4 w-4 rounded border-graystone-300 text-ocean-600 focus:ring-ocean-500"
                              />
                              Flagged for early sign-off
                            </label>
                            <select
                              value={editForm.design_status}
                              onChange={(event) => setEditForm((previous) => ({ ...previous, design_status: event.target.value }))}
                              className={FIELD_CLASSES}
                            >
                              <option value="not_started">Design: Not started</option>
                              <option value="in_review">Design: In review</option>
                              <option value="signed_off">Design: Signed off</option>
                            </select>
                            <select
                              value={editForm.build_status}
                              onChange={(event) => setEditForm((previous) => ({ ...previous, build_status: event.target.value }))}
                              className={FIELD_CLASSES}
                            >
                              <option value="not_started">Build: Not started</option>
                              <option value="in_progress">Build: In progress</option>
                              <option value="complete">Build: Complete</option>
                            </select>
                          </div>

                          <textarea
                            value={editForm.description}
                            onChange={(event) => setEditForm((previous) => ({ ...previous, description: event.target.value }))}
                            rows={3}
                            className={clsx(FIELD_CLASSES, 'mt-3')}
                          />
                          <textarea
                            value={editForm.developer_notes}
                            onChange={(event) => setEditForm((previous) => ({ ...previous, developer_notes: event.target.value }))}
                            rows={3}
                            className={clsx(FIELD_CLASSES, 'mt-3')}
                          />
                          <div className="mt-4 flex flex-wrap justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingTemplateId(null)}
                            >
                              Cancel
                            </Button>
                            <Button size="sm" onClick={() => saveEdit(template.id)}>
                              Save changes
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ) : null}

                    {isExpanded ? (
                      <tr className="border-b border-graystone-100 bg-graystone-50">
                        <td colSpan={7} className="p-4">
                          <div className="rounded-xl border border-graystone-200 bg-white p-4">
                            <h4 className="text-sm font-semibold text-ocean-900">
                              Pages using {template.name}
                            </h4>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {templatePages.length === 0 ? (
                                <p className="text-sm text-graystone-500">
                                  No pages are using this template yet.
                                </p>
                              ) : (
                                templatePages.map((page) => (
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
