# OnSite Dashboard v3

Central de autenticação e gerenciamento (SSO Hub) para o ecossistema OnSite Club.

## 🎯 Visão Geral

O OnSite Dashboard é o hub central que conecta todos os apps do ecossistema OnSite Club:
- **Timekeeper** - App de ponto com geofencing
- **Calculator** - Calculadora com voz para construção
- **Shop** - E-commerce (Shopify)
- **Courses** - Cursos (em breve)
- **Checklist** - Checklists de obra (em breve)
- **Blades** - Sistema de recompensas

## 🌐 URLs de Produção

| Serviço | URL |
|---------|-----|
| Hub/Dashboard | https://app.onsiteclub.ca |
| Site institucional | https://onsiteclub.ca |
| Vercel | https://onsite-dashboard-v3.vercel.app |
| GitHub | https://github.com/cristomp0087/onsite-dashboard |

## 📐 Layout

```
Tela de Login (/)
┌──────────────────────────────────────────┐
│           OnSite Club Logo               │
│                                          │
│     Enter your email to continue         │
│     ┌────────────────────────────┐       │
│     │ email@example.com          │       │
│     └────────────────────────────┘       │
│     [        Continue →          ]       │
│                                          │
│  → Se email existe: tela de SENHA        │
│  → Se email novo: tela de CADASTRO       │
└──────────────────────────────────────────┘

Após Login (/account)
┌────────────┬─────────────────────────────┐
│  SIDEBAR   │  HUB COM CARDS              │
│            │                             │
│  Profile   │  ┌────────┐ ┌────────┐     │
│  Settings  │  │Timekpr │ │ Calc   │     │
│  ────────  │  └────────┘ └────────┘     │
│  Terms     │  ┌────────┐ ┌────────┐     │
│  Privacy   │  │ Shop   │ │Courses │     │
│  Cancel    │  └────────┘ └────────┘     │
│  Security  │  ┌────────┐ ┌────────┐     │
│  ────────  │  │Checklist│ │Blades │     │
│  Logout    │  └────────┘ └────────┘     │
└────────────┴─────────────────────────────┘
```

## 🚀 Quick Start

```bash
# Instalar dependências
npm install

# Configurar ambiente
cp .env.example .env.local
# Editar .env.local com suas chaves

# Rodar em desenvolvimento
npm run dev

# Build para produção
npm run build
```

## 🔧 Variáveis de Ambiente

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xmpckuiluwhcdzyadggh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...

# App URLs
NEXT_PUBLIC_APP_URL=https://app.onsiteclub.ca
NEXT_PUBLIC_CALCULATOR_URL=https://calc.onsiteclub.ca
NEXT_PUBLIC_SHOPIFY_URL=https://onsiteclub.ca/shop
```

## 📁 Estrutura de Arquivos

```
app/
├── layout.tsx                  # Layout raiz
├── globals.css                 # Estilos globais + brand colors
├── page.tsx                    # Tela de login inteligente
├── reset-password/
│   └── page.tsx                # Tela de nova senha
├── auth/
│   └── callback/
│       └── route.ts            # Callback OAuth/Reset password
├── terms/page.tsx              # Termos de uso (público)
├── privacy/page.tsx            # Privacidade (público)
├── cancellation/page.tsx       # Cancelamento (público)
├── security/page.tsx           # Segurança (público)
├── (dashboard)/
│   ├── layout.tsx              # Layout com Sidebar
│   └── account/
│       ├── page.tsx            # Hub com Cards
│       ├── timekeeper/         # Dashboard Timekeeper
│       ├── calculator/         # Dashboard Calculator
│       ├── shop/               # Blades + link Shopify
│       ├── courses/            # Coming Soon
│       ├── checklist/          # Coming Soon
│       ├── blades/             # Rewards detalhado
│       ├── profile/            # Editar perfil
│       └── settings/           # Assinatura, device
└── api/
    ├── stripe/                 # Checkout, Portal, Cancel
    ├── webhooks/stripe/        # Stripe webhooks
    ├── profile/                # Update, Avatar
    └── device/                 # Unlink

components/
├── layout/
│   ├── Sidebar.tsx             # Sidebar com config + legal
│   └── Header.tsx              # Header com avatar + blades
└── ui/
    ├── StatCard.tsx
    └── EmptyState.tsx

lib/
├── supabase/
│   ├── client.ts               # Cliente browser
│   └── server.ts               # Cliente server
└── stripe/
    └── server.ts

