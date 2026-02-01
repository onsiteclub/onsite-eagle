import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_supabase) {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
      const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

      if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('Supabase credentials not configured');
        return () => Promise.resolve({ data: null, error: new Error('Supabase not configured') });
      }

      _supabase = createClient(supabaseUrl, supabaseAnonKey);
    }
    return (_supabase as any)[prop];
  }
});
