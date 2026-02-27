<!--
  @ai-rules
  1. NUNCA delete entradas de "Historico de Evolucao" — apenas ADICIONE novas com data.
  2. NUNCA delete entradas de "Decisoes de Arquitetura" — apenas ADICIONE.
  3. Ao fazer mudancas significativas (features, refactors, migracoes),
     SEMPRE adicione uma entrada ao Historico de Evolucao.
  4. Mantenha a tabela Tech Stack atualizada — atualize versoes quando mudarem.
  5. Este arquivo descreve O QUE o app e e COMO evoluiu.
     Para build/deploy, veja PIPELINE.md.
-->

# OnSite Timekeeper

> App mobile de ponto automatico por geofencing. Workers registram locais de trabalho e o app detecta entrada/saida via GPS, registrando horas em arquitetura offline-first.

## 1. Identidade

| Campo | Valor |
|-------|-------|
| **Nome** | OnSite Timekeeper |
| **Diretorio** | `apps/timekeeper` |
| **Proposito** | Auto clock-in/out por geofencing GPS. Worker registra locais de trabalho, app detecta quando chega/sai automaticamente. Suporta manual entry, reports com export (WhatsApp/email/PDF), timeline AI-mediated, agenda do site, e integracao com Eagle (lotes). Offline-first com SQLite + sync bidirecional para Supabase. |
| **Audiencia** | Trabalhadores de construcao (todas as funcoes) |
| **Plataforma** | Android (iOS no roadmap) |
| **Bundle ID** | `com.onsiteclub.timekeeper` |
| **Porta Dev** | 8081 (Metro) + `adb reverse tcp:8081 tcp:8081` |
| **CI/CD** | Nenhum configurado ainda |

## 2. Tech Stack

| Camada | Tecnologia | Versao |
|--------|------------|--------|
| Framework | Expo SDK | ~52.0.0 |
| React | React | 18.3.1 |
| React Native | RN | 0.76.0 (local, isolado do root 0.76.9) |
| Navigation | Expo Router | ~4.0.0 |
| State | Zustand | ^5.0.2 |
| Local DB | expo-sqlite | ~15.1.2 |
| Cloud DB | Supabase JS | ^2.49.2 |
| Location | expo-location | ~18.0.4 |
| Background | expo-task-manager | ~12.0.3 |
| Maps | react-native-maps | 1.18.0 |
| Notifications | expo-notifications | ~0.29.11 |
| Camera | expo-camera | ~16.0.18 |
| QR Code | react-native-qrcode-svg | ^6.3.21 |
| Dates | date-fns | ^4.1.0 |
| Animation | react-native-reanimated | ~3.16.1 |
| Storage | AsyncStorage | 1.23.1 |

## 3. Telas / Rotas

### Auth

| Rota | Descricao |
|------|-----------|
| `(auth)/login` | Login com email/senha |
| `(auth)/register` | Cadastro |

### Tabs (8 tabs)

| Tab | Rota | Descricao |
|-----|------|-----------|
| Home | `(tabs)/index` | Timer principal + sessoes do dia + manual entry |
| Reports | `(tabs)/reports` | Calendario (semana/mes) + export |
| Timeline | `(tabs)/timeline` | Chat AI-mediated via @onsite/timeline |
| Plans | `(tabs)/plans` | Agenda do site via @onsite/agenda |
| Lots | `(tabs)/lots` | Lotes de construcao (integracao Eagle) |
| Map | `(tabs)/map` | Mapa de geofences/locais |
| Team | `(tabs)/team` | QR sharing de horas |
| Settings | `(tabs)/settings` | Config + avatar + sign out |

### Modals / Screens

| Rota | Descricao |
|------|-----------|
| `add-location` | Criar geofence (GPS/endereco/mapa) |
| `day-detail` | Breakdown do dia |
| `manual-entry` | Entrada manual de sessao |
| `voice` | Comandos de voz |
| `share-qr` | QR code para compartilhar horas |
| `scan-qr` | Scanner QR para acessar horas compartilhadas |
| `lot-scan` | Scanner QR de lote |

### Lot Detail Stack

| Rota | Descricao |
|------|-----------|
| `lot/[id]/index` | Overview do lote |
| `lot/[id]/documents` | Documentos (plantas, RSO, red lines) |
| `lot/[id]/notes` | Notas (Eagle timeline) |

