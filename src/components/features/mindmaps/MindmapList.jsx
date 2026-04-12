import React from 'react';
import Icon from '../../ui/Icon';

function formatDate(value) {
  if (!value) return 'Unknown';
  return new Date(value).toLocaleDateString();
}

const MindmapList = ({
  mindmaps,
  setMindmaps,
  onOpenMindmap,
  userEmail,
  mindmapApi,
}) => {
  const handleCreateMindmap = async () => {
    const title = window.prompt('Title for the new mindmap?');
    if (!title || !title.trim()) return;

    const createdMindmap = await mindmapApi.createMindmap(title.trim(), userEmail);
    if (!createdMindmap) return;

    const data = await mindmapApi.fetchMindmaps(userEmail);
    setMindmaps(data);
    onOpenMindmap(createdMindmap.id);
  };

  const handleDeleteMindmap = async (mindmapId, event) => {
    event.stopPropagation();
    if (!window.confirm('Delete this mindmap?')) return;

    const success = await mindmapApi.deleteMindmap(mindmapId);
    if (!success) return;

    const data = await mindmapApi.fetchMindmaps(userEmail);
    setMindmaps(data);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ocean-900">Mindmaps</h1>
          <p className="text-sm text-gray-500">Capture loose thoughts, cluster them, and shape them into something usable.</p>
        </div>
        <button
          onClick={handleCreateMindmap}
          className="inline-flex items-center gap-2 rounded-xl bg-ocean-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ocean-700"
        >
          <Icon name="plus" className="w-4 h-4" />
          New mindmap
        </button>
      </div>

      {mindmaps.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-ocean-50 text-ocean-600">
            <Icon name="git-branch" className="w-6 h-6" />
          </div>
          <p className="text-base font-medium text-gray-700">No mindmaps yet — create one to start dumping thoughts</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {mindmaps.map((mindmap) => {
            const nodeCount = Array.isArray(mindmap.nodes) ? mindmap.nodes.length : 0;

            return (
              <div
                key={mindmap.id}
                role="button"
                tabIndex={0}
                onClick={() => onOpenMindmap(mindmap.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onOpenMindmap(mindmap.id);
                  }
                }}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 text-left transition-all hover:-translate-y-0.5 hover:border-ocean-300 hover:shadow-md cursor-pointer"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold text-ocean-900">{mindmap.title}</h2>
                    <p className="mt-1 text-sm text-gray-500">{nodeCount} {nodeCount === 1 ? 'node' : 'nodes'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(event) => handleDeleteMindmap(mindmap.id, event)}
                    className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    aria-label={`Delete ${mindmap.title}`}
                  >
                    <Icon name="trash-2" className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Icon name="calendar-days" className="w-4 h-4 text-ocean-500" />
                  <span>Created {formatDate(mindmap.created_at)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MindmapList;
