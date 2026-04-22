// api/lib/rate-limit.ts
// Phase 5.4 — layered rate limiting.
//
// Primary: Upstash Redis sliding windows — per-device, per-IP, global.
//   * Runs when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN env vars are set.
//   * Fail-closed: if Redis is configured but unreachable, the request is REJECTED
//     rather than silently allowed. A transient Redis outage with fail-open leaks
//     free requests to OpenAI — that's worse than a short availability hiccup.
//
// Fallback: Supabase app_logs COUNT (the old implementation).
//   * Runs only when Upstash env vars are absent — backwards compat while the
//     operator provisions the Redis account.
//   * Fail-open (original behavior) — keeps the dev environment friendly.
//
// Limits (from REFACTOR_AND_MIGRATION_PLAN.md, Phase 5.4):
//   per device: 120 requests / minute (covers an intense carpenter session)
//   per IP:     300 requests / minute (covers one NAT'd construction site)
//   global:     10,000 requests / minute (DDoS guard)

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;    // legacy Supabase fallback
export { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS };

// ---------------------------------------------------------------------------
// Upstash path
// ---------------------------------------------------------------------------

interface UpstashLimiters {
  perDevice: Ratelimit;
  perIp: Ratelimit;
  global: Ratelimit;
}

let upstash: UpstashLimiters | null | undefined;

function getUpstashLimiters(): UpstashLimiters | null {
  if (upstash !== undefined) return upstash;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    upstash = null;
    return null;
  }

  try {
    const redis = new Redis({ url, token });
    upstash = {
      perDevice: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(120, '1 m'),
        prefix: 'calc:rl:device',
        analytics: false,
      }),
      perIp: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(300, '1 m'),
        prefix: 'calc:rl:ip',
        analytics: false,
      }),
      global: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10_000, '1 m'),
        prefix: 'calc:rl:global',
        analytics: false,
      }),
    };
    return upstash;
  } catch (err) {
    console.warn('[RateLimit] Failed to construct Upstash client:', err);
    upstash = null;
    return null;
  }
}

async function checkWithUpstash(limiters: UpstashLimiters, ip: string, deviceId: string | undefined): Promise<boolean> {
  try {
    // Hit global first — single key, cheapest to evaluate.
    const globalRes = await limiters.global.limit('global');
    if (!globalRes.success) return false;

    const ipRes = await limiters.perIp.limit(ip || 'unknown');
    if (!ipRes.success) return false;

    if (deviceId) {
      const deviceRes = await limiters.perDevice.limit(deviceId);
      if (!deviceRes.success) return false;
    }

    return true;
  } catch (err) {
    // Fail-closed — the caller should see a 503/429. Loud log so operators notice.
    console.error('[RateLimit] Upstash unreachable, FAILING CLOSED:', err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Supabase legacy path (fail-open)
// ---------------------------------------------------------------------------

async function checkWithSupabase(ip: string): Promise<boolean> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) return true;

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    const { count, error } = await supabase
      .from('app_logs')
      .select('*', { count: 'exact', head: true })
      .eq('module', 'Voice')
      .eq('action', 'api_request')
      .eq('ip', ip)
      .gte('created_at', windowStart);

    if (error) {
      console.warn('[RateLimit] Query error, allowing request:', error.message);
      return true;
    }

    return (count || 0) < RATE_LIMIT_MAX_REQUESTS;
  } catch (err) {
    console.warn('[RateLimit] Exception, allowing request:', err);
    return true;
  }
}

// ---------------------------------------------------------------------------
// Public surface
// ---------------------------------------------------------------------------

/**
 * Check all rate-limit tiers. Returns true if the request may proceed.
 * Layered: per-device (when available) → per-IP → global.
 */
export async function checkRateLimit(ip: string, deviceId?: string): Promise<boolean> {
  const limiters = getUpstashLimiters();
  if (limiters) return checkWithUpstash(limiters, ip, deviceId);
  return checkWithSupabase(ip);
}
