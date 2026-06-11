import { describe, it, expect, vi, afterEach } from 'vitest';
import * as supabaseModule from '../api/supabase';
import {
  fetchHabits,
  fetchCompletions,
  createHabit,
  deleteHabit,
  toggleCompletion,
  fetchMatrixTasks,
  createMatrixTask,
  updateMatrixTask,
  deleteMatrixTask,
} from './productivity';

afterEach(() => vi.restoreAllMocks());

/**
 * Builds a self-returning, awaitable supabase query chain.
 * Every chain method returns the chain; awaiting the chain (or calling
 * .single()) resolves to `result`.
 */
function makeChain(result) {
  const chain = {};
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'gte', 'lte', 'order'];
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

// -- fetchHabits --------------------------------------------------------------

describe('fetchHabits', () => {
  it('returns [] when supabase is unavailable', async () => {
    mockNoSupabase();
    expect(await fetchHabits('dan@pm.org')).toEqual([]);
  });

  it('queries habits for the user newest-first', async () => {
    const rows = [{ id: 'h-1' }];
    const chain = makeChain({ data: rows, error: null });
    const fromFn = mockSupabase(chain);

    const result = await fetchHabits('dan@pm.org');

    expect(fromFn).toHaveBeenCalledWith('habits');
    expect(chain.eq).toHaveBeenCalledWith('user_email', 'dan@pm.org');
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(result).toEqual(rows);
  });

  it('returns [] on query error', async () => {
    mockSupabase(makeChain({ data: null, error: new Error('boom') }));
    expect(await fetchHabits('dan@pm.org')).toEqual([]);
  });
});

// -- fetchCompletions ---------------------------------------------------------

describe('fetchCompletions', () => {
  it('returns [] when supabase is unavailable', async () => {
    mockNoSupabase();
    expect(await fetchCompletions('h-1', '2026-06-01', '2026-06-07')).toEqual([]);
  });

  it('queries completions for the habit within the date range', async () => {
    const rows = [{ id: 'c-1' }];
    const chain = makeChain({ data: rows, error: null });
    const fromFn = mockSupabase(chain);

    const result = await fetchCompletions('h-1', '2026-06-01', '2026-06-07');

    expect(fromFn).toHaveBeenCalledWith('habit_completions');
    expect(chain.eq).toHaveBeenCalledWith('habit_id', 'h-1');
    expect(chain.gte).toHaveBeenCalledWith('date', '2026-06-01');
    expect(chain.lte).toHaveBeenCalledWith('date', '2026-06-07');
    expect(result).toEqual(rows);
  });

  it('returns [] on query error', async () => {
    mockSupabase(makeChain({ data: null, error: new Error('boom') }));
    expect(await fetchCompletions('h-1', 'a', 'b')).toEqual([]);
  });
});

// -- createHabit / deleteHabit ------------------------------------------------

describe('createHabit', () => {
  it('returns null when supabase is unavailable', async () => {
    mockNoSupabase();
    expect(await createHabit({ name: 'Run' })).toBeNull();
  });

  it('inserts the habit as-is and returns the created row', async () => {
    const created = { id: 'h-1', name: 'Run' };
    const chain = makeChain({ data: created, error: null });
    const fromFn = mockSupabase(chain);

    const result = await createHabit({ name: 'Run' });

    expect(fromFn).toHaveBeenCalledWith('habits');
    expect(chain.insert).toHaveBeenCalledWith([{ name: 'Run' }]);
    expect(result).toEqual(created);
  });

  it('returns null on insert error', async () => {
    mockSupabase(makeChain({ data: null, error: new Error('boom') }));
    expect(await createHabit({ name: 'Run' })).toBeNull();
  });
});

describe('deleteHabit', () => {
  it('returns null when supabase is unavailable', async () => {
    mockNoSupabase();
    expect(await deleteHabit('h-1')).toBeNull();
  });

  it('deletes by id and returns true', async () => {
    const chain = makeChain({ error: null });
    mockSupabase(chain);
    expect(await deleteHabit('h-1')).toBe(true);
    expect(chain.eq).toHaveBeenCalledWith('id', 'h-1');
  });

  it('returns null on delete error', async () => {
    mockSupabase(makeChain({ error: new Error('boom') }));
    expect(await deleteHabit('h-1')).toBeNull();
  });
});

// -- toggleCompletion ---------------------------------------------------------

