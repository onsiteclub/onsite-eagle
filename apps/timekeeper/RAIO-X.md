# RAIO-X DO REWRITE — Estado Atual (Factual)

**Data:** 2026-02-16
**Escopo:** `apps/timekeeper/` + `packages/ai/` + `packages/logger/` + `packages/shared/`
**Metodologia:** Varredura completa do codebase, sem recomendações — apenas fatos.

---

## 1. VISÃO GERAL

### 1.1 Arquitetura em Alto Nível

O Timekeeper v2 é uma reescrita completa do app de rastreamento de horas, organizado em 7 módulos:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    TIMEKEEPER v2 — MÓDULOS                          │
│                                                                     │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────────┐ │
│  │  TRACKING   │  │    SDK     │  │ PERSISTENCE│  │    SYNC      │ │
│  │  ENGINE     │  │ (bgGeo)   │  │  (SQLite)  │  │  (Supabase)  │ │
│  │            │  │            │  │            │  │              │ │
│  │ State mach │  │ Config     │  │ 11 tables  │  │ 8 tables     │ │
│  │ Effects Q  │  │ Headless   │  │ CRUD ops   │  │ Up/Down      │ │
│  │ Watchdog   │  │ Modes      │  │ Cleanup    │  │ Conflict res │ │
│  │ Recovery   │  │ Listeners  │  │ Migrations │  │ Tombstones   │ │
│  │ Guards     │  │            │  │            │  │              │ │
│  └────────────┘  └────────────┘  └────────────┘  └──────────────┘ │
│                                                                     │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────────────────┐ │
│  │    AI      │  │  REPORTS   │  │         UI (Expo Router)     │ │
│  │            │  │            │  │                              │ │
│  │ Secretary  │  │ Aggregate  │  │ 5 tabs + 4 modals + auth    │ │
│  │ Voice      │  │ HTML/PDF   │  │ Zustand store (1)           │ │
│  │ Profile    │  │ WhatsApp   │  │ 11 screens total            │ │
│  │ @onsite/ai │  │ Share      │  │                              │ │
│  └────────────┘  └────────────┘  └──────────────────────────────┘ │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                     MONITORING                                │  │
│  │  Sentry · @onsite/logger · Error Capture · SDK Debug Tools   │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Inventário de Pastas e Arquivos

#### Tracking / Geofencing
| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/tracking/engine.ts` | State machine: IDLE → TRACKING → EXIT_PENDING. Ponto único de decisão. |
| `src/tracking/events.ts` | Normalização de eventos SDK/headless/sintéticos → `TrackingEvent` |
| `src/tracking/effects.ts` | Fila de efeitos (FIFO). `enqueue()` e `drain()`. Nunca executa inline. |
| `src/tracking/watchdog.ts` | Heartbeat (60s). GPS check, cooldown check, session guard. |
| `src/tracking/recovery.ts` | Pós-boot/restart: verifica se está dentro de fence. Injeta ENTER sintético. |
| `src/tracking/sessionGuard.ts` | Limite de sessão: 10h warning, 16h auto-end. |
| `src/tracking/index.ts` | Barrel exports |

#### SDK Integration
| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/sdk/bgGeo.ts` | Config do SDK Transistorsoft. Listeners. `configureAndStart()`. |
| `src/sdk/headless.ts` | Android headless task (app morto). Registra no module scope. |
| `src/sdk/modes.ts` | GPS mode switching: active (10m) vs idle (200m). |
| `src/sdk/index.ts` | Barrel exports |

#### Persistence (SQLite)
| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/lib/database.ts` | Init DB, PRAGMAs (WAL, FK), migrations, criação de 11 tabelas. |
| `src/persistence/sessions.ts` | CRUD `work_sessions`. |
| `src/persistence/activeTracking.ts` | Singleton `active_tracking` (status, session_id, etc). |
| `src/persistence/daySummary.ts` | Rebuild `day_summary` a partir de `work_sessions`. |
| `src/persistence/geofences.ts` | Read `geofence_locations`. |
| `src/persistence/geofenceEvents.ts` | Write `geofence_events` e `location_audit`. |
| `src/persistence/cleanup.ts` | Hard-delete dados synced com idade expirada. |
| `src/persistence/index.ts` | Barrel exports |

#### Sync (Supabase)
| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/sync/syncEngine.ts` | Orquestração: upload → tombstones → download → cleanup. Mutex. |
| `src/sync/upload.ts` | Upload por tabela. Mark `synced_at`. Tombstones. Composite PK. |
| `src/sync/download.ts` | Download bidirectional. Conflict resolution via SOURCE_PRIORITY. |
| `src/sync/mapping.ts` | Mapeamento local↔remoto. Column renames. Config por tabela. |
| `src/sync/index.ts` | Barrel exports |
| `src/lib/supabase.ts` | Supabase client (AsyncStorage, autoRefreshToken). |

#### AI / Voice / Secretary
| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/ai/secretary.ts` | `cleanupDay(date)` — limpeza AI diária pós-confirmExit. |
| `src/ai/voice.ts` | Pipeline: transcribe → processCommand → executeAction. 13 actions. |
| `src/ai/profile.ts` | `buildWorkerProfile()` — 30 dias de estatísticas. |
| `src/ai/index.ts` | Barrel exports |
| `packages/ai/src/core.ts` | `callAI()` — wrapper para Edge Function `ai-gateway`. |
| `packages/ai/src/whisper.ts` | `transcribeAudio()` — wrapper para Edge Function `ai-whisper`. |
| `packages/ai/src/specialists/timekeeper.ts` | Prompts: SECRETARY_PROMPT + VOICE_PROMPT. |
| `packages/ai/src/types.ts` | AIRequest, AIResponse, WhisperResult, WorkerProfile. |

#### Reporting
| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/reporting/renderHtml.ts` | Template HTML inline (~279 linhas TS → ~687 linhas HTML). |
| `src/reporting/share.ts` | `sharePdf()` (expo-print → expo-sharing), `shareText()`. |
| `src/reporting/whatsapp.ts` | `formatWhatsApp()` (emojis), `formatPlainText()` (ASCII). |
| `src/usecases/generateReport.ts` | Orquestra: aggregate → AI summary → render → share. |

