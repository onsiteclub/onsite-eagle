/**
 * Sync Engine — Orchestrates upload + download + cleanup.
 *
 * Triggers:
 * - App boot (if online)
 * - After confirmExit (via SYNC_NOW effect)
 * - After AI cleanup
 * - Midnight (00:00–00:05)
 * - Manual button
 *
 * Spec: 05-SYNC.md "Sync Flow"
 */
import { logger } from '@onsite/logger';
import { getUserId } from '@onsite/auth/core';
import { supabase } from '../lib/supabase';
import { SYNC_TABLES } from './mapping';
import { uploadTable, uploadTombstones, uploadTableComposite } from './upload';
import { downloadTable } from './download';
import { runCleanup } from '../persistence/cleanup';
import { rebuildDaySummary } from '../persistence/daySummary';
import { getDb } from '../lib/database';

/** Thrown when sync is skipped because device is offline. */
export class OfflineError extends Error {
  constructor() {
    super('Device is offline');
    this.name = 'OfflineError';
  }
}

/** Sync statistics returned after each sync run. */
export interface SyncStats {
  uploaded: Record<string, number>;
  downloaded: Record<string, number>;
  conflicts: number;
  errors: string[];
  duration_ms: number;
  timestamp: string;
}

/** Mutex: prevents concurrent syncs. */
let isSyncing = false;

/**
 * Check if Supabase is reachable (simple connectivity check).
 */
async function isOnline(): Promise<boolean> {
  try {
    const { error } = await supabase.from('tmk_sessions').select('id').limit(0);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Main sync entry point. Orchestrates upload → download → cleanup.
 *
 * Returns null if sync was skipped (already running or offline).
 */
export async function syncNow(): Promise<SyncStats | null> {
  if (isSyncing) {
    logger.debug('SYNC', 'Sync already in progress, skipping');
    return null;
  }

  const online = await isOnline();
  if (!online) {
    logger.debug('SYNC', 'Offline, skipping sync');
    throw new OfflineError();
  }

  isSyncing = true;
  const start = Date.now();
  const stats: SyncStats = {
    uploaded: {},
    downloaded: {},
    conflicts: 0,
    errors: [],
    duration_ms: 0,
    timestamp: new Date().toISOString(),
  };

  try {
    logger.info('SYNC', 'Sync started');

    // ── UPLOAD (order matters: sessions before day_summary for FK integrity) ──
    for (const config of SYNC_TABLES) {
      try {
        const isComposite = config.primaryKey.includes(',');
        const count = isComposite
          ? await uploadTableComposite(config)
          : await uploadTable(config);
        if (count > 0) {
          stats.uploaded[config.localTable] = count;
        }
      } catch (error) {
        stats.errors.push(`Upload ${config.localTable}: ${String(error)}`);
      }
    }

    // ── UPLOAD TOMBSTONES (soft-deleted records) ──
    for (const config of SYNC_TABLES) {
      if (!config.softDelete) continue;
      try {
        await uploadTombstones(config);
      } catch (error) {
        stats.errors.push(`Tombstone ${config.localTable}: ${String(error)}`);
      }
    }

    // ── DOWNLOAD (bidirectional tables only) ──
    for (const config of SYNC_TABLES) {
      if (config.direction !== 'both') continue;
      try {
        const count = await downloadTable(config);
        if (count > 0) {
          stats.downloaded[config.localTable] = count;
        }
      } catch (error) {
        stats.errors.push(`Download ${config.remoteTable}: ${String(error)}`);
      }
    }

    // ── REBUILD day_summary for dates touched by downloaded sessions ──
    if (stats.downloaded['work_sessions'] && stats.downloaded['work_sessions'] > 0) {
      try {
        const userId = await getUserId();
        if (userId) {
          const db = getDb();
          const touchedDates = await db.getAllAsync<{ d: string }>(
            `SELECT DISTINCT date(enter_at) as d FROM work_sessions
             WHERE user_id = ? AND synced_at >= datetime('now', '-5 minutes')`,
            [userId],
          );
          for (const { d } of touchedDates) {
            if (d) await rebuildDaySummary(userId, d);
          }
        }
      } catch (error) {
        stats.errors.push(`Rebuild day_summary: ${String(error)}`);
      }
    }

    // ── CLEANUP ──
    try {
      await runCleanup();
    } catch (error) {
      stats.errors.push(`Cleanup: ${String(error)}`);
    }
  } catch (error) {
    stats.errors.push(String(error));
  } finally {
    isSyncing = false;
    stats.duration_ms = Date.now() - start;
  }

  const totalUp = Object.values(stats.uploaded).reduce((a, b) => a + b, 0);
  const totalDown = Object.values(stats.downloaded).reduce((a, b) => a + b, 0);
  logger.info('SYNC', `Sync complete: ↑${totalUp} ↓${totalDown} in ${stats.duration_ms}ms`, {
    errors: stats.errors.length,
  });

  return stats;
}

/**
 * Check if a sync is currently in progress.
 */
export function isSyncInProgress(): boolean {
  return isSyncing;
}
