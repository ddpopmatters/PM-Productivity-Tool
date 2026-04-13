import { getSupabase } from '../api/supabase';
import { Logger } from '../utils/logger';

export async function fetchMindmaps(email) {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('mindmaps')
    .select('*')
    .eq('owner_email', email)
    .order('updated_at', { ascending: false });
  if (error) {
    Logger.error(error, 'Fetch mindmaps error');
    return [];
  }
  return data || [];
}

export async function createMindmap(title, email) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('mindmaps')
    .insert([{
      title,
      nodes: [],
      owner_email: email,
    }])
    .select()
    .single();
  if (error) {
    Logger.error(error, 'Create mindmap error');
    return null;
  }
  return data;
}

export async function updateMindmap(id, updates) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('mindmaps')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) {
    Logger.error(error, 'Update mindmap error');
    return null;
  }
  return data;
}

export async function deleteMindmap(id) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { error } = await supabase
    .from('mindmaps')
    .delete()
    .eq('id', id);
  if (error) {
    Logger.error(error, 'Delete mindmap error');
    return null;
  }
  return true;
}
