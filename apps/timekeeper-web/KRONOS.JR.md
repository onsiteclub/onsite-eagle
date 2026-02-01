# OnSite Timekeeper Web - Arquitetura Completa

## [DIRECTIVE] Blue → KRONOS.JR: Table Name Standardization (2026-01-27)

> **Diretiva de Blueprint (Blue):** Todas as referencias a tabelas no codigo e documentacao
> do KRONOS.JR devem usar os **nomes reais das tabelas Supabase**, abandonando os nomes
> das views backward-compat. Isso garante consistencia com KRONOS (mobile) e o schema real.
>
> | Antes (view/legacy) | Depois (tabela real) | Tipo |
> |---------------------|---------------------|------|
> | `profiles` | `core_profiles` | Tabela |
> | `records` | `app_timekeeper_entries` | Tabela |
> | `geofences` / `locations` | `app_timekeeper_geofences` | Tabela |
>
> **Escopo da migracao:**
> 1. `types/database.ts` — Renomear interfaces e referencias de tabela
> 2. Todas as queries Supabase (`supabase.from('records')` → `supabase.from('app_timekeeper_entries')`)
> 3. Componentes que referenciam tipos antigos
> 4. Esta documentacao (KRONOS.JR.md)
>
> **Nota:** As views `records`, `locations`, `profiles` continuam existindo no Supabase
> como backward-compat, mas o codigo NOVO deve apontar para as tabelas reais.
> Views podem ser removidas no futuro.

---

## Resumo

Portal web Next.js que complementa o app mobile OnSite Timekeeper. Permite entrada manual de horas, gerenciamento de geofences, relatorios e vinculacao de equipe via QR Code. Usa Supabase como backend compartilhado com o app mobile.

**Stack:**
- Frontend: Next.js 14+ (App Router) + TypeScript + React 19
- Estilo: Tailwind CSS
- Auth: Supabase SSR (`@supabase/ssr`)
- Database: Supabase PostgreSQL com Row Level Security (RLS)
- Mapas: Google Maps API (`@react-google-maps/api`)
- QR Code: `qrcode.react` + `html5-qrcode`
- Deploy: Vercel

---

## 1. Estrutura do Projeto

```
onsite-timekeeper-web/
├── app/
│   ├── (auth)/                       # Rotas de autenticacao (layout agrupado)
│   │   ├── layout.tsx
│   │   └── login/page.tsx
│   ├── (dashboard)/                  # Rotas protegidas (layout com sidebar/nav)
│   │   ├── layout.tsx
│   │   └── dashboard/
│   │       ├── page.tsx              # Home - entrada manual de horas
│   │       ├── locations/page.tsx    # Gerenciamento de geofences com mapa
│   │       ├── reports/page.tsx      # Relatorios semanais/mensais
│   │       ├── team/page.tsx         # Vinculacao de equipe via QR code
│   │       └── settings/page.tsx     # Configuracoes e logout
│   ├── api/auth/callback/route.ts    # Callback do Supabase Auth
│   ├── globals.css
│   ├── layout.tsx                    # Root layout
│   └── page.tsx                      # Redirect para /login
│
├── components/
│   ├── ui/
│   │   ├── Button.tsx                # Botao com variantes
│   │   ├── Input.tsx                 # Input com label e erro
│   │   └── Modal.tsx                 # Modal dialog
│   ├── Header.tsx                    # Navegacao superior
│   ├── Sidebar.tsx                   # Navegacao lateral (desktop)
│   ├── BottomNav.tsx                 # Navegacao inferior (mobile)
│   ├── LocationMap.tsx               # Google Maps com markers e circulos
│   ├── QRCodeGenerator.tsx           # Gerador de QR code
│   └── QRCodeScanner.tsx             # Scanner de QR code com camera
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # Cliente Supabase (browser)
│   │   └── server.ts                 # Cliente Supabase (server)
│   ├── reports.ts                    # Geracao de relatorios
│   └── utils.ts                      # Helpers
│
├── types/
│   └── database.ts                   # Interfaces TypeScript das tabelas
│
├── middleware.ts                     # Protecao de rotas
└── .env.local                        # Variaveis de ambiente
```

---

## 2. Conexao com Supabase

### Dois Clientes

O projeto usa dois clientes Supabase distintos dependendo do contexto:

#### Cliente Browser (`lib/supabase/client.ts`)

Usado em componentes `'use client'`. Gerencia tokens de autenticacao automaticamente via cookies do browser.

```
Componente Client → createBrowserClient() → Supabase API → PostgreSQL (RLS)
```

Todos os componentes de pagina usam este cliente para queries, inserts e updates.

#### Cliente Server (`lib/supabase/server.ts`)

