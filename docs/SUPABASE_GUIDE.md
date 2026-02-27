<!--
  @ai-rules
  1. Ao adicionar novo app, adicionar secao correspondente.
  2. Manter tabela de env vars e versoes atualizadas.
  3. Este guia e a referencia canonica para conexao Supabase neste monorepo.
-->

# Supabase Guide — Conexao por Tipo de App

> Como conectar ao Supabase em cada tipo de app do monorepo.
> Projeto: `dbasazrdbtigrdntaehb` | URL: `https://dbasazrdbtigrdntaehb.supabase.co`

## Resumo

| Tipo de App | Package | Env Prefix | Storage | Auth Flow |
|-------------|---------|------------|---------|-----------|
| Next.js (web) | `@onsite/supabase` | `NEXT_PUBLIC_` | Cookies (SSR) | Server-side refresh |
| Expo (mobile) | `@supabase/supabase-js` direto | `EXPO_PUBLIC_` | AsyncStorage | Client-side persist |
| Vite+Capacitor | `@supabase/supabase-js` direto | `VITE_` | Capacitor Preferences / localStorage | PKCE |

## 1. Next.js Apps (Monitor, Analytics, Dashboard, Auth)

Usam `@onsite/supabase` que wraps `@supabase/ssr` para SSR seguro.

### Client Component

```typescript
import { createBrowserClient } from '@onsite/supabase';
// ou: import { createClient } from '@onsite/supabase/client';

const supabase = createBrowserClient();
```

### Server Component / Route Handler

```typescript
import { createServerSupabaseClient } from '@onsite/supabase';
// ou: import { createClient } from '@onsite/supabase/server';

export default async function Page() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.from('egl_sites').select('*');
}
```

### Admin Client (Service Role)

```typescript
import { createAdminClient } from '@onsite/supabase';

const admin = await createAdminClient();
// Bypassa RLS — usar APENAS em server-side
```

### Middleware (Session Refresh)

```typescript
// middleware.ts
import { updateSession } from '@onsite/supabase';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}
```

### Env Vars

```env
NEXT_PUBLIC_SUPABASE_URL=https://dbasazrdbtigrdntaehb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...    # APENAS server-side, NUNCA no client
```

## 2. Expo Apps (Field, Inspect, Operator, Timekeeper)

Criam cliente direto com `@supabase/supabase-js` + `AsyncStorage`.

### Config Padrao

```typescript
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,  // IMPORTANTE: false para mobile
  },
});
```

### Env Vars

```env
# Em .env.local ou app.config.js
EXPO_PUBLIC_SUPABASE_URL=https://dbasazrdbtigrdntaehb.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### Nota sobre `@onsite/supabase/mobile`

O package `@onsite/supabase` tambem exporta `createMobileClient()` que aceita um storage adapter generico. Nenhum app Expo usa ainda — todos criam cliente direto. Quando migrar, usar:

```typescript
import { createMobileClient } from '@onsite/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const supabase = createMobileClient(AsyncStorage);
```

## 3. Vite + Capacitor (Calculator)

Usa `import.meta.env` (padrao Vite) + storage adapter dual (Capacitor Preferences native / localStorage web).

### Config

```typescript
import { createClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const storageAdapter = {
  async getItem(key: string) {
    if (Capacitor.isNativePlatform()) {
      const { value } = await Preferences.get({ key });
      return value;
    }
    return localStorage.getItem(key);
  },
  async setItem(key: string, value: string) {
    if (Capacitor.isNativePlatform()) {
      await Preferences.set({ key, value });
    } else {
      localStorage.setItem(key, value);
    }
  },
  async removeItem(key: string) {
    if (Capacitor.isNativePlatform()) {
      await Preferences.remove({ key });
    } else {
      localStorage.removeItem(key);
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: storageAdapter,
    flowType: 'pkce',
    autoRefreshToken: true,
    detectSessionInUrl: true,  // true para web (OAuth redirect)
  },
});
```

### Env Vars

```env
VITE_SUPABASE_URL=https://dbasazrdbtigrdntaehb.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

## Versoes do @supabase/supabase-js

| App | Versao | Notas |
|-----|--------|-------|
| Field | ^2.93.3 | Mais recente |
| Inspect | ^2.93.3 | Mais recente |
| Operator | ^2.93.3 | Mais recente |
| Monitor | ^2.93.3 | Mais recente |
| **Timekeeper** | **^2.49.2** | Desatualizado |
| **Analytics** | **^2.49.2** | Desatualizado |
| **Calculator** | **^2.49.0** | Desatualizado |
| @onsite/supabase | (peer) | Via @supabase/ssr ^0.1.0 |

**Acao pendente:** Padronizar todos para ^2.93.3.

## Checklist para Novo App

1. Escolher tipo (Next.js / Expo / Vite)
2. Adicionar env vars no `.env.local` do app
3. Se Next.js: adicionar `@onsite/supabase` como dep, usar wrappers SSR
4. Se Expo: `@supabase/supabase-js` + `@react-native-async-storage/async-storage`
5. Se Vite: `@supabase/supabase-js` + storage adapter dual
6. Configurar `detectSessionInUrl`:
   - `false` para mobile (nao tem URL redirect)
   - `true` para web (OAuth callback)
7. NUNCA expor `SUPABASE_SERVICE_ROLE_KEY` no client-side
