import React, { useMemo, useState } from 'react';
import clsx from 'clsx';
import { ChevronDown, FileText, GitBranch, Pencil, Plus, Trash2 } from 'lucide-react';
import Button from '../../ui/Button';
import Badge from '../../ui/Badge';

const FIELD_CLASSES =
  'w-full rounded-lg border border-graystone-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-aqua-200';

const PAGE_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'in_review', label: 'In review' },
  { value: 'live', label: 'Live' },
  { value: 'needs_update', label: 'Needs update' },
];

const TRACK_DEFINITIONS = [
  {
    id: 'cms_status',
    label: 'CMS',
    finalValue: 'published',
    options: [
      { value: 'not_started', label: 'Not started', shortLabel: 'Not started', dotClass: 'bg-graystone-400' },
      { value: 'created', label: 'Created', shortLabel: 'Created', dotClass: 'bg-aqua-500' },
      { value: 'published', label: 'Published', shortLabel: 'Published', dotClass: 'bg-green-500' },
    ],
  },
  {
    id: 'content_status',
    label: 'Content',
    finalValue: 'approved',
    options: [
      { value: 'not_started', label: 'Not started', shortLabel: 'Not started', dotClass: 'bg-graystone-400' },
      { value: 'drafted', label: 'Drafted', shortLabel: 'Drafted', dotClass: 'bg-aqua-500' },
      { value: 'approved', label: 'Approved', shortLabel: 'Approved', dotClass: 'bg-green-500' },
    ],
  },
  {
    id: 'design_status',
    label: 'Design',
    finalValue: 'signed_off',
    options: [
      { value: 'not_started', label: 'Not started', shortLabel: 'Not started', dotClass: 'bg-graystone-400' },
      { value: 'in_review', label: 'In review', shortLabel: 'In review', dotClass: 'bg-aqua-500' },
      { value: 'signed_off', label: 'Signed off', shortLabel: 'Signed off', dotClass: 'bg-green-500' },
    ],
  },
  {
    id: 'content_approval_status',
    label: 'Approval',
    finalValue: 'approved',
    options: [
      { value: 'not_started', label: 'Not started', shortLabel: 'Not started', dotClass: 'bg-graystone-400' },
      { value: 'submitted', label: 'Submitted', shortLabel: 'Submitted', dotClass: 'bg-aqua-500' },
      { value: 'approved', label: 'Approved', shortLabel: 'Approved', dotClass: 'bg-green-500' },
    ],
  },
];

const TRACK_LOOKUP = TRACK_DEFINITIONS.reduce((accumulator, definition) => {
  accumulator[definition.id] = definition;
  return accumulator;
}, {});

function createBlankPageForm() {
  return {
    name: '',
    slug: '',
    description: '',
    owner_email: '',
    editor_email: '',
    reviewer_email: '',
    status: 'draft',
    review_interval_days: 180,
    section: '',
    sub_section: '',
    sort_order: 0,
    cms_status: 'not_started',
    content_status: 'not_started',
    design_status: 'not_started',
    content_approval_status: 'not_started',
    template_id: '',
    page_notes: '',
  };
}

function createBlankDependencyForm() {
  return {
    depends_on_page_id: '',
    relationship_type: 'references',
    notes: '',
  };
}

function normaliseLabel(value, fallback) {
  return value?.trim() || fallback;
}

function compareOptionalText(left, right, fallback) {
  const leftValue = normaliseLabel(left, fallback);
  const rightValue = normaliseLabel(right, fallback);

  if (leftValue === fallback && rightValue !== fallback) return 1;
  if (leftValue !== fallback && rightValue === fallback) return -1;
  return leftValue.localeCompare(rightValue);
}

function sortPages(left, right) {
  const sectionComparison = compareOptionalText(left.section, right.section, 'Unassigned');
  if (sectionComparison !== 0) return sectionComparison;

  const subsectionComparison = compareOptionalText(left.sub_section, right.sub_section, 'General');
  if (subsectionComparison !== 0) return subsectionComparison;

  const orderDelta = Number(left.sort_order || 0) - Number(right.sort_order || 0);
  if (orderDelta !== 0) return orderDelta;

  return (left.name || '').localeCompare(right.name || '');
}

