import * as SQLite from 'expo-sqlite';
import { logger } from '@onsite/logger';

// ─── Re-export V1 database module ────────────────────────────
// The V1 module (database/index.ts) provides the original SQLite
// database used by stores (recordStore, locationStore, syncStore, etc).
// Re-exporting here ensures that imports from '../lib/database' resolve
// to both V1 and V2 APIs.
export * from './database/index';

const DB_NAME = 'timekeeper_v2.db';

let _db: SQLite.SQLiteDatabase | null = null;

/** Get the V2 database instance. Must call initDatabaseV2() first. */
export function getDb(): SQLite.SQLiteDatabase {
  if (!_db) throw new Error('Database not initialized. Call initDatabaseV2() first.');
  return _db;
}

/** Initialize the V2 database and run migrations. */
export async function initDatabaseV2(): Promise<void> {
  _db = await SQLite.openDatabaseAsync(DB_NAME);

  await _db.execAsync('PRAGMA journal_mode = WAL;');
  await _db.execAsync('PRAGMA foreign_keys = ON;');

  await runMigrations(_db);

  logger.info('DB', 'Database ready', { name: DB_NAME });
}

async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  // Version tracking
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT DEFAULT (datetime('now'))
    );
  `);

  const row = await db.getFirstAsync<{ version: number }>(
    'SELECT MAX(version) as version FROM _migrations'
  );
  const currentVersion = row?.version ?? 0;

  if (currentVersion < 1) {
    await applyV1(db);
    await db.runAsync('INSERT INTO _migrations (version) VALUES (?)', [1]);
    logger.info('DB', 'Migration v1 applied — all tables created');
  }

  if (currentVersion < 2) {
    await applyV2(db);
    await db.runAsync('INSERT INTO _migrations (version) VALUES (?)', [2]);
    logger.info('DB', 'Migration v2 applied — session invariant + effects backoff');
  }
}

async function applyV1(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    -- ─── work_sessions ─────────────────────────────────────
    CREATE TABLE IF NOT EXISTS work_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      location_id TEXT,
      location_name TEXT,
      enter_at TEXT NOT NULL,
      exit_at TEXT,
      break_seconds INTEGER DEFAULT 0,
      duration_minutes INTEGER,
      source TEXT NOT NULL DEFAULT 'gps',
      confidence REAL DEFAULT 1.0,
      notes TEXT,
      meta TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      synced_at TEXT,
      deleted_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_ws_user_date ON work_sessions(user_id, date(enter_at));
    CREATE INDEX IF NOT EXISTS idx_ws_sync ON work_sessions(synced_at) WHERE synced_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_ws_open ON work_sessions(exit_at) WHERE exit_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_ws_location ON work_sessions(location_id);

    -- ─── active_tracking (singleton) ───────────────────────
    CREATE TABLE IF NOT EXISTS active_tracking (
      id TEXT PRIMARY KEY DEFAULT 'current',
      status TEXT NOT NULL DEFAULT 'IDLE',
      session_id TEXT,
      location_id TEXT,
      location_name TEXT,
      enter_at TEXT,
      exit_at TEXT,
      cooldown_expires_at TEXT,
      pause_seconds INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    );
    INSERT OR IGNORE INTO active_tracking (id, status) VALUES ('current', 'IDLE');

    -- ─── day_summary (derived cache) ───────────────────────
    CREATE TABLE IF NOT EXISTS day_summary (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      total_minutes INTEGER DEFAULT 0,
      break_minutes INTEGER DEFAULT 0,
      first_entry TEXT,
      last_exit TEXT,
      sessions_count INTEGER DEFAULT 1,
      primary_location TEXT,
      primary_location_id TEXT,
      type TEXT DEFAULT 'work',
      flags TEXT DEFAULT '[]',
      source_mix TEXT DEFAULT '{}',
      notes TEXT,
      synced_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      deleted_at TEXT,
      UNIQUE(user_id, date)
    );
    CREATE INDEX IF NOT EXISTS idx_ds_user_date ON day_summary(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_ds_sync ON day_summary(synced_at) WHERE synced_at IS NULL;

    -- ─── geofence_locations ────────────────────────────────
    CREATE TABLE IF NOT EXISTS geofence_locations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      address TEXT,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      radius REAL NOT NULL DEFAULT 200,
      color TEXT DEFAULT '#FF6B35',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      synced_at TEXT,
      deleted_at TEXT
    );

    -- ─── ai_corrections ───────────────────────────────────
    CREATE TABLE IF NOT EXISTS ai_corrections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      session_id TEXT,
      date TEXT NOT NULL,
      field TEXT NOT NULL,
      original_value TEXT,
      corrected_value TEXT,
      reason TEXT,
      source TEXT DEFAULT 'secretary',
      reverted INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      synced_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_aic_user_date ON ai_corrections(user_id, date);

    -- ─── geofence_events ──────────────────────────────────
    CREATE TABLE IF NOT EXISTS geofence_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      location_id TEXT NOT NULL,
      event_type TEXT NOT NULL CHECK(event_type IN ('entry','exit')),
      occurred_at TEXT NOT NULL,
      received_at TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'sdk',
      confidence REAL DEFAULT 1.0,
      accuracy REAL,
      latitude REAL,
      longitude REAL,
      created_at TEXT DEFAULT (datetime('now')),
      synced_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_ge_lookup ON geofence_events(user_id, location_id, event_type);

    -- ─── location_audit ───────────────────────────────────
    CREATE TABLE IF NOT EXISTS location_audit (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      session_id TEXT,
      event_type TEXT NOT NULL CHECK(event_type IN ('entry','exit','dispute','correction')),
      location_id TEXT,
      location_name TEXT,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      accuracy REAL,
      occurred_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      synced_at TEXT
    );

    -- ─── error_log ────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS error_log (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      error_type TEXT NOT NULL,
      error_message TEXT NOT NULL,
      error_stack TEXT,
      error_context TEXT,
      app_version TEXT,
      os TEXT,
      device_model TEXT,
      occurred_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      synced_at TEXT
    );

    -- ─── analytics_daily ──────────────────────────────────
    CREATE TABLE IF NOT EXISTS analytics_daily (
      date TEXT NOT NULL,
      user_id TEXT NOT NULL,
      sessions_count INTEGER DEFAULT 0,
      total_minutes INTEGER DEFAULT 0,
      manual_entries INTEGER DEFAULT 0,
      auto_entries INTEGER DEFAULT 0,
      voice_commands INTEGER DEFAULT 0,
      app_opens INTEGER DEFAULT 0,
      geofence_triggers INTEGER DEFAULT 0,
      geofence_accuracy_avg REAL,
      errors_count INTEGER DEFAULT 0,
      sync_attempts INTEGER DEFAULT 0,
      sync_failures INTEGER DEFAULT 0,
      features_used TEXT DEFAULT '[]',
      app_version TEXT,
      os TEXT,
      device_model TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      synced_at TEXT,
      PRIMARY KEY (date, user_id)
    );

    -- ─── effects_queue ────────────────────────────────────
    CREATE TABLE IF NOT EXISTS effects_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      effect_type TEXT NOT NULL,
      payload TEXT,
      status TEXT DEFAULT 'pending',
      retry_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      executed_at TEXT
    );
  `);
}