## 4. Packages Internos

| Package | Imports | Proposito |
|---------|---------|-----------|
| `@onsite/agenda` | Agenda functions | Eventos do site (calendario) |
| `@onsite/auth-ui` | Auth components | UI de login/register |
| `@onsite/media` | Media functions | Upload de fotos |
| `@onsite/offline` | Offline queue | Queue para sync offline |
| `@onsite/shared` | Types | Interfaces compartilhadas |
| `@onsite/timeline` | Timeline functions | Chat WhatsApp-style no lote |
| `@onsite/tokens` | Design tokens | Cores, espacamento |
| `@onsite/ui` | UI components | Componentes base (QR code, etc.) |

## 5. Fluxo de Dados

### Arquitetura Offline-First

```
SQLite (local, source of truth)
  ↕ Sync bidirecional
Supabase (cloud, backup)
```

**Principio:** App funciona 100% offline. Sync acontece quando ha conexao. Conflitos resolvidos por timestamp (last-write-wins).

### Tracking Engine (Core)

```
Worker entra na geofence ──→ GPS event
  → Tracking Engine avalia confidence score
  → Se confiavel: IDLE → TRACKING (cria sessao no SQLite)
  → Worker sai da geofence → EXIT_PENDING (cooldown 30s)
  → Se nao re-entrar em 30s → Fecha sessao (IDLE)
  → Sync: upload para Supabase quando online
```

**Regra critica:** O Tracking Engine e o UNICO modulo que decide quando iniciar/parar sessoes.

### Tabelas Supabase (leitura)

| Tabela | Uso |
|--------|-----|
| `tmk_entries` | Sessoes de trabalho (via sync) |
| `tmk_geofences` | Locais de trabalho (via sync) |
| `tmk_projects` | Projetos |
| `egl_sites` | Sites (via integracao Lots) |
| `egl_houses` | Lotes (via integracao Lots) |
| `egl_documents` | Documentos do lote |
| `egl_timeline` | Timeline do lote |
| `core_profiles` | Perfil do worker |

### Tabelas Supabase (escrita)

| Tabela | Uso |
|--------|-----|
| `tmk_entries` | Upload de sessoes (sync) |
| `tmk_geofences` | Upload de locais (sync) |
| `egl_timeline` | Notas no lote |

### Storage

| Bucket | Uso |
|--------|-----|
| `core-avatars` | Avatar do usuario |
| `egl-media` | Fotos de lotes |

### SQLite Local (11 tabelas)

Source of truth offline. Inclui: sessions, geofences, settings, sync_queue, aggregates, etc. Migrations automaticas ao iniciar app.

### Zustand Stores

| Store | Proposito |
|-------|-----------|
| Auth | Estado de autenticacao |
| Location | Geofences e GPS atual |
| Records | Sessoes e timer |
| Sync | Estado de sincronizacao |
| Settings | Preferencias do usuario |

### QR Code Sharing

```
Worker A: "Compartilhar Horas"
  → Cria pending_token (5 min TTL)
  → Exibe QR code
Manager: "Escanear QR"
  → Le token via lookup_pending_token()
  → Cria access_grant (status='active')
  → RLS concede SELECT em entries + geofences
```

### Report Export

```
Worker seleciona periodo → Agrega sessoes
  → Gera HTML → Compartilha via:
     - WhatsApp (mensagem formatada)
     - Email (com tabela HTML)
     - PDF (via print system)
     - Favorite contact (1 tap)
```

### Conexao com Outros Apps

```
Monitor (supervisor) ──[atribui lotes]──→ egl_houses ──→ Timekeeper (tab Lots)
Timekeeper ──[horas por geofence]──→ tmk_entries ──→ Dashboard (chart + export)
Timekeeper ──[QR share]──→ access_grants ──→ Manager ve horas no Dashboard
Field (worker) ──[fotos]──→ egl_timeline ──→ Timekeeper (timeline no lote)
```

### 5-Sphere Data Architecture

| Esfera | Dados | Proposito |
|--------|-------|-----------|
| Identity | Perfil, trade, devices | Quem sao os workers |
| Business | Horas, sessoes, locais | Valor gerado |
| Product | Features usadas, onboarding | Engajamento |
| Debug | Erros, sync failures, GPS accuracy | Saude tecnica |
| Metadata | Timestamps, versoes, configs | Contexto |

