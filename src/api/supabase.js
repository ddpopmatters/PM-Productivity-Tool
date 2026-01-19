import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from '../utils/config';
import { Logger } from '../utils/logger';

// Supabase client instance
let supabase = null;

// Initialize Supabase client
export async function initSupabase() {
  if (supabase) return supabase;

  if (!SUPABASE_CONFIG.ENABLED) {
    Logger.debug('Supabase disabled in config');
    return null;
  }

  if (!SUPABASE_CONFIG.SUPABASE_URL || !SUPABASE_CONFIG.SUPABASE_ANON_KEY) {
    Logger.warn('Supabase URL or key not configured');
    return null;
  }

  try {
    supabase = createClient(
      SUPABASE_CONFIG.SUPABASE_URL,
      SUPABASE_CONFIG.SUPABASE_ANON_KEY,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true
        }
      }
    );
    Logger.debug('Supabase client initialized');
    return supabase;
  } catch (error) {
    Logger.error(error, 'Failed to initialize Supabase');
    return null;
  }
}

// Get the current client (must call initSupabase first)
export function getSupabase() {
  return supabase;
}

export default supabase;
