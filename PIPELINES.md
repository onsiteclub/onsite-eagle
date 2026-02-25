# PIPELINES — Build, Deploy & CI/CD

> **Criado por:** Cerbero | **Data:** 2026-02-17
> **Escopo:** Como cada app builda, deploya, e o historico de problemas.
> **Objetivo:** Nunca mais gastar 3 horas pra buildar algo.

---

## 0. VISAO GERAL

### O Problema

Este monorepo tem **10 apps** com **3 stacks diferentes** (Next.js, Expo, Vite+Capacitor),
**2 versoes de React** (18 e 19), e **15 packages** compartilhados. Um `npm install`
no root afeta TODOS os apps. Um package errado quebra builds a quilometros de distancia.

### As 3 Stacks

```
┌─────────────────────────────────────────────────────────────────────┐
│                       MONOREPO ROOT                                  │
│  Node >=20 | npm 10.0.0 | Turborepo 2.3.0                         │
│                                                                      │
│  ┌─────────────┐  ┌─────────────────┐  ┌───────────────────┐       │
│  │  NEXT.JS    │  │  EXPO / RN      │  │  VITE + CAPACITOR │       │
│  │  React 19   │  │  React 18.3.1   │  │  React 18.3.1     │       │
│  │             │  │                 │  │                   │       │
│  │  monitor    │  │  timekeeper     │  │  calculator       │       │
│  │  analytics  │  │  field          │  │                   │       │
│  │  dashboard  │  │  inspect        │  │                   │       │
│  │  auth       │  │  operator       │  │                   │       │
│  │  tkpr-web   │  │                 │  │                   │       │
│  │             │  │                 │  │                   │       │
│  │  Build:     │  │  Build:         │  │  Build:           │       │
│  │  next build │  │  eas build      │  │  vite build       │       │
│  │             │  │  expo run:and   │  │  cap sync         │       │
│  │  Deploy:    │  │  Deploy:        │  │  Deploy:          │       │
│  │  Vercel     │  │  APK/AAB       │  │  APK (Gradle)     │       │
│  │  (futuro)   │  │  Play Store     │  │  Play Store       │       │
│  └─────────────┘  └─────────────────┘  └───────────────────┘       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 1. APPS NEXT.JS (5 apps)

### Stack Comum

| Componente | Versao |
|------------|--------|
| Next.js | 16.1.6 |
| React | 19.x (19.0.0 ou 19.2.3) |
| TypeScript | ^5.x |
| Tailwind CSS | ^3.4.x |
| Node.js | >=20 |

### Como buildar

```bash
# Dev (qualquer app Next.js)
npm run dev:monitor        # porta 3000
npm run dev:analytics      # porta 3000 (conflito se rodar junto!)
npm run dev:dashboard      # porta 3000
npm run dev:auth           # porta 3000
npm run dev:timekeeper-web # porta 3000

