# KRONOS - Timekeeper Agent

> **"O tempo revela todas as coisas."** - *Tales de Mileto*

---

## [LOCKED] Identity

| Attribute | Value |
|-----------|-------|
| **Name** | KRONOS |
| **Domain** | OnSite Timekeeper |
| **Role** | Specialist AI Agent |
| **Orchestrator** | Blueprint (Blue) |
| **Version** | v3.2 |
| **Sync Date** | 2026-01-27 |

### Etymology

**KRONOS** (Χρόνος) - Na mitologia grega, a personificacao do tempo. Diferente de Cronos (Κρόνος), o tita pai de Zeus, Chronos representa o tempo cronologico, sequencial e mensuravel. Perfeito para um agente focado em registro e gestao de horas trabalhadas.

---

## [LOCKED] Hierarchy

```
┌─────────────────────────────────────────────┐
│             BLUEPRINT (Blue)                │
│           Orchestrator Agent                │
├─────────────────────────────────────────────┤
│  - Define schemas (SQLs em migrations/)     │
│  - Coordena entre agentes                   │
│  - Mantem documentacao central              │
│  - Emite diretivas para subordinados        │
└─────────────────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
┌───────────┐ ┌───────────┐ ┌───────────┐
│  KRONOS   │ │  CEULEN   │ │  HERMES   │
│ Timekeeper│ │Calculator │ │ Auth Hub  │
└───────────┘ └───────────┘ └───────────┘
```

**KRONOS recebe diretivas de Blue e:**
1. Implementa codigo no repositorio `onsite-timekeeper`
2. Segue schemas definidos por Blue (nao cria tabelas)
3. Reporta implementacoes a Blue
4. Documenta decisoes tecnicas neste arquivo

---

## [LOCKED] Rules

1. **Schemas sao de Blue** - KRONOS nao cria tabelas/migrations
2. **Codigo e de KRONOS** - Implementacao TypeScript/React Native
3. **Reportar sempre** - Apos implementar, enviar relatorio a Blue
4. **Documentar aqui** - Decisoes tecnicas ficam neste arquivo
5. **Observability first** - Toda acao importante deve ser logada

---

## [LOCKED] Anti-Duct-Tape Rules

### REGRA 1: Anti-Duct-Tape (Geral)

> **NUNCA "fazer passar" — sempre "fazer certo"**

Antes de implementar qualquer fix:
1. Identificar a **CAUSA RAIZ**, nao o sintoma
2. Perguntar: "Essa solucao preserva ou sacrifica funcionalidade?"
3. Perguntar: "Estou removendo codigo/dados para evitar um erro?"
4. Se a resposta for SIM → **PARAR e repensar**

```
O objetivo nunca e "ausencia de erro".
O objetivo e "presenca de valor alinhado com a missao".

Caminho facil ≠ Caminho certo
```

---

## Visao Geral

App de time tracking para construcao/trades com modelo **Freemium**:

| Modo | Descricao | Tier |
|------|-----------|------|
| **Manual** | Registro de horas na Home (foco principal) | FREE |
| **Auto (Geofencing)** | Detecta entrada/saida automaticamente | PAGO |

**Filosofia:** App e um "bloco de notas para horas". Sem friccao. Geofencing e plus.

---

## Estrutura de Pastas (v3.2)