/**
 * Migration v2:
 * 1. Add next_run_at + priority columns to effects_queue (backoff support).
 * 2. Rehydrate active_tracking from any orphaned open session (crash recovery).
 * 3. Add UNIQUE index to enforce single open session per user.
 */
async function applyV2(db: SQLite.SQLiteDatabase): Promise<void> {
  // 1. Effects queue: add backoff columns
  await db.execAsync(`
    ALTER TABLE effects_queue ADD COLUMN next_run_at TEXT;
    ALTER TABLE effects_queue ADD COLUMN priority TEXT DEFAULT 'normal';
  `);

  // 2. Rehydrate active_tracking from orphaned open session.
  //    If active_tracking is IDLE but an open session exists, restore tracking state.
  //    This fixes crash-between-insert-and-state-update scenarios.
  const active = await db.getFirstAsync<{ status: string; session_id: string | null }>(
    `SELECT status, session_id FROM active_tracking WHERE id = 'current'`,
  );

  if (active && active.status === 'IDLE') {
    const orphan = await db.getFirstAsync<{
      id: string;
      location_id: string | null;
      location_name: string | null;
      enter_at: string;
    }>(
      `SELECT id, location_id, location_name, enter_at FROM work_sessions
       WHERE exit_at IS NULL AND deleted_at IS NULL
       ORDER BY enter_at DESC LIMIT 1`,
    );

    if (orphan) {
      await db.runAsync(
        `UPDATE active_tracking SET
          status = 'TRACKING',
          session_id = ?,
          location_id = ?,
          location_name = ?,
          enter_at = ?,
          exit_at = NULL,
          cooldown_expires_at = NULL,
          updated_at = datetime('now')
        WHERE id = 'current'`,
        [orphan.id, orphan.location_id, orphan.location_name, orphan.enter_at],
      );
      logger.info('DB', 'Migration v2: rehydrated active_tracking from orphan session', {
        sessionId: orphan.id,
      });
    }
  }

  // 3. Enforce: at most 1 open session per user (UNIQUE partial index).
  //    If multiple orphans exist (shouldn't, but defensive), close extras first.
  const orphanCount = await db.getFirstAsync<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM work_sessions WHERE exit_at IS NULL AND deleted_at IS NULL`,
  );

  if (orphanCount && orphanCount.cnt > 1) {
    // Keep the most recent orphan, close the rest with 0 duration
    await db.execAsync(`
      UPDATE work_sessions SET
        exit_at = enter_at,
        duration_minutes = 0,
        updated_at = datetime('now'),
        synced_at = NULL
      WHERE exit_at IS NULL AND deleted_at IS NULL
        AND id != (
          SELECT id FROM work_sessions
          WHERE exit_at IS NULL AND deleted_at IS NULL
          ORDER BY enter_at DESC LIMIT 1
        )
    `);
    logger.warn('DB', 'Migration v2: closed duplicate orphan sessions');
  }

  await db.execAsync(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_ws_single_open
    ON work_sessions(user_id) WHERE exit_at IS NULL AND deleted_at IS NULL;
  `);
}
