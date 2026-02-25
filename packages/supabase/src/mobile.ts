/**
 * Supabase client for Expo / React Native apps.
 *
 * Uses @supabase/supabase-js directly (NOT @supabase/ssr which is browser-only).
 * Requires @react-native-async-storage/async-storage in the consuming app.
 *
 * Usage:
 *   import { supabase, asyncStorage } from '@onsite/supabase/mobile';
 *   // or create your own:
 *   import { createMobileClient } from '@onsite/supabase/mobile';
 *   const client = createMobileClient(AsyncStorage);
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Storage adapter interface — compatible with @onsite/auth/core.
 * Matches AsyncStorage's API.
 */
export interface MobileStorageAdapter {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

/**
 * Create a Supabase client configured for React Native.
 *
 * @param storage - AsyncStorage instance (or compatible adapter)
 * @returns Supabase client with session persistence via AsyncStorage
 */
export function createMobileClient(storage: MobileStorageAdapter): SupabaseClient {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      '[Supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Check your .env.local file.'
    );
  }

  return createClient(url, key, {
    auth: {
      storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Wrap an AsyncStorage instance into the adapter shape expected by @onsite/auth/core.
 */
export function createAuthStorage(asyncStorage: MobileStorageAdapter): MobileStorageAdapter {
  return {
    getItem: (key) => asyncStorage.getItem(key),
    setItem: (key, value) => asyncStorage.setItem(key, value),
    removeItem: (key) => asyncStorage.removeItem(key),
  };
}