#### Monitoring
| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/monitoring/sentry.ts` | `initSentry()`, breadcrumbs via logger sink, user context. |
| `src/monitoring/errorCapture.ts` | `captureError()` — SQLite + Sentry + logger (3-way). |
| `src/monitoring/sdkDebug.ts` | `verifySdkState()`, `emailSdkLog()`, `toggleDebugSounds()`. |
| `packages/logger/src/index.ts` | Ring buffer (200), sinks, redação de dados sensíveis. |

#### UI (Screens + Stores)
| Arquivo | Tipo | Responsabilidade |
|---------|------|-----------------|
| `app/_layout.tsx` | Root | Bootstrap, auth routing, Stack + modals |
| `app/(auth)/login.tsx` | Auth | Login com email/password |
| `app/(tabs)/_layout.tsx` | Layout | Tab bar com Ionicons |
| `app/(tabs)/index.tsx` | Tab | Home: timer ao vivo, sessões do dia, pause/resume |
| `app/(tabs)/reports.tsx` | Tab | Calendário, stats mensais, breakdown semanal, export |
| `app/(tabs)/map.tsx` | Tab | Lista de geofences, add/delete |
| `app/(tabs)/team.tsx` | Tab | QR share/scan, access_grants |
| `app/(tabs)/settings.tsx` | Tab | Profile, SDK health, debug tools, logs, sign out |
| `app/manual-entry.tsx` | Modal | Entrada manual com date/time/break/location/notes |
| `app/day-detail.tsx` | Modal | Sessões do dia, AI corrections, day type, undo |
| `app/voice.tsx` | Modal | Chat com AI, quick commands, mic (placeholder) |
| `app/add-location.tsx` | Modal | Criar geofence com coords/radius/cor |
| `src/stores/trackingStore.ts` | Store | Zustand: status, sessions, timer data |

---

## 2. DATA MODEL — SQLite (Schema Atual)

### 2.1 Inventário Completo de Tabelas

#### Tabela 1: `work_sessions` — SOURCE OF TRUTH

| Coluna | Tipo | Constraints | Propósito |
|--------|------|-------------|-----------|
| `id` | TEXT | PK | UUID |
| `user_id` | TEXT | NOT NULL | Worker |
| `location_id` | TEXT | | FK implícito → geofence_locations.id |
| `location_name` | TEXT | | Cache do nome da fence |
| `enter_at` | TEXT | NOT NULL | ISO timestamp de entrada |
| `exit_at` | TEXT | | ISO timestamp de saída (NULL = sessão aberta) |
| `break_seconds` | INTEGER | DEFAULT 0 | Tempo de pausa acumulado |
| `duration_minutes` | INTEGER | | Calculado: (exit - enter - break) / 60 |
| `source` | TEXT | NOT NULL, DEFAULT 'gps' | 'gps'/'manual'/'voice'/'secretary'/'edited' |
| `confidence` | REAL | DEFAULT 1.0 | Score GPS (0.0–1.0) |
| `notes` | TEXT | | Notas do usuário |
| `meta` | TEXT | | JSON: {received_at, delay_ms, pause_start_at} |
| `created_at` | TEXT | DEFAULT now() | |
| `updated_at` | TEXT | DEFAULT now() | |
| `synced_at` | TEXT | | NULL = pendente upload |
| `deleted_at` | TEXT | | Soft delete |

**Índices:** `idx_ws_user_date(user_id, date(enter_at))`, `idx_ws_sync(synced_at) WHERE synced_at IS NULL`, `idx_ws_open(exit_at) WHERE exit_at IS NULL`, `idx_ws_location(location_id)`

---

#### Tabela 2: `geofence_locations` — SOURCE OF TRUTH

| Coluna | Tipo | Constraints | Propósito |
|--------|------|-------------|-----------|
| `id` | TEXT | PK | UUID |
| `user_id` | TEXT | NOT NULL | Owner |
| `name` | TEXT | NOT NULL | Nome visível |
| `address` | TEXT | | Endereço |
| `latitude` | REAL | NOT NULL | |
| `longitude` | REAL | NOT NULL | |
| `radius` | REAL | NOT NULL, DEFAULT 200 | Mínimo 150m |
| `color` | TEXT | DEFAULT '#FF6B35' | |
| `is_active` | INTEGER | DEFAULT 1 | |
| `created_at` | TEXT | DEFAULT now() | |
| `updated_at` | TEXT | DEFAULT now() | |
| `synced_at` | TEXT | | |
| `deleted_at` | TEXT | | Soft delete |

---

#### Tabela 3: `ai_corrections` — SOURCE OF TRUTH (Audit)

| Coluna | Tipo | Constraints | Propósito |
|--------|------|-------------|-----------|
| `id` | INTEGER | PK AUTOINCREMENT | |
| `user_id` | TEXT | NOT NULL | |
| `session_id` | TEXT | | FK implícito → work_sessions.id |
| `date` | TEXT | NOT NULL | YYYY-MM-DD |
| `field` | TEXT | NOT NULL | 'exit_at', 'break_seconds', etc. |
| `original_value` | TEXT | | Valor original |
| `corrected_value` | TEXT | | Valor após correção |
| `reason` | TEXT | | Razão da correção |
| `source` | TEXT | DEFAULT 'secretary' | |
| `reverted` | INTEGER | DEFAULT 0 | 1 = desfeito pelo usuário |
| `created_at` | TEXT | DEFAULT now() | |
| `synced_at` | TEXT | | |

---

#### Tabela 4: `day_summary` — DERIVED/CACHE

| Coluna | Tipo | Constraints | Propósito |
|--------|------|-------------|-----------|
| `id` | TEXT | PK | UUID |
| `user_id` | TEXT | NOT NULL | |
| `date` | TEXT | NOT NULL | YYYY-MM-DD |
| `total_minutes` | INTEGER | DEFAULT 0 | Soma das durações |
| `break_minutes` | INTEGER | DEFAULT 0 | Soma dos breaks / 60 |
| `first_entry` | TEXT | | HH:MM |
| `last_exit` | TEXT | | HH:MM |
| `sessions_count` | INTEGER | DEFAULT 1 | |
| `primary_location` | TEXT | | Nome da fence com mais horas |
| `primary_location_id` | TEXT | | |
| `type` | TEXT | DEFAULT 'work' | DayType enum |
| `flags` | TEXT | DEFAULT '[]' | JSON: ['overtime','no_break',...] |
| `source_mix` | TEXT | DEFAULT '{}' | JSON: {gps: 0.67, manual: 0.33} |
| `notes` | TEXT | | |
| `synced_at` | TEXT | | |
| `created_at` | TEXT | DEFAULT now() | |
| `updated_at` | TEXT | DEFAULT now() | |
| `deleted_at` | TEXT | | Soft delete |

**Constraint:** `UNIQUE(user_id, date)`
**Sempre reconstruível** via `rebuildDaySummary()` a partir de `work_sessions`.

---

#### Tabela 5: `geofence_events` — AUDIT/LOG

| Coluna | Tipo | Constraints |
|--------|------|-------------|
| `id` | INTEGER | PK AUTOINCREMENT |
| `user_id` | TEXT | NOT NULL |
| `location_id` | TEXT | NOT NULL |
| `event_type` | TEXT | NOT NULL CHECK('entry','exit') |
| `occurred_at` | TEXT | NOT NULL |
| `received_at` | TEXT | NOT NULL |
| `source` | TEXT | NOT NULL, DEFAULT 'sdk' |
| `confidence` | REAL | DEFAULT 1.0 |
| `accuracy` | REAL | |
| `latitude` | REAL | |
| `longitude` | REAL | |
| `created_at` | TEXT | DEFAULT now() |
| `synced_at` | TEXT | |

**Índice:** `idx_ge_lookup(user_id, location_id, event_type)`

---

#### Tabela 6: `location_audit` — AUDIT/LOG

| Coluna | Tipo | Constraints |
|--------|------|-------------|
| `id` | TEXT | PK (UUID) |
| `user_id` | TEXT | NOT NULL |
| `session_id` | TEXT | |
| `event_type` | TEXT | NOT NULL CHECK('entry','exit','dispute','correction') |
| `location_id` | TEXT | |
| `location_name` | TEXT | |
| `latitude` | REAL | NOT NULL |
| `longitude` | REAL | NOT NULL |
| `accuracy` | REAL | |
| `occurred_at` | TEXT | NOT NULL |
| `created_at` | TEXT | DEFAULT now() |
| `synced_at` | TEXT | |

---

#### Tabela 7: `error_log` — AUDIT/LOG

| Coluna | Tipo | Constraints |
|--------|------|-------------|
| `id` | TEXT | PK (UUID) |
| `user_id` | TEXT | |
| `error_type` | TEXT | NOT NULL |
| `error_message` | TEXT | NOT NULL |
| `error_stack` | TEXT | |
| `error_context` | TEXT | JSON |
| `app_version` | TEXT | |
| `os` | TEXT | |
| `device_model` | TEXT | |
| `occurred_at` | TEXT | NOT NULL |
| `created_at` | TEXT | DEFAULT now() |
| `synced_at` | TEXT | |

---

#### Tabela 8: `analytics_daily` — TELEMETRIA

| Coluna | Tipo | Constraints |
|--------|------|-------------|
| `date` | TEXT | NOT NULL (PK composta) |
| `user_id` | TEXT | NOT NULL (PK composta) |
| `sessions_count` | INTEGER | DEFAULT 0 |
| `total_minutes` | INTEGER | DEFAULT 0 |
| `manual_entries` | INTEGER | DEFAULT 0 |
| `auto_entries` | INTEGER | DEFAULT 0 |
| `voice_commands` | INTEGER | DEFAULT 0 |
| `app_opens` | INTEGER | DEFAULT 0 |
| `geofence_triggers` | INTEGER | DEFAULT 0 |
| `geofence_accuracy_avg` | REAL | |
| `errors_count` | INTEGER | DEFAULT 0 |
| `sync_attempts` | INTEGER | DEFAULT 0 |
| `sync_failures` | INTEGER | DEFAULT 0 |
| `features_used` | TEXT | DEFAULT '[]' (JSON) |
| `app_version` | TEXT | |
| `os` | TEXT | |
| `device_model` | TEXT | |
| `created_at` | TEXT | DEFAULT now() |
| `synced_at` | TEXT | |

**PK:** `(date, user_id)` — composite

---

#### Tabela 9: `active_tracking` — SINGLETON/CONFIG

| Coluna | Tipo | Default |
|--------|------|---------|
| `id` | TEXT | PK, sempre 'current' |
| `status` | TEXT | 'IDLE' |
| `session_id` | TEXT | NULL |
| `location_id` | TEXT | NULL |
| `location_name` | TEXT | NULL |
| `enter_at` | TEXT | NULL |
| `exit_at` | TEXT | NULL |
| `cooldown_expires_at` | TEXT | NULL |
| `pause_seconds` | INTEGER | 0 |
| `updated_at` | TEXT | now() |

Nunca sincronizada. Local-only.

---

#### Tabela 10: `effects_queue` — QUEUE

| Coluna | Tipo | Default |
|--------|------|---------|
| `id` | INTEGER | PK AUTOINCREMENT |
| `effect_type` | TEXT | NOT NULL |
| `payload` | TEXT | JSON |
| `status` | TEXT | 'pending' |
| `retry_count` | INTEGER | 0 |
| `created_at` | TEXT | now() |
| `executed_at` | TEXT | NULL |

Nunca sincronizada. Local-only. Max 3 retries → 'failed'.

---

#### Tabela 11: `_migrations` — SINGLETON/CONFIG

| Coluna | Tipo |
|--------|------|
| `version` | INTEGER PK |
| `applied_at` | TEXT |

Versão atual: 1.

---

### 2.2 Quem Escreve e Quem Lê Cada Tabela

| Tabela | Writes | Reads |
|--------|--------|-------|
| `work_sessions` | engine.ts (create/close), createManualSession, editSession, deleteSession (soft), pauseResume, undoAICorrection | trackingStore, daySummary.ts, reports.tsx, day-detail.tsx, profile.ts, generateReport |
| `geofence_locations` | manageFence.ts (CRUD) | recovery.ts, watchdog.ts, geofences.ts, map.tsx, manual-entry.tsx, voice.ts |
| `ai_corrections` | secretary.ts (via editSession), undoAICorrection (mark reverted) | day-detail.tsx |
| `day_summary` | daySummary.ts (rebuild), markAbsence | reports.tsx, generateReport, voice.ts (context) |
| `geofence_events` | geofenceEvents.ts (logGeofenceEvent) | (audit only, nenhuma query de leitura no app) |
| `location_audit` | geofenceEvents.ts (logLocationAudit) | (audit only) |
| `error_log` | errorCapture.ts | (audit only) |
| `analytics_daily` | **Aparentemente incompleto** — schema existe mas não encontrei código que popula | (upload only via sync) |
| `active_tracking` | engine.ts, pauseResume.ts, clearActiveTracking | engine.ts, trackingStore, recovery.ts, sessionGuard.ts, watchdog.ts |
| `effects_queue` | enqueue() | drain() |
| `_migrations` | database.ts (runMigrations) | database.ts (version check) |

### 2.3 Soft Delete

**Tabelas com `deleted_at`:** work_sessions, day_summary, geofence_locations

**Mecanismo:**
1. Soft-delete: `UPDATE SET deleted_at=datetime('now'), synced_at=NULL`
2. Queries filtram: `WHERE deleted_at IS NULL`
3. Upload: próximo sync envia com `deleted_at` (tombstone) → Supabase recebe
4. Tombstone cleanup: hard-delete local após synced + 90 dias
5. `ai_corrections` usa `reverted=1` ao invés de soft delete

---

## 3. DATA MODEL — Supabase (Mapeamento)

### 3.1 Tabelas Remotas

| Local | Remoto | Direção | Soft Delete |
|-------|--------|---------|-------------|
| `work_sessions` | `tmk_sessions` | Bidirecional | Sim |
| `day_summary` | `tmk_day_summary` | Bidirecional | Sim |
| `geofence_locations` | `tmk_geofences` | Bidirecional | Sim |
| `ai_corrections` | `tmk_corrections` | Upload only | Não |
| `geofence_events` | `tmk_events` | Upload only | Não |
| `location_audit` | `tmk_audit` | Upload only | Não |
| `error_log` | `tmk_errors` | Upload only | Não |
| `analytics_daily` | `tmk_analytics` | Upload only | Não |

### 3.2 Column Remapping

Apenas `day_summary` tem rename: `date` → `work_date` (reserved word em PostgreSQL).

Todas as tabelas excluem `synced_at` do upload (campo local-only).

### 3.3 Conflict Resolution (Download)

```
SOURCE_PRIORITY: voice(4) > manual/edited(3) > secretary(2) > gps/sdk(1)

