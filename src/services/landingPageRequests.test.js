import { describe, it, expect, vi, afterEach } from 'vitest';
import * as supabaseModule from '../api/supabase';
import {
  fetchDashboardRequests,
  fetchRequesterRequests,
  fetchRequestById,
  fetchRevisionFeedback,
  fetchAmendments,
  createRequest,
  updateRequestStatus,
  updateBuilderNotes,
  addRevisionFeedback,
  flagFeedback,
  raiseAmendment,
  resolveAmendment,
  fetchRequestFiles,
  uploadRequestFile,
  getRequestFileUrl,
  deleteRequestFile,
  updatePageUrl,
  appendStatusHistory,
  fetchComments,
  addComment,
} from './landingPageRequests';

afterEach(() => vi.restoreAllMocks());

/**
 * Builds a self-returning, awaitable supabase query chain.
 * Every chain method returns the chain; awaiting the chain (or calling
 * .single()/.maybeSingle()) resolves to `result`.
 */
function makeChain(result) {
  const chain = {};
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'in', 'order'];
  for (const m of methods) chain[m] = vi.fn(() => chain);
  chain.single = vi.fn(async () => result);
  chain.maybeSingle = vi.fn(async () => result);
  chain.then = (resolve) => resolve(result);
  return chain;
}

// Mocks getSupabase so each table name maps to its own chain (or a sequence
// of chains when the same table is queried more than once).
function mockSupabase(tables, storage) {
  const fromFn = vi.fn((table) => {
    const entry = tables[table];
    if (Array.isArray(entry)) return entry.shift();
    return entry;
  });
  vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({ from: fromFn, storage });
  return fromFn;
}

function mockNoSupabase() {
  vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue(null);
}

// -- fetchDashboardRequests ---------------------------------------------------

describe('fetchDashboardRequests', () => {
  it('returns [] when supabase is unavailable', async () => {
    mockNoSupabase();
    expect(await fetchDashboardRequests()).toEqual([]);
  });

  it('returns [] immediately when there are no requests', async () => {
    const requestsChain = makeChain({ data: [], error: null });
    const fromFn = mockSupabase({ landing_page_requests: requestsChain });
    expect(await fetchDashboardRequests()).toEqual([]);
    expect(fromFn).toHaveBeenCalledTimes(1);
  });

  it('excludes archived requests and decorates with pending amendment counts', async () => {
    const requestsChain = makeChain({
      data: [{ id: 'r-1' }, { id: 'r-2' }],
      error: null,
    });
    const amendmentsChain = makeChain({
      data: [{ request_id: 'r-1' }, { request_id: 'r-1' }],
      error: null,
    });
    const fromFn = mockSupabase({
      landing_page_requests: requestsChain,
      amendments: amendmentsChain,
    });

    const result = await fetchDashboardRequests();

    expect(fromFn).toHaveBeenCalledWith('landing_page_requests');
    expect(requestsChain.neq).toHaveBeenCalledWith('status', 'archived');
    expect(requestsChain.order).toHaveBeenCalledWith('go_live_date', { ascending: true });
    expect(requestsChain.order).toHaveBeenCalledWith('created_at', { ascending: true });
    expect(amendmentsChain.in).toHaveBeenCalledWith('request_id', ['r-1', 'r-2']);
    expect(amendmentsChain.eq).toHaveBeenCalledWith('status', 'pending');
    expect(result).toEqual([
      { id: 'r-1', amendment_count: 2, pending_amendment_count: 2 },
      { id: 'r-2', amendment_count: 0, pending_amendment_count: 0 },
    ]);
  });

  it('returns [] when the requests query errors', async () => {
    mockSupabase({ landing_page_requests: makeChain({ data: null, error: new Error('boom') }) });
    expect(await fetchDashboardRequests()).toEqual([]);
  });

  it('returns [] when the amendments query errors', async () => {
    mockSupabase({
      landing_page_requests: makeChain({ data: [{ id: 'r-1' }], error: null }),
      amendments: makeChain({ data: null, error: new Error('boom') }),
    });
    expect(await fetchDashboardRequests()).toEqual([]);
  });
});

// -- simple fetchers ----------------------------------------------------------

