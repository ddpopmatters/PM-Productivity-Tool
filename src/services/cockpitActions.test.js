import { describe, expect, it, vi } from 'vitest';
import { applyCockpitProductivityActions } from './cockpitActions';

describe('cockpit productivity quick actions', () => {
  it('archives workflow items requested by the PM Hermes Cockpit', async () => {
    const updateEntry = vi.fn().mockResolvedValue(true);
    const calls = [];
    const fetcher = vi.fn(async (url, options = {}) => {
      calls.push({ url, options });
      if (String(url).endsWith('/api/productivity-actions')) {
        return {
          ok: true,
          json: async () => ({
            actions: [{
              id: 'action-1',
              action: 'archive',
              targetKind: 'workflow_item',
              targetId: 'item-1',
              title: 'Write supporter email',
            }],
          }),
        };
      }
      return { ok: true, json: async () => ({ ok: true }) };
    });

    const result = await applyCockpitProductivityActions({ updateEntry, fetcher });

    expect(updateEntry).toHaveBeenCalledWith('item-1', { archived: true });
    expect(result).toEqual({ applied: 1, failed: 0 });
    expect(calls.at(-1)).toMatchObject({
      url: 'http://127.0.0.1:5177/api/productivity-action-result',
      options: {
        method: 'POST',
      },
    });
    expect(JSON.parse(calls.at(-1).options.body)).toMatchObject({
      actionId: 'action-1',
      status: 'completed',
    });
  });

  it('completes workstream tasks and personal to-dos requested by the cockpit', async () => {
    const updateEntry = vi.fn().mockResolvedValue(true);
    const updateWorkstreamTask = vi.fn().mockResolvedValue(true);
    const updateTodo = vi.fn().mockResolvedValue(true);
    const reported = [];
    const fetcher = vi.fn(async (url, options = {}) => {
      if (String(url).endsWith('/api/productivity-actions')) {
        return {
          ok: true,
          json: async () => ({
            actions: [
              {
                id: 'action-task',
                action: 'complete',
                targetKind: 'workstream_task',
                targetId: 'task-1',
                title: 'Confirm supporter email',
              },
              {
                id: 'action-todo',
                action: 'complete',
                targetKind: 'personal_todo',
                targetId: 'todo-1',
                title: 'Book review slot',
              },
            ],
          }),
        };
      }
      if (String(url).endsWith('/api/productivity-intake')) {
        return { ok: true, json: async () => ({ intake: [] }) };
      }
      reported.push(JSON.parse(options.body));
      return { ok: true, json: async () => ({ ok: true }) };
    });

    const result = await applyCockpitProductivityActions({
      updateEntry,
      updateWorkstreamTask,
      updateTodo,
      fetcher,
    });

    expect(updateEntry).not.toHaveBeenCalled();
    expect(updateWorkstreamTask).toHaveBeenCalledWith('task-1', { status: 'done' });
    expect(updateTodo).toHaveBeenCalledWith('todo-1', { completed: true });
    expect(result).toEqual({ applied: 2, failed: 0 });
    expect(reported).toEqual([
      expect.objectContaining({ actionId: 'action-task', status: 'completed' }),
      expect.objectContaining({ actionId: 'action-todo', status: 'completed' }),
    ]);
  });

  it('creates new PM Productivity Tool items requested by the cockpit intake queue', async () => {
    const addItem = vi.fn().mockResolvedValue({ id: 'item-1' });
    const createWorkstreamTask = vi.fn().mockResolvedValue({ id: 'task-1' });
    const addTodo = vi.fn().mockResolvedValue({ id: 'todo-1' });
    const reported = [];
    const fetcher = vi.fn(async (url, options = {}) => {
      if (String(url).endsWith('/api/productivity-actions')) {
        return { ok: true, json: async () => ({ actions: [] }) };
      }
      if (String(url).endsWith('/api/productivity-intake')) {
        return {
          ok: true,
          json: async () => ({
            intake: [
              {
                id: 'intake-task',
                kind: 'workflow_task',
                title: 'Draft supporter update',
                detail: 'Prepare first pass.',
                dueDate: '2026-05-12',
                status: 'todo',
                team: 'Communications',
                tags: ['cockpit'],
              },
              {
                id: 'intake-workstream',
                kind: 'workstream_task',
                title: 'Check digital backlog',
                detail: 'Review outstanding website items.',
                workstreamId: 'workstream-1',
                priority: 'high',
                dueDate: '2026-05-13',
              },
              {
                id: 'intake-todo',
                kind: 'personal_todo',
                title: 'Book review slot',
                dueDate: '2026-05-14',
              },
            ],
          }),
        };
      }
      reported.push(JSON.parse(options.body));
      return { ok: true, json: async () => ({ ok: true }) };
    });

    const result = await applyCockpitProductivityActions({
      addItem,
      createWorkstreamTask,
      addTodo,
      currentUser: 'Dan',
      userEmail: 'dan@example.org',
      fetcher,
    });

    expect(addItem).toHaveBeenCalledWith({
      title: 'Draft supporter update',
      caption: 'Prepare first pass.',
      workflowStatus: 'todo',
      team: 'Communications',
      date: '2026-05-12',
      itemType: 'job',
      tags: ['cockpit'],
    }, 'Dan', 'dan@example.org');
    expect(createWorkstreamTask).toHaveBeenCalledWith({
      workstreamId: 'workstream-1',
      title: 'Check digital backlog',
      description: 'Review outstanding website items.',
      priority: 'high',
      deadline: '2026-05-13',
      assignee: '',
      assigneeEmail: '',
      taskType: 'Issue',
      tags: [],
    });
    expect(addTodo).toHaveBeenCalledWith({
      text: 'Book review slot',
      completed: false,
      date: '2026-05-14',
    }, 'dan@example.org');
    expect(result).toEqual({ applied: 3, failed: 0 });
    expect(reported).toEqual([
      expect.objectContaining({
        intakeId: 'intake-task',
        state: 'completed',
        createdTargetKind: 'workflow_item',
        createdTargetId: 'item-1',
        createdSourceUrl: 'http://127.0.0.1:3000/PM-Productivity-Tool/items/item-1',
      }),
      expect.objectContaining({
        intakeId: 'intake-workstream',
        state: 'completed',
        createdTargetKind: 'workstream_task',
        createdTargetId: 'task-1',
        createdSourceUrl: 'http://127.0.0.1:3000/PM-Productivity-Tool/workstreams/workstream-1/tasks/task-1',
      }),
      expect.objectContaining({
        intakeId: 'intake-todo',
        state: 'completed',
        createdTargetKind: 'personal_todo',
        createdTargetId: 'todo-1',
        createdSourceUrl: 'http://127.0.0.1:3000/PM-Productivity-Tool/todos/todo-1',
      }),
    ]);
  });
});