Se remote.source priority > local.source priority → remote vence
Se mesmo priority → updated_at mais recente vence
Caso contrário → local vence (nenhuma ação)
```

### 3.4 RLS

Todas as queries Supabase filtram `user_id = ?` via parâmetro.
JWT de auth é enviado automaticamente pelo Supabase client.
Server-side RLS assume: `user_id = auth.uid()` em todas as tabelas `tmk_*`.

---

## 4. NORMALIZAÇÃO DE EVENTOS

### 4.1 Tipo Único: `TrackingEvent`

```typescript
interface TrackingEvent {
  type: 'enter' | 'exit';
  fenceId: string;
  occurredAt: string;     // Timestamp do OS (do SDK) — NUNCA substituído
  receivedAt: string;     // Quando o app recebeu
  source: TrackingSource; // 'sdk'|'headless'|'watchdog'|'gps_check'|'manual'|'voice'
  confidence: number;     // 0.0–1.0 (SDK=1.0, sintético=0.5–0.7)
  location?: { latitude: number; longitude: number; accuracy: number };
  delayMs: number;        // receivedAt - occurredAt
}
```

### 4.2 Event Sources

| Source | Origem | Normalizer | Confidence |
|--------|--------|------------|------------|
| `sdk` | SDK nativo (foreground) | `normalizeSdkEvent()` | 1.0 |
| `headless` | SDK nativo (app morto, Android) | `normalizeHeadlessEvent()` | 1.0 |
| `watchdog` | Heartbeat GPS check (2x fora = EXIT sintético) | `makeSyntheticEvent()` | 0.7 |
| `gps_check` | Recovery pós-boot (se dentro de fence e IDLE) | `makeSyntheticEvent()` | 0.5 |
| `manual` | Entrada manual do usuário | `makeSyntheticEvent()` | 1.0 |
| `voice` | Comando de voz | `makeSyntheticEvent()` | 1.0 |

### 4.3 Timestamps

- **`occurredAt`:** Timestamp do SDK/OS — preservado fielmente, NUNCA substituído por `Date.now()`
- **`receivedAt`:** `new Date().toISOString()` no momento que o app recebe
- **`delayMs`:** Calculado: `receivedAt - occurredAt` (em milissegundos)
- **Sintéticos:** `occurredAt = receivedAt = Date.now()` (sem delay)
- **Impacto:** `enter_at` na sessão usa sempre `event.occurredAt` (tempo real do evento)

---

## 5. FLUXOS END-TO-END

### 5.1 Boot / App Launch

```
1. initSentry()                                    → sentry.ts
2. import '../src/sdk/headless' (side-effect)      → headless.ts (registra task Android)
3. initAuthCore(asyncStorage, supabase)            → @onsite/auth/core
4. await initDatabase()                            → database.ts (PRAGMA WAL, FK, migrations)
5. getUserId() → setIsAuthenticated()              → auth routing
6. onAuthStateChange() → listener                  → auth updates
7. if (native && userId):
   a. await configureAndStart()                    → bgGeo.ts → SDK ready + listeners
   b. verifySdkState().catch(() => {})             → sdkDebug.ts (non-blocking)
   c. getActiveFences(userId) → syncGeofencesToSdk → bgGeo.ts (clear + re-add)
   d. await checkExpiredCooldown()                 → engine.ts (pode confirmar exit pendente)
   e. await drain()                                → effects.ts (executa efeitos pendentes)