describe('fetchRequesterRequests', () => {
  it('returns [] when supabase is unavailable or userId is missing', async () => {
    mockNoSupabase();
    expect(await fetchRequesterRequests('u-1')).toEqual([]);
    vi.restoreAllMocks();
    mockSupabase({ landing_page_requests: makeChain({ data: [], error: null }) });
    expect(await fetchRequesterRequests(null)).toEqual([]);
  });

  it('queries requests by requester newest-first', async () => {
    const rows = [{ id: 'r-1' }];
    const chain = makeChain({ data: rows, error: null });
    mockSupabase({ landing_page_requests: chain });

    const result = await fetchRequesterRequests('u-1');

    expect(chain.eq).toHaveBeenCalledWith('requester_id', 'u-1');
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(result).toEqual(rows);
  });

  it('returns [] on query error', async () => {
    mockSupabase({ landing_page_requests: makeChain({ data: null, error: new Error('x') }) });
    expect(await fetchRequesterRequests('u-1')).toEqual([]);
  });
});

describe('fetchRequestById', () => {
  it('returns null when supabase is unavailable or id is missing', async () => {
    mockNoSupabase();
    expect(await fetchRequestById('r-1')).toBeNull();
    vi.restoreAllMocks();
    mockSupabase({ landing_page_requests: makeChain({ data: {}, error: null }) });
    expect(await fetchRequestById(null)).toBeNull();
  });

  it('fetches a single request by id via maybeSingle', async () => {
    const row = { id: 'r-1' };
    const chain = makeChain({ data: row, error: null });
    mockSupabase({ landing_page_requests: chain });
    expect(await fetchRequestById('r-1')).toEqual(row);
    expect(chain.eq).toHaveBeenCalledWith('id', 'r-1');
    expect(chain.maybeSingle).toHaveBeenCalled();
  });

  it('returns null on error and null when no row found', async () => {
    mockSupabase({ landing_page_requests: makeChain({ data: null, error: new Error('x') }) });
    expect(await fetchRequestById('r-1')).toBeNull();
    vi.restoreAllMocks();
    mockSupabase({ landing_page_requests: makeChain({ data: null, error: null }) });
    expect(await fetchRequestById('r-1')).toBeNull();
  });
});

describe('fetchRevisionFeedback', () => {
  it('returns [] without requestId or supabase', async () => {
    mockNoSupabase();
    expect(await fetchRevisionFeedback('r-1')).toEqual([]);
    vi.restoreAllMocks();
    mockSupabase({ revision_feedback: makeChain({ data: [], error: null }) });
    expect(await fetchRevisionFeedback(null)).toEqual([]);
  });

  it('queries feedback for the request oldest-first', async () => {
    const rows = [{ id: 'f-1' }];
    const chain = makeChain({ data: rows, error: null });
    mockSupabase({ revision_feedback: chain });
    expect(await fetchRevisionFeedback('r-1')).toEqual(rows);
    expect(chain.eq).toHaveBeenCalledWith('request_id', 'r-1');
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: true });
  });
});

