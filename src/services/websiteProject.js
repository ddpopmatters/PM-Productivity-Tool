import { getSupabase } from '../api/supabase';
import { Logger } from '../utils/logger';

const WEBSITE_PHASES = [
  { name: 'Discovery', phase_order: 1 },
  { name: 'Design', phase_order: 2 },
  { name: 'Build', phase_order: 3 },
  { name: 'QA', phase_order: 4 },
  { name: 'Launch', phase_order: 5 },
];

function addDays(baseDate, days) {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
}

export async function fetchWebsiteProject() {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('website_project')
    .select('*')
    .neq('status', 'archived')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    Logger.error(error, 'Fetch website project error');
    return null;
  }

  return data || null;
}

export async function createWebsiteProject(projectData) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('website_project')
    .insert([
      {
        name: projectData.name,
        description: projectData.description || '',
        lead_email: projectData.lead_email,
        created_by: projectData.created_by || null,
        status: projectData.status || 'planning',
      },
    ])
    .select()
    .single();

  if (error) {
    Logger.error(error, 'Create website project error');
    return null;
  }

  const phaseResults = await Promise.all(
    WEBSITE_PHASES.map((phase) =>
      supabase.from('website_phases').insert([
        {
          project_id: data.id,
          name: phase.name,
          phase_order: phase.phase_order,
        },
      ])
    )
  );

  const failedInsert = phaseResults.find((result) => result.error);
  if (failedInsert?.error) {
    Logger.error(failedInsert.error, 'Seed website phases error');
    return null;
  }

  return data;
}

export async function updateWebsiteProject(id, updates) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('website_project')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    Logger.error(error, 'Update website project error');
    return null;
  }

  return data;
}

export async function launchProject(id) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data: launchPhase, error: phaseError } = await supabase
    .from('website_phases')
    .select('*')
    .eq('project_id', id)
    .eq('name', 'Launch')
    .maybeSingle();

  if (phaseError) {
    Logger.error(phaseError, 'Fetch launch phase error');
    return null;
  }

  if (!launchPhase || launchPhase.status !== 'complete') {
    return { error: 'Launch phase must be complete before launching' };
  }

  const { data, error } = await supabase
    .from('website_project')
    .update({
      status: 'launched',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    Logger.error(error, 'Launch website project error');
    return null;
  }

  const { error: pagesError } = await supabase
    .from('website_pages')
    .update({
      status: 'live',
      next_review_due: addDays(new Date(), 180),
      updated_at: new Date().toISOString(),
    })
    .eq('project_id', id)
    .eq('status', 'draft');

  if (pagesError) {
    Logger.error(pagesError, 'Set draft website pages live error');
  }

  return data;
}

export async function archiveProject(id) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('website_project')
    .update({
      status: 'archived',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    Logger.error(error, 'Archive website project error');
    return null;
  }

  return data;
}

export async function fetchWebsitePhases(projectId) {
  const supabase = getSupabase();
  if (!supabase || !projectId) return [];

  const { data, error } = await supabase
    .from('website_phases')
    .select('*')
    .eq('project_id', projectId)
    .order('phase_order', { ascending: true });

  if (error) {
    Logger.error(error, 'Fetch website phases error');
    return [];
  }

  return data || [];
}

export async function updatePhaseStatus(id, status) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('website_phases')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    Logger.error(error, 'Update website phase status error');
    return null;
  }

  return data;
}

export async function submitPhaseForApproval(id, email) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('website_phases')
    .update({
      approval_submitted_by: email,
      approval_submitted_at: new Date().toISOString(),
      approval_status: 'pending',
      approval_comment: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    Logger.error(error, 'Submit website phase approval error');
    return null;
  }

  return data;
}

export async function reviewPhaseApproval(id, status, comment) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('website_phases')
    .update({
      approval_status: status,
      approval_comment: comment || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    Logger.error(error, 'Review website phase approval error');
    return null;
  }

  return data;
}

export async function fetchPhaseTasks(phaseId) {
  const supabase = getSupabase();
  if (!supabase || !phaseId) return [];

  const { data, error } = await supabase
    .from('website_tasks')
    .select('*')
    .eq('phase_id', phaseId)
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });

  if (error) {
    Logger.error(error, 'Fetch website phase tasks error');
    return [];
  }

  return data || [];
}

