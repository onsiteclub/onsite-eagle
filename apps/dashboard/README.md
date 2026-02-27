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

# OnSite Dashboard

> SSO Hub e centro de experiencia do membro OnSite Club.

## 1. Identidade

| Campo | Valor |
|-------|-------|
| **Nome** | OnSite Dashboard |
| **Diretorio** | `apps/dashboard` |
| **Proposito** | Hub central do ecossistema. Login unico (email-first smart login), gerenciamento de perfil, assinatura via Stripe, dashboards por app (Timekeeper com chart + export, Calculator stats), admin panel, AI assistant widget, sistema de rewards (Blades). E onde o worker gerencia sua vida no OnSite Club. |
| **Audiencia** | Todos os usuarios do ecossistema + admins |
| **Plataforma** | Web |
| **Porta Dev** | 3000 |
| **URL Producao** | `app.onsiteclub.ca` |

## 2. Tech Stack

| Camada | Tecnologia | Versao |
|--------|------------|--------|
| Framework | Next.js | 16.1.6 |
| React | React | ^19.0.0 |
| Payments | Stripe (client + server) | ^14.21.0 / ^2.4.0 |
| AI | OpenAI | ^6.16.0 |
| Charts | Recharts | ^3.6.0 |
| PDF Export | jsPDF + jspdf-autotable | ^3.0.4 / ^5.0.2 |
| Excel Export | xlsx | ^0.18.5 |
| Database | Supabase SSR | via @onsite/supabase |
| Icons | lucide-react | ^0.460.0 |
| Dates | date-fns | ^3.6.0 |
| Styling | Tailwind CSS | ^3.4.1 |
| Deploy | Vercel | Auto-deploy |

## 3. Telas / Rotas

### Publicas (sem auth)

| Rota | Descricao |
|------|-----------|
| `/` | Login page (email-first smart login) |
| `/auth/callback` | OAuth/reset password callback |
| `/reset-password` | Form de nova senha |
| `/legal/terms` | Termos de Servico |
| `/legal/privacy` | Politica de Privacidade |
| `/legal/security` | Seguranca de Dados |
| `/legal/cancellation` | Politica de Cancelamento |

### Club Hub (`/club/*` — protegido)

| Rota | Descricao |
|------|-----------|
| `/club` | Hub principal — weekly stats, news, recent activity, app cards |
| `/club/apps` | Todos os apps disponiveis (cards) |
| `/club/card` | OnSite Card digital (mockup + waitlist) |
| `/club/badges` | Achievement badges |
| `/club/rewards` | Dashboard de rewards (Blades) |
| `/club/stats` | Estatisticas detalhadas |
| `/club/wallet` | Wallet (mockup + waitlist) |
| `/club/news` | Noticias e campanhas |

### Account (`/account/*` — protegido)

| Rota | Descricao |
|------|-----------|
| `/account/profile` | Editar perfil (nome, trade, avatar, etc.) |
| `/account/subscription` | Billing e gerenciamento de assinatura |
| `/account/devices` | Devices linkados |
| `/account/privacy` | Privacidade e data export |
| `/account/security` | Seguranca (password change) |

### App Dashboards (`/app/*` — protegido)

| Rota | Descricao | Status |
|------|-----------|--------|
| `/app/timekeeper` | Hours tracking — chart, editable table, export XLSX/PDF | Completo |
| `/app/calculator` | Calculator stats e voice feature | Parcial |
| `/app/eagle` | Visual inspection dashboard | Placeholder |
| `/app/field` | Site documentation dashboard | Placeholder |
| `/app/operator` | Operations dashboard | Placeholder |
| `/app/inspect` | Inspector dashboard | Placeholder |
| `/app/shop` | Shopify integration link | Link only |

### Admin (`/admin/*` — super-admin only)

| Rota | Descricao |
|------|-----------|
| `/admin/users` | User management |
| `/admin/analytics` | Analytics dashboard |
| `/admin/architecture` | System architecture (debug) |
| `/admin/campaigns` | Campaign management |

### API Endpoints (11)

| Rota | Metodo | Descricao |
|------|--------|-----------|
| `/api/auth/callback` | POST | OAuth callback handler |
| `/api/stripe/checkout` | POST | Criar Stripe checkout session |
| `/api/stripe/portal` | POST | Stripe billing portal link |
| `/api/stripe/cancel` | POST | Cancelar subscription |
| `/api/webhooks/stripe` | POST | Webhook handler (5 eventos) |
| `/api/profile/update` | POST | Update core_profiles |
| `/api/profile/avatar` | POST | Upload avatar para storage |
| `/api/device/unlink` | POST | Unlink device |
| `/api/timekeeper/update` | PATCH | Edit entry times |
| `/api/timekeeper/export/excel` | POST | Export XLSX |
| `/api/timekeeper/export/pdf` | POST | Export PDF |
| `/api/assistant/chat` | POST | OpenAI chat (widget) |

## 4. Packages Internos

