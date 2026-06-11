import { describe, it, expect, vi, afterEach } from 'vitest';
import * as supabaseModule from '../api/supabase';
import {
  fetchPersonalTodos,
  savePersonalTodo,
  updatePersonalTodo,
  deletePersonalTodo,
} from './todos';

afterEach(() => vi.restoreAllMocks());

describe('fetchPersonalTodos', () => {
  it('returns [] when supabase is unavailable', async () => {
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue(null);
    expect(await fetchPersonalTodos('dan@pm.org')).toEqual([]);
  });

  it('queries the user todos newest-first', async () => {
    const orderFn = vi.fn(() => ({ data: [{ id: 't1' }], error: null }));
    const eqFn = vi.fn(() => ({ order: orderFn }));
    const selectFn = vi.fn(() => ({ eq: eqFn }));
    const fromFn = vi.fn(() => ({ select: selectFn }));
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({ from: fromFn });

    const result = await fetchPersonalTodos('dan@pm.org');

    expect(fromFn).toHaveBeenCalledWith('personal_todos');
    expect(selectFn).toHaveBeenCalledWith('*');
    expect(eqFn).toHaveBeenCalledWith('user_email', 'dan@pm.org');
    expect(orderFn).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(result).toEqual([{ id: 't1' }]);
  });

  it('returns [] when data is null without error', async () => {
    const chain = {
      select: () => chain,
      eq: () => chain,
      order: () => ({ data: null, error: null }),
    };
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({ from: () => chain });
    expect(await fetchPersonalTodos('dan@pm.org')).toEqual([]);
  });

  it('returns [] on query error', async () => {
    const chain = {
      select: () => chain,
      eq: () => chain,
      order: () => ({ data: null, error: new Error('boom') }),
    };
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({ from: () => chain });
    expect(await fetchPersonalTodos('dan@pm.org')).toEqual([]);
  });
});

describe('savePersonalTodo', () => {
  function makeInsertSpy(result = { data: { id: 'new' }, error: null }) {
    const captured = [];
    const singleFn = vi.fn(() => result);
    const selectFn = vi.fn(() => ({ single: singleFn }));
    const insertFn = vi.fn((rows) => {
      captured.push(rows);
      return { select: selectFn };
    });
    const fromFn = vi.fn(() => ({ insert: insertFn }));
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({ from: fromFn });
    return { captured, fromFn };
  }

  it('returns null when supabase is unavailable', async () => {
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue(null);
    expect(await savePersonalTodo({ text: 'x' }, 'dan@pm.org')).toBeNull();
  });

  it('inserts the todo with the user email', async () => {
    const { captured, fromFn } = makeInsertSpy();
    const result = await savePersonalTodo(
      { text: 'Write tests', completed: true, date: '2026-06-12' },
      'dan@pm.org',
    );

    expect(fromFn).toHaveBeenCalledWith('personal_todos');
    expect(captured[0][0]).toEqual({
      text: 'Write tests',
      completed: true,
      date: '2026-06-12',
      user_email: 'dan@pm.org',
    });
    expect(result).toEqual({ id: 'new' });
  });

  it('defaults completed to false and date to null', async () => {
    const { captured } = makeInsertSpy();
    await savePersonalTodo({ text: 'Minimal' }, 'dan@pm.org');
    expect(captured[0][0]).toEqual({
      text: 'Minimal',
      completed: false,
      date: null,
      user_email: 'dan@pm.org',
    });
  });

  it('returns null on insert error', async () => {
    makeInsertSpy({ data: null, error: new Error('denied') });
    expect(await savePersonalTodo({ text: 'x' }, 'dan@pm.org')).toBeNull();
  });
});

describe('updatePersonalTodo', () => {
  function makeUpdateSpy(result = { data: { id: 't1' }, error: null }) {
    const captured = [];
    const singleFn = vi.fn(() => result);
    const selectFn = vi.fn(() => ({ single: singleFn }));
    const eqFn = vi.fn(() => ({ select: selectFn }));
    const updateFn = vi.fn((obj) => {
      captured.push(obj);
      return { eq: eqFn };
    });
    const fromFn = vi.fn(() => ({ update: updateFn }));
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({ from: fromFn });
    return { captured, eqFn, fromFn };
  }

  it('returns null when supabase is unavailable', async () => {
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue(null);
    expect(await updatePersonalTodo('t1', { completed: true })).toBeNull();
  });

  it('passes updates through unchanged and filters by id', async () => {
    const { captured, eqFn, fromFn } = makeUpdateSpy();
    const result = await updatePersonalTodo('t1', { completed: true, text: 'Edited' });

    expect(fromFn).toHaveBeenCalledWith('personal_todos');
    expect(captured[0]).toEqual({ completed: true, text: 'Edited' });
    expect(eqFn).toHaveBeenCalledWith('id', 't1');
    expect(result).toEqual({ id: 't1' });
  });

  it('returns null on update error', async () => {
    makeUpdateSpy({ data: null, error: new Error('denied') });
    expect(await updatePersonalTodo('t1', { completed: true })).toBeNull();
  });
});

describe('deletePersonalTodo', () => {
  it('returns null when supabase is unavailable', async () => {
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue(null);
    expect(await deletePersonalTodo('t1')).toBeNull();
  });

  it('deletes by id and returns true', async () => {
    const eqFn = vi.fn(() => ({ error: null }));
    const deleteFn = vi.fn(() => ({ eq: eqFn }));
    const fromFn = vi.fn(() => ({ delete: deleteFn }));
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({ from: fromFn });

    expect(await deletePersonalTodo('t1')).toBe(true);
    expect(fromFn).toHaveBeenCalledWith('personal_todos');
    expect(eqFn).toHaveBeenCalledWith('id', 't1');
  });

  it('returns null on delete error', async () => {
    const eqFn = vi.fn(() => ({ error: new Error('denied') }));
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({
      from: () => ({ delete: () => ({ eq: eqFn }) }),
    });
    expect(await deletePersonalTodo('t1')).toBeNull();
  });
});
