<!--
  @ai-rules
  1. NUNCA delete entradas de "Historico de Erros" — apenas ADICIONE novas com data.
  2. NUNCA delete entradas de "Troubleshooting" — apenas ADICIONE novas linhas.
  3. Ao corrigir um erro de build, SEMPRE adicione ao Historico de Erros com:
     data, sintoma, causa raiz, fix, e arquivos alterados.
  4. Mantenha as secoes na ordem. Nao reorganize.
  5. Este arquivo e a UNICA FONTE DE VERDADE para build e deploy deste app.
-->

# OnSite Auth — Pipeline & Build Guide

> Stack: Next.js 16.1.6 + React 19 + Stripe 16.0.0 + Supabase SSR
> Platform: Web (auth hub para todos os apps)
> CI/CD: Vercel (auto-deploy)

---

## 1. Quick Reference

```bash
cd apps/auth
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
cd apps/auth
npm run dev          # http://localhost:3000
```

### Producao

```bash
npm run build        # next build
npm run start        # next start
```

### Deploy (Vercel — auto-deploy)

```bash
# Configurado via Vercel dashboard
# Push para main → auto-deploy
# Ou manual:
vercel --prod
```

`vercel.json` existe com `{ "framework": "nextjs" }`.

### Quando Rebuildar?

| Mudou o que? | Comando |
|--------------|---------|
| Codigo JS/TS | Hot reload automatico |
| `package.json` (deps) | `npm install` na raiz + restart dev |
| `next.config.js` | Restart dev server |
| Package `@onsite/supabase` | Restart dev server |
| Stripe price IDs | Atualizar .env.local + restart |

---

## 3. Configs Criticos

### next.config.js

```javascript
// Security headers habilitados:
// X-Frame-Options: DENY
// X-Content-Type-Options: nosniff
// Referrer-Policy: strict-origin-when-cross-origin
// React strict mode: true
```

**NAO mudar:** Headers de seguranca sao obrigatorios para auth hub.

### vercel.json

```json
{ "framework": "nextjs" }
```

### middleware.ts

Usa Supabase SSR para refresh de sessao:
- Chama `supabase.auth.getUser()` em TODA request
- Refresh de cookies automatico
- Matcher: todas as rotas exceto assets estaticos

### lib/stripe.ts

Configuracao de apps e precos. Para adicionar um novo app:
1. Adicionar ao type `AppName`
2. Adicionar config em `getAppConfig()`
3. Atualizar `isValidApp()`

### lib/checkout-token.ts

Validacao JWT HMAC-SHA256 para checkout seguro:
- Web Crypto API (`crypto.subtle.verify`)
- Valida: signature, expiracao, campos obrigatorios (sub, email, app)
- Token expira em 5 minutos
- Inclui anti-replay com campo `jti`

---

## 4. Packages Usados

| Package | Import | Uso |
|---------|--------|-----|
| `@onsite/supabase` | `createClient()` (server + browser), `createAdminClient()` | Supabase SSR client para Next.js |

**Nota:** Este app usa APENAS `@onsite/supabase`. Nao depende de auth, ui, shared, etc.

---

## 5. Variaveis de Ambiente

Arquivo: `apps/auth/.env.local` (NAO commitar)

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
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret | **Sim** |
| `STRIPE_PRICE_CALCULATOR` | Price ID do Calculator Pro | Nao |
| `STRIPE_PRICE_TIMEKEEPER` | Price ID do Timekeeper Pro | Nao |

### URLs

| Variavel | Descricao | Secret |
|----------|-----------|--------|
| `NEXT_PUBLIC_AUTH_URL` | URL deste app (auth hub) | Nao |
| `NEXT_PUBLIC_CALCULATOR_URL` | URL do Calculator | Nao |
| `NEXT_PUBLIC_TIMEKEEPER_SCHEME` | Deep link scheme do Timekeeper | Nao |

### Seguranca

| Variavel | Descricao | Secret |
|----------|-----------|--------|
| `CHECKOUT_JWT_SECRET` | Secret para validar JWTs de checkout (min 32 chars) | **Sim** |

---

## 6. Stripe Webhook Setup

### URL do Webhook

```
https://auth.onsiteclub.ca/api/webhooks/stripe
```

### Eventos Necessarios

| Evento | Acao |
|--------|------|
| `checkout.session.completed` | UPSERT em `billing_subscriptions` + INSERT em `payment_history` |
| `customer.subscription.updated` | UPDATE status, period_end, cancel_at_period_end |
| `customer.subscription.deleted` | UPDATE status = 'canceled' |
| `invoice.payment_failed` | UPDATE status = 'past_due' |
| `invoice.paid` | INSERT renovacao em `payment_history` |
| `charge.refunded` | UPDATE `payment_history` status = 'refunded' |

### Fallback de user_id

Se `user_id` nao esta no metadata da sessao Stripe, o webhook faz lookup via `auth.admin.listUsers()` pelo email.

---

## 7. Estrutura de Arquivos

