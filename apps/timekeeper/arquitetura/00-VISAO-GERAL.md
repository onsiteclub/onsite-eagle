# 00 — Visao Geral do Timekeeper v2

**Status:** Implementado (pos-patch RAIO-X, 2026-02-16)

---

## O que e o Timekeeper

App mobile (Expo/React Native) de rastreamento automatico de horas de trabalho para construcao civil no Canada. Usa geofencing GPS para detectar entrada/saida de canteiros de obra, com tracking em background, AI para limpeza de dados, e reports profissionais.

---

## Mapa de Modulos

```
apps/timekeeper/
├── app/                          ← Expo Router (file-based routing)
│   ├── _layout.tsx               # Boot sequence + Stack navigator
│   ├── index.tsx                 # Auth redirect
│   ├── (auth)/                   # Login flow
│   │   ├── _layout.tsx
│   │   └── login.tsx
│   ├── (tabs)/                   # Main app
│   │   ├── _layout.tsx           # Tab navigator
│   │   ├── index.tsx             # Home (timer + today's sessions)
│   │   ├── map.tsx               # Locations / geofences
│   │   ├── reports.tsx           # Reports + calendar
│   │   ├── team.tsx              # QR sharing
│   │   └── settings.tsx          # Settings + AI status
│   ├── add-location.tsx          # Create geofence
│   ├── day-detail.tsx            # Day breakdown
│   ├── manual-entry.tsx          # Manual session entry
│   ├── voice.tsx                 # Voice command screen
│   ├── share-qr.tsx              # QR code display (placeholder)
│   └── scan-qr.tsx               # QR scanner (placeholder)
│
├── src/
│   ├── tracking/                 ← CEREBRO — decisoes de tracking
│   │   ├── engine.ts             # State machine (UNICO decisor)
│   │   ├── effects.ts            # Effects queue + drain + backoff
│   │   ├── events.ts             # Normalizadores de eventos
│   │   ├── watchdog.ts           # Heartbeat GPS check
│   │   ├── recovery.ts           # Boot recovery + fence change
│   │   └── sessionGuard.ts       # 10h warn / 16h auto-end
│   │
│   ├── sdk/                      ← Transistorsoft Background Geolocation
│   │   ├── bgGeo.ts              # SDK config + listeners + start
│   │   ├── headless.ts           # Android headless task
│   │   └── modes.ts              # IDLE ↔ ACTIVE GPS modes
│   │
│   ├── persistence/              ← SQLite CRUD
│   │   ├── sessions.ts           # work_sessions (create/close/query)
│   │   ├── activeTracking.ts     # active_tracking singleton
│   │   ├── daySummary.ts         # Rebuild day_summary from sessions
│   │   ├── geofences.ts          # geofence_locations queries
│   │   ├── geofenceEvents.ts     # Audit trail (events + location_audit)
│   │   └── cleanup.ts            # Data retention cleanup
│   │
│   ├── sync/                     ← Supabase bidirectional sync
│   │   ├── syncEngine.ts         # Orchestrator (upload → download → rebuild)
│   │   ├── mapping.ts            # Table config (direction, column renames)
│   │   ├── upload.ts             # SQLite → Supabase upsert
│   │   └── download.ts           # Supabase → SQLite with conflict resolution
│   │
│   ├── ai/                       ← AI integrations (app-specific)
│   │   ├── secretary.ts          # Daily cleanup (post-exit)
│   │   ├── voice.ts              # Voice command pipeline
│   │   └── profile.ts            # Worker profile (30-day averages)
│   │
│   ├── usecases/                 ← Business logic entry points
│   │   ├── createManualSession.ts
│   │   ├── editSession.ts
│   │   ├── deleteSession.ts
│   │   ├── pauseResume.ts
│   │   ├── manageFence.ts
│   │   ├── markAbsence.ts
│   │   ├── generateReport.ts
│   │   └── undoAICorrection.ts
│   │
│   ├── reporting/                ← Report generation
│   │   ├── renderHtml.ts         # HTML timesheet template (280 lines)
│   │   ├── share.ts              # PDF via expo-print + sharing
│   │   └── whatsapp.ts           # Formatted text for WhatsApp
│   │
│   ├── monitoring/               ← Observability
│   │   ├── sentry.ts             # Sentry init + breadcrumbs
│   │   ├── errorCapture.ts       # SQLite error_log + Sentry
│   │   └── sdkDebug.ts           # SDK state verification + email logs
│   │
│   ├── stores/
│   │   └── trackingStore.ts      # Zustand (UI cache, NOT source of truth)
│   │
│   └── lib/
│       ├── database.ts           # SQLite init + migrations (v1 + v2)
│       ├── supabase.ts           # Supabase client factory
│       └── uuid.ts               # UUID generation
│
├── packages/ (consumed)
│   ├── @onsite/ai                # callAI(), transcribeAudio()
│   ├── @onsite/auth/core         # getUserId(), initAuthCore()
│   ├── @onsite/logger            # Structured logging
│   └── @onsite/shared            # Types (WorkSession, DaySummary, etc.)
```