describe('fetchAmendments', () => {
  it('queries amendments for the request newest-first', async () => {
    const rows = [{ id: 'a-1' }];
    const chain = makeChain({ data: rows, error: null });
    mockSupabase({ amendments: chain });
    expect(await fetchAmendments('r-1')).toEqual(rows);
    expect(chain.eq).toHaveBeenCalledWith('request_id', 'r-1');
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('returns [] on error', async () => {
    mockSupabase({ amendments: makeChain({ data: null, error: new Error('x') }) });
    expect(await fetchAmendments('r-1')).toEqual([]);
  });
});

// -- createRequest ------------------------------------------------------------

describe('createRequest', () => {
  it('returns null when supabase is unavailable', async () => {
    mockNoSupabase();
    expect(await createRequest({}, 'u-1', 'dan@pm.org')).toBeNull();
  });

  it('maps form fields to columns, nulling empty strings and applying defaults', async () => {
    const inserted = { id: 'r-9' };
    const chain = makeChain({ data: inserted, error: null });
    mockSupabase({ landing_page_requests: chain });

    const result = await createRequest({
      title: 'Appeal page',
      pageType: 'appeal',
      pageGoal: 'donations',
      audience: 'supporters',
      copyStatus: 'ready',
      copyOwner: '',
      copyDueDate: undefined,
      assetStatus: 'pending',
      assetOwner: 'Fran',
      assetDueDate: '2026-07-01',
      goLiveDate: '2026-07-10',
      expeditedJustification: null,
      namedApprover: 'Dan',
    }, 'u-1', 'dan@pm.org');

    expect(chain.insert).toHaveBeenCalledWith([{
      requester_id: 'u-1',
      requester_email: 'dan@pm.org',
      title: 'Appeal page',
      page_type: 'appeal',
      page_goal: 'donations',
      audience: 'supporters',
      copy_status: 'ready',
      copy_owner: null,
      copy_due_date: null,
      asset_status: 'pending',
      asset_owner: 'Fran',
      asset_due_date: '2026-07-01',
      go_live_date: '2026-07-10',
      expedited_justification: null,
      named_approver: 'Dan',
      revision_rounds_agreed: 2,
      extended_rounds_reason: null,
      document_links: [],
      key_messages: null,
      price_points: [],
      suggested_headline: null,
    }]);
    expect(result).toEqual(inserted);
  });

  it('honours explicit revision rounds and optional content fields', async () => {
    const chain = makeChain({ data: {}, error: null });
    mockSupabase({ landing_page_requests: chain });
    await createRequest({
      title: 'T',
      revisionRoundsAgreed: 4,
      documentLinks: ['http://a'],
      keyMessages: 'msg',
      pricePoints: [25],
      suggestedHeadline: 'H',
    }, 'u-1', 'dan@pm.org');
    expect(chain.insert).toHaveBeenCalledWith([expect.objectContaining({
      revision_rounds_agreed: 4,
      document_links: ['http://a'],
      key_messages: 'msg',
      price_points: [25],
      suggested_headline: 'H',
    })]);
  });

  it('returns null on insert error', async () => {
    mockSupabase({ landing_page_requests: makeChain({ data: null, error: new Error('x') }) });
    expect(await createRequest({ title: 'T' }, 'u-1', 'dan@pm.org')).toBeNull();
  });
});

// -- status / notes updates ---------------------------------------------------

describe('updateRequestStatus', () => {
  it('returns null without supabase or id', async () => {
    mockNoSupabase();
    expect(await updateRequestStatus('r-1', 'approved')).toBeNull();
    vi.restoreAllMocks();
    mockSupabase({ landing_page_requests: makeChain({ data: {}, error: null }) });
    expect(await updateRequestStatus(null, 'approved')).toBeNull();
  });

  it('updates status, merges extra fields and stamps updated_at', async () => {
    const updated = { id: 'r-1', status: 'approved' };
    const chain = makeChain({ data: updated, error: null });
    mockSupabase({ landing_page_requests: chain });

    const result = await updateRequestStatus('r-1', 'approved', { approved_by: 'Dan' });

    expect(chain.update).toHaveBeenCalledWith({
      approved_by: 'Dan',
      status: 'approved',
      updated_at: expect.any(String),
    });
    expect(chain.eq).toHaveBeenCalledWith('id', 'r-1');
    expect(result).toEqual(updated);
  });

  it('returns null on update error', async () => {
    mockSupabase({ landing_page_requests: makeChain({ data: null, error: new Error('x') }) });
    expect(await updateRequestStatus('r-1', 'approved')).toBeNull();
  });
});

describe('updateBuilderNotes', () => {
  it('updates builder_notes with a fresh updated_at', async () => {
    const chain = makeChain({ data: { id: 'r-1' }, error: null });
    mockSupabase({ landing_page_requests: chain });
    await updateBuilderNotes('r-1', 'notes');
    expect(chain.update).toHaveBeenCalledWith({
      builder_notes: 'notes',
      updated_at: expect.any(String),
    });
    expect(chain.eq).toHaveBeenCalledWith('id', 'r-1');
  });

  it('returns null on error', async () => {
    mockSupabase({ landing_page_requests: makeChain({ data: null, error: new Error('x') }) });
    expect(await updateBuilderNotes('r-1', 'n')).toBeNull();
  });
});

// -- feedback and amendments ----------------------------------------------------

describe('addRevisionFeedback', () => {
  it('inserts a feedback row with all fields mapped', async () => {
    const created = { id: 'f-1' };
    const chain = makeChain({ data: created, error: null });
    mockSupabase({ revision_feedback: chain });

    const result = await addRevisionFeedback('r-1', 'copy', 'Fix headline', 2, 'Dan');

    expect(chain.insert).toHaveBeenCalledWith([{
      request_id: 'r-1',
      feedback_type: 'copy',
      description: 'Fix headline',
      round_number: 2,
      created_by: 'Dan',
    }]);
    expect(result).toEqual(created);
  });

  it('returns null on error', async () => {
    mockSupabase({ revision_feedback: makeChain({ data: null, error: new Error('x') }) });
    expect(await addRevisionFeedback('r-1', 'copy', 'd', 1, 'Dan')).toBeNull();
  });
});

describe('flagFeedback', () => {
  it('flags the feedback item with a reason', async () => {
    const chain = makeChain({ data: { id: 'f-1' }, error: null });
    mockSupabase({ revision_feedback: chain });
    await flagFeedback('f-1', 'out of scope');
    expect(chain.update).toHaveBeenCalledWith({ is_flagged: true, flag_reason: 'out of scope' });
    expect(chain.eq).toHaveBeenCalledWith('id', 'f-1');
  });

  it('returns null without feedbackItemId', async () => {
    mockSupabase({ revision_feedback: makeChain({ data: {}, error: null }) });
    expect(await flagFeedback(null, 'r')).toBeNull();
  });
});

describe('raiseAmendment', () => {
  it('inserts an amendment row', async () => {
    const created = { id: 'a-1' };
    const chain = makeChain({ data: created, error: null });
    mockSupabase({ amendments: chain });
    const result = await raiseAmendment('r-1', 'because', 'Dan');
    expect(chain.insert).toHaveBeenCalledWith([{
      request_id: 'r-1',
      justification: 'because',
      requested_by: 'Dan',
    }]);
    expect(result).toEqual(created);
  });

  it('returns null on error', async () => {
    mockSupabase({ amendments: makeChain({ data: null, error: new Error('x') }) });
    expect(await raiseAmendment('r-1', 'j', 'Dan')).toBeNull();
  });
});

describe('resolveAmendment', () => {
  it('sets the decision status and resolved_at timestamp', async () => {
    const chain = makeChain({ data: { id: 'a-1' }, error: null });
    mockSupabase({ amendments: chain });
    await resolveAmendment('a-1', 'approved');
    expect(chain.update).toHaveBeenCalledWith({
      status: 'approved',
      resolved_at: expect.any(String),
    });
    expect(chain.eq).toHaveBeenCalledWith('id', 'a-1');
  });

  it('returns null without amendmentId', async () => {
    mockSupabase({ amendments: makeChain({ data: {}, error: null }) });
    expect(await resolveAmendment(null, 'approved')).toBeNull();
  });
});

// -- files ----------------------------------------------------------------------

describe('fetchRequestFiles', () => {
  it('queries files for the request oldest-first', async () => {
    const rows = [{ id: 'file-1' }];
    const chain = makeChain({ data: rows, error: null });
    mockSupabase({ request_files: chain });
    expect(await fetchRequestFiles('r-1')).toEqual(rows);
    expect(chain.eq).toHaveBeenCalledWith('request_id', 'r-1');
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: true });
  });

  it('returns [] without requestId or on error', async () => {
    mockSupabase({ request_files: makeChain({ data: [], error: null }) });
    expect(await fetchRequestFiles(null)).toEqual([]);
    vi.restoreAllMocks();
    mockSupabase({ request_files: makeChain({ data: null, error: new Error('x') }) });
    expect(await fetchRequestFiles('r-1')).toEqual([]);
  });
});

