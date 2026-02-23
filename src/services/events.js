import { getSupabase } from '../api/supabase';
import { Logger } from '../utils/logger';

export async function fetchEvents() {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('event_date', { ascending: true });
  if (error) {
    if (error.code !== '42P01') {
      Logger.error(error, 'Fetch events error');
    }
    return [];
  }
  return data || [];
}

export async function createEvent(event) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('events')
    .insert([{
      title: event.title,
      description: event.description || null,
      event_date: event.eventDate,
      end_date: event.endDate || null,
      created_by: event.createdBy,
      created_by_email: event.createdByEmail,
      color: event.color || 'ocean',
      category: event.category || null,
      location: event.location || null,
      linked_entry_id: event.linkedEntryId || null,
      linked_workstream_id: event.linkedWorkstreamId || null,
    }])
    .select()
    .single();
  if (error) {
    Logger.error(error, 'Create event error');
    return null;
  }
  return data;
}

export async function updateEvent(id, updates) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const fieldMap = {
    eventDate: 'event_date',
    endDate: 'end_date',
    createdBy: 'created_by',
    createdByEmail: 'created_by_email',
    linkedEntryId: 'linked_entry_id',
    linkedWorkstreamId: 'linked_workstream_id',
  };
  const mapped = { updated_at: new Date().toISOString() };
  for (const [key, value] of Object.entries(updates)) {
    mapped[fieldMap[key] || key] = value;
  }
  const { data, error } = await supabase
    .from('events')
    .update(mapped)
    .eq('id', id)
    .select()
    .single();
  if (error) {
    Logger.error(error, 'Update event error');
    return null;
  }
  return data;
}

export async function deleteEvent(id) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id);
  if (error) {
    Logger.error(error, 'Delete event error');
    return null;
  }
  return true;
}
