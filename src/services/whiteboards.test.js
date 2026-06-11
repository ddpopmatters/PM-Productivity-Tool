import { describe, it, expect, vi, afterEach } from 'vitest';
import * as supabaseModule from '../api/supabase';
import {
  fetchWhiteboards,
  createWhiteboard,
  updateWhiteboard,
  deleteWhiteboard,
  fetchElements,
  createElement,
  updateElement,
  deleteElement,
  subscribeToWhiteboard,
} from './whiteboards';

afterEach(() => vi.restoreAllMocks());

// -- Shared mock builders ------------------------------------------------------

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

function makeUpdateSpy(result = { data: { id: 'u1' }, error: null }) {
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

function makeDeleteSpy(result = { error: null }) {
  const eqFn = vi.fn(() => result);
  const deleteFn = vi.fn(() => ({ eq: eqFn }));
  const fromFn = vi.fn(() => ({ delete: deleteFn }));
  vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({ from: fromFn });
  return { eqFn, fromFn };
}

// -- Whiteboards ----------------------------------------------------------------

describe('fetchWhiteboards', () => {
  it('returns [] when supabase is unavailable', async () => {
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue(null);
    expect(await fetchWhiteboards('dan@pm.org')).toEqual([]);
  });

  it('returns [] without querying when the email is invalid', async () => {
    const fromFn = vi.fn();
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({ from: fromFn });
    expect(await fetchWhiteboards('not an email')).toEqual([]);
    expect(fromFn).not.toHaveBeenCalled();
  });

  it('queries boards owned by or shared with the sanitised email, newest first', async () => {
    const orderFn = vi.fn(() => ({ data: [{ id: 'w1' }], error: null }));
    const orFn = vi.fn(() => ({ order: orderFn }));
    const selectFn = vi.fn(() => ({ or: orFn }));
    const fromFn = vi.fn(() => ({ select: selectFn }));
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({ from: fromFn });

    const result = await fetchWhiteboards('Dan@PM.org ');

    expect(fromFn).toHaveBeenCalledWith('whiteboards');
    expect(selectFn).toHaveBeenCalledWith('*');
    expect(orFn).toHaveBeenCalledWith('owner_email.eq.dan@pm.org,shared_with.cs.{dan@pm.org}');
    expect(orderFn).toHaveBeenCalledWith('updated_at', { ascending: false });
    expect(result).toEqual([{ id: 'w1' }]);
  });

  it('returns [] on query error', async () => {
    const chain = {
      select: () => chain,
      or: () => chain,
      order: () => ({ data: null, error: new Error('boom') }),
    };
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({ from: () => chain });
    expect(await fetchWhiteboards('dan@pm.org')).toEqual([]);
  });
});

describe('createWhiteboard', () => {
  it('returns null when supabase is unavailable', async () => {
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue(null);
    expect(await createWhiteboard({ title: 'x' })).toBeNull();
  });

  it('inserts title, owner fields and an empty shared_with list', async () => {
    const { captured, fromFn } = makeInsertSpy();
    const result = await createWhiteboard({
      title: 'Planning board',
      owner_email: 'dan@pm.org',
      owner_name: 'Dan',
      extra_field: 'should be ignored',
    });

    expect(fromFn).toHaveBeenCalledWith('whiteboards');
    expect(captured[0][0]).toEqual({
      title: 'Planning board',
      owner_email: 'dan@pm.org',
      owner_name: 'Dan',
      shared_with: [],
    });
    expect(result).toEqual({ id: 'new' });
  });

  it('returns null on insert error', async () => {
    makeInsertSpy({ data: null, error: new Error('denied') });
    expect(await createWhiteboard({ title: 'x' })).toBeNull();
  });
});

describe('updateWhiteboard', () => {
  it('returns null when supabase is unavailable', async () => {
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue(null);
    expect(await updateWhiteboard('w1', { title: 'x' })).toBeNull();
  });

  it('merges updates with a fresh updated_at and filters by id', async () => {
    const { captured, eqFn, fromFn } = makeUpdateSpy();
    const result = await updateWhiteboard('w1', { title: 'Renamed' });

    expect(fromFn).toHaveBeenCalledWith('whiteboards');
    expect(captured[0]).toMatchObject({ title: 'Renamed' });
    expect(captured[0].updated_at).toEqual(expect.any(String));
    expect(eqFn).toHaveBeenCalledWith('id', 'w1');
    expect(result).toEqual({ id: 'u1' });
  });

  it('returns null on update error', async () => {
    makeUpdateSpy({ data: null, error: new Error('denied') });
    expect(await updateWhiteboard('w1', { title: 'x' })).toBeNull();
  });
});

describe('deleteWhiteboard', () => {
  it('returns null when supabase is unavailable', async () => {
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue(null);
    expect(await deleteWhiteboard('w1')).toBeNull();
  });

  it('deletes by id and returns true', async () => {
    const { eqFn, fromFn } = makeDeleteSpy();
    expect(await deleteWhiteboard('w1')).toBe(true);
    expect(fromFn).toHaveBeenCalledWith('whiteboards');
    expect(eqFn).toHaveBeenCalledWith('id', 'w1');
  });

  it('returns null on delete error', async () => {
    makeDeleteSpy({ error: new Error('denied') });
    expect(await deleteWhiteboard('w1')).toBeNull();
  });
});

// -- Elements --------------------------------------------------------------------

describe('fetchElements', () => {
  it('returns [] when supabase is unavailable', async () => {
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue(null);
    expect(await fetchElements('w1')).toEqual([]);
  });

  it('queries elements for the whiteboard ordered by z_index ascending', async () => {
    const orderFn = vi.fn(() => ({ data: [{ id: 'el1' }], error: null }));
    const eqFn = vi.fn(() => ({ order: orderFn }));
    const selectFn = vi.fn(() => ({ eq: eqFn }));
    const fromFn = vi.fn(() => ({ select: selectFn }));
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({ from: fromFn });

    const result = await fetchElements('w1');

    expect(fromFn).toHaveBeenCalledWith('whiteboard_elements');
    expect(eqFn).toHaveBeenCalledWith('whiteboard_id', 'w1');
    expect(orderFn).toHaveBeenCalledWith('z_index', { ascending: true });
    expect(result).toEqual([{ id: 'el1' }]);
  });

  it('returns [] on query error', async () => {
    const chain = {
      select: () => chain,
      eq: () => chain,
      order: () => ({ data: null, error: new Error('boom') }),
    };
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({ from: () => chain });
    expect(await fetchElements('w1')).toEqual([]);
  });
});

describe('createElement', () => {
  it('returns null when supabase is unavailable', async () => {
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue(null);
    expect(await createElement({ type: 'note' })).toBeNull();
  });

  it('inserts the element as-is', async () => {
    const { captured, fromFn } = makeInsertSpy();
    const element = { whiteboard_id: 'w1', type: 'note', content: 'Hello' };
    const result = await createElement(element);

    expect(fromFn).toHaveBeenCalledWith('whiteboard_elements');
    expect(captured[0]).toEqual([element]);
    expect(result).toEqual({ id: 'new' });
  });

  it('returns null on insert error', async () => {
    makeInsertSpy({ data: null, error: new Error('denied') });
    expect(await createElement({ type: 'note' })).toBeNull();
  });
});

describe('updateElement', () => {
  it('returns null when supabase is unavailable', async () => {
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue(null);
    expect(await updateElement('el1', { content: 'x' })).toBeNull();
  });

  it('merges updates with a fresh updated_at and filters by id', async () => {
    const { captured, eqFn, fromFn } = makeUpdateSpy();
    const result = await updateElement('el1', { content: 'Updated' });

    expect(fromFn).toHaveBeenCalledWith('whiteboard_elements');
    expect(captured[0]).toMatchObject({ content: 'Updated' });
    expect(captured[0].updated_at).toEqual(expect.any(String));
    expect(eqFn).toHaveBeenCalledWith('id', 'el1');
    expect(result).toEqual({ id: 'u1' });
  });

  it('returns null on update error', async () => {
    makeUpdateSpy({ data: null, error: new Error('denied') });
    expect(await updateElement('el1', { content: 'x' })).toBeNull();
  });
});

describe('deleteElement', () => {
  it('returns null when supabase is unavailable', async () => {
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue(null);
    expect(await deleteElement('el1')).toBeNull();
  });

  it('deletes by id and returns true', async () => {
    const { eqFn, fromFn } = makeDeleteSpy();
    expect(await deleteElement('el1')).toBe(true);
    expect(fromFn).toHaveBeenCalledWith('whiteboard_elements');
    expect(eqFn).toHaveBeenCalledWith('id', 'el1');
  });

  it('returns null on delete error', async () => {
    makeDeleteSpy({ error: new Error('denied') });
    expect(await deleteElement('el1')).toBeNull();
  });
});

// -- Realtime subscription --------------------------------------------------------

describe('subscribeToWhiteboard', () => {
  it('returns null when supabase is unavailable', () => {
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue(null);
    expect(subscribeToWhiteboard('w1', vi.fn())).toBeNull();
  });

  it('subscribes to element changes filtered to the whiteboard and returns the channel', () => {
    const channel = {};
    const subscribeFn = vi.fn(() => channel);
    const onFn = vi.fn(() => ({ subscribe: subscribeFn }));
    const channelFn = vi.fn(() => ({ on: onFn }));
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({ channel: channelFn });

    const callback = vi.fn();
    const result = subscribeToWhiteboard('w1', callback);

    expect(channelFn).toHaveBeenCalledWith('whiteboard:w1');
    expect(onFn).toHaveBeenCalledWith(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'whiteboard_elements',
        filter: 'whiteboard_id=eq.w1',
      },
      callback,
    );
    expect(result).toBe(channel);
  });
});