---

## Boot Sequence

Definido em `app/_layout.tsx`. Ordem exata:

```
1. Sentry.init()                         ← Primeiro, antes de tudo
2. import './src/sdk/headless'           ← Side-effect: registra headless task
3. bootstrap():
   3a. initAuthCore()                    ← AsyncStorage session
   3b. initDatabase()                    ← SQLite open + migrations
   3c. getUserId()                       ← Se null → tela de login
   3d. onAuthStateChange()              ← Listener Supabase
   3e. configureAndStart()              ← SDK ready() + start()
   3f. verifySdkState()                 ← Verifica enabled/trackingMode
   3g. syncGeofencesToSdk()             ← SQLite fences → SDK fences
   3h. checkExpiredCooldown()           ← Cooldown que expirou durante kill
   3i. drain()                          ← Processar effects pendentes
4. AppState listener:
   'active' → checkExpiredCooldown() + drain()
```

---

## Principios Arquiteturais

1. **SQLite e a fonte de verdade.** Zustand e cache de UI. Supabase e backup.
2. **engine.ts e o UNICO decisor de tracking.** Nenhum outro arquivo muda estado.
3. **Effects queue desacopla decisoes de efeitos.** Engine enfileira, drain executa.
4. **Todo use case tem um unico ponto de entrada.** Voice, UI e Secretary AI chamam os mesmos usecases.
5. **Graceful degradation.** AI falha = app continua. Offline = app continua. SDK falha = recovery rehydrata.
6. **SOURCE_PRIORITY resolve conflitos.** voice(4) > manual/edited(3) > secretary(2) > gps/sdk(1).

---

## Documentos deste Diretorio

| # | Documento | Conteudo |
|---|-----------|----------|
| 00 | **VISAO-GERAL.md** | Este arquivo — overview + mapa de modulos |
| 01 | **MONOREPO.md** | Packages compartilhados, dependencias, auth dual-layer |
| 02 | **TRACKING-ENGINE.md** | State machine, effects queue, guards, error catalog |
| 03 | **SDK.md** | Transistorsoft config, modes, watchdog, headless, EAS build |
| 04 | **PERSISTENCE.md** | SQLite schema completo (12 tabelas), migrations v1+v2, rebuild |
| 05 | **SYNC.md** | Sync engine, mapping, conflict resolution, upload/download |
| 06 | **USECASES.md** | Camada de use cases, cada operacao |
| 07 | **AI.md** | @onsite/ai, Secretary, Voice, Worker Profile |
| 08 | **REPORTS.md** | Aggregate, HTML template, PDF, WhatsApp |
| 09 | **MONITORING.md** | Sentry, logger, error capture, SDK debug, retencao |