8. AppState→'active': checkExpiredCooldown() + drain()
```

### 5.2 Enter (Evento Real do SDK)

```
SDK nativo detecta entrada em geofence
  ↓
onGeofence callback (bgGeo.ts)
  ↓
normalizeSdkEvent(event) → TrackingEvent {type:'enter', source:'sdk', confidence:1.0}
  ↓
handleEvent(event) — engine.ts
  ├─ checkExpiredCooldown() (primeiro, sempre)
  ├─ logGeofenceEvent(event) → INSERT geofence_events
  ├─ handleIdle(state, event):
  │   ├─ getFenceById(fenceId) → busca nome
  │   ├─ createOpenSession(event) → INSERT work_sessions (exit_at=NULL)
  │   ├─ setActiveTracking('TRACKING', sessionId, event)
  │   ├─ setActiveTrackingLocationName(fence.name)
  │   ├─ logLocationAudit(event, sessionId, fence.name) → INSERT location_audit
  │   └─ enqueue: SWITCH_GPS_MODE('active'), REBUILD_DAY_SUMMARY, NOTIFY_ARRIVAL,
  │              START_SESSION_GUARD, UI_REFRESH
  └─ drain() → executa efeitos enfileirados
```

### 5.3 Exit (Evento Real do SDK)

```
SDK nativo detecta saída de geofence
  ↓