Usado em Server Components e Route Handlers. Gerencia cookies no lado do servidor.

```
Server Component → createServerClient(cookies) → Supabase API → PostgreSQL (RLS)
```

Usado no layout do dashboard e no middleware para verificar sessao.

### Variaveis de Ambiente

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...
```

Todas sao `NEXT_PUBLIC` porque:
- A anon key do Supabase e projetada para uso publico
- RLS protege os dados no nivel do banco
- A API key do Google Maps e restrita por dominio

---

## 3. Schema do Banco de Dados

### Tabelas e Relacionamentos

```
auth.users (Supabase Auth)
    │
    ├── core_profiles (1:1)
    │       full_name, email, trade_id, province, language_primary
    │
    ├── app_timekeeper_geofences (1:N)
    │       name, latitude, longitude, radius, color, status, deleted_at
    │
    ├── app_timekeeper_entries (1:N)
    │       entry_at, exit_at, duration_minutes, pause_minutes,
    │       geofence_id → app_timekeeper_geofences, entry_method, is_manual_entry
    │
    ├── access_grants (1:N como owner OU viewer)
    │       owner_id → users (worker)
    │       viewer_id → users (manager)
    │       status: active | revoked
    │
    └── pending_tokens (1:N)
            token, expires_at (5 min)
