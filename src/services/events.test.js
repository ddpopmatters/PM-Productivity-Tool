import { describe, it, expect, vi, afterEach } from 'vitest';
import * as supabaseModule from '../api/supabase';
import { fetchEvents, createEvent, updateEvent, deleteEvent } from './events';

afterEach(() => vi.restoreAllMocks());

describe('fetchEvents', () => {
  it('returns [] when supabase is unavailable', async () => {
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue(null);
    expect(await fetchEvents()).toEqual([]);
  });

  it('queries events ordered by event_date ascending', async () => {
    const orderFn = vi.fn(() => ({ data: [{ id: 'e1' }], error: null }));
    const selectFn = vi.fn(() => ({ order: orderFn }));
    const fromFn = vi.fn(() => ({ select: selectFn }));
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({ from: fromFn });

    const result = await fetchEvents();

    expect(fromFn).toHaveBeenCalledWith('events');
    expect(selectFn).toHaveBeenCalledWith('*');
    expect(orderFn).toHaveBeenCalledWith('event_date', { ascending: true });
    expect(result).toEqual([{ id: 'e1' }]);
  });

  it('returns [] when data is null without error', async () => {
    const chain = {
      select: () => chain,
      order: () => ({ data: null, error: null }),
    };
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({ from: () => chain });
    expect(await fetchEvents()).toEqual([]);
  });

  it('returns [] on query error', async () => {
    const chain = {
      select: () => chain,
      order: () => ({ data: null, error: { code: '500', message: 'boom' } }),
    };
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({ from: () => chain });
    expect(await fetchEvents()).toEqual([]);
  });

  it('returns [] silently when the events table is missing (42P01)', async () => {
    const chain = {
      select: () => chain,
      order: () => ({ data: null, error: { code: '42P01', message: 'missing' } }),
    };
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({ from: () => chain });
    expect(await fetchEvents()).toEqual([]);
  });
});

describe('createEvent', () => {
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
    expect(await createEvent({ title: 'x' })).toBeNull();
  });

  it('maps camelCase event fields to snake_case columns', async () => {
    const { captured, fromFn } = makeInsertSpy();
    const result = await createEvent({
      title: 'Team meeting',
      description: 'Quarterly review',
      eventDate: '2026-07-01',
      endDate: '2026-07-02',
      createdBy: 'Dan',
      createdByEmail: 'dan@pm.org',
      color: 'aqua',
      category: 'meeting',
      location: 'London',
      linkedEntryId: 'entry-1',
      linkedWorkstreamId: 'ws-1',
    });

    expect(fromFn).toHaveBeenCalledWith('events');
    expect(captured[0][0]).toEqual({
      title: 'Team meeting',
      description: 'Quarterly review',
      event_date: '2026-07-01',
      end_date: '2026-07-02',
      created_by: 'Dan',
      created_by_email: 'dan@pm.org',
      color: 'aqua',
      category: 'meeting',
      location: 'London',
      linked_entry_id: 'entry-1',
      linked_workstream_id: 'ws-1',
    });
    expect(result).toEqual({ id: 'new' });
  });

  it('applies defaults for optional fields', async () => {
    const { captured } = makeInsertSpy();
    await createEvent({
      title: 'Minimal',
      eventDate: '2026-07-01',
      createdBy: 'Dan',
      createdByEmail: 'dan@pm.org',
    });
    expect(captured[0][0]).toMatchObject({
      description: null,
      end_date: null,
      color: 'ocean',
      category: null,
      location: null,
      linked_entry_id: null,
      linked_workstream_id: null,
    });
  });

  it('returns null on insert error', async () => {
    makeInsertSpy({ data: null, error: new Error('denied') });
    expect(await createEvent({ title: 'x' })).toBeNull();
  });
});

describe('updateEvent', () => {
  function makeUpdateSpy(result = { data: { id: 'e1' }, error: null }) {
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
    expect(await updateEvent('e1', { title: 'x' })).toBeNull();
  });

  it('maps camelCase keys to snake_case and stamps updated_at', async () => {
    const { captured, eqFn, fromFn } = makeUpdateSpy();
    const result = await updateEvent('e1', {
      eventDate: '2026-08-01',
      endDate: '2026-08-02',
      createdBy: 'Dan',
      createdByEmail: 'dan@pm.org',
      linkedEntryId: 'entry-2',
      linkedWorkstreamId: 'ws-2',
      title: 'Renamed',
    });

    expect(fromFn).toHaveBeenCalledWith('events');
    expect(captured[0]).toMatchObject({
      event_date: '2026-08-01',
      end_date: '2026-08-02',
      created_by: 'Dan',
      created_by_email: 'dan@pm.org',
      linked_entry_id: 'entry-2',
      linked_workstream_id: 'ws-2',
      title: 'Renamed',
    });
    expect(captured[0].updated_at).toEqual(expect.any(String));
    expect(eqFn).toHaveBeenCalledWith('id', 'e1');
    expect(result).toEqual({ id: 'e1' });
  });

  it('passes unmapped keys through unchanged', async () => {
    const { captured } = makeUpdateSpy();
    await updateEvent('e1', { color: 'aqua' });
    expect(captured[0]).toMatchObject({ color: 'aqua' });
  });

  it('returns null on update error', async () => {
    makeUpdateSpy({ data: null, error: new Error('denied') });
    expect(await updateEvent('e1', { title: 'x' })).toBeNull();
  });
});

describe('deleteEvent', () => {
  it('returns null when supabase is unavailable', async () => {
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue(null);
    expect(await deleteEvent('e1')).toBeNull();
  });

  it('deletes by id and returns true', async () => {
    const eqFn = vi.fn(() => ({ error: null }));
    const deleteFn = vi.fn(() => ({ eq: eqFn }));
    const fromFn = vi.fn(() => ({ delete: deleteFn }));
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({ from: fromFn });

    expect(await deleteEvent('e1')).toBe(true);
    expect(fromFn).toHaveBeenCalledWith('events');
    expect(eqFn).toHaveBeenCalledWith('id', 'e1');
  });

  it('returns null on delete error', async () => {
    const eqFn = vi.fn(() => ({ error: new Error('denied') }));
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({
      from: () => ({ delete: () => ({ eq: eqFn }) }),
    });
    expect(await deleteEvent('e1')).toBeNull();
  });
});
