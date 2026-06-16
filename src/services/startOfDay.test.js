import { describe, it, expect, vi, afterEach } from 'vitest';
import * as supabaseModule from '../api/supabase';
import {
  fetchLatestStartOfDayPacket,
  getStartOfDayStoredFileUrl,
  groupStartOfDayItems,
  normalizeStartOfDayPacket,
  openStartOfDayStoredFile,
  updateStartOfDayPacketStatus,
} from './startOfDay';

afterEach(() => vi.restoreAllMocks());

function makeChain(result) {
  const chain = {};
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'gte', 'lte', 'order', 'limit'];
  for (const method of methods) chain[method] = vi.fn(() => chain);
  chain.single = vi.fn(async () => result);
  chain.then = (resolve) => resolve(result);
  return chain;
}

function mockSupabase(chain) {
  const from = vi.fn(() => chain);
  vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({ from });
  return from;
}

describe('normalizeStartOfDayPacket', () => {
  it('normalises packet and item fields into camel case', () => {
    const packet = normalizeStartOfDayPacket({
      id: 'p-1',
      user_email: 'dan@pm.org',
      packet_date: '2026-06-15',
      primary_task: 'Open the appeal review',
      if_you_finish_early: 'Ask Hermes to clear follow-ups',
      re_entry_prompt: 'Return to the appeal review',
      ack_status: 'unseen',
      start_of_day_items: [
        {
          id: 'i-2',
          item_type: 'agent_can_do',
          title: 'Draft summary',
          sort_order: 2,
          storage_bucket: 'start-of-day-files',
          storage_path: 'current/dan_pm.org/brief.md',
          storage_mime_type: 'text/markdown',
          storage_file_size: 1200,
          storage_uploaded_at: '2026-06-16T08:00:00Z',
        },
        { id: 'i-1', item_type: 'forgotten_work', title: 'Appeal review', sort_order: 1 },
      ],
    });

    expect(packet.userEmail).toBe('dan@pm.org');
    expect(packet.primaryTask).toBe('Open the appeal review');
    expect(packet.items.map((item) => item.id)).toEqual(['i-1', 'i-2']);
    expect(packet.items[1]).toMatchObject({
      storageBucket: 'start-of-day-files',
      storagePath: 'current/dan_pm.org/brief.md',
      storageMimeType: 'text/markdown',
      storageFileSize: 1200,
      storageUploadedAt: '2026-06-16T08:00:00Z',
    });
  });
});

describe('groupStartOfDayItems', () => {
  it('groups known item types and falls unknown types back to forgotten work', () => {
    const groups = groupStartOfDayItems([
      { id: 'a', itemType: 'created_file' },
      { id: 'b', itemType: 'agent_can_do' },
      { id: 'c', itemType: 'unknown' },
    ]);

    expect(groups.created_file).toEqual([{ id: 'a', itemType: 'created_file' }]);
    expect(groups.agent_can_do).toEqual([{ id: 'b', itemType: 'agent_can_do' }]);
    expect(groups.forgotten_work).toEqual([{ id: 'c', itemType: 'unknown' }]);
  });
});

describe('fetchLatestStartOfDayPacket', () => {
  it('returns null when Supabase is unavailable', async () => {
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue(null);
    expect(await fetchLatestStartOfDayPacket('dan@pm.org')).toBeNull();
  });

  it('fetches the newest packet for the signed-in user', async () => {
    const chain = makeChain({
      data: [{ id: 'p-1', user_email: 'dan@pm.org', packet_date: '2026-06-15' }],
      error: null,
    });
    const from = mockSupabase(chain);

    const result = await fetchLatestStartOfDayPacket('dan@pm.org');

    expect(from).toHaveBeenCalledWith('start_of_day_packets');
    expect(chain.select).toHaveBeenCalledWith('*, start_of_day_items(*)');
    expect(chain.eq).toHaveBeenCalledWith('user_email', 'dan@pm.org');
    expect(chain.order).toHaveBeenCalledWith('packet_date', { ascending: false });
    expect(chain.limit).toHaveBeenCalledWith(1);
    expect(result.id).toBe('p-1');
  });

  it('returns null on query error', async () => {
    mockSupabase(makeChain({ data: null, error: new Error('missing table') }));
    expect(await fetchLatestStartOfDayPacket('dan@pm.org')).toBeNull();
  });
});

