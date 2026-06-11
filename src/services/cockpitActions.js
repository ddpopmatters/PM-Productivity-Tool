const COCKPIT_ACTIONS_URL = 'http://127.0.0.1:5177/api/productivity-actions';
const COCKPIT_ACTION_RESULT_URL = 'http://127.0.0.1:5177/api/productivity-action-result';
const COCKPIT_INTAKE_URL = 'http://127.0.0.1:5177/api/productivity-intake';
const COCKPIT_INTAKE_RESULT_URL = 'http://127.0.0.1:5177/api/productivity-intake-result';

export async function applyCockpitProductivityActions({
  addItem,
  createWorkstreamTask,
  addTodo,
  updateEntry,
  updateWorkstreamTask,
  updateTodo,
  currentUser,
  userEmail,
  fetcher = fetch,
}) {
  const actions = await fetchCockpitProductivityActions(fetcher);
  const intake = await fetchCockpitProductivityIntake(fetcher);
  let applied = 0;
  let failed = 0;

  for (const action of actions) {
    try {
      await applyCockpitProductivityAction(action, {
        updateEntry,
        updateWorkstreamTask,
        updateTodo,
      });
      await reportCockpitProductivityActionResult(fetcher, {
        actionId: action.id,
        status: 'completed',
        message: 'Applied in PM Productivity Tool.',
      });
      applied += 1;
    } catch (error) {
      await reportCockpitProductivityActionResult(fetcher, {
        actionId: action.id,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Unable to apply PM Productivity Tool quick action.',
      });
      failed += 1;
    }
  }

  for (const request of intake) {
    try {
      const created = await applyCockpitProductivityIntake(request, {
        addItem,
        createWorkstreamTask,
        addTodo,
        currentUser,
        userEmail,
      });
      await reportCockpitProductivityIntakeResult(fetcher, {
        intakeId: request.id,
        state: 'completed',
        message: 'Created in PM Productivity Tool.',
        ...created,
      });
      applied += 1;
    } catch (error) {
      await reportCockpitProductivityIntakeResult(fetcher, {
        intakeId: request.id,
        state: 'failed',
        message: error instanceof Error ? error.message : 'Unable to create PM Productivity Tool item.',
      });
      failed += 1;
    }
  }

  return { applied, failed };
}

async function fetchCockpitProductivityActions(fetcher) {
  const response = await fetcher(COCKPIT_ACTIONS_URL, {
    headers: {
      'X-PM-Cockpit-Action': 'productivity-actions',
    },
  });
  if (!response.ok) return [];
  const body = await response.json().catch(() => null);
  return Array.isArray(body?.actions) ? body.actions.filter(isSupportedAction) : [];
}

async function fetchCockpitProductivityIntake(fetcher) {
  const response = await fetcher(COCKPIT_INTAKE_URL, {
    headers: {
      'X-PM-Cockpit-Action': 'productivity-intake',
    },
  });
  if (!response.ok) return [];
  const body = await response.json().catch(() => null);
  return Array.isArray(body?.intake) ? body.intake.filter(isSupportedIntake) : [];
}

async function applyCockpitProductivityAction(action, handlers) {
  if (action.action === 'archive' && action.targetKind === 'workflow_item') {
    const result = await handlers.updateEntry?.(action.targetId, { archived: true });
    if (!result) throw new Error(`Archive failed for ${action.title}.`);
    return;
  }

  if (action.action === 'complete' && action.targetKind === 'workstream_task') {
    const result = await handlers.updateWorkstreamTask?.(action.targetId, { status: 'done' });
    if (!result) throw new Error(`Completion failed for ${action.title}.`);
    return;
  }

  if (action.action === 'complete' && action.targetKind === 'personal_todo') {
    const result = await handlers.updateTodo?.(action.targetId, { completed: true });
    if (!result) throw new Error(`Completion failed for ${action.title}.`);
    return;
  }

  throw new Error(`Unsupported quick action: ${action.action}.`);
}

