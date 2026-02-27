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

# OnSite Analytics

> Dashboard de business intelligence e AI do ecossistema OnSite Club. O "gargalo da ampulheta" entre dados brutos e inteligencia acionavel.

## 1. Identidade

| Campo | Valor |
|-------|-------|
| **Nome** | OnSite Analytics (codinome: ARGUS) |
| **Diretorio** | `apps/analytics` |
| **Proposito** | Dashboard admin-only de business intelligence. Consome dados de TODOS os apps (Timekeeper, Calculator, Eagle, Shop) e transforma em insights via 10 esferas tematicas (5 entrada + 5 saida). Inclui Teletraan9, um AI engine que converte linguagem natural em SQL + visualizacoes. Exporta relatorios com Ref # rastreavel. |
| **Audiencia** | Admin/super_admin (acesso gated via `admin_users`) |
| **Plataforma** | Web |
| **Porta Dev** | 3000 |
| **URL Producao** | *(nao configurado ainda)* |

## 2. Tech Stack

| Camada | Tecnologia | Versao |
|--------|------------|--------|
| Framework | Next.js | 16.1.6 |
| React | React | 19.0.0 |
| AI | OpenAI (GPT-4o) | 6.15.0 |
| State | Zustand | 4.5.1 |
| Charts | Recharts | 2.12.2 |
| PDF Export | jsPDF + jspdf-autotable | 4.0.0 / 5.0.7 |
| Excel Export | xlsx | 0.18.5 |
| Database | Supabase JS + SSR | 2.49.2 / 0.1.0 |
| UI | Radix UI + Shadcn/ui | Latest |
| Animation | Framer Motion | 11.0.8 |
| Icons | lucide-react | 0.344.0 |
| Dates | date-fns | 3.3.1 |
| Styling | Tailwind CSS | 3.4.1 |

## 3. Telas / Rotas

### Modelo da Ampulheta (Hourglass)

O dashboard e organizado em 10 esferas + tools, seguindo a arquitetura ampulheta:

```
ENTRADA (Cyan) — O que esta acontecendo
├── Identity    — Users, cohorts, churn risk
├── Business    — Work hours, sessions, locations
├── Product     — Features, onboarding, engagement
├── Debug       — Errors, sync, GPS accuracy
└── Visual      — Photos, AI training data quality

SAIDA (Amber) — O que devemos fazer
├── AI Training — Prumo datasets (COCO JSON)
├── Market      — Trends, churn prediction, growth
├── Optimization— Feature flags, UX insights
├── Commerce    — Shop analytics, pricing, conversion
└── Reports     — PDF/CSV exports, email digests

TOOLS (Blue)
├── Assistant   — Teletraan9 chat interface
├── Support     — Ref # decoder
├── Sessions    — Session details
├── Events      — Event tracking
└── Queries     — SQL explorer (admin)
```

### Auth Routes

| Rota | Descricao |
|------|-----------|
| `/auth/login` | Login (redirect se autenticado) |
| `/auth/pending` | Pagina "aguardando aprovacao" |

### Chat Routes

| Rota | Descricao |
|------|-----------|
| `/chat` | Nova conversa com Teletraan9 |
| `/chat/[id]` | Conversa existente por ID |

### API Endpoints (2)

| Rota | Metodo | Descricao |
|------|--------|-----------|
| `/api/ai/chat` | POST | Teletraan9 — NL → SQL → Visualizacao |
| `/api/query` | POST | SQL executor direto (admin only) |

## 4. Packages Internos

| Package | Imports | Proposito |
|---------|---------|-----------|
| `@onsite/auth` | `AuthProvider`, `useAuth` | Auth context e hooks |
| `@onsite/auth-ui` | Auth components | UI de login |
| `@onsite/supabase` | `createAdminClient()`, `createServerSupabaseClient()` | Supabase SSR + admin client |
| `@onsite/utils` | `cn()`, formatters | Utility functions |
| `@onsite/hooks` | React hooks | Hooks compartilhados |

## 5. Fluxo de Dados

### Tabelas Supabase (leitura) — 38 tabelas em 12 dominios

#### Identity

| Tabela | Uso |
|--------|-----|
| `core_profiles` | Users, trades, experience, location, onboarding |
| `core_devices` | Device tracking, push tokens, app versions |
| `core_consents` | Voice, data collection, marketing consents |
| `admin_users` | Admin approval gate |

#### Business

| Tabela | Uso |
|--------|-----|
| `tmk_entries` | Work sessions (entrada/saida) |
| `tmk_geofences` | Locais de trabalho (GPS) |
| `tmk_projects` | Projetos (budget, status) |
| `ccl_calculations` | Calculos (voz + manual) |
| `ccl_templates` | Templates de formulas |

#### Commerce

| Tabela | Uso |
|--------|-----|
| `shp_products` | Produtos e inventario |
| `shp_orders` | Pedidos e pagamentos |
| `billing_subscriptions` | Assinaturas por app |
| `billing_products` | Definicao de produtos Stripe |
| `payment_history` | Historico de pagamentos |

#### Logs

| Tabela | Uso |
|--------|-----|
| `log_errors` | Crashes, erros de rede |
| `log_events` | Acoes de usuario (login, feature usage) |
| `log_locations` | Eventos GPS (entrada/saida geofence) |
| `app_logs` | Logs gerais (level, module, duration) |

#### Aggregations / Intelligence

| Tabela | Uso |
|--------|-----|
| `agg_platform_daily` | KPIs diarios da plataforma |
| `agg_trade_weekly` | Metricas por trade |
| `agg_user_daily` | Agregacao diaria por usuario |
| `int_behavior_patterns` | Padroes de comportamento por segmento |
| `int_voice_patterns` | Padroes de voz (termos informais, dialetos) |

