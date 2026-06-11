import { describe, it, expect, vi, afterEach } from 'vitest';
import * as supabaseModule from '../api/supabase';
import {
  fetchWebsiteProject,
  createWebsiteProject,
  updateWebsiteProject,
  launchProject,
  archiveProject,
  fetchWebsitePhases,
  fetchMyTasks,
  createTask,
  deleteTask,
  createPage,
  deletePage,
  markPageReviewed,
  fetchChangeRequests,
  createChangeRequest,
  createTemplate,
  fetchPageDependencies,
  addPageDependency,
  fetchDecisions,
  fetchLaunchReadiness,
  updateSitemapNode,
  importPagesAsSitemapNodes,
} from './websiteProject';

afterEach(() => vi.restoreAllMocks());

// -- Test helpers --------------------------------------------------------------

const CHAIN_METHODS = [
  'select',
  'insert',
  'update',
  'delete',
  'eq',
  'neq',
  'order',
  'limit',
  'maybeSingle',
  'single',
  'in',
  'not',
];

// Builds a chainable, awaitable supabase query mock. Every method returns the
// chain itself; awaiting the chain (at any point) resolves the given result.
function makeChain(result) {
  const chain = {};
  for (const method of CHAIN_METHODS) {
    chain[method] = vi.fn(() => chain);
  }
  chain.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject);
  return chain;
}

// Mocks getSupabase with per-table results. A table value may be a single
// result (reused for every call) or an array of results consumed in order.
// Returns the list of { table, chain } in call order for assertions.
function mockSupabase(resultsByTable) {
  const calls = [];
  const fromFn = vi.fn((table) => {
    const entry = resultsByTable[table];
    const result = Array.isArray(entry) ? entry.shift() : entry;
    const chain = makeChain(result ?? { data: null, error: null });
    calls.push({ table, chain });
    return chain;
  });
  vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({ from: fromFn });
  return { calls, fromFn };
}

function mockNoSupabase() {
  vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue(null);
}

// -- fetchWebsiteProject -------------------------------------------------------

describe('fetchWebsiteProject', () => {
  it('returns null when supabase is unavailable', async () => {
    mockNoSupabase();
    expect(await fetchWebsiteProject()).toBeNull();
  });

  it('queries the latest non-archived project', async () => {
    const project = { id: 'p1', name: 'Site' };
    const { calls, fromFn } = mockSupabase({
      website_project: { data: project, error: null },
    });

    const result = await fetchWebsiteProject();

    expect(fromFn).toHaveBeenCalledWith('website_project');
    const chain = calls[0].chain;
    expect(chain.neq).toHaveBeenCalledWith('status', 'archived');
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(chain.limit).toHaveBeenCalledWith(1);
    expect(result).toEqual(project);
  });

  it('returns null on query error', async () => {
    mockSupabase({ website_project: { data: null, error: new Error('boom') } });
    expect(await fetchWebsiteProject()).toBeNull();
  });
});

// -- createWebsiteProject ------------------------------------------------------