normalizeSdkEvent(event) → TrackingEvent {type:'exit'}
  ↓
handleEvent(event) — engine.ts
  ├─ handleTracking(state, event):
  │   ├─ Verifica: EXIT é da mesma fence? → Sim
  │   ├─ setActiveTracking('EXIT_PENDING', sessionId, null, {
  │   │     exit_at: event.occurredAt,
  │   │     cooldown_expires_at: now + 30s
  │   │   })
  │   └─ logLocationAudit(event, sessionId, name)
  │
  ├─ (NÃO fecha sessão ainda — espera cooldown de 30s)
  │
  ... 30 segundos passam (heartbeat ou AppState check) ...
  │
  ├─ checkExpiredCooldown():
  │   ├─ cooldown_expires_at ≤ now? → Sim
  │   └─ confirmExit(state, exit_at):
  │       ├─ calculateDuration(enter_at, exit_at, pause_seconds)
  │       ├─ closeSession(sessionId, exit_at, pauseSeconds, durationMinutes)
  │       ├─ clearActiveTracking() → IDLE
  │       └─ enqueue: SWITCH_GPS_MODE('idle'), CANCEL_SESSION_GUARD,
  │                  REBUILD_DAY_SUMMARY, NOTIFY_DEPARTURE,
  │                  SYNC_NOW, AI_CLEANUP, UI_REFRESH
  │
  └─ drain() → SYNC_NOW → syncNow() → upload/download
                AI_CLEANUP → cleanupDay(date) → Secretary AI
```

### 5.4 Re-entry Durante Cooldown

```
Worker sai e volta em <30s (falso exit)
  ↓
handleExitPending(state, event): event.type='enter', same fence
  ├─ setActiveTracking('TRACKING', sessionId) — volta a tracking
  ├─ Limpa exit_at e cooldown_expires_at
  ├─ Preserva location_name
  └─ enqueue: UI_REFRESH
```

### 5.5 Watchdog / Recovery

```
Heartbeat (60s, onHeartbeat — watchdog.ts):
  1. checkExpiredCooldown() → pode confirmar exit pendente
  2. drain() → executa efeitos
  3. checkSessionGuard() → 10h warning, 16h auto-end
  4. Se TRACKING:
     a. getCurrentPosition() via SDK
     b. Haversine distance → fence center
     c. Se distance > radius: outsideCount++
     d. Se outsideCount >= 2: makeSyntheticEvent('exit', 'watchdog', 0.7) → handleEvent()
     e. Se distance <= radius: outsideCount = 0

Recovery pós-boot (checkRecovery — recovery.ts):
  1. Se NÃO IDLE → skip (já tracking)
  2. getCurrentPosition()
  3. Para cada fence: calcular distância
  4. Se dentro de fence: makeSyntheticEvent('enter', 'gps_check', 0.5) → handleEvent()
  5. NUNCA injeta EXIT no boot (GPS pode ser impreciso)

