import { getSupabase } from '../api/supabase';
import { Logger } from '../utils/logger';
import { getPhaseFromDate } from '../utils/config';

/**
 * Convert JS arrays to PostgreSQL array literal strings for TEXT[] columns.
 * Workaround for PostgREST schema cache not recognising the TEXT→TEXT[] migration.
 */
export const toPgArray = (arr) => {
  if (!Array.isArray(arr)) return arr;
  if (arr.length === 0) return '{}';
  return '{' + arr.map(v => '"' + String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"').join(',') + '}';
};

/** Transform a database row to app-format object */
export const transformEntry = (row) => ({
  id: row.id,
  title: row.title,
  caption: row.caption,
  workflowStatus: row.workflow_status,
  team: row.team,
  timelineValue: row.timeline_value,
  owner: Array.isArray(row.owner) ? row.owner : row.owner ? [row.owner] : [],
  ownerEmail: Array.isArray(row.owner_email) ? row.owner_email : row.owner_email ? [row.owner_email] : [],
  collaborators: row.collaborators || [],
  tags: row.tags || [],
  subtasks: row.subtasks || [],
  documents: row.documents || [],
  date: row.date,
  comments: row.comments || [],
  archived: row.archived || false,
  dependencies: row.dependencies || [],
  customFields: row.custom_fields || [],
  attachments: row.attachments || [],
  itemType: row.item_type || 'project',
  phase: row.phase || null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export async function fetchWorkflowItems() {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('workflow_items')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    Logger.error(error, 'Supabase fetch error');
    return [];
  }
  return data || [];
}

export async function saveItem(item, userEmail) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('workflow_items')
    .insert([{
      title: item.title,
      caption: item.caption || '',
      workflow_status: item.workflowStatus || 'Idea',
      team: item.team || '',
      timeline_value: item.timelineValue || '',
      owner: Array.isArray(item.owner) ? item.owner : [item.owner].filter(Boolean),
      owner_email: Array.isArray(item.ownerEmail) ? item.ownerEmail : [userEmail].filter(Boolean),
      collaborators: item.collaborators || [],
      tags: item.tags || [],
      subtasks: item.subtasks || [],
      documents: item.documents || [],
      date: item.date || null,
      comments: item.comments || [],
      archived: item.archived || false,
      dependencies: item.dependencies || [],
      custom_fields: item.customFields || [],
      attachments: item.attachments || [],
      item_type: item.itemType || 'project',
      phase: item.phase || getPhaseFromDate(item.timelineValue || item.date) || null,
    }])
    .select()
    .single();
  if (error) {
    Logger.error(error, 'Supabase save error');
    return null;
  }
  return data;
}

export async function updateItem(id, updates) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const updateObj = { updated_at: new Date().toISOString() };
  if (updates.title !== undefined) updateObj.title = updates.title;
  if (updates.caption !== undefined) updateObj.caption = updates.caption;
  if (updates.workflowStatus !== undefined) updateObj.workflow_status = updates.workflowStatus;
  if (updates.team !== undefined) updateObj.team = updates.team;
  if (updates.timelineValue !== undefined) updateObj.timeline_value = updates.timelineValue;
  if (updates.owner !== undefined) updateObj.owner = Array.isArray(updates.owner) ? updates.owner : [updates.owner].filter(Boolean);
  if (updates.ownerEmail !== undefined) updateObj.owner_email = Array.isArray(updates.ownerEmail) ? updates.ownerEmail : [updates.ownerEmail].filter(Boolean);
  if (updates.collaborators !== undefined) updateObj.collaborators = updates.collaborators;
  if (updates.tags !== undefined) updateObj.tags = updates.tags;
  if (updates.subtasks !== undefined) updateObj.subtasks = updates.subtasks;
  if (updates.documents !== undefined) updateObj.documents = updates.documents;
  if (updates.date !== undefined) {
    const d = updates.date;
    if (!d || /^\d{4}-\d{2}-\d{2}$/.test(d)) {
      updateObj.date = d;
    }
  }
  if (updates.comments !== undefined) updateObj.comments = updates.comments;
  if (updates.archived !== undefined) updateObj.archived = updates.archived;
  if (updates.dependencies !== undefined) updateObj.dependencies = updates.dependencies;
  if (updates.customFields !== undefined) updateObj.custom_fields = updates.customFields;
  if (updates.attachments !== undefined) updateObj.attachments = updates.attachments;
  if (updates.phase !== undefined) updateObj.phase = updates.phase;
  if (updates.phase === undefined && (updates.timelineValue !== undefined || updates.date !== undefined)) {
    const dateForPhase = updates.timelineValue || updates.date;
    if (dateForPhase) {
      const computed = getPhaseFromDate(dateForPhase);
      if (computed) updateObj.phase = computed;
    }
  }

  const { error } = await supabase
    .from('workflow_items')
    .update(updateObj)
    .eq('id', id);
  if (error) {
    Logger.error(error, `Supabase update error for id ${id}`);
    return null;
  }
  return true;
}

export async function deleteItem(id) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { error } = await supabase
    .from('workflow_items')
    .delete()
    .eq('id', id);
  if (error) {
    Logger.error(error, 'Supabase delete error');
    return null;
  }
  return true;
}
