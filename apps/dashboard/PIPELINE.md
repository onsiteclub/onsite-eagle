<!--
  @ai-rules
  1. NUNCA delete entradas de "Historico de Erros" — apenas ADICIONE novas com data.
  2. NUNCA delete entradas de "Troubleshooting" — apenas ADICIONE novas linhas.
  3. Ao corrigir um erro de build, SEMPRE adicione ao Historico de Erros com:
     data, sintoma, causa raiz, fix, e arquivos alterados.
  4. Mantenha as secoes na ordem. Nao reorganize.
  5. Este arquivo e a UNICA FONTE DE VERDADE para build e deploy deste app.
-->

# OnSite Dashboard — Pipeline & Build Guide

> Stack: Next.js 16.1.6 + React 19 + Stripe 14.21.0 + OpenAI 6.16.0 + Recharts
> Platform: Web (SSO hub + member experience)
> CI/CD: Vercel (auto-deploy)

---

## 1. Quick Reference

```bash
cd apps/dashboard
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
cd apps/dashboard
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
| Stripe config | Atualizar .env.local + restart |

---

## 3. Configs Criticos

### next.config.js

```javascript
transpilePackages: ['@onsite/supabase', '@onsite/utils', '@onsite/auth', '@onsite/shared', '@onsite/ui']
// Image remote patterns: *.supabase.co/storage/v1/object/public/**
```

**Por que transpile:** Packages sao TypeScript puro, Next.js precisa compilar.

**NAO mudar:** Lista de `transpilePackages` — sem eles, pagina fica branca.

### middleware.ts

Protecao de rotas + admin check:
1. Rotas protegidas: `/club/*`, `/account/*`, `/admin/*`, `/app/*`
2. `/admin/*` requer `core_admin_users` com `is_active = true`
3. Atualiza `last_active_at` em `core_profiles` (throttled)

### tailwind.config.js

Cores custom da marca OnSite:
- Primary: `#0F766E` (teal)
- Background: `#F6F7F9`
- Text: `#101828`

---

## 4. Packages Usados

| Package | Import | Uso |
|---------|--------|-----|
| `@onsite/auth` | `AuthProvider`, `useAuth` | Auth context e hooks |
| `@onsite/auth-ui` | Auth components | UI de login/signup |
| `@onsite/supabase` | `createClient()` (server + browser) | Supabase SSR client |
| `@onsite/utils` | `cn()`, formatters | Utility functions |
| `@onsite/shared` | Types | Interfaces compartilhadas |
| `@onsite/ui` | Components, theme | Componentes base |

---

## 5. Variaveis de Ambiente

Arquivo: `apps/dashboard/.env.local` (NAO commitar)

### Supabase

| Variavel | Descricao | Secret |
|----------|-----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do Supabase | Nao |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key | Nao |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (server-side only) | **Sim** |

### Stripe

| Variavel | Descricao | Secret |
|----------|-----------|--------|
| `STRIPE_SECRET_KEY` | Stripe API key | **Sim** |
| `STRIPE_PRICE_ID` | Price ID da subscription | Nao |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret | **Sim** |

### OpenAI

| Variavel | Descricao | Secret |
|----------|-----------|--------|
| `OPENAI_API_KEY` | API key para AI assistant widget | **Sim** |

### App

| Variavel | Descricao | Secret |
|----------|-----------|--------|
| `NEXT_PUBLIC_APP_URL` | URL base do dashboard | Nao |
| `TRIAL_PERIOD_DAYS` | Dias de trial (default: 180) | Nao |

---

## 6. Stripe Webhook Setup

### URL do Webhook

```
https://app.onsiteclub.ca/api/webhooks/stripe
```

### Eventos Necessarios

| Evento | Acao |
|--------|------|
| `checkout.session.completed` | Criar `billing_subscriptions` entry |
| `customer.subscription.updated` | Update status/trial |
| `customer.subscription.deleted` | Mark as canceled |
| `invoice.payment_succeeded` | Mark as active |
| `invoice.payment_failed` | Mark as past_due |

---

## 7. Estrutura de Arquivos

```
apps/dashboard/
├── app/
│   ├── layout.tsx                    # Root layout + metadata
│   ├── globals.css                   # Tailwind + custom styles
│   ├── page.tsx                      # Login page (/)
│   ├── LoginPage.tsx                 # Login component
│   ├── reset-password/page.tsx       # Reset senha
│   ├── auth/callback/route.ts        # OAuth callback
│   ├── legal/                        # 4 paginas legais (terms, privacy, security, cancellation)
│   ├── (club)/                       # Grupo protegido
│   │   ├── layout.tsx                # Sidebar + Header
│   │   ├── club/                     # Hub + features
│   │   │   ├── page.tsx              # Hub principal (stats, news, activity)
│   │   │   ├── apps/page.tsx         # Cards de todos os apps
│   │   │   ├── card/page.tsx         # OnSite Card (mockup)
│   │   │   ├── badges/page.tsx       # Achievement badges
│   │   │   ├── rewards/page.tsx      # Blades rewards
│   │   │   ├── stats/page.tsx        # Estatisticas detalhadas
│   │   │   ├── wallet/page.tsx       # Wallet (waitlist)
│   │   │   └── news/page.tsx         # Noticias & campanhas
│   │   ├── account/                  # Conta
│   │   │   ├── profile/page.tsx      # Editar perfil
│   │   │   ├── subscription/page.tsx # Billing & subscription
│   │   │   ├── devices/page.tsx      # Devices linkados
│   │   │   ├── privacy/page.tsx      # Privacidade & export
│   │   │   └── security/page.tsx     # Seguranca
│   │   ├── app/                      # Dashboards por app
│   │   │   ├── timekeeper/page.tsx   # Hours tracking (chart + table + export)
│   │   │   ├── calculator/page.tsx   # Calculator stats
│   │   │   ├── eagle/page.tsx        # Visual inspection
│   │   │   ├── field/page.tsx        # Site documentation
│   │   │   ├── operator/page.tsx     # Operations
│   │   │   ├── inspect/page.tsx      # Inspector
│   │   │   └── shop/page.tsx         # Shop (Shopify link)
│   │   └── admin/                    # Super-admin only
│   │       ├── users/page.tsx        # User management
│   │       ├── analytics/page.tsx    # Analytics
│   │       ├── architecture/page.tsx # System debug
│   │       └── campaigns/page.tsx    # Campanhas
│   └── api/
│       ├── auth/callback/route.ts
│       ├── stripe/
│       │   ├── checkout/route.ts     # Criar Stripe session
│       │   ├── portal/route.ts       # Billing portal
│       │   └── cancel/route.ts       # Cancelar subscription
│       ├── webhooks/stripe/route.ts  # Webhook handler
│       ├── profile/
│       │   ├── update/route.ts       # Update core_profiles
│       │   └── avatar/route.ts       # Upload avatar
│       ├── device/unlink/route.ts    # Unlink device
│       ├── timekeeper/
│       │   ├── update/route.ts       # Edit entry times
│       │   └── export/
│       │       ├── excel/route.ts    # Export XLSX
│       │       └── pdf/route.ts      # Export PDF
│       └── assistant/chat/route.ts   # OpenAI chat
├── components/
│   ├── layout/                       # ClubSidebar, ClubHeader
│   ├── account/                      # SubscriptionManager, DeviceManager
│   ├── forms/                        # EditProfileForm
│   ├── charts/                       # Recharts components
│   ├── timekeeper/                   # TimekeeperDashboard + sub-components
│   ├── assistant/                    # AssistantWidget, Chat, Message
│   └── ui/                           # StatBox, StatCard, EmptyState
├── lib/
│   ├── supabase/                     # Client & server factories
│   ├── stripe/                       # Stripe client & server
│   ├── queries/                      # Data fetching functions
│   ├── assistant/                    # AI prompts
│   └── utils.ts                      # Formatters, helpers
├── middleware.ts                     # Auth guard + admin check
├── next.config.js                    # transpilePackages
├── tailwind.config.js                # Custom theme
├── tsconfig.json
└── package.json
```

---

## 8. Pre-Build Checklist

```
[ ] npm install na raiz do monorepo
[ ] .env.local com 9 chaves (Supabase 3 + Stripe 3 + OpenAI 1 + App 2)
[ ] Node >= 20
[ ] Stripe webhook configurado para app.onsiteclub.ca
```

---

## 9. Troubleshooting

| Sintoma | Causa | Fix |
|---------|-------|-----|
| Pagina branca | Package @onsite/* nao compilado | Verificar `transpilePackages` no next.config.js |
| Admin 403 | Usuario nao em core_admin_users | Inserir com is_active = true |
| Stripe checkout falha | STRIPE_SECRET_KEY errado | Verificar key no .env.local |
| AI assistant nao responde | OPENAI_API_KEY faltando | Setar no .env.local |
| Export PDF vazio | jspdf/jspdf-autotable nao instalado | `npm install` na raiz |
| Avatar nao faz upload | Bucket core-avatars nao existe | Criar bucket no Supabase Dashboard |
| Timekeeper chart vazio | Nenhum entry para o usuario | Verificar tmk_entries no Supabase |
| Login loop infinito | Middleware nao refreshing session | Verificar @onsite/supabase middleware |

---

## 10. Deploy Vercel — Passo a Passo

### 10.1 Criar Projeto na Vercel

1. Abrir [vercel.com/new](https://vercel.com/new)
2. Importar repositorio `onsite-eagle`
3. **Project Name**: `onsite-eagle-dashboard` (ou `onsite-dashboard`)
4. Em **Root Directory**, clicar Edit e selecionar: `apps/dashboard`
5. Framework Preset: **Next.js** (auto-detectado)
6. Expandir **Build and Output Settings** e ativar Override:
   - **Build Command**: `npx turbo build --filter=@onsite/dashboard`
   - **Output Directory**: `apps/dashboard/.next`
7. Clicar **Deploy**

> **IMPORTANTE:** Sem o `--filter`, Turborepo builda TODOS os 28 packages.
> Sem o Output Directory override, Vercel procura `.next` na raiz e nao encontra.

### 10.2 Environment Variables

**Team-level (Shared)** — configurar 1x no Team Settings, todos herdam:

| Variavel | Tipo |
|----------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Plain |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Plain |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret |
| `OPENAI_API_KEY` | Secret |

**Project-level** — especificas do Dashboard:

| Variavel | Tipo | Valor |
|----------|------|-------|
| `STRIPE_SECRET_KEY` | Secret | *(Stripe secret key)* |
| `STRIPE_PRICE_ID` | Plain | *(Stripe price ID)* |
| `STRIPE_WEBHOOK_SECRET` | Secret | *(Stripe webhook signing secret)* |
| `NEXT_PUBLIC_APP_URL` | Plain | `https://app.onsiteclub.ca` |
| `TRIAL_PERIOD_DAYS` | Plain | `180` |

### 10.3 Custom Domain

1. Settings > Domains > Add Domain
2. Adicionar: `app.onsiteclub.ca`
3. No DNS, criar CNAME: `app → cname.vercel-dns.com`

### 10.4 Stripe Webhook

Apos deploy, configurar webhook no Stripe Dashboard:
- URL: `https://app.onsiteclub.ca/api/webhooks/stripe`
- Eventos: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`

### 10.5 Ignored Build Step

Settings > Build & Deployment > Ignored Build Step:
```
npx turbo-ignore
```

### 10.6 Verificacao Pos-Deploy

```
[ ] Login page carrega (/)
[ ] OAuth callback funciona (/auth/callback)
[ ] Dashboard /club carrega apos login
[ ] Subscription page mostra status Stripe
[ ] Timekeeper export gera XLSX/PDF
[ ] Custom domain com HTTPS ativo
[ ] Stripe webhook recebe eventos (testar com Stripe CLI)
```

---

## 11. Historico de Erros

### Sessao: 2026-02-27 — Primeiro Deploy Vercel

#### Aprendizado 1: Build Command precisa de --filter
| Campo | Detalhe |
|-------|---------|
| **Data** | 2026-02-27 |
| **Sintoma** | Build falhava — erro no calculator matava todos os apps |
| **Causa Raiz** | `turbo build` sem `--filter` builda TODOS os 28 packages. Erro em qualquer app cancela todos |
| **Fix** | Build Command override: `npx turbo build --filter=@onsite/dashboard` |
| **Arquivos** | Vercel Dashboard > Settings > Build and Deployment |

#### Aprendizado 2: Output Directory precisa de override
| Campo | Detalhe |
|-------|---------|
| **Data** | 2026-02-27 |
| **Sintoma** | `The Next.js output directory ".next" was not found at "/vercel/path0/.next"` |
| **Causa Raiz** | Vercel procura `.next` na raiz do repo, mas o build gera em `apps/dashboard/.next` |
| **Fix** | Output Directory override: `apps/dashboard/.next` |
| **Arquivos** | Vercel Dashboard > Settings > Build and Deployment |