```

### Interfaces TypeScript (`types/database.ts`)

#### TimekeeperEntry (Entrada de Horas)
```typescript
// Tabela: app_timekeeper_entries
interface TimekeeperEntry {
  id: string;
  user_id: string;
  geofence_id: string | null;        // FK → app_timekeeper_geofences
  geofence_name: string | null;
  project_id: string | null;          // FK → app_timekeeper_projects
  entry_at: string;                    // ISO timestamp clock-in
  exit_at: string | null;             // ISO timestamp clock-out (null = ativo)
  pause_minutes: number;               // default 0
  duration_minutes: number | null;
  entry_method: 'automatic' | 'manual' | 'qr_code' | 'nfc';
  exit_method: string | null;
  is_manual_entry: boolean | null;
  manually_edited: boolean | null;
  edit_reason: string | null;
  original_entry_at: string | null;
  original_exit_at: string | null;
  integrity_hash: string | null;
  notes: string | null;
  tags: string[] | null;
  device_id: string | null;
  client_created_at: string | null;
  synced_at: string | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;           // soft delete
}
```

#### TimekeeperGeofence (Local/Geofence)
```typescript
// Tabela: app_timekeeper_geofences
interface TimekeeperGeofence {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string;                       // hex para o mapa
  icon: string | null;
  latitude: number;
  longitude: number;
  radius: number;                      // metros (default 100)
  address_street: string | null;
  address_city: string | null;
  address_province: string | null;
  address_postal_code: string | null;
  location_type: string | null;
  project_type: string | null;
  status: string;                      // default 'active'
  is_favorite: boolean;
  total_entries: number;
  total_hours: number;
  last_entry_at: string | null;
  synced_at: string | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;           // soft delete
}
```

#### CoreProfile (Perfil do Usuario)
```typescript
// Tabela: core_profiles
interface CoreProfile {
  id: string;                          // = auth.users.id
  email: string | null;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  preferred_name: string | null;
  avatar_url: string | null;
  trade_id: string | null;            // FK → ref_trades
  province: string | null;
  language_primary: string;            // default 'en'
  created_at: string;
  updated_at: string | null;
}
```

#### AccessGrant (Vinculacao de Equipe)
```typescript
// Tabela: access_grants
interface AccessGrant {
  id: string;
  owner_id: string;                    // worker (dono das horas)
  viewer_id: string;                   // manager (quem visualiza)
  token: string;
  status: 'active' | 'revoked';       // sem 'pending' — acesso imediato
  label: string | null;
  created_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
}
```

---

## 4. Autenticacao

### Fluxo

```
Usuario → Login (email/senha)
    → supabase.auth.signInWithPassword()
    → JWT salvo em cookie HTTP-only
    → Middleware valida em cada request
    → Acesso liberado a /dashboard/*
```

### Middleware (`middleware.ts`)

Executa em toda request para:
1. Criar cliente Supabase server com cookies do request
2. Verificar sessao: `supabase.auth.getUser()`
3. Nao autenticado + acessando `/dashboard/*` → redirect `/login`
4. Autenticado + acessando `/login` → redirect `/dashboard`

```typescript
export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};
```

### Callback OAuth (`app/api/auth/callback/route.ts`)

Troca codigo de autorizacao por sessao. Preparado para OAuth futuro (Google, etc).

---

## 5. Compartilhamento de Dados (QR Code & Team)

### Fluxo Completo de Vinculacao

```
┌──────────────────────────────────────────────────────────────┐
│                     WORKER (dono das horas)                  │
│                                                              │
│  1. Clica "Share My Hours"                                   │
│  2. Gera token aleatorio (32 chars)                          │
│  3. Salva em pending_tokens (expira em 5 min)                │
│  4. Exibe QR code com JSON:                                  │
│     {                                                        │
│       "app": "onsite-timekeeper",                            │
│       "action": "link",                                      │
│       "token": "abc123...",                                  │
│       "owner_name": "Joao Silva"                             │
│     }                                                        │
└──────────────────────┬───────────────────────────────────────┘
                       │ QR Code escaneado
                       ▼
┌──────────────────────────────────────────────────────────────┐
│                   MANAGER (visualizador)                     │
│                                                              │
│  1. Clica "Scan QR Code"                                     │
│  2. Camera le o QR code                                      │
│  3. Valida token em pending_tokens                           │
│  4. Cria/reativa access_grant:                               │
│     {                                                        │
│       owner_id: worker.id,                                   │
│       viewer_id: manager.id,                                 │
│       status: 'active',                                      │
│       accepted_at: now()                                     │
│     }                                                        │
│  5. Deleta pending_token usado                               │
│  6. Worker aparece na lista "Workers Linked"                 │
└──────────────────────────────────────────────────────────────┘
```

### Upsert para Reativacao

Se o manager ja foi vinculado e depois teve o acesso revogado, o sistema usa `upsert` com `onConflict: 'owner_id,viewer_id'` para reativar o grant existente ao inves de falhar.

### Revogacao de Acesso

Worker pode revogar acesso de qualquer manager:
```
access_grants.update({ status: 'revoked', revoked_at: now() })
```
Imediatamente o RLS esconde os records do manager revogado.

### Como o Manager Ve os Dados do Worker

Apos vinculacao, a RLS do Supabase permite que o manager leia as entries do worker:

```sql
-- Politica RLS na tabela app_timekeeper_entries
SELECT * FROM app_timekeeper_entries
WHERE user_id = auth.uid()                    -- Meus proprios entries
   OR EXISTS (                                -- Entries compartilhados
        SELECT 1 FROM access_grants
        WHERE access_grants.owner_id = app_timekeeper_entries.user_id
          AND access_grants.viewer_id = auth.uid()
          AND access_grants.status = 'active'
      )
```

### Queries de Listagem na Team Page

```sql
-- Workers que eu gerencio (sou viewer)
SELECT access_grants.*, core_profiles.full_name, core_profiles.email
FROM access_grants
JOIN core_profiles ON core_profiles.id = access_grants.owner_id
WHERE viewer_id = meu_id AND status = 'active'

-- Managers que tem acesso as minhas horas (sou owner)
SELECT access_grants.*, core_profiles.full_name, core_profiles.email
FROM access_grants
JOIN core_profiles ON core_profiles.id = access_grants.viewer_id
WHERE owner_id = meu_id
```

---

## 6. Row Level Security (RLS)

Todas as tabelas tem RLS habilitado. Nenhuma query no frontend pode acessar dados sem passar pelo RLS.

| Tabela | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| `app_timekeeper_geofences` | own + viewer via access_grant ativo | `user_id = auth.uid()` | `user_id = auth.uid()` | `user_id = auth.uid()` |
| `app_timekeeper_entries` | own + viewer via access_grant ativo | `user_id = auth.uid()` | `user_id = auth.uid()` | `user_id = auth.uid()` |
| `access_grants` | `owner_id OR viewer_id = auth.uid()` | `owner_id OR viewer_id = auth.uid()` | `owner_id OR viewer_id = auth.uid()` | `owner_id = auth.uid()` |
| `pending_tokens` | owner ALL + **public SELECT (P0 issue)** | `owner_id = auth.uid()` | - | `owner_id = auth.uid()` |
| `core_profiles` | `id = auth.uid()` | own | own | - |

### Seguranca

- **Isolamento de usuario:** Coluna `user_id` em todas as tabelas principais
- **RLS no banco:** Protecao no nivel do PostgreSQL, nao no app
- **Soft deletes:** `status` e `deleted_at` previnem perda de dados
- **Token expiry:** Pending tokens expiram em 5 minutos
- **Revogacao imediata:** `status='revoked'` esconde dados instantaneamente
- **Sem API custom:** Todas as queries passam pelo Supabase client com RLS

---

## 7. Paginas e Funcionalidades

### Dashboard (Home) - `/dashboard`

Entrada manual de horas com formulario completo:
- Seletor de data, horarios de entrada/saida (hora, minuto, AM/PM)
- Duracao de pausa (dropdown: 0, 15, 30, 45, 60, 90 min)
- Calculo automatico de total (suporta turno noturno)
- Lista de sessoes do dia

**Queries:** `app_timekeeper_geofences` (locais do usuario), `app_timekeeper_entries` (sessoes do dia)

### Locations - `/dashboard/locations`

Gerenciamento de geofences com Google Maps:
- Mapa interativo com markers e circulos de raio
- Busca por nome de local
- Adicionar local clicando no mapa ou usando GPS
- Editar nome e cor
- Soft delete (deleted_at = NOW())

**Queries:** `app_timekeeper_geofences` (CRUD completo)

### Reports - `/dashboard/reports`

Relatorios com visualizacao semanal/mensal:
- Navegacao por periodo (semana/mes)
- Total de horas no periodo
- Breakdown diario com indicador de sessao ativa
- Grafico de barras (modo semanal)
- Cores por faixa de horas (0h, 0-6h, 6-8h, 8h+)

**Queries:** `app_timekeeper_entries` (por range de datas)

### Team - `/dashboard/team`

Vinculacao de equipe via QR code:
- "Share My Hours" → gera QR code (worker)
- "Scan QR Code" → escaneia com camera (manager)
- Lista de workers vinculados
- Lista de managers com acesso + botao "Revoke"

**Queries:** `access_grants` (como owner e viewer), `pending_tokens`, `core_profiles`

### Settings - `/dashboard/settings`

Perfil do usuario e logout:
- Nome e email
- Toggles de preferencias (UI only)
- Botao de logout (`supabase.auth.signOut()`)

---

## 8. Sincronizacao Mobile ↔ Web

### Banco Compartilhado

Ambos os apps (mobile e web) conectam ao **mesmo projeto Supabase**:

```
┌─────────────┐     ┌─────────────────────┐     ┌─────────────┐
│  App Mobile  │────▶│   Supabase (Cloud)   │◀────│   Web App   │
│              │     │                     │     │             │
│  - Auto GPS  │     │  - PostgreSQL + RLS │     │  - Manual   │
│  - Geofence  │     │  - Auth (JWT)       │     │  - Reports  │
│  - QR Gen    │     │  - Realtime         │     │  - QR Scan  │
│  - Push      │     │  - Storage          │     │  - Maps     │
└─────────────┘     └─────────────────────┘     └─────────────┘
```

### Divisao de Responsabilidades

| Funcionalidade | Mobile | Web |
|---------------|--------|-----|
| Clock-in/out automatico (GPS) | Sim | Nao |
| Entrada manual de horas | Nao | Sim |
| Gerenciar geofences no mapa | Basico | Completo |
| Gerar QR Code (worker) | Sim | Sim |
| Escanear QR Code (manager) | Sim | Sim |
| Relatorios detalhados | Basico | Completo |
| Background location | Sim | Nao |
| Push notifications | Sim | Nao |

### Consistencia de Dados

- Mesmo `auth.uid()` em ambas plataformas
- Mesmas politicas RLS
- Mudancas propagam instantaneamente (mesmo banco)
- Sem conflitos: cada usuario e dono dos seus dados

---

## 9. Fluxo de Dados - Entrada Manual

```
Worker preenche formulario:
  Data: 2026-01-27
  Entrada: 09:00 AM
  Saida: 05:00 PM
  Pausa: 30 min
  Local: Jobsite Avalon

Frontend calcula:
  entryDate = 2026-01-27T09:00:00Z
  exitDate  = 2026-01-27T17:00:00Z
  duration  = (17-9)*60 - 30 = 450 min

supabase.from('app_timekeeper_entries').insert({
    user_id: auth.uid(),
    geofence_id: "uuid-do-local",
    geofence_name: "Jobsite Avalon",
    entry_at: "2026-01-27T09:00:00Z",
    exit_at: "2026-01-27T17:00:00Z",
    pause_minutes: 30,
    duration_minutes: 450,
    entry_method: "manual",
    is_manual_entry: true
  })

RLS valida: user_id == auth.uid() → INSERT permitido

Managers com access_grant ativo veem o entry automaticamente via RLS
```

---

## 10. Deploy e Infraestrutura

### Vercel

```
git push → GitHub → Vercel auto-deploy
```

- Build: `next build` (Turbopack)
- Runtime: Node.js serverless
- Edge: Middleware roda no edge
- Variaveis de ambiente configuradas no Vercel Dashboard

### Variaveis no Vercel

| Variavel | Descricao |
|----------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave publica do Supabase |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | API key do Google Maps |

### Supabase

- Auth: Redirect URLs devem incluir o dominio Vercel
- Database: PostgreSQL gerenciado
- RLS: Todas as tabelas protegidas
- Regiao: Configuravel no Supabase Dashboard