middleware.ts                   # Proteção de rotas
tailwind.config.js
```

## 🔐 Autenticação

### Login Inteligente (Facebook-style)

O sistema usa um fluxo inteligente de login:

1. Usuário digita email → clica Continue
2. Sistema verifica na tabela `profiles` se email existe
3. **Se EXISTE** → mostra tela de senha (Welcome back!)
4. **Se NÃO EXISTE** → mostra tela de cadastro com campos:
   - First name / Last name
   - Trade (profissão)
   - Birthday (opcional)
   - Gender (opcional)
   - Password

### Campos de Cadastro

```typescript
const trades = [
  'Other / Not in construction',
  'Carpenter', 'Framer', 'Drywaller',
  'Electrician', 'Plumber', 'HVAC Technician',
  'Painter', 'Roofer', 'Mason / Bricklayer',
  'Concrete Finisher', 'Ironworker', 'Welder',
  'Glazier', 'Insulator', 'Flooring Installer',
  'Tile Setter', 'Siding Installer', 'Landscaper',
  'General Laborer', 'Superintendent',
  'Project Manager', 'Estimator', 'Safety Officer'
]
```

### Reset Password

1. Usuário clica "Forgot password"
2. Supabase envia email com link
3. Link redireciona para `/auth/callback`
4. Callback valida token e redireciona para `/reset-password`
5. Usuário digita nova senha
6. Sistema atualiza via `supabase.auth.updateUser()`

## ⚙️ Configurações do Supabase

### URL Configuration
- **Site URL:** `https://app.onsiteclub.ca`
- **Redirect URLs:**
  - `https://app.onsiteclub.ca/auth/callback`
  - `https://app.onsiteclub.ca/reset-password`

### Email Templates → Reset Password
```html
<h2>Reset Password</h2>
<p>Follow this link to reset the password for your user:</p>
<p><a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password">Reset Password</a></p>
```

> ⚠️ **IMPORTANTE:** Use `{{ .TokenHash }}` e NÃO `{{ .Token }}`. Token é OTP curto (6 dígitos), TokenHash é o hash completo para links.

### Providers → Email
- **Confirm email:** DESATIVADO

### RLS Policies Necessárias

```sql
-- Permitir verificação de email sem estar logado
CREATE POLICY "Allow public email check" ON profiles
FOR SELECT USING (true);
```

## 🗄️ Banco de Dados

### Tabela `profiles`
```sql
id (uuid, PK, ref auth.users)
email (text, unique)
nome (text)                    -- nome completo (compatibilidade mobile)
first_name (text)
last_name (text)
birthday (date)
gender (text)
trade (text)                   -- profissão
cor_padrao (text)
horario_inicio (time)
horario_fim (time)
timezone (text)
device_id (text)
device_registered_at (timestamp)
device_model (text)
device_platform (text)
stripe_customer_id (text)
stripe_subscription_id (text)
subscription_status (text)     -- trialing, active, canceled
trial_ends_at (timestamp)      -- 6 meses após signup
subscription_started_at (timestamp)
subscription_canceled_at (timestamp)
has_payment_method (boolean)
voice_calculator_enabled (boolean)
sync_enabled (boolean)
is_admin (boolean)
is_suspended (boolean)
suspension_reason (text)
created_at (timestamp)
updated_at (timestamp)
last_seen_at (timestamp)
```

### Tabela `locais`
```sql
id (uuid, PK)
user_id (uuid, FK profiles) ON DELETE SET NULL
nome (text)
endereco (text)
latitude (decimal)
longitude (decimal)
raio (integer)
cor (text)
ativo (boolean)
created_at (timestamp)
```

### Tabela `registros`
```sql
id (uuid, PK)
user_id (uuid, FK profiles) ON DELETE SET NULL
local_id (uuid, FK locais)
entrada (timestamp)
saida (timestamp)
tipo (text)
created_at (timestamp)
```

### Trigger para Auto-criar Profile
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id, email, first_name, last_name, nome, trade,
    subscription_status, trial_ends_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    COALESCE(
      NEW.raw_user_meta_data->>'nome',
      CONCAT(NEW.raw_user_meta_data->>'first_name', ' ', NEW.raw_user_meta_data->>'last_name')
    ),
    NEW.raw_user_meta_data->>'trade',
    'trialing',
    (NOW() + INTERVAL '180 days')::timestamptz
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Cascade Delete (Privacidade)
```sql
-- Profile deleta junto com auth.user
ALTER TABLE profiles
ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- Registros e locais mantém mas anonimiza (user_id = NULL)
ALTER TABLE registros
ADD CONSTRAINT registros_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id)
  ON DELETE SET NULL;

ALTER TABLE locais
ADD CONSTRAINT locais_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id)
  ON DELETE SET NULL;
```