```
/src
├── /app                      # Expo Router (navegacao)
│   ├── _layout.tsx           # Root layout + boot sequence
│   ├── index.tsx             # Redirect inicial
│   ├── /(auth)/              # Stack de autenticacao
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   └── register.tsx
│   └── /(tabs)/              # Tab navigator principal
│       ├── _layout.tsx
│       ├── index.tsx         # → Home
│       ├── reports.tsx       # → Reports
│       ├── map.tsx           # → Locations
│       ├── team.tsx          # → Team (NEW v3.2)
│       └── settings.tsx      # → Settings
│
├── /components               # Componentes reutilizaveis
│   ├── ErrorBoundary.tsx     # Fallback para erros
│   ├── PermissionBanner.tsx  # Status de permissoes
│   ├── ShareModal.tsx        # Modal de compartilhamento
│   ├── /sharing              # QR Code components (NEW v3.2)
│   │   ├── index.ts          # Re-exports
│   │   ├── QRCodeGenerator.tsx # Gera QR para linking
│   │   └── QRCodeScanner.tsx # Escaneia QR via camera
│   └── /ui
│       └── Button.tsx        # Botao base
│
├── /constants
│   └── colors.ts             # Paleta de cores
│
├── /hooks
│   └── usePermissionStatus.ts # Hook de permissoes
│
├── /lib                      # Servicos e utilitarios
│   ├── /database             # SQLite modules
│   │   ├── index.ts          # Re-exports
│   │   ├── core.ts           # DB instance + schema + helpers
│   │   ├── locations.ts      # CRUD locations
│   │   ├── records.ts        # CRUD records + SESSION MERGE
│   │   ├── analytics.ts      # Metricas agregadas
│   │   ├── errors.ts         # Error logging + ping-pong
│   │   ├── audit.ts          # GPS audit trail
│   │   └── debug.ts          # Debug utilities
│   │
│   ├── accessGrants.ts       # QR Code team linking (NEW v3.2)
│   ├── backgroundTasks.ts    # Task definitions (GEOFENCE, HEARTBEAT)
│   ├── backgroundTypes.ts    # Task types + constants
│   ├── backgroundHelpers.ts  # User ID, skipped, ping-pong helpers
│   ├── taskCallbacks.ts      # Callback registry
│   ├── geofenceLogic.ts      # Event processing + queue
│   ├── heartbeatLogic.ts     # SIMPLIFIED: fixed 15 min, sync only
│   ├── exitHandler.ts        # Simplified entry/exit system
│   ├── location.ts           # Location API wrapper
│   ├── logger.ts             # Runtime logging (memoria)
│   ├── telemetry.ts          # UI tracking wrapper
│   ├── notifications.ts      # Push + categories + actions
│   ├── bootstrap.ts          # Singleton listener setup
│   ├── geocoding.ts          # Reverse geocoding
│   ├── reports.ts            # Report generation
│   ├── supabase.ts           # Supabase client + types
│   └── constants.ts          # Global constants
│
├── /screens
│   ├── /home
│   │   ├── index.tsx         # Home screen (50/25/25)
│   │   ├── reports.tsx       # Reports tab
│   │   ├── map.tsx           # Locations map
│   │   ├── settings.tsx      # Settings modal
│   │   ├── helpers.ts        # Date/calendar utils
│   │   ├── hooks.ts          # useHomeScreen (45KB)
│   │   └── /styles
│   │       ├── index.ts      # Re-exports
│   │       ├── shared.styles.ts
│   │       ├── home.styles.ts
│   │       ├── reports.styles.ts
│   │       └── legacy.styles.ts  # ⚠️ DEPRECATED
│   └── /map
│       ├── index.tsx
│       ├── hooks.ts
│       ├── SearchBox.tsx
│       ├── styles.ts
│       └── constants.ts
│
├── /supabase                 # Supabase migrations (NEW v3.2)
│   └── /migrations
│       └── 002_access_grants.sql  # Team linking tables
│
└── /stores                   # Zustand state management
    ├── authStore.ts          # Auth + user session
    ├── locationStore.ts      # Geofences + monitoring
    ├── recordStore.ts        # Work records CRUD
    ├── workSessionStore.ts   # SIMPLIFIED: entry only
    ├── sessionHelpers.ts     # Types + boot gate
    ├── sessionHandlers.ts    # SIMPLIFIED: delegates to exitHandler
    ├── sessionActions.ts     # User action handlers
    ├── settingsStore.ts      # Preferences
    └── syncStore.ts          # Supabase sync
```

---

## Navegacao (Expo Router)

```
┌──────────────────────────────────────────────────────────────────┐
│  Home  │  Reports  │  Locations  │  Team  │  Settings            │
└──────────────────────────────────────────────────────────────────┘
      │            │              │          │          │
      │            │              │          │          └→ settings.tsx
      │            │              │          └→ team.tsx (QR + workers) [NEW v3.2]
      │            │              └→ map.tsx (MapView + geofences)
      │            └→ reports.tsx (calendario + charts)
      └→ index.tsx (form + timer + location carousel)
```

### Boot Sequence (`_layout.tsx`)

```
1. authStore.initialize()     → Supabase session
2. initDatabase()             → SQLite tables
3. locationStore.initialize() → Permissions + locations
4. recordStore.initialize()   → Today sessions
5. workSessionStore.initialize() → Notifications
6. syncStore.initialize()     → Network + midnight sync
7. bootstrap.initializeListeners() → Callbacks singleton
```

---

## HOME Layout v2.1

```
┌─────────────────────────────────────────┐
│ OnSite Logo                    [user]   │  Header (5%)
├─────────────────────────────────────────┤
│ <─ [Site A] [Site B] [Site C] [+] ─>   │  Location carousel (8%)
├─────────────────────────────────────────┤
│ Wed, Jan 15                      [▼]   │
│ Entry    [ 15:45  ]                    │
│ Exit     [ 18:30  ]                    │
│ Break    [ 60 min  ▼]                  │
│ Total: 2h 45min                        │
│ [Save Hours]                           │  Manual entry (22%)
├─────────────────────────────────────────┤
│                                         │
│           Site A                        │
│          00:35:16                       │
│                                         │  Timer (flex: 1, ~65%)
│          [Pause]  [Stop]                │
│                                         │
└─────────────────────────────────────────┘
```

---

## Stores (Zustand)

### authStore.ts