async function applyCockpitProductivityIntake(request, handlers) {
  if (request.kind === 'workflow_task') {
    const result = await handlers.addItem?.({
      title: request.title,
      caption: request.detail || '',
      workflowStatus: request.status || 'todo',
      team: request.team || '',
      date: request.dueDate || null,
      itemType: 'job',
      tags: request.tags || [],
    }, handlers.currentUser, handlers.userEmail);
    if (!result) throw new Error(`Create failed for ${request.title}.`);
    return createdTarget('workflow_item', resultId(result), workflowItemUrl(resultId(result)));
  }

  if (request.kind === 'workflow_project') {
    const result = await handlers.addItem?.({
      title: request.title,
      caption: request.detail || '',
      workflowStatus: request.status || 'Idea',
      team: request.team || '',
      timelineValue: request.dueDate || '',
      date: request.dueDate || null,
      itemType: 'project',
      tags: request.tags || [],
    }, handlers.currentUser, handlers.userEmail);
    if (!result) throw new Error(`Create failed for ${request.title}.`);
    return createdTarget('workflow_item', resultId(result), workflowItemUrl(resultId(result)));
  }

  if (request.kind === 'workstream_task') {
    const result = await handlers.createWorkstreamTask?.({
      workstreamId: request.workstreamId,
      title: request.title,
      description: request.detail || '',
      priority: request.priority || 'medium',
      deadline: request.dueDate || null,
      assignee: request.assignee || '',
      assigneeEmail: request.assigneeEmail || '',
      taskType: 'Issue',
      tags: request.tags || [],
    });
    if (!result) throw new Error(`Create failed for ${request.title}.`);
    const id = resultId(result);
    return createdTarget('workstream_task', id, workstreamTaskUrl(request.workstreamId, id));
  }

  if (request.kind === 'personal_todo') {
    const result = await handlers.addTodo?.({
      text: request.title,
      completed: false,
      date: request.dueDate || null,
    }, handlers.userEmail);
    if (!result) throw new Error(`Create failed for ${request.title}.`);
    return createdTarget('personal_todo', resultId(result), personalTodoUrl(resultId(result)));
  }

  throw new Error(`Unsupported intake type: ${request.kind}.`);
}

function createdTarget(createdTargetKind, createdTargetId, createdSourceUrl) {
  if (!createdTargetId) return {};
  return {
    createdTargetKind,
    createdTargetId,
    createdSourceUrl,
  };
}

function resultId(result) {
  if (result && typeof result.id === 'string' && result.id.trim()) return result.id.trim();
  if (result && typeof result.task_id === 'string' && result.task_id.trim()) return result.task_id.trim();
  if (result && typeof result.event_id === 'string' && result.event_id.trim()) return result.event_id.trim();
  return null;
}

function workflowItemUrl(id) {
  return id ? `http://127.0.0.1:3000/PM-Productivity-Tool/items/${encodeURIComponent(id)}` : null;
}

function workstreamTaskUrl(workstreamId, taskId) {
  if (!workstreamId || !taskId) return null;
  return `http://127.0.0.1:3000/PM-Productivity-Tool/workstreams/${encodeURIComponent(workstreamId)}/tasks/${encodeURIComponent(taskId)}`;
}

function personalTodoUrl(id) {
  return id ? `http://127.0.0.1:3000/PM-Productivity-Tool/todos/${encodeURIComponent(id)}` : null;
}

async function reportCockpitProductivityActionResult(fetcher, result) {
  await fetcher(COCKPIT_ACTION_RESULT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-PM-Cockpit-Action': 'productivity-action-result',
    },
    body: JSON.stringify(result),
  });
}

async function reportCockpitProductivityIntakeResult(fetcher, result) {
  await fetcher(COCKPIT_INTAKE_RESULT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-PM-Cockpit-Action': 'productivity-intake-result',
    },
    body: JSON.stringify(result),
  });
}

function isSupportedAction(action) {
  return action
    && typeof action.id === 'string'
    && (
      (action.action === 'archive' && action.targetKind === 'workflow_item')
      || (action.action === 'complete' && action.targetKind === 'workstream_task')
      || (action.action === 'complete' && action.targetKind === 'personal_todo')
    )
    && typeof action.targetId === 'string'
    && typeof action.title === 'string';
}

function isSupportedIntake(request) {
  return request
    && typeof request.id === 'string'
    && (
      request.kind === 'workflow_task'
      || request.kind === 'workflow_project'
      || request.kind === 'workstream_task'
      || request.kind === 'personal_todo'
    )
    && typeof request.title === 'string';
}
