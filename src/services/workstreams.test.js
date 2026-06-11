import { describe, it, expect, vi, afterEach } from 'vitest';
import * as supabaseModule from '../api/supabase';
import {
  fetchWorkstreams,
  fetchWorkstreamTasks,
  createWorkstream,
  updateWorkstream,
  deleteWorkstream,
  createWorkstreamTask,
  updateWorkstreamTask,
  deleteWorkstreamTask,
} from './workstreams';

afterEach(() => vi.restoreAllMocks());

/**
 * Builds a self-returning, awaitable supabase query chain.
 * Every chain method returns the chain; awaiting the chain (or calling
 * .single()) resolves to `result`.
 */
function makeChain(result) {
  const chain = {};
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'in', 'or', 'order'];
  for (const m of methods) chain[m] = vi.fn(() => chain);
  chain.single = vi.fn(async () => result);
  chain.then = (resolve) => resolve(result);
  return chain;
}

function mockSupabase(chain) {
  const fromFn = vi.fn(() => chain);
  vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({ from: fromFn });
  return fromFn;
}

function mockNoSupabase() {
  vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue(null);
}

// -- fetchWorkstreams ---------------------------------------------------------

describe('fetchWorkstreams', () => {
  it('returns [] when supabase is unavailable', async () => {
    mockNoSupabase();
    expect(await fetchWorkstreams('dan@pm.org')).toEqual([]);
  });

  it('returns [] for an invalid email without querying', async () => {
    const chain = makeChain({ data: [{ id: '1' }], error: null });
    const fromFn = mockSupabase(chain);
    expect(await fetchWorkstreams('not-an-email')).toEqual([]);
    expect(fromFn).not.toHaveBeenCalled();
  });

  it('queries own and shared workstreams newest-first', async () => {
    const rows = [{ id: 'ws-1' }];
    const chain = makeChain({ data: rows, error: null });
    const fromFn = mockSupabase(chain);

    const result = await fetchWorkstreams('dan@pm.org');

    expect(fromFn).toHaveBeenCalledWith('workstreams');
    expect(chain.select).toHaveBeenCalledWith('*');
    expect(chain.or).toHaveBeenCalledWith('owner_email.eq.dan@pm.org,visibility.eq.shared');
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(result).toEqual(rows);
  });

  it('returns [] on query error', async () => {
    mockSupabase(makeChain({ data: null, error: new Error('boom') }));
    expect(await fetchWorkstreams('dan@pm.org')).toEqual([]);
  });

  it('returns [] when data is null with no error', async () => {
    mockSupabase(makeChain({ data: null, error: null }));
    expect(await fetchWorkstreams('dan@pm.org')).toEqual([]);
  });
});

// -- fetchWorkstreamTasks -----------------------------------------------------

describe('fetchWorkstreamTasks', () => {
  it('returns [] when supabase is unavailable', async () => {
    mockNoSupabase();
    expect(await fetchWorkstreamTasks(['a'])).toEqual([]);
  });

  it('returns [] for empty or non-array ids without querying', async () => {
    const fromFn = mockSupabase(makeChain({ data: [], error: null }));
    expect(await fetchWorkstreamTasks([])).toEqual([]);
    expect(await fetchWorkstreamTasks('not-array')).toEqual([]);
    expect(fromFn).not.toHaveBeenCalled();
  });

  it('queries tasks for the given workstream ids newest-first', async () => {
    const rows = [{ id: 't-1' }];
    const chain = makeChain({ data: rows, error: null });
    const fromFn = mockSupabase(chain);

    const result = await fetchWorkstreamTasks(['ws-1', 'ws-2']);

    expect(fromFn).toHaveBeenCalledWith('workstream_tasks');
    expect(chain.in).toHaveBeenCalledWith('workstream_id', ['ws-1', 'ws-2']);
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(result).toEqual(rows);
  });

  it('returns [] on query error (including missing-table 42P01)', async () => {
    mockSupabase(makeChain({ data: null, error: { code: '42P01' } }));
    expect(await fetchWorkstreamTasks(['ws-1'])).toEqual([]);

    vi.restoreAllMocks();
    mockSupabase(makeChain({ data: null, error: { code: '500' } }));
    expect(await fetchWorkstreamTasks(['ws-1'])).toEqual([]);
  });
});

// -- createWorkstream ---------------------------------------------------------

describe('createWorkstream', () => {
  it('returns null when supabase is unavailable', async () => {
    mockNoSupabase();
    expect(await createWorkstream({ title: 'X' }, 'dan@pm.org')).toBeNull();
  });

  it('inserts a mapped row with defaults and returns the created row', async () => {
    const created = { id: 'ws-9' };
    const chain = makeChain({ data: created, error: null });
    const fromFn = mockSupabase(chain);

    const result = await createWorkstream({ title: 'Research', owner: 'Dan' }, 'dan@pm.org');

    expect(fromFn).toHaveBeenCalledWith('workstreams');
    expect(chain.insert).toHaveBeenCalledWith([{
      title: 'Research',
      description: '',
      owner: 'Dan',
      owner_email: 'dan@pm.org',
      visibility: 'personal',
      color: 'blue',
    }]);
    expect(result).toEqual(created);
  });

  it('uses provided description, visibility and color', async () => {
    const chain = makeChain({ data: {}, error: null });
    mockSupabase(chain);
    await createWorkstream(
      { title: 'T', description: 'D', owner: 'Dan', visibility: 'shared', color: 'red' },
      'dan@pm.org'
    );
    expect(chain.insert).toHaveBeenCalledWith([
      expect.objectContaining({ description: 'D', visibility: 'shared', color: 'red' }),
    ]);
  });

  it('returns null on insert error', async () => {
    mockSupabase(makeChain({ data: null, error: new Error('denied') }));
    expect(await createWorkstream({ title: 'X' }, 'dan@pm.org')).toBeNull();
  });
});

