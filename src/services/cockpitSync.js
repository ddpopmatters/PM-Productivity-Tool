const COCKPIT_INGEST_URL = 'http://127.0.0.1:5177/api/productivity-ingest';

export function buildCockpitSnapshotPayload({
  entries = [],
  workstreams = [],
  workstreamTasks = [],
  todos = [],
  events = [],
  userEmail = '',
  now = new Date(),
}) {
  return {
    generatedAt: now.toISOString(),
    source: 'PM Productivity Tool',
    userEmail,
    workflowItems: entries.map(entryToWorkflowRow),
    workstreams: workstreams.map(shallowRecord),
    workstreamTasks: workstreamTasks.map(shallowRecord),
    personalTodos: todos.map(shallowRecord),
    events: events.map(shallowRecord),
  };
}

export async function syncCockpitSnapshot(input, fetcher = fetch) {
  const payload = buildCockpitSnapshotPayload(input);

  try {
    const response = await fetcher(COCKPIT_INGEST_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-PM-Cockpit-Action': 'productivity-ingest',
      },
      body: JSON.stringify(payload),
    });

    return {
      ok: response.ok,
      status: response.status,
      skipped: false,
    };
  } catch {
    return { ok: false, skipped: false };
  }
}

function entryToWorkflowRow(entry) {
  return {
    id: entry.id,
    title: entry.title,
    caption: entry.caption,
    workflow_status: entry.workflowStatus,
    team: entry.team,
    timeline_value: entry.timelineValue,
    owner: entry.owner,
    owner_email: entry.ownerEmail,
    collaborators: entry.collaborators,
    tags: entry.tags,
    subtasks: entry.subtasks,
    documents: entry.documents,
    date: entry.date,
    comments: entry.comments,
    archived: entry.archived,
    dependencies: entry.dependencies,
    custom_fields: entry.customFields,
    attachments: entry.attachments,
    item_type: entry.itemType,
    phase: entry.phase,
    created_at: entry.createdAt,
    updated_at: entry.updatedAt,
  };
}

function shallowRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return { ...value };
}