## 6. Decisoes de Arquitetura

1. **Pre-2026: Offline-first com SQLite** — SQLite e source of truth, Supabase e backup. Worker pode estar em area sem sinal. Sync bidirecional quando online. Conflitos por timestamp.

2. **Pre-2026: Tracking Engine como sole decision maker** — NENHUM outro modulo pode iniciar/parar sessoes. Previne race conditions e estados inconsistentes. Manual entry e excecao controlada.

3. **Pre-2026: Cooldown de 30 segundos** — Quando worker sai da geofence, espera 30s antes de fechar sessao. Previne splits por GPS bounce. Se re-entrar em 30s, sessao continua.

4. **Pre-2026: Effects Queue (FIFO)** — Eventos de geofence sao enfileirados e processados em ordem. Previne race conditions quando multiplos eventos GPS chegam simultaneamente.

5. **Pre-2026: Confidence scoring** — GPS events sao avaliados por accuracy. Events com accuracy muito baixa sao descartados para evitar falsos positivos de entrada/saida.

6. **Pre-2026: Zustand (nao Redux/Context)** — State management leve e performante para React Native. 5 stores independentes: auth, location, records, sync, settings.

7. **Pre-2026: newArchEnabled: false** — New Architecture do React Native desabilitada por instabilidade com plugins de location/background.

8. **Pre-2026: 3 formas de adicionar local** — GPS atual, busca por endereco, tap no mapa. Cobertura para todas as situacoes de campo.

9. **2025-01: Location carousel acima do form** — Timer expandido para 57% da tela. Selecao de local mais acessivel.

10. **2025-02: Integracao Eagle (tab Lots)** — Workers podem ver lotes atribuidos, documentos (plantas, RSO), e timeline dentro do Timekeeper. Conecta horas com contexto de obra.

11. **Pre-2026: No PII in logs** — Privacidade: sem emails, coordenadas exatas, ou dados pessoais em logs de debug. Compliance com LGPD/PIPEDA.

12. **Pre-2026: 5-Sphere Data Architecture** — Identity, Business, Product, Debug, Metadata. Cada tipo de dado tem proposito claro e destino no analytics.

## 7. Historico de Evolucao

### Pre-2026 — v1: Foundation
- Geofencing automatico com expo-location
- Tracking Engine com state machine (IDLE/TRACKING/EXIT_PENDING)
- SQLite offline-first com sync bidirecional
- Manual entry, reports, export (WhatsApp/email/PDF)
- Mapa de geofences com react-native-maps
- Notification-based UI (action buttons na notification bar)
- Auto-report reminders (semanal/quinzenal/mensal)
- Favorite contact (1 tap para enviar report)

### 2025-01 — v2.0: UX Redesign
- Manual entry redesign: native date/time pickers, break input
- Melhorias de input para reducao de erros

### 2025-01 — v2.1: Location & Timer
- Location carousel movido acima do form
- Timer expandido para 57% da tela
- Layout simplificado e mais acessivel

### 2025-02 — Geofence Reliability
- Flags notifyOnEnter/notifyOnExit setados explicitamente
- Debug logging para troubleshooting de eventos
- Verification apos start do geofencing

### 2025-02 — Layout Fix
- Removido flex ratios fixas que causavam overlap
- Auto-height para acomodar conteudo variavel

### 2025-02 — Exit Flow Investigation
- Identificados 5 blocos criticos que impediam auto-stop
- 9 checkpoints documentados no fluxo de saida
- Fixes parciais aplicados

### 2025-02 — GPS Analysis
- Investigacao de ping-pong events (entrada/saida rapida)
- Analise de accuracy margins e boundary proximity
- Cooldown de 30s validado como solucao

### 2025-02 — Avatar System
- Setup completo: bucket core-avatars, RLS policies
- Upload UI na tab Settings

### 2025-02 — Eagle Integration
- Tab Lots para ver lotes de construcao
- Rota lot/[id] com documents e notes
- Conecta horas (Timekeeper) com contexto de obra (Eagle)

### 2025-02 — Auth Expansion
- Tela de register adicionada (alem de login)
- Auth flow completo com @onsite/auth-ui
