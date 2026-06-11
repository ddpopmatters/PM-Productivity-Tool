import { getSupabase } from '../api/supabase';
import { Logger } from '../utils/logger';

export async function fetchPendingBrainDumps(limit = 50) {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('brain_dumps')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) {
    Logger.error(error, 'Fetch brain dumps error');
    return [];
  }
  return data || [];
}

export async function markBrainDumpRouted(id, destination, routedToId) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase unavailable');
  const { error } = await supabase
    .from('brain_dumps')
    .update({
      status: destination === 'archive' ? 'archived' : 'routed',
      routed_to_type: destination,
      routed_to_id: routedToId ?? null,
      routed_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw error;
}
