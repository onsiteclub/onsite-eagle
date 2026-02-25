/**
 * Upload — Push unsynced local records to Supabase.
 *
 * RULE: Every table with synced_at MUST actually call .upsert() on Supabase.
 * Zero phantom uploads.
 *
 * Spec: 05-SYNC.md "Upload Logic"
 */
import { getDb } from '../lib/database';
import { supabase } from '../lib/supabase';
import { getUserId } from '@onsite/auth/core';
import { logger } from '@onsite/logger';
import type { TableSyncConfig } from './mapping';
import { mapLocalToRemote, getOnConflict } from './mapping';

/**
 * Upload all unsynced (non-deleted) records for a given table.
 * Returns the number of successfully uploaded records.
 */
export async function uploadTable(config: TableSyncConfig): Promise<number> {
  const db = getDb();
  const userId = await getUserId();
  if (!userId) return 0;

  // 1. Get unsynced records
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM ${config.localTable}
     WHERE synced_at IS NULL AND deleted_at IS NULL AND user_id = ?`,
    [userId],
  );

  if (rows.length === 0) return 0;

  let uploaded = 0;

  for (const row of rows) {
    try {
      // 2. Map columns
      const mapped = mapLocalToRemote(config, row);

      // 3. Upsert to Supabase (REAL upsert)
      const { error } = await supabase
        .from(config.remoteTable)
        .upsert(mapped, { onConflict: getOnConflict(config) });

      if (error) throw error;

      // 4. Mark synced locally
      const pkCol = config.primaryKey.split(',')[0]; // first column of PK
      await db.runAsync(
        `UPDATE ${config.localTable} SET synced_at = datetime('now') WHERE ${pkCol} = ?`,
        [row[pkCol] as string],
      );

      uploaded++;
    } catch (error) {
      // Per-item error: log and continue (don't block other records)
      logger.warn('SYNC', `Upload failed for ${config.localTable}/${row.id}`, {
        error: String(error),
      });
    }
  }

  if (uploaded > 0) {
    logger.info('SYNC', `Uploaded ${uploaded}/${rows.length} to ${config.remoteTable}`);
  }

  return uploaded;
}

/**
 * Upload tombstones (soft-deleted records) to Supabase, then hard-delete locally.
 *
 * Flow:
 * 1. Find records where deleted_at IS NOT NULL AND synced_at IS NOT NULL
 *    (they were synced before being deleted)
 * 2. Update remote with deleted_at
 * 3. Hard-delete locally
 */
export async function uploadTombstones(config: TableSyncConfig): Promise<number> {
  if (!config.softDelete) return 0;

  const db = getDb();
  const userId = await getUserId();
  if (!userId) return 0;

  // Records that were previously synced but now soft-deleted
  const tombstones = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM ${config.localTable}
     WHERE deleted_at IS NOT NULL AND synced_at IS NOT NULL AND user_id = ?`,
    [userId],
  );

  if (tombstones.length === 0) return 0;

  let processed = 0;

  for (const row of tombstones) {
    try {
      // Upload the soft-delete to Supabase
      const mapped = mapLocalToRemote(config, row);
      const { error } = await supabase
        .from(config.remoteTable)
        .upsert(mapped, { onConflict: getOnConflict(config) });

      if (error) throw error;

      // Hard-delete locally (remote now has deleted_at)
      const pkCol = config.primaryKey.split(',')[0];
      await db.runAsync(
        `DELETE FROM ${config.localTable} WHERE ${pkCol} = ?`,
        [row[pkCol] as string],
      );

      processed++;
    } catch (error) {
      logger.warn('SYNC', `Tombstone upload failed for ${config.localTable}/${row.id}`, {
        error: String(error),
      });
    }
  }

  if (processed > 0) {
    logger.info('SYNC', `Processed ${processed} tombstones for ${config.remoteTable}`);
  }

  return processed;
}

/**
 * Upload unsynced records that have no user_id column (composite PK tables like analytics_daily).
 */
export async function uploadTableComposite(config: TableSyncConfig): Promise<number> {
  const db = getDb();
  const userId = await getUserId();
  if (!userId) return 0;

  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM ${config.localTable}
     WHERE synced_at IS NULL AND user_id = ?`,
    [userId],
  );

  if (rows.length === 0) return 0;

  let uploaded = 0;

  for (const row of rows) {
    try {
      const mapped = mapLocalToRemote(config, row);

      const { error } = await supabase
        .from(config.remoteTable)
        .upsert(mapped, { onConflict: getOnConflict(config) });

      if (error) throw error;

      // Mark synced using composite PK
      const pkCols = config.primaryKey.split(',');
      const whereClause = pkCols.map((col) => `${col.trim()} = ?`).join(' AND ');
      const whereValues = pkCols.map((col) => row[col.trim()] as string);

      await db.runAsync(
        `UPDATE ${config.localTable} SET synced_at = datetime('now') WHERE ${whereClause}`,
        whereValues,
      );

      uploaded++;
    } catch (error) {
      logger.warn('SYNC', `Upload failed for ${config.localTable}`, {
        error: String(error),
      });
    }
  }

  if (uploaded > 0) {
    logger.info('SYNC', `Uploaded ${uploaded}/${rows.length} to ${config.remoteTable}`);
  }

  return uploaded;
}
