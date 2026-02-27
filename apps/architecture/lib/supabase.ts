import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Fallback: returns true if Supabase is not configured (static mode)
export const isStaticMode = !supabaseUrl || supabaseUrl.includes('your-') || supabaseUrl === '';

// Only create client when we have valid credentials
export const supabase: SupabaseClient = isStaticMode
  ? (null as unknown as SupabaseClient)
  : createClient(supabaseUrl, supabaseKey);