describe('toggleCompletion', () => {
  it('returns null when supabase is unavailable', async () => {
    mockNoSupabase();
    expect(await toggleCompletion('h-1', '2026-06-11')).toBeNull();
  });

  it('deletes the existing completion and reports { deleted: true }', async () => {
    const selectChain = makeChain({ data: { id: 'c-1' }, error: null });
    const deleteChain = makeChain({ error: null });
    const fromFn = vi.fn()
      .mockReturnValueOnce(selectChain)
      .mockReturnValueOnce(deleteChain);
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({ from: fromFn });

    const result = await toggleCompletion('h-1', '2026-06-11');

    expect(selectChain.eq).toHaveBeenCalledWith('habit_id', 'h-1');
    expect(selectChain.eq).toHaveBeenCalledWith('date', '2026-06-11');
    expect(deleteChain.delete).toHaveBeenCalled();
    expect(deleteChain.eq).toHaveBeenCalledWith('id', 'c-1');
    expect(result).toEqual({ deleted: true });
  });

  it('inserts a completion when none exists', async () => {
    const created = { id: 'c-2', habit_id: 'h-1', date: '2026-06-11' };
    const selectChain = makeChain({ data: null, error: null });
    const insertChain = makeChain({ data: created, error: null });
    const fromFn = vi.fn()
      .mockReturnValueOnce(selectChain)
      .mockReturnValueOnce(insertChain);
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({ from: fromFn });

    const result = await toggleCompletion('h-1', '2026-06-11');

    expect(insertChain.insert).toHaveBeenCalledWith([{ habit_id: 'h-1', date: '2026-06-11' }]);
    expect(result).toEqual(created);
  });

  it('returns null when the delete fails', async () => {
    const selectChain = makeChain({ data: { id: 'c-1' }, error: null });
    const deleteChain = makeChain({ error: new Error('boom') });
    const fromFn = vi.fn()
      .mockReturnValueOnce(selectChain)
      .mockReturnValueOnce(deleteChain);
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({ from: fromFn });

    expect(await toggleCompletion('h-1', '2026-06-11')).toBeNull();
  });

  it('returns null when the insert fails', async () => {
    const selectChain = makeChain({ data: null, error: null });
    const insertChain = makeChain({ data: null, error: new Error('boom') });
    const fromFn = vi.fn()
      .mockReturnValueOnce(selectChain)
      .mockReturnValueOnce(insertChain);
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({ from: fromFn });

    expect(await toggleCompletion('h-1', '2026-06-11')).toBeNull();
  });
});

// -- matrix tasks ---------------------------------------------------------------

describe('fetchMatrixTasks', () => {
  it('returns [] when supabase is unavailable', async () => {
    mockNoSupabase();
    expect(await fetchMatrixTasks('dan@pm.org')).toEqual([]);
  });

  it('queries matrix tasks for the user newest-first', async () => {
    const rows = [{ id: 'm-1' }];
    const chain = makeChain({ data: rows, error: null });
    const fromFn = mockSupabase(chain);

    const result = await fetchMatrixTasks('dan@pm.org');

    expect(fromFn).toHaveBeenCalledWith('matrix_tasks');
    expect(chain.eq).toHaveBeenCalledWith('user_email', 'dan@pm.org');
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(result).toEqual(rows);
  });

  it('returns [] on query error', async () => {
    mockSupabase(makeChain({ data: null, error: new Error('boom') }));
    expect(await fetchMatrixTasks('dan@pm.org')).toEqual([]);
  });
});

describe('createMatrixTask', () => {
  it('returns null when supabase is unavailable', async () => {
    mockNoSupabase();
    expect(await createMatrixTask({ title: 'X' })).toBeNull();
  });

  it('inserts the task and returns the created row', async () => {
    const created = { id: 'm-1' };
    const chain = makeChain({ data: created, error: null });
    mockSupabase(chain);
    expect(await createMatrixTask({ title: 'X' })).toEqual(created);
    expect(chain.insert).toHaveBeenCalledWith([{ title: 'X' }]);
  });

  it('returns null on insert error', async () => {
    mockSupabase(makeChain({ data: null, error: new Error('boom') }));
    expect(await createMatrixTask({ title: 'X' })).toBeNull();
  });
});

describe('updateMatrixTask', () => {
  it('returns null when supabase is unavailable', async () => {
    mockNoSupabase();
    expect(await updateMatrixTask('m-1', {})).toBeNull();
  });

  it('updates by id and returns the updated row', async () => {
    const updated = { id: 'm-1', quadrant: 'urgent' };
    const chain = makeChain({ data: updated, error: null });
    mockSupabase(chain);

    const result = await updateMatrixTask('m-1', { quadrant: 'urgent' });

    expect(chain.update).toHaveBeenCalledWith({ quadrant: 'urgent' });
    expect(chain.eq).toHaveBeenCalledWith('id', 'm-1');
    expect(result).toEqual(updated);
  });

  it('returns null on update error', async () => {
    mockSupabase(makeChain({ data: null, error: new Error('boom') }));
    expect(await updateMatrixTask('m-1', {})).toBeNull();
  });
});

describe('deleteMatrixTask', () => {
  it('returns null when supabase is unavailable', async () => {
    mockNoSupabase();
    expect(await deleteMatrixTask('m-1')).toBeNull();
  });

  it('deletes by id and returns true', async () => {
    const chain = makeChain({ error: null });
    mockSupabase(chain);
    expect(await deleteMatrixTask('m-1')).toBe(true);
    expect(chain.eq).toHaveBeenCalledWith('id', 'm-1');
  });

  it('returns null on delete error', async () => {
    mockSupabase(makeChain({ error: new Error('boom') }));
    expect(await deleteMatrixTask('m-1')).toBeNull();
  });
});
