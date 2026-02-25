# PLANO DE IMPLANTACAO — OnSite Eagle Ecosystem

> **Criado por:** Cerbero | **Data:** 2026-02-17
> **Escopo:** Arquitetura completa do ecossistema (3 apps, 15 packages, Supabase)
> **Prazo alvo:** 3 meses (solo developer)
> **Contexto:** Refatoracao de packages (Fases 0-8) CONCLUIDA. Este documento
> cobre a IMPLANTACAO da arquitetura de produto — telas, features, integracao.
> **Atualizado:** 2026-02-18 — Decisao arquitetural: Timekeeper-Web eliminado,
> web build via Expo (`expo export --platform web`). 3 apps em vez de 4.

---

## 0. VISAO GERAL

### O Que Estamos Construindo

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         OnSite Eagle Ecosystem                          │
│                                                                          │
│   ┌──────────────┐  ┌──────────────────────────┐  ┌───────────────────┐│
│   │   MONITOR    │  │       TIMEKEEPER          │  │     OPERATOR      ││
│   │  (foreman)   │  │       (worker)            │  │    (maquina)      ││
│   │  Next.js 16  │  │       Expo 52             │  │    Expo 52        ││
│   │  Desktop 1st │  │  ┌─────────┬────────────┐ │  │    Android only   ││
│   │              │  │  │ Android │  Web build  │ │  │                   ││
│   │              │  │  │  (APK)  │ (static)   │ │  │                   ││
│   └──────┬───────┘  └──┴────┬────┴────────────┘─┘  └───────┬───────────┘│
│          │                  │                               │           │
│          └──────────────────┼───────────────────────────────┘           │
│                             │                                           │
│                   ┌─────────┴──────────────────────┐                   │
│                   │        PACKAGES (15)            │                   │
│                   │  shared, auth, supabase, ui,    │                   │
│                   │  tokens, logger, utils, hooks,  │                   │
│                   │  ai, camera, export, voice,     │                   │
│                   │  timeline, agenda, media         │                   │
│                   └────────────────┬────────────────┘                   │
│                                    │                                    │
│                   ┌────────────────┴───────────────────┐                │
│                   │         SUPABASE                    │                │
│                   │  PostgreSQL + RLS + Realtime        │                │
│                   │  project: dbasazrdbtigrdntaehb      │                │
│                   └────────────────────────────────────┘                │
└──────────────────────────────────────────────────────────────────────────┘
```

### DECISAO ARQUITETURAL: Timekeeper-Web ELIMINADO (2026-02-18)

**Timekeeper-Web (Next.js)** foi eliminado como app separado. O Timekeeper Expo
ja suporta web build nativo:

```json
// apps/timekeeper/app.config.js
"web": { "bundler": "metro", "output": "static" }

// apps/timekeeper/package.json
"dev:web": "expo start --web",
"build": "expo export --platform web"
```

**Justificativa:**
- Timekeeper e 100% autenticado — nao precisa de SSR/SEO
- Expo Web exporta static HTML/JS — funciona para app logado
- Uma codebase em vez de duas (elimina duplicacao de componentes)
- Sem conflito React 18/19 (ambos builds usam React 18.3.1)
- Features exclusivas do Timekeeper-Web (reports, team QR) migram para o Timekeeper
- GPS desabilitado no web via `Platform.OS === 'web'` (condicional)

**Pipelines:**
- Android: `eas build --platform android` → APK
- Web: `expo export --platform web` → static site (deploy em Vercel/Cloudflare Pages)

**`apps/timekeeper-web/` permanece CONGELADO** — codigo existente pode ser usado
como referencia para migrar componentes para o Timekeeper Expo.
Nao recebe mais desenvolvimento ativo.

### Principio Arquitetural

**Packages sao logica pura. Apps sao UI.**

Todo package exporta funcoes que recebem `supabase` client como parametro.
Nenhum package cria client ou acessa env vars. Apps injetam suas dependencias.

```typescript
// CORRETO — package recebe client
export async function fetchMessages(supabase: SupabaseClient, options: FetchOptions) { ... }

