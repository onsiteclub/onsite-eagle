// src/lib/supabase.ts
// Supabase client for OnSite Calculator (Eagle project)

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] Credentials not found. Auth features disabled.');
}

/**
 * Storage adapter that uses Capacitor Preferences on native
 * and localStorage on web — ensures session survives app restarts.
 */
const storageAdapter = {
  async getItem(key: string): Promise<string | null> {
    if (Capacitor.isNativePlatform()) {
      const { value } = await Preferences.get({ key });
      return value;
    }
    return localStorage.getItem(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await Preferences.set({ key, value });
    } else {
      localStorage.setItem(key, value);
    }
  },
  async removeItem(key: string): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await Preferences.remove({ key });
    } else {
      localStorage.removeItem(key);
    }
  },
};

let supabaseInstance: SupabaseClient | null = null;

try {
  if (supabaseUrl && supabaseAnonKey) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: storageAdapter,
        flowType: 'pkce',
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
} catch (error) {
  console.error('[Supabase] Error creating client:', error);
}

export const supabase = supabaseInstance;

/** Check if Supabase is available */
export const isSupabaseEnabled = (): boolean => !!supabase;