Recovery pós-fence-change (checkAfterFenceChange — recovery.ts):
  1. Espera 5s para GPS fresco
  2. Se dentro + IDLE → injeta ENTER sintético
  3. Se fora + TRACKING esta fence + accuracy < 50m → injeta EXIT sintético
```

### 5.6 Headless (App Morto — Android)

```
SDK dispara evento com app morto
  ↓
BackgroundGeolocation.registerHeadlessTask() — module scope em headless.ts
  ↓
ensureInitialized():
  ├─ Lazy-init: import e call initDatabase() (SQLite)
  └─ @onsite/auth/core → getUserId() via AsyncStorage (sem Zustand)
  ↓
Se geofence event:
  normalizeHeadlessEvent(params) → TrackingEvent {source:'headless'}
  handleEvent(event) → mesma state machine do foreground
  ↓
Se heartbeat:
  checkExpiredCooldown() + drain()
  ↓
~30s JS lifespan → processo encerra

Constraints:
- Zustand stores vazios (re-inicializados a cada evento)
- Errors → console only (não pode mostrar UI)
- Auth via AsyncStorage direto (não Supabase session)
```

### 5.7 Manual Edit Flow

```
Manual Entry (manual-entry.tsx):
  createManualSession({date, enterTime, exitTime, breakMinutes, locationId?, locationName?, source:'manual', notes?})
  ├─ INSERT work_sessions (sessão já completa com exit_at)
  ├─ calculateDuration()
  ├─ rebuildDaySummary()
  └─ enqueue: SYNC_NOW, UI_REFRESH

Edit Session (editSession — via voice.ts):
  editSession({sessionId, changes: {enter_at?, exit_at?, break_seconds?, notes?}, source})
  ├─ Se source='secretary': salva em ai_corrections (original_value, corrected_value, reason)
  ├─ UPDATE work_sessions SET campos, synced_at=NULL
  ├─ Respeita SOURCE_PRIORITY: secretary NÃO sobrescreve voice/manual
  ├─ rebuildDaySummary()
  └─ enqueue: SYNC_NOW, UI_REFRESH

Delete Session (day-detail.tsx):
  deleteSession(sessionId)
  ├─ UPDATE SET deleted_at, synced_at=NULL (soft delete)
  ├─ rebuildDaySummary()
  └─ enqueue: SYNC_NOW, UI_REFRESH

Mark Absence (day-detail.tsx):
  markAbsence({date, type, notes?})
  ├─ Soft-delete sessões do dia
  ├─ UPDATE/INSERT day_summary SET type='rain'/'snow'/etc, total_minutes=0
  └─ enqueue: SYNC_NOW, UI_REFRESH
```

### 5.8 Voice Flow

```
voice.tsx: handleTextCommand(text) ou transcribeVoice(base64Audio)
  ↓
processVoiceCommand(transcript, {isTracking, currentLocation, enterAt})
  ├─ buildWorkerProfile(userId) → 30 dias de stats
  ├─ buildVoiceContext() → recent_days (7d), locations, date_reference
  ├─ callAI({specialist:'timekeeper:voice', context})
  │   → invoca Edge Function 'ai-gateway' → GPT-4o
  └─ Retorna AIResponse {action, data, response_text}
  ↓
executeVoiceAction(response)
  ├─ switch action:
  │   'update_record' → editSession({source:'voice'})
  │   'delete_record' → deleteSession()
  │   'start'         → createManualSession()
  │   'stop'          → handleEvent({type:'exit'}) — synthetic
  │   'pause'         → pauseSession()
  │   'resume'        → resumeSession()
  │   'query'         → read-only (resposta no response_text)
  │   'send_report'   → generateReport()
  │   'create_location' → createFence()
  │   'delete_location' → deleteFence()
  │   'mark_day_type' → markAbsence()
  │   'navigate'      → router.push()
  │   'error'         → mostra mensagem
  └─ Retorna VoiceResult {success, response_text}

NOTA: Gravação de voz via expo-av é placeholder. Voice commands funcionam apenas via texto.
```

### 5.9 Secretary Flow

```
Trigger: após confirmExit() → enqueue('AI_CLEANUP', {date})
  ↓
effects.ts drain() executa AI_CLEANUP:
  ↓
cleanupDay(date) — secretary.ts
  ├─ getSessionsForDate(userId, date) → lê work_sessions
  ├─ Filtra: pula se todas source='voice' ou 'manual' (protegidas)
  ├─ buildWorkerProfile(userId) → 30 dias de médias
  ├─ callAI({specialist:'timekeeper:secretary', context:{mode:'daily_cleanup', sessions, profile}})
  │   → invoca Edge Function 'ai-gateway' → GPT-4o
  │   → Retorna: {corrections: [{field, from, to, reason}]}
  ├─ Para cada correção:
  │   editSession({sessionId, changes, source:'secretary', reason})
  │   ├─ Salva em ai_corrections (original_value, corrected_value, reason)
  │   └─ UPDATE work_sessions SET campo=valor, source='secretary'
  └─ Retorna: contagem de correções aplicadas

Undo (day-detail.tsx):
  undoAICorrection(date)
  ├─ SELECT * FROM ai_corrections WHERE date=? AND reverted=0
  ├─ Para cada: restore original_value, SET source='manual'
  ├─ UPDATE ai_corrections SET reverted=1
  ├─ rebuildDaySummary()
  └─ enqueue: SYNC_NOW, UI_REFRESH