describe('createWebsiteProject', () => {
  it('inserts the project with defaults and seeds the five phases', async () => {
    const created = { id: 'proj-1', name: 'New Site' };
    const { calls } = mockSupabase({
      website_project: { data: created, error: null },
      website_phases: { error: null },
    });

    const result = await createWebsiteProject({
      name: 'New Site',
      lead_email: 'dan@pm.org',
    });

    expect(result).toEqual(created);
    expect(calls[0].chain.insert).toHaveBeenCalledWith([
      {
        name: 'New Site',
        description: '',
        lead_email: 'dan@pm.org',
        created_by: null,
        status: 'planning',
      },
    ]);

    const phaseCalls = calls.filter((call) => call.table === 'website_phases');
    expect(phaseCalls).toHaveLength(5);
    expect(phaseCalls[0].chain.insert).toHaveBeenCalledWith([
      { project_id: 'proj-1', name: 'Discovery', phase_order: 1 },
    ]);
    expect(phaseCalls[4].chain.insert).toHaveBeenCalledWith([
      { project_id: 'proj-1', name: 'Launch', phase_order: 5 },
    ]);
  });

  it('returns null when any phase insert fails', async () => {
    mockSupabase({
      website_project: { data: { id: 'proj-1' }, error: null },
      website_phases: [
        { error: null },
        { error: new Error('phase fail') },
        { error: null },
        { error: null },
        { error: null },
      ],
    });

    expect(await createWebsiteProject({ name: 'X', lead_email: 'a@b.c' })).toBeNull();
  });

  it('returns null and skips phase seeding on project insert error', async () => {
    const { calls } = mockSupabase({
      website_project: { data: null, error: new Error('insert fail') },
    });

    expect(await createWebsiteProject({ name: 'X', lead_email: 'a@b.c' })).toBeNull();
    expect(calls.filter((call) => call.table === 'website_phases')).toHaveLength(0);
  });
});

// -- updateWebsiteProject ------------------------------------------------------

describe('updateWebsiteProject', () => {
  it('applies updates with a refreshed updated_at timestamp', async () => {
    const { calls } = mockSupabase({
      website_project: { data: { id: 'p1', status: 'build' }, error: null },
    });

    const result = await updateWebsiteProject('p1', { status: 'build' });

    const payload = calls[0].chain.update.mock.calls[0][0];
    expect(payload).toMatchObject({ status: 'build' });
    expect(payload.updated_at).toEqual(expect.any(String));
    expect(calls[0].chain.eq).toHaveBeenCalledWith('id', 'p1');
    expect(result).toEqual({ id: 'p1', status: 'build' });
  });

  it('returns null when supabase is unavailable', async () => {
    mockNoSupabase();
    expect(await updateWebsiteProject('p1', {})).toBeNull();
  });
});

// -- launchProject ---------------------------------------------------------------

describe('launchProject', () => {
  it('refuses to launch when the Launch phase is not complete', async () => {
    mockSupabase({
      website_phases: { data: { id: 'ph5', status: 'in_progress' }, error: null },
    });

    expect(await launchProject('p1')).toEqual({
      error: 'Launch phase must be complete before launching',
    });
  });

  it('refuses to launch when no Launch phase exists', async () => {
    mockSupabase({ website_phases: { data: null, error: null } });
    expect(await launchProject('p1')).toEqual({
      error: 'Launch phase must be complete before launching',
    });
  });

  it('launches the project and sets draft pages live when phase is complete', async () => {
    const launched = { id: 'p1', status: 'launched' };
    const { calls } = mockSupabase({
      website_phases: { data: { id: 'ph5', status: 'complete' }, error: null },
      website_project: { data: launched, error: null },
      website_pages: { error: null },
    });

    const result = await launchProject('p1');

    expect(result).toEqual(launched);
    const projectCall = calls.find((call) => call.table === 'website_project');
    expect(projectCall.chain.update.mock.calls[0][0]).toMatchObject({ status: 'launched' });

    const pagesCall = calls.find((call) => call.table === 'website_pages');
    const pagesPayload = pagesCall.chain.update.mock.calls[0][0];
    expect(pagesPayload.status).toBe('live');
    expect(pagesPayload.next_review_due).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(pagesCall.chain.eq).toHaveBeenCalledWith('status', 'draft');
  });

  it('returns null on phase fetch error', async () => {
    mockSupabase({ website_phases: { data: null, error: new Error('fail') } });
    expect(await launchProject('p1')).toBeNull();
  });
});

// -- archiveProject --------------------------------------------------------------

