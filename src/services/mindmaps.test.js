import { describe, it, expect, vi, afterEach } from 'vitest';
import * as supabaseModule from '../api/supabase';
import { fetchMindmaps, createMindmap, updateMindmap, deleteMindmap } from './mindmaps';

afterEach(() => vi.restoreAllMocks());

describe('fetchMindmaps', () => {
  it('returns [] when supabase is unavailable', async () => {
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue(null);
    expect(await fetchMindmaps('dan@pm.org')).toEqual([]);
  });

  it('queries the owner mindmaps most-recently-updated first', async () => {
    const orderFn = vi.fn(() => ({ data: [{ id: 'm1' }], error: null }));
    const eqFn = vi.fn(() => ({ order: orderFn }));
    const selectFn = vi.fn(() => ({ eq: eqFn }));
    const fromFn = vi.fn(() => ({ select: selectFn }));
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({ from: fromFn });

    const result = await fetchMindmaps('dan@pm.org');

    expect(fromFn).toHaveBeenCalledWith('mindmaps');
    expect(selectFn).toHaveBeenCalledWith('*');
    expect(eqFn).toHaveBeenCalledWith('owner_email', 'dan@pm.org');
    expect(orderFn).toHaveBeenCalledWith('updated_at', { ascending: false });
    expect(result).toEqual([{ id: 'm1' }]);
  });

  it('returns [] when data is null without error', async () => {
    const chain = {
      select: () => chain,
      eq: () => chain,
      order: () => ({ data: null, error: null }),
    };
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({ from: () => chain });
    expect(await fetchMindmaps('dan@pm.org')).toEqual([]);
  });

  it('returns [] on query error', async () => {
    const chain = {
      select: () => chain,
      eq: () => chain,
      order: () => ({ data: null, error: new Error('boom') }),
    };
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({ from: () => chain });
    expect(await fetchMindmaps('dan@pm.org')).toEqual([]);
  });
});

describe('createMindmap', () => {
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
    expect(await createMindmap('Title', 'dan@pm.org')).toBeNull();
  });

  it('inserts the mindmap with empty nodes and the owner email', async () => {
    const { captured, fromFn } = makeInsertSpy();
    const result = await createMindmap('Strategy map', 'dan@pm.org');

    expect(fromFn).toHaveBeenCalledWith('mindmaps');
    expect(captured[0][0]).toEqual({
      title: 'Strategy map',
      nodes: [],
      owner_email: 'dan@pm.org',
    });
    expect(result).toEqual({ id: 'new' });
  });

  it('returns null on insert error', async () => {
    makeInsertSpy({ data: null, error: new Error('denied') });
    expect(await createMindmap('Title', 'dan@pm.org')).toBeNull();
  });
});

describe('updateMindmap', () => {
  function makeUpdateSpy(result = { data: { id: 'm1' }, error: null }) {
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
    expect(await updateMindmap('m1', { title: 'x' })).toBeNull();
  });

  it('merges updates with a fresh updated_at timestamp and filters by id', async () => {
    const { captured, eqFn, fromFn } = makeUpdateSpy();
    const result = await updateMindmap('m1', { title: 'Renamed', nodes: [{ id: 'n1' }] });

    expect(fromFn).toHaveBeenCalledWith('mindmaps');
    expect(captured[0]).toMatchObject({ title: 'Renamed', nodes: [{ id: 'n1' }] });
    expect(captured[0].updated_at).toEqual(expect.any(String));
    expect(eqFn).toHaveBeenCalledWith('id', 'm1');
    expect(result).toEqual({ id: 'm1' });
  });

  it('returns null on update error', async () => {
    makeUpdateSpy({ data: null, error: new Error('denied') });
    expect(await updateMindmap('m1', { title: 'x' })).toBeNull();
  });
});

describe('deleteMindmap', () => {
  it('returns null when supabase is unavailable', async () => {
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue(null);
    expect(await deleteMindmap('m1')).toBeNull();
  });

  it('deletes by id and returns true', async () => {
    const eqFn = vi.fn(() => ({ error: null }));
    const deleteFn = vi.fn(() => ({ eq: eqFn }));
    const fromFn = vi.fn(() => ({ delete: deleteFn }));
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({ from: fromFn });

    expect(await deleteMindmap('m1')).toBe(true);
    expect(fromFn).toHaveBeenCalledWith('mindmaps');
    expect(eqFn).toHaveBeenCalledWith('id', 'm1');
  });

  it('returns null on delete error', async () => {
    const eqFn = vi.fn(() => ({ error: new Error('denied') }));
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({
      from: () => ({ delete: () => ({ eq: eqFn }) }),
    });
    expect(await deleteMindmap('m1')).toBeNull();
  });
});