## 💳 Stripe

### Plano
- **Preço:** CAD $9.99/mês
- **Trial:** 6 meses grátis
- **Moeda:** CAD

### Webhook Events
| Event | Ação |
|-------|------|
| `checkout.session.completed` | Ativa subscription |
| `customer.subscription.updated` | Atualiza status |
| `customer.subscription.deleted` | Cancela + bloqueia features |
| `invoice.payment_succeeded` | Marca como ativo |
| `invoice.payment_failed` | Marca como past_due |

### Configurar Webhook
1. Deploy na Vercel
2. Stripe Dashboard → Developers → Webhooks
3. Add endpoint: `https://app.onsiteclub.ca/api/webhooks/stripe`
4. Selecionar events acima
5. Copiar signing secret para `STRIPE_WEBHOOK_SECRET`

## 🎨 Cores da Marca

```css
/* OnSite Amber/Orange */
--brand-500: #f59e0b;
--brand-600: #d97706;

/* Definido no tailwind.config.js */
colors: {
  brand: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',  /* Primary */
    600: '#d97706',  /* Hover */
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  }
}
```

### Classes CSS
```css
.bg-brand-500     /* Fundo laranja principal */
.bg-brand-600     /* Fundo laranja hover */
.text-brand-500   /* Texto laranja */
.text-brand-600   /* Texto laranja escuro */
.focus:ring-brand-500  /* Ring de foco */
```

## 📱 Integração Mobile (Timekeeper)

O app mobile React Native/Expo usa:
- **Mesmo Supabase project**
- **Mesmas credenciais** (URL + anon key)
- **Mesmas tabelas:** profiles, locais, registros
- **RLS** garante isolamento por user_id

### Fluxo de Auth no Mobile
1. Login com email/senha via Supabase Auth
2. Token armazenado no SecureStore
3. Sync com tabelas locais (SQLite) quando online

## 🔧 Integração Calculator

### Opção Recomendada: Subdomínio
- URL: `calc.onsiteclub.ca`
- Usa mesmo Supabase project

### Fluxo
```
Calculator verifica sessão Supabase
    ↓
Sem sessão? → Redireciona para app.onsiteclub.ca
    ↓
Com sessão → Verifica voice_calculator_enabled
    ↓
Enabled? → Libera voice input (Whisper + GPT-4o)
Disabled? → Mostra upgrade/adicionar cartão
```

## ✅ Checklist Deploy

- [ ] `.env.local` configurado com todas as variáveis
- [ ] `npm run build` sem erros
- [ ] Deploy na Vercel
- [ ] Domínio `app.onsiteclub.ca` configurado
- [ ] DNS CNAME apontando para Vercel
- [ ] Supabase URL Configuration atualizado
- [ ] Email template com `{{ .TokenHash }}`
- [ ] RLS policy "Allow public email check"
- [ ] Webhook Stripe configurado
- [ ] Testar fluxo: signup → login → reset password

## 🐛 Problemas Conhecidos e Soluções

### Email não reconhecido como existente
**Causa:** RLS bloqueando query
**Solução:** Criar policy `Allow public email check`

### Reset password "link expired"
**Causa:** Template usando `{{ .Token }}` ao invés de `{{ .TokenHash }}`
**Solução:** Atualizar template no Supabase

### 404 DEPLOYMENT_NOT_FOUND
**Causa:** Erro de sintaxe no código (geralmente route.ts)
**Solução:** Verificar build logs na Vercel

### TypeScript "implicitly has any type"
**Causa:** Parâmetros sem tipo explícito
**Solução:** Adicionar tipos, ex: `cookiesToSet: { name: string; value: string; options: CookieOptions }[]`

## 🎯 Status Atual

### ✅ Funcionando
- Deploy no Vercel
- Domínio app.onsiteclub.ca
- Login inteligente
- Cadastro com trade
- Dashboard com cards
- Proteção de rotas

### 🔄 Em Teste
- Reset password (template atualizado)

### 📋 Pendente
- Webhook Stripe em produção
- Integração Calculator
- Página de settings com Stripe
- Integração Timekeeper mobile

## 📞 Suporte

- **Geral:** support@onsiteclub.ca
- **Segurança:** security@onsiteclub.ca
- **Privacidade:** privacy@onsiteclub.ca

---

© 2025 OnSite Club. All rights reserved.