describe('archiveProject', () => {
  it('sets the project status to archived', async () => {
    const { calls } = mockSupabase({
      website_project: { data: { id: 'p1', status: 'archived' }, error: null },
    });

    const result = await archiveProject('p1');

    expect(calls[0].chain.update.mock.calls[0][0]).toMatchObject({ status: 'archived' });
    expect(result).toEqual({ id: 'p1', status: 'archived' });
  });
});

// -- fetchWebsitePhases ----------------------------------------------------------

describe('fetchWebsitePhases', () => {
  it('returns [] when projectId is missing', async () => {
    mockSupabase({});
    expect(await fetchWebsitePhases(null)).toEqual([]);
  });

  it('returns phases ordered by phase_order', async () => {
    const phases = [{ id: 'ph1' }, { id: 'ph2' }];
    const { calls } = mockSupabase({
      website_phases: { data: phases, error: null },
    });

    const result = await fetchWebsitePhases('p1');

    expect(calls[0].chain.order).toHaveBeenCalledWith('phase_order', { ascending: true });
    expect(result).toEqual(phases);
  });

  it('returns [] on query error', async () => {
    mockSupabase({ website_phases: { data: null, error: new Error('fail') } });
    expect(await fetchWebsitePhases('p1')).toEqual([]);
  });
});

// -- fetchMyTasks ----------------------------------------------------------------

describe('fetchMyTasks', () => {
  it('returns [] when projectId or userEmail is missing', async () => {
    mockSupabase({});
    expect(await fetchMyTasks(null, 'a@b.c')).toEqual([]);
    expect(await fetchMyTasks('p1', null)).toEqual([]);
  });

  it('filters to the assignee and excludes done tasks', async () => {
    const { calls } = mockSupabase({
      website_tasks: { data: [{ id: 't1' }], error: null },
    });

    const result = await fetchMyTasks('p1', 'dan@pm.org');

    const chain = calls[0].chain;
    expect(chain.eq).toHaveBeenCalledWith('project_id', 'p1');
    expect(chain.eq).toHaveBeenCalledWith('assignee_email', 'dan@pm.org');
    expect(chain.neq).toHaveBeenCalledWith('status', 'done');
    expect(result).toEqual([{ id: 't1' }]);
  });
});

// -- createTask ------------------------------------------------------------------

describe('createTask', () => {
  it('inserts the task with sensible defaults for optional fields', async () => {
    const { calls } = mockSupabase({
      website_tasks: { data: { id: 't1' }, error: null },
    });

    await createTask({ project_id: 'p1', phase_id: 'ph1', title: 'Do thing' });

    expect(calls[0].chain.insert).toHaveBeenCalledWith([
      {
        project_id: 'p1',
        phase_id: 'ph1',
        page_id: null,
        title: 'Do thing',
        description: '',
        assignee_email: null,
        due_date: null,
        status: 'todo',
        created_by_email: null,
      },
    ]);
  });

  it('returns null on insert error', async () => {
    mockSupabase({ website_tasks: { data: null, error: new Error('fail') } });
    expect(await createTask({ project_id: 'p1', phase_id: 'ph1', title: 'X' })).toBeNull();
  });
});

// -- deleteTask ------------------------------------------------------------------

describe('deleteTask', () => {
  it('returns true on successful delete', async () => {
    const { calls } = mockSupabase({ website_tasks: { error: null } });
    expect(await deleteTask('t1')).toBe(true);
    expect(calls[0].chain.delete).toHaveBeenCalled();
    expect(calls[0].chain.eq).toHaveBeenCalledWith('id', 't1');
  });

  it('returns null on delete error', async () => {
    mockSupabase({ website_tasks: { error: new Error('fail') } });
    expect(await deleteTask('t1')).toBeNull();
  });
});

// -- createPage ------------------------------------------------------------------

