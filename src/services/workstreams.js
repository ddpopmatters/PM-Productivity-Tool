import { getSupabase } from '../api/supabase';
import { Logger } from '../utils/logger';
import { sanitizeEmailForQuery } from '../utils/security';

export async function fetchWorkstreams(email) {
  const supabase = getSupabase();
  if (!supabase) return [];
  const safeEmail = sanitizeEmailForQuery(email);
  if (!safeEmail) {
    Logger.error({ email }, 'Invalid email for workstream fetch');
    return [];
  }
  const { data, error } = await supabase
    .from('workstreams')
    .select('*')
    .or(`owner_email.eq.${safeEmail},visibility.eq.shared`)
    .order('created_at', { ascending: false });
  if (error) {
    Logger.error(error, 'Fetch workstreams error');
    return [];
  }
  return data || [];
}

export async function fetchWorkstreamTasks(workstreamIds = []) {
  const supabase = getSupabase();
  if (!supabase) return [];
  if (!Array.isArray(workstreamIds) || workstreamIds.length === 0) return [];
  const { data, error } = await supabase
    .from('workstream_tasks')
    .select('*')
    .in('workstream_id', workstreamIds)
    .order('created_at', { ascending: false });
  if (error) {
    if (error.code !== '42P01') {
      Logger.error(error, 'Fetch workstream tasks error');
    }
    return [];
  }
  return data || [];
}

export async function createWorkstream(workstreamData, userEmail) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('workstreams')
    .insert([{
      title: workstreamData.title,
      description: workstreamData.description || '',
      owner: workstreamData.owner,
      owner_email: userEmail,
      visibility: workstreamData.visibility || 'personal',
      color: workstreamData.color || 'blue',
    }])
    .select()
    .single();
  if (error) {
    Logger.error(error, 'Create workstream error');
    return null;
  }
  return data;
}

export async function updateWorkstream(id, updates) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('workstreams')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) {
    Logger.error(error, 'Update workstream error');
    return null;
  }
  return data;
}

export async function deleteWorkstream(id) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { error } = await supabase
    .from('workstreams')
    .delete()
    .eq('id', id);
  if (error) {
    Logger.error(error, 'Delete workstream error');
    return null;
  }
  return true;
}

export async function createWorkstreamTask(taskData) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('workstream_tasks')
    .insert([{
      workstream_id: taskData.workstreamId,
      title: taskData.title,
      description: taskData.description || '',
      priority: taskData.priority || 'medium',
      status: 'open',
      deadline: taskData.deadline || null,
      assignee: taskData.assignee || '',
      assignee_email: taskData.assigneeEmail || '',
      requester: taskData.requester || '',
      task_type: taskData.taskType || 'Issue',
      tags: taskData.tags || [],
      comments: [],
      sort_order: taskData.sortOrder || 0,
    }])
    .select()
    .single();
  if (error) {
    Logger.error(error, 'Create workstream task error');
    return null;
  }
  return data;
}

export async function updateWorkstreamTask(id, updates) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const fieldMap = {
    sortOrder: 'sort_order',
    assigneeEmail: 'assignee_email',
    workstreamId: 'workstream_id',
    taskType: 'task_type',
    linkedItems: 'linked_items',
  };
  const mapped = { updated_at: new Date().toISOString() };
  for (const [key, value] of Object.entries(updates)) {
    mapped[fieldMap[key] || key] = value;
  }
  const { data, error } = await supabase
    .from('workstream_tasks')
    .update(mapped)
    .eq('id', id)
    .select()
    .single();
  if (error) {
    Logger.error(error, 'Update workstream task error');
    return null;
  }
  return data;
}

export async function deleteWorkstreamTask(id) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { error } = await supabase
    .from('workstream_tasks')
    .delete()
    .eq('id', id);
  if (error) {
    Logger.error(error, 'Delete workstream task error');
    return null;
  }
  return true;
}