Regras do Secretary:
- NUNCA toca source='voice' ou 'manual'
- Sessão >14h sem break → corrige exit para média do worker
- Sessão >12h com break → flag, não corrige
- Entry antes 4AM → corrige para média
- Exit depois 22PM → corrige para média
- Gap <30min entre sessões no mesmo site → merge (GPS bounce)
```

### 5.10 Report Flow

```
generateReport({startDate, endDate, format, includeAISummary?})
  ↓
1. aggregate(startDate, endDate)
   ├─ SELECT * FROM day_summary WHERE date BETWEEN ... AND deleted_at IS NULL
   ├─ Mapeia para ReportDay[]
   ├─ Calcula totals: hours, workDays, breakMinutes, overtimeHours (>44h/week Ontario)
   └─ Calcula weeklyTotals: agrupa por semana (segunda-feira start)
  ↓
2. AI Summary (opcional, non-blocking)
   ├─ buildWorkerProfile(userId)
   ├─ callAI({specialist:'timekeeper:secretary', mode:'report', context})
   └─ Extrai narrative do response (ou silenciosamente ignora erro)
  ↓
3. Render por formato:
   'pdf'      → renderHtml(model, aiSummary) → sharePdf() (expo-print → expo-sharing)
   'whatsapp' → formatWhatsApp(model) → shareText() (RN Share API)
   'text'     → formatPlainText(model) → shareText()
  ↓
4. Retorna ReportModel
```

---

## 6. SYNC ENGINE — Fluxo Real

### 6.1 Triggers de Sync

| Trigger | Onde | Como |
|---------|------|------|
| Após confirmExit() | engine.ts | `enqueue('SYNC_NOW')` |
| Após editSession | editSession.ts | `enqueue('SYNC_NOW')` |
| Após createManualSession | createManualSession.ts | `enqueue('SYNC_NOW')` |
| Após deleteSession | deleteSession.ts | `enqueue('SYNC_NOW')` |
| Após createFence/updateFence/deleteFence | manageFence.ts | `enqueue('SYNC_NOW')` |
| Após markAbsence | markAbsence.ts | `enqueue('SYNC_NOW')` |
| Após undoAICorrection | undoAICorrection.ts | `enqueue('SYNC_NOW')` |
| Boot | _(indireto via drain)_ | Efeitos pendentes no boot |

**Não há:** sync periódico por timer, midnight sync, ou sync on heartbeat.

### 6.2 Ordem de Upload/Download

```
syncNow() — syncEngine.ts (mutex: 1 sync por vez)
  ↓
1. isOnline()? → SELECT id FROM tmk_sessions LIMIT 0
   Se offline → return null
  ↓
2. UPLOAD (todas as tabelas, em ordem):
   work_sessions → tmk_sessions
   day_summary → tmk_day_summary
   geofence_locations → tmk_geofences
   ai_corrections → tmk_corrections
   geofence_events → tmk_events
   location_audit → tmk_audit
   error_log → tmk_errors
   analytics_daily → tmk_analytics (composite PK)
  ↓
3. UPLOAD TOMBSTONES (soft-deleted + já synced):
   work_sessions, day_summary, geofence_locations
   → upsert com deleted_at → hard-delete local
  ↓
4. DOWNLOAD (apenas bidirecionais):
   work_sessions ← tmk_sessions
   day_summary ← tmk_day_summary
   geofence_locations ← tmk_geofences
  ↓