describe('createPage', () => {
  it('applies numeric coercion and status defaults', async () => {
    const { calls } = mockSupabase({
      website_pages: { data: { id: 'pg1' }, error: null },
    });

    await createPage({
      project_id: 'p1',
      name: 'Home',
      slug: 'home',
      review_interval_days: '90',
      sort_order: '3',
    });

    const row = calls[0].chain.insert.mock.calls[0][0][0];
    expect(row.review_interval_days).toBe(90);
    expect(row.sort_order).toBe(3);
    expect(row.status).toBe('draft');
    expect(row.cms_status).toBe('not_started');
    expect(row.content_status).toBe('not_started');
    expect(row.design_status).toBe('not_started');
    expect(row.content_approval_status).toBe('not_started');
  });

  it('defaults review interval to 180 days', async () => {
    const { calls } = mockSupabase({
      website_pages: { data: { id: 'pg1' }, error: null },
    });

    await createPage({ project_id: 'p1', name: 'Home', slug: 'home' });

    expect(calls[0].chain.insert.mock.calls[0][0][0].review_interval_days).toBe(180);
  });
});

// -- deletePage ------------------------------------------------------------------

describe('deletePage', () => {
  it('blocks deletion when tasks reference the page', async () => {
    const { calls } = mockSupabase({
      website_tasks: { count: 2, error: null },
    });

    expect(await deletePage('pg1')).toEqual({
      error: 'Remove linked tasks before deleting this page',
    });
    expect(calls.filter((call) => call.table === 'website_pages')).toHaveLength(0);
  });

  it('deletes the page when no tasks reference it', async () => {
    mockSupabase({
      website_tasks: { count: 0, error: null },
      website_pages: { error: null },
    });

    expect(await deletePage('pg1')).toBe(true);
  });

  it('returns null when the reference check fails', async () => {
    mockSupabase({ website_tasks: { count: null, error: new Error('fail') } });
    expect(await deletePage('pg1')).toBeNull();
  });
});

// -- markPageReviewed ------------------------------------------------------------

describe('markPageReviewed', () => {
  it('returns null when the page does not exist', async () => {
    mockSupabase({ website_pages: { data: null, error: null } });
    expect(await markPageReviewed('pg1', 'note')).toBeNull();
  });

  it('promotes needs_update pages back to live and schedules the next review', async () => {
    const { calls } = mockSupabase({
      website_pages: [
        { data: { id: 'pg1', status: 'needs_update', review_interval_days: 30 }, error: null },
        { data: { id: 'pg1', status: 'live' }, error: null },
      ],
    });

    const result = await markPageReviewed('pg1', 'Looks good');

    const payload = calls[1].chain.update.mock.calls[0][0];
    expect(payload.status).toBe('live');
    expect(payload.last_review_note).toBe('Looks good');
    expect(payload.next_review_due).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result).toEqual({ id: 'pg1', status: 'live' });
  });

  it('keeps non-needs_update statuses unchanged', async () => {
    const { calls } = mockSupabase({
      website_pages: [
        { data: { id: 'pg1', status: 'draft', review_interval_days: 180 }, error: null },
        { data: { id: 'pg1', status: 'draft' }, error: null },
      ],
    });

    await markPageReviewed('pg1');

    const payload = calls[1].chain.update.mock.calls[0][0];
    expect(payload.status).toBe('draft');
    expect(payload.last_review_note).toBe('');
  });
});

// -- fetchChangeRequests ---------------------------------------------------------

describe('fetchChangeRequests', () => {
  it('applies a status filter when given and not "all"', async () => {
    const { calls } = mockSupabase({
      website_change_requests: { data: [{ id: 'cr1' }], error: null },
    });

    const result = await fetchChangeRequests('p1', 'open');

    expect(calls[0].chain.eq).toHaveBeenCalledWith('status', 'open');
    expect(result).toEqual([{ id: 'cr1' }]);
  });

  it('skips the status filter for "all"', async () => {
    const { calls } = mockSupabase({
      website_change_requests: { data: [], error: null },
    });

    await fetchChangeRequests('p1', 'all');

    expect(calls[0].chain.eq).toHaveBeenCalledTimes(1);
    expect(calls[0].chain.eq).toHaveBeenCalledWith('project_id', 'p1');
  });
});

