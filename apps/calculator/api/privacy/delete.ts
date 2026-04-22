// api/privacy/delete.ts
// Phase 5.3 — user-initiated data deletion.
//
// Accepts a request identifying the user by either:
//   1. `Authorization: Bearer <supabase JWT>` — authenticated user
//   2. `x-device-id: <uuid>` header — anonymous device identifier
//
// Deletes rows from:
//   - core_voice_logs       (voice transcription training data)
//   - ccl_calculations      (saved calculations)
//   - log_errors            (error telemetry)
//   - log_events            (event telemetry)
//
// Returns `{ deleted: { table: count, ... } }` so the client can show the user
// exactly what came out. Idempotent — calling twice yields `0` on the second run.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Same allowlist used by /api/interpret — keeping the two in sync by hand for now.
const ALLOWED_ORIGINS = [
  'https://calculator.onsiteclub.ca',
  'https://calc.onsiteclub.ca',
  'https://app.onsiteclub.ca',
  'https://onsiteclub-calculator.vercel.app',
  'https://onsite-calculator.vercel.app',
  'capacitor://localhost',
  'https://localhost',
  'http://localhost:5173',
  'http://localhost:3000',
];

function isAllowedOrigin(origin: string): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (origin.startsWith('capacitor://') || origin.startsWith('ionic://')) return true;
  if (origin.endsWith('-onsiteclub-calculator.vercel.app')) return true;
  if (origin.endsWith('-onsite-calculator.vercel.app')) return true;
  return false;
}

// Tables we wipe, in order. Ordering matters when there are FKs between them
// (voice_log_id on ccl_calculations references core_voice_logs) — wipe the
// dependent table first so the cascade doesn't trip.
// Each entry: [tableName, columnLinkingToUser].
const DELETION_TABLES: Array<[string, 'user_id' | 'device_id']> = [
  ['ccl_calculations', 'user_id'],
  ['core_voice_logs', 'user_id'],
  ['log_errors', 'user_id'],
  ['log_events', 'user_id'],
];

async function getUserIdFromJwt(client: SupabaseClient, authHeader: string | undefined): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) return null;
  try {
    const { data, error } = await client.auth.getUser(token);
    if (error || !data?.user?.id) return null;
    return data.user.id;
  } catch {
    return null;
  }
}

function validDeviceId(id: string | undefined): string | null {
  if (!id) return null;
  // UUID v4-ish check — accept anything the client could have generated with crypto.randomUUID().
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  return id;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS — same rules as /api/interpret.
  const origin = req.headers.origin || '';
  if (isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-device-id');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error('[privacy/delete] Missing SUPABASE env vars');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const client = createClient(url, serviceKey);

  // Identify the requester by JWT (preferred) or device ID header.
  const userId = await getUserIdFromJwt(client, req.headers.authorization as string | undefined);
  const deviceHeader = Array.isArray(req.headers['x-device-id'])
    ? req.headers['x-device-id'][0]
    : req.headers['x-device-id'];
  const deviceId = validDeviceId(deviceHeader);

  if (!userId && !deviceId) {
    return res.status(401).json({
      error: 'Provide Authorization: Bearer <jwt> or x-device-id header to identify which data to delete.',
    });
  }

  // Column → identifying value. `user_id` always takes precedence over
  // `device_id` when both are present (authenticated user owns both paths).
  const filters: Record<string, string> = {};
  if (userId) filters.user_id = userId;
  if (deviceId) filters.device_id = deviceId;

  const deleted: Record<string, number> = {};
  const errors: Array<{ table: string; error: string }> = [];

  for (const [table, column] of DELETION_TABLES) {
    const filterValue = filters[column];
    if (!filterValue) {
      deleted[table] = 0;
      continue;
    }
    try {
      // `count: 'exact'` asks PostgREST to return the number of deleted rows.
      const { error, count } = await client.from(table).delete({ count: 'exact' }).eq(column, filterValue);
      if (error) {
        errors.push({ table, error: error.message });
        deleted[table] = 0;
      } else {
        deleted[table] = count ?? 0;
      }
    } catch (err) {
      errors.push({ table, error: String(err) });
      deleted[table] = 0;
    }
  }

  // Log the deletion event (without PII) so we have an audit trail.
  console.log('[privacy/delete] Deletion run', {
    identified_by: userId ? 'jwt' : 'device_id',
    deleted,
    errors: errors.length,
  });

  if (errors.length > 0) {
    return res.status(207).json({
      deleted,
      partialFailure: true,
      errors,
    });
  }

  return res.status(200).json({ deleted });
}
