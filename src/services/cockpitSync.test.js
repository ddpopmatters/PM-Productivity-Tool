import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildCockpitSnapshotPayload, syncCockpitSnapshot } from './cockpitSync';

describe('cockpit sync bridge', () => {
  it('maps authenticated PM Productivity Tool state into the cockpit snapshot contract', () => {
    const payload = buildCockpitSnapshotPayload({
      entries: [{
        id: 'project-1',
        title: 'Website launch',
        caption: 'Launch readiness work.',
        workflowStatus: 'In Progress',
        team: 'Comms',
        timelineValue: '2026-05',
        owner: ['Dan Davis'],
        ownerEmail: ['daniel.davis@populationmatters.org'],
        tags: ['high'],
        archived: false,
        itemType: 'project',
        createdAt: '2026-05-10T08:00:00.000Z',
        updatedAt: '2026-05-10T09:00:00.000Z',
      }],
      workstreams: [{ id: 'stream-1', title: 'Comms', description: 'Comms work.' }],
      workstreamTasks: [{ id: 'task-1', workstream_id: 'stream-1', title: 'Confirm supporter email' }],
      todos: [{ id: 'todo-1', text: 'Book review slot', completed: false }],
      events: [{ id: 'event-1', title: 'Board meeting', event_date: '2026-05-12' }],
      userEmail: 'daniel.davis@populationmatters.org',
      now: new Date('2026-05-10T20:30:00.000Z'),
    });

    expect(payload).toMatchObject({
      generatedAt: '2026-05-10T20:30:00.000Z',
      source: 'PM Productivity Tool',
      userEmail: 'daniel.davis@populationmatters.org',
      workflowItems: [{
        id: 'project-1',
        title: 'Website launch',
        workflow_status: 'In Progress',
        timeline_value: '2026-05',
        owner_email: ['daniel.davis@populationmatters.org'],
        item_type: 'project',
      }],
      workstreams: [{ id: 'stream-1', title: 'Comms' }],
      workstreamTasks: [{ id: 'task-1', title: 'Confirm supporter email' }],
      personalTodos: [{ id: 'todo-1', text: 'Book review slot' }],
      events: [{ id: 'event-1', title: 'Board meeting' }],
    });
  });

  it('posts empty authenticated snapshots so stale cockpit counts can clear', async () => {
    let postedBody = null;
    const result = await syncCockpitSnapshot({
      entries: [],
      workstreams: [],
      workstreamTasks: [],
      todos: [],
      events: [],
      userEmail: 'daniel.davis@populationmatters.org',
      now: new Date('2026-05-10T20:45:00.000Z'),
    }, async (_url, options) => {
      postedBody = JSON.parse(options.body);
      return { ok: true, status: 201 };
    });

    expect(result).toEqual({ ok: true, status: 201, skipped: false });
    expect(postedBody).toMatchObject({
      workflowItems: [],
      workstreams: [],
      workstreamTasks: [],
      personalTodos: [],
      events: [],
    });
  });

  it('allows the local cockpit endpoint through the app content security policy', () => {
    const indexHtml = readFileSync('index.html', 'utf8');

    expect(indexHtml).toContain('http://127.0.0.1:5177');
    expect(indexHtml).toContain('http://localhost:5177');
    expect(indexHtml).toContain('https://unpkg.com');
    expect(indexHtml).not.toContain('frame-ancestors');
    expect(indexHtml).not.toContain('X-Frame-Options');
  });
});
