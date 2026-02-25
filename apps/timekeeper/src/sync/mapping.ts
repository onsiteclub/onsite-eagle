/**
 * Sync Field Mapping — Local SQLite ↔ Supabase tmk_* tables.
 *
 * Most tables have 1:1 column names. Only day_summary has a rename
 * (local "date" → remote "work_date") because "date" is a reserved word in Postgres.
 *
 * Spec: 05-SYNC.md "Column Mapping"
 */

/** Table sync configuration. */
export interface TableSyncConfig {
  localTable: string;
  remoteTable: string;
  primaryKey: string;
  /** Direction: 'up' = upload only, 'both' = bidirectional */
  direction: 'up' | 'both';
  /** Column renames: local name → remote name */
  localToRemote?: Record<string, string>;
  /** Column renames: remote name → local name */
  remoteToLocal?: Record<string, string>;
  /** Columns to exclude from upload (local-only) */
  excludeFromUpload?: string[];
  /** Columns to exclude from download (remote-only) */
  excludeFromDownload?: string[];
  /** Whether this table supports soft delete */
  softDelete?: boolean;
}

/**
 * All synced tables configuration.
 * Order matters for upload: sessions before day_summary (FK integrity).
 */
export const SYNC_TABLES: TableSyncConfig[] = [
  {
    localTable: 'work_sessions',
    remoteTable: 'tmk_sessions',
    primaryKey: 'id',
    direction: 'both',
    softDelete: true,
    excludeFromUpload: ['synced_at'],
  },
  {
    localTable: 'day_summary',
    remoteTable: 'tmk_day_summary',
    primaryKey: 'id',
    direction: 'up', // Upload-only: day_summary is derived cache, rebuilt locally from sessions
    softDelete: true,
    localToRemote: { date: 'work_date' },
    excludeFromUpload: ['synced_at'],
  },
  {
    localTable: 'geofence_locations',
    remoteTable: 'tmk_geofences',
    primaryKey: 'id',
    direction: 'both',
    softDelete: true,
    excludeFromUpload: ['synced_at'],
  },
  {
    localTable: 'ai_corrections',
    remoteTable: 'tmk_corrections',
    primaryKey: 'id',
    direction: 'up',
    excludeFromUpload: ['synced_at'],
  },
  {
    localTable: 'geofence_events',
    remoteTable: 'tmk_events',
    primaryKey: 'id',
    direction: 'up',
    excludeFromUpload: ['synced_at'],
  },
  {
    localTable: 'location_audit',
    remoteTable: 'tmk_audit',
    primaryKey: 'id',
    direction: 'up',
    excludeFromUpload: ['synced_at'],
  },
  {
    localTable: 'error_log',
    remoteTable: 'tmk_errors',
    primaryKey: 'id',
    direction: 'up',
    excludeFromUpload: ['synced_at'],
  },
  // analytics_daily: removed from sync — table has no writer yet.
  // Re-add when population code is implemented.
];

/**
 * Map a local row to remote format (rename columns, exclude fields).
 */
export function mapLocalToRemote(
  config: TableSyncConfig,
  row: Record<string, unknown>,
): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};
  const excludes = new Set(config.excludeFromUpload || []);

  for (const [key, value] of Object.entries(row)) {
    if (excludes.has(key)) continue;

    const remoteKey = config.localToRemote?.[key] || key;
    mapped[remoteKey] = value;
  }

  return mapped;
}

/**
 * Map a remote row to local format (rename columns, exclude fields).
 */
export function mapRemoteToLocal(
  config: TableSyncConfig,
  row: Record<string, unknown>,
): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};
  const excludes = new Set(config.excludeFromDownload || []);

  for (const [key, value] of Object.entries(row)) {
    if (excludes.has(key)) continue;

    const localKey = config.remoteToLocal?.[key] || key;
    mapped[localKey] = value;
  }

  return mapped;
}

/**
 * Get the onConflict string for Supabase upsert.
 */
export function getOnConflict(config: TableSyncConfig): string {
  return config.primaryKey;
}
