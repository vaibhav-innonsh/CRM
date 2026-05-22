import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create a singleton client. If keys are not configured yet, it will fail gracefully when called, or fallback safely during build.
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

/**
 * Helper to ensure Supabase client is initialized.
 * Throws a clear error if credentials are not filled in yet.
 */
export function getSupabaseClient() {
  if (!supabase) {
    throw new Error('Supabase client is not initialized. Please fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.');
  }
  return supabase;
}