// PROIBIDO — package cria client
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, ...);
```

### O Que JA Existe (nao refazer)

| Item | Status | Onde |
|------|--------|------|
| Auth core (login/signup/session) | Funcional | @onsite/auth + apps |
| Supabase mobile client | Funcional | @onsite/supabase/mobile |
| Supabase web client (SSR) | Funcional | @onsite/supabase/client+server |
| Photo upload pipeline | Funcional | @onsite/camera + Field/Inspect |
| AI photo validation | Funcional | @onsite/ai/eagle + Monitor API |
| PDF/Excel export | Funcional | @onsite/export |
| QR Scanner nativo | Funcional | @onsite/ui/native/QRScanner |
| Voice recording (web) | Funcional | @onsite/voice + Calculator |
| Schema canonico | Funcional | @onsite/supabase/schema |
| 90+ queries migradas | Concluido | Todos os apps |
| Monitor ChatTimeline (1537 loc) | Funcional | apps/monitor |
| Timekeeper Home/Timer | Funcional | apps/timekeeper |
| Operator Requests/Delivery | Funcional | apps/operator |

---

## 1. STACK POR COMPONENTE

### 1.1 Apps

| App | Framework | React | Build | Plataforma | Estado |
|-----|-----------|-------|-------|------------|--------|
| Monitor | Next.js 16.1.6 | 19.x | `next build` | Desktop browser | ~65% funcional |
| Timekeeper | Expo 52 + RN 0.76 | 18.3.1 | EAS Build (Android) + `expo export` (Web) | Android APK + Static Web | ~70% funcional |
| Operator | Expo 52 + RN 0.76 | 18.3.1 | EAS Build | Android APK | ~30% funcional |
| ~~Timekeeper-Web~~ | ~~Next.js 16.1.6~~ | ~~19.x~~ | ~~`next build`~~ | ~~Responsivo~~ | **ELIMINADO** — web build do Timekeeper Expo |

### 1.2 Packages — Stack e Exports

| Package | Runtime | Exports | Peer Deps |
|---------|---------|---------|-----------|
| `@onsite/shared` | TS puro | `.` | nenhum |
| `@onsite/auth` | TS + React | `.`, `./core`, `./mobile` | `@supabase/supabase-js`, `react` |
| `@onsite/supabase` | TS + Next.js | `.`, `./client`, `./server`, `./middleware`, `./mobile`, `./schema` | `@supabase/ssr`, `next` (optional) |
| `@onsite/ui` | React | `.`, `./web`, `./native`, `./theme` | `react`, `expo-camera` (optional) |
| `@onsite/tokens` | TS puro | `.`, `./tailwind` | nenhum |
| `@onsite/logger` | TS puro | `.` | nenhum |
| `@onsite/utils` | TS puro | `.`, `./cn`, `./format`, `./uuid`, `./export` | nenhum |
| `@onsite/hooks` | React | `.`, `./web` | `react`, `@onsite/supabase` |
| `@onsite/ai` | TS puro | `.`, `./specialists/*` | nenhum |
| `@onsite/camera` | TS puro | `.` | `@supabase/supabase-js` |
| `@onsite/export` | TS (web) | `.`, `./pdf`, `./excel`, `./csv`, `./text` | `jspdf` (optional), `xlsx` (optional) |
| `@onsite/voice` | TS + React | `.`, `./consent`, `./server`, `./usage`, `./recorder` | `react` (optional), `@supabase/supabase-js` |
| `@onsite/timeline` | TS puro | `.`, `./data`, `./constants` | `@supabase/supabase-js` |
| `@onsite/agenda` | TS puro | `.`, `./data`, `./constants` | `@supabase/supabase-js` |
| `@onsite/media` | TS puro | `.`, `./upload` | `@supabase/supabase-js` |

### 1.3 Supabase

| Servico | Uso |
|---------|-----|
| PostgreSQL | Banco principal, RLS, views |
| Auth | Email/password, sessions, JWT |
| Realtime | Timeline broadcasts (egl_messages) |
| Storage | Fotos (egl-media), exports (tmk-exports), avatares (core-avatars) |
| Edge Functions | (futuro) AI processing, webhooks |

### 1.4 APIs Externas (futuro)

| API | Uso | App |
|-----|-----|-----|
| Gmail API (OAuth) | Ler emails do foreman, extrair eventos | Monitor |
| Microsoft Graph (OAuth) | Outlook integration | Monitor |
| OpenAI / Anthropic | AI mediation, photo validation | All (via Edge Functions) |
| Google Maps | Geofence visualization | Timekeeper (web build) |
| Weather API | External events (snow days) | Monitor |

---

## 2. ARQUITETURA DE TELAS

### 2.1 Monitor (Foreman — Desktop-first)

```
Sidebar (sempre visivel):
  Logo OnSite Eagle
  Busca global
  Lista de Jobsites (accordion)
  Settings

Rotas:
  /                       → Overview (stats cards + site grid)
  /site/[id]              → Site Detail
    Tab: Lots             → Grid visual de lotes com status colorido
    Tab: Schedule         → @onsite/agenda (site-level)
    Tab: Timeline         → @onsite/timeline (site-level feed)
    Tab: Team             → Workers assigned, performance
    Tab: Documents        → Plans, PDFs, shared files
    Tab: Payments         → Work Completion Sheet (marcos de pagamento por fase)
    Tab: Email AI         → Gmail/Outlook parsed events (FUTURO)
  /site/[id]/lot/[lotId]  → Lot Detail
    Section: Timeline     → @onsite/timeline (per-house)
    Section: Photos       → Galeria + upload (camera se web)
    Section: Schedule     → @onsite/agenda (per-house)
    Section: Documents    → Plans assigned to this house
    Section: Materials    → Material requests/deliveries
    Section: Payments     → Payment status por fase desta casa
    Section: Team         → Workers on this house
  /settings               → Profile, Notifications, Link Workers, New Jobsite

Floating: AI Assistant (voice + text input)
```

**O que ja existe no Monitor:**
- Site grid com SVG map
- Lot detail com ChatTimeline (WhatsApp-style, 1537 loc)
- Photo gallery + AI validation
- AI copilot
- Team management

**O que falta no Monitor:**
- Tab Schedule (agenda)
- Tab Documents
- Tab Payments (work completion sheet — marcos de pagamento)
- Tab Email AI
- Lot Section: Materials
- Lot Section: Payments per-house
- Lot Section: Schedule per-house
- Settings completo

### 2.2 Timekeeper Expo (Worker — Mobile)

```
Bottom Tabs (5):
  Home          → Timer + calendario + FAB mic (JA EXISTE)
  Jobsites      → Mapa + geofences (JA EXISTE)
  Timeline      → Feed WhatsApp-style → @onsite/timeline (NOVO — placeholder criado)
  Plans+Agenda  → Sub-toggle no topo (NOVO — placeholder criado)
    Plans       → Plantas recebidas, viewer PDF, upload fotos
    Agenda      → Agenda do site (view-only) → @onsite/agenda
  Settings      → Profile, Crew/QR, Preferences, Sign Out (JA EXISTE)

Modals (ja existem):
  voice, manual-entry, day-detail, add-location, share-qr, scan-qr
```

**O que ja existe no Timekeeper:**
- Home com timer funcional, tracking GPS
- Geofences com mapa
- Settings com QR sharing
- Estrutura de tabs (5 tabs configuradas)

**O que falta no Timekeeper:**
- Timeline funcional (hoje e placeholder)
- Plans viewer (PDF/imagem)
- Agenda viewer (calendario)
- Push notifications
- Offline queue

### 2.3 ~~Timekeeper-Web~~ → Timekeeper Web Build

> **ELIMINADO como app separado.** O Timekeeper Expo compila para web via
> `expo export --platform web`. Mesma codebase, mesmo React 18, mesmas telas.

**Diferenca no web build:**
- GPS desabilitado (`Platform.OS === 'web'` → sem auto clock-in/out)
- Entrada manual de horas e o modo primario
- Camera usa `<input type="file">` em vez de `expo-camera`
- Maps usa React Native Maps web adapter ou fallback HTML

**Features que migram do antigo Timekeeper-Web para o Timekeeper Expo:**
- Reports semanal/mensal (ja existe no Timekeeper, expandir)
- QR code sharing (ja existe no Timekeeper, manter)
- Manual entry (criar modal ou tela)

**O app `apps/timekeeper-web/` permanece CONGELADO como referencia.**

### 2.4 Operator Expo (Maquinista — Mobile only)

```
Bottom Tabs (4):
  Dashboard    → Stats + actividade recente (JA EXISTE)
  Requests     → Lista pedidos + detail + delivery (JA EXISTE)
  Timeline     → Feed do site → @onsite/timeline (NOVO — placeholder criado)
  Agenda+Prof  → Sub-toggle (NOVO — placeholder criado)
    Agenda     → Entregas do dia, agenda site
    Profile    → Dados, site assignment, settings, sign out
```

**O que ja existe no Operator:**
- Dashboard com stats
- Request list + detail + delivery flow
- Estrutura de tabs (4 tabs configuradas)

**O que falta no Operator:**
- Timeline funcional
- Agenda viewer
- Profile screen
- Push notifications

---

## 3. SISTEMAS COMPARTILHADOS

### 3.0 ESTRATEGIA DE EXTRACAO: Monitor → Package → Todos os Apps

> **Decisao 2026-02-18:** A abordagem de implementacao e EXTRAIR do Monitor
> para packages, depois RE-CONSUMIR em todos os apps (incluindo o proprio Monitor).

```
FONTE:  apps/monitor/src/components/ChatTimeline.tsx (1537 loc)
        │
        │  PASSO 1: Extrair data layer + types + constants
        ▼
PACKAGE: packages/timeline/src/
        ├── types.ts       — TimelineMessage, SenderType, Attachment, AI types
        ├── data.ts        — fetchMessages(), sendMessage(), subscribeToMessages()
        ├── constants.ts   — PHASE_COLORS, SENDER_CONFIG, EVENT_TYPE_CONFIG
        └── index.ts       — Re-exports
        │
        │  PASSO 2: Cada app consome o package, renderiza com sua propria UI
        ▼
APPS:   Monitor         → ChatTimeline.tsx refatorado (usa @onsite/timeline + UI Tailwind/Lucide)
        Timekeeper      → TimelineFeed.tsx (usa @onsite/timeline + UI React Native)
        Operator        → TimelineFeed.tsx (usa @onsite/timeline + UI React Native)
```

**O que vive no package (logica pura, sem UI):**
- Types: `TimelineMessage`, `SenderType`, `MessageAttachment`, `AIMediationInput/Result`
- Data: `fetchMessages()`, `sendMessage()`, `subscribeToMessages()`, `groupMessagesByDate()`
- Constants: `PHASE_COLORS`, `SENDER_CONFIG`, `EVENT_TYPE_CONFIG`
- Helpers: `formatMessageTime()`, `formatDateDivider()`, `fetchMessageCount()`

**O que vive em cada app (UI especifica):**
- Monitor: ChatTimeline.tsx com AI analysis, document viewer, photo upload, copilot suggestions (features do supervisor)
- Timekeeper/Operator: TimelineFeed.tsx com FlatList invertido, MessageBubble, MessageInput (features do worker)

**O package @onsite/timeline ja tem a estrutura correta** (criado pelo Codex).
O passo seguinte e reconciliar com as features ricas do Monitor ChatTimeline.

### 3.1 Timeline AI-Mediated (@onsite/timeline)

**Conceito:** Ninguem conversa diretamente. Todo texto vai para AI que interpreta
e cria um evento tipado. E um WhatsApp sem chat — e um feed de eventos inteligente.

```
Fluxo:
  User digita: "Preciso de 50 sheets de drywall na casa 12"
    → @onsite/ai/mediator interpreta
    → Cria evento: { type: 'material_request', items: [{name: 'drywall', qty: 50}], house: 12 }
    → Insere em egl_messages
    → Supabase Realtime dispara
    → Monitor: ve alerta no painel
    → Operator: ve pedido na tab Requests
    → Timekeeper: ve update no feed
```

**Tabela:** `egl_messages` (ja existe no Supabase)

**Campos principais:**
```sql
id uuid PK
site_id uuid FK → egl_sites
house_id uuid FK → egl_houses (nullable — mensagem pode ser site-level)
sender_id uuid FK → core_profiles
sender_type varchar  -- 'worker' | 'supervisor' | 'operator' | 'ai' | 'system'
content text        -- texto original do usuario
ai_interpretation jsonb  -- resultado da AI (event_type, entities, confidence)
event_type varchar  -- 'material_request' | 'alert' | 'status_update' | 'note' | etc.
attachments jsonb   -- fotos, documentos
source_app varchar  -- 'monitor' | 'timekeeper' | 'operator'
created_at timestamptz
```

**Package @onsite/timeline — Funcoes:**

```typescript
// data.ts — Funcoes de dados (pure, recebem supabase client)

fetchMessages(supabase, { site_id, house_id?, limit?, before? })
  → SELECT * FROM egl_messages WHERE site_id = ? ORDER BY created_at DESC

sendMessage(supabase, { site_id, house_id?, content, sender_type, attachments?, source_app })
  → INSERT INTO egl_messages + trigger AI mediation (Edge Function ou client-side)

subscribeToMessages(supabase, { site_id, house_id? }, callback)
  → supabase.channel('timeline:site_id').on('postgres_changes', ...).subscribe()
  → Retorna unsubscribe function

groupMessagesByDate(messages: TimelineMessage[])
  → Agrupa por dia para renderizar dividers ("Hoje", "Ontem", "14 fev")

formatMessageTime(date: Date)
  → "14:32" ou "2:32 PM" conforme preferencia do user

formatDateDivider(date: Date)
  → "Hoje" | "Ontem" | "14 de fevereiro"
```

**Diretriz de codificacao:**
- A **logica** vive em `@onsite/timeline/data.ts` (pure TS)
- A **UI** vive em cada app:
  - Monitor: `ChatTimeline.tsx` ja existe (1537 loc) — REFERENCIA
  - Timekeeper: criar `src/screens/timeline/TimelineFeed.tsx` (RN)
  - Timekeeper-Web: criar `components/TimelineFeed.tsx` (React web)
  - Operator: criar `src/screens/timeline/TimelineFeed.tsx` (RN)
- Apps nativos usam `FlatList` com `inverted` para scroll WhatsApp-style
- Apps web usam `div` com `flex-direction: column-reverse`
- Realtime: todos os apps fazem `subscribeToMessages` no mount

### 3.2 Agenda (@onsite/agenda)

**Conceito:** Calendario do site compartilhado. Foreman cria eventos no Monitor,
workers veem no Timekeeper/Operator. Dois niveis: site-level e house-level.

**Tabela:** `egl_external_events` (ja existe) + `egl_schedule_phases` (ja existe)

**Package @onsite/agenda — Funcoes:**

```typescript
// data.ts

fetchAgendaEvents(supabase, { site_id, house_id?, start_date, end_date })
  → SELECT * FROM egl_external_events WHERE site_id = ? AND event_date BETWEEN ? AND ?
  → Combina com egl_schedule_phases deadlines

fetchPhaseDeadlines(supabase, { site_id, start_date, end_date })
  → SELECT sp.*, s.house_id FROM egl_schedule_phases sp
    JOIN egl_schedules s ON s.id = sp.schedule_id
    WHERE s.house_id IN (SELECT id FROM egl_houses WHERE site_id = ?)

createAgendaEvent(supabase, { site_id, house_id?, event_type, title, event_date, ... })
  → INSERT INTO egl_external_events
  → (Apenas Monitor/supervisor pode criar — RLS garante)

buildDaySummaries(events: AgendaEvent[])
  → Agrupa por dia, conta por tipo, retorna AgendaDaySummary[]
```

**24 tipos de evento:**
weather_snow, weather_rain, weather_cold, weather_heat, weather_wind,
inspection_scheduled, inspection_passed, inspection_failed, inspection_cancelled,
material_ordered, material_delivered, material_delayed,
worker_absent, worker_started, worker_completed,
phase_started, phase_completed, phase_blocked,
permit_applied, permit_approved, permit_delayed,
holiday, meeting, general_note

**Diretriz de codificacao:**
- Agenda e **read-only** para workers (Timekeeper, Operator)
- Apenas **supervisors** podem criar eventos (Monitor)
- Views: day, week, month — cada app implementa conforme sua UI
- Native: usar `@onsite/ui/native/Calendar` (ja existe)
- Web: usar `@onsite/ui/web/Calendar` (ja existe)
- Dados vem do mesmo `fetchAgendaEvents` — UI e que muda

### 3.3 Media Pipeline (@onsite/media)

**Conceito:** Upload de fotos, documentos, plans. Centralizado com metadata rica
para treinamento do Prumo.

**Tabela:** `egl_photos` (fotos), Storage buckets (arquivos)

**Package @onsite/media — Funcoes:**

```typescript
// upload.ts

buildStoragePath({ bucket, site_id, house_id?, context?, filename })
  → "{site_id}/{house_id}/{timestamp}_{random}_{filename}"

uploadFile(supabase, { bucket, path, file, contentType })
  → supabase.storage.from(bucket).upload(path, file)
  → Retorna { url, path, error }

// types.ts

BUCKETS = {
  EAGLE_MEDIA: 'egl-media',        // Fotos de lotes
  EAGLE_REPORTS: 'egl-reports',     // PDFs gerados
  TMK_EXPORTS: 'tmk-exports',      // Exports de horas
  CCL_AUDIO: 'ccl-audio',          // Gravacoes de voz
  SHP_PRODUCTS: 'shp-products',    // Imagens de produtos
  CORE_AVATARS: 'core-avatars',    // Avatares
}
```

**Diretriz de codificacao:**
- Fotos de construcao SEMPRE passam por `@onsite/camera` (metadata Prumo)
- Documentos/plans usam `@onsite/media/upload` diretamente
- Bucket paths seguem pattern: `{tenant_id}/{context_id}/{timestamp}_{random}_{file}`
- Thumbnails gerados server-side (futuro — Edge Function)

### 3.4 AI Mediation (@onsite/ai)

**Conceito:** AI interpreta mensagens de texto e cria eventos tipados.
Tambem valida fotos, gera relatorios, e extrai dados de emails.

**Package @onsite/ai — Specialists:**

```typescript
// specialists/mediator.ts (NOVO — a criar)
// Interpreta mensagens da timeline

TIMELINE_MEDIATION_PROMPT = `
Voce e um assistente de construcao. Analise a mensagem do trabalhador
e extraia: tipo de evento, entidades (material, quantidade, casa, fase),
urgencia, e uma versao normalizada da mensagem.

Tipos possiveis: material_request, status_update, issue_report, question,
note, delivery_confirmation, worker_update.

Responda em JSON: { event_type, entities, urgency, normalized_text, confidence }
`

analyzeMessage(text: string, context: { site_id, house_id?, sender_type })
  → Prompt + contexto → AI → MessageAnalysis

// specialists/email.ts (NOVO — a criar, FUTURO)
// Extrai eventos de emails do Gmail/Outlook

parseEmail(email: { subject, body, from, date })
  → Identifica: inspecao agendada, permit update, reuniao, entrega
  → Retorna: AgendaEvent[] + TimelineMessage[]

// specialists/eagle.ts (JA EXISTE)
// Valida fotos contra checklist da fase

buildPhotoValidationPrompt(phase, checklist_items)
buildPhotoAnalysisPrompt()
DOCUMENT_EXTRACTION_PROMPT
WEEKLY_REPORT_PROMPT

// specialists/calculator.ts (JA EXISTE)
VOICE_EXPRESSION_PROMPT  // v9
WHISPER_HINT

// specialists/monitor.ts (NOVO — a criar)
// AI copilot do Monitor — responde perguntas sobre o site

MONITOR_COPILOT_PROMPT = `
Voce e o assistente do supervisor de construcao.
Tem acesso a: progresso das casas, timeline de eventos, agenda, equipe.
Responda perguntas sobre o estado do site com dados reais.
`
```

**Diretriz de codificacao:**
- Prompts sao **strings exportadas** — facilita versionamento e teste
- Cada prompt tem `VERSION` number (ex: `EAGLE_PROMPT_VERSION = 1`)
- Funcoes de AI recebem texto e contexto, retornam structured data
- A chamada real para OpenAI/Anthropic acontece na **API route** do app (nao no package)
- Package so prepara o prompt + parseia o resultado

---

## 4. FASES DE IMPLANTACAO

### Diagrama de Dependencias

```
FASE 1: Timeline (core feature)
  │
  ├── FASE 2: Agenda (depende de UI patterns da Fase 1)
  │
  ├── FASE 3: Plans/Documents (depende de media upload)
  │
  └── FASE 4: Operator Completo (depende de Timeline + Agenda)

FASE 5: AI Mediation (complementa Timeline)

FASE 6: Push Notifications (complementa Timeline + Agenda)

FASE 7: Offline-First (Timekeeper + Operator)

FASE 8: Monitor Expansion (Schedule, Email AI, Reports)

FASE 9: Supabase Schema Migration (independente mas ultimo)
```

---

### FASE 1 — Timeline Funcional (4 apps)

> **Prioridade:** ALTA — e o sistema nervoso do ecossistema
> **Esforco estimado:** 2-3 semanas
> **Dependencias:** egl_messages table (JA EXISTE), Supabase Realtime

#### 1.1 Package @onsite/timeline — Completar data layer

**Status atual:** Types, constants, data functions escritas. Faltam testes e ajustes.

**Acao:**
- [ ] Revisar `fetchMessages` — garantir paginacao com cursor (before/after)
- [ ] Revisar `subscribeToMessages` — testar Realtime com filtro por site_id
- [ ] Adicionar `markAsRead(supabase, message_id, user_id)` (futuro)
- [ ] Adicionar `fetchMessageCount(supabase, site_id, since?)` para badges

**Stack:** TypeScript puro. Sem React. Sem platform-specific code.

#### 1.2 Timekeeper — Timeline Tab

**Arquivo:** `apps/timekeeper/app/(tabs)/timeline.tsx` (placeholder ja existe)

**Criar:**
- `apps/timekeeper/src/screens/timeline/TimelineFeed.tsx` — Componente principal
- `apps/timekeeper/src/screens/timeline/MessageBubble.tsx` — Cada mensagem
- `apps/timekeeper/src/screens/timeline/MessageInput.tsx` — Input bar
- `apps/timekeeper/src/screens/timeline/DateDivider.tsx` — Separador de data

**Stack:** React Native, FlatList inverted, @onsite/timeline/data

**Diretriz:**
```
Voce esta construindo o feed de Timeline do Timekeeper.
E um FlatList invertido (como WhatsApp).
Use @onsite/timeline/data para fetchMessages e subscribeToMessages.
O supabase client vem de @onsite/supabase/mobile (ja configurado no app).
As cores vem de @onsite/tokens.
Use sender_type para cor do bubble (SENDER_CONFIG de @onsite/timeline/constants).
O input bar envia texto via sendMessage() — AI interpreta server-side.
Supabase Realtime faz o feed atualizar automaticamente.
REFERENCIA: apps/monitor/src/components/ChatTimeline.tsx (1537 loc).
Copie a logica, adapte a UI para React Native.
```

**Funcoes usadas:**
```typescript
import { fetchMessages, sendMessage, subscribeToMessages, groupMessagesByDate } from '@onsite/timeline/data';
import { SENDER_CONFIG, EVENT_TYPE_CONFIG } from '@onsite/timeline/constants';
import type { TimelineMessage } from '@onsite/timeline';
```

#### ~~1.3 Timekeeper-Web — ELIMINADO~~

> Timekeeper-Web nao existe mais como app separado.
> O web build do Timekeeper Expo renderiza as mesmas telas via React Native Web.
> O TimelineFeed.tsx do Timekeeper funciona tanto no Android quanto no web build.

#### 1.4 Operator — Timeline Tab

**Arquivo:** `apps/operator/app/(tabs)/timeline.tsx` (placeholder ja existe)

**Criar:**
- `apps/operator/src/screens/timeline/TimelineFeed.tsx`

**Stack:** React Native, FlatList inverted

**Diretriz:**
```
Identico ao Timekeeper Timeline, mas com filtro:
Operator ve APENAS mensagens do site onde esta assigned.
E ve destaque em mensagens tipo 'material_request' e 'delivery'.
Use cores do Operator (purple accent #5856D6).
```

#### 1.5 Monitor — Ja funciona

O Monitor ja tem `ChatTimeline.tsx` (1537 loc) funcionando.
**Acao:** Migrar imports para usar `@onsite/timeline` types (se ainda nao usa).

---

### FASE 2 — Agenda Funcional

> **Prioridade:** ALTA — workers precisam ver o calendario do site
> **Esforco estimado:** 1-2 semanas
> **Dependencias:** FASE 1 (patterns de UI), egl_external_events + egl_schedule_phases (JA EXISTEM)

#### 2.1 Package @onsite/agenda — Completar data layer

**Status atual:** Types, constants, data functions escritas. Faltam ajustes.

**Acao:**
- [ ] Revisar `fetchAgendaEvents` — garantir join correto com egl_schedule_phases
- [ ] Adicionar `fetchUpcomingDeadlines(supabase, site_id, days_ahead)` — para widget
- [ ] Adicionar filtro por `event_category` (weather, inspection, material, etc.)

#### 2.2 Timekeeper — Agenda dentro de Plans+Agenda tab

**Arquivo:** `apps/timekeeper/app/(tabs)/plans.tsx` (placeholder com sub-toggle ja existe)

**Criar:**
- `apps/timekeeper/src/screens/agenda/AgendaView.tsx` — Month view com Calendar native
- `apps/timekeeper/src/screens/agenda/DayEvents.tsx` — Lista de eventos do dia

**Stack:** React Native, @onsite/ui/native/Calendar, @onsite/agenda/data

**Diretriz:**
```
Voce esta construindo a aba Agenda (dentro do sub-toggle Plans+Agenda).
Worker ve agenda do site em modo READ-ONLY.
Use @onsite/ui/native/Calendar para o grid de mes.
Ao tocar num dia, mostra lista de eventos daquele dia abaixo do calendario.
Cores por tipo de evento vem de AGENDA_EVENT_CONFIG (@onsite/agenda/constants).
Dados de @onsite/agenda/data.fetchAgendaEvents().
O site_id vem do geofence ativo ou selecao do user (context store).
```

#### ~~2.3 Timekeeper-Web — ELIMINADO~~

> Agenda do Timekeeper web build usa o mesmo componente AgendaView do mobile
> via React Native Web. Nao precisa de implementacao separada.

#### 2.4 Operator — Agenda

**Arquivo:** `apps/operator/app/(tabs)/profile.tsx` (sub-toggle Agenda+Profile)

**Acao:** Criar `AgendaView` similar ao Timekeeper, com foco em entregas do dia.

#### 2.5 Monitor — Schedule Tab

**Arquivo:** `apps/monitor/src/components/site/ScheduleTab.tsx` (a criar)

**Diretriz:**
```
Monitor e o UNICO app que pode CRIAR eventos de agenda.
Schedule tab mostra Gantt chart simplificado + calendar view.
Gantt: casas como linhas, fases como barras, estado atual com cores.
Calendar: eventos do site com CRUD completo.
CRUD: criar, editar, deletar eventos via createAgendaEvent().
```

---

### FASE 3 — Plans e Documents

> **Prioridade:** MEDIA — workers precisam ver plantas do site
> **Esforco estimado:** 1-2 semanas
> **Dependencias:** @onsite/media (ja tem types e upload)

#### 3.1 Package @onsite/media — Completar

**Acao:**
- [ ] Adicionar `fetchDocuments(supabase, { site_id, house_id?, type? })`
- [ ] Adicionar `fetchPlans(supabase, { site_id, house_id? })`
- [ ] Adicionar types: `ConstructionPlan`, `Document` (ja definidos em types.ts)

**Tabela associada:** `egl_scans` (plans) + Storage bucket `egl-media`

#### 3.2 Timekeeper — Plans dentro de Plans+Agenda tab

**Criar:**
- `apps/timekeeper/src/screens/plans/PlansViewer.tsx` — Lista de plans do site
- `apps/timekeeper/src/screens/plans/PlanDetail.tsx` — Viewer PDF/imagem fullscreen

**Stack:** React Native, `react-native-pdf` ou `expo-web-browser` para PDFs

**Diretriz:**
```
Voce esta construindo a aba Plans (dentro do sub-toggle Plans+Agenda).
Worker recebe plans distribuidos pelo foreman.
Lista de plans: thumbnail + nome + data.
Tap: abre viewer fullscreen (PDF ou imagem).
Worker pode fazer upload de fotos associadas a um plan (achados no campo).
Upload usa @onsite/camera para metadata Prumo-ready.
```

#### ~~3.3 Timekeeper-Web — ELIMINADO~~

> Plans do Timekeeper web build usa o mesmo componente PlansViewer do mobile.

#### 3.4 Monitor — Documents Tab

**Criar:**
- `apps/monitor/src/components/site/DocumentsTab.tsx` — CRUD de documents
- `apps/monitor/src/components/lot/DocumentsSection.tsx`

**Diretriz:**
```
Monitor pode UPLOAD + ASSIGN documents a sites e casas.
Drag-and-drop de PDF/imagens.
Assign: seleciona casas que recebem o document.
Workers veem esses documents na aba Plans.
```

---

### FASE 4 — Operator Completo

> **Prioridade:** MEDIA — operator precisa funcionar end-to-end
> **Esforco estimado:** 1 semana
> **Dependencias:** FASE 1 (Timeline), FASE 2 (Agenda)

#### 4.1 Profile Screen

**Criar:** `apps/operator/src/screens/Profile.tsx`

**Conteudo:**
- Dados do perfil (nome, foto, trade)
- Site assignment (qual site esta operando)
- Machine info (qual maquina opera)
- Settings (notifications, language)
- Sign Out

#### 4.2 Dashboard Enhancements

**Melhorar:** `apps/operator/app/index.tsx`

- Cards: pedidos pendentes, entregas hoje, materiais em transito
- Recent activity: ultimas 5 acoes
- Quick actions: "Confirmar entrega", "Ver pedidos"

#### 4.3 Request ↔ Timeline Integration

**Diretriz:**
```
Quando operator confirma uma entrega, automaticamente cria
evento na timeline: { type: 'delivery_confirmed', ... }.
Quando um material_request chega na timeline, aparece
como item na lista de Requests tambem.
Duas views, mesma data.
```

---

### FASE 5 — AI Mediation

> **Prioridade:** MEDIA-ALTA — transforma texto em eventos tipados
> **Esforco estimado:** 1-2 semanas
> **Dependencias:** FASE 1 (Timeline funcional)

#### 5.1 Criar AI Mediator

**Criar:** `packages/ai/src/specialists/mediator.ts`

**Funcoes:**
```typescript
// Prompt para interpretar mensagens de texto
export const MEDIATION_PROMPT = `...`;
export const MEDIATION_PROMPT_VERSION = 1;

// Prepara prompt com contexto
export function buildMediationPrompt(
  message: string,
  context: { site_name: string, houses: string[], sender_role: string }
): string;

// Parseia resposta da AI
export function parseMediationResult(aiResponse: string): MessageAnalysis;
```

#### 5.2 API Route para AI Mediation

**Opcao A:** Edge Function no Supabase (preferido — closer to data)
**Opcao B:** API Route no Monitor (mais facil de implementar agora)

**Recomendacao:** Comecar com Opcao B, migrar para Opcao A depois.

**Criar:** `apps/monitor/app/api/timeline/mediate/route.ts`

```typescript
// POST /api/timeline/mediate
// Body: { message: string, site_id: string, house_id?: string }
// Response: { event_type, entities, urgency, normalized_text, confidence }
//
// Stack: Next.js API Route + OpenAI/Anthropic SDK
// Usa: @onsite/ai/specialists/mediator.ts para prompt
// Insere resultado em egl_messages via Supabase server client
```

#### 5.3 Client-side Integration

**Diretriz:**
```
Quando user envia mensagem na Timeline:
1. sendMessage() insere mensagem "raw" em egl_messages
2. Client chama API /timeline/mediate com a mensagem
3. API interpreta e ATUALIZA a row com ai_interpretation
4. Realtime propaga a atualizacao para todos os clients
5. UI mostra o evento tipado (material_request com icone, etc.)

Se AI falha → mensagem aparece como 'note' generico (fallback seguro).
```

---

### FASE 6 — Push Notifications

> **Prioridade:** MEDIA — alertas precisam chegar quando app esta fechado
> **Esforco estimado:** 1 semana
> **Dependencias:** FASE 1 (Timeline gera eventos)

#### 6.1 Setup Firebase Cloud Messaging (FCM)

**Stack:** `expo-notifications` (Expo) + FCM

**Acao:**
- [ ] Configurar FCM no console Google
- [ ] Adicionar `expo-notifications` ao Timekeeper e Operator
- [ ] Salvar push_token em `core_devices` (campo ja existe)

#### 6.2 Trigger Logic

**Onde:** Edge Function ou webhook no Supabase

**Triggers:**
| Evento | Quem recebe push |
|--------|-----------------|
| material_request | Operator do site |
| delivery_confirmed | Supervisor (Monitor) |
| issue_report (high/critical) | Supervisor |
| inspection_scheduled | Workers da casa |
| phase_completed | Supervisor |
| worker_arrived/departed | Supervisor |

**Diretriz:**
```
Push notifications sao CONSEQUENCIA de eventos na timeline.
O trigger escuta egl_messages INSERT via Supabase Database Webhook.
Consulta core_devices para push_tokens dos destinatarios.
Envia via FCM.
```

---

### FASE 7 — Offline-First (Timekeeper + Operator)

> **Prioridade:** ALTA para producao — sites de construcao tem sinal ruim
> **Esforco estimado:** 2-3 semanas (complexo)
> **Dependencias:** Funcionalidades basicas funcionando online

#### 7.1 Estrategia

**Abordagem:** Queue local com sync automatico quando online.

```
┌─────────────────┐     ┌─────────────┐     ┌──────────┐
│  User Action     │ →  │  Local Queue │ →  │ Supabase  │
│  (write)         │     │  (AsyncStorage/  │  │ (remote)  │
│                  │     │   SQLite)    │     │           │
└─────────────────┘     └──────┬──────┘     └──────────┘
                               │
                         ┌─────┴─────┐
                         │  NetInfo   │
                         │  listener  │
                         └───────────┘
                         Online? → flush queue
                         Offline? → keep queuing
```

#### 7.2 Implementacao

**Criar:** `packages/shared/src/offline/` (ou novo package `@onsite/offline`)

```typescript
// queue.ts
interface QueueItem {
  id: string;
  table: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  data: Record<string, unknown>;
  created_at: string;
  retries: number;
}

enqueue(item: Omit<QueueItem, 'id' | 'created_at' | 'retries'>): void;
flush(supabase: SupabaseClient): Promise<FlushResult>;
getQueueSize(): number;
clearQueue(): void;

// sync.ts (React Native hook)
useOfflineSync(supabase: SupabaseClient): {
  isOnline: boolean;
  queueSize: number;
  lastSyncAt: Date | null;
  forceSync: () => Promise<void>;
}
```

**Diretriz:**
```
Offline-first e critico para Timekeeper e Operator.
Workers em canteiros de obra muitas vezes NAO tem sinal.

Prioridades de sync:
1. tmk_entries (horas) — CRITICO, nunca perder
2. egl_messages (timeline) — IMPORTANTE
3. egl_photos (fotos) — GRANDE, sync quando WiFi
4. Tudo mais — best effort

Conflitos: last-write-wins com timestamp.
Se houver conflito real (raro), criar entry em log_sync_conflicts
para resolucao manual.

Storage local: AsyncStorage para queue < 50 items.
SQLite (expo-sqlite) se precisar de mais capacidade.
Comecar com AsyncStorage — simplicidade.
```

---

### FASE 8 — Monitor Expansion

> **Prioridade:** MEDIA — foreman precisa de mais ferramentas
> **Esforco estimado:** 3-4 semanas (muitas features)
> **Dependencias:** FASES 1-5

#### 8.1 Schedule/Gantt View

**Criar:** `apps/monitor/src/components/site/ScheduleTab.tsx`

**Stack:** React 19, Tailwind, custom Gantt (ou lib `gantt-task-react`)

**Conteudo:**
- Gantt chart: casas como linhas, fases como barras
- Estado por cor: on_track (green), at_risk (amber), delayed (red)
- Drag-and-resize para ajustar datas (supervisor only)
- Integrado com egl_schedules + egl_schedule_phases

#### 8.2 Email AI Integration (FUTURO)

**Stack:** Gmail API (OAuth 2.0) + Microsoft Graph API

**Criar:**
- `packages/ai/src/email/oauth.ts` — OAuth flow (Google + Microsoft)
- `packages/ai/src/email/parser.ts` — Parse emails → events
- `apps/monitor/src/components/site/EmailTab.tsx`

**Diretriz:**
```
Email AI e uma feature FUTURA (nao para MVP).
O conceito: foreman conecta Gmail/Outlook, AI le emails,
extrai eventos (inspecoes, permits, reunioes),
e insere na timeline + agenda automaticamente.

OAuth scopes necessarios:
- Gmail: gmail.readonly
- Microsoft: Mail.Read

Fluxo:
1. Foreman autoriza OAuth no Settings
2. Cron job (Edge Function) le novos emails a cada 15min
3. @onsite/ai/email/parser analisa cada email
4. Se detecta evento → cria em egl_external_events + egl_messages
5. Foreman valida/corrige no Monitor
```

#### 8.3 AI Reports

**Funcionalidade:** Relatorio semanal gerado por AI.

**Ja existe:** `@onsite/ai/specialists/eagle.ts` tem `WEEKLY_REPORT_PROMPT`

**Criar:**
- `apps/monitor/app/api/reports/weekly/route.ts` — Gera relatorio
- `apps/monitor/src/components/reports/WeeklyReport.tsx` — Visualiza

**Stack:** API Route + OpenAI + @onsite/export/pdf para versao PDF

#### 8.4 Materials Section (Lot Detail)

**Criar:** `apps/monitor/src/components/lot/MaterialsSection.tsx`

**Conteudo:**
- Lista de material_requests para a casa
- Status: pending → in_transit → delivered
- Link com timeline (cada update gera evento)
- Integra com Operator delivery confirmations

#### 8.5 Payment Milestones — Work Completion Sheet (Tab no Monitor)

> **Conceito:** Casas sao pagas por fase. O sistema rastreia MARCOS de pagamento
> (fase concluida → pagamento devido) sem tocar em dinheiro. Foreman exporta
> planilha, preenche valores manualmente, paga via QuickBooks/Sage.

**Criar:**
- `apps/monitor/src/components/site/PaymentsTab.tsx` — Tabela de marcos do site inteiro
- `apps/monitor/src/components/lot/PaymentsSection.tsx` — Marcos por casa

**Stack:** React 19, Tailwind, @onsite/export (Excel/CSV), @onsite/agenda/data

##### Sistema de Worker Code (JA MIGRADO)

Todo usuario recebe um codigo unico e legivel automaticamente:

```
core_profiles.worker_code = "OSC-00001"  (OnSite Club + sequencial)
```

- Gerado por trigger no INSERT (sequence `worker_code_seq`)
- Migration aplicada: `add_worker_code_to_profiles`
- Index: `idx_profiles_worker_code`

##### Dois eixos de status por fase

```
EIXO 1 (trabalho):    pending → in_progress → completed → approved
EIXO 2 (pagamento):   not_due → due → approved_for_payment → exported
```

Campos a adicionar em `egl_schedule_phases` (quando a tabela for criada):

```sql
payment_status varchar DEFAULT 'not_due',
  -- not_due: fase nao concluida
  -- due: trabalho aprovado, pagamento pendente
  -- approved_for_payment: foreman marcou como "pode pagar"
  -- exported: incluido em planilha exportada
payment_approved_at timestamptz,
payment_approved_by uuid REFERENCES core_profiles(id),
payment_exported_at timestamptz,
payment_notes text
```

##### UI — PaymentsTab (site-level)

```
┌─────────────────────────────────────────────────────────────────────┐
│  PAYMENTS — Maple Ridge Phase 2                                      │
│                                                                      │
│  Filter: [All] [Due] [Exported]     [Export Sheet ↓]                │
│                                                                      │
│  ┌──────┬────────────┬──────────┬───────────┬───────────┬──────────┐│
│  │ Lot  │ Phase      │ SqFt     │ Worker    │ Status    │ Actions  ││
│  ├──────┼────────────┼──────────┼───────────┼───────────┼──────────┤│
│  │ 12   │ Foundation │ 1,850    │ OSC-00042 │ 🟡 Due    │ [✓] [⋯] ││
│  │ 12   │ Framing    │ 1,850    │ OSC-00042 │ 🟡 Due    │ [✓] [⋯] ││
│  │ 12   │ Drywall    │ 1,620    │ OSC-00078 │ ⬜ Not due │         ││
│  │ 15   │ Foundation │ 2,100    │ OSC-00042 │ 🟢 Export │          ││
│  └──────┴────────────┴──────────┴───────────┴───────────┴──────────┘│
│                                                                      │
│  Summary: 12 phases due | 8 exported | Total SqFt due: 14,800      │
└─────────────────────────────────────────────────────────────────────┘
```

**Acoes do foreman:**
- Checkbox: marca fase como "approved for payment" (batch select)
- Export Sheet: gera Excel/CSV com fases selecionadas (filtro por status)
- Ao exportar, status muda para "exported" automaticamente

##### Export — Work Completion Sheet

**Funcao:** `@onsite/export` ganha `generateWorkCompletionSheet()`

```typescript
// @onsite/export/src/completion-sheet.ts (NOVO)

interface CompletionSheetRow {
  lot_number: string;
  phase_name: string;
  sqft: number;
  worker_code: string;     // OSC-XXXXX
  worker_name: string;
  completed_at: Date;
  approved_at: Date | null;
  verification: 'gps_auth' | 'auth_only' | 'manual';
  // value: NÃO EXISTE — coluna vazia no export
}

function generateWorkCompletionSheet(
  rows: CompletionSheetRow[],
  options: { site_name: string, exported_by: string, format: 'excel' | 'csv' }
): Buffer | string;
```

**A planilha exportada tem:**
| Coluna | Fonte | Editavel? |
|--------|-------|-----------|
| Lot | egl_houses.lot_number | Nao |
| Phase | ref_eagle_phases.name | Nao |
| SqFt | egl_houses.sqft_total | Nao |
| Worker Code | core_profiles.worker_code | Nao |
| Worker Name | core_profiles.full_name | Nao |
| Completed | egl_schedule_phases.actual_end_date | Nao |
| Approved | payment_approved_at | Nao |
| Verified | Nivel de verificacao (GPS+Auth/Auth/Manual) | Nao |
| **Value ($)** | **VAZIA** | **SIM — preenchida pelo foreman no Excel** |
| Notes | payment_notes | Nao |

**A coluna Value ($) nunca e salva no banco.** Existe apenas no arquivo exportado.

##### Nivel de Verificacao

O campo "Verified" na planilha indica como a conclusao da fase foi comprovada:

| Nivel | Significado | Como detectar |
|-------|-------------|---------------|
| `gps_auth` | Worker bateu ponto no local via Timekeeper GPS | tmk_entries com geofence_id do site + integrity_hash |
| `auth_only` | Worker logado mas sem GPS confirmando presenca | Tem auth.uid() mas sem tmk_entries correspondente |
| `manual` | Foreman registrou manualmente | egl_schedule_phases.completed manualmente no Monitor |

Isso da credibilidade ao documento — e quase um **certificado de conclusao de obra**.

##### Diretriz de codificacao

```
Voce esta construindo a aba Payments do Monitor.
E uma tabela (table) com filtros e export — NAO e um dashboard com graficos.

Dados vem de:
  - egl_schedule_phases (status da fase + payment_status)
  - egl_schedules (link fase → casa)
  - egl_houses (lot_number, sqft_total)
  - core_profiles (worker_code, full_name)
  - ref_eagle_phases (nome da fase)

CRUD:
  - Foreman MARCA fases como "approved_for_payment" (batch)
  - Foreman EXPORTA planilha (Excel/CSV via @onsite/export)
  - Sistema marca como "exported" apos export

A coluna de valor monetario EXISTE APENAS no Excel exportado.
O banco de dados NUNCA armazena valores em dinheiro.
O app NAO e software financeiro — e um gestor de marcos de trabalho.
```

---

### FASE 9 — Supabase Schema Migration

> **Prioridade:** BAIXA para funcionalidade (views backward-compat existem),
> ALTA para governanca (codigo novo deve usar nomes canonicos)
> **Esforco estimado:** 2-3 semanas (cuidado extremo necessario)
> **Dependencias:** NENHUMA tecnica, mas fazer POR ULTIMO para nao quebrar nada

#### 9.1 Contexto

A DIRECTIVE 2026-02-01 definiu novos nomes para TODAS as tabelas:

```
app_timekeeper_entries    → tmk_entries
app_timekeeper_geofences  → tmk_geofences
app_timekeeper_projects   → tmk_projects
app_eagle_sites           → egl_sites
app_eagle_houses          → egl_houses
app_eagle_phase_photos    → egl_photos
app_eagle_house_progress  → egl_progress
app_eagle_timeline_events → egl_timeline
app_eagle_issues          → egl_issues
app_eagle_plan_scans      → egl_scans
app_shop_products         → shp_products
app_shop_orders           → shp_orders
(... 30+ tabelas total)
```

O codigo dos apps JA FOI MIGRADO (Fase 7 do REFACTOR_PLAN anterior — 90+ queries).
**Mas o banco ainda usa os nomes antigos com views de backward-compat.**

#### 9.2 Estrategia de Migracao

**PRINCIPIO: Zero downtime. Nenhum dado perdido.**

```
Fase A: Views → Tabelas Reais (rename)
  1. Para cada tabela: ALTER TABLE old_name RENAME TO new_name
  2. Criar view backward-compat: CREATE VIEW old_name AS SELECT * FROM new_name
  3. Testar: queries antigas continuam funcionando via view
  4. Atualizar RLS: policies na tabela renomeada

Fase B: Mover FKs
  1. Atualizar constraints que referenciam tabelas renomeadas
  2. Views que fazem JOIN precisam ser recriadas

Fase C: Limpar views legacy
  1. Apos confirmar que nenhum app usa nome antigo
  2. DROP VIEW IF EXISTS old_name CASCADE
```

#### 9.3 Ordem de Migracao (por risco)

**Grupo 1 — Baixo risco (tabelas sem FK apontando para elas):**
```sql
-- Logs e agregacoes (ninguem faz FK para elas)
ALTER TABLE app_logs RENAME TO core_app_logs;
ALTER TABLE log_errors RENAME TO ... ;  -- JA ESTA correto
ALTER TABLE log_events RENAME TO ... ;  -- JA ESTA correto
ALTER TABLE agg_platform_daily RENAME TO ... ;  -- JA ESTA correto

-- Billing
ALTER TABLE billing_products RENAME TO bil_products;
CREATE VIEW billing_products AS SELECT * FROM bil_products;

ALTER TABLE billing_subscriptions RENAME TO bil_subscriptions;
CREATE VIEW billing_subscriptions AS SELECT * FROM bil_subscriptions;

ALTER TABLE payment_history RENAME TO bil_payments;
CREATE VIEW payment_history AS SELECT * FROM bil_payments;

ALTER TABLE checkout_codes RENAME TO bil_checkout_codes;
CREATE VIEW checkout_codes AS SELECT * FROM bil_checkout_codes;
```

**Grupo 2 — Medio risco (tabelas com FKs mas isoladas por app):**
```sql
-- Shop (isolado, sem interdependencia)
ALTER TABLE app_shop_products RENAME TO shp_products;
ALTER TABLE app_shop_product_variants RENAME TO shp_variants;
ALTER TABLE app_shop_categories RENAME TO shp_categories;
ALTER TABLE app_shop_orders RENAME TO shp_orders;
ALTER TABLE app_shop_order_items RENAME TO shp_order_items;
ALTER TABLE app_shop_carts RENAME TO shp_carts;
-- + views backward-compat para cada

-- Calculator
ALTER TABLE app_calculator_calculations RENAME TO ccl_calculations;
ALTER TABLE app_calculator_templates RENAME TO ccl_templates;
-- + views
```

**Grupo 3 — Alto risco (core tables, muitas FKs):**
```sql
-- Admin (referenciado por logs)
ALTER TABLE admin_users RENAME TO core_admin_users;
ALTER TABLE admin_logs RENAME TO core_admin_logs;

-- Voice (referenciado por calculator)
ALTER TABLE voice_logs RENAME TO core_voice_logs;

-- Sharing (referenciado por RLS policies)
ALTER TABLE access_grants RENAME TO core_access_grants;
ALTER TABLE pending_tokens RENAME TO core_pending_tokens;

-- AI
ALTER TABLE argus_conversations RENAME TO core_ai_conversations;
```

**Grupo 4 — Maximo risco (tabelas com muitas FKs + RLS complexo):**
```sql
-- Timekeeper (3 tabelas, entries referenciada por logs, aggregations)
ALTER TABLE app_timekeeper_entries RENAME TO tmk_entries;
ALTER TABLE app_timekeeper_geofences RENAME TO tmk_geofences;
ALTER TABLE app_timekeeper_projects RENAME TO tmk_projects;

-- Eagle (9+ tabelas, rede complexa de FKs)
ALTER TABLE app_eagle_sites RENAME TO egl_sites;
ALTER TABLE app_eagle_houses RENAME TO egl_houses;
ALTER TABLE app_eagle_house_progress RENAME TO egl_progress;
ALTER TABLE app_eagle_phase_photos RENAME TO egl_photos;
ALTER TABLE app_eagle_timeline_events RENAME TO egl_timeline;
ALTER TABLE app_eagle_issues RENAME TO egl_issues;
ALTER TABLE app_eagle_plan_scans RENAME TO egl_scans;
```

#### 9.4 Checklist ANTES de cada migration

```
[ ] 1. Verificar FKs que apontam PARA a tabela (dependentes)
[ ] 2. Verificar views que referenciam a tabela
[ ] 3. Verificar RLS policies (precisam ser recriadas se tabela rename)
[ ] 4. Verificar triggers e functions que usam o nome
[ ] 5. Verificar indexes (vem junto com rename)
[ ] 6. Criar view backward-compat IMEDIATAMENTE apos rename
[ ] 7. Testar: SELECT via view antiga funciona?
[ ] 8. Testar: INSERT via tabela nova funciona?
[ ] 9. Testar: RLS permite/bloqueia corretamente?
```

#### 9.5 Novas Tabelas a Criar

Alem dos renames, algumas tabelas precisam ser criadas:

| Tabela | Proposito | Fase que usa |
|--------|-----------|-------------|
| `egl_documents` | Documentos/plans por site e casa | FASE 3 |
| `egl_material_requests` | Pedidos de material (normalizado) | FASE 4 |
| `core_push_tokens` | Tokens FCM separados de core_devices | FASE 6 |
| `sync_queue` | Fila offline para sync | FASE 7 |
| `sync_conflicts` | Conflitos detectados | FASE 7 |

**egl_documents:**
```sql
CREATE TABLE egl_documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id uuid NOT NULL REFERENCES egl_sites(id),
  house_id uuid REFERENCES egl_houses(id),  -- null = site-level
  uploaded_by uuid NOT NULL REFERENCES core_profiles(id),
  title varchar NOT NULL,
  description text,
  file_url text NOT NULL,
  file_type varchar NOT NULL,  -- 'pdf' | 'png' | 'jpg' | 'dwg'
  file_size_bytes int,
  thumbnail_url text,
  document_type varchar NOT NULL DEFAULT 'plan',  -- 'plan' | 'permit' | 'report' | 'photo' | 'other'
  organization_id uuid REFERENCES core_organizations(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS: members da org veem, supervisors+ fazem CRUD
ALTER TABLE egl_documents ENABLE ROW LEVEL SECURITY;
```

**egl_material_requests (normalizado de egl_messages):**
```sql
CREATE TABLE egl_material_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid REFERENCES egl_messages(id),  -- mensagem que originou
  site_id uuid NOT NULL REFERENCES egl_sites(id),
  house_id uuid REFERENCES egl_houses(id),
  requested_by uuid NOT NULL REFERENCES core_profiles(id),
  assigned_to uuid REFERENCES core_profiles(id),  -- operator
  items jsonb NOT NULL,  -- [{ name, quantity, unit, notes }]
  status varchar NOT NULL DEFAULT 'pending',  -- pending/approved/in_transit/delivered/cancelled
  priority varchar DEFAULT 'normal',  -- low/normal/high/urgent
  requested_at timestamptz DEFAULT now(),
  approved_at timestamptz,
  approved_by uuid REFERENCES core_profiles(id),
  delivered_at timestamptz,
  delivery_notes text,
  organization_id uuid REFERENCES core_organizations(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE egl_material_requests ENABLE ROW LEVEL SECURITY;
```

---

## 5. DIRETRIZ GERAL DE CODIFICACAO

### Para quem vai codar (voce, Claude, ou futuro dev):

#### 5.1 Imports — Sempre de packages

```typescript
// BOM — importa de package
import { fetchMessages } from '@onsite/timeline/data';
import { colors } from '@onsite/tokens';
import { createMobileClient } from '@onsite/supabase/mobile';
import type { TimelineMessage } from '@onsite/timeline';

// RUIM — importa de caminho relativo longo entre apps
import { fetchMessages } from '../../../packages/timeline/src/data';
```

#### 5.2 Supabase Client — Injecao de dependencia

```typescript
// BOM — funcao recebe client
export async function fetchData(supabase: SupabaseClient) {
  return supabase.from('egl_messages').select('*');
}

// RUIM — funcao cria client
import { createClient } from '@supabase/supabase-js';
export async function fetchData() {
  const supabase = createClient(process.env.URL!, process.env.KEY!);
  return supabase.from('egl_messages').select('*');
}
```

#### 5.3 Nomes de Tabela — Canonicos (DIRECTIVE 2026-02-01)

```typescript
// BOM
supabase.from('egl_messages').select('*');
supabase.from('tmk_entries').select('*');
supabase.from('core_profiles').select('*');

// RUIM — nomes legacy
supabase.from('app_timekeeper_entries').select('*');
supabase.from('profiles').select('*');
supabase.from('argus_conversations').select('*');
```

Use `TABLE_NAMES` de `@onsite/supabase/schema` quando possivel:
```typescript
import { TABLE_NAMES } from '@onsite/supabase/schema';
supabase.from(TABLE_NAMES.TMK_ENTRIES).select('*');
```

#### 5.4 Cores — De tokens, nunca hardcoded

```typescript
// React Native
import { colors } from '@onsite/tokens';
<View style={{ backgroundColor: colors.surface }} />

// Tailwind (Next.js) — ja configurado via @onsite/tokens/tailwind
<div className="bg-surface text-text-primary" />

// NUNCA
<View style={{ backgroundColor: '#F5B800' }} />
```

#### 5.5 Realtime — Pattern padrao

```typescript
// Hook pattern para Realtime
function useRealtimeMessages(supabase, siteId) {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    // Fetch initial
    fetchMessages(supabase, { site_id: siteId }).then(setMessages);

    // Subscribe
    const unsubscribe = subscribeToMessages(supabase, { site_id: siteId }, (newMsg) => {
      setMessages(prev => [newMsg, ...prev]);
    });

    return () => unsubscribe();
  }, [siteId]);

  return messages;
}
```

#### 5.6 Error Handling — Log + fallback, nunca crash

```typescript
import { logger } from '@onsite/logger';

try {
  const messages = await fetchMessages(supabase, options);
  return messages;
} catch (error) {
  logger.error('TIMELINE', 'Failed to fetch messages', { error, options });
  return []; // fallback seguro — tela vazia, nao crash
}
```

#### 5.7 Offline — Queue writes, cache reads

```typescript
// Write com queue
async function sendMessageOfflineAware(supabase, input) {
  if (isOnline) {
    return sendMessage(supabase, input);
  } else {
    enqueue({ table: 'egl_messages', operation: 'INSERT', data: input });
    return { ...input, id: generateUUID(), _queued: true };
  }
}

// Read com cache
async function fetchMessagesWithCache(supabase, options) {
  try {
    const fresh = await fetchMessages(supabase, options);
    await cache.set(`messages:${options.site_id}`, fresh);
    return fresh;
  } catch {
    return cache.get(`messages:${options.site_id}`) ?? [];
  }
}
```

---

## 6. CRONOGRAMA SUGERIDO (3 meses)

```
Semana  1-2:  FASE 1 — Timeline (Timekeeper + Operator + Monitor refactor)
Semana  3-4:  FASE 2 — Agenda (Timekeeper + Operator + Monitor)
Semana  4-5:  FASE 3 — Plans/Documents
Semana  6:    FASE 4 — Operator completo
Semana  7-8:  FASE 5 — AI Mediation
Semana  8:    FASE 6 — Push Notifications
Semana  9-10: FASE 7 — Offline-First
Semana 10-11: FASE 8 — Monitor expansion (Schedule, Reports, Payments)
Semana 12:    FASE 9 — Schema migration + polish

Buffer:       ~1 semana para bugs, ajustes, imprevistos
```

> **Nota:** Sem Timekeeper-Web separado, economizamos ~1 semana de duplicacao de UI.

### Prioridade se tempo apertar

Se nao der tempo de tudo em 3 meses, cortar neste order (de menos importante para mais):

1. **Cortar:** FASE 8.2 (Email AI) — feature futura, pode esperar
2. **Cortar:** FASE 8.1 (Gantt chart) — complexo, pode usar calendar simples
3. **Simplificar:** FASE 7 (Offline) — implementar so para tmk_entries, nao para tudo
4. **Simplificar:** FASE 5 (AI Mediation) — mensagens ficam como 'note' sem AI por enquanto
5. **NUNCA cortar:** FASES 1-4 — Timeline + Agenda + Plans + Operator sao o MVP

---

## 7. DECISOES TECNICAS REGISTRADAS

| Decisao | Escolha | Motivo |
|---------|---------|--------|
| Realtime engine | Supabase Realtime (postgres_changes) | Ja integrado, zero custo extra |
| AI provider | OpenAI (gpt-4o) | Ja em uso no Monitor, bom custo-beneficio |
| PDF viewer (native) | `react-native-pdf` ou `expo-web-browser` | Avaliar na hora |
| PDF viewer (web) | `<iframe>` embed | Simples, funciona |
| Offline storage | AsyncStorage (start), SQLite (scale) | Comecar simples |
| Push notifications | FCM via expo-notifications | Standard Expo |
| State management | Zustand (native), React Context (web) | Ja em uso nos apps |
| Gantt chart | Custom ou `gantt-task-react` | Avaliar na hora |
| Email OAuth | Google Identity Services + MSAL | Standards |
| Material requests | Tabela separada (egl_material_requests) | Normalizado > JSON blob |
| **Timekeeper-Web** | **ELIMINADO** — web build via Expo | Uma codebase, sem conflito React 18/19 |
| **Timeline extraction** | Monitor ChatTimeline → @onsite/timeline → todos os apps | Package como data layer, UI por app |
| **Timekeeper web deploy** | `expo export --platform web` → static site | Sem SSR necessario (app 100% autenticado) |

### 7.1 Avaliacao Codex (2026-02-18)

Codex (outro agente AI) tentou implementar o plano. Resultado: 232 arquivos tocados,
codigo funcional deletado, novos skeletons incompletos. Abaixo o que foi MANTIDO,
REVERTIDO, e o que precisa ser RECONCILIADO.

**MANTIDO (novo codigo util do Codex — permanece como untracked files):**

| Item | Onde | Qualidade |
|------|------|-----------|
| @onsite/timeline data layer | `packages/timeline/src/` | Bom — types, data, constants com adapter pattern |
| @onsite/agenda data layer | `packages/agenda/src/` | Bom — estrutura correta |
| @onsite/tokens | `packages/tokens/src/` | Bom — colors, spacing, typography extraidos |
| @onsite/voice | `packages/voice/src/` | Bom — consent, recorder, usage |
| @onsite/export | `packages/export/src/` | Bom — csv, excel, pdf, text |
| @onsite/logger | `packages/logger/src/` | Bom — structured logging |
| @onsite/camera | `packages/camera/src/` | Bom — upload, metadata, types |
| @onsite/media | `packages/media/src/` | Bom — upload, types |
| @onsite/ai | `packages/ai/src/` | Bom — core, specialists, whisper |
| Timekeeper tracking engine | `apps/timekeeper/src/tracking/` | Bom conceito — state machine IDLE→TRACKING→EXIT_PENDING |
| Timekeeper persistence layer | `apps/timekeeper/src/persistence/` | Bom — SQLite local storage |
| Timekeeper sync system | `apps/timekeeper/src/sync/` | Bom — upload/download/mapping |
| Timekeeper use cases | `apps/timekeeper/src/usecases/` | Bom — clean architecture |
| Timekeeper SDK layer | `apps/timekeeper/src/sdk/` | Bom — background geolocation abstraction |
| Timekeeper timeline screens | `apps/timekeeper/src/screens/timeline/` | Bom — consome @onsite/timeline |
| Timekeeper tab placeholders | `apps/timekeeper/app/(tabs)/timeline.tsx`, `plans.tsx` | Bom — rotas novas |
| Timekeeper modals | `apps/timekeeper/app/voice.tsx`, `manual-entry.tsx`, etc. | Bom — telas modais |
| Timekeeper app.config.js | `apps/timekeeper/app.config.js` | Bom — dynamic config para env vars |
| Operator tab structure | `apps/operator/app/(tabs)/` | Bom — 4 tabs com timeline |

**REVERTIDO (codigo original restaurado via git checkout):**

| Item | Motivo |
|------|--------|
| Todos os Timekeeper stores (9 arquivos) | Deletados sem substituto funcional |
| Todos os Timekeeper lib files (18 arquivos) | Codigo funcional que o app usa |
| Todos os Timekeeper components (12 arquivos) | UI funcional deletada |
| Todos os Timekeeper screens (11 arquivos) | Telas funcionais deletadas |
| Timekeeper tab screens e layouts | Reescritos com imports quebrados |
| Timekeeper package.json, tsconfig, babel, eas | Configuracoes alteradas indevidamente |
| Timekeeper Android resources e assets | Icons/splash trocados sem necessidade |
| Timekeeper supabase migrations | Deletadas sem motivo |
| Timekeeper docs | Documentacao util deletada |
| **TODOS os outros apps** (Analytics, Auth, Calculator, Dashboard, Field, Inspect, Monitor, Operator, Timekeeper-Web) | Mudancas nao autorizadas revertidas |
| **TODOS os packages existentes** (auth, hooks, shared, supabase, ui, utils) | Mudancas nao autorizadas revertidas |
| Root package.json e package-lock.json | Mudancas nao autorizadas revertidas |

**A RECONCILIAR (trabalho futuro):**

| Item | Acao Necessaria |
|------|----------------|
| Timekeeper novo vs antigo tracking engine | Novo engine (src/tracking/) e melhor arquitetura, mas referencia types inexistentes. Migrar gradualmente. |
| @onsite/timeline vs Monitor ChatTimeline | Reconciliar: package tem data layer bom, Monitor tem UI rica. Extrair data do Monitor para o package. |
| Timekeeper tab structure | Novo layout (5 tabs) e correto mas depende de stores reescritos. Implementar apos estabilizar. |
| Packages novos sem package.json no root | Adicionar ao turbo.json e root package.json quando ativar. |

---

## 8. REFERENCIAS

| Arquivo | O que contem |
|---------|-------------|
| `CLAUDE.md` | Identidade Cerbero, schema completo, RLS, diretivas |
| `memory/architecture.md` | Mapa de apps, tabs, packages, fluxos |
| `PIPELINES.md` | Build/deploy stack para todos os 10 apps |
| `apps/monitor/src/components/ChatTimeline.tsx` | REFERENCIA principal para Timeline UI (1537 loc) |
| `packages/timeline/src/` | Data layer da timeline (types, data, constants) |
| `packages/agenda/src/` | Data layer da agenda |
| `packages/media/src/` | Media upload types e funcoes |
| `packages/ai/src/specialists/` | AI prompts (eagle, calculator, timekeeper) |
| `packages/supabase/src/schema.ts` | TABLE_NAMES canonicos + interfaces |
| `apps/timekeeper-web/` | **CONGELADO** — referencia para migrar features para Timekeeper Expo |

---

## 9. NOTAS FINAIS

1. **Este documento e o guia principal.** Substitui o REFACTOR_PLAN.md anterior (fases 0-8 concluidas).

2. **Cada fase pode ser feita em sessao separada.** O Cerbero mantem contexto via CLAUDE.md + memory files.

3. **Muita coisa sera inventada na hora.** Este plano define o QUE e o COMO conceptual. Detalhes de implementacao (CSS exato, state management patterns, edge cases) serao decididos durante a codificacao.

4. **O usuario prefere rodar builds e deploys.** Claude modifica codigo, usuario builda (`npm run prebuild:clean && npm run android`).

5. **Anti-Duct-Tape continua valido.** Nunca sacrificar funcionalidade para "fazer passar". Sempre buscar a causa raiz.

6. **Prumo e o norte.** Cada foto, cada evento, cada interacao e training data futuro. Metadata rica. Schema versionado. Nada descartavel.

---

*Cerbero — Guardiao do Supabase OnSite*
*Documento criado: 2026-02-17*