```typescript
interface AuthState {
  session: Session | null
  user: User | null
  isLoading: boolean
  isInitialized: boolean
  error: string | null
}

// Actions
initialize(): Promise<void>
signIn(email, pwd): Promise<void>
signUp(email, pwd): Promise<void>
signOut(): Promise<void>
refreshSession(): Promise<void>

// Helpers
getUserId(): string | null
isAuthenticated(): boolean
```

### locationStore.ts

```typescript
interface LocationState {
  locations: LocationDB[]
  isLoading: boolean
  isMonitoring: boolean
  currentLocation: LocationCoords | null
  activeSession: RecordDB | null
  permissionStatus: 'granted' | 'denied' | 'restricted'
  currentFenceId: string | null
  lastGeofenceEvent: GeofenceEvent | null
}

// CRUD
addLocation(name, lat, lng, radius, color): Promise<string>
editLocation(id, updates): Promise<void>
deleteLocation(id): Promise<void>

// Monitoring
startMonitoring(): Promise<void>
stopMonitoring(): Promise<void>
reconcileState(): Promise<void>

// Events
handleGeofenceEvent(event): Promise<void>
handleManualEntry(locationId): Promise<void>
handleManualExit(locationId): Promise<void>
```

### recordStore.ts

```typescript
interface RecordState {
  isInitialized: boolean
  currentSession: ComputedSession | null
  todaySessions: ComputedSession[]
  todayStats: DayStats
  lastFinishedSession: ComputedSession | null
}

// Actions
registerEntry(locationId, locationName, coords?): Promise<string>
registerExit(locationId, coords?): Promise<void>
deleteRecord(id): Promise<void>
editRecord(id, updates): Promise<void>
createManualRecord(params): Promise<string>

// Reports
getSessionsByPeriod(startDate, endDate): Promise<ComputedSession[]>
shareReport(startDate, endDate): Promise<void>
```

### workSessionStore.ts (SIMPLIFIED v3.1)

```typescript
interface WorkSessionState {
  isInitialized: boolean
  skippedToday: string[]
  lastProcessedEnterLocationId: string | null
}

// Geofence handlers (delegados para sessionHandlers)
handleGeofenceEnter(locationId, locationName, coords?): Promise<void>
handleGeofenceExit(locationId, locationName, coords?): Promise<void>

// User actions (apenas entrada)
actionStart(): Promise<void>      // Confirma entrada
actionSkipToday(): Promise<void>  // Skip local hoje

// Helpers
resetSkippedToday(): void
removeFromSkippedToday(locationId): void
resetBootGate(): void
```

**Nota:** O store foi simplificado em v3.1. Nao ha mais:
- `pendingAction` (sistema antigo de timeout)
- `pauseState` (pausa gerenciada pelo record)
- `actionOk`, `actionPause`, `actionResume`, `actionStop` (saida automatica)

### syncStore.ts

```typescript
interface SyncState {
  isSyncing: boolean
  lastSyncAt: Date | null
  isOnline: boolean
  lastSyncStats: SyncStats | null
  syncEnabled: boolean
}

// Actions
syncNow(): Promise<SyncStats>
syncLocationsOnly(): Promise<void>
syncRecordsOnly(): Promise<void>
forceFullSync(): Promise<void>
```

---

## Observabilidade - 4 Camadas

### Camada 1: Runtime Logger (`logger.ts`)

```typescript
// Categorias (17 tipos)
type LogCategory =
  | 'auth' | 'gps' | 'geofence' | 'sync' | 'database'
  | 'notification' | 'session' | 'ui' | 'boot' | 'heartbeat'
  | 'record' | 'telemetry' | 'ttl' | 'pingpong'
  | 'permissions' | 'settings' | 'registro'

// API
logger.debug(category, message, metadata?)
logger.info(category, message, metadata?)
logger.warn(category, message, metadata?)
logger.error(category, message, metadata?)

// Config
maxStoredLogs: 500
enableConsole: __DEV__
showSensitiveData: false  // Privacy
```

**Privacidade automatica:**
- Emails: `c******@gmail.com`
- Coords: `[coord]`
- UserIds: `abc123...`

### Camada 2: Analytics (`database/analytics.ts`)

```typescript
// Metricas disponiveis
type AnalyticsField =
  // Business
  | 'sessions_count' | 'total_minutes' | 'manual_entries'
  | 'auto_entries' | 'locations_created' | 'locations_deleted'
  // Product
  | 'app_opens' | 'app_foreground_seconds'
  | 'notifications_shown' | 'notifications_actioned'
  // Debug
  | 'errors_count' | 'sync_attempts' | 'sync_failures' | 'geofence_triggers'

// API
trackMetric(userId, field, increment?): Promise<void>
trackFeatureUsed(userId, feature): Promise<void>
trackGeofenceTrigger(userId, accuracy): Promise<void>
trackSessionMinutes(userId, minutes, isManual): Promise<void>
```

### Camada 2: Errors (`database/errors.ts`)

