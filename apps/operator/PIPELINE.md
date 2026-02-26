# OnSite Operator — Pipeline & Build Guide

> Device: Samsung SM_G990W (Android) — cabo USB direto
> Stack: Expo 52 + React Native 0.76.0 + React 18.3.1

---

## 1. Arquitetura do App (v2 — Simplificado)

```
┌────────────────────────────────────────────┐
│  OnSite Operator              [sync] [⚡ON] │
├────────────────────────────────────────────┤
│                                            │
│  PEDIDOS (main — 95% do tempo)             │
│  Cards por urgência com botões inline:     │
│  [🚛 Em Andamento]  [✅ Entregue]          │
│                                            │
├────────────────────────────────────────────┤
│  📋 Pedidos    ⚠️ Reportar    ⚙️ Config   │
└────────────────────────────────────────────┘
```

### 3 Tabs (substituiu 5 tabs antigos)

| Tab | Arquivo | Funcao |
|-----|---------|--------|
| **Pedidos** | `app/(tabs)/index.tsx` | Cards de material requests por urgência, botões de ação inline, FAB de camera |
| **Reportar** | `app/(tabs)/report.tsx` | 4 botões rápidos (gasolina, pneu, máquina, outro) → site timeline |
| **Config** | `app/(tabs)/config.tsx` | Toggle ON/OFF, QR, notificações, sign out |

### Telas Stack (fora das tabs)

| Tela | Arquivo | Quando abre |
|------|---------|-------------|
| **Login** | `app/(auth)/login.tsx` | Sem sessão ativa → redirect automático |
| **Detalhe do Pedido** | `app/requests/[id].tsx` | Tap no card para ver info completa |
| **Confirmar Entrega** | `app/deliver/[id].tsx` | Tap em "Entregue" → foto + notas + timeline post |
| **Foto Avulsa** | `app/photo.tsx` | FAB de camera no Pedidos → classificar + enviar |
| **Scanner QR** | `app/scanner.tsx` | Config → Scan QR → vincular a site |

### Cor Accent
`#0F766E` (verde teal) — unificado com Timekeeper e Monitor (Enterprise Theme v3).

### Fluxos de Foto (2026-02-25)

**Fluxo 1: Foto na Entrega**
```
Pedidos → [Entregue] → deliver/[id].tsx
  → Botão "Tirar Foto" (expo-image-picker)
  → Preview + opção trocar/remover
  → Upload ao egl-media (Supabase Storage)
  → Confirmar → foto_url no egl_timeline (material_delivery)
  → Mensagem site-level via sendMessage
```

**Fluxo 2: Foto Avulsa (FAB)**
```
Pedidos → FAB camera (canto inferior direito)
  → photo.tsx → Tirar foto
  → Modal de classificação:
    • Tipo: Entrega, Acidente, Bloqueio, Roubo, Dano, Progresso, Outro
    • Lote: chips com todos os lotes do site + "Geral"
    • Comentário (opcional)
  → Upload ao egl-media
  → Timeline event (house-level se lote selecionado)
  → Mensagem site-level via sendMessage
```

**Storage path:** `{siteId}/{houseId|'site-level'}/{timestamp}_{random}.jpg`
**Bucket:** `egl-media` (public)

---

## 2. Comandos de Build

> **IMPORTANTE — MONOREPO:** Comandos Expo SEMPRE devem ser executados de dentro
> da pasta do app, NUNCA da raiz do monorepo. Expo resolve rotas, plugins e
> dependências relativas ao `cwd`. Rodar da raiz causa erros silenciosos.
>
> **SEMPRE dois passos:**
> 1. `cd apps/operator`
> 2. Depois o comando

### Primeira vez (sem pasta `android/`)

```bash
cd apps/operator
npx expo prebuild --platform android
npx expo run:android
```

O `expo run:android` faz: prebuild → gradle build → instala no device → inicia Metro.