function makeStorage({ uploadError = null, publicUrl = 'https://cdn/x' } = {}) {
  const bucket = {
    upload: vi.fn(async () => ({ error: uploadError })),
    getPublicUrl: vi.fn(() => ({ data: { publicUrl } })),
    remove: vi.fn(async () => ({})),
  };
  return { from: vi.fn(() => bucket), bucket };
}

describe('uploadRequestFile', () => {
  const file = { name: 'My File (v2).pdf', size: 123, type: 'application/pdf' };

  it('returns null without supabase, file, or requestId', async () => {
    mockNoSupabase();
    expect(await uploadRequestFile(file, 'r-1', 'u-1')).toBeNull();
    vi.restoreAllMocks();
    mockSupabase({}, makeStorage());
    expect(await uploadRequestFile(null, 'r-1', 'u-1')).toBeNull();
    expect(await uploadRequestFile(file, null, 'u-1')).toBeNull();
  });

  it('uploads to storage with a sanitised path and records the file row', async () => {
    const storage = makeStorage();
    const inserted = { id: 'file-1' };
    const chain = makeChain({ data: inserted, error: null });
    mockSupabase({ request_files: chain }, storage);

    const result = await uploadRequestFile(file, 'r-1', 'u-1');

    expect(storage.from).toHaveBeenCalledWith('pages-hub-files');
    const [path, uploadedFile, options] = storage.bucket.upload.mock.calls[0];
    expect(path).toMatch(/^r-1\/\d+_My_File__v2_\.pdf$/);
    expect(uploadedFile).toBe(file);
    expect(options).toEqual({ upsert: false });
    expect(chain.insert).toHaveBeenCalledWith([expect.objectContaining({
      request_id: 'r-1',
      file_name: 'My File (v2).pdf',
      file_size: 123,
      mime_type: 'application/pdf',
      uploaded_by: 'u-1',
    })]);
    expect(result).toEqual(inserted);
  });

  it('returns null when the storage upload fails', async () => {
    const storage = makeStorage({ uploadError: new Error('full') });
    const chain = makeChain({ data: {}, error: null });
    mockSupabase({ request_files: chain }, storage);
    expect(await uploadRequestFile(file, 'r-1', 'u-1')).toBeNull();
    expect(chain.insert).not.toHaveBeenCalled();
  });

  it('returns null when the DB record insert fails', async () => {
    const storage = makeStorage();
    mockSupabase({ request_files: makeChain({ data: null, error: new Error('x') }) }, storage);
    expect(await uploadRequestFile(file, 'r-1', 'u-1')).toBeNull();
  });
});

