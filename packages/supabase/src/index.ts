// Re-export from submodules for direct imports
// Usage: import { createClient } from '@onsite/supabase/client'
// Usage: import { createClient } from '@onsite/supabase/server'

// Main exports (prefer using submodule imports above)
export { createClient as createBrowserClient, createExpoClient } from './client';
export { createServerSupabaseClient, createAdminClient } from './server';
export { updateSession } from './middleware';

// Schema exports - all 38 table interfaces
export * from './schema';
