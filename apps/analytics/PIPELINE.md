<!--
  @ai-rules
  1. NUNCA delete entradas de "Historico de Erros" — apenas ADICIONE novas com data.
  2. NUNCA delete entradas de "Troubleshooting" — apenas ADICIONE novas linhas.
  3. Ao corrigir um erro de build, SEMPRE adicione ao Historico de Erros com:
     data, sintoma, causa raiz, fix, e arquivos alterados.
  4. Mantenha as secoes na ordem. Nao reorganize.
  5. Este arquivo e a UNICA FONTE DE VERDADE para build e deploy deste app.
-->

# OnSite Analytics — Pipeline & Build Guide

> Stack: Next.js 16.1.6 + React 19 + OpenAI 6.15.0 + Recharts + Zustand
> Platform: Web (admin-only analytics dashboard)
> CI/CD: Vercel (auto-deploy)

---

## 1. Quick Reference

```bash
cd apps/analytics
npm run dev          # localhost:3000
npm run build        # Build producao
npm run lint         # ESLint
```

---

## 2. Build Commands

### Desenvolvimento Local

```bash
# Na raiz do monorepo
npm install

# Dev server
cd apps/analytics
npm run dev          # http://localhost:3000
```

### Producao

```bash
npm run build        # next build
npm run start        # next start
```

### Deploy (Vercel — auto-deploy)

Push para main → auto-deploy via Vercel dashboard.

### Quando Rebuildar?

| Mudou o que? | Comando |
|--------------|---------|
| Codigo JS/TS | Hot reload automatico |
| `package.json` (deps) | `npm install` na raiz + restart dev |
| `next.config.js` | Restart dev server |
| Packages `@onsite/*` | Restart dev server |

---

## 3. Configs Criticos

### next.config.js

```javascript
transpilePackages: ['@onsite/supabase', '@onsite/utils', '@onsite/auth', '@onsite/auth-ui', '@onsite/hooks']
// experimental.serverActions: true
```