describe('updateStartOfDayPacketStatus', () => {
  it('returns null for unsupported acknowledgement status', async () => {
    const chain = makeChain({ data: null, error: null });
    mockSupabase(chain);

    expect(await updateStartOfDayPacketStatus('p-1', 'later')).toBeNull();
    expect(chain.update).not.toHaveBeenCalled();
  });

  it('updates the acknowledgement status and returns the normalised packet', async () => {
    const chain = makeChain({
      data: { id: 'p-1', ack_status: 'started', start_of_day_items: [] },
      error: null,
    });
    mockSupabase(chain);

    const result = await updateStartOfDayPacketStatus('p-1', 'started');

    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ ack_status: 'started' }));
    expect(chain.eq).toHaveBeenCalledWith('id', 'p-1');
    expect(result.ackStatus).toBe('started');
  });
});

describe('getStartOfDayStoredFileUrl', () => {
  it('creates a signed URL for a stored Start of Day file', async () => {
    const createSignedUrl = vi.fn().mockResolvedValue({
      data: { signedUrl: 'https://example.supabase.co/signed/brief.md' },
      error: null,
    });
    const fromStorage = vi.fn(() => ({ createSignedUrl }));
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({
      storage: { from: fromStorage },
    });

    const result = await getStartOfDayStoredFileUrl({
      title: 'Trustee brief',
      storageBucket: 'start-of-day-files',
      storagePath: 'current/dan_pm.org/brief.md',
    });

    expect(fromStorage).toHaveBeenCalledWith('start-of-day-files');
    expect(createSignedUrl).toHaveBeenCalledWith(
      'current/dan_pm.org/brief.md',
      3600,
      { download: 'Trustee brief' }
    );
    expect(result).toBe('https://example.supabase.co/signed/brief.md');
  });

  it('opens a stored file URL through the supplied opener', async () => {
    const createSignedUrl = vi.fn().mockResolvedValue({
      data: { signedUrl: 'https://example.supabase.co/signed/brief.md' },
      error: null,
    });
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({
      storage: { from: () => ({ createSignedUrl }) },
    });
    const opener = vi.fn();

    const result = await openStartOfDayStoredFile({
      item: { storagePath: 'current/dan_pm.org/brief.md' },
      opener,
    });

    expect(opener).toHaveBeenCalledWith(
      'https://example.supabase.co/signed/brief.md',
      '_blank',
      'noopener,noreferrer'
    );
    expect(result.url).toBe('https://example.supabase.co/signed/brief.md');
  });

  it('navigates a pre-opened tab when supplied', async () => {
    const createSignedUrl = vi.fn().mockResolvedValue({
      data: { signedUrl: 'https://example.supabase.co/signed/brief.md' },
      error: null,
    });
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({
      storage: { from: () => ({ createSignedUrl }) },
    });
    const targetWindow = {
      closed: false,
      opener: {},
      location: { assign: vi.fn() },
    };
    const opener = vi.fn();

    const result = await openStartOfDayStoredFile({
      item: { storagePath: 'current/dan_pm.org/brief.md' },
      opener,
      targetWindow,
    });

    expect(targetWindow.opener).toBeNull();
    expect(targetWindow.location.assign).toHaveBeenCalledWith('https://example.supabase.co/signed/brief.md');
    expect(opener).not.toHaveBeenCalled();
    expect(result.url).toBe('https://example.supabase.co/signed/brief.md');
  });
});
