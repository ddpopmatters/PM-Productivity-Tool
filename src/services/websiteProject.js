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
    .select('*')
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
