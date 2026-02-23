import { getSupabase } from '../api/supabase';
import { Logger } from '../utils/logger';
import { sanitizeEmailForQuery } from '../utils/security';

export async function fetchWhiteboards(email) {
  const supabase = getSupabase();
  if (!supabase) return [];
  const safeEmail = sanitizeEmailForQuery(email);
  if (!safeEmail) {
    Logger.error({ email }, 'Invalid email for whiteboard fetch');
    return [];
  }
  const { data, error } = await supabase
    .from('whiteboards')
    .select('*')
    .or(`owner_email.eq.${safeEmail},shared_with.cs.{${safeEmail}}`)
    .order('updated_at', { ascending: false });
  if (error) {
    Logger.error(error, 'Fetch whiteboards error');
    return [];
  }
  return data || [];
}

export async function createWhiteboard(whiteboard) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('whiteboards')
    .insert([{
      title: whiteboard.title,
      owner_email: whiteboard.owner_email,
      owner_name: whiteboard.owner_name,
      shared_with: [],
    }])
    .select()
    .single();
  if (error) {
    Logger.error(error, 'Create whiteboard error');
    return null;
  }
  return data;
}

export async function updateWhiteboard(id, updates) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('whiteboards')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) {
    Logger.error(error, 'Update whiteboard error');
    return null;
  }
  return data;
}

export async function deleteWhiteboard(id) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { error } = await supabase
    .from('whiteboards')
    .delete()
    .eq('id', id);
  if (error) {
    Logger.error(error, 'Delete whiteboard error');
    return null;
  }
  return true;
}

export async function fetchElements(whiteboardId) {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('whiteboard_elements')
    .select('*')
    .eq('whiteboard_id', whiteboardId)
    .order('z_index', { ascending: true });
  if (error) {
    Logger.error(error, 'Fetch whiteboard elements error');
    return [];
  }
  return data || [];
}

export async function createElement(element) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('whiteboard_elements')
    .insert([element])
    .select()
    .single();
  if (error) {
    Logger.error(error, 'Create whiteboard element error');
    return null;
  }
  return data;
}

export async function updateElement(id, updates) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('whiteboard_elements')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) {
    Logger.error(error, 'Update whiteboard element error');
    return null;
  }
  return data;
}

export async function deleteElement(id) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { error } = await supabase
    .from('whiteboard_elements')
    .delete()
    .eq('id', id);
  if (error) {
    Logger.error(error, 'Delete whiteboard element error');
    return null;
  }
  return true;
}

export function subscribeToWhiteboard(whiteboardId, callback) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const channel = supabase
    .channel(`whiteboard:${whiteboardId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'whiteboard_elements',
        filter: `whiteboard_id=eq.${whiteboardId}`,
      },
      callback,
    )
    .subscribe();
  return channel;
}