```typescript
// Tipos de erro (14)
type ErrorType =
  | 'sync_error' | 'database_error' | 'network_error'
  | 'geofence_error' | 'notification_error' | 'auth_error'
  | 'permission_error' | 'validation_error' | 'runtime_error'
  | 'pingpong_event' | 'pingpong_warning' | 'unknown_error'
  | 'foreground_service_killed'

// API
captureError(error, type, context?): Promise<string>
captureErrorAuto(error, context?): Promise<string>
captureSyncError(error, context?)
captureDatabaseError(error, context?)
captureGeofenceError(error, context?)

// Ping-Pong tracking
capturePingPongEvent(userId, data): Promise<string>
getPingPongStats(userId?): { totalEvents, warnings, enters, exits, ... }
```

### Camada 2: Audit (`database/audit.ts`)

```typescript
type AuditEventType = 'entry' | 'exit' | 'dispute' | 'correction'

// API
recordEntryAudit(userId, lat, lng, accuracy, locationId, locationName, sessionId): Promise<string>
recordExitAudit(userId, lat, lng, accuracy, locationId, locationName, sessionId): Promise<string>

// GPS Proof
getSessionProof(sessionId): Promise<SessionProof | null>
interface SessionProof {
  sessionId: string
  locationName: string
  entryAudit: LocationAuditDB | null
  exitAudit: LocationAuditDB | null
  hasGPSProof: boolean
  entryAccuracy: number | null
  exitAccuracy: number | null
}
```

### Camada 4: Supabase (Remote)

**Tabelas Supabase:**
- `analytics_daily` - Metricas agregadas por dia (view para agg_user_daily)
- `log_errors` - Erros estruturados
- `log_locations` - GPS proof de entry/exit
- `pending_tokens` - Tokens QR temporarios (NEW v3.2)
- `access_grants` - Vinculacao worker-manager (NEW v3.2)

**Nota:** SQLite local usa `error_log` e `location_audit`. Supabase usa `log_errors` e `log_locations`.

**Supabase Project:** `bjkhofdrzpczgnwxoauk` (compartilhado com web portal)

---

## Background Tasks

### Task Names

```typescript
// backgroundTypes.ts
export const GEOFENCE_TASK = 'onsite-geofence'
export const HEARTBEAT_TASK = 'onsite-heartbeat-task'
export const LOCATION_TASK = 'onsite-location-task'

// Constants
RECONFIGURE_DEBOUNCE_MS = 5000
EVENT_DEDUP_WINDOW_MS = 10000
MAX_QUEUE_SIZE = 20
MAX_QUEUE_AGE_MS = 30000
```

### Fluxo de Geofencing (SIMPLIFIED v3.1)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    GEOFENCING FLOW (v3.1 SIMPLIFIED)                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Native Geofence (iOS/Android)                                      │
│         ↓                                                            │
│  GEOFENCE_TASK (TaskManager.defineTask)                             │
│         ↓                                                            │
│  processGeofenceEvent() [geofenceLogic.ts]                         │
│    │                                                                 │
│    ├─ Deduplicacao (10s window)                                    │
│    ├─ Queue durante reconfiguration                                 │
│    └─ Callback → workSessionStore                                  │
│         ↓                                                            │
│  handleGeofenceEnter/Exit [sessionHandlers.ts]                     │
│    │                                                                 │
│    ├─ Boot gate check (queue if not ready)                         │
│    ├─ Check skippedToday                                           │
│    └─ Delegate to exitHandler.ts                                   │
│         ↓                                                            │
│  exitHandler.ts (NEW SIMPLIFIED SYSTEM)                            │
│                                                                      │
│  ENTRADA:                                                           │
│    handleEnterWithMerge(userId, locationId, locationName)          │
│      1. Cancel pending exit notification (if any)                  │
│      2. handleSessionMerge() → 'already_active' | 'merged' | 'new' │
│      3. If 'new_session' → createEntryRecord()                     │
│      4. Show notification                                          │
│                                                                      │
│  SAIDA:                                                             │
│    handleExitWithDelay(userId, locationId, locationName)           │
│      1. registerExit() IMEDIATO                                    │
│      2. Schedule notification (30s delay)                          │
│      3. If user returns < 30s → cancel + merge                     │
│      4. If 30s passes → show informative notification              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Session Merge System (NEW v3.1)

```typescript
// database/records.ts

handleSessionMerge(userId, locationId, locationName): Promise<'merged' | 'new_session' | 'already_active'>

// REGRA: Gap < 15 minutos = MERGE
// 1. Se sessao ativa → 'already_active'
// 2. Se gap < 15 min → reopen session + add break time → 'merged'
// 3. Se gap >= 15 min → 'new_session'

// Helper functions
getLastSessionForLocation(userId, locationId): Promise<RecordDB | null>
addBreakMinutes(sessionId, minutes): Promise<void>
reopenLastSession(userId, locationId): Promise<boolean>
```

### Heartbeat (SIMPLIFIED v3.1)

