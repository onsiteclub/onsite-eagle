# 04 — Persistence (SQLite)

**Status:** Implementado (v1 + v2 migrations)
**Arquivo:** `src/lib/database.ts` (321 linhas)

---

## Principios

1. **work_sessions e fonte de verdade.** Tudo mais deriva dele.
2. **day_summary e cache.** Sempre reconstruivel via rebuildDaySummary().
3. **active_tracking e estado runtime.** Singleton.
4. **Soft deletes** em tabelas sincronizaveis (deleted_at).
5. **synced_at = NULL** significa "precisa upload."

---

## Database Config

DB_NAME = 'timekeeper_v2.db'. WAL mode. FK ON. 2 migration versions.

---

## Schema Completo (12 tabelas)

### work_sessions

```sql
CREATE TABLE work_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  location_id TEXT,
  location_name TEXT,
  enter_at TEXT NOT NULL,
  exit_at TEXT,                     -- NULL = sessao aberta
  break_seconds INTEGER DEFAULT 0,
  duration_minutes INTEGER,
  source TEXT NOT NULL DEFAULT 'gps',
  confidence REAL DEFAULT 1.0,
  notes TEXT,
  meta TEXT,                        -- JSON: {received_at, delay_ms, pause_start_at}
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  synced_at TEXT,
  deleted_at TEXT
);

-- Indexes
idx_ws_user_date ON (user_id, date(enter_at))
idx_ws_sync ON (synced_at) WHERE synced_at IS NULL
idx_ws_open ON (exit_at) WHERE exit_at IS NULL
idx_ws_location ON (location_id)
idx_ws_single_open ON (user_id) WHERE exit_at IS NULL AND deleted_at IS NULL  -- UNIQUE, migration v2
```

### active_tracking (singleton)

```sql
CREATE TABLE active_tracking (
  id TEXT PRIMARY KEY DEFAULT 'current',
  status TEXT NOT NULL DEFAULT 'IDLE',   -- IDLE | TRACKING | EXIT_PENDING
  session_id TEXT,
  location_id TEXT,
  location_name TEXT,
  enter_at TEXT,
  exit_at TEXT,
  cooldown_expires_at TEXT,
  pause_seconds INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now'))
);
-- Initialized: INSERT OR IGNORE ('current', 'IDLE')
```

### day_summary (cache derivado)

```sql
CREATE TABLE day_summary (
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
  type TEXT DEFAULT 'work',        -- work|rain|snow|sick|dayoff|holiday
  flags TEXT DEFAULT '[]',         -- JSON: DayFlag[]
  source_mix TEXT DEFAULT '{}',    -- JSON: {gps: 0.8, manual: 0.2}
  notes TEXT,
  synced_at TEXT,
  created_at TEXT, updated_at TEXT, deleted_at TEXT,
  UNIQUE(user_id, date)
);
```

### geofence_locations

id, user_id, name, address, latitude, longitude, radius (default 200), color (#FF6B35), is_active, created_at, updated_at, synced_at, deleted_at.

### ai_corrections

id (autoincrement), user_id, session_id, date, field, original_value, corrected_value, reason, source (default 'secretary'), reverted (0/1), created_at, synced_at.

### geofence_events (audit trail)

id (autoincrement), user_id, location_id, event_type, occurred_at, received_at, source, confidence, accuracy, latitude, longitude, created_at, synced_at.

### location_audit (prova GPS)

id, user_id, session_id, event_type, location_id, location_name, latitude, longitude, accuracy, occurred_at, created_at, synced_at.

### error_log

id, user_id, error_type, error_message, error_stack, error_context, app_version, os, device_model, occurred_at, created_at, synced_at.

### analytics_daily

PK(date, user_id). sessions_count, total_minutes, manual_entries, auto_entries, voice_commands, app_opens, geofence_triggers, etc.

**Nota:** Existe no schema mas NAO populada. Zero INSERT/UPDATE no codebase. Removida do sync.

### effects_queue

```sql
CREATE TABLE effects_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  effect_type TEXT NOT NULL,
  payload TEXT,
  status TEXT DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  next_run_at TEXT,               -- Migration v2: backoff
  priority TEXT DEFAULT 'normal', -- Migration v2: critical|normal
  created_at TEXT DEFAULT (datetime('now')),
  executed_at TEXT
);
```

---

## Migration v2 (pos-patch)

1. ALTER effects_queue ADD COLUMN next_run_at TEXT
2. ALTER effects_queue ADD COLUMN priority TEXT DEFAULT 'normal'
3. Rehydrate active_tracking de sessao orfao (ao inves de fechar)
4. Fechar duplicatas (se > 1 sessao aberta)
5. CREATE UNIQUE INDEX idx_ws_single_open

---

## Rebuild day_summary (persistence/daySummary.ts, 120 linhas)

Chamado por: engine, sync engine, usecases.

1. Agregar sessoes fechadas (SUM duration, MIN enter_at, MAX exit_at)
2. Check sessao aberta (hoje)
3. Primary location (mais horas)
4. Source mix (proporcao)
5. Flags: overtime (>600min), no_break (>420min), early_departure (<120min), ai_corrected
6. Upsert ON CONFLICT(user_id, date)

---

## createOpenSession (pos-patch) — persistence/sessions.ts

BEGIN IMMEDIATE -> check existente -> mesmo fence = idempotente (retorna ID) -> outro fence = retorna ID + warning -> nao existe = INSERT. COMMIT.

**Invariante:** Max 1 sessao exit_at IS NULL por user. UNIQUE index + transaction.

---

## Data Retention (persistence/cleanup.ts, 55 linhas)

| Tabela | Retencao |
|--------|----------|
| geofence_events | 30d (synced) |
| ai_corrections | 90d (synced) |
| location_audit | 90d (synced) |
| error_log | 14d (synced) |
| analytics_daily | 30d (synced) |
| effects_queue done | 7d |
| soft-deleted records | 90d |