// -- createChangeRequest ---------------------------------------------------------

describe('createChangeRequest', () => {
  it('applies defaults and coerces approval_required to a boolean', async () => {
    const { calls } = mockSupabase({
      website_change_requests: { data: { id: 'cr1' }, error: null },
    });

    await createChangeRequest({
      project_id: 'p1',
      title: 'Fix typo',
      requested_by_email: 'dan@pm.org',
      approval_required: 'yes',
    });

    const row = calls[0].chain.insert.mock.calls[0][0][0];
    expect(row.status).toBe('open');
    expect(row.priority).toBe('medium');
    expect(row.approval_required).toBe(true);
    expect(row.approval_status).toBeNull();
  });

  it('treats missing approval_required as false', async () => {
    const { calls } = mockSupabase({
      website_change_requests: { data: { id: 'cr1' }, error: null },
    });

    await createChangeRequest({ project_id: 'p1', title: 'X', requested_by_email: 'a@b.c' });

    expect(calls[0].chain.insert.mock.calls[0][0][0].approval_required).toBe(false);
  });
});

// -- createTemplate --------------------------------------------------------------

describe('createTemplate', () => {
  it('defaults flagged_for_early_signoff to true when undefined', async () => {
    const { calls } = mockSupabase({
      website_templates: { data: { id: 'tpl1' }, error: null },
    });

    await createTemplate({ project_id: 'p1', name: 'Landing' });

    expect(calls[0].chain.insert.mock.calls[0][0][0].flagged_for_early_signoff).toBe(true);
  });

  it('respects an explicit falsy flag', async () => {
    const { calls } = mockSupabase({
      website_templates: { data: { id: 'tpl1' }, error: null },
    });

    await createTemplate({ project_id: 'p1', name: 'Landing', flagged_for_early_signoff: 0 });

    expect(calls[0].chain.insert.mock.calls[0][0][0].flagged_for_early_signoff).toBe(false);
  });
});

// -- fetchPageDependencies -------------------------------------------------------

describe('fetchPageDependencies', () => {
  it('enriches dependencies with page names from the project pages', async () => {
    mockSupabase({
      website_pages: {
        data: [
          { id: 'a', name: 'Home' },
          { id: 'b', name: 'About' },
        ],
        error: null,
      },
      website_page_dependencies: {
        data: [{ id: 'dep1', page_id: 'a', depends_on_page_id: 'b' }],
        error: null,
      },
    });

    const result = await fetchPageDependencies('p1');

    expect(result).toEqual([
      {
        id: 'dep1',
        page_id: 'a',
        depends_on_page_id: 'b',
        page_name: 'Home',
        depends_on_name: 'About',
      },
    ]);
  });

  it('maps unknown page ids to null names', async () => {
    mockSupabase({
      website_pages: { data: [{ id: 'a', name: 'Home' }], error: null },
      website_page_dependencies: {
        data: [{ id: 'dep1', page_id: 'a', depends_on_page_id: 'missing' }],
        error: null,
      },
    });

    const [dep] = await fetchPageDependencies('p1');
    expect(dep.depends_on_name).toBeNull();
  });

  it('returns [] when the project has no pages', async () => {
    const { calls } = mockSupabase({
      website_pages: { data: [], error: null },
    });

    expect(await fetchPageDependencies('p1')).toEqual([]);
    expect(calls.filter((call) => call.table === 'website_page_dependencies')).toHaveLength(0);
  });
});

// -- addPageDependency -----------------------------------------------------------

