import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Create a Supabase client for server-side usage (SSR)
 * Handles cookies automatically for auth state
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Handle cookies in server components (read-only)
          }
        },
      },
    }
  );
}

/**
 * Alias for createServerSupabaseClient for compatibility
 * Use this for server-side operations in Server Components or Route Handlers
 */
export const createClient = createServerSupabaseClient;

/**
 * Admin client with service role (bypasses RLS)
 * USE WITH CAUTION - only for admin/server operations
 */
export function createAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return []; },
        setAll() {},
      },
    }
  );
}
