import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Fallback: returns true if Supabase is not configured (static mode)
export const isStaticMode = !supabaseUrl || supabaseUrl.includes('your-') || supabaseUrl === '';
