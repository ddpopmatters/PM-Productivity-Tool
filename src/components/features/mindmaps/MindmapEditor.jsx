import React, { useEffect, useMemo, useState } from 'react';
import Icon from '../../ui/Icon';

function normalizeNodes(nodes) {
  return Array.isArray(nodes) ? nodes : [];
}

function buildUpdatedNode(nodeId, draft) {
  return (node) => {
    if (node.id !== nodeId) return node;

    const nextGroup = draft.group.trim();
    const nextNote = draft.note.trim();

    return {
      ...node,
      text: draft.text.trim(),
      group: nextGroup || undefined,
      note: nextNote || undefined,
    };
  };
}

const MindmapEditor = ({
  mindmapId,
  mindmap,
  onBack,
  mindmapApi,
  userEmail,
}) => {
  const [title, setTitle] = useState('');
  const [titleDraft, setTitleDraft] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [nodes, setNodes] = useState([]);
  const [groupInputs, setGroupInputs] = useState({});
  const [ungroupedInput, setUngroupedInput] = useState('');
  const [editingNodeId, setEditingNodeId] = useState(null);
  const [nodeDraft, setNodeDraft] = useState({ text: '', group: '', note: '' });

  useEffect(() => {
    if (!mindmap) return;
    setTitle(mindmap.title || '');
    setTitleDraft(mindmap.title || '');
    setNodes(normalizeNodes(mindmap.nodes));
  }, [mindmap]);

  const groupNames = useMemo(() => {
    return Array.from(
      new Set(
        nodes
          .map((node) => node.group?.trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [nodes]);

  const groupedNodes = useMemo(() => {
    const groups = new Map();
    const ungrouped = [];

    nodes.forEach((node) => {
      const groupName = node.group?.trim();
      if (!groupName) {
        ungrouped.push(node);
        return;
      }

      if (!groups.has(groupName)) {
        groups.set(groupName, []);
      }

      groups.get(groupName).push(node);
    });

    return {
      groups: Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b)),
      ungrouped,
    };
  }, [nodes]);

  const groupListId = `mindmap-groups-${mindmapId}`;

  const persistNodes = async (updatedNodes) => {
    setNodes(updatedNodes);
    await mindmapApi.updateMindmap(mindmapId, { nodes: updatedNodes });
  };

  const saveTitle = async () => {
    const nextTitle = titleDraft.trim() || 'Untitled Mindmap';
    setIsEditingTitle(false);
    setTitle(nextTitle);
    setTitleDraft(nextTitle);
    await mindmapApi.updateMindmap(mindmapId, { title: nextTitle });
  };

  const startNodeEdit = (node) => {
    setEditingNodeId(node.id);
    setNodeDraft({
      text: node.text || '',
      group: node.group || '',
      note: node.note || '',
    });
  };

  const saveNodeEdit = async () => {
    if (!editingNodeId) return;

    const nextText = nodeDraft.text.trim();
    if (!nextText) {
      setEditingNodeId(null);
      setNodeDraft({ text: '', group: '', note: '' });
      return;
    }

    const updatedNodes = nodes.map(buildUpdatedNode(editingNodeId, nodeDraft));
    setEditingNodeId(null);
    setNodeDraft({ text: '', group: '', note: '' });
    await persistNodes(updatedNodes);
  };

  const removeNode = async (nodeId) => {
    const updatedNodes = nodes.filter((node) => node.id !== nodeId);
    await persistNodes(updatedNodes);
  };

  const addNode = async (groupName) => {
    const isUngrouped = !groupName;
    const inputValue = isUngrouped ? ungroupedInput : groupInputs[groupName] || '';
    const nextText = inputValue.trim();
    if (!nextText) return;

    const newNode = {
      id: crypto.randomUUID(),
      text: nextText,
      group: groupName || undefined,
      note: undefined,
      created_at: new Date().toISOString(),
    };

    const updatedNodes = [...nodes, newNode];
    if (isUngrouped) {
      setUngroupedInput('');
    } else {
      setGroupInputs((prev) => ({ ...prev, [groupName]: '' }));
    }
    await persistNodes(updatedNodes);
  };

  const renderNode = (node) => {
    const isEditing = editingNodeId === node.id;

    if (isEditing) {
      return (
        <div
          key={node.id}
          className="rounded-xl border border-ocean-200 bg-ocean-50 p-4 shadow-sm"
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              saveNodeEdit();
            }
          }}
        >
          <div className="space-y-3">
            <textarea
              value={nodeDraft.text}
              onChange={(event) => setNodeDraft((prev) => ({ ...prev, text: event.target.value }))}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  saveNodeEdit();
                }
                if (event.key === 'Escape') {
                  setEditingNodeId(null);
                  setNodeDraft({ text: '', group: '', note: '' });
                }
              }}
              rows={2}
              autoFocus
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-100"
              placeholder="Thought"
            />
            <input
              type="text"
              value={nodeDraft.group}
              onChange={(event) => setNodeDraft((prev) => ({ ...prev, group: event.target.value }))}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  saveNodeEdit();
                }
              }}
              list={groupListId}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-100"
              placeholder="Group"
            />
            <textarea
              value={nodeDraft.note}
              onChange={(event) => setNodeDraft((prev) => ({ ...prev, note: event.target.value }))}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  saveNodeEdit();
                }
              }}
              rows={3}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-100"
              placeholder="Optional note"
            />
          </div>
        </div>
      );
    }

    return (
      <div
        key={node.id}
        role="button"
        tabIndex={0}
        onClick={() => startNodeEdit(node)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            startNodeEdit(node);
          }
        }}
        className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all hover:border-ocean-300 hover:shadow-md cursor-pointer"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="whitespace-pre-wrap text-sm font-medium text-gray-800">{node.text}</p>
            {node.note ? (
              <p className="mt-2 whitespace-pre-wrap text-xs text-gray-500">{node.note}</p>
            ) : null}
            <div className="mt-3 flex items-center gap-2">
              <span className="rounded-full bg-ocean-50 px-2.5 py-1 text-xs font-medium text-ocean-700">
                {node.group?.trim() || 'Ungrouped'}
              </span>
              <span className="text-xs text-gray-400">{new Date(node.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              removeNode(node.id);
            }}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
            aria-label="Delete thought"
          >
            <Icon name="trash-2" className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  const renderAddInput = (groupName, isUngrouped = false) => (
    <input
      type="text"
      value={isUngrouped ? ungroupedInput : groupInputs[groupName] || ''}
      onChange={(event) => {
        if (isUngrouped) {
          setUngroupedInput(event.target.value);
          return;
        }

        const nextValue = event.target.value;
        setGroupInputs((prev) => ({ ...prev, [groupName]: nextValue }));
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          addNode(groupName);
        }
      }}
      placeholder={isUngrouped ? 'Add to ungrouped' : 'Add thought'}
      className="w-full rounded-xl border border-dashed border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 shadow-sm transition-colors focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-100"
    />
  );

  if (!mindmap) {
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-ocean-300 hover:text-ocean-700"
        >
          <Icon name="arrow-left" className="w-4 h-4" />
          Back
        </button>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-12 text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-ocean-200 border-t-ocean-600" />
          <p className="text-sm text-gray-500">Loading mindmap…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <datalist id={groupListId}>
        {groupNames.map((groupName) => (
          <option key={groupName} value={groupName} />
        ))}
      </datalist>

      <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-ocean-300 hover:text-ocean-700"
          >
            <Icon name="arrow-left" className="w-4 h-4" />
            Back
          </button>

          <div>
            {isEditingTitle ? (
              <input
                type="text"
                value={titleDraft}
                onChange={(event) => setTitleDraft(event.target.value)}
                onBlur={saveTitle}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    saveTitle();
                  }
                  if (event.key === 'Escape') {
                    setTitleDraft(title);
                    setIsEditingTitle(false);
                  }
                }}
                autoFocus
                className="w-full min-w-[240px] rounded-lg border border-gray-200 px-3 py-2 text-xl font-semibold text-ocean-900 focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-100"
              />
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingTitle(true)}
                className="text-left text-2xl font-bold text-ocean-900 transition-colors hover:text-ocean-700"
              >
                {title}
              </button>
            )}
            <p className="mt-1 text-sm text-gray-500">{userEmail}</p>
          </div>
        </div>

        <span className="inline-flex items-center gap-2 rounded-full bg-ocean-50 px-3 py-1 text-sm font-medium text-ocean-700">
          <Icon name="git-branch" className="w-4 h-4" />
          {nodes.length} {nodes.length === 1 ? 'thought' : 'thoughts'}
        </span>
      </div>

      <div className="space-y-6">
        {groupedNodes.groups.map(([groupName, groupNodes]) => (
          <section key={groupName} className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/70 p-5">
            <header className="text-sm font-semibold text-gray-600 uppercase tracking-wide">{groupName}</header>
            <div className="space-y-3">
              {groupNodes.map(renderNode)}
              {renderAddInput(groupName)}
            </div>
          </section>
        ))}

        <section className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/70 p-5">
          <header className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Ungrouped</header>
          <div className="space-y-3">
            {groupedNodes.ungrouped.map(renderNode)}
            {renderAddInput('', true)}
          </div>
        </section>
      </div>
    </div>
  );
};

export default MindmapEditor;