```typescript
// heartbeatLogic.ts

HEARTBEAT_INTERVAL = 15 * 60  // Fixed 15 minutes

// Funcoes
runHeartbeat(): Promise<void>
  - Check last sync time
  - If > 6 hours since sync → syncNow()
  - No session logic (simplified)

// Task management
isTaskRegistered(taskName): Promise<boolean>
safeUnregisterTask(taskName): Promise<boolean>
safeRegisterHeartbeat(intervalSeconds): Promise<boolean>
maybeUpdateHeartbeatInterval(): Promise<void>  // No-op (fixed interval)
```

**Nota:** Heartbeat foi simplificado em v3.1:
- Intervalo fixo de 15 minutos
- Apenas verifica sync (se > 6h desde ultimo sync)
- Sem logica de sessao (movida para exitHandler)
- Sem intervalos adaptativos

### Ping-Pong Prevention

```typescript
// backgroundHelpers.ts
interface PingPongEvent {
  timestamp: number
  type: 'enter' | 'exit' | 'check'
  fenceName: string
  fenceId: string
  distance: number
  radius: number
  effectiveRadius: number
  margin: number
  marginPercent: number
  isInside: boolean
  source: 'geofence' | 'heartbeat' | 'reconcile' | 'manual'
  gpsAccuracy?: number
}

logPingPongEvent(event): Promise<void>
getPingPongHistory(): PingPongEvent[]
checkForPingPong(fenceId?): Promise<{ isPingPonging, recentEnters, recentExits }>

// Hysteresis check
checkInsideFence(lat, lng, userId, useHysteresis?, source?, gpsAccuracy?): Promise<{
  isInside: boolean
  fence: ActiveFence | null
  distance?: number
}>
```

---

## Sync System

### Fluxo Completo

```
┌─────────────────────────────────────────────────────────────┐
│                       SYNC FLOW                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  TRIGGERS                                                    │
│  ├── Midnight (diario 00:00-00:05)                          │
│  ├── App init (se online)                                   │
│  ├── Manual (usuario)                                       │
│  ├── Network reconect                                       │
│  ├── Heartbeat (if > 6h since last sync)                   │
│  └── Evento importante (create location, end session)        │
│                                                              │
│                         ↓                                    │
│                                                              │
│  syncNow()                                                   │
│  │                                                           │
│  │  // UPLOAD (SQLite → Supabase)                           │
│  ├── 1. getLocationsForSync() → locations                   │
│  ├── 2. getRecordsForSync() → records                       │
│  ├── 3. getAnalyticsForSync() → analytics_daily             │
│  ├── 4. getErrorsForSync() → log_errors                     │
│  └── 5. getAuditForSync() → log_locations                   │
│                                                              │
│  // Mark synced (synced_at = NOW)                           │
│  markLocationSynced(), markRecordSynced(), etc.             │
│                                                              │
│                         ↓                                    │
│                                                              │
│  CLEANUP (apenas synced)                                     │
│  ├── cleanOldAnalytics(30)  → Remove > 30 dias              │
│  ├── cleanOldErrors(14)     → Remove > 14 dias              │
│  └── cleanOldAudit(90)      → Remove > 90 dias              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Retencao Local

| Tabela Local (SQLite) | Tabela Supabase | Retencao | Condicao |
|-----------------------|-----------------|----------|----------|
| `analytics_daily` | `analytics_daily` | 30 dias | Apos sync |
| `error_log` | `log_errors` | 14 dias | Apos sync |
| `location_audit` | `log_locations` | 90 dias | Apos sync |
| `locations` | `locations` | Indefinido | Sempre |
| `records` | `records` | Indefinido | Sempre |

---

## QR Code Team Linking (NEW v3.2)

### Conceito

Sistema de vinculacao entre **Workers** (donos dos registros) e **Managers** (visualizadores) via QR Code. Acesso imediato apos scan — sem etapa de aprovacao.

### Fluxo Completo

```
┌─────────────────────────────────────────────────────────────────────┐
│                  QR CODE TEAM LINKING (v3.2)                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  WORKER (Owner)                       MANAGER (Viewer)              │
│       │                                     │                        │
│  1. Abre Team tab                          │                        │
│  2. Clica "Share My Hours"                 │                        │
│       │                                     │                        │
│  createAccessToken()                       │                        │
│    └→ Insert pending_tokens (5 min TTL)    │                        │
│    └→ Gera QR code (react-native-qrcode-svg)│                      │
│       │                                     │                        │
│  3. Mostra QR na tela ◻◻◻                │                        │
│                                             │                        │
│                                    4. Clica "Scan QR Code"          │
│                                    5. Camera abre (expo-camera)     │
│                                    6. Escaneia QR code              │
│                                         │                            │
│                                    parseQRPayload()                 │
│                                    redeemToken()                    │
│                                      ├→ Valida token                │
│                                      ├→ Verifica expiracao          │
│                                      ├→ Verifica self-link          │
│                                      ├→ Verifica duplicata          │
│                                      ├→ Cria access_grant           │
│                                      │   status: 'active' ← IMEDIATO│
│                                      │   accepted_at: NOW()         │
│                                      └→ Deleta pending_token        │
│                                         │                            │
│                                    Alert: "Acesso Liberado!"        │
│                                         │                            │
│  Team tab atualiza:                Team tab atualiza:               │
│  └→ "Who Can See My Hours"        └→ Worker cards aparecem          │
│     └→ [Revoke] button               └→ Horas hoje/semana          │
│                                        └→ Atividade recente         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Regras de Negocio