export async function fetchMyTasks(projectId, userEmail) {
  const supabase = getSupabase();
  if (!supabase || !projectId || !userEmail) return [];

  const { data, error } = await supabase
    .from('website_tasks')
    .select('*')
    .eq('project_id', projectId)
    .eq('assignee_email', userEmail)
    .neq('status', 'done')
    .order('due_date', { ascending: true, nullsFirst: false });

  if (error) {
    Logger.error(error, 'Fetch website tasks for assignee error');
    return [];
  }

  return data || [];
}

export async function createTask(taskData) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('website_tasks')
    .insert([
      {
        project_id: taskData.project_id,
        phase_id: taskData.phase_id,
        page_id: taskData.page_id || null,
        title: taskData.title,
        description: taskData.description || '',
        assignee_email: taskData.assignee_email || null,
        due_date: taskData.due_date || null,
        status: taskData.status || 'todo',
        created_by_email: taskData.created_by_email || null,
      },
    ])
    .select()
    .single();

  if (error) {
    Logger.error(error, 'Create website task error');
    return null;
  }

  return data;
}

export async function updateTask(id, updates) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('website_tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    Logger.error(error, 'Update website task error');
    return null;
  }

  return data;
}

export async function deleteTask(id) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { error } = await supabase
    .from('website_tasks')
    .delete()
    .eq('id', id);

  if (error) {
    Logger.error(error, 'Delete website task error');
    return null;
  }

  return true;
}

export async function fetchWebsitePages(projectId) {
  const supabase = getSupabase();
  if (!supabase || !projectId) return [];

  const { data, error } = await supabase
    .from('website_pages')
    .select(
      `
        id,
        project_id,
        name,
        slug,
        description,
        owner_email,
        editor_email,
        reviewer_email,
        status,
        review_interval_days,
        next_review_due,
        last_reviewed_at,
        last_review_note,
        created_by_email,
        created_at,
        updated_at,
        section,
        sub_section,
        sort_order,
        cms_status,
        content_status,
        design_status,
        content_approval_status,
        template_id,
        page_notes
      `
    )
    .eq('project_id', projectId)
    .order('name', { ascending: true });

  if (error) {
    Logger.error(error, 'Fetch website pages error');
    return [];
  }

  return data || [];
}

export async function createPage(pageData) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('website_pages')
    .insert([
      {
        project_id: pageData.project_id,
        name: pageData.name,
        slug: pageData.slug,
        description: pageData.description || '',
        owner_email: pageData.owner_email || null,
        editor_email: pageData.editor_email || null,
        reviewer_email: pageData.reviewer_email || null,
        status: pageData.status || 'draft',
        review_interval_days: Number(pageData.review_interval_days || 180),
        next_review_due: pageData.next_review_due || null,
        section: pageData.section || null,
        sub_section: pageData.sub_section || null,
        sort_order: Number(pageData.sort_order || 0),
        cms_status: pageData.cms_status || 'not_started',
        content_status: pageData.content_status || 'not_started',
        design_status: pageData.design_status || 'not_started',
        content_approval_status: pageData.content_approval_status || 'not_started',
        template_id: pageData.template_id || null,
        page_notes: pageData.page_notes || '',
        created_by_email: pageData.created_by_email || null,
      },
    ])
    .select()
    .single();

  if (error) {
    Logger.error(error, 'Create website page error');
    return null;
  }

  return data;
}

export async function updatePage(id, updates) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('website_pages')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    Logger.error(error, 'Update website page error');
    return null;
  }

  return data;
}

export async function deletePage(id) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { count, error: checkError } = await supabase
    .from('website_tasks')
    .select('id', { count: 'exact', head: true })
    .eq('page_id', id);

  if (checkError) {
    Logger.error(checkError, 'Check website page task references error');
    return null;
  }

  if ((count || 0) > 0) {
    return { error: 'Remove linked tasks before deleting this page' };
  }

  const { error } = await supabase
    .from('website_pages')
    .delete()
    .eq('id', id);

  if (error) {
    Logger.error(error, 'Delete website page error');
    return null;
  }

  return true;
}

export async function markPageReviewed(id, note) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data: currentPage, error: fetchError } = await supabase
    .from('website_pages')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (fetchError) {
    Logger.error(fetchError, 'Fetch website page for review error');
    return null;
  }

  if (!currentPage) return null;

  const { data, error } = await supabase
    .from('website_pages')
    .update({
      last_reviewed_at: new Date().toISOString(),
      last_review_note: note || '',
      next_review_due: addDays(new Date(), currentPage.review_interval_days || 180),
      status: currentPage.status === 'needs_update' ? 'live' : currentPage.status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    Logger.error(error, 'Mark website page reviewed error');
    return null;
  }

  return data;
}

