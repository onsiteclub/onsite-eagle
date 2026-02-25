/**
 * Data Retention & Cleanup — Hard-delete old synced data.
 *
 * Runs at midnight sync or on boot if last cleanup > 24h ago.
 *
 * Spec: 04-PERSISTENCE.md "Data Retention & Cleanup"
 */
import { getDb } from '../lib/database';
import { logger } from '@onsite/logger';

/**
 * Run data retention cleanup:
 * - Synced audit data: geofence_events(30d), corrections(90d), audit(90d), errors(14d), analytics(30d)
 * - Completed effects: 7 days
 * - Soft-deleted records: 90 days (hard-delete)
 */
export async function runCleanup(): Promise<void> {
  const db = getDb();

  // Synced audit data — safe to remove since Supabase has a copy
  await db.runAsync(
    `DELETE FROM geofence_events WHERE synced_at IS NOT NULL AND created_at < date('now','-30 days')`,
  );
  await db.runAsync(
    `DELETE FROM ai_corrections WHERE synced_at IS NOT NULL AND created_at < date('now','-90 days')`,
  );
  await db.runAsync(
    `DELETE FROM location_audit WHERE synced_at IS NOT NULL AND created_at < date('now','-90 days')`,
  );
  await db.runAsync(
    `DELETE FROM error_log WHERE synced_at IS NOT NULL AND created_at < date('now','-14 days')`,
  );
  await db.runAsync(
    `DELETE FROM analytics_daily WHERE synced_at IS NOT NULL AND created_at < date('now','-30 days')`,
  );

  // Completed effects queue
  await db.runAsync(
    `DELETE FROM effects_queue WHERE status='done' AND executed_at < date('now','-7 days')`,
  );

  // Hard-delete soft-deleted records older than 90 days
  await db.runAsync(
    `DELETE FROM work_sessions WHERE deleted_at IS NOT NULL AND deleted_at < date('now','-90 days')`,
  );
  await db.runAsync(
    `DELETE FROM day_summary WHERE deleted_at IS NOT NULL AND deleted_at < date('now','-90 days')`,
  );
  await db.runAsync(
    `DELETE FROM geofence_locations WHERE deleted_at IS NOT NULL AND deleted_at < date('now','-90 days')`,
  );

  logger.debug('SYNC', 'Cleanup complete');
}
