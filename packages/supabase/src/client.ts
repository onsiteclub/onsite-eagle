import { createBrowserClient } from '@supabase/ssr';

/**
 * Create a Supabase client for browser/client-side usage
 * Uses NEXT_PUBLIC_* env vars
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * Create a Supabase client for Expo/React Native apps
 * Uses EXPO_PUBLIC_* env vars
 */
export function createExpoClient() {
  return createBrowserClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL!,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
  );
}
