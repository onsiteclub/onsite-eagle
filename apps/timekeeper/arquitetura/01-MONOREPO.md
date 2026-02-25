# 01 — Integracao no Monorepo

**Status:** Implementado

---

## Estrutura Real

```
onsite-eagle/
├── packages/
│   ├── ai/                    ← Criado pelo Timekeeper v2
│   │   ├── src/
│   │   │   ├── core.ts        # callAI() → Edge Function ai-gateway
│   │   │   ├── whisper.ts     # transcribeAudio() → Edge Function ai-whisper
│   │   │   ├── types.ts       # AIRequest, AIResponse, WhisperResult, WorkerProfile
│   │   │   └── index.ts       # Re-exports
│   │   └── package.json       # @onsite/ai
│   │
│   ├── auth/
│   │   ├── src/
│   │   │   └── core.ts        ← Criado pelo Timekeeper v2
│   │   └── package.json       # @onsite/auth (exports ./core)
│   │
│   ├── logger/                ← Criado pelo Timekeeper v2
│   │   ├── src/
│   │   │   └── index.ts       # logger object + LogSink system
│   │   └── package.json       # @onsite/logger
│   │
│   ├── shared/
│   │   └── src/
│   │       └── types/
│   │           └── timekeeper.ts  ← Criado pelo Timekeeper v2
│   │
│   ├── api/                   # Queries Supabase (existente)
│   ├── hooks/                 # React hooks (existente)
│   ├── ui/                    # Componentes base (existente)
│   └── tokens/                # Design tokens (existente)
│
├── apps/
│   └── timekeeper/            ← App Expo
│
└── supabase/
    └── functions/             # Edge Functions (ai-gateway, ai-whisper NAO deployados)
```

---

## Package: @onsite/ai

Centraliza todas as chamadas de IA do ecossistema.

### Exports

```typescript
// core.ts
export async function callAI(
  request: AIRequest,
  supabaseClient: SupabaseClient,
): Promise<AIResponse>

// whisper.ts
export async function transcribeAudio(
  base64Audio: string,
  supabaseClient: SupabaseClient,
): Promise<WhisperResult | null>
```

### Tipos (types.ts)

```typescript
interface AIRequest {
  specialist: string;           // 'timekeeper:secretary', 'timekeeper:voice'
  context: Record<string, unknown>;
  messages?: Array<{ role: string; content: string }>;
}

interface AIResponse {
  action: string;
  data: Record<string, unknown>;
  response_text: string;
}

interface WhisperResult { text: string; language: string; duration: number; }

interface WorkerProfile {
  avg_entry: string; avg_exit: string;
  avg_shift_hours: number; avg_break_min: number;
  data_points: number;
  pattern: 'regular' | 'variable' | 'shift_work' | 'insufficient_data';
}
```

### Fallback

Se Edge Function falhar → `{ action: 'error', data: {}, response_text: 'AI temporarily unavailable.' }`

### Estado atual

- `ai-gateway`: NAO deployado
- `ai-whisper`: NAO deployado
- Todas as chamadas retornam fallback gracefully

---

## Package: @onsite/auth/core

Auth puro JS, sem React. Necessario para background tasks.

```typescript
export function initAuthCore(supabaseClient): void
export async function getUserId(): Promise<string | null>
export function getSupabaseClient(): SupabaseClient
```

| Consumidor | Motivo |
|-----------|--------|
| Headless task | Sem React, precisa userId |
| Watchdog | Background |
| Sync engine | Background |
| _layout.tsx | initAuthCore() no bootstrap |

---

## Package: @onsite/logger

Ring buffer in-memory + sinks. Tags: ENTER, EXIT, HEARTBEAT, WATCHDOG, SESSION, SYNC, AI, VOICE, REPORT, ERROR, BOOT, AUTH, GPS, DB, UI, NOTIFY. Sanitiza campos sensiveis. Console em `__DEV__`.

---

## Package: @onsite/shared (tipos)

`packages/shared/src/types/timekeeper.ts`: TrackingStatus, TrackingEvent, ActiveTracking, WorkSession, DaySummary, GeofenceLocation, AICorrection, EffectType, QueuedEffect, SyncStats, SOURCE_PRIORITY, ReportModel, ReportDay.

---

## O que fica DENTRO do app

tracking/, sdk/, persistence/, sync/, stores/, usecases/ — nunca viram packages.
