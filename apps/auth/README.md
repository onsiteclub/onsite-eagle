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

# OnSite Auth

> Hub centralizado de autenticacao e billing para todo o ecossistema OnSite Club.

## 1. Identidade

| Campo | Valor |
|-------|-------|
| **Nome** | OnSite Auth Hub |
| **Diretorio** | `apps/auth` |
| **Proposito** | Gateway de autenticacao e pagamentos. Nao tem UI propria para usuarios finais — e acessado via URLs de checkout/callback pelos outros apps. Gerencia 3 fluxos de checkout (short code, email, JWT), processa webhooks do Stripe, e mantem `billing_subscriptions` atualizado. |
| **Audiencia** | Todos os apps do ecossistema (acesso programatico) |
| **Plataforma** | Web |
| **Porta Dev** | 3000 |
| **URL Producao** | `auth.onsiteclub.ca` |

## 2. Tech Stack

| Camada | Tecnologia | Versao |
|--------|------------|--------|
| Framework | Next.js | 16.1.6 |
| React | React | ^19.0.0 |
| Payments | Stripe | ^16.0.0 |
| Database | Supabase SSR | via @onsite/supabase |
| Icons | lucide-react | ^0.400.0 |
| Animation | canvas-confetti | ^1.9.0 |
| Styling | Tailwind CSS | ^3.4.0 |
| Deploy | Vercel | Auto-deploy |

## 3. Telas / Rotas

### Paginas

| Rota | Descricao | Auth |
|------|-----------|------|
| `/` | Home — redirect para /manage se logado | Nao |
| `/checkout/[app]` | Valida JWT/email/code → cria Stripe session → redirect | Nao |
| `/checkout/success` | Pagina de sucesso com confetti + link de retorno | Nao |
| `/r/[code]` | Short code redirect (workaround Capacitor) → valida → redirect | Nao |
| `/manage` | Gerenciamento de assinatura | Sim |
| `/delete-account` | Confirmacao de deletar conta | Sim |
| `/reset-password` | Form de nova senha (pos-callback) | Nao |

### Auth Routes

| Rota | Descricao |
|------|-----------|
| `/callback` | OAuth callback + refresh de tokens |
| `/logout` | Logout handler |

### API Endpoints (5)

| Rota | Metodo | Descricao |
|------|--------|-----------|
| `/api/checkout` | POST | Criar Stripe checkout session (legacy/fallback) |
| `/api/portal` | POST | Criar link do Stripe customer portal |
| `/api/subscription/status` | GET | Query status de assinatura do usuario |
| `/api/delete-account` | POST | Deletar conta do usuario + auth |
| `/api/webhooks/stripe` | POST | Webhook handler (6 eventos Stripe) |

## 4. Packages Internos

| Package | Imports | Proposito |
|---------|---------|-----------|
| `@onsite/supabase` | `createClient()` (server + browser), `createAdminClient()` | Supabase SSR client para Next.js |

**Nota:** Este app usa SOMENTE `@onsite/supabase`. Componentes UI sao proprios (AuthCard, Button, Input, Alert, Logo).

## 5. Fluxo de Dados

### 3 Fluxos de Checkout

#### Flow 1: Short Code (Recomendado para mobile)

```
App cria codigo em checkout_codes → abre /r/CODE
  → Auth Hub valida codigo → extrai email + user_id
  → Cria Stripe session → redirect para Stripe
  → Stripe coleta pagamento → webhook atualiza billing_subscriptions
  → Success page com confetti → usuario retorna ao app
```

**Por que:** Workaround para bug do Capacitor que trunca query params em URLs longas.

#### Flow 2: Email-Only (Simples)

```
App passa prefilled_email + optional user_id via query param
  → Auth Hub cria Stripe session
  → Se user_id faltando, webhook faz lookup por email
```

#### Flow 3: JWT Token (Legacy, mais seguro)

```
App gera JWT HMAC-SHA256 com secret compartilhado
  → Auth Hub valida signature + expiracao + campos
  → Token expira em 5 min, inclui anti-replay (jti)
```

### Tabelas Supabase (leitura)

| Tabela | Uso |
|--------|-----|
| `auth.users` | Lookup por email no webhook (admin API) |
| `checkout_codes` | Validar short codes (5 min TTL) |
| `billing_subscriptions` | Query status de assinatura |

### Tabelas Supabase (escrita)

| Tabela | Uso |
|--------|-----|
| `billing_subscriptions` | UPSERT via webhook (checkout.session.completed) |
| `payment_history` | INSERT via webhook (invoice.paid, checkout.session.completed) |
| `checkout_codes` | UPDATE mark as used |

