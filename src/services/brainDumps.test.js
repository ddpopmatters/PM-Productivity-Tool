import { describe, it, expect, vi, afterEach } from 'vitest';
import * as supabaseModule from '../api/supabase';
import { fetchPendingBrainDumps, markBrainDumpRouted } from './brainDumps';

afterEach(() => vi.restoreAllMocks());

describe('fetchPendingBrainDumps', () => {
  it('returns [] when supabase is unavailable', async () => {
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue(null);
    expect(await fetchPendingBrainDumps()).toEqual([]);
  });

  it('queries pending dumps oldest-first with the given limit', async () => {
    const limitFn = vi.fn(() => ({ data: [{ id: '1' }], error: null }));
    const orderFn = vi.fn(() => ({ limit: limitFn }));
    const eqFn = vi.fn(() => ({ order: orderFn }));
    const selectFn = vi.fn(() => ({ eq: eqFn }));
    const fromFn = vi.fn(() => ({ select: selectFn }));
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({ from: fromFn });

    const result = await fetchPendingBrainDumps(10);

    expect(fromFn).toHaveBeenCalledWith('brain_dumps');
    expect(eqFn).toHaveBeenCalledWith('status', 'pending');
    expect(orderFn).toHaveBeenCalledWith('created_at', { ascending: true });
    expect(limitFn).toHaveBeenCalledWith(10);
    expect(result).toEqual([{ id: '1' }]);
  });

  it('returns [] on query error', async () => {
    const chain = {
      select: () => chain,
      eq: () => chain,
      order: () => chain,
      limit: () => ({ data: null, error: new Error('boom') }),
    };
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({ from: () => chain });
    expect(await fetchPendingBrainDumps()).toEqual([]);
  });
});

describe('markBrainDumpRouted', () => {
  function makeUpdateSpy(result = { error: null }) {
    const captured = [];
    const eqFn = vi.fn(() => result);
    const updateFn = vi.fn((obj) => {
      captured.push(obj);
      return { eq: eqFn };
    });
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({
      from: () => ({ update: updateFn }),
    });
    return { captured, eqFn };
  }

  it('marks the dump as routed with destination and target id', async () => {
    const { captured, eqFn } = makeUpdateSpy();
    await markBrainDumpRouted('dump-1', 'task', 'item-9');
    expect(captured[0]).toMatchObject({
      status: 'routed',
      routed_to_type: 'task',
      routed_to_id: 'item-9',
    });
    expect(captured[0].routed_at).toEqual(expect.any(String));
    expect(eqFn).toHaveBeenCalledWith('id', 'dump-1');
  });

  it('sets status archived for the archive destination', async () => {
    const { captured } = makeUpdateSpy();
    await markBrainDumpRouted('dump-2', 'archive', null);
    expect(captured[0]).toMatchObject({ status: 'archived', routed_to_id: null });
  });

  it('throws when supabase is unavailable', async () => {
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue(null);
    await expect(markBrainDumpRouted('x', 'task', null)).rejects.toThrow('Supabase unavailable');
  });

  it('throws on update error', async () => {
    makeUpdateSpy({ error: new Error('denied') });
    await expect(markBrainDumpRouted('x', 'task', null)).rejects.toThrow('denied');
  });
});