```
apps/auth/
├── app/
│   ├── layout.tsx                    # Root layout + metadata
│   ├── page.tsx                      # Home → redirect /manage ou mensagem
│   ├── HomeClient.tsx                # Client-side home logic
│   ├── error.tsx                     # Error boundary global
│   ├── not-found.tsx                 # 404
│   ├── (auth)/
│   │   ├── callback/route.ts        # OAuth callback
│   │   └── logout/route.ts          # Logout handler
│   ├── checkout/
│   │   ├── [app]/page.tsx           # Valida JWT/email → Stripe session → redirect
│   │   ├── CheckoutMessage.tsx      # Error/canceled messages
│   │   └── success/
│   │       ├── page.tsx             # Pagina de sucesso
│   │       └── SuccessClient.tsx    # Confetti + link de retorno
│   ├── r/
│   │   └── [code]/route.ts          # Short code redirect (Capacitor workaround)
│   ├── manage/
│   │   ├── page.tsx                 # Gerenciamento de assinatura
│   │   └── ManageClient.tsx         # UI de assinatura
│   ├── delete-account/
│   │   ├── page.tsx                 # Deletar conta
│   │   └── DeleteAccountClient.tsx  # Confirmacao
│   ├── reset-password/
│   │   ├── page.tsx                 # Reset senha
│   │   └── ResetPasswordClient.tsx  # Form de nova senha
│   └── api/
│       ├── checkout/route.ts        # Criar Stripe session (legacy)
│       ├── portal/route.ts          # Stripe customer portal
│       ├── subscription/
│       │   └── status/route.ts      # Query status de assinatura
│       ├── delete-account/route.ts  # Deletar conta + auth
│       └── webhooks/
│           └── stripe/route.ts      # Webhook handler (6 eventos)
├── components/
│   ├── AuthCard.tsx                 # Card wrapper
│   ├── Button.tsx                   # CTA button
│   ├── Input.tsx                    # Form input
│   ├── Alert.tsx                    # Alert/error
│   ├── Logo.tsx                     # OnSite logo
│   └── index.ts                     # Barrel export
├── lib/
│   ├── stripe.ts                    # Config + session creation
│   ├── checkout-token.ts            # JWT HMAC-SHA256 validation
│   └── supabase/
│       ├── client.ts                # Browser client
│       └── server.ts                # Server client
├── middleware.ts                     # Auth refresh + session cookies
├── next.config.js                   # Security headers
├── vercel.json                      # { framework: "nextjs" }
├── tailwind.config.js               # Theme (accent gold #F6C343)
├── tsconfig.json
└── package.json
```

---

## 8. Pre-Build Checklist

```
[ ] npm install na raiz do monorepo
[ ] .env.local com 10 chaves (Supabase 3 + Stripe 4 + URLs 2 + JWT 1)
[ ] Node >= 20
[ ] Stripe webhook configurado para auth.onsiteclub.ca
[ ] Stripe price IDs corretos para cada app
```

---

## 9. Troubleshooting

| Sintoma | Causa | Fix |
|---------|-------|-----|
| Checkout redireciona para 404 | App name invalido na URL | Verificar `isValidApp()` em lib/stripe.ts |
| Webhook retorna 400 | STRIPE_WEBHOOK_SECRET errado | Verificar secret no Stripe Dashboard |
| JWT validation falha | CHECKOUT_JWT_SECRET diferente entre apps | Garantir mesma secret em ambos |
| Subscription nao atualiza | user_id missing no metadata | Webhook faz fallback por email, verificar se email existe |
| Confetti nao aparece na success | canvas-confetti nao instalado | `npm install canvas-confetti` |
| Short code /r/CODE 404 | Codigo expirado (5 min TTL) | Gerar novo codigo e tentar novamente |
| Pagina branca | @onsite/supabase nao compilado | Verificar `transpilePackages` no next.config.js |

---

## 10. Historico de Erros

### Sessao: 2026-01-18 — Schema Migration

#### Erro 1: Nome de tabela errado
| Campo | Detalhe |
|-------|---------|
| **Data** | 2026-01-18 |
| **Sintoma** | Webhook tentava escrever em `subscriptions` (tabela inexistente) |
| **Causa Raiz** | Rename para `billing_subscriptions` nao propagado ao webhook |
| **Fix** | Atualizar todas as queries para usar `billing_subscriptions` |
| **Arquivos** | `app/api/webhooks/stripe/route.ts` |

#### Erro 2: Campo `app` vs `app_name`
| Campo | Detalhe |
|-------|---------|
| **Data** | 2026-01-18 |
| **Sintoma** | Insert falhava com column `app` does not exist |
| **Causa Raiz** | Schema usa `app_name`, codigo usava `app` |
| **Fix** | Renomear campo no INSERT para `app_name` |
| **Arquivos** | `app/api/webhooks/stripe/route.ts` |

### Sessao: 2026-01-18 — Vercel Migration

#### Erro 3: Deploy falha no Vercel
| Campo | Detalhe |
|-------|---------|
| **Data** | 2026-01-18 |
| **Sintoma** | Build falha com "Cannot find module '@onsite/supabase'" |
| **Causa Raiz** | Git connection estava em branch errado |
| **Fix** | Reconectar Git no Vercel dashboard, selecionar branch correct |
| **Arquivos** | Vercel dashboard config |
