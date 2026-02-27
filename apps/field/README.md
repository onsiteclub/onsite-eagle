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

# OnSite Field

> App mobile para trabalhadores de campo documentarem progresso de obra com fotos, notas e timeline.

## 1. Identidade

| Campo | Valor |
|-------|-------|
| **Nome** | OnSite Field |
| **Diretorio** | `apps/field` |
| **Proposito** | Workers visualizam lotes atribuidos, tiram fotos de fases, consultam timeline e agenda do site. App de consumo — recebe dados do supervisor (Monitor) e contribui com fotos e notas. |
| **Audiencia** | Trabalhadores de campo (framers, roofers, etc.) |
| **Plataforma** | Android (iOS no roadmap) |
| **Bundle ID** | `com.onsiteclub.field` |
| **Porta Dev** | 8081 (Metro) + `adb reverse tcp:8081 tcp:8081` |
| **CI/CD** | Codemagic (2 workflows: debug APK + release AAB) |

## 2. Tech Stack

| Camada | Tecnologia | Versao |
|--------|------------|--------|
| Framework | Expo SDK | ~52.0.0 |
| React | React | 18.3.1 |
| React Native | RN | 0.76.0 |
| Navigation | Expo Router | ~4.0.0 |
| State | React state | — |
| Database | Supabase JS | ^2.93.3 |
| Storage Session | AsyncStorage | 1.23.1 |
| Camera | expo-camera | ~16.0.0 |
| Offline | @onsite/offline | * |
| CI/CD | Codemagic | YAML workflow |

## 3. Telas / Rotas

```
app/
├── _layout.tsx              # Root (AuthProvider, offline sync, auth guard)
├── (auth)/
│   ├── _layout.tsx          # Auth group
│   └── login.tsx            # Email/password login
├── (tabs)/
│   ├── _layout.tsx          # 3 tabs: My Lots, Agenda, Config
│   ├── index.tsx            # My Lots — cards com progresso
│   ├── agenda.tsx           # Agenda — eventos do site
│   └── config.tsx           # Config — profile, QR, sign out
├── lot/[id]/
│   ├── _layout.tsx          # Lot stack
│   ├── index.tsx            # Lot detail — progresso, quick actions
│   ├── timeline.tsx         # Chat WhatsApp-style
│   ├── documents.tsx        # Docs agrupados por categoria
│   └── notes.tsx            # Templates de notas (8 presets) + custom
├── camera.tsx               # Foto de fase → egl-media bucket
└── scanner.tsx              # QR → vincular a site
```

### Fluxos Principais

| Fluxo | Caminho | Descricao |
|-------|---------|-----------|
| Ver lotes | My Lots → tap card → lot/[id] | Detalhe com progresso, fases, quick actions |
| Tirar foto | lot/[id] → "Photo" → camera.tsx | Upload para egl-media, timeline event |
| Ver timeline | lot/[id] → "Timeline" → timeline.tsx | WhatsApp-style via @onsite/timeline |
| Adicionar nota | lot/[id] → "Note" → notes.tsx | 8 templates rapidos + customizado |
| Ver docs | lot/[id] → "Docs" → documents.tsx | Plantas, RSO, red lines por lote |
| Ver agenda | Tab Agenda | Eventos do site (clima, inspecoes, prazos) |
| Vincular site | Config → QR → scanner.tsx | Conecta worker a um canteiro |

## 4. Packages Internos

| Package | Imports Principais | Proposito |
|---------|-------------------|-----------|
| `@onsite/auth` | `AuthProvider`, `useAuth` | Login, auth guard, sign out |
| `@onsite/auth-ui` | UI components | Tela de login |
| `@onsite/timeline` | `fetchMessages`, `sendMessage`, `subscribeToMessages` | Timeline WhatsApp-style no lote |
| `@onsite/agenda` | `fetchAgendaEvents`, `buildDaySummaries`, `AGENDA_EVENT_CONFIG` | Tab Agenda — eventos do site |
| `@onsite/offline` | `initQueue`, `useOfflineSync` | Queue offline para sync |
| `@onsite/sharing` | `parseQRPayload`, `isJoinSitePayload`, `joinSite` | QR scanner para vincular a site |
| `@onsite/camera` | — | Pipeline de upload de fotos |
| `@onsite/shared` | Types | Interfaces compartilhadas |
| `@onsite/tokens` | — | Design tokens |

## 5. Fluxo de Dados

### Tabelas Supabase (leitura)

| Tabela | Uso |
|--------|-----|
| `egl_sites` | Info do canteiro vinculado |
| `egl_houses` | Lotes atribuidos ao worker |
| `egl_progress` | Status de fases por lote |
| `egl_timeline` | Eventos do lote (timeline) |
| `egl_documents` | Documentos por lote |
| `core_profiles` | Perfil do worker |

### Tabelas Supabase (escrita)

| Tabela | Uso |
|--------|-----|
| `egl_timeline` | Postar fotos, notas, mensagens |
| `egl_photos` | Fotos de fases |

### Storage

| Bucket | Path | Uso |
|--------|------|-----|
| `egl-media` | `{siteId}/{houseId}/{timestamp}_{random}.jpg` | Fotos de fases e campo |

### Conexao com Outros Apps

```
Monitor (supervisor) ──[atribui lotes]──→ egl_houses ──→ Field (worker ve)
Field (worker) ──[fotos + notas]──→ egl_timeline ──→ Monitor (supervisor ve)
Operator ──[entrega material]──→ egl_timeline ──→ Field (worker notificado)
```

## 6. Decisoes de Arquitetura

1. **2026-02-25: 3 tabs (My Lots, Agenda, Config)** — Worker passa 90% do tempo em My Lots. Agenda mostra eventos do site (clima, inspecoes). Config e minimo (QR, sign out).

2. **2026-02-25: Lot detail com quick actions** — 4 botoes (Photo, Timeline, Docs, Note) acessiveis com um tap. Reduz friccao para documentar.

3. **2026-02-25: 8 note presets** — Templates rapidos para situacoes comuns (chegada, saida, problema, material, etc.). Worker digita menos.

4. **2026-02-25: Codemagic CI/CD** — 2 workflows: debug APK em push para main, release AAB+APK em push para release/field-*. mac_mini_m2 (500 min/mes gratis).

5. **2026-02-25: newArchEnabled: false** — Mesmo motivo do Operator — instabilidade com plugins.

6. **2026-02-25: watchFolders especificos** — 9 packages listados individualmente no metro.config.js. Nunca monorepoRoot.

## 7. Historico de Evolucao

### 2026-02-25 — v1: Worker App Inicial
- 3 tabs: My Lots, Agenda, Config
- Login via @onsite/auth com redirect automatico
- Lot detail com quick actions (Photo, Timeline, Docs, Note)
- Timeline WhatsApp-style via @onsite/timeline
- Agenda do site via @onsite/agenda
- QR scanner para vincular a site via @onsite/sharing
- Camera para fotos de fase → egl-media bucket
- Offline sync via @onsite/offline
- Codemagic CI/CD configurado (debug + release)
- Enterprise Theme v3 (#F6F7F9 bg, #0F766E accent)