export async function fetchChangeRequests(projectId, statusFilter) {
  const supabase = getSupabase();
  if (!supabase || !projectId) return [];

  let query = supabase
    .from('website_change_requests')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  const { data, error } = await query;

  if (error) {
    Logger.error(error, 'Fetch website change requests error');
    return [];
  }

  return data || [];
}

export async function createChangeRequest(changeRequestData) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('website_change_requests')
    .insert([
      {
        project_id: changeRequestData.project_id,
        page_id: changeRequestData.page_id || null,
        title: changeRequestData.title,
        description: changeRequestData.description || '',
        requested_by_email: changeRequestData.requested_by_email,
        assignee_email: changeRequestData.assignee_email || null,
        status: changeRequestData.status || 'open',
        priority: changeRequestData.priority || 'medium',
        approval_required: Boolean(changeRequestData.approval_required),
        approval_status: changeRequestData.approval_status || null,
        approval_comment: changeRequestData.approval_comment || null,
      },
    ])
    .select()
    .single();

  if (error) {
    Logger.error(error, 'Create website change request error');
    return null;
  }

  return data;
}

export async function updateChangeRequest(id, updates) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('website_change_requests')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    Logger.error(error, 'Update website change request error');
    return null;
  }

  return data;
}

// Templates
export async function fetchWebsiteTemplates(projectId) {
  const supabase = getSupabase();
  if (!supabase || !projectId) return [];

  const { data, error } = await supabase
    .from('website_templates')
    .select('*')
    .eq('project_id', projectId)
    .order('flagged_for_early_signoff', { ascending: false })
    .order('name', { ascending: true });

  if (error) {
    Logger.error(error, 'Fetch website templates error');
    return [];
  }

  return data || [];
}

export async function createTemplate(data) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data: created, error } = await supabase
    .from('website_templates')
    .insert([
      {
        project_id: data.project_id,
        name: data.name,
        description: data.description || '',
        developer_notes: data.developer_notes || '',
        flagged_for_early_signoff:
          data.flagged_for_early_signoff === undefined
            ? true
            : Boolean(data.flagged_for_early_signoff),
        created_by_email: data.created_by_email || null,
      },
    ])
    .select()
    .single();

  if (error) {
    Logger.error(error, 'Create website template error');
    return null;
  }

  return created;
}

export async function updateTemplate(id, updates) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('website_templates')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    Logger.error(error, 'Update website template error');
    return null;
  }

  return data;
}

export async function deleteTemplate(id) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { error } = await supabase
    .from('website_templates')
    .delete()
    .eq('id', id);

  if (error) {
    Logger.error(error, 'Delete website template error');
    return null;
  }

  return true;
}

// Page dependencies
export async function fetchPageDependencies(projectId) {
  const supabase = getSupabase();
  if (!supabase || !projectId) return [];

  const { data: pages, error: pagesError } = await supabase
    .from('website_pages')
    .select('id, name')
    .eq('project_id', projectId);

  if (pagesError) {
    Logger.error(pagesError, 'Fetch website pages for dependencies error');
    return [];
  }

  if (!pages?.length) {
    return [];
  }

  const pageMap = new Map(pages.map((page) => [page.id, page.name]));
  const pageIds = pages.map((page) => page.id);

  const { data, error } = await supabase
    .from('website_page_dependencies')
    .select('*')
    .in('page_id', pageIds)
    .order('created_at', { ascending: true });

  if (error) {
    Logger.error(error, 'Fetch website page dependencies error');
    return [];
  }

  return (data || []).map((dependency) => ({
    ...dependency,
    page_name: pageMap.get(dependency.page_id) || null,
    depends_on_name: pageMap.get(dependency.depends_on_page_id) || null,
  }));
}

export async function addPageDependency(pageId, dependsOnPageId, relationshipType, notes) {
  const supabase = getSupabase();
  if (!supabase || !pageId || !dependsOnPageId) return null;

  const { data, error } = await supabase
    .from('website_page_dependencies')
    .insert([
      {
        page_id: pageId,
        depends_on_page_id: dependsOnPageId,
        relationship_type: relationshipType || 'references',
        notes: notes || '',
      },
    ])
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return { error: 'already_exists' };
    }

    Logger.error(error, 'Add website page dependency error');
    return null;
  }

  return data;
}