#### Reference

| Tabela | Uso |
|--------|-----|
| `ref_trades` | Trades de construcao |
| `ref_provinces` | Provincias canadenses |
| `ref_units` | Unidades de medida |

### Tabelas Supabase (escrita)

| Tabela | Uso |
|--------|-----|
| `core_ai_conversations` | Salvar conversas do Teletraan9 |

### Ref # System (Reference Codes)

Sistema unico de codigos de referencia para relatorios exportados:

```
Formato: QC-A3F8-0106-03
         ^   ^     ^    ^
         |   |     |    └── Sessao do dia (03 = terceiro export)
         |   |     └── Data (MMDD = Jan 06)
         |   └── Sufixo do usuario (4 chars do UUID)
         └── Regiao (QC = Quebec)
```

**Uso:** Customer support pode decodificar um Ref # para encontrar quem exportou, quando, e qual relatorio. Funcionalidade de lookup na pagina `/dashboard/support`.

### Teletraan9 AI Engine

Motor de inteligencia que converte linguagem natural em insights:

```
Usuario pergunta (NL) → Teletraan9 analisa
  → Gera SQL (transparente) → Executa query
  → Gera visualizacao (5 tipos) → Responde com contexto
```

#### 5 Tipos de Visualizacao

| Tipo | Quando |
|------|--------|
| `metric` | KPI unico (numero grande + trend) |
| `table` | Dados tabulares (sortable) |
| `chart` | Graficos (line, bar, area via Recharts) |
| `alert` | Alertas e avisos (severity levels) |
| `user_card` | Perfil de usuario (avatar + stats) |

#### 3 Camadas de Inteligencia

| Camada | Nome | Exemplo |
|--------|------|---------|
| 1 | VISAO (Now) | Metricas real-time, sessoes ativas, erros |
| 2 | ANALISE (Why) | Cohort analysis, LTV, feature adoption trends |
| 3 | PRE-COGNICAO (What's next) | Churn prediction, growth forecast, anomaly detection |

### Conexao com Outros Apps

```
Timekeeper ──[tmk_entries + geofences]──→ Analytics (Business sphere)
Calculator ──[ccl_calculations + voice_logs]──→ Analytics (Product + Identity)
Eagle ──[egl_photos + progress]──→ Analytics (Visual sphere)
Shop ──[shp_orders + products]──→ Analytics (Commerce sphere)
All apps ──[log_errors + log_events]──→ Analytics (Debug sphere)
Analytics ──[agg_* views]──→ Dashboards, Reports, Prumo training
```

## 6. Decisoes de Arquitetura

1. **Pre-2026: Modelo Ampulheta (Hourglass)** — Analytics e o "gargalo" entre dados brutos (entrada) e inteligencia acionavel (saida). 5 esferas de entrada, 5 de saida. UI reflete isso com cores: Cyan (entrada), Amber (saida), Blue (tools).

2. **Pre-2026: Teletraan9 — AI engine com 3 camadas** — Camada 1: VISAO (metricas now), Camada 2: ANALISE (padroes why), Camada 3: PRE-COGNICAO (previsoes what's next). Converte linguagem natural em SQL + visualizacoes automaticas.

3. **Pre-2026: Admin approval gate** — Diferente de outros apps, Analytics exige aprovacao em `admin_users`. Nao basta ter conta — precisa ser aprovado. Pagina `/auth/pending` enquanto aguarda.

4. **Pre-2026: Ref # System** — Codigos curtos e memoraveis para rastrear relatorios (ex: `QC-A3F8-0106-03`). Nao usa UUIDs para facilitar suporte ao cliente.

5. **Pre-2026: Theme-by-route** — Cores do dashboard mudam conforme a secao. Input (Cyan), Output (Amber), Tools (Blue). Transicao suave entre temas.

6. **Pre-2026: Zustand para state management** — Diferente dos outros apps que usam React state puro. Analytics precisa de state global para conversas do chat, filtros de dashboard, e preferencias.

7. **Pre-2026: Lazy-loaded OpenAI** — Client OpenAI e lazy-loaded para evitar crash no build do Vercel quando OPENAI_API_KEY nao esta no build environment.

8. **Pre-2026: 38 tabelas + 12 dominios** — Analytics le de praticamente TODA tabela do Supabase. Schema completo em `lib/supabase/schema.ts` para contexto do Teletraan9.

9. **Pre-2026: Radix UI + Shadcn/ui** — Unico app do ecossistema que usa Shadcn/ui. Os outros usam Tailwind puro ou @onsite/ui.

## 7. Historico de Evolucao

### Pre-2026 — v1: ARGUS Foundation
- Dashboard de analytics com 10 esferas tematicas
- Modelo Ampulheta (Hourglass) — 5 entrada + 5 saida
- Login com admin approval gate
- Tema dinamico por rota (Cyan/Amber/Blue)
- Recharts para graficos, data-table para tabelas

### 2026-01-25 — Ref # System
- Sistema de codigos de referencia para relatorios exportados
- Formato: Regiao-UserSuffix-Data-Sessao
- Lookup tool na pagina Support

### 2026-01-31 — Teletraan9 AI Engine
- AI chat interface (NL → SQL → Visualizacao)
- 5 tipos de visualizacao: metric, table, chart, alert, user_card
- 3 camadas de inteligencia: Vision, Analysis, Pre-cognition
- Conversas persistidas em `core_ai_conversations` com RLS
- Quick commands: /report, /export, /sql, /help

### 2026-01-31 — Export System
- Export PDF com header ARGUS + Ref #
- Export Excel (XLSX) com tabelas formatadas
- Export CSV para dados brutos
- Conversation-to-PDF com visualizacoes