describe('addPageDependency', () => {
  it('returns null when either page id is missing', async () => {
    mockSupabase({});
    expect(await addPageDependency(null, 'b')).toBeNull();
    expect(await addPageDependency('a', null)).toBeNull();
  });

  it('inserts with the default relationship type', async () => {
    const { calls } = mockSupabase({
      website_page_dependencies: { data: { id: 'dep1' }, error: null },
    });

    await addPageDependency('a', 'b');

    expect(calls[0].chain.insert).toHaveBeenCalledWith([
      { page_id: 'a', depends_on_page_id: 'b', relationship_type: 'references', notes: '' },
    ]);
  });

  it('maps a unique violation (23505) to an already_exists error', async () => {
    mockSupabase({
      website_page_dependencies: { data: null, error: { code: '23505' } },
    });

    expect(await addPageDependency('a', 'b')).toEqual({ error: 'already_exists' });
  });

  it('returns null on other insert errors', async () => {
    mockSupabase({
      website_page_dependencies: { data: null, error: { code: '42000' } },
    });

    expect(await addPageDependency('a', 'b')).toBeNull();
  });
});

// -- fetchDecisions --------------------------------------------------------------

describe('fetchDecisions', () => {
  it('sorts by status rank (open, deferred, decided) then due date, nulls last', async () => {
    mockSupabase({
      website_decisions: {
        data: [
          { id: '1', status: 'decided', due_date: '2026-01-01' },
          { id: '2', status: 'open', due_date: null },
          { id: '3', status: 'open', due_date: '2026-03-01' },
          { id: '4', status: 'deferred', due_date: '2026-02-01' },
          { id: '5', status: 'open', due_date: '2026-01-15' },
        ],
        error: null,
      },
    });

    const result = await fetchDecisions('p1');
    expect(result.map((decision) => decision.id)).toEqual(['5', '3', '2', '4', '1']);
  });

  it('ranks unknown statuses last', async () => {
    mockSupabase({
      website_decisions: {
        data: [
          { id: '1', status: 'weird', due_date: null },
          { id: '2', status: 'decided', due_date: null },
        ],
        error: null,
      },
    });

    const result = await fetchDecisions('p1');
    expect(result.map((decision) => decision.id)).toEqual(['2', '1']);
  });
});

// -- fetchLaunchReadiness --------------------------------------------------------

describe('fetchLaunchReadiness', () => {
  it('aggregates page statuses and dependency counts per section, sorted by section', async () => {
    mockSupabase({
      website_pages: {
        data: [
          {
            id: 'a',
            section: 'Zeta',
            cms_status: 'published',
            content_status: 'approved',
            design_status: 'signed_off',
            content_approval_status: 'approved',
          },
          {
            id: 'b',
            section: 'Alpha',
            cms_status: 'draft',
            content_status: 'in_progress',
            design_status: 'not_started',
            content_approval_status: 'not_started',
          },
          {
            id: 'c',
            section: 'Alpha',
            cms_status: 'published',
            content_status: 'approved',
            design_status: 'not_started',
            content_approval_status: 'not_started',
          },
        ],
        error: null,
      },
      website_page_dependencies: {
        data: [
          { id: 'dep1', page_id: 'b' },
          { id: 'dep2', page_id: 'b' },
          { id: 'dep3', page_id: 'a' },
        ],
        error: null,
      },
    });

    const result = await fetchLaunchReadiness('p1');

    expect(result.map((row) => row.section)).toEqual(['Alpha', 'Zeta']);
    expect(result[0]).toEqual({
      section: 'Alpha',
      total: 2,
      total_pages: 2,
      cms_done: 1,
      content_done: 1,
      design_done: 0,
      approval_done: 0,
      dependency_count: 2,
    });
    expect(result[1]).toMatchObject({
      section: 'Zeta',
      total: 1,
      cms_done: 1,
      content_done: 1,
      design_done: 1,
      approval_done: 1,
      dependency_count: 1,
    });
  });

  it('returns [] when no sectioned pages exist', async () => {
    mockSupabase({ website_pages: { data: [], error: null } });
    expect(await fetchLaunchReadiness('p1')).toEqual([]);
  });

  it('still returns sections when the dependency query fails', async () => {
    mockSupabase({
      website_pages: {
        data: [
          {
            id: 'a',
            section: 'Alpha',
            cms_status: 'draft',
            content_status: 'draft',
            design_status: 'draft',
            content_approval_status: 'draft',
          },
        ],
        error: null,
      },
      website_page_dependencies: { data: null, error: new Error('fail') },
    });

    const result = await fetchLaunchReadiness('p1');
    expect(result).toHaveLength(1);
    expect(result[0].dependency_count).toBe(0);
  });
});