### Builds seguintes (pasta `android/` já existe)

```bash
# Passo 1 — SEMPRE entrar na pasta primeiro
cd apps/operator

# Passo 2 — Se mudou APENAS codigo JS/TS:
npx expo start --dev-client

# Passo 2 — Se mudou native deps (package.json, plugins, app.json):
npx expo prebuild --clean --platform android
npx expo run:android
```

### Quando precisa de rebuild nativo?

| Mudou o quê? | Comando (sempre de dentro de `apps/operator/`) |
|---------------|---------|
| Código JS/TS | `npx expo start --dev-client` |
| `package.json` (nova dep nativa) | `npx expo run:android` |
| `app.json` (plugins, bundle id) | `npx expo prebuild --clean && npx expo run:android` |
| `metro.config.js` | Reiniciar Metro (`npx expo start --dev-client -c`) |
| `babel.config.js` | Reiniciar Metro com cache clear (`-c`) |
| `npm install` na raiz | Reiniciar Metro (`npx expo start --dev-client -c`) |

---

## 3. Configs Críticos

### metro.config.js — React 18/19 Isolation

```javascript
// Bloqueia React 19 do root (apps Next.js usam 19.x)
config.resolver.blockList = [
  new RegExp(`${rootReact}[\\\\/].*`),
  new RegExp(`${rootReactDom}[\\\\/].*`),
  new RegExp(`${rootRN}[\\\\/].*`),
];

// Força resolução para React 18.3.1 local
config.resolver.extraNodeModules = {
  react: path.resolve(projectRoot, 'node_modules/react'),
  'react-dom': path.resolve(projectRoot, 'node_modules/react-dom'),
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
};
```

**Por que:** Monorepo tem React 19 hoisted no root (Next.js apps). Sem blockList, Metro resolve React 19 → crash em runtime ("recentlyCreatedOwnerStacks", "property is not writable").

### babel.config.js — Sem plugins extras

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
```

**PROIBIDO:** `transform-inline-environment-variables` com `EXPO_ROUTER_APP_ROOT`. Esse plugin roda ANTES do `babel-preset-expo` (plugins antes de presets no Babel) e substitui essas variáveis por `undefined`, quebrando o route discovery do Expo Router.

### app.json — newArchEnabled: false

```json
{
  "newArchEnabled": false
}
```

**Por que:** New Architecture causa crashes com alguns plugins (expo-notifications, etc.). Manter desabilitado até estabilizar.

---

## 4. Packages Usados

| Package | Import | Uso |
|---------|--------|-----|
| `@onsite/shared` | `MaterialRequest`, `getOperatorQueue`, `updateRequestStatus` | Types e queries de material requests |
| `@onsite/timeline` | `sendMessage` | Posta eventos na timeline do site/lote |
| `@onsite/offline` | `initQueue`, `useOfflineSync` | Queue offline para sync quando volta online |
| `@onsite/sharing` | `parseQRPayload`, `joinSite` | QR code scanning para vincular a site |
| `@onsite/camera` | `uploadPhoto`, `uploadPhotoFromUri` | Pipeline de upload de fotos (Storage + DB + timeline) |

### Native deps adicionais

| Dep | Versao | Uso |
|-----|--------|-----|
| `expo-camera` | ~16.0.0 | QR scanner + camera (scanner.tsx) |
| `expo-image-picker` | ~16.0.6 | Captura de fotos (deliver, photo.tsx) |
| `expo-file-system` | ~18.0.12 | Leitura de arquivos para upload base64 |
| `expo-notifications` | ~0.29.11 | Push notifications (FCM) |

### Packages REMOVIDOS (phantom deps)

| Package | Motivo |
|---------|--------|
| `@onsite/agenda` | Operator não precisa de calendário |
| `@onsite/auth` | Não importado diretamente (auth via supabase.ts) |
| `@onsite/ui` | Não importado diretamente (UI inline nos componentes) |

---

## 5. Variáveis de Ambiente

Arquivo: `apps/operator/.env.local` (NÃO commitar)

```
EXPO_PUBLIC_SUPABASE_URL=https://dbasazrdbtigrdntaehb.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
```

Referência: copiar de `apps/timekeeper/.env.local` (mesmo projeto Supabase).

---

## 6. Sessão de Build — Erros Encontrados e Correções

### Sessão: 2026-02-25 — Primeiro build do Operator v2

#### Problema 1: babel.config.js com transform-inline-environment-variables

**Sintoma:** Tela branca ao abrir o app. Console mostra `EXPO_ROUTER_APP_ROOT is undefined`. Nenhuma rota encontrada pelo Expo Router.

**Causa raiz:** O plugin `transform-inline-environment-variables` rodava ANTES do `babel-preset-expo` (ordem do Babel: plugins → presets). Isso substituía `EXPO_ROUTER_APP_ROOT` por `undefined` antes que o preset pudesse setá-lo.

**Fix:** Removido o plugin completamente do babel.config.js. O `babel-preset-expo` já cuida de tudo internamente.

```diff
  return {
    presets: ['babel-preset-expo'],
-   plugins: [
-     ['transform-inline-environment-variables', {
-       include: ['EXPO_ROUTER_APP_ROOT', 'EXPO_ROUTER_IMPORT_MODE'],
-     }],
-   ],
  };