// -- updateWorkstream ---------------------------------------------------------

describe('updateWorkstream', () => {
  it('returns null when supabase is unavailable', async () => {
    mockNoSupabase();
    expect(await updateWorkstream('id', {})).toBeNull();
  });

  it('updates the row by id, stamping updated_at', async () => {
    const updated = { id: 'ws-1', title: 'New' };
    const chain = makeChain({ data: updated, error: null });
    mockSupabase(chain);

    const result = await updateWorkstream('ws-1', { title: 'New' });

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'New', updated_at: expect.any(String) })
    );
    expect(chain.eq).toHaveBeenCalledWith('id', 'ws-1');
    expect(result).toEqual(updated);
  });

  it('returns null on update error', async () => {
    mockSupabase(makeChain({ data: null, error: new Error('boom') }));
    expect(await updateWorkstream('ws-1', { title: 'X' })).toBeNull();
  });
});

// -- deleteWorkstream ---------------------------------------------------------

describe('deleteWorkstream', () => {
  it('returns null when supabase is unavailable', async () => {
    mockNoSupabase();
    expect(await deleteWorkstream('id')).toBeNull();
  });

  it('deletes by id and returns true', async () => {
    const chain = makeChain({ error: null });
    const fromFn = mockSupabase(chain);
    expect(await deleteWorkstream('ws-1')).toBe(true);
    expect(fromFn).toHaveBeenCalledWith('workstreams');
    expect(chain.eq).toHaveBeenCalledWith('id', 'ws-1');
  });

  it('returns null on delete error', async () => {
    mockSupabase(makeChain({ error: new Error('boom') }));
    expect(await deleteWorkstream('ws-1')).toBeNull();
  });
});

// -- createWorkstreamTask -----------------------------------------------------

describe('createWorkstreamTask', () => {
  it('returns null when supabase is unavailable', async () => {
    mockNoSupabase();
    expect(await createWorkstreamTask({ title: 'X' })).toBeNull();
  });

  it('maps camelCase fields to snake_case columns with defaults', async () => {
    const created = { id: 't-1' };
    const chain = makeChain({ data: created, error: null });
    const fromFn = mockSupabase(chain);

    const result = await createWorkstreamTask({ workstreamId: 'ws-1', title: 'Task' });

    expect(fromFn).toHaveBeenCalledWith('workstream_tasks');
    expect(chain.insert).toHaveBeenCalledWith([{
      workstream_id: 'ws-1',
      title: 'Task',
      description: '',
      priority: 'medium',
      status: 'open',
      deadline: null,
      assignee: '',
      assignee_email: '',
      requester: '',
      task_type: 'Issue',
      tags: [],
      comments: [],
      sort_order: 0,
    }]);
    expect(result).toEqual(created);
  });

  it('returns null on insert error', async () => {
    mockSupabase(makeChain({ data: null, error: new Error('boom') }));
    expect(await createWorkstreamTask({ title: 'X' })).toBeNull();
  });
});

// -- updateWorkstreamTask -----------------------------------------------------

describe('updateWorkstreamTask', () => {
  it('returns null when supabase is unavailable', async () => {
    mockNoSupabase();
    expect(await updateWorkstreamTask('id', {})).toBeNull();
  });

  it('maps known camelCase keys to snake_case and stamps updated_at', async () => {
    const chain = makeChain({ data: { id: 't-1' }, error: null });
    mockSupabase(chain);

    await updateWorkstreamTask('t-1', {
      sortOrder: 3,
      assigneeEmail: 'a@pm.org',
      taskType: 'Bug',
      status: 'closed',
    });

    expect(chain.update).toHaveBeenCalledWith({
      updated_at: expect.any(String),
      sort_order: 3,
      assignee_email: 'a@pm.org',
      task_type: 'Bug',
      status: 'closed',
    });
    expect(chain.eq).toHaveBeenCalledWith('id', 't-1');
  });

  it('returns the updated row', async () => {
    const updated = { id: 't-1', status: 'closed' };
    mockSupabase(makeChain({ data: updated, error: null }));
    expect(await updateWorkstreamTask('t-1', { status: 'closed' })).toEqual(updated);
  });

  it('returns null on update error', async () => {
    mockSupabase(makeChain({ data: null, error: new Error('boom') }));
    expect(await updateWorkstreamTask('t-1', { status: 'closed' })).toBeNull();
  });
});

// -- deleteWorkstreamTask -----------------------------------------------------

describe('deleteWorkstreamTask', () => {
  it('returns null when supabase is unavailable', async () => {
    mockNoSupabase();
    expect(await deleteWorkstreamTask('id')).toBeNull();
  });

  it('deletes by id and returns true', async () => {
    const chain = makeChain({ error: null });
    const fromFn = mockSupabase(chain);
    expect(await deleteWorkstreamTask('t-1')).toBe(true);
    expect(fromFn).toHaveBeenCalledWith('workstream_tasks');
    expect(chain.eq).toHaveBeenCalledWith('id', 't-1');
  });

  it('returns null on delete error', async () => {
    mockSupabase(makeChain({ error: new Error('boom') }));
    expect(await deleteWorkstreamTask('t-1')).toBeNull();
  });
});