// -- updateSitemapNode -----------------------------------------------------------

describe('updateSitemapNode', () => {
  it('coerces sort_order to a number when present', async () => {
    const { calls } = mockSupabase({
      website_sitemap_nodes: { data: { id: 'n1' }, error: null },
    });

    await updateSitemapNode('n1', { sort_order: '7' });

    expect(calls[0].chain.update.mock.calls[0][0].sort_order).toBe(7);
  });

  it('leaves payload untouched when sort_order is absent', async () => {
    const { calls } = mockSupabase({
      website_sitemap_nodes: { data: { id: 'n1' }, error: null },
    });

    await updateSitemapNode('n1', { name: 'Renamed' });

    const payload = calls[0].chain.update.mock.calls[0][0];
    expect(payload).not.toHaveProperty('sort_order');
    expect(payload.name).toBe('Renamed');
  });
});

// -- importPagesAsSitemapNodes ---------------------------------------------------

describe('importPagesAsSitemapNodes', () => {
  it('returns [] without querying when pages is empty or not an array', async () => {
    const { fromFn } = mockSupabase({});
    expect(await importPagesAsSitemapNodes('p1', [])).toEqual([]);
    expect(await importPagesAsSitemapNodes('p1', 'nope')).toEqual([]);
    expect(fromFn).not.toHaveBeenCalled();
  });

  it('skips pages already linked to a sitemap node', async () => {
    const { calls } = mockSupabase({
      website_sitemap_nodes: [
        { data: [{ linked_page_id: 'a' }], error: null },
        { data: [{ id: 'node-b' }], error: null },
      ],
    });

    const result = await importPagesAsSitemapNodes(
      'p1',
      [
        { id: 'a', name: 'Home', slug: 'home' },
        { id: 'b', name: 'About', slug: 'about', sort_order: 4 },
      ],
      'dan@pm.org'
    );

    const insertedRows = calls[1].chain.insert.mock.calls[0][0];
    expect(insertedRows).toHaveLength(1);
    expect(insertedRows[0]).toMatchObject({
      project_id: 'p1',
      name: 'About',
      slug: 'about',
      linked_page_id: 'b',
      sort_order: 4,
      created_by_email: 'dan@pm.org',
    });
    expect(result).toEqual([{ id: 'node-b' }]);
  });

  it('returns [] without inserting when every page is already linked', async () => {
    const { calls } = mockSupabase({
      website_sitemap_nodes: [{ data: [{ linked_page_id: 'a' }], error: null }],
    });

    const result = await importPagesAsSitemapNodes('p1', [{ id: 'a', name: 'Home' }]);

    expect(result).toEqual([]);
    expect(calls).toHaveLength(1);
  });

  it('falls back to the array index for sort_order', async () => {
    const { calls } = mockSupabase({
      website_sitemap_nodes: [
        { data: [], error: null },
        { data: [{ id: 'n1' }, { id: 'n2' }], error: null },
      ],
    });

    await importPagesAsSitemapNodes('p1', [
      { id: 'a', name: 'Home' },
      { id: 'b', name: 'About' },
    ]);

    const rows = calls[1].chain.insert.mock.calls[0][0];
    expect(rows[0].sort_order).toBe(0);
    expect(rows[1].sort_order).toBe(1);
  });
});