describe('getRequestFileUrl', () => {
  it('returns the public URL for a path', async () => {
    const storage = makeStorage({ publicUrl: 'https://cdn/file.pdf' });
    mockSupabase({}, storage);
    expect(await getRequestFileUrl('r-1/file.pdf')).toBe('https://cdn/file.pdf');
    expect(storage.bucket.getPublicUrl).toHaveBeenCalledWith('r-1/file.pdf');
  });

  it('returns null without filePath or supabase', async () => {
    mockSupabase({}, makeStorage());
    expect(await getRequestFileUrl('')).toBeNull();
    vi.restoreAllMocks();
    mockNoSupabase();
    expect(await getRequestFileUrl('x')).toBeNull();
  });
});

describe('deleteRequestFile', () => {
  it('removes the storage object and deletes the DB row', async () => {
    const storage = makeStorage();
    const chain = makeChain({ error: null });
    mockSupabase({ request_files: chain }, storage);

    expect(await deleteRequestFile('file-1', 'r-1/file.pdf')).toBe(true);
    expect(storage.bucket.remove).toHaveBeenCalledWith(['r-1/file.pdf']);
    expect(chain.eq).toHaveBeenCalledWith('id', 'file-1');
  });

  it('skips storage removal when no filePath given', async () => {
    const storage = makeStorage();
    mockSupabase({ request_files: makeChain({ error: null }) }, storage);
    expect(await deleteRequestFile('file-1', null)).toBe(true);
    expect(storage.bucket.remove).not.toHaveBeenCalled();
  });

  it('returns false without fileId and on delete error', async () => {
    mockSupabase({ request_files: makeChain({ error: null }) }, makeStorage());
    expect(await deleteRequestFile(null, 'p')).toBe(false);
    vi.restoreAllMocks();
    mockSupabase({ request_files: makeChain({ error: new Error('x') }) }, makeStorage());
    expect(await deleteRequestFile('file-1', null)).toBe(false);
  });
});

// -- page url / history / comments ----------------------------------------------

describe('updatePageUrl', () => {
  it('updates page_url with a fresh updated_at', async () => {
    const chain = makeChain({ data: { id: 'r-1' }, error: null });
    mockSupabase({ landing_page_requests: chain });
    await updatePageUrl('r-1', 'https://populationmatters.org/x');
    expect(chain.update).toHaveBeenCalledWith({
      page_url: 'https://populationmatters.org/x',
      updated_at: expect.any(String),
    });
    expect(chain.eq).toHaveBeenCalledWith('id', 'r-1');
  });

  it('returns null on error', async () => {
    mockSupabase({ landing_page_requests: makeChain({ data: null, error: new Error('x') }) });
    expect(await updatePageUrl('r-1', 'u')).toBeNull();
  });
});

