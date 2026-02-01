# OnSite Auth Hub

Sistema centralizado de autenticação para o ecossistema OnSite Club.

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                     ONSITE AUTH HUB                         │
│                   auth.onsiteclub.ca                        │
│                                                             │
│  /login     /signup     /logout     /callback               │
│  /reset-password        /verify                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │    SUPABASE     │
                    └─────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
   Dashboard            Calculator            Timekeeper
```

## 🚀 Quick Start

### 1. Clone e instale

```bash
git clone <repo>
cd onsite-auth
npm install
```

### 2. Configure as variáveis de ambiente

```bash
cp .env.example .env.local
```

Preencha as variáveis no `.env.local`:

- **Supabase**: URL e keys do seu projeto
- **Stripe**: Keys e webhook secret (Fase 2)
- **URLs**: Domínios permitidos para redirect

### 3. Configure o Supabase

No Supabase Dashboard → Authentication → URL Configuration:

- **Site URL**: `https://auth.onsiteclub.ca`
- **Redirect URLs**: 
  - `https://auth.onsiteclub.ca/callback`
  - `https://app.onsiteclub.ca`
  - `https://calc.onsiteclub.ca`
  - `onsiteclub://`

### 4. Rode localmente

```bash
npm run dev
```

Acesse `http://localhost:3000`

## 📁 Estrutura

```
onsite-auth/
├── app/
│   ├── (auth)/           # Rotas de autenticação
│   │   ├── login/
│   │   ├── signup/
│   │   ├── logout/
│   │   ├── callback/
│   │   ├── reset-password/
│   │   └── verify/
│   ├── (billing)/        # Fase 2 - Stripe
│   │   ├── checkout/
│   │   ├── success/
│   │   └── manage/
│   └── api/
│       └── webhooks/     # Stripe webhooks
│
├── components/           # UI components
├── lib/
│   ├── supabase/        # Supabase clients
│   └── utils.ts         # Helpers
└── middleware.ts        # Session refresh
```

## 🔗 Como integrar nos apps

### Apps Web (Next.js)

```typescript
// middleware.ts ou no client
const session = await supabase.auth.getSession()

if (!session) {
  const redirect = encodeURIComponent(window.location.href)
  window.location.href = `https://auth.onsiteclub.ca/login?redirect=${redirect}`
}
```

### Apps Mobile (Expo/React Native)

```typescript
import * as WebBrowser from 'expo-web-browser'
import * as Linking from 'expo-linking'

const redirectUri = Linking.createURL('auth-callback')
const loginUrl = `https://auth.onsiteclub.ca/login?redirect=${encodeURIComponent(redirectUri)}`

const result = await WebBrowser.openAuthSessionAsync(loginUrl, redirectUri)

if (result.type === 'success') {
  const url = new URL(result.url)
  const accessToken = url.searchParams.get('access_token')
  const refreshToken = url.searchParams.get('refresh_token')
  // Armazene os tokens
}
```

### Apps Capacitor

```typescript
import { Browser } from '@capacitor/browser'

const loginUrl = `https://auth.onsiteclub.ca/login?redirect=onsiteclub://calculator/auth-callback`

await Browser.open({ url: loginUrl })

// Registre handler para deep link
App.addListener('appUrlOpen', ({ url }) => {
  if (url.includes('auth-callback')) {
    const params = new URL(url).searchParams
    const accessToken = params.get('access_token')
    // ...
  }
})
```

## 🚢 Deploy no Vercel

1. Push para o GitHub
2. Conecte ao Vercel
3. Configure as variáveis de ambiente
4. Configure domínio customizado: `auth.onsiteclub.ca`

## 📋 Fases de Desenvolvimento

- [x] **Fase 1**: Login, Signup, Logout, Callback
- [ ] **Fase 2**: Stripe Checkout, Webhooks
- [ ] **Fase 3**: Billing Management, Profile
- [ ] **Fase 4**: OAuth (Google, Apple)

## 🔒 Segurança

- Rate limiting built-in no Supabase Auth
- Validação de redirect URLs
- Tokens com expiração curta (1h access, 1 semana refresh)
- HTTPS obrigatório em produção
- Headers de segurança configurados

## 📝 Notas

- Supabase cria automaticamente um registro na tabela `profiles` via trigger
- Trial de 6 meses é configurado no trigger do Supabase
- Todos os apps compartilham a mesma sessão

---

OnSite Club © 2024