```

**Também removido** `babel-plugin-transform-inline-environment-variables` do devDependencies.

---

#### Problema 2: newArchEnabled: true

**Sintoma:** Crash nativo durante startup em dispositivos Android, erro em logcat sobre Fabric/TurboModules.

**Causa raiz:** New Architecture não é estável com todos os plugins usados (expo-notifications em particular tem issues).

**Fix:** Alterado `app.json` → `"newArchEnabled": false`.

---

#### Problema 3: metro.config.js sem React isolation

**Sintoma:** Runtime crash: `TypeError: Cannot read properties of undefined (reading 'ReactCurrentOwner')` ou `property is not writable`.

**Causa raiz:** Metro resolvia React 19.x do root `node_modules/` (instalado para apps Next.js) em vez do React 18.3.1 local. React Native 0.76.0 não é compatível com React 19.

**Fix:** Adicionado `blockList` + `extraNodeModules` no metro.config.js (mesmo padrão do Timekeeper):

```javascript
config.resolver.blockList = [
  new RegExp(`${rootReact}[\\\\/].*`),
  new RegExp(`${rootReactDom}[\\\\/].*`),
  new RegExp(`${rootRN}[\\\\/].*`),
];

config.resolver.extraNodeModules = {
  react: path.resolve(projectRoot, 'node_modules/react'),
  'react-dom': path.resolve(projectRoot, 'node_modules/react-dom'),
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
};
```

---

#### Problema 4: .env.local com placeholder

**Sintoma:** App abre mas todas as queries retornam `null`. Console mostra `Supabase credentials not configured`.

**Causa raiz:** O `.env.local` tinha `your_anon_key_here` como valor da anon key.

**Fix:** Copiado o valor real da anon key do Timekeeper (mesmo projeto Supabase).

---

#### Problema 5: Sem assets (icon.png, splash, etc.)

**Sintoma:** `expo prebuild` falha com `Error: File not found: ./assets/icon.png`.

**Causa raiz:** Diretório `assets/` não existia. O `app.json` referencia 4 arquivos de imagem.

**Fix:** Copiados os assets do Timekeeper como placeholder. Substituir por assets próprios depois.

---

#### Problema 6: pushRegistration.ts com typo e API deprecada

**Sintoma:** Push token nunca é registrado. Console mostra `No EAS project ID found`.

**Causa raiz:**
1. Typo: `Constants.expiConfig` em vez de `Constants.expoConfig`
2. `Constants.installationId` é deprecado no Expo SDK 52

**Fix:**
```diff
- const projectId = Constants.expiConfig?.extra?.eas?.projectId
+ const projectId = Constants.expoConfig?.extra?.eas?.projectId