| Regra | Descricao |
|-------|-----------|
| **Sem aprovacao** | Mostrar QR = consentimento implicito. Acesso imediato |
| **Token TTL** | 5 minutos. Apos expirar, gerar novo |
| **Self-link** | Bloqueado (nao pode vincular a si mesmo) |
| **Duplicata** | Se ja tem acesso ativo, retorna erro |
| **Revogacao** | Owner pode revogar a qualquer momento |
| **Dados compartilhados** | Records (horas) + Locations (via RLS) |

### Access Grants API (`accessGrants.ts`)

```typescript
// ============================================
// TYPES
// ============================================

export type GrantStatus = 'active' | 'revoked'  // Sem 'pending' - acesso imediato

export interface AccessGrant {
  id: string
  owner_id: string
  viewer_id: string
  token: string
  status: GrantStatus
  label: string | null       // Nome do owner
  created_at: string
  accepted_at: string | null
  revoked_at: string | null
}

export interface PendingToken {
  id: string
  owner_id: string
  token: string
  owner_name: string | null
  expires_at: string
  created_at: string
}

export interface QRCodePayload {
  app: 'onsite-timekeeper'
  action: 'link'
  token: string
  ownerName?: string
}

// ============================================
// OWNER FUNCTIONS (Worker)
// ============================================

createAccessToken(ownerName?): Promise<{ token, expiresAt } | null>
getMyGrants(): Promise<AccessGrant[]>
revokeGrant(grantId): Promise<boolean>

// ============================================
// VIEWER FUNCTIONS (Manager)
// ============================================

redeemToken(token): Promise<{ success, message, ownerName? }>
getGrantedAccess(): Promise<AccessGrant[]>       // Apenas status='active'
getSharedRecords(ownerId): Promise<RecordRow[]>   // Via RLS
getAllSharedRecords(): Promise<{ ownerId, ownerName, records }[]>

// ============================================
// QR CODE HELPERS
// ============================================

createQRPayload(token, ownerName?): string        // JSON stringify
parseQRPayload(data): QRCodePayload | null        // JSON parse + validate
```

### Componentes UI

```typescript
// QRCodeGenerator.tsx (236 lines)
// Props: ownerName?, size?, onClose?
// - Gera token via createAccessToken()
// - Exibe QR code com countdown (5 min)
// - Auto-regenera quando expira
// - Usa react-native-qrcode-svg

// QRCodeScanner.tsx (307 lines)
// Props: onSuccess?, onCancel?
// - Abre camera via expo-camera (CameraView)
// - Escaneia QR code (barcodeTypes: ['qr'])
// - Valida payload via parseQRPayload()
// - Redeem via redeemToken()
// - Alert: "Acesso Liberado!" ou erro

// team.tsx (629 lines) - Tab principal
// Secoes:
//   1. Header (titulo + contagem de workers)
//   2. QR Actions (Share My Hours + Scan QR Code)
//   3. Active Grants (quem pode ver minhas horas + botao Revoke)
//   4. Workers List (cards expansiveis)
//   5. Modals (QR Generator + Scanner)
//
// WorkerCard: Avatar, status badge, horas hoje/semana, atividade recente
```

### Supabase Tables (Team Linking)

```sql
-- PENDING TOKENS (temporarios, 5 min TTL)
CREATE TABLE public.pending_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token VARCHAR(32) UNIQUE NOT NULL,
  owner_name TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ACCESS GRANTS (vinculacao worker-manager)
CREATE TABLE public.access_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token VARCHAR(32) NOT NULL,
  status VARCHAR(20) DEFAULT 'active'
    CHECK (status IN ('active', 'revoked')),
  label VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  UNIQUE(owner_id, viewer_id)
);

-- RLS: Viewer pode ver records/locations do owner via grant ativo
-- (policies em app_timekeeper_entries e app_timekeeper_geofences)

-- Cleanup function
CREATE FUNCTION cleanup_expired_tokens() RETURNS void
  DELETE FROM pending_tokens WHERE expires_at < NOW();
```

---

## Web Portal (Companion)

### Projeto Separado

```
C:\Dev\Onsite-club\onsite-timekeeper-web\   ← Next.js 14+ / Vercel
C:\Dev\Onsite-club\onsite-timekeeper\        ← React Native / Expo (este)
```

