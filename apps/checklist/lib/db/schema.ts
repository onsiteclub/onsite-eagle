/**
 * SQLite schema for offline-first storage.
 *
 * Column types are chosen for direct SQLite compatibility:
 * - TEXT for ids (UUIDs generated client-side)
 * - INTEGER (unix ms) for timestamps
 * - INTEGER (0/1) for booleans
 *
 * Every user-modifiable row carries `sync_status` so the sync engine
 * can select what to push next:
 *   'pending'  — local change not yet uploaded
 *   'syncing'  — currently being uploaded
 *   'synced'   — remote is up-to-date
 *   'error'    — last attempt failed, see sync_queue.last_error
 */

export const DATABASE_NAME = 'onsite_checklist'
export const DATABASE_VERSION = 1

export const MIGRATIONS: { version: number; statements: string[] }[] = [
  {
    version: 1,
    statements: [
      `CREATE TABLE IF NOT EXISTS gate_checks (
        id TEXT PRIMARY KEY,
        remote_id TEXT,
        lot_id TEXT NOT NULL,
        lot_number TEXT,
        lot_address TEXT,
        jobsite_name TEXT,
        organization_id TEXT,
        transition TEXT NOT NULL,
        checked_by TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'in_progress',
        sync_status TEXT NOT NULL DEFAULT 'pending',
        started_at INTEGER NOT NULL,
        completed_at INTEGER,
        released_at INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );`,

      `CREATE TABLE IF NOT EXISTS gate_check_items (
        id TEXT PRIMARY KEY,
        remote_id TEXT,
        gate_check_id TEXT NOT NULL REFERENCES gate_checks(id) ON DELETE CASCADE,
        item_code TEXT NOT NULL,
        item_label TEXT NOT NULL,
        is_blocking INTEGER NOT NULL DEFAULT 0,
        result TEXT NOT NULL DEFAULT 'pending',
        notes TEXT,
        photo_url TEXT,
        sync_status TEXT NOT NULL DEFAULT 'pending',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );`,

      `CREATE TABLE IF NOT EXISTS photos (
        id TEXT PRIMARY KEY,
        item_id TEXT NOT NULL REFERENCES gate_check_items(id) ON DELETE CASCADE,
        gate_check_id TEXT NOT NULL,
        local_path TEXT NOT NULL,
        remote_url TEXT,
        sync_status TEXT NOT NULL DEFAULT 'pending',
        created_at INTEGER NOT NULL
      );`,

      `CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        priority INTEGER NOT NULL DEFAULT 0,
        attempts INTEGER NOT NULL DEFAULT 0,
        max_attempts INTEGER NOT NULL DEFAULT 5,
        last_error TEXT,
        last_attempt_at INTEGER,
        created_at INTEGER NOT NULL
      );`,

      `CREATE TABLE IF NOT EXISTS templates (
        transition TEXT NOT NULL,
        item_code TEXT NOT NULL,
        item_label TEXT NOT NULL,
        sort_order INTEGER NOT NULL,
        is_blocking INTEGER NOT NULL DEFAULT 0,
        fetched_at INTEGER NOT NULL,
        PRIMARY KEY (transition, item_code)
      );`,

      `CREATE INDEX IF NOT EXISTS idx_gate_check_items_gcid ON gate_check_items(gate_check_id);`,
      `CREATE INDEX IF NOT EXISTS idx_gate_check_items_sync ON gate_check_items(sync_status);`,
      `CREATE INDEX IF NOT EXISTS idx_photos_item ON photos(item_id);`,
      `CREATE INDEX IF NOT EXISTS idx_photos_sync ON photos(sync_status);`,
      `CREATE INDEX IF NOT EXISTS idx_queue_priority ON sync_queue(priority DESC, id ASC);`,
    ],
  },
]

// ---------- Row types ----------

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'error'
export type GateCheckStatus = 'in_progress' | 'passed' | 'failed'
export type GateCheckResult = 'pending' | 'pass' | 'fail' | 'na'
export type SyncEntityType = 'gate_check' | 'gate_check_item' | 'photo' | 'completion'
export type SyncOperation = 'create' | 'update'

export interface GateCheckRow {
  id: string
  remote_id: string | null
  lot_id: string
  lot_number: string | null
  lot_address: string | null
  jobsite_name: string | null
  organization_id: string | null
  transition: string
  checked_by: string
  status: GateCheckStatus
  sync_status: SyncStatus
  started_at: number
  completed_at: number | null
  released_at: number | null
  created_at: number
  updated_at: number
}

export interface GateCheckItemRow {
  id: string
  remote_id: string | null
  gate_check_id: string
  item_code: string
  item_label: string
  is_blocking: 0 | 1
  result: GateCheckResult
  notes: string | null
  photo_url: string | null
  sync_status: SyncStatus
  created_at: number
  updated_at: number
}

export interface PhotoRow {
  id: string
  item_id: string
  gate_check_id: string
  local_path: string
  remote_url: string | null
  sync_status: SyncStatus
  created_at: number
}

export interface SyncQueueRow {
  id: number
  entity_type: SyncEntityType
  entity_id: string
  operation: SyncOperation
  priority: number
  attempts: number
  max_attempts: number
  last_error: string | null
  last_attempt_at: number | null
  created_at: number
}

export interface TemplateRow {
  transition: string
  item_code: string
  item_label: string
  sort_order: number
  is_blocking: 0 | 1
  fetched_at: number
}