# Build producao
cd apps/monitor && npm run build    # ou turbo: npm run build --filter=@onsite/monitor
cd apps/analytics && npm run build
# etc.
```

**ATENCAO:** Todos os apps Next.js usam porta 3000 por padrao.
Para rodar mais de um simultaneamente, especificar portas:
```bash
cd apps/monitor && next dev --port 3000
cd apps/analytics && next dev --port 3001
cd apps/dashboard && next dev --port 3002
```

### Deploy (futuro)

- **Opcao 1:** Vercel (1 projeto por app, monorepo support nativo)
- **Opcao 2:** Self-hosted (Docker + nginx reverse proxy)
- **Opcao 3:** Cloudflare Pages

Hoje: **nenhum deploy automatico**. Tudo roda local em dev.

### Detalhes por App

#### monitor (`@onsite/monitor`)

| Campo | Valor |
|-------|-------|
| Path | `apps/monitor/` |
| Version | 0.1.0 |
| React | 19.2.3 (a mais recente entre os Next.js) |
| Port | 3000 (explicito no script) |
| next.config | `transpilePackages: ['@onsite/shared', '@onsite/ui']` |
| Deps especiais | `konva`, `react-konva` (SVG map), `openai ^4.77.0`, `pdfjs-dist`, `lucide-react` |
| Supabase-js | ^2.93.3 |
| date-fns | ^4.1.0 |
| tsconfig paths | `@/*` → `./src/*`, `@onsite/shared` → `../../packages/shared/src` |

**Notas:**
- Unico app com `transpilePackages` no next.config (necessario para @onsite/shared e @onsite/ui)
- Usa `openai ^4.77.0` (versao antiga — analytics usa `^6.15.0`)
- Usa `konva` para renderizacao do SVG map do loteamento

#### analytics (`@onsite/analytics`)

| Campo | Valor |
|-------|-------|
| Path | `apps/analytics/` |
| Version | 0.1.0 |
| React | ^19.0.0 |
| Port | 3000 (default) |
| next.config | `experimental: { serverActions: true }` |
| Deps especiais | Radix UI (suite completa), `recharts`, `framer-motion`, `jspdf`, `xlsx`, `openai ^6.15.0` |
| Supabase-js | ^2.49.2 |
| @supabase/ssr | ^0.1.0 |
| date-fns | ^3.3.1 (**DESATUALIZADO** — outros apps usam ^4.x) |
| tsconfig paths | `@/*` → `./*` (sem aliases @onsite) |

**Notas:**
- `date-fns ^3.3.1` — deveria ser ^4.x como os outros apps
- `@supabase/ssr ^0.1.0` — possivelmente desatualizado
- Tem `typecheck` script (unico app com isso)
- `openai ^6.15.0` — versao diferente do monitor (^4.77.0)

#### dashboard (`@onsite/dashboard`)

| Campo | Valor |
|-------|-------|
| Path | `apps/dashboard/` |
| Version | 1.0.0 |
| React | ^19.0.0 |
| Port | 3000 (default) |
| next.config | `reactStrictMode: true`, imagem patterns para Supabase Storage |
| Deps especiais | `recharts ^3.6.0`, `jspdf ^3.0.4`, `stripe ^14.21.0`, `@stripe/stripe-js`, `openai ^6.16.0` |
| Supabase | via @onsite/supabase (workspace) |
| date-fns | ^3.6.0 (**DESATUALIZADO**) |

**Notas:**
- Unico app com `reactStrictMode: true` explicito
- `jspdf ^3.0.4` — versao diferente do analytics (^4.0.0)
- Stripe integration (billing dashboard)
- `date-fns ^3.6.0` — deveria ser ^4.x

#### auth (`@onsite/auth-app`)

| Campo | Valor |
|-------|-------|
| Path | `apps/auth/` |
| Package name | `@onsite/auth-app` (nao `@onsite/auth` — conflita com package) |
| Version | 1.0.0 |
| React | ^19.0.0 |
| next.config | Security headers (X-Frame-Options, nosniff, Referrer-Policy) |
| Deps especiais | `canvas-confetti`, `stripe ^16.0.0` |
| Supabase | via @onsite/supabase (workspace) |

**Notas:**
- Nome do package e `@onsite/auth-app` para nao conflitar com `@onsite/auth` (package de auth)
- Stripe versao diferente do dashboard (^16.0.0 vs ^14.21.0)
- Security headers configurados (bom!)

#### timekeeper-web (`@onsite/timekeeper-web`)

| Campo | Valor |
|-------|-------|
| Path | `apps/timekeeper-web/` |
| Version | 0.1.0 |
| React | ^19.0.0 |
| next.config | Minimal (sem configs especiais) |
| Deps especiais | `@react-google-maps/api`, `html5-qrcode`, `qrcode.react` |
| Supabase-js | ^2.45.6 (a **mais antiga** entre todos os apps) |
| @supabase/ssr | ^0.5.2 |

**Notas:**
- `supabase-js ^2.45.6` — mais antigo de todos, deveria ser ^2.93.3
- next.config basicamente vazio — pode precisar de `transpilePackages` para packages @onsite

---

## 2. APPS EXPO / REACT NATIVE (4 apps)

### Stack Comum

| Componente | Versao |
|------------|--------|
| Expo SDK | ~52.0.0 |
| React | 18.3.1 |
| React Native | 0.76.0 (local) / 0.76.9 (root — BLOQUEADO via metro) |
| TypeScript | ^5.3.0 |
| Expo Router | ~4.0.0 |
| Node.js | >=20 (>=18 para field/operator) |

### Android SDK Targets

| Componente | Versao |
|------------|--------|
| compileSdkVersion | 35 |
| targetSdkVersion | 34 |
| minSdkVersion | 24 (Android 7.0) |
| buildToolsVersion | 35.0.0 |
| NDK | 26.1.10909125 |
| Kotlin | 1.9.25 (timekeeper) |

### Como buildar

#### Desenvolvimento local (device fisico)

```bash
# PASSO 1: Instalar dependencias (do root!)
npm install

# PASSO 2: Prebuild (gera android/)
cd apps/timekeeper
npx expo prebuild --platform android        # primeira vez
npx expo prebuild --clean --platform android # se precisar regenerar

# PASSO 3: Build + instalar no device
npx expo run:android                        # debug build

# PASSO 4: Apenas Metro (se app ja esta instalado)
npx expo start --dev-client
```

**REGRAS CRITICAS:**
1. **SEMPRE** rodar expo commands de dentro do app dir (`apps/timekeeper/`, nao do root)
2. **NUNCA** rodar `expo run:android` do root — confunde o bundler
3. Se mudar um plugin ou native module → precisa de `prebuild --clean`
4. Se so mudou JS/TS → basta `expo start --dev-client`

#### EAS Build (CI/Cloud)

```bash
# Apenas timekeeper tem eas.json configurado
cd apps/timekeeper

# Development APK (debug, com dev tools)
eas build --platform android --profile development

# Preview APK (release, sem dev tools)
eas build --platform android --profile preview

# Production AAB (para Play Store)
eas build --platform android --profile production
```

#### Quando fazer qual build?

| Situacao | Comando | Tempo |
|----------|---------|-------|
| Mudou JS/TS only | `expo start --dev-client` | Segundos |
| Mudou package.json (dep nova) | `npm install` + `expo start --dev-client` | 1 min |
| Mudou plugin Expo | `expo prebuild --clean` + `expo run:android` | 5-15 min |
| Mudou AndroidManifest / build.gradle | `expo prebuild --clean` + `expo run:android` | 5-15 min |
| Mudou native code (Java/Kotlin) | `expo run:android` | 5-15 min |
| Build para distribuicao | `eas build --profile preview` | 10-30 min (cloud) |
| Build para Play Store | `eas build --profile production` | 10-30 min (cloud) |

### Metro Config — Isolamento React 18/19

O root do monorepo tem React 18.3.1 e React Native 0.76.9.
Apps Next.js puxam React 19. Metro (bundler Expo) pode confundir versoes.

**Solucao por app:**

| App | Bloqueia root react? | Bloqueia root react-native? | Bloqueia root react-dom? |
|-----|---------------------|---------------------------|------------------------|
| timekeeper | NAO | SIM | NAO |
| field | SIM | NAO* | SIM |
| inspect | SIM | NAO* | SIM |
| operator | NAO** | NAO | NAO |

\* Field e Inspect nao bloqueiam react-native porque nao tem conflito de versao reportado
\** Operator NAO tem isolamento — potencial problema futuro

**ATENCAO:** Operator precisa de metro.config.js com blockList! Isso foi feito na Fase 0
do REFACTOR_PLAN mas verificar se esta ativo.

### Detalhes por App

#### timekeeper (`@onsite/timekeeper`)

| Campo | Valor |
|-------|-------|
| Path | `apps/timekeeper/` |
| Version | 2.0.0 |
| Package ID | `com.onsiteclub.timekeeper` |
| newArchEnabled | **false** |
| Android dir | SIM (committed) |
| eas.json | SIM |
| Plugins | expo-router, expo-sqlite, expo-build-properties |

**Permissoes Android:**
- `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`
- `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`
- `POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED`, `ACTIVITY_RECOGNITION`

**Deps nativas especiais:** `expo-camera`, `expo-sqlite`, `expo-print`, `expo-sharing`,
`react-native-gesture-handler`, `@onsite/tokens`, `@onsite/camera`, `zustand`

**tsconfig paths:** `@onsite/shared`, `@onsite/ai`, `@onsite/logger`, `@onsite/auth`,
`@onsite/auth/core`, `@onsite/ui`, `@onsite/utils`

#### field (`@onsite/field`)

| Campo | Valor |
|-------|-------|
| Path | `apps/field/` |
| Version | 0.1.0 |
| Package ID | `com.onsiteclub.dashboard` **(ERRADO — deveria ser `com.onsiteclub.field`)** |
| App name no app.json | "OnSite Dashboard" **(ERRADO — deveria ser "OnSite Field")** |
| newArchEnabled | **true** |
| Android dir | NAO (nao tem prebuild) |
| eas.json | NAO |
| Plugins | expo-router, expo-camera, expo-image-picker |

**PROBLEMAS CONHECIDOS:**
- Package ID e app name estao ERRADOS (copiados de outro app)
- newArchEnabled=true pode causar crashes com alguns plugins
- Nao tem eas.json — build so funciona local
- Nao tem android/ dir — precisa de prebuild antes de rodar

#### inspect (`@onsite/inspect`)

| Campo | Valor |
|-------|-------|
| Path | `apps/inspect/` |
| Version | 0.1.0 |
| Package ID | `com.onsiteclub.worker` **(NOME CONFUSO — inspect deveria ter ID de inspect)** |
| App name no app.json | "OnSite Worker" **(NOME CONFUSO)** |
| newArchEnabled | **false** |
| Android dir | SIM (committed) |
| eas.json | NAO |
| Plugins | expo-router, expo-camera, expo-image-picker |

**PROBLEMAS CONHECIDOS:**
- Package ID `com.onsiteclub.worker` e nome "OnSite Worker" sao confusos
  (parece que inspect e field trocaram nomes em algum momento)

#### operator (`@onsite/operator`)

| Campo | Valor |
|-------|-------|
| Path | `apps/operator/` |
| Version | 0.1.0 |
| Package ID | `com.onsiteclub.operator` |
| App name no app.json | "OnSite Operator" (correto!) |
| newArchEnabled | **true** |
| Android dir | NAO (nao tem prebuild) |
| eas.json | NAO |
| Plugins | expo-router (apenas) |

**tsconfig:** Nao tem aliases `@onsite/*` (diferente dos outros apps)

---

## 3. APP VITE + CAPACITOR (1 app)

### calculator (`@onsite/calculator`)

| Campo | Valor |
|-------|-------|
| Path | `apps/calculator/` |
| Version | 1.0.0 |
| Package ID | `ca.onsiteclub.calculator` (dominio canadense!) |
| Vite | ^5.4.0 |
| Capacitor | ^6.1.0 |
| React | ^18.3.1 |
| Build | `tsc -b && vite build` → dist/ → `cap sync` |

**Como buildar:**

```bash
cd apps/calculator

# Dev (web browser)
npm run dev                    # porta 5173

# Build producao
npm run build                  # tsc + vite → dist/

# Sync com Android
npm run cap:sync               # copia dist/ para android/
npm run cap:android            # abre Android Studio

# Build APK completo
npm run android:build          # build + sync + abre Android Studio
npm run android:apk            # gradlew assembleDebug
npm run android:install        # adb install

# Logs
npm run android:logs           # adb logcat Capacitor + chromium
```

**Pipeline Capacitor:**
```
TypeScript → Vite build → dist/ → Capacitor sync → Android WebView → APK
```

Capacitor empacota o output do Vite dentro de uma WebView Android nativa.
Diferente do Expo que compila para codigo nativo real.

**Vite config:**
- Manual chunks: `vendor` (react), `supabase` (supabase-js) — code splitting
- No sourcemaps em prod
- `CapacitorHttp` desabilitado (bug com query params)

---

## 4. CI/CD

### Estado Atual

| Pipeline | Onde | Trigger | Status |
|----------|------|---------|--------|
| GitHub Actions — Android EAS | `.github/workflows/build-android.yml` | Manual (workflow_dispatch) | Configurado |
| Codemagic — iOS EAS | `codemagic.yaml` | Manual (sem triggers) | Configurado |
| Vercel / deploy web | — | — | NAO EXISTE |

### GitHub Actions — Android Build

```yaml
# .github/workflows/build-android.yml
Trigger: Manual (dropdown: development / preview / production)
Runner: ubuntu-latest
Steps:
  1. Checkout
  2. Setup Node 20
  3. npm ci (do root — instala todo o monorepo)
  4. Setup EAS CLI via expo/expo-github-action@v8
  5. cd apps/timekeeper && eas build --android --profile $PROFILE
Secrets necessarios: EXPO_TOKEN
```

**LIMITACAO:** So faz build do Timekeeper. Outros apps Expo nao tem EAS configurado.

### Codemagic — iOS Build

```yaml
# codemagic.yaml
Instance: mac_mini_m2
Node: 20
Steps:
  1. npm ci
  2. npm install -g eas-cli
  3. cd apps/timekeeper && eas build --ios --production
Artifacts: apps/timekeeper/build/**
Secrets: expo_credentials group
```

**LIMITACAO:** Idem — so Timekeeper, so iOS, so production.

### O Que Falta (Pipeline Ideal)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PIPELINE IDEAL (futuro)                           │
│                                                                      │
│  Push to main                                                       │
│    ├── Lint all (turbo lint)                                        │
│    ├── Typecheck all (turbo typecheck)                              │
│    └── Test all (turbo test)                                        │
│                                                                      │
│  Tag release (v2.1.0)                                               │
│    ├── Next.js apps → Vercel deploy (auto)                         │
│    ├── Expo apps → EAS Build (preview APK)                         │
│    └── Calculator → Vite build + Capacitor sync + Gradle APK       │
│                                                                      │
│  Manual promote                                                     │
│    ├── EAS Submit → Play Store (internal track)                    │
│    └── Codemagic → App Store (TestFlight)                          │
└─────────────────────────────────────────────────────────────────────┘
```

### Como pipelines funcionam num projeto desse tamanho

**Problema:** 10 apps compartilham 15 packages. Mudar 1 package pode afetar todos os apps.

**Solucao:** Turborepo resolve isso com:

1. **Dependency graph:** Turbo sabe que `@onsite/monitor` depende de `@onsite/shared`.
   Se `@onsite/shared` muda, Turbo rebuilda o monitor. Se nao muda, usa cache.

2. **Parallel execution:** `turbo build` builda todos os apps em paralelo,
   respeitando dependencias (packages primeiro, apps depois).

3. **Filtering:** `turbo build --filter=@onsite/monitor` builda so o monitor
   e seus packages dependentes.

4. **Cache:** Se nada mudou, build e instantaneo (hash-based caching).

**Na pratica hoje:**
```bash
# Roda TODOS os apps em dev (10 processos!)
npm run dev

# Roda SO UM app (muito mais rapido)
npm run dev:monitor

# Build producao de tudo
npm run build

# Build producao de um
turbo build --filter=@onsite/monitor
```

---

## 5. INCONSISTENCIAS DETECTADAS

### Versoes de Dependencias

| Dependencia | Versoes encontradas | Recomendado |
|-------------|--------------------|----|
| `@supabase/supabase-js` | ^2.45.6, ^2.49.0, ^2.49.2, ^2.93.3 | Padronizar ^2.93.3 |
| `date-fns` | ^3.3.1, ^3.6.0, ^4.1.0 | Padronizar ^4.1.0 |
| `openai` | ^4.77.0, ^6.15.0, ^6.16.0 | Padronizar ^6.16.0 |
| `jspdf` | ^3.0.4, ^4.0.0 | Padronizar ^4.0.0 |
| `stripe` | ^14.21.0, ^16.0.0 | Padronizar ^16.0.0 |
| `@supabase/ssr` | ^0.1.0, ^0.5.2 | Padronizar ^0.5.2 |
| `lucide-react` | ^0.400.0, ^0.460.0, ^0.563.0 | Padronizar ^0.563.0 |

### Package IDs (Android)

| App | Package ID atual | Deveria ser |
|-----|-----------------|-------------|
| timekeeper | `com.onsiteclub.timekeeper` | OK |
| field | `com.onsiteclub.dashboard` | `com.onsiteclub.field` |
| inspect | `com.onsiteclub.worker` | `com.onsiteclub.inspect` |
| operator | `com.onsiteclub.operator` | OK |
| calculator | `ca.onsiteclub.calculator` | OK (dominio CA) |

### App Names no app.json

| App | Nome atual | Deveria ser |
|-----|-----------|-------------|
| field | "OnSite Dashboard" | "OnSite Field" |
| inspect | "OnSite Worker" | "OnSite Inspect" |

### newArchEnabled

| App | Valor | Nota |
|-----|-------|------|
| timekeeper | false | Correto — plugins GPS nao suportam |
| field | true | Potencial problema com expo-camera |
| inspect | false | OK |
| operator | true | Potencial problema (nenhum plugin nativo ainda) |

### Metro Config

| App | Isolamento React 18/19 | Isolamento react-native |
|-----|----------------------|----------------------|
| timekeeper | NAO | SIM (blockList root RN 0.76.9) |
| field | SIM (blockList root React 19) | NAO |
| inspect | SIM (blockList root React 19) | NAO |
| operator | **NENHUM** | **NENHUM** |

**Operator esta sem protecao!** Deveria ter o mesmo metro.config.js que os outros.

### EAS / Build Readiness

| App | eas.json | android/ dir | Pronto pra build? |
|-----|----------|-------------|-------------------|
| timekeeper | SIM | SIM | SIM |
| field | NAO | NAO | NAO — precisa prebuild + eas.json |
| inspect | NAO | SIM | PARCIAL — precisa eas.json |
| operator | NAO | NAO | NAO — precisa prebuild + eas.json + metro fix |
| calculator | N/A | NAO | PARCIAL — precisa Gradle setup |

---

## 6. HISTORICO DE PROBLEMAS DE BUILD

### 2026-02-17 — Timekeeper build demorou 3 horas

**Contexto:** Apos refatoracao de packages (Fases 0-8), tentativa de buildar o Timekeeper.

**Sintomas provaveis (documentar quando souber detalhes):**
- [ ] Gradle sync demorou?
- [ ] Metro bundler nao encontrou modules?
- [ ] React version mismatch?
- [ ] Plugin nativo precisou de prebuild --clean?

**Licao:** Apos mudancas em packages compartilhados, SEMPRE:
1. `npm install` no root
2. `cd apps/timekeeper && npx expo prebuild --clean --platform android`
3. `npx expo run:android`

### Problemas ja resolvidos (REFACTOR_PLAN Fases 0-8)

| Data | Problema | Causa | Solucao |
|------|----------|-------|---------|
| 2026-02-17 | Operator tela cinza | Metro carregava react-native 0.76.9 do root | blockList no metro.config.js |
| 2026-02-17 | Field route discovery quebrado | babel plugin `transform-inline-environment-variables` | Removido do babel.config.js |
| 2026-02-17 | Phantom deps em 5 apps | Declaravam packages que nunca importavam | Removidos do package.json |
| Anterior | Timekeeper tela preta (Samsung) | React 19 do root substituia React 18 | blockList + extraNodeModules no metro |
| Anterior | Logger crashava em web | `__DEV__` undefined em Node/browser | Substituido por `process.env.NODE_ENV` check |

---

## 7. GUIA RAPIDO — "Como eu builo X?"

### Quero rodar o Monitor (web)
```bash
npm run dev:monitor
# Abre http://localhost:3000
```

### Quero rodar o Timekeeper (celular Android)
```bash
# Se app ja esta instalado no celular:
cd apps/timekeeper && npx expo start --dev-client

# Se e a primeira vez ou mudou plugin:
cd apps/timekeeper
npx expo prebuild --clean --platform android
npx expo run:android
```

### Quero rodar o Timekeeper-Web
```bash
npm run dev:timekeeper-web
# Abre http://localhost:3000
```

### Quero rodar o Calculator (web)
```bash
cd apps/calculator && npm run dev
# Abre http://localhost:5173
```

### Quero rodar o Calculator (Android)
```bash
cd apps/calculator
npm run android:build    # build + abre Android Studio
# No Android Studio: Run → target device
```

### Quero buildar TUDO pra producao
```bash
npm run build    # turbo build all apps
```

### Quero fazer APK do Timekeeper pra testar
```bash
cd apps/timekeeper
eas build --platform android --profile preview
# Ou local:
npx expo run:android --variant release
```

---

## 8. TROUBLESHOOTING

### Metro nao encontra modulo
```bash
# Limpar cache
cd apps/[app] && npx expo start --clear

# Nuclear: limpar tudo
cd apps/[app] && rm -rf node_modules android/app/build
cd ../.. && npm install
cd apps/[app] && npx expo prebuild --clean --platform android
npx expo run:android
```

### Gradle sync falha
```bash
# Limpar cache Gradle
cd apps/[app]/android && ./gradlew clean
cd .. && npx expo run:android
```

### "Cannot find module @onsite/xyz"
```bash
# Package nao esta linkado — reinstalar
cd ../.. && npm install
# Verificar que o package tem "main" ou "exports" correto no package.json
```

### React version mismatch (tela cinza/branca)
```
Verificar metro.config.js — blockList precisa incluir:
- Root node_modules/react/ (se app usa React 18)
- Root node_modules/react-dom/ (se app usa React 18)
- Root node_modules/react-native/ (se versao difere)
```

### "Unable to resolve ... from node_modules"
```bash
# npm hoist pode ter colocado a dep errada no root
# Verificar se a dep existe localmente:
ls apps/[app]/node_modules/[dep]
# Se nao existe, adicionar explicitamente ao package.json do app
```

---

## 9. ENV VARS

### Turbo globalEnv (acessiveis por todos os apps via turbo)

```
OPENAI_API_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
```

### Prefixos por stack

| Stack | Prefixo | Exemplo |
|-------|---------|---------|
| Next.js | `NEXT_PUBLIC_` | `NEXT_PUBLIC_SUPABASE_URL` |
| Expo | `EXPO_PUBLIC_` | `EXPO_PUBLIC_SUPABASE_URL` |
| Vite | `VITE_` | `VITE_SUPABASE_URL` |

**IMPORTANTE:** Cada stack tem seu prefixo. Um env var com `NEXT_PUBLIC_` NAO e visivel no Expo.
Precisa duplicar as vars com o prefixo correto para cada stack.

### CI/CD Secrets

| Secret | Onde | Para que |
|--------|------|---------|
| `EXPO_TOKEN` | GitHub Actions | EAS Build auth |
| `expo_credentials` | Codemagic | EAS Build auth + signing |

---

*Cerbero — Guardiao do Supabase OnSite*
*Documento criado: 2026-02-17*
