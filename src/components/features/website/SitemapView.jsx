import React, { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import Button from '../../ui/Button';
import Badge from '../../ui/Badge';

const FIELD_CLASSES =
  'w-full rounded-lg border border-graystone-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-aqua-200';

const STATUS_META = {
  planned: {
    label: 'Planned',
    dotClass: 'bg-graystone-400',
  },
  in_progress: {
    label: 'In progress',
    dotClass: 'bg-amber-400',
  },
  live: {
    label: 'Live',
    dotClass: 'bg-green-500',
  },
};

const PAGE_TYPE_META = {
  content: {
    label: 'Content',
    className: 'bg-ocean-100 text-ocean-700',
  },
  form: {
    label: 'Form',
    className: 'bg-sky-100 text-sky-700',
  },
  redirect: {
    label: 'Redirect',
    className: 'bg-graystone-100 text-graystone-600',
  },
  external: {
    label: 'External',
    className: 'bg-purple-100 text-purple-700',
  },
};

const INDENT_CLASSES = {
  0: 'pl-0',
  1: 'pl-6',
  2: 'pl-12',
};

function sortNodes(nodes) {
  return [...nodes].sort((left, right) => {
    const orderDelta = Number(left.sort_order || 0) - Number(right.sort_order || 0);
    if (orderDelta !== 0) return orderDelta;
    return (left.name || '').localeCompare(right.name || '');
  });
}

function createPanelForm(node) {
  return {
    page_type: node.page_type || 'content',
    status: node.status || 'planned',
    linked_page_id: node.linked_page_id || '',
    notes: node.notes || '',
  };
}

function normaliseSlug(value) {
  const trimmed = value.trim();
  return trimmed ? trimmed.replace(/^\/+/, '') : '';
}

function getPageOptionLabel(page) {
  return page.section ? `${page.name} (${page.section})` : page.name;
}

export default function SitemapView({
  sitemapNodes = [],
  pages = [],
  projectId,
  isAdminUser,
  userEmail,
  handlers,
}) {
  const [expandedNodeId, setExpandedNodeId] = useState(null);
  const [panelForm, setPanelForm] = useState({
    page_type: 'content',
    status: 'planned',
    linked_page_id: '',
    notes: '',
  });
  const [inlineEditor, setInlineEditor] = useState(null);
  const [draftNode, setDraftNode] = useState(null);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [linkPickerNodeId, setLinkPickerNodeId] = useState(null);
  const isSavingInlineRef = useRef(false);

  const pageMap = useMemo(
    () => new Map((pages || []).map((page) => [page.id, page])),
    [pages]
  );

  const childrenByParent = useMemo(() => {
    const groups = new Map();

    sitemapNodes.forEach((node) => {
      const key = node.parent_id || 'root';
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(node);
    });

    groups.forEach((groupNodes, key) => {
      groups.set(key, sortNodes(groupNodes));
    });

    return groups;
  }, [sitemapNodes]);

  const rootNodes = childrenByParent.get('root') || [];

  const linkedPageIds = useMemo(
    () =>
      new Set(
        sitemapNodes.map((node) => node.linked_page_id).filter(Boolean)
      ),
    [sitemapNodes]
  );

  const importablePages = useMemo(
    () => pages.filter((page) => !linkedPageIds.has(page.id)),
    [linkedPageIds, pages]
  );

  useEffect(() => {
    if (expandedNodeId && !sitemapNodes.some((node) => node.id === expandedNodeId)) {
      setExpandedNodeId(null);
    }

    if (linkPickerNodeId && !sitemapNodes.some((node) => node.id === linkPickerNodeId)) {
      setLinkPickerNodeId(null);
    }
  }, [expandedNodeId, linkPickerNodeId, sitemapNodes]);

  const countDescendants = (nodeId) => {
    const children = childrenByParent.get(nodeId) || [];
    return children.reduce(
      (total, child) => total + 1 + countDescendants(child.id),
      0
    );
  };

  const createDraft = (parentId, level) => {
    const siblings =
      parentId === null
        ? rootNodes
        : childrenByParent.get(parentId) || [];
    const nextSortOrder = siblings.length
      ? Math.max(...siblings.map((node) => Number(node.sort_order || 0))) + 1
      : 0;

    setExpandedNodeId(null);
    setInlineEditor(null);
    setDraftNode({
      id: `draft-${Date.now()}`,
      project_id: projectId,
      parent_id: parentId,
      name: '',
      slug: '',
      page_type: 'content',
      status: 'planned',
      sort_order: nextSortOrder,
      linked_page_id: null,
      notes: '',
      created_by_email: userEmail || null,
      level,
    });
  };

  const startInlineEdit = (node, field) => {
    if (!isAdminUser) return;

    setInlineEditor({
      nodeId: node.id,
      field,
      value: field === 'slug' ? node.slug || '' : node.name || '',
      originalValue: field === 'slug' ? node.slug || '' : node.name || '',
    });
  };

  const commitInlineEdit = async () => {
    const editor = inlineEditor;
    if (!editor || isSavingInlineRef.current) return;

    isSavingInlineRef.current = true;

    try {
      const nextValue =
        editor.field === 'slug'
          ? normaliseSlug(editor.value)
          : editor.value.trim();
      const previousValue =
        editor.field === 'slug'
          ? normaliseSlug(editor.originalValue || '')
          : (editor.originalValue || '').trim();

      if (editor.field === 'name' && !nextValue) {
        setInlineEditor(null);
        return;
      }

      if (nextValue === previousValue) {
        setInlineEditor(null);
        return;
      }

      const updated = await handlers.handleUpdateSitemapNode(editor.nodeId, {
        [editor.field]: editor.field === 'slug' ? nextValue || null : nextValue,
      });

      if (updated) {
        setInlineEditor(null);
      }
    } finally {
      isSavingInlineRef.current = false;
    }
  };

  const saveDraftNode = async () => {
    if (!draftNode) return;

    const name = draftNode.name.trim();
    if (!name) return;

    const created = await handlers.handleCreateSitemapNode({
      ...draftNode,
      name,
      slug: normaliseSlug(draftNode.slug) || null,
      linked_page_id: draftNode.linked_page_id || null,
      notes: draftNode.notes.trim(),
    });

    if (created) {
      setDraftNode(null);
    }
  };

  const togglePanel = (node) => {
    setLinkPickerNodeId(null);
    setExpandedNodeId((previousId) => {
      if (previousId === node.id) {
        return null;
      }

      setPanelForm(createPanelForm(node));
      return node.id;
    });
  };

  const savePanel = async (nodeId) => {
    const updated = await handlers.handleUpdateSitemapNode(nodeId, {
      page_type: panelForm.page_type,
      status: panelForm.status,
      linked_page_id: panelForm.linked_page_id || null,
      notes: panelForm.notes.trim(),
    });

    if (updated) {
      setExpandedNodeId(null);
    }
  };

  const updateLinkedPage = async (nodeId, value) => {
    const updated = await handlers.handleUpdateSitemapNode(nodeId, {
      linked_page_id: value || null,
    });

    if (updated) {
      setLinkPickerNodeId(null);
    }
  };

  const requestImport = async () => {
    if (!importablePages.length) return;

    if (sitemapNodes.length > 0) {
      setShowImportConfirm(true);
      return;
    }

    const imported = await handlers.handleImportPagesAsSitemapNodes(importablePages);
    if (imported !== null) {
      setShowImportConfirm(false);
    }
  };

  const confirmImport = async () => {
    const imported = await handlers.handleImportPagesAsSitemapNodes(importablePages);
    if (imported !== null) {
      setShowImportConfirm(false);
    }
  };

  const renderEditableText = (node, field, className, placeholder) => {
    const isEditing =
      inlineEditor?.nodeId === node.id && inlineEditor.field === field;

    if (isEditing) {
      return (
        <input
          type="text"
          autoFocus
          value={inlineEditor.value}
          onChange={(event) =>
            setInlineEditor((previous) =>
              previous
                ? { ...previous, value: event.target.value }
                : previous
            )
          }
          onBlur={() => {
            void commitInlineEdit();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void commitInlineEdit();
            }

            if (event.key === 'Escape') {
              event.preventDefault();
              setInlineEditor(null);
            }
          }}
          className={clsx(
            'rounded-md border border-ocean-300 bg-white px-2 py-1 shadow-sm focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-aqua-200',
            className
          )}
        />
      );
    }

    return (
      <button
        type="button"
        onClick={() => startInlineEdit(node, field)}
        disabled={!isAdminUser}
        className={clsx(
          'text-left transition-colors',
          isAdminUser ? 'hover:text-ocean-700' : 'cursor-default',
          className,
          !(node[field] || '').trim() && 'text-graystone-400'
        )}
      >
        {field === 'slug'
          ? node.slug
            ? `/${node.slug}`
            : placeholder
          : node.name || placeholder}
      </button>
    );
  };

  const renderDraftRow = (level) => {
    if (!draftNode) return null;

    return (
      <div
        key={draftNode.id}
        className={clsx(
          'rounded-xl border border-dashed border-graystone-300 bg-graystone-50',
          INDENT_CLASSES[level]
        )}
      >
        <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span
              className={clsx(
                'h-2 w-2 rounded-full',
                STATUS_META[draftNode.status].dotClass
              )}
            />
            <div className="min-w-0 flex-1">
              <input
                type="text"
                autoFocus
                value={draftNode.name}
                onChange={(event) =>
                  setDraftNode((previous) =>
                    previous
                      ? { ...previous, name: event.target.value }
                      : previous
                  )
                }
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void saveDraftNode();
                  }

                  if (event.key === 'Escape') {
                    event.preventDefault();
                    setDraftNode(null);
                  }
                }}
                placeholder="New sitemap page"
                className={clsx(FIELD_CLASSES, 'max-w-md')}
              />
              <p className="mt-2 text-xs text-graystone-500">
                Press Enter to save, or cancel to remove this draft row.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                void saveDraftNode();
              }}
            >
              Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDraftNode(null)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderNode = (node, level) => {
    const childNodes =
      level < 2 ? childrenByParent.get(node.id) || [] : [];
    const statusMeta = STATUS_META[node.status] || STATUS_META.planned;
    const pageTypeMeta = PAGE_TYPE_META[node.page_type] || PAGE_TYPE_META.content;
    const linkedPage = node.linked_page_id
      ? pageMap.get(node.linked_page_id)
      : null;

    return (
      <div key={node.id} className="space-y-2">
        <div
          className={clsx(
            'group rounded-xl border border-graystone-200 bg-white px-4 py-3 shadow-sm transition-colors hover:border-ocean-200',
            INDENT_CLASSES[level]
          )}
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <span
                className={clsx('mt-1 h-2 w-2 rounded-full', statusMeta.dotClass)}
                title={statusMeta.label}
              />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {renderEditableText(
                    node,
                    'name',
                    'font-medium text-ocean-900',
                    'Untitled page'
                  )}
                  {renderEditableText(
                    node,
                    'slug',
                    'text-xs text-graystone-500',
                    'Add slug'
                  )}
                  <Badge className={pageTypeMeta.className}>
                    {pageTypeMeta.label}
                  </Badge>
                  {linkedPage ? (
                    <div className="flex flex-wrap items-center gap-2">
                      {linkPickerNodeId === node.id ? (
                        <select
                          autoFocus
                          value={node.linked_page_id || ''}
                          onBlur={() => setLinkPickerNodeId(null)}
                          onChange={(event) => {
                            void updateLinkedPage(node.id, event.target.value);
                          }}
                          className={clsx(FIELD_CLASSES, 'min-w-[220px] px-2 py-1.5 text-xs')}
                        >
                          <option value="">None</option>
                          {pages.map((page) => (
                            <option key={page.id} value={page.id}>
                              {getPageOptionLabel(page)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (isAdminUser) {
                              setLinkPickerNodeId(node.id);
                            }
                          }}
                          className={clsx(
                            'inline-flex',
                            isAdminUser && 'hover:opacity-80'
                          )}
                        >
                          <Badge className="bg-green-100 text-green-700">
                            {linkedPage.name}
                          </Badge>
                        </button>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {isAdminUser ? (
              <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                {level < 2 ? (
                  <button
                    type="button"
                    onClick={() => createDraft(node.id, level + 1)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-graystone-500 hover:bg-aqua-50 hover:text-ocean-700"
                    title="Add child"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => togglePanel(node)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-graystone-500 hover:bg-aqua-50 hover:text-ocean-700"
                  title="Edit details"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const childCount = countDescendants(node.id);
                    const message = childCount
                      ? `Delete ${node.name}? This will also delete ${childCount} child ${childCount === 1 ? 'page' : 'pages'}.`
                      : `Delete ${node.name}?`;
                    if (window.confirm(message)) {
                      void handlers.handleDeleteSitemapNode(node.id);
                    }
                  }}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                  title="Delete node"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {expandedNodeId === node.id ? (
          <div className={clsx(INDENT_CLASSES[level])}>
            <div className="rounded-b-xl border-t border-graystone-100 bg-graystone-50 px-4 py-3">
              <div className="grid gap-3 lg:grid-cols-3">
                <select
                  value={panelForm.page_type}
                  onChange={(event) =>
                    setPanelForm((previous) => ({
                      ...previous,
                      page_type: event.target.value,
                    }))
                  }
                  className={FIELD_CLASSES}
                >
                  <option value="content">Content</option>
                  <option value="form">Form</option>
                  <option value="redirect">Redirect</option>
                  <option value="external">External</option>
                </select>

                <select
                  value={panelForm.status}
                  onChange={(event) =>
                    setPanelForm((previous) => ({
                      ...previous,
                      status: event.target.value,
                    }))
                  }
                  className={FIELD_CLASSES}
                >
                  <option value="planned">Planned</option>
                  <option value="in_progress">In progress</option>
                  <option value="live">Live</option>
                </select>

                <select
                  value={panelForm.linked_page_id}
                  onChange={(event) =>
                    setPanelForm((previous) => ({
                      ...previous,
                      linked_page_id: event.target.value,
                    }))
                  }
                  className={FIELD_CLASSES}
                >
                  <option value="">None</option>
                  {pages.map((page) => (
                    <option key={page.id} value={page.id}>
                      {getPageOptionLabel(page)}
                    </option>
                  ))}
                </select>
              </div>

              <textarea
                rows={3}
                value={panelForm.notes}
                onChange={(event) =>
                  setPanelForm((previous) => ({
                    ...previous,
                    notes: event.target.value,
                  }))
                }
                placeholder="Notes"
                className={clsx(FIELD_CLASSES, 'mt-3')}
              />

              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setExpandedNodeId(null)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    void savePanel(node.id);
                  }}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {level < 2 && (childNodes.length > 0 || draftNode?.parent_id === node.id) ? (
          <div className="ml-3 border-l-2 border-graystone-100 pl-3">
            <div className="space-y-2">
              {draftNode?.parent_id === node.id ? renderDraftRow(level + 1) : null}
              {childNodes.map((childNode) => renderNode(childNode, level + 1))}
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <section className="rounded-2xl border border-graystone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h3 className="text-xl font-semibold text-ocean-900">Sitemap</h3>
            <p className="text-sm text-graystone-500">
              Plan the information architecture and link nodes back to the page inventory.
            </p>
          </div>
          <span className="rounded-full bg-graystone-100 px-2 py-0.5 text-xs text-graystone-600">
            {sitemapNodes.length} nodes
          </span>
        </div>

        {isAdminUser ? (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={!importablePages.length}
              onClick={() => {
                void requestImport();
              }}
            >
              Import from Pages
            </Button>
            <Button
              size="sm"
              onClick={() => createDraft(null, 0)}
              disabled={!projectId}
            >
              <Plus className="h-4 w-4" />
              Add top-level page
            </Button>
          </div>
        ) : null}
      </div>

      {showImportConfirm ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p>
            Add {importablePages.length} pages from inventory as sitemap nodes? This
            will add pages not yet in the sitemap.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                void confirmImport();
              }}
            >
              Confirm import
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowImportConfirm(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mt-5 space-y-3">
        {rootNodes.length === 0 && !draftNode ? (
          <div className="rounded-xl border border-dashed border-graystone-300 bg-graystone-50 px-4 py-8 text-center text-sm text-graystone-500">
            No sitemap yet — add your first top-level page or import from the Page
            Inventory.
          </div>
        ) : (
          <>
            {rootNodes.map((node) => renderNode(node, 0))}
            {draftNode?.parent_id === null ? renderDraftRow(0) : null}
          </>
        )}
      </div>
    </section>
  );
}
