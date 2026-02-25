# 02 — Tracking Engine

**Status:** Implementado (pos-patch)
**Arquivo central:** `src/tracking/engine.ts` (221 linhas)

---

## Regra Fundamental

**engine.ts e o UNICO arquivo que toma decisoes de tracking.** Nenhum outro arquivo muda `active_tracking.status` ou cria/fecha `work_sessions` diretamente (exceto usecases para manual entry).

---

## TrackingEvent Contract

Todo evento de qualquer fonte e normalizado antes de chegar ao engine.

```typescript
interface TrackingEvent {
  type: 'enter' | 'exit';
  fenceId: string;
  occurredAt: string;
  receivedAt: string;
  source: 'sdk' | 'headless' | 'watchdog' | 'gps_check' | 'manual' | 'voice';
  confidence: number;
  location?: { latitude: number; longitude: number; accuracy: number };
  delayMs: number;
}
```

### Confidence por Fonte

| Source | occurredAt | confidence |
|--------|-----------|------------|
| SDK onGeofence | event.extras.timestamp | 1.0 |
| Headless task | event.params.extras.timestamp | 1.0 |
| Watchdog heartbeat | Date.now() | 0.7 |
| Post-start GPS check | Date.now() | 0.5 |
| Manual / Voice | Date.now() | 1.0 |

### Normalizadores (tracking/events.ts, 68 linhas)

- `normalizeSdkEvent(event)` — SDK -> TrackingEvent (preserva timestamp nativo)
- `normalizeHeadlessEvent(event)` — Headless -> TrackingEvent (source='headless')
- `makeSyntheticEvent(type, fenceId, source, confidence?)` — Fabricado (occurredAt = now)

---

## State Machine

```
         ENTER (valido)
  IDLE ─────────────────> TRACKING
   ^                         |
   |                    EXIT (fenceId match)
   |                         |
   |                         v
   |                    EXIT_PENDING (30s cooldown)
   |                         |
   |    +--------------------+
   |    | ENTER durante      | cooldown expira
   |    | cooldown            |
   |    | -> cancela exit    v
   |    | -> TRACKING     confirmExit()
   |    +---> TRACKING    -> close work_session
   |                      -> rebuild day_summary
   |                      -> enqueue effects
   +------------------------- IDLE
```

COOLDOWN_SECONDS = 30. Evita split de sessao por GPS bounce.

---

## Engine Logic (handleEvent)

1. checkExpiredCooldown()
2. state = getActiveTracking() (SQLite singleton)
3. switch (state.status):

**IDLE + enter:** createOpenSession (BEGIN IMMEDIATE) -> setActiveTracking('TRACKING') -> enqueue: SWITCH_GPS_MODE, REBUILD_DAY_SUMMARY, START_SESSION_GUARD, UI_REFRESH

**IDLE + exit:** ignorar silenciosamente

**TRACKING + exit (mesmo fenceId):** setActiveTracking('EXIT_PENDING', cooldown = now+30s)

**TRACKING + enter (mesmo fenceId):** ignorar (dedup)

**TRACKING + enter (outro fenceId):** confirmExit() -> handleEvent(event) recursivo

**EXIT_PENDING + enter (mesmo fenceId):** setActiveTracking('TRACKING') (cancela exit)

**EXIT_PENDING + exit:** updateCooldown(now+30s)

### confirmExit(state, exitTime)

1. calculateDuration(enter_at, exit_at, pause_seconds)
2. closeSession(session_id, exit_at, pause_seconds, duration)
3. clearActiveTracking() -> IDLE
4. Enqueue: SWITCH_GPS_MODE(idle), CANCEL_SESSION_GUARD, REBUILD_DAY_SUMMARY, SYNC_NOW, AI_CLEANUP, UI_REFRESH

**Pos-patch:** NOTIFY_ARRIVAL e NOTIFY_DEPARTURE removidos do engine.

---

## Effects Queue (tracking/effects.ts, 175 linhas)

Side effects NUNCA executam inline no engine. Enfileirados e executados pelo drain().

### Classificacao (pos-patch)

```
CRITICAL_EFFECTS = {SYNC_NOW, REBUILD_DAY_SUMMARY, AI_CLEANUP}
```

| Tipo | Retry | Falha |
|------|-------|-------|
| Critical | Infinito com backoff [1,5,15,60]min | Nunca 'failed' |
| Normal | 3 tentativas | Marca 'failed' |

OfflineError -> backoff curto (1min). Outros erros -> progressivo baseado em retry_count.

drain() filtra: status='pending' AND (next_run_at IS NULL OR next_run_at <= now). Prioriza critical.

Executa em: pos-transicao, AppState active, heartbeat 60s, boot.

### Effects implementados

| Effect | Handler |
|--------|---------|
| SWITCH_GPS_MODE | BackgroundGeolocation.setConfig(mode) |
| REBUILD_DAY_SUMMARY | rebuildDaySummary(userId, date) |
| START/CANCEL_SESSION_GUARD | start/resetSessionGuard() |
| SYNC_NOW | syncNow() — throws OfflineError se offline |
| AI_CLEANUP | cleanupDay(date) (secretary) |
| UI_REFRESH | trackingStore.refresh() |
| NOTIFY_* (4) | Stubs (console.debug) |

---

## Guards e Dedup

| Guard | Previne | Onde |
|-------|---------|------|
| IDLE + exit | Exit sem sessao | engine |
| TRACKING + enter mesmo fence | Dedup | engine |
| EXIT_PENDING + enter | Re-entry cancela exit | engine |
| TRACKING + exit wrong fence | Exit stale | fenceId check |
| Cooldown expirado | Headless morreu | checkExpiredCooldown() |
| Listener singleton | SDK duplicado | bgGeo.ts |
| UNIQUE index | 2+ sessoes abertas | idx_ws_single_open |
| BEGIN IMMEDIATE | Race condition | sessions.ts |

---

## Session Guard (tracking/sessionGuard.ts, 67 linhas)

| Tempo | Acao |
|-------|------|
| 10h | Log warning (warningFired = true) |
| 16h | Synthetic EXIT via handleEvent() |

Verificado pelo watchdog a cada heartbeat. Notificacao 10h NAO implementada.

---

## Error Catalog (v1 bugs corrigidos)

| Code | Bug | Fix |
|------|-----|-----|
| E001 | License key [object Object] | JWT string |
| E002 | locationAuthorizationRequest ausente | 'Always' |
| E003 | Permission dialog conflito | disableLocationAuthorizationAlert |
| E004 | reset: true | reset: false |
| E005 | Date.now() timestamps | event.timestamp do SDK |
| E006 | startGeofences() | start() |
| E007 | Samsung battery kill | Detect + prompt + GPS on resume |
| E008 | setTimeout headless | cooldown_expires_at SQLite |
| E009 | GPS check EXIT falso | 5s delay + accuracy < 50m |
| E010 | Dual truth | active_tracking unico |
| E011 | Radius < 150m | Min 150m |
| E012 | listeners true on fail | Retry 3x |
