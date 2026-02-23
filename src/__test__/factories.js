let _idCounter = 0;

function nextId() {
  _idCounter += 1;
  return `test-${_idCounter}`;
}

/** Reset ID counter between tests */
export function resetFactories() {
  _idCounter = 0;
}

/**
 * Build a workflow item (entry) with sensible defaults.
 * Pass overrides to customise specific fields.
 */
export function createEntry(overrides = {}) {
  const id = overrides.id || nextId();
  return {
    id,
    title: `Test Entry ${id}`,
    caption: '',
    workflowStatus: 'Not Started',
    team: 'Advocacy & Influence',
    timelineValue: null,
    owner: ['Dan Davis'],
    ownerEmail: ['daniel.davis@populationmatters.org'],
    collaborators: [],
    tags: [],
    subtasks: [],
    documents: [],
    date: new Date().toISOString().slice(0, 10),
    comments: [],
    dependencies: [],
    customFields: {},
    handoffNotes: [],
    archived: false,
    phase: 'current',
    sharePointUrl: null,
    ...overrides,
  };
}

/**
 * Build a todo item with sensible defaults.
 */
export function createTodo(overrides = {}) {
  const id = overrides.id || nextId();
  return {
    id,
    text: `Test Todo ${id}`,
    completed: false,
    created_at: new Date().toISOString(),
    due_date: null,
    priority: 'medium',
    category: null,
    ...overrides,
  };
}

/**
 * Build a workstream task with sensible defaults.
 */
export function createWorkstreamTask(overrides = {}) {
  const id = overrides.id || nextId();
  return {
    id,
    title: `Workstream Task ${id}`,
    status: 'todo',
    priority: 'medium',
    assignee: 'Dan Davis',
    workstreamId: overrides.workstreamId || nextId(),
    description: '',
    dueDate: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}