### Webhook → Tabela Mapping

| Evento Stripe | Acao |
|---------------|------|
| `checkout.session.completed` | UPSERT `billing_subscriptions` + INSERT `payment_history` |
| `customer.subscription.updated` | UPDATE status, period_end, cancel_at_period_end |
| `customer.subscription.deleted` | UPDATE status = 'canceled' |
| `invoice.payment_failed` | UPDATE status = 'past_due' |
| `invoice.paid` | INSERT renovacao em `payment_history` |
| `charge.refunded` | UPDATE `payment_history` status = 'refunded' |

### Produtos Atuais

| Produto | App ID | Preco | Billing |
|---------|--------|-------|---------|
| OnSite Calculator Pro | `calculator` | $11.99 CAD | Anual |
| OnSite Timekeeper Pro | `timekeeper` | $23.99 CAD | Anual |

### Conexao com Outros Apps

```
Calculator ──[short code / JWT]──→ Auth Hub ──[Stripe session]──→ Stripe
Timekeeper ──[short code / JWT]──→ Auth Hub ──[Stripe session]──→ Stripe
Stripe ──[webhook]──→ Auth Hub ──[UPSERT]──→ billing_subscriptions
Apps ──[query]──→ billing_subscriptions ──→ Feature gating
```

### Para Adicionar Novo App ao Auth Hub

1. Blue cria Stripe product → fornece price ID
2. Atualizar `lib/stripe.ts`: type `AppName`, `getAppConfig()`, `isValidApp()`
3. Adicionar env var `STRIPE_PRICE_{APP}` ao .env.local
4. App implementa um dos 3 fluxos de checkout

## 6. Decisoes de Arquitetura

1. **Pre-2026: Hub centralizado (nao auth por app)** — Um unico Auth Hub para todos os apps. Stripe webhooks em um lugar so. Apps nao precisam de Stripe SDK.

2. **Pre-2026: 3 fluxos de checkout** — Short code para mobile (Capacitor bug), email-only para web simples, JWT para seguranca maxima. Todos convergem no mesmo Stripe session.

3. **Pre-2026: JWT HMAC-SHA256 com Web Crypto** — Usa `crypto.subtle.verify` (nao jsonwebtoken). Funciona em Edge Runtime e Node.js. Token com TTL de 5 min e campo jti anti-replay.

4. **Pre-2026: Fallback de user_id no webhook** — Se metadata do Stripe nao tem user_id, webhook faz `auth.admin.listUsers()` por email. Garante que billing_subscriptions sempre tem owner.

5. **2026-01-18: Schema migration (subscriptions → billing_subscriptions)** — Rename de tabelas para convencao nova. Webhook e queries atualizados. Campo `app` renomeado para `app_name`.

6. **2026-01-18: Vercel migration** — Deploy migrado para Vercel com dominio `auth.onsiteclub.ca`. Security headers habilitados (X-Frame-Options: DENY, etc.).

7. **Pre-2026: Componentes UI proprios** — AuthCard, Button, Input, Alert, Logo. Nao usa @onsite/ui para manter o app leve e sem dependencias extras.

8. **Pre-2026: Tema gold accent (#F6C343)** — Diferenciado dos outros apps (teal #0F766E) para indicar visualmente que e o hub de pagamentos.

## 7. Historico de Evolucao

### Pre-2026 — v1.0: Auth Hub Foundation
- Login, signup, logout, OAuth callback
- Supabase SSR com middleware para refresh de sessao
- Rotas protegidas com redirect

### 2026-01-17 — v1.1: Stripe Integration
- JWT authentication para checkout seguro
- HMAC-SHA256 com Web Crypto API
- Webhook handler para 6 eventos Stripe

### 2026-01-18 — v1.2: Schema Alignment
- Rename `subscriptions` → `billing_subscriptions`
- Rename campo `app` → `app_name`
- Fix: webhook tentava escrever em tabela inexistente

### 2026-01-18 — v1.3: Vercel Migration
- Deploy migrado de setup anterior para Vercel
- Dominio `auth.onsiteclub.ca` configurado
- Git connection corrigida

### 2026-01-18 — v1.4: Success Page
- Nova pagina de sucesso com card design
- Confetti animation via canvas-confetti
- Link de retorno ao app de origem

### 2026-01-19 — v1.5: Integration Guide & Short Codes
- Short code flow (`/r/[code]`) para apps Capacitor
- `redirect_url` no checkout_codes para auto-redirect
- Documentacao de integracao completa (HERMES.md)
