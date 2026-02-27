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

# OnSite Inspect

> App mobile para inspetores de qualidade validarem fases de construcao com fotos, checklists e analise AI.

## 1. Identidade

| Campo | Valor |
|-------|-------|
| **Nome** | OnSite Inspect |
| **Diretorio** | `apps/inspect` |
| **Proposito** | Inspetores visitam lotes, validam fases de construcao fotografando e verificando checklists. AI analisa fotos automaticamente. Documenta defects com severidade e gera evidence para aprovacao. |
| **Audiencia** | Inspetores de qualidade e supervisores |
| **Plataforma** | Android + iPad (orientation: default = landscape em tablet) |
| **Bundle ID** | `com.onsiteclub.inspect` |
| **Porta Dev** | 8082 (Metro) — diferente do Operator (8081) |

## 2. Tech Stack

| Camada | Tecnologia | Versao |
|--------|------------|--------|
| Framework | Expo SDK | ~52.0.0 |
| React | React | 18.3.1 |
| React Native | RN | 0.76.0 |
| Navigation | Expo Router | ~4.0.0 |
| Database | Supabase JS | ^2.93.3 |
| Storage Session | AsyncStorage | 1.23.1 |
| Camera | expo-camera + expo-image-picker | ~16.0.0 / ~16.0.6 |
| Notifications | expo-notifications (FCM) | ~0.29.11 |
| AI | @onsite/ai | * |
| Offline | @onsite/offline | * |
| Logging | @onsite/logger | * |

## 3. Telas / Rotas

```
app/
├── _layout.tsx              # Root (AuthProvider, offline sync, auth guard)
├── (auth)/
│   ├── _layout.tsx          # Auth group
│   └── login.tsx            # Email/password login
├── (app)/
│   ├── _layout.tsx          # App group (authenticated)
│   ├── index.tsx            # Lista de sites atribuidos
│   ├── site/[id].tsx        # Detalhe do site — lotes com status
│   ├── lot/[lotId].tsx      # Detalhe do lote — fases, fotos, checklist
│   ├── camera.tsx           # Captura foto de inspecao
│   ├── site-new.tsx         # Criar novo site
│   └── settings.tsx         # Config, sign out
```

### Fluxos Principais

| Fluxo | Caminho | Descricao |
|-------|---------|-----------|
| Inspecionar lote | index → site/[id] → lot/[lotId] | Drill down: sites → lotes → fases |
| Foto de inspecao | lot/[lotId] → camera.tsx | Captura com metadata (fase, checklist item) |
| Validar fase | lot/[lotId] → aprovar/rejeitar | Muda status da fase + timeline event |
| AI analysis | Automatico apos upload | AI valida foto vs checklist |

## 4. Packages Internos

| Package | Imports Principais | Proposito |
|---------|-------------------|-----------|
| `@onsite/auth` | `AuthProvider`, `useAuth` | Login, auth guard |
| `@onsite/auth-ui` | UI components | Tela de login |
| `@onsite/shared` | Types (`Site`, `House`, `HouseStatus`) | Interfaces compartilhadas |
| `@onsite/timeline` | `fetchMessages`, `sendMessage` | Timeline de eventos do lote |
| `@onsite/media` | `fetchDocuments`, `uploadFile` | Documentos do lote |
| `@onsite/agenda` | `fetchAgendaEvents` | Agenda do site |
| `@onsite/camera` | Photo capture + metadata | Pipeline de fotos |
| `@onsite/offline` | `initQueue`, `useOfflineSync` | Queue offline |
| `@onsite/sharing` | `parseQRPayload`, `joinSite` | QR scanner |
| `@onsite/ai` | AI specialists | Analise automatica de fotos |
| `@onsite/logger` | Structured logging | Logs com tags |
| `@onsite/tokens` | Design tokens | Cores, espacamento |

## 5. Fluxo de Dados

### Tabelas Supabase (leitura)

| Tabela | Uso |
|--------|-----|
| `egl_sites` | Sites atribuidos ao inspector |
| `egl_houses` | Lotes do site com status |
| `egl_progress` | Status de fases por lote |
| `egl_photos` | Fotos de fases com validacao AI |
| `ref_eagle_phases` | 7 fases padrao com checklist |
| `ref_eagle_phase_items` | 66 itens de checklist |
| `egl_documents` | Documentos por lote (plantas, RSO) |
| `egl_timeline` | Historico de eventos |

### Tabelas Supabase (escrita)

| Tabela | Uso |
|--------|-----|
| `egl_progress` | Aprovar/rejeitar fases |
| `egl_photos` | Upload fotos de inspecao + resultado AI |
| `egl_issues` | Documentar defeitos encontrados |
| `egl_timeline` | Eventos de inspecao |

### Storage

| Bucket | Path | Uso |
|--------|------|-----|
| `egl-media` | `{siteId}/{houseId}/{timestamp}_{random}.jpg` | Fotos de inspecao |

### Conexao com Outros Apps

```
Monitor (supervisor) ──[cria site/lotes]──→ egl_sites/houses ──→ Inspect (inspector ve)
Inspect ──[aprova/rejeita fase + foto]──→ egl_progress/photos ──→ Monitor (supervisor ve)
Field (worker) ──[fotos de progresso]──→ egl_photos ──→ Inspect (inspector compara)
```

## 6. Decisoes de Arquitetura

1. **2026-02-25: Stack navigation (sem tabs)** — Inspetores navegam site → lote → fase linearmente. Tabs nao fazem sentido porque o fluxo e drill-down, nao lateral.

2. **2026-02-25: Orientation "default"** — Permite landscape em tablets. Inspetores frequentemente usam iPad no canteiro para ver plantas.

3. **2026-02-25: 12 packages (maior app do ecossistema)** — Usa todos os packages compartilhados incluindo AI e Logger. Inspect e o app mais completo tecnicamente.

4. **2026-02-25: Porta 8082** — Evita conflito com Operator (8081). Permite dev simultaneo dos dois apps.

5. **2026-02-25: Baseado no padrao Operator v2** — Herda todas as protecoes (blockList, watchFolders especificos, babel limpo). 12 erros ja resolvidos no Operator estao prevenidos aqui.

6. **2026-02-25: newArchEnabled: false** — Mesma decisao do ecossistema.

## 7. Historico de Evolucao

### 2026-02-25 — v1: Inspector App Inicial
- Reconstruido do zero usando padrao Operator v2
- Stack navigation: sites → lotes → fases (drill-down)
- Camera para fotos de inspecao com metadata
- AI analysis integrada via @onsite/ai
- 12 packages internos (maior app do ecossistema)
- Porta 8082 para dev simultaneo com Operator
- Suporte a landscape em tablets (orientation: default)
- Enterprise Theme v3 (#F6F7F9 bg, #0F766E accent)