function isPageReady(page) {
  return TRACK_DEFINITIONS.every((track) => page[track.id] === track.finalValue);
}

function getTrackMeta(fieldId, value) {
  const definition = TRACK_LOOKUP[fieldId];
  return definition?.options.find((option) => option.value === value) || definition?.options[0];
}

function StatusCell({ page, fieldId, activePicker, setActivePicker, onUpdatePage }) {
  const definition = TRACK_LOOKUP[fieldId];
  const meta = getTrackMeta(fieldId, page[fieldId]);
  const isOpen = activePicker?.pageId === page.id && activePicker.fieldId === fieldId;

  const handleChange = async (event) => {
    const nextValue = event.target.value;
    const updated = await onUpdatePage(page.id, { [fieldId]: nextValue });
    if (updated) {
      setActivePicker(null);
    }
  };

  return (
    <div className="min-w-[132px]">
      <button
        type="button"
        onClick={() =>
          setActivePicker(isOpen ? null : { pageId: page.id, fieldId })
        }
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-graystone-200 bg-white px-3 py-2 text-left text-xs text-graystone-700 hover:border-ocean-300 hover:bg-aqua-50"
        title={`${definition.label}: ${meta?.label || 'Not started'}`}
      >
        <span className="inline-flex items-center gap-2">
          <span className={clsx('h-2 w-2 rounded-full', meta?.dotClass)} />
          <span>{meta?.shortLabel || meta?.label || 'Not started'}</span>
        </span>
        <ChevronDown
          className={clsx(
            'h-3.5 w-3.5 text-graystone-500 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {isOpen ? (
        <select
          value={page[fieldId] || definition.options[0].value}
          onChange={handleChange}
          className={clsx(FIELD_CLASSES, 'mt-2 px-2 py-1.5 text-xs')}
        >
          {definition.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  );
}

export default function PageInventory({
  pages = [],
  templates = [],
  dependencies = [],
  isAdminUser,
  handlers,
  projectId,
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [createForm, setCreateForm] = useState(createBlankPageForm());
  const [editingPageId, setEditingPageId] = useState(null);
  const [editForm, setEditForm] = useState(createBlankPageForm());
  const [activeStatusPicker, setActiveStatusPicker] = useState(null);
  const [expandedDependencyPageId, setExpandedDependencyPageId] = useState(null);
  const [dependencyForms, setDependencyForms] = useState({});
  const [dependencyFeedback, setDependencyFeedback] = useState({});

  const templateMap = useMemo(
    () => new Map((templates || []).map((template) => [template.id, template])),
    [templates]
  );

  const sortedPages = useMemo(() => [...pages].sort(sortPages), [pages]);

  const groupedPages = useMemo(() => {
    const sections = [];

    sortedPages.forEach((page) => {
      const sectionName = normaliseLabel(page.section, 'Unassigned');
      const subSectionName = normaliseLabel(page.sub_section, 'General');

      let sectionGroup = sections.find((section) => section.name === sectionName);
      if (!sectionGroup) {
        sectionGroup = { name: sectionName, pages: [], subSections: [] };
        sections.push(sectionGroup);
      }

      sectionGroup.pages.push(page);

      let subSectionGroup = sectionGroup.subSections.find(
        (subSection) => subSection.name === subSectionName
      );
      if (!subSectionGroup) {
        subSectionGroup = { name: subSectionName, pages: [] };
        sectionGroup.subSections.push(subSectionGroup);
      }

      subSectionGroup.pages.push(page);
    });

    return sections;
  }, [sortedPages]);

  const dependencyIndex = useMemo(() => {
    const outgoing = new Map();
    const incoming = new Map();

    dependencies.forEach((dependency) => {
      if (!outgoing.has(dependency.page_id)) {
        outgoing.set(dependency.page_id, []);
      }
      outgoing.get(dependency.page_id).push(dependency);

      if (!incoming.has(dependency.depends_on_page_id)) {
        incoming.set(dependency.depends_on_page_id, []);
      }
      incoming.get(dependency.depends_on_page_id).push(dependency);
    });

    return { outgoing, incoming };
  }, [dependencies]);

  const handleCreatePage = async (event) => {
    event.preventDefault();

    const created = await handlers.handleCreatePage({
      ...createForm,
      project_id: projectId,
      review_interval_days: Number(createForm.review_interval_days || 180),
      sort_order: Number(createForm.sort_order || 0),
      template_id: createForm.template_id || null,
      section: createForm.section.trim(),
      sub_section: createForm.sub_section.trim(),
      page_notes: createForm.page_notes.trim(),
    });

    if (created) {
      setCreateForm(createBlankPageForm());
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
      section: page.section || '',
      sub_section: page.sub_section || '',
      sort_order: page.sort_order || 0,
      cms_status: page.cms_status || 'not_started',
      content_status: page.content_status || 'not_started',
      design_status: page.design_status || 'not_started',
      content_approval_status: page.content_approval_status || 'not_started',
      template_id: page.template_id || '',
      page_notes: page.page_notes || '',
    });
  };

  const saveEdit = async (pageId) => {
    const updated = await handlers.handleUpdatePage(pageId, {
      ...editForm,
      review_interval_days: Number(editForm.review_interval_days || 180),
      sort_order: Number(editForm.sort_order || 0),
      template_id: editForm.template_id || null,
      section: editForm.section.trim() || null,
      sub_section: editForm.sub_section.trim() || null,
      page_notes: editForm.page_notes.trim(),
    });

    if (updated) {
      setEditingPageId(null);
    }
  };

  const toggleDependencyPanel = (pageId) => {
    setExpandedDependencyPageId((previousId) => (previousId === pageId ? null : pageId));
  };

  const handleDependencyFieldChange = (pageId, field, value) => {
    setDependencyForms((previous) => ({
      ...previous,
      [pageId]: {
        ...createBlankDependencyForm(),
        ...(previous[pageId] || {}),
        [field]: value,
      },
    }));
  };

  const submitDependency = async (event, pageId) => {
    event.preventDefault();
    const form = dependencyForms[pageId] || createBlankDependencyForm();
    if (!form.depends_on_page_id) return;

    const result = await handlers.handleAddDependency(
      pageId,
      form.depends_on_page_id,
      form.relationship_type,
      form.notes
    );

    if (result?.error === 'already_exists') {
      setDependencyFeedback((previous) => ({
        ...previous,
        [pageId]: 'That relationship already exists.',
      }));
      return;
    }

    if (result) {
      setDependencyForms((previous) => ({
        ...previous,
        [pageId]: createBlankDependencyForm(),
      }));
      setDependencyFeedback((previous) => ({
        ...previous,
        [pageId]: '',
      }));
    }
  };

  const removeDependency = async (dependencyId, pageId) => {
    const removed = await handlers.handleRemoveDependency(dependencyId);
    if (removed) {
      setDependencyFeedback((previous) => ({
        ...previous,
        [pageId]: '',
      }));
    }
  };

  return (
    <section className="rounded-2xl border border-graystone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-ocean-900">Page inventory</h3>
          <p className="text-sm text-graystone-500">
            Track page ownership, content progress, templates, and dependencies by section.
          </p>
        </div>
        {isAdminUser ? (
          <Button
            size="sm"
            variant={showAddForm ? 'secondary' : 'solid'}
            onClick={() => setShowAddForm((previous) => !previous)}
          >
            <Plus className="h-4 w-4" />
            {showAddForm ? 'Close form' : 'Add page'}
          </Button>
        ) : null}
      </div>

      {isAdminUser && showAddForm ? (
        <form
          onSubmit={handleCreatePage}
          className="mt-5 rounded-xl border border-graystone-200 bg-graystone-50 p-4"
        >
          <div className="mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-ocean-600" />
            <h4 className="text-sm font-semibold text-ocean-900">Add page</h4>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <input
              type="text"
              required
              value={createForm.name}
              onChange={(event) => setCreateForm((previous) => ({ ...previous, name: event.target.value }))}
              placeholder="Page name"
              className={FIELD_CLASSES}
            />
            <input
              type="text"
              required
              value={createForm.slug}
              onChange={(event) => setCreateForm((previous) => ({ ...previous, slug: event.target.value }))}
              placeholder="Slug"
              className={FIELD_CLASSES}
            />
            <input
              type="text"
              value={createForm.section}
              onChange={(event) => setCreateForm((previous) => ({ ...previous, section: event.target.value }))}
              placeholder="Section"
              className={FIELD_CLASSES}
            />
            <input
              type="text"
              value={createForm.sub_section}
              onChange={(event) => setCreateForm((previous) => ({ ...previous, sub_section: event.target.value }))}
              placeholder="Sub-section"
              className={FIELD_CLASSES}
            />
            <input
              type="number"
              value={createForm.sort_order}
              onChange={(event) => setCreateForm((previous) => ({ ...previous, sort_order: event.target.value }))}
              placeholder="Sort order"
              className={FIELD_CLASSES}
            />
            <select
              value={createForm.template_id}
              onChange={(event) => setCreateForm((previous) => ({ ...previous, template_id: event.target.value }))}
              className={FIELD_CLASSES}
            >
              <option value="">No template</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
            <input
              type="email"
              value={createForm.owner_email}
              onChange={(event) => setCreateForm((previous) => ({ ...previous, owner_email: event.target.value }))}
              placeholder="Owner email"
              className={FIELD_CLASSES}
            />
            <input
              type="email"
              value={createForm.editor_email}
              onChange={(event) => setCreateForm((previous) => ({ ...previous, editor_email: event.target.value }))}
              placeholder="Editor email"
              className={FIELD_CLASSES}
            />
            <input
              type="email"
              value={createForm.reviewer_email}
              onChange={(event) => setCreateForm((previous) => ({ ...previous, reviewer_email: event.target.value }))}
              placeholder="Reviewer email"
              className={FIELD_CLASSES}
            />
            <input
              type="number"
              min="1"
              value={createForm.review_interval_days}
              onChange={(event) =>
                setCreateForm((previous) => ({
                  ...previous,
                  review_interval_days: event.target.value,
                }))
              }
              placeholder="Review interval days"
              className={FIELD_CLASSES}
            />
            <div className="lg:col-span-2" />
          </div>

          <textarea
            value={createForm.description}
            onChange={(event) => setCreateForm((previous) => ({ ...previous, description: event.target.value }))}
            rows={3}
            placeholder="Description"
            className={clsx(FIELD_CLASSES, 'mt-3')}
          />
          <textarea
            value={createForm.page_notes}
            onChange={(event) => setCreateForm((previous) => ({ ...previous, page_notes: event.target.value }))}
            rows={2}
            placeholder="Page notes"
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
            No pages yet, add the first page to start the inventory.
          </div>
        ) : (
          <table className="w-full min-w-[1480px]">
            <thead>
              <tr className="border-b border-graystone-200 text-left text-xs uppercase tracking-wide text-graystone-500">
                <th className="pb-3 pr-4 font-medium">Section</th>
                <th className="pb-3 pr-4 font-medium">Sub-section</th>
                <th className="pb-3 pr-4 font-medium">Page name</th>
                <th className="pb-3 pr-4 font-medium">Owner</th>
                <th className="pb-3 pr-4 font-medium">CMS</th>
                <th className="pb-3 pr-4 font-medium">Content</th>
                <th className="pb-3 pr-4 font-medium">Design</th>
                <th className="pb-3 pr-4 font-medium">Approval</th>
                <th className="pb-3 pr-4 font-medium">Template</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>

            <tbody>
              {groupedPages.map((sectionGroup) => {
                const completedPages = sectionGroup.pages.filter(isPageReady).length;
                const sectionCompletion = sectionGroup.pages.length
                  ? Math.round((completedPages / sectionGroup.pages.length) * 100)
                  : 0;

                return (
                  <React.Fragment key={sectionGroup.name}>
                    <tr className="bg-graystone-50 text-sm font-semibold text-graystone-700">
                      <td colSpan={10} className="px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <span>{sectionGroup.name}</span>
                          <span className="text-xs text-graystone-500">
                            {completedPages}/{sectionGroup.pages.length} pages fully ready · {sectionCompletion}%
                          </span>
                        </div>
                      </td>
                    </tr>

                    {sectionGroup.subSections.map((subSectionGroup) => (
                      <React.Fragment key={`${sectionGroup.name}-${subSectionGroup.name}`}>
                        <tr className="border-b border-graystone-100 bg-white">
                          <td className="px-4 py-2 text-xs font-medium uppercase tracking-wide text-graystone-400">
                            {sectionGroup.name}
                          </td>
                          <td colSpan={9} className="px-4 py-2 text-xs font-medium uppercase tracking-wide text-graystone-500">
                            {subSectionGroup.name}
                          </td>
                        </tr>

                        {subSectionGroup.pages.map((page) => {
                          const outgoingDependencies =
                            dependencyIndex.outgoing.get(page.id) || [];
                          const incomingDependencies =
                            dependencyIndex.incoming.get(page.id) || [];
                          const dependencyCount =
                            outgoingDependencies.length + incomingDependencies.length;
                          const dependencyForm =
                            dependencyForms[page.id] || createBlankDependencyForm();
                          const template = page.template_id
                            ? templateMap.get(page.template_id)
                            : null;

                          return (
                            <React.Fragment key={page.id}>
                              <tr className="border-b border-graystone-100 align-top">
                                <td className="py-4 pr-4 text-sm text-graystone-500">
                                  {normaliseLabel(page.section, 'Unassigned')}
                                </td>
                                <td className="py-4 pr-4 text-sm text-graystone-500">
                                  {normaliseLabel(page.sub_section, 'General')}
                                </td>
                                <td className="py-4 pr-4">
                                  <div className="font-medium text-ocean-900">{page.name}</div>
                                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-graystone-500">
                                    <span>/{page.slug}</span>
                                    <span>Order {page.sort_order || 0}</span>
                                  </div>
                                  {page.description ? (
                                    <p className="mt-2 max-w-sm text-sm text-graystone-500">
                                      {page.description}
                                    </p>
                                  ) : null}
                                  {page.page_notes ? (
                                    <p className="mt-2 max-w-sm text-xs text-graystone-500">
                                      Notes: {page.page_notes}
                                    </p>
                                  ) : null}
                                </td>
                                <td className="py-4 pr-4 text-sm text-graystone-600">
                                  {page.owner_email || 'Unassigned'}
                                </td>
                                {TRACK_DEFINITIONS.map((track) => (
                                  <td key={`${page.id}-${track.id}`} className="py-4 pr-4">
                                    <StatusCell
                                      page={page}
                                      fieldId={track.id}
                                      activePicker={activeStatusPicker}
                                      setActivePicker={setActiveStatusPicker}
                                      onUpdatePage={handlers.handleUpdatePage}
                                    />
                                  </td>
                                ))}
                                <td className="py-4 pr-4">
                                  {template ? (
                                    <Badge variant="outline">{template.name}</Badge>
                                  ) : (
                                    <span className="text-sm text-graystone-400">No template</span>
                                  )}
                                </td>
                                <td className="py-4">
                                  <div className="flex flex-wrap gap-2">
                                    <Button
                                      size="sm"
                                      variant={expandedDependencyPageId === page.id ? 'secondary' : 'outline'}
                                      onClick={() => toggleDependencyPanel(page.id)}
                                    >
                                      <GitBranch className="h-4 w-4" />
                                      {dependencyCount}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => startEditing(page)}
                                    >
                                      <Pencil className="h-4 w-4" />
                                      Edit
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
                                  <td colSpan={10} className="p-4">
                                    <div className="grid gap-3 lg:grid-cols-3">
                                      <input
                                        type="text"
                                        value={editForm.name}
                                        onChange={(event) => setEditForm((previous) => ({ ...previous, name: event.target.value }))}
                                        className={FIELD_CLASSES}
                                      />
                                      <input
                                        type="text"
                                        value={editForm.slug}
                                        onChange={(event) => setEditForm((previous) => ({ ...previous, slug: event.target.value }))}
                                        className={FIELD_CLASSES}
                                      />
                                      <select
                                        value={editForm.status}
                                        onChange={(event) => setEditForm((previous) => ({ ...previous, status: event.target.value }))}
                                        className={FIELD_CLASSES}
                                      >
                                        {PAGE_STATUS_OPTIONS.map((option) => (
                                          <option key={option.value} value={option.value}>
                                            {option.label}
                                          </option>
                                        ))}
                                      </select>
                                      <input
                                        type="text"
                                        value={editForm.section}
                                        onChange={(event) => setEditForm((previous) => ({ ...previous, section: event.target.value }))}
                                        placeholder="Section"
                                        className={FIELD_CLASSES}
                                      />
                                      <input
                                        type="text"
                                        value={editForm.sub_section}
                                        onChange={(event) => setEditForm((previous) => ({ ...previous, sub_section: event.target.value }))}
                                        placeholder="Sub-section"
                                        className={FIELD_CLASSES}
                                      />
                                      <input
                                        type="number"
                                        value={editForm.sort_order}
                                        onChange={(event) => setEditForm((previous) => ({ ...previous, sort_order: event.target.value }))}
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
                                        type="email"
                                        value={editForm.editor_email}
                                        onChange={(event) => setEditForm((previous) => ({ ...previous, editor_email: event.target.value }))}
                                        placeholder="Editor email"
                                        className={FIELD_CLASSES}
                                      />
                                      <input
                                        type="email"
                                        value={editForm.reviewer_email}
                                        onChange={(event) => setEditForm((previous) => ({ ...previous, reviewer_email: event.target.value }))}
                                        placeholder="Reviewer email"
                                        className={FIELD_CLASSES}
                                      />
                                      <input
                                        type="number"
                                        min="1"
                                        value={editForm.review_interval_days}
                                        onChange={(event) =>
                                          setEditForm((previous) => ({
                                            ...previous,
                                            review_interval_days: event.target.value,
                                          }))
                                        }
                                        className={FIELD_CLASSES}
                                      />
                                      <select
                                        value={editForm.template_id}
                                        onChange={(event) => setEditForm((previous) => ({ ...previous, template_id: event.target.value }))}
                                        className={FIELD_CLASSES}
                                      >
                                        <option value="">No template</option>
                                        {templates.map((templateRow) => (
                                          <option key={templateRow.id} value={templateRow.id}>
                                            {templateRow.name}
                                          </option>
                                        ))}
                                      </select>
                                      <div />

                                      {TRACK_DEFINITIONS.map((track) => (
                                        <select
                                          key={`${page.id}-${track.id}-edit`}
                                          value={editForm[track.id]}
                                          onChange={(event) =>
                                            setEditForm((previous) => ({
                                              ...previous,
                                              [track.id]: event.target.value,
                                            }))
                                          }
                                          className={FIELD_CLASSES}
                                        >
                                          {track.options.map((option) => (
                                            <option key={option.value} value={option.value}>
                                              {track.label}: {option.label}
                                            </option>
                                          ))}
                                        </select>
                                      ))}
                                    </div>

                                    <textarea
                                      value={editForm.description}
                                      onChange={(event) => setEditForm((previous) => ({ ...previous, description: event.target.value }))}
                                      rows={3}
                                      className={clsx(FIELD_CLASSES, 'mt-3')}
                                    />
                                    <textarea
                                      value={editForm.page_notes}
                                      onChange={(event) => setEditForm((previous) => ({ ...previous, page_notes: event.target.value }))}
                                      rows={2}
                                      placeholder="Page notes"
                                      className={clsx(FIELD_CLASSES, 'mt-3')}
                                    />
                                    <div className="mt-4 flex flex-wrap justify-end gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setEditingPageId(null)}
                                      >
                                        Cancel
                                      </Button>
                                      <Button size="sm" onClick={() => saveEdit(page.id)}>
                                        Save changes
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ) : null}

                              {expandedDependencyPageId === page.id ? (
                                <tr className="border-b border-graystone-100 bg-graystone-50">
                                  <td colSpan={10} className="p-4">
                                    <div className="grid gap-4 lg:grid-cols-3">
                                      <div className="rounded-xl border border-graystone-200 bg-white p-4">
                                        <h4 className="text-sm font-semibold text-ocean-900">
                                          Outgoing relationships
                                        </h4>
                                        <div className="mt-3 space-y-3">
                                          {outgoingDependencies.length === 0 ? (
                                            <p className="text-sm text-graystone-500">
                                              No pages linked from this page yet.
                                            </p>
                                          ) : (
                                            outgoingDependencies.map((dependency) => (
                                              <div
                                                key={dependency.id}
                                                className="rounded-lg border border-graystone-200 px-3 py-2"
                                              >
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                  <div>
                                                    <p className="text-sm font-medium text-ocean-900">
                                                      {dependency.depends_on_name || 'Unknown page'}
                                                    </p>
                                                    <p className="text-xs text-graystone-500">
                                                      {dependency.relationship_type === 'feeds_into'
                                                        ? 'Feeds into'
                                                        : 'References'}
                                                    </p>
                                                  </div>
                                                  <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="px-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                                    onClick={() => removeDependency(dependency.id, page.id)}
                                                  >
                                                    Remove
                                                  </Button>
                                                </div>
                                                {dependency.notes ? (
                                                  <p className="mt-2 text-xs text-graystone-500">
                                                    {dependency.notes}
                                                  </p>
                                                ) : null}
                                              </div>
                                            ))
                                          )}
                                        </div>
                                      </div>

                                      <div className="rounded-xl border border-graystone-200 bg-white p-4">
                                        <h4 className="text-sm font-semibold text-ocean-900">
                                          Incoming relationships
                                        </h4>
                                        <div className="mt-3 space-y-3">
                                          {incomingDependencies.length === 0 ? (
                                            <p className="text-sm text-graystone-500">
                                              No other pages point to this page yet.
                                            </p>
                                          ) : (
                                            incomingDependencies.map((dependency) => (
                                              <div
                                                key={dependency.id}
                                                className="rounded-lg border border-graystone-200 px-3 py-2"
                                              >
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                  <div>
                                                    <p className="text-sm font-medium text-ocean-900">
                                                      {dependency.page_name || 'Unknown page'}
                                                    </p>
                                                    <p className="text-xs text-graystone-500">
                                                      {dependency.relationship_type === 'feeds_into'
                                                        ? 'Feeds into this page'
                                                        : 'References this page'}
                                                    </p>
                                                  </div>
                                                  <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="px-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                                    onClick={() => removeDependency(dependency.id, page.id)}
                                                  >
                                                    Remove
                                                  </Button>
                                                </div>
                                                {dependency.notes ? (
                                                  <p className="mt-2 text-xs text-graystone-500">
                                                    {dependency.notes}
                                                  </p>
                                                ) : null}
                                              </div>
                                            ))
                                          )}
                                        </div>
                                      </div>

                                      <form
                                        onSubmit={(event) => submitDependency(event, page.id)}
                                        className="rounded-xl border border-graystone-200 bg-white p-4"
                                      >
                                        <h4 className="text-sm font-semibold text-ocean-900">
                                          Add relationship
                                        </h4>
                                        <div className="mt-3 space-y-3">
                                          <select
                                            value={dependencyForm.depends_on_page_id}
                                            onChange={(event) =>
                                              handleDependencyFieldChange(
                                                page.id,
                                                'depends_on_page_id',
                                                event.target.value
                                              )
                                            }
                                            className={FIELD_CLASSES}
                                          >
                                            <option value="">Select page</option>
                                            {sortedPages
                                              .filter((candidate) => candidate.id !== page.id)
                                              .map((candidate) => (
                                                <option key={candidate.id} value={candidate.id}>
                                                  {candidate.name}
                                                </option>
                                              ))}
                                          </select>
                                          <select
                                            value={dependencyForm.relationship_type}
                                            onChange={(event) =>
                                              handleDependencyFieldChange(
                                                page.id,
                                                'relationship_type',
                                                event.target.value
                                              )
                                            }
                                            className={FIELD_CLASSES}
                                          >
                                            <option value="references">References</option>
                                            <option value="feeds_into">Feeds into</option>
                                          </select>
                                          <textarea
                                            value={dependencyForm.notes}
                                            onChange={(event) =>
                                              handleDependencyFieldChange(
                                                page.id,
                                                'notes',
                                                event.target.value
                                              )
                                            }
                                            rows={3}
                                            placeholder="Notes"
                                            className={FIELD_CLASSES}
                                          />
                                          {dependencyFeedback[page.id] ? (
                                            <p className="text-sm text-amber-700">
                                              {dependencyFeedback[page.id]}
                                            </p>
                                          ) : null}
                                          <div className="flex justify-end">
                                            <Button size="sm" type="submit">
                                              Save relationship
                                            </Button>
                                          </div>
                                        </div>
                                      </form>
                                    </div>
                                  </td>
                                </tr>
                              ) : null}
                            </React.Fragment>
                          );
                        })}
                      </React.Fragment>
                    ))}
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