export async function removePageDependency(id) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { error } = await supabase
    .from('website_page_dependencies')
    .delete()
    .eq('id', id);

  if (error) {
    Logger.error(error, 'Remove website page dependency error');
    return null;
  }

  return true;
}

// Decisions
export async function fetchDecisions(projectId) {
  const supabase = getSupabase();
  if (!supabase || !projectId) return [];

  const { data, error } = await supabase
    .from('website_decisions')
    .select('*')
    .eq('project_id', projectId);

  if (error) {
    Logger.error(error, 'Fetch website decisions error');
    return [];
  }

  const statusOrder = {
    open: 0,
    deferred: 1,
    decided: 2,
  };

  return [...(data || [])].sort((left, right) => {
    const leftRank = statusOrder[left.status] ?? 99;
    const rightRank = statusOrder[right.status] ?? 99;
    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    if (!left.due_date && !right.due_date) return 0;
    if (!left.due_date) return 1;
    if (!right.due_date) return -1;
    return left.due_date.localeCompare(right.due_date);
  });
}

export async function createDecision(data) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data: created, error } = await supabase
    .from('website_decisions')
    .insert([
      {
        project_id: data.project_id,
        title: data.title,
        description: data.description || '',
        owner_email: data.owner_email || null,
        due_date: data.due_date || null,
        related_page_ids: data.related_page_ids || [],
        status: data.status || 'open',
        outcome: data.outcome || null,
        created_by_email: data.created_by_email || null,
      },
    ])
    .select()
    .single();

  if (error) {
    Logger.error(error, 'Create website decision error');
    return null;
  }

  return created;
}

export async function updateDecision(id, updates) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('website_decisions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    Logger.error(error, 'Update website decision error');
    return null;
  }

  return data;
}

export async function deleteDecision(id) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { error } = await supabase
    .from('website_decisions')
    .delete()
    .eq('id', id);

  if (error) {
    Logger.error(error, 'Delete website decision error');
    return null;
  }

  return true;
}

// Launch readiness (computed, not stored)
export async function fetchLaunchReadiness(projectId) {
  const supabase = getSupabase();
  if (!supabase || !projectId) return [];

  const { data: pageRows, error: pagesError } = await supabase
    .from('website_pages')
    .select(
      `
        id,
        section,
        cms_status,
        content_status,
        design_status,
        content_approval_status
      `
    )
    .eq('project_id', projectId)
    .not('section', 'is', null);

  if (pagesError) {
    Logger.error(pagesError, 'Fetch website launch readiness pages error');
    return [];
  }

  if (!pageRows?.length) {
    return [];
  }

  const sectionRows = pageRows.reduce((accumulator, page) => {
    const key = page.section;
    if (!key) return accumulator;

    if (!accumulator[key]) {
      accumulator[key] = {
        section: key,
        total: 0,
        total_pages: 0,
        cms_done: 0,
        content_done: 0,
        design_done: 0,
        approval_done: 0,
        dependency_count: 0,
      };
    }

    accumulator[key].total += 1;
    accumulator[key].total_pages += 1;
    if (page.cms_status === 'published') accumulator[key].cms_done += 1;
    if (page.content_status === 'approved') accumulator[key].content_done += 1;
    if (page.design_status === 'signed_off') accumulator[key].design_done += 1;
    if (page.content_approval_status === 'approved') accumulator[key].approval_done += 1;

    return accumulator;
  }, {});

  const pageSectionMap = new Map(
    pageRows.map((page) => [page.id, page.section]).filter(([, section]) => Boolean(section))
  );

  const { data: dependencyRows, error: dependencyError } = await supabase
    .from('website_page_dependencies')
    .select('id, page_id')
    .in('page_id', pageRows.map((page) => page.id));

  if (dependencyError) {
    Logger.error(dependencyError, 'Fetch website launch readiness dependencies error');
  } else {
    (dependencyRows || []).forEach((dependency) => {
      const section = pageSectionMap.get(dependency.page_id);
      if (section && sectionRows[section]) {
        sectionRows[section].dependency_count += 1;
      }
    });
  }

  return Object.values(sectionRows).sort((left, right) =>
    left.section.localeCompare(right.section)
  );
}