- device_id: Constants.installationId || `operator-${Date.now()}`,
+ device_id: `operator-${Date.now()}`,
```

---

#### Problema 7: Kotlin version mismatch (Compose Compiler vs Kotlin)

**Sintoma:** Build falha com:
```
e: This version (1.5.15) of the Compose Compiler requires Kotlin version 1.9.25
but you appear to be using Kotlin version 1.9.24 which is not known to be compatible.
```

**Causa raiz:** O `expo prebuild` gerou `android/build.gradle` com `classpath('org.jetbrains.kotlin:kotlin-gradle-plugin')` sem versão explícita. O Gradle resolvia 1.9.24 do cache, mas o `expo-modules-core` usa Compose Compiler 1.5.15 que exige 1.9.25.

**Fix (2 arquivos):**

1. `android/gradle.properties` — adicionar:
```properties
android.kotlinVersion=1.9.25
```

2. `android/build.gradle` — corrigir classpath para usar a variável:
```diff
- classpath('org.jetbrains.kotlin:kotlin-gradle-plugin')
+ classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlinVersion")
```

**Nota:** O `build.gradle` já define `kotlinVersion = findProperty('android.kotlinVersion') ?: '1.9.25'` na ext, mas sem passar `$kotlinVersion` no classpath a versão não era usada.

---

#### Problema 8: Metro metro-transform-worker exports conflict

**Sintoma:** Gradle BUILD SUCCESSFUL, mas Metro falha imediatamente ao iniciar:
```
Error [ERR_PACKAGE_PATH_NOT_EXPORTED]: Package subpath './src/utils/getMinifier'
is not defined by "exports" in C:\...\node_modules\metro-transform-worker\package.json
```

**Causa raiz:** Cadeia de dependências no monorepo:
1. `@onsite/camera` → `expo-file-system@18` → `expo@54` → `@expo/metro@54.2.0`
2. `@expo/metro@54.2.0` traz `metro-transform-worker@0.83.3` que é **hoisted** para `root/node_modules/`
3. `@expo/metro-config@0.19.12` (Expo 52) faz `require("metro-transform-worker/src/utils/getMinifier")`
4. `metro-transform-worker@0.83.3` tem campo `exports` que **bloqueia** acesso direto a `./src/*`
5. `metro-transform-worker@0.81.0` **não tem** `exports` → funciona normalmente

**Fix:** Pinar 2 metro packages como devDependency na raiz do monorepo:

```bash
cd c:\Dev\Onsite-club\onsite-eagle
npm install metro-transform-worker@0.81.0 metro-cache-key@0.81.0 --save-dev
```

Isso coloca as versões 0.81.0 no root `node_modules/`, sobrescrevendo as 0.83.3 hoisted.

**Por que esses 2 packages (e não outros)?**

| Package | Versão hoisted | Problema | Fix |
|---------|---------------|----------|-----|
| `metro-transform-worker` | 0.83.3 | Campo `exports` bloqueia `./src/*` | Pin 0.81.0 (sem exports) |
| `metro-cache-key` | 0.83.3 | API mudou: exporta `{getCacheKey}` em vez de função | Pin 0.81.0 (exporta função) |
| `metro-transform-plugins` | 0.83.3 | Sem problema — `@expo/metro-config` acessa via propriedades | Não precisa pinar |
| `metro-source-map` | 0.81.5 | Sem problema — API compatível | Não precisa pinar |

**CUIDADO — NÃO forçar TODOS os metro packages para 0.81.0 via overrides!**
Forçar `metro-cache-key` para 0.81.0 via override e depois tentar usar com `@expo/metro-config` que espera 0.83.3 para outros packages causa conflitos em cadeia. O fix é cirúrgico: só esses 2 como devDependency direta.

**Nota:** Os overrides antigos (`0.80.12`) foram removidos do root `package.json` — não funcionavam e causavam mais problemas.

---

#### Problema 9: Cor accent antiga (purple #5856D6)

**Sintoma:** Notification LED e vários componentes aparecem em roxo em vez de verde.

**Fix:** Substituído `#5856D6` por `#0F766E` em:
- `pushRegistration.ts` (notification channel lightColor)
- `requests/[id].tsx` (status colors, buttons)
- `deliver/[id].tsx` (loader, confirm button)
- `(tabs)/_layout.tsx` (tab bar active tint)

---

#### Problema 10: Metro não resolve subpath exports

**Sintoma:** Metro falha com:
```
Unable to resolve "@onsite/timeline/data" from "apps/operator/app/deliver/[id].tsx"
```

**Causa raiz:** Metro bundler **não suporta** o campo `exports` do package.json com subpaths como `./data`. Isso é uma limitação conhecida — Node.js resolve, mas Metro não.

**Fix:** Mudar imports de subpath para root export:
```diff
- import { sendMessage } from '@onsite/timeline/data';
+ import { sendMessage } from '@onsite/timeline';
```

O `index.ts` de cada package já re-exporta tudo. Funciona porque Metro resolve o campo `main` ou `module` do package.json.

**Exceção:** `@onsite/utils` — o root export puxa `tailwind-merge` (web-only). Para mobile, usar import direto do arquivo: `import { uuid } from '@onsite/utils/src/uuid'`.

**Arquivos corrigidos:**
- `apps/operator/app/deliver/[id].tsx`
- `apps/operator/app/(tabs)/report.tsx`

---

#### Problema 11: Expo prebuild da raiz contamina root package.json

**Sintoma:** Rodar `npx expo prebuild --clean` ou `npx expo run:android` da **raiz do monorepo** (em vez de `apps/operator/`) causa:
1. Expo adiciona `expo@54`, `react@19.1.0`, `react-native@0.81.5` ao `package.json` raiz
2. Cria diretório `android/` na raiz (projeto Android fantasma)
3. Metro trava ao iniciar — fica hanging infinitamente
4. `npm install` subsequente instala versões conflitantes no root

**Causa raiz:** Expo resolve tudo relativo ao `cwd`. Da raiz, cria um projeto Android no lugar errado e poluiu as dependências.

**Fix (3 passos):**
```bash
# 1. Deletar o android/ fantasma da raiz
rm -rf android/

# 2. Limpar deps erradas do root package.json
# Remover "dependencies": { "expo": "...", "react": "...", "react-native": "..." }
# O root SÓ deve ter devDependencies (metro-cache-key, metro-transform-worker, turbo)

# 3. Reinstalar limpo
rm -rf node_modules
npm install
```

**Prevenção:** SEMPRE `cd apps/operator` antes de qualquer comando Expo. NUNCA da raiz.

---

#### Problema 12: Metro hanging (trava >5 minutos sem output)

**Sintoma:** `npx expo start --dev-client` ou `npx expo run:android` inicia mas não produz output. Metro fica congelado sem mostrar o QR code ou URL.

**Causas possíveis (em ordem de probabilidade):**

1. **Diretório `android/` na raiz** — criado por prebuild acidental da raiz. Metro tenta processar esse diretório extra e trava.
   - Fix: `rm -rf android/` na raiz do monorepo

2. **node_modules corrompido** — múltiplos `npm install` com overrides, deps adicionadas e removidas.
   - Fix: `rm -rf node_modules && npm install` na raiz

3. **Cache do Metro corrompido** — cache com referencias a módulos que mudaram.
   - Fix: `npx expo start --dev-client -c` (flag `-c` limpa cache)

4. **Processo Metro anterior ainda rodando** — porta 8081 ocupada.
   - Fix (Windows): `netstat -ano | findstr :8081` → `taskkill /PID <pid> /F`
   - Fix (Unix): `lsof -i :8081` → `kill -9 <pid>`

**Sequência de recovery recomendada:**
```bash
# 1. Matar processos Metro residuais
# (Windows) taskkill /IM node.exe /F  ← CUIDADO: mata TODOS os processos node

# 2. Limpar tudo
cd c:\Dev\Onsite-club\onsite-eagle
rm -rf android/              # fantasma da raiz
rm -rf node_modules
npm install

# 3. Reconstruir do app
cd apps/operator
npx expo start --dev-client -c
```

---

## 7. Estrutura de Arquivos Final

```
apps/operator/
├── app/
│   ├── _layout.tsx              # Root Stack (offline, push, auth guard)
│   ├── (auth)/
│   │   ├── _layout.tsx          # Auth group layout
│   │   └── login.tsx            # Email/password login (operators pre-registered)
│   ├── (tabs)/
│   │   ├── _layout.tsx          # 3 tabs: Pedidos, Reportar, Config
│   │   ├── index.tsx            # Pedidos (main) — cards + realtime + FAB camera
│   │   ├── report.tsx           # Reportar — botões rápidos → timeline
│   │   └── config.tsx           # Config — disponibilidade, QR, settings
│   ├── requests/
│   │   ├── index.tsx            # Redirect → tabs (deep link compat)
│   │   └── [id].tsx             # Detalhe do pedido
│   ├── deliver/
│   │   └── [id].tsx             # Confirmar entrega + foto + timeline
│   ├── photo.tsx                # Foto avulsa — captura + modal (lote, categoria)
│   └── scanner.tsx              # QR scanner — vincular a site
├── index.js                     # Entry point (import "expo-router/entry")
├── src/
│   └── lib/
│       ├── supabase.ts          # Supabase client (AsyncStorage sessions)
│       └── pushRegistration.ts  # Push notifications (FCM)
├── assets/                      # Icons e splash (placeholder)
├── .env.local                   # Supabase keys (não commitar)
├── .env.example                 # Template de env vars
├── app.json                     # Expo config (newArchEnabled: false)
├── babel.config.js              # Apenas babel-preset-expo
├── metro.config.js              # React 18/19 isolation + watchFolders
├── package.json                 # Dependencies
└── tsconfig.json                # TypeScript config
```

---

## 8. Checklist Pre-Build

```
[ ] cd apps/operator  ← PRIMEIRO! Sempre entrar na pasta antes de qualquer comando
[ ] Device conectado via USB (adb devices mostra o device)
[ ] .env.local com anon key real (não "your_anon_key_here")
[ ] npm install feito na RAIZ do monorepo (cd ../.. && npm install)
[ ] Java 17+ instalado (JAVA_HOME setado)
[ ] Android SDK instalado (ANDROID_HOME setado)
[ ] USB debugging habilitado no device
```

---

## 9. Troubleshooting Rápido

| Erro | Causa | Fix |
|------|-------|-----|
| Tela branca, nenhuma rota | babel plugin errado | Remover transform-inline-env-vars |
| `property is not writable` | React 19 no bundle | Verificar blockList no metro.config |
| `ReactCurrentOwner undefined` | React version mismatch | Mesma coisa — blockList |
| `Supabase not configured` | .env.local vazio/errado | Copiar anon key do timekeeper |
| `File not found: icon.png` | Sem assets | Criar/copiar os PNGs |
| Push token não registra | Typo expiConfig | Corrigir para expoConfig |
| Gradle falha sem JDK | Java não instalado | Instalar JDK 17+ |
| `Compose Compiler requires Kotlin 1.9.25` | Kotlin version no gradle | `android.kotlinVersion=1.9.25` em gradle.properties + `$kotlinVersion` no classpath |
| Metro não resolve packages | node_modules desatualizado | `npm install` na raiz |
| `ERR_PACKAGE_PATH_NOT_EXPORTED` getMinifier | metro-transform-worker 0.83.3 hoisted | `npm install metro-transform-worker@0.81.0 metro-cache-key@0.81.0 --save-dev` na raiz |
| `metro_cache_key_1.default is not a function` | metro-cache-key 0.83.3 mudou API | Mesmo fix acima — pinar `metro-cache-key@0.81.0` como devDep na raiz |
| `Unable to resolve "@onsite/timeline/data"` | Metro não suporta subpath exports | Mudar import para `@onsite/timeline` (root export) |
| Metro trava ao iniciar (hanging >5min) | Diretório `android/` na raiz do monorepo | Deletar `android/` da raiz: `rm -rf android/` e rodar `npm install` |
| `expo prebuild` adiciona deps erradas ao root | Rodou Expo da raiz do monorepo | SEMPRE `cd apps/operator` primeiro! Remover expo/react/react-native do root package.json |

---

### Sessão: 2026-02-25 — Auth + Realtime + Foto

#### Feature 1: Login/Auth Flow

Operator não tinha tela de login. Criados:
- `app/(auth)/login.tsx` — email/password, sem signup (operators pré-registrados pelo supervisor)
- `app/(auth)/_layout.tsx` — Stack layout para auth group
- `app/_layout.tsx` refatorado com auth guard (`useSegments` + `useRouter`)
- `src/lib/supabase.ts` — adicionado AsyncStorage para persistência de sessão

**Bug fix:** Login screen flashing em loop. Causa: `segments` mudava e re-triggava redirect. Fix: `hasNavigated` useRef.

#### Feature 2: Realtime Material Requests

- Migration: `ALTER PUBLICATION supabase_realtime ADD TABLE egl_material_requests`
- `(tabs)/index.tsx` refatorado: `getMaterialRequests` → `getOperatorQueue` (filtra por sites atribuídos)
- Subscription realtime via `supabase.channel('operator-requests')` com `postgres_changes`
- Badge "Live" no header

#### Feature 3: AI Mediator Fix (Monitor → Operator pipeline)

2 bugs impediam o fluxo timeline → material_request:

1. **Condição muito restritiva**: `event_type === 'material_request'` exigido junto com `material_request` object. IA podia classificar como `calendar` mas popular `material_request`. Fix: checar só `result.material_request.material_name`.
2. **`material_type` NOT NULL**: Insert não incluía a coluna obrigatória. Fix: `material_type: mr.material_type || 'general'`.

Arquivos: `apps/monitor/src/app/api/timeline/mediate/route.ts`, `packages/ai/src/specialists/mediator.ts` (v1→v2)

#### Feature 4: Foto na Entrega + Foto Avulsa

**Dependências adicionadas:** `expo-image-picker`, `expo-file-system`, `@onsite/camera`
**metro.config.js:** `packages/camera` adicionado aos watchFolders

**deliver/[id].tsx** — Reescrito com:
- Botão "Tirar Foto" (expo-image-picker, quality 0.8)
- Preview da foto + trocar/remover
- Upload ao `egl-media` bucket via Supabase Storage
- Foto URL incluída no timeline event (`metadata.photo_url`)
- Entrega funciona com ou sem foto (opcional)

**photo.tsx** — Nova tela de foto avulsa:
- Acessada via FAB de camera na tela de Pedidos
- Tira foto → modal de classificação automático
- 7 categorias: Entrega, Acidente, Bloqueio na Rua, Roubo de Material, Dano, Progresso, Outro
- Seleção de lote via chips (todos os lotes do site + "Geral")
- Comentário opcional
- Upload → timeline event + mensagem site-level

**NOTA:** Novas libs nativas (expo-image-picker, expo-file-system) exigem rebuild:
```bash
cd apps/operator
npx expo prebuild --clean --platform android
npx expo run:android
```
