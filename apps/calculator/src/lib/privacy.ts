// src/lib/privacy.ts
// Phase 5.2 — client-side helpers for the privacy dashboard.
// Wraps /api/privacy/delete and returns per-table counts of what the user
// currently has on the server (voice_logs, calculations, errors, events).

import { Capacitor } from '@capacitor/core';
import { supabase } from './supabase';
import { getOrCreateDeviceId, rotateDeviceId } from './device';

const API_BASE = (() => {
  if (import.meta.env.VITE_API_URL) {
    // Strip the /interpret path if present — we need the base.
    return String(import.meta.env.VITE_API_URL).replace(/\/interpret\/?$/, '');
  }
  if (Capacitor.isNativePlatform()) return 'https://onsite-calculator.vercel.app/api';
  return '/api';
})();

export interface PrivacyCounts {
  voice_logs: number;
  calculations: number;
  errors: number;
  events: number;
}

export interface DeletionResult {
  deleted: Partial<PrivacyCounts>;
  partialFailure?: boolean;
  errors?: Array<{ table: string; error: string }>;
}

async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};

  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }
  }

  headers['x-device-id'] = await getOrCreateDeviceId();
  return headers;
}

/**
 * Query Supabase directly for per-table counts that describe this user/device's footprint.
 * Best-effort — if Supabase is unavailable, returns zeros so the UI still renders.
 */
export async function fetchPrivacyCounts(): Promise<PrivacyCounts> {
  const zero: PrivacyCounts = { voice_logs: 0, calculations: 0, errors: 0, events: 0 };
  if (!supabase) return zero;

  const deviceId = await getOrCreateDeviceId();
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id ?? null;

  // Build filter: user_id OR device_id depending on auth state.
  const countOne = async (table: string, column: 'user_id' | 'device_id', value: string) => {
    const { count, error } = await supabase!
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq(column, value);
    if (error) return 0;
    return count ?? 0;
  };

  try {
    // Each table is counted twice if both identifiers apply — user data dominates,
    // but device data is still owned by the device. We show the sum.
    const tables: Array<[keyof PrivacyCounts, string]> = [
      ['voice_logs', 'core_voice_logs'],
      ['calculations', 'ccl_calculations'],
      ['errors', 'log_errors'],
      ['events', 'log_events'],
    ];

    const result: PrivacyCounts = { ...zero };
    for (const [key, table] of tables) {
      let total = 0;
      if (userId) total += await countOne(table, 'user_id', userId);
      if (deviceId) total += await countOne(table, 'device_id', deviceId);
      result[key] = total;
    }
    return result;
  } catch {
    return zero;
  }
}

/**
 * Call /api/privacy/delete to wipe server-side data, then rotate the device id
 * so the next request doesn't link back to the now-deleted rows.
 */
export async function deleteAllData(): Promise<DeletionResult> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/privacy/delete`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: '{}',
  });

  const data = await res.json();

  // On success (or partial success), rotate the device id — our old one no longer
  // points at any rows and reusing it indefinitely feels sketchy.
  if (res.ok || res.status === 207) {
    await rotateDeviceId();
  }

  return data as DeletionResult;
}