### Compartilhamento

| Recurso | Compartilhado |
|---------|---------------|
| **Supabase** | Mesmo projeto (`bjkhofdrzpczgnwxoauk`) |
| **Auth** | Mesmo login (email/senha) |
| **Tabelas** | Mesmas (locations, records, access_grants) |
| **Google Maps Key** | Mesma chave |
| **Codigo** | Independente (repos separados) |

### Funcionalidades Web (sem geofencing)

- Registro manual de horas
- Selecao de local no mapa
- Relatorios (mesmo formato Ref #)
- QR code para team linking

---

## Database (SQLite)

### Schema Local

```sql
-- LOCATIONS (Geofences)
CREATE TABLE locations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  radius INTEGER DEFAULT 100,
  color TEXT,
  status TEXT DEFAULT 'active',
  deleted_at TEXT,
  last_seen_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  synced_at TEXT
);

-- RECORDS (Work Sessions)
CREATE TABLE records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  location_id TEXT NOT NULL,
  location_name TEXT,
  entry_at TEXT NOT NULL,
  exit_at TEXT,
  type TEXT DEFAULT 'automatic',
  manually_edited INTEGER DEFAULT 0,
  edit_reason TEXT,
  integrity_hash TEXT,
  color TEXT,
  device_id TEXT,
  pause_minutes INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  synced_at TEXT
);

-- ANALYTICS (Metricas por dia)
CREATE TABLE analytics_daily (
  date TEXT NOT NULL,
  user_id TEXT NOT NULL,
  sessions_count INTEGER DEFAULT 0,
  total_minutes INTEGER DEFAULT 0,
  manual_entries INTEGER DEFAULT 0,
  auto_entries INTEGER DEFAULT 0,
  locations_created INTEGER DEFAULT 0,
  app_opens INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,
  sync_attempts INTEGER DEFAULT 0,
  geofence_triggers INTEGER DEFAULT 0,
  features_used TEXT DEFAULT '[]',
  app_version TEXT,
  created_at TEXT NOT NULL,
  synced_at TEXT,
  PRIMARY KEY (date, user_id)
);

-- ERROR LOG (SQLite local - syncs to Supabase 'log_errors')
CREATE TABLE error_log (
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
  created_at TEXT NOT NULL,
  synced_at TEXT
);

-- LOCATION AUDIT (SQLite local - syncs to Supabase 'log_locations')
CREATE TABLE location_audit (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  session_id TEXT,
  event_type TEXT NOT NULL,
  location_id TEXT,
  location_name TEXT,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  accuracy REAL,
  occurred_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  synced_at TEXT
);
```

---

## Notifications (SIMPLIFIED v3.1)

### Categorias e Acoes

```typescript
// Entry notification (unica com botoes)
- Category: 'geofence_enter'
- Buttons: [▶️ Start Work] [😴 Skip Today]
- Timeout: entryTimeoutMinutes (5 min default)
- Auto-action: auto_start

// Exit notification (informativa, SEM botoes)
- Mostrada 30s apos saida
- Apenas informa: "Left LocationName at HH:MM"
- Registro de saida ja foi feito IMEDIATAMENTE

// Report reminder
- Category: 'report_reminder'
- Buttons: [📤 Send Now] [⏰ Later]
- Scheduling: weekly/biweekly/monthly

// Simple notification (helper)
showSimpleNotification(title, body): Promise<string>
```

**Nota:** As categorias abaixo foram REMOVIDAS em v3.1:
- `geofence_exit` (saida agora e automatica)
- `geofence_return` (merge automatico)
- `pause_expired` (pausas via pause_minutes no record)

---

## Tabelas Supabase

> Schemas gerenciados por Blue em `migrations/001_schema.sql`

### Core Tables

| Table | Purpose |
|-------|---------|
| `core_profiles` | Perfil do usuario |
| `core_devices` | Dispositivos vinculados |
| `app_timekeeper_projects` | Projetos/locais de trabalho |
| `app_timekeeper_geofences` | Configuracao de geofences |
| `app_timekeeper_entries` | Registros de entrada/saida |

### Team Linking Tables (NEW v3.2)

| Table | Purpose |
|-------|---------|
| `pending_tokens` | Tokens temporarios para QR code (5 min TTL) |
| `access_grants` | Vinculacao worker ↔ manager (acesso imediato) |

### Observability Tables

| Table | Purpose |
|-------|---------|
| `log_events` | Eventos do app |
| `log_errors` | Erros estruturados |
| `log_locations` | Historico de localizacao |
| `agg_user_daily` | Analytics diarios por usuario |

---

## Dependency Chain (Golden Rule)

```
┌─────────────────────────────────────────────────────────────────────┐
│                     DEPENDENCY CHAIN (v3.2)                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  workSessionStore (SIMPLIFIED - entry only)                         │
│      │                                                               │
│      ├→ sessionHandlers.ts (delegates to exitHandler)              │
│      │   └→ exitHandler.ts (entry/exit logic)                     │
│      │       └→ database/records.ts (session merge)               │
│      │           └→ analytics tracking                             │
│      │                                                               │
│      ├→ backgroundTasks (geofence setup)                           │
│      │   ├→ geofenceLogic (event processing)                      │
│      │   ├→ heartbeatLogic (SIMPLIFIED - sync only)               │
│      │   └→ taskCallbacks                                          │
│      │                                                               │
│      ├→ syncStore (Supabase)                                       │
│      │   └→ database (read unsynced)                               │
│      │                                                               │
│      └→ notifications (SIMPLIFIED - entry only)                    │
│                                                                      │
│  accessGrants (INDEPENDENT - NEW v3.2)                              │
│      │                                                               │
│      ├→ supabase.ts (client + types)                               │
│      ├→ logger.ts (runtime logging)                                │
│      └→ UI: team.tsx + sharing/ components                         │
│          ├→ QRCodeGenerator (react-native-qrcode-svg)              │
│          └→ QRCodeScanner (expo-camera)                            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

QUANDO MODIFICAR, SEMPRE VERIFICAR IMPACTO EM:
1. src/stores/workSessionStore.ts
2. src/lib/exitHandler.ts
3. src/lib/backgroundTasks.ts + geofenceLogic.ts
4. src/stores/syncStore.ts
5. src/lib/accessGrants.ts (team linking)
6. Componentes UI que consomem os stores
```

---

## Regras de Codigo

### NUNCA

```
- Modificar workSessionStore sem checar exitHandler
- Alterar exitHandler sem checar sessionHandlers
- Alterar geofence logic sem checar session state
- Alterar accessGrants sem checar team.tsx e sharing/ components
- Reintroduzir fluxo de aprovacao no team linking (acesso e IMEDIATO)
- Adicionar PII (emails, coords exatas) aos logs
- Criar sistemas duplicados de tracking/analytics
- Pular padroes offline-first em novas features
- Usar Redux (apenas Zustand)
```

### SEMPRE

```
- Usar logger.ts para runtime logs
- Usar database/analytics.ts para metricas persistentes
- Usar database/errors.ts para captura de erros
- Usar database/audit.ts para prova GPS
- Mascarar PII automaticamente
- Testar offline mode
- Verificar sync para Supabase
```

---

## Permissoes (app.json)

### Android

```json
"permissions": [
  "ACCESS_NETWORK_STATE",
  "INTERNET",
  "ACCESS_COARSE_LOCATION",
  "ACCESS_FINE_LOCATION",
  "ACCESS_BACKGROUND_LOCATION",
  "FOREGROUND_SERVICE",
  "FOREGROUND_SERVICE_LOCATION",
  "RECEIVE_BOOT_COMPLETED",
  "VIBRATE",
  "WAKE_LOCK"
]
```

### iOS

```json
"infoPlist": {
  "NSLocationWhenInUseUsageDescription": "...",
  "NSLocationAlwaysAndWhenInUseUsageDescription": "...",
  "NSLocationAlwaysUsageDescription": "...",
  "UIBackgroundModes": [
    "location",
    "fetch",
    "remote-notification",
    "audio"
  ]
}
```

---

## Roadmap

```
v1.0 (concluido)
├── Geofencing basico
├── Auto start/stop
├── Notificacoes
├── TTL conectado

v2.0 (concluido)
├── UX v2.1 (Location Carousel)
├── Observabilidade completa (4 camadas)
├── Hysteresis + ping-pong prevention
├── Adaptive heartbeat
├── Boot gate + event queueing

v3.0 (concluido)
├── Documentacao completa reescrita
├── Estrutura de pastas organizada

v3.1 (concluido)
├── SIMPLIFIED exit system (exitHandler.ts)
├── Session merge (<15 min = merge)
├── Fixed heartbeat (15 min, sync only)
├── Notifications simplificadas (entry only)
├── workSessionStore simplificado

v3.2 (atual)
├── QR Code team linking (acesso imediato)
├── Team tab (dashboard de workers)
├── Access Grants (pending_tokens + access_grants)
├── QRCodeGenerator + QRCodeScanner components
├── Web portal companion (onsite-timekeeper-web)
├── Supabase unificado (mobile + web = mesmo projeto)
├── react-native-qrcode-svg dependency

v4.0 (proximo)
├── Relatorios PDF/Excel
├── Dashboard analytics (Supabase)
├── Geofencing como feature paga
```

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-27 | **v3.2** | QR Code team linking, Team tab, Access Grants, Web portal companion, Supabase unificado |
| 2026-01-22 | v3.1 | Simplified exit system, session merge, fixed heartbeat, updated all APIs |
| 2026-01-19 | v3.0 | Documentacao completa reescrita com todas as APIs |
| 2026-01-17 | v1.0 | Documento de identidade criado por Blue |

---

*Ultima atualizacao: 2026-01-27*