**NAO mudar:** `transpilePackages` — sem eles, imports @onsite/* falham.

### middleware.ts

Supabase SSR para auth check:
- `@supabase/ssr` para cookies seguros
- Roda em toda request exceto assets estaticos
- Redirect para `/auth/login` se nao autenticado

### Acesso Admin

Apenas usuarios aprovados em `admin_users` (com `is_active = true`) podem acessar o dashboard. Pagina `/auth/pending` mostra status "aguardando aprovacao".

### components.json (Shadcn/ui)

Componentes UI baseados em Radix UI + Tailwind. Gerados via Shadcn CLI.

### lib/theme/index.ts

Tema dinamico por rota:
- Rotas de Input (Identity, Business, Product, Debug, Visual) → tema Cyan
- Rotas de Output (AI Training, Market, Optimization, Commerce, Reports) → tema Amber
- Tools (Assistant, Support, Sessions, Events, Queries) → tema Blue

---

## 4. Packages Usados

| Package | Import | Uso |
|---------|--------|-----|
| `@onsite/auth` | `AuthProvider`, `useAuth` | Auth context e hooks |
| `@onsite/auth-ui` | Auth components | UI de login |
| `@onsite/supabase` | `createAdminClient()`, `createServerSupabaseClient()` | Supabase SSR + admin |
| `@onsite/utils` | `cn()`, formatters | Utility functions |
| `@onsite/hooks` | React hooks | Hooks compartilhados |

---

## 5. Variaveis de Ambiente

Arquivo: `apps/analytics/.env.local` (NAO commitar)

| Variavel | Descricao | Secret |
|----------|-----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do Supabase | Nao |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key | Nao |
| `OPENAI_API_KEY` | API key para Teletraan9 AI | **Sim** |

**Nota:** Nao precisa de SUPABASE_SERVICE_ROLE_KEY — usa `createAdminClient()` do @onsite/supabase.

---

## 6. Teletraan9 AI Engine

### Endpoint

`POST /api/ai/chat`

### Request

```json
{
  "message": "How many active users this week?",
  "history": [/* previous messages */],
  "conversationId": "uuid"
}
```

### Response

```json
{
  "message": "There are 42 active users this week.",
  "visualization": { "type": "metric", "data": {...} },
  "sql": "SELECT count(*) ...",
  "conversationId": "uuid"
}
```

### 5 Tipos de Visualizacao

| Tipo | Quando |
|------|--------|
| `metric` | KPI unico (numero grande + trend) |
| `table` | Dados tabulares (sortable) |
| `chart` | Graficos (line, bar, area) |
| `alert` | Alertas e avisos (severity levels) |
| `user_card` | Perfil de usuario (avatar + stats) |

### 3 Camadas de Inteligencia

| Camada | Nome | Exemplo |
|--------|------|---------|
| 1 | VISAO (Now) | Metricas real-time, sessoes ativas, erros |
| 2 | ANALISE (Why) | Cohort analysis, LTV, feature adoption trends |
| 3 | PRE-COGNICAO (What's next) | Churn prediction, growth forecast, anomaly detection |

### Quick Commands

| Comando | Acao |
|---------|------|
| `/report` | Gerar relatorio |
| `/export` | Exportar dados |
| `/sql` | Modo SQL direto |
| `/help` | Lista de comandos |

---

## 7. Estrutura de Arquivos

```
apps/analytics/
├── app/
│   ├── layout.tsx                 # Root layout (Inter font)
│   ├── page.tsx                   # Redirect → dashboard ou login
│   ├── api/
│   │   ├── ai/chat/route.ts      # Teletraan9 AI (POST)
│   │   └── query/route.ts        # SQL executor (admin)
│   ├── auth/
│   │   ├── login/page.tsx         # Login
│   │   └── pending/page.tsx       # Aguardando aprovacao
│   ├── chat/
│   │   ├── layout.tsx             # Chat layout (sidebar + messages)
│   │   ├── page.tsx               # Nova conversa
│   │   └── [id]/page.tsx          # Conversa existente
│   └── dashboard/
│       ├── layout.tsx             # Sidebar + theme + assistant
│       ├── overview/page.tsx      # KPI dashboard principal
│       ├── identity/page.tsx      # Users, cohorts, churn
│       ├── business/page.tsx      # Hours, sessions, locations
│       ├── product/page.tsx       # Features, onboarding
│       ├── debug/page.tsx         # Errors, sync, GPS
│       ├── visual/page.tsx        # Photos, training data
│       ├── ai-training/page.tsx   # Prumo datasets
│       ├── market/page.tsx        # Trends, predictions
│       ├── optimization/page.tsx  # Feature flags, UX
│       ├── commerce/page.tsx      # Shop analytics
│       ├── reports/page.tsx       # Exports, digests
│       ├── assistant/page.tsx     # Teletraan9 chat (alt)
│       ├── support/page.tsx       # Ref # decoder
│       ├── sessions/page.tsx      # Session details
│       ├── events/page.tsx        # Event tracking
│       └── queries/page.tsx       # SQL explorer
├── components/
│   ├── assistant/                 # Floating AI widget
│   ├── chat/                      # Chat UI (input, sidebar, messages, response-card)
│   ├── charts/                    # Recharts (line, bar)
│   ├── dashboard/                 # Metric card, section header
│   ├── layout/                    # Sidebar, header, stats-card
│   ├── tables/                    # Data table (sortable, paginated)
│   └── ui/                        # Radix-based components (button, card, input, etc.)
├── lib/
│   ├── ai/index.ts                # Prompt engineering
│   ├── export/index.ts            # PDF/Excel/CSV generation
│   ├── hooks/index.ts             # Custom hooks
│   ├── supabase/                  # Client, server, middleware, conversations, queries, schema
│   ├── theme/index.ts             # Theme-by-route
│   └── utils.ts                   # cn(), formatters
├── middleware.ts                   # Auth SSR
├── next.config.js
├── tailwind.config.js
├── components.json                 # Shadcn/ui config
├── tsconfig.json
└── package.json
```

---

## 8. Pre-Build Checklist

```
[ ] npm install na raiz do monorepo
[ ] .env.local com 3 chaves (Supabase URL, Anon Key, OpenAI)
[ ] Node >= 20
[ ] Usuario aprovado em admin_users para acessar dashboard
```

---

## 9. Troubleshooting

| Sintoma | Causa | Fix |
|---------|-------|-----|
| Pagina branca | @onsite/* nao compilado | Verificar `transpilePackages` no next.config.js |
| "Awaiting approval" | Usuario nao em admin_users | Inserir com `is_active = true` e `approved = true` |
| AI nao responde | OPENAI_API_KEY faltando | Setar no .env.local |
| Charts sem dados | Tabelas agg_* vazias | Popular com dados ou rodar aggregation |
| Export PDF vazio | jspdf nao instalado | `npm install` na raiz |
| Tema errado | Theme-by-route nao atualizado | Verificar `lib/theme/index.ts` |
| SQL query 403 | RLS bloqueando | Verificar se usuario e admin ativo |

---

## 10. Historico de Erros

*(Nenhum erro documentado ainda. Adicionar conforme surgirem.)*
