import { getSupabase } from '../api/supabase';
import { Logger } from '../utils/logger';

export async function fetchHabits(email) {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .eq('user_email', email)
    .order('created_at', { ascending: false });
  if (error) {
    Logger.error(error, 'Fetch habits error');
    return [];
  }
  return data || [];
}

export async function fetchCompletions(habitId, startDate, endDate) {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('habit_completions')
    .select('*')
    .eq('habit_id', habitId)
    .gte('date', startDate)
    .lte('date', endDate);
  if (error) {
    Logger.error(error, 'Fetch completions error');
    return [];
  }
  return data || [];
}

export async function createHabit(habit) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('habits')
    .insert([habit])
    .select()
    .single();
  if (error) {
    Logger.error(error, 'Create habit error');
    return null;
  }
  return data;
}

export async function deleteHabit(habitId) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { error } = await supabase
    .from('habits')
    .delete()
    .eq('id', habitId);
  if (error) {
    Logger.error(error, 'Delete habit error');
    return null;
  }
  return true;
}

export async function toggleCompletion(habitId, date) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data: existing } = await supabase
    .from('habit_completions')
    .select('*')
    .eq('habit_id', habitId)
    .eq('date', date)
    .single();

  if (existing) {
    const { error } = await supabase
      .from('habit_completions')
      .delete()
      .eq('id', existing.id);
    if (error) {
      Logger.error(error, 'Toggle completion error');
      return null;
    }
    return { deleted: true };
  } else {
    const { data, error } = await supabase
      .from('habit_completions')
      .insert([{ habit_id: habitId, date }])
      .select()
      .single();
    if (error) {
      Logger.error(error, 'Toggle completion error');
      return null;
    }
    return data;
  }
}

export async function fetchMatrixTasks(email) {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('matrix_tasks')
    .select('*')
    .eq('user_email', email)
    .order('created_at', { ascending: false });
  if (error) {
    Logger.error(error, 'Fetch matrix tasks error');
    return [];
  }
  return data || [];
}

export async function createMatrixTask(task) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('matrix_tasks')
    .insert([task])
    .select()
    .single();
  if (error) {
    Logger.error(error, 'Create matrix task error');
    return null;
  }
  return data;
}

export async function updateMatrixTask(taskId, updates) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('matrix_tasks')
    .update(updates)
    .eq('id', taskId)
    .select()
    .single();
  if (error) {
    Logger.error(error, 'Update matrix task error');
    return null;
  }
  return data;
}

export async function deleteMatrixTask(taskId) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { error } = await supabase
    .from('matrix_tasks')
    .delete()
    .eq('id', taskId);
  if (error) {
    Logger.error(error, 'Delete matrix task error');
    return null;
  }
  return true;
}