5. runCleanup() → hard-delete dados velhos synced
```

### 6.3 synced_at

- **NULL:** Record pendente upload (unsynced).
- **datetime:** Timestamp do último upload/download bem-sucedido.
- **Resetado para NULL:** Quando record é editado localmente (força re-upload).
- **Query upload:** `WHERE synced_at IS NULL AND deleted_at IS NULL`
- **Query download:** `WHERE updated_at > MAX(synced_at)` no remoto.

### 6.4 Retry / Backoff / Offline

- **Effects queue:** Max 3 retries por efeito. Sem backoff exponencial. `status='failed'` após 3.
- **Per-record:** Erro em 1 record não bloqueia os outros. Record mantém `synced_at=NULL`, será retentado no próximo sync.
- **Offline:** `isOnline()` checa antes de sync. Se offline, retorna null (skip).
- **Sem background fetch scheduler:** `react-native-background-fetch` instalado mas não importado.

---

## 7. OBSERVABILIDADE / DEBUG

### 7.1 Logs Estruturados

**`@onsite/logger`:** Ring buffer in-memory (200 entries) com sinks.

| LogLevel | Usado para |
|----------|------------|
| `debug` | Detalhes internos (raramente em prod) |
| `info` | Boot, SDK start, sync complete, events |
| `warn` | Falhas recuperáveis, edge cases |
| `error` | Erros que precisam atenção |

**Tags:** ENTER, EXIT, HEARTBEAT, WATCHDOG, SESSION, SYNC, AI, VOICE, REPORT, ERROR, BOOT, AUTH, GPS, DB, UI, NOTIFY

**Redação automática:** password, token, accessToken, refreshToken, secret, apiKey → `[REDACTED]`

### 7.2 Sentry

- **Inicializado:** Primeiro no boot (`initSentry()` antes de qualquer import).
- **tracesSampleRate:** 0.2 (20%).
- **Breadcrumbs:** Cada entry do logger vira breadcrumb no Sentry (via sink).
- **User context:** `setSentryUser(userId)` após login.
- **captureError/captureException:** 3-way: SQLite + Sentry + logger.

### 7.3 Export de Logs

- **SDK logs:** `emailSdkLog()` → abre email client com logs nativos do SDK (3 dias).
- **App logs:** Settings screen mostra últimas 50 entries do logger (in-memory).
- **Error log:** Synced para `tmk_errors` no Supabase.

### 7.4 SDK Debug

- **verifySdkState():** Verifica enabled, trackingMode, stopOnTerminate, startOnBoot, permissões.
- **toggleDebugSounds():** Ativa beeps em geofence entry/exit (para testes de campo).
- **emailSdkLog():** Email com log nativo completo (3 dias).

---

## 8. INVENTÁRIO: "Existe Mas Não É Usado"

### 8.1 Tabelas Sem Escrita

| Tabela | Evidência |
|--------|-----------|
| `analytics_daily` | Schema existe. Upload via sync existe. **Nenhum código encontrado que popula (INSERT/UPDATE) esta tabela.** Aparentemente incompleto. |

### 8.2 Funções Exportadas Sem Chamadas

| Função | Arquivo | Evidência |
|--------|---------|-----------|
| `updateFence()` | manageFence.ts | Exportada no barrel. **Nenhuma chamada encontrada** em UI ou voice. |
| `resyncAllFences()` | manageFence.ts | Exportada. **Nenhuma chamada encontrada** (bootstrap usa `syncGeofencesToSdk()` diretamente). |
| `resetWatchdog()` | watchdog.ts | Exportada. **Chamada apenas internamente** (reset do outsideCount). Não chamada externamente. |

### 8.3 Pacotes Instalados Sem Import

| Pacote | Versão | Evidência |
|--------|--------|-----------|
| `date-fns` | ^4.1.0 | **Nenhum import encontrado.** Toda manipulação de datas usa `new Date()` nativo. |
| `react-native-background-fetch` | ^4.2.5 | **Nenhum import encontrado.** Provavelmente planejado para sync periódico, mas não implementado. |

### 8.4 Rotas Não Implementadas

| Rota | Referência | Evidência |
|------|------------|-----------|
| `/share-qr` | team.tsx: `router.push('/share-qr')` | **Arquivo não existe.** |
| `/scan-qr` | team.tsx: `router.push('/scan-qr')` | **Arquivo não existe.** |

### 8.5 Edge Functions Não Deployadas

| Function | Referência | Evidência |
|----------|------------|-----------|
| `ai-gateway` | packages/ai/core.ts: `supabase.functions.invoke('ai-gateway')` | **Não encontrado em `supabase/functions/`.** Código cliente existe, server não. |
| `ai-whisper` | packages/ai/whisper.ts: `supabase.functions.invoke('ai-whisper')` | **Não encontrado em `supabase/functions/`.** Código cliente existe, server não. |

### 8.6 Funcionalidades Placeholder

| Feature | Onde | Status |
|---------|------|--------|
| Voice recording | voice.tsx | Mic button existe, mas abre mensagem "Voice recording requires native build." |
| GPS current location | add-location.tsx | Botão "Use Current Location" mostra Alert "GPS location requires native build." |
| Notifications (arrival/departure/pause/resume) | effects.ts | Efeitos NOTIFY_* enfileirados mas handler é no-op (stub). |

---

## 9. DIFERENÇAS VS SISTEMA ANTIGO (Factual)

### 9.1 Source of Truth

| Aspecto | v1 (antigo) | v2 (rewrite) |
|---------|-------------|--------------|
| **Truth principal** | `daily_hours` (totais diários) | `work_sessions` (sessões individuais) |
| **day_summary** | Não existia | Existe como cache derivado, sempre reconstruível |
| **Granularidade** | 1 registro por dia | N sessões por dia com enter/exit precisos |

### 9.2 Tabelas

| Mudança | Detalhe |
|---------|---------|
| **Adicionadas (v2)** | `work_sessions`, `active_tracking`, `day_summary`, `geofence_events`, `location_audit`, `ai_corrections`, `error_log`, `analytics_daily`, `effects_queue`, `_migrations` |
| **Removidas (v1→v2)** | `daily_hours` (substituída por work_sessions + day_summary) |
| **geofence_locations** | Existia no v1. v2 adiciona soft delete, `synced_at`, `color`, `is_active` |

### 9.3 Effects Queue

- **v1:** Efeitos executados inline (sync, notification, rebuild) — sincrono, bloqueante.
- **v2:** Effects queue em SQLite. `enqueue()` + `drain()` FIFO. Retry (max 3). Nunca inline. Sobrevive kill do app.

### 9.4 Cooldown / Dedup

- **v1:** Sem cooldown. EXIT fecha imediatamente.
- **v2:** 30 segundos de cooldown. EXIT → EXIT_PENDING → (30s) → confirmExit(). Re-entry durante cooldown cancela exit.

### 9.5 State Machine

- **v1:** Sem state machine explícita. Lógica distribuída.
- **v2:** State machine formal: IDLE → TRACKING → EXIT_PENDING → IDLE. Ponto único de decisão (`handleEvent()`).

### 9.6 Sync

- **v1:** Sync direto (write to Supabase quando possível).
- **v2:** Offline-first. SQLite é primary. Sync assíncrono. Conflict resolution via SOURCE_PRIORITY. Tombstones para soft delete.

### 9.7 AI Integration

- **v1:** Sem AI.
- **v2:** Secretary AI (cleanup diário), Voice AI (13 ações), Worker Profile (30 dias de stats).

### 9.8 Headless

- **v1:** Sem headless task.
- **v2:** Android headless task registrado no module scope. Processa geofence events e heartbeats com app morto (~30s JS lifespan).

### 9.9 Watchdog / Recovery

- **v1:** Sem watchdog.
- **v2:** Heartbeat 60s, GPS check (2x fora = synthetic EXIT), session guard (10h warn, 16h auto-end), recovery pós-boot.

### 9.10 Reporting

- **v1:** Template HTML (687 linhas), sem AI summary.
- **v2:** Template HTML inline (279 linhas TS), + AI summary opcional, + WhatsApp format com emojis, + Plain text ASCII.

---

*Fim do RAIO-X. Relatório gerado por varredura completa do codebase em 2026-02-16.*
