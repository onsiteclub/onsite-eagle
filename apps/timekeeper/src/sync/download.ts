/**
 * Download — Pull updated records from Supabase into local SQLite.
 *
 * Conflict resolution uses SOURCE_PRIORITY:
 *   voice(4) > manual/edited(3) > secretary(2) > gps/sdk(1)
 * Same priority → most recent updated_at wins.
 *
 * Spec: 05-SYNC.md "Download Logic" + "Conflict Resolution"
 */
import { getDb } from '../lib/database';
import { supabase } from '../lib/supabase';
import { getUserId } from '@onsite/auth/core';
import { logger } from '@onsite/logger';
import type { TableSyncConfig } from './mapping';
import { mapRemoteToLocal } from './mapping';

/** Source priority for conflict resolution. Higher number wins. */
const SOURCE_PRIORITY: Record<string, number> = {
  voice: 4,
  manual: 3,
  edited: 3,
  secretary: 2,
  gps: 1,
  sdk: 1,
};

/**
 * Determine if a remote row should overwrite the local row.
 * - Higher source priority always wins
 * - Same priority → most recent updated_at wins
 */
function shouldOverwrite(
  local: Record<string, unknown>,
  remote: Record<string, unknown>,
): boolean {
  const lp = SOURCE_PRIORITY[local.source as string] || 0;
  const rp = SOURCE_PRIORITY[remote.source as string] || 0;

  if (rp > lp) return true;
  if (lp > rp) return false;

  // Same priority: most recent updated_at wins
  const localTime = new Date(local.updated_at as string).getTime();
  const remoteTime = new Date(remote.updated_at as string).getTime();
  return remoteTime > localTime;
}

/**
 * Get the last sync timestamp for a table.
 * Stored in a simple key-value approach in the _migrations table isn't ideal,
 * so we use a separate approach: MAX(synced_at) from the local table.
 */
async function getLastSyncTimestamp(
  config: TableSyncConfig,
): Promise<string | null> {
  const db = getDb();
  const row = await db.getFirstAsync<{ last_sync: string | null }>(
    `SELECT MAX(synced_at) as last_sync FROM ${config.localTable} WHERE synced_at IS NOT NULL`,
  );
  return row?.last_sync ?? null;
}

/**
 * Insert a new row into a local table.
 */
async function insertLocal(
  config: TableSyncConfig,
  mapped: Record<string, unknown>,
): Promise<void> {
  const db = getDb();
  const keys = Object.keys(mapped);
  const placeholders = keys.map(() => '?').join(', ');
  const values = keys.map((k) => mapped[k] as string);

  await db.runAsync(
    `INSERT INTO ${config.localTable} (${keys.join(', ')}, synced_at)
     VALUES (${placeholders}, datetime('now'))`,
    values,
  );
}

/**
 * Update an existing local row.
 */
async function updateLocal(
  config: TableSyncConfig,
  mapped: Record<string, unknown>,
): Promise<void> {
  const db = getDb();
  const pkCol = config.primaryKey.split(',')[0].trim();
  const pkValue = mapped[pkCol] as string;

  const keys = Object.keys(mapped).filter((k) => k !== pkCol);
  const setClause = keys.map((k) => `${k} = ?`).join(', ');
  const values = keys.map((k) => mapped[k] as string);

  await db.runAsync(
    `UPDATE ${config.localTable} SET ${setClause}, synced_at = datetime('now')
     WHERE ${pkCol} = ?`,
    [...values, pkValue],
  );
}

/**
 * Download updated records from Supabase for a bidirectional table.
 * Returns the number of records inserted or updated locally.
 */
export async function downloadTable(config: TableSyncConfig): Promise<number> {
  if (config.direction !== 'both') return 0;

  const userId = await getUserId();
  if (!userId) return 0;

  const lastSync = await getLastSyncTimestamp(config);

  // Fetch updated records from Supabase
  let query = supabase
    .from(config.remoteTable)
    .select('*')
    .eq('user_id', userId);

  if (lastSync) {
    query = query.gt('updated_at', lastSync);
  }

  const { data: rows, error } = await query;
  if (error) {
    logger.warn('SYNC', `Download query failed for ${config.remoteTable}`, {
      error: String(error),
    });
    return 0;
  }
  if (!rows || rows.length === 0) return 0;

  const db = getDb();
  let downloaded = 0;

  for (const remoteRow of rows) {
    try {
      const mapped = mapRemoteToLocal(config, remoteRow as Record<string, unknown>);
      const pkCol = config.primaryKey.split(',')[0].trim();
      const pkValue = mapped[pkCol] as string;

      const localRow = await db.getFirstAsync<Record<string, unknown>>(
        `SELECT * FROM ${config.localTable} WHERE ${pkCol} = ?`,
        [pkValue],
      );

      if (!localRow) {
        // New record from remote → insert
        await insertLocal(config, mapped);
        downloaded++;
      } else if (shouldOverwrite(localRow, mapped)) {
        // Remote wins → update local
        await updateLocal(config, mapped);
        downloaded++;
      }
      // else: local wins → skip (no action)
    } catch (err) {
      logger.warn('SYNC', `Download conflict for ${config.localTable}`, {
        error: String(err),
      });
    }
  }

  if (downloaded > 0) {
    logger.info('SYNC', `Downloaded ${downloaded}/${rows.length} from ${config.remoteTable}`);
  }

  return downloaded;
}
