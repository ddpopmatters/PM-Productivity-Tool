import { getSupabase } from '../api/supabase';
import { Logger } from '../utils/logger';

export async function fetchPersonalTodos(email) {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('personal_todos')
    .select('*')
    .eq('user_email', email)
    .order('created_at', { ascending: false });
  if (error) {
    Logger.error(error, 'Fetch todos error');
    return [];
  }
  return data || [];
}

export async function savePersonalTodo(todo, email) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('personal_todos')
    .insert([{
      text: todo.text,
      completed: todo.completed || false,
      date: todo.date || null,
      user_email: email,
    }])
    .select()
    .single();
  if (error) {
    Logger.error(error, 'Save todo error');
    return null;
  }
  return data;
}

export async function updatePersonalTodo(id, updates) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('personal_todos')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) {
    Logger.error(error, 'Update todo error');
    return null;
  }
  return data;
}

export async function deletePersonalTodo(id) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { error } = await supabase
    .from('personal_todos')
    .delete()
    .eq('id', id);
  if (error) {
    Logger.error(error, 'Delete todo error');
    return null;
  }
  return true;
}