describe('appendStatusHistory', () => {
  it('appends an entry to the existing history', async () => {
    const existing = [{ status: 'draft', changed_at: 't0', changed_by: 'Fran' }];
    const selectChain = makeChain({ data: { status_history: existing }, error: null });
    const updateChain = makeChain({ data: { id: 'r-1' }, error: null });
    mockSupabase({ landing_page_requests: [selectChain, updateChain] });

    await appendStatusHistory('r-1', 'approved', 'Dan');

    const updateArg = updateChain.update.mock.calls[0][0];
    expect(updateArg.status_history).toHaveLength(2);
    expect(updateArg.status_history[0]).toEqual(existing[0]);
    expect(updateArg.status_history[1]).toMatchObject({ status: 'approved', changed_by: 'Dan' });
    expect(updateArg.status_history[1].changed_at).toEqual(expect.any(String));
    expect(updateChain.eq).toHaveBeenCalledWith('id', 'r-1');
  });

  it('starts a new history when none exists', async () => {
    const selectChain = makeChain({ data: { status_history: null }, error: null });
    const updateChain = makeChain({ data: { id: 'r-1' }, error: null });
    mockSupabase({ landing_page_requests: [selectChain, updateChain] });

    await appendStatusHistory('r-1', 'submitted', 'Dan');

    const updateArg = updateChain.update.mock.calls[0][0];
    expect(updateArg.status_history).toHaveLength(1);
    expect(updateArg.status_history[0]).toMatchObject({ status: 'submitted', changed_by: 'Dan' });
  });

  it('returns null on update error', async () => {
    const selectChain = makeChain({ data: { status_history: [] }, error: null });
    const updateChain = makeChain({ data: null, error: new Error('x') });
    mockSupabase({ landing_page_requests: [selectChain, updateChain] });
    expect(await appendStatusHistory('r-1', 's', 'Dan')).toBeNull();
  });
});

describe('fetchComments', () => {
  it('queries comments for the request oldest-first', async () => {
    const rows = [{ id: 'c-1' }];
    const chain = makeChain({ data: rows, error: null });
    mockSupabase({ request_comments: chain });
    expect(await fetchComments('r-1')).toEqual(rows);
    expect(chain.eq).toHaveBeenCalledWith('request_id', 'r-1');
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: true });
  });

  it('returns [] without requestId or on error', async () => {
    mockSupabase({ request_comments: makeChain({ data: [], error: null }) });
    expect(await fetchComments(null)).toEqual([]);
    vi.restoreAllMocks();
    mockSupabase({ request_comments: makeChain({ data: null, error: new Error('x') }) });
    expect(await fetchComments('r-1')).toEqual([]);
  });
});

describe('addComment', () => {
  it('inserts a comment with author details and defaulted mentions', async () => {
    const created = { id: 'c-1' };
    const chain = makeChain({ data: created, error: null });
    mockSupabase({ request_comments: chain });

    const result = await addComment('r-1', 'Looks good', 'u-1', 'dan@pm.org', 'Dan', null);

    expect(chain.insert).toHaveBeenCalledWith([{
      request_id: 'r-1',
      body: 'Looks good',
      author_id: 'u-1',
      author_email: 'dan@pm.org',
      author_name: 'Dan',
      mentions: [],
    }]);
    expect(result).toEqual(created);
  });

  it('passes through explicit mentions', async () => {
    const chain = makeChain({ data: {}, error: null });
    mockSupabase({ request_comments: chain });
    await addComment('r-1', 'Hi', 'u-1', 'e', 'n', ['fran@pm.org']);
    expect(chain.insert).toHaveBeenCalledWith([
      expect.objectContaining({ mentions: ['fran@pm.org'] }),
    ]);
  });

  it('returns null on insert error', async () => {
    mockSupabase({ request_comments: makeChain({ data: null, error: new Error('x') }) });
    expect(await addComment('r-1', 'b', 'u', 'e', 'n', [])).toBeNull();
  });
});