| Package | Imports | Proposito |
|---------|---------|-----------|
| `@onsite/auth` | `AuthProvider`, `useAuth` | Auth context e hooks |
| `@onsite/auth-ui` | Auth components | UI de login/signup |
| `@onsite/supabase` | `createClient()` (server + browser) | Supabase SSR client |
| `@onsite/utils` | `cn()`, formatters | Utility functions |
| `@onsite/shared` | Types | Interfaces compartilhadas |
| `@onsite/ui` | Components, theme | Componentes base |

## 5. Fluxo de Dados

### Tabelas Supabase (leitura)

| Tabela | Uso |
|--------|-----|
| `core_profiles` | Perfil do usuario (nome, trade, avatar) |
| `core_devices` | Devices registrados |
| `core_admin_users` | Check de admin no middleware |
| `billing_subscriptions` | Status de assinatura por app |
| `tmk_entries` | Horas de trabalho (Timekeeper dashboard) |
| `tmk_geofences` | Locais (Timekeeper dashboard) |
| `core_ai_conversations` | Historico do AI assistant |

### Tabelas Supabase (escrita)

| Tabela | Uso |
|--------|-----|
| `core_profiles` | Update perfil, avatar_url, last_active_at |
| `core_devices` | Unlink device |
| `billing_subscriptions` | UPSERT via Stripe webhook |
| `payment_history` | INSERT via Stripe webhook |
| `tmk_entries` | Edit entry times |
| `core_ai_conversations` | Salvar conversas do assistant |

### Storage

| Bucket | Uso |
|--------|-----|
| `core-avatars` | Upload de avatares de usuario |
| `tmk-exports` | Exports de horas (XLSX, PDF) |

### Login Flow (Smart Login)

```
Usuario digita email → Continue
  → Query core_profiles por email
  → Email existe? → Tela de senha (Welcome back!)
  → Email novo? → Tela de cadastro (nome, trade, birthday, gender, senha)
  → Signup → Supabase trigger cria profile com trial de 180 dias
```

### Conexao com Outros Apps

```
Timekeeper ──[tmk_entries]──→ Dashboard (chart + table + export)
Calculator ──[ccl_calculations]──→ Dashboard (stats)
Auth Hub ──[billing_subscriptions]──→ Dashboard (subscription management)
Dashboard ──[core_profiles]──→ Todos os apps (perfil compartilhado)
```

### Key Functions

| Funcao | Proposito |
|--------|-----------|
| `getWeeklyStats()` | Agrega horas, fotos, calculos da semana |
| `getAppStats()` | Conta entries por app para o usuario |
| `getRecentActivity()` | Ultimas 5 atividades cross-app |
| `getStreak()` | Dias consecutivos com atividade |

## 6. Decisoes de Arquitetura

1. **Pre-2026: Email-first smart login (Facebook-style)** — Usuario digita email primeiro. Sistema verifica se existe. Se sim, mostra senha. Se nao, mostra cadastro com trade selection. Reduz friccao — nao precisa lembrar se tem conta.

2. **Pre-2026: Hub com 5-second value delivery** — Home page mostra stats da semana, news, app cards, atividade recente. Worker ve valor imediatamente ao logar.

3. **Pre-2026: Middleware com admin check** — Rotas `/admin/*` verificam `core_admin_users` com `is_active = true`. Nao e so autenticacao — e autorizacao por role.

4. **Pre-2026: Timekeeper dashboard com inline editing** — Tabela de horas permite editar entrada/saida diretamente na celula. Recharts para grafico semanal. Export para XLSX (xlsx) e PDF (jsPDF).

5. **Pre-2026: AI assistant widget (OpenAI)** — Widget flutuante de chat com OpenAI. Conversa salva em `core_ai_conversations`. Usa model configuravel via API.

6. **Pre-2026: Trial de 180 dias** — 6 meses de trial gratis. Configuravel via env var `TRIAL_PERIOD_DAYS`. Trigger do Supabase seta `trial_ends_at` no signup.

7. **Pre-2026: Blades rewards system** — Sistema de pontos (Blades) por atividade. Balance calculado, UI de transacoes pendente.

8. **Pre-2026: OnSite Card (planned)** — Cartao pre-pago digital para workers. Fase 0 (mockup + waitlist) completa. Integracao real planejada para Q2-Q4 2026.

9. **Pre-2026: App dashboards como meta-pages** — Cada app tem uma pagina no Dashboard que mostra dados daquele app (horas, calculos, fotos). Timekeeper e o mais completo. Outros sao placeholders.

## 7. Historico de Evolucao

### Pre-2026 — v1: Foundation
- Email-first smart login com trade selection
- Supabase Auth com middleware SSR
- Deploy no Vercel com dominio `app.onsiteclub.ca`

### Pre-2026 — v2: Billing & Club
- Stripe integration (checkout, portal, cancel)
- Webhook handler para 5 eventos
- Hub com app cards, stats, news
- Sidebar com navegacao + legal pages

### Pre-2026 — v3: Features
- Timekeeper dashboard (chart + editable table + export XLSX/PDF)
- Profile editing com avatar upload
- Device management (unlink)
- Admin panel (users, analytics, architecture, campaigns)
- AI assistant widget (OpenAI)
- Blades rewards system (balance)
- OnSite Card mockup + waitlist
- 4 legal pages (terms, privacy, security, cancellation)
- Middleware protection com admin role check
