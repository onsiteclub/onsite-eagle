# OnSite Field — Pipeline & Build Guide

> Device: Samsung SM_G990W (Android) — cabo USB direto
> Stack: Expo 52 + React Native 0.76.0 + React 18.3.1
> CI/CD: Codemagic (YAML workflow)

---

## 1. Arquitetura do App

```
┌────────────────────────────────────────────┐
│  OnSite Field (Worker App)          [sync] │
├────────────────────────────────────────────┤
│                                            │
│  MY LOTS (main — 90% do tempo)             │
│  Cards de lotes atribuídos com status,     │
│  progresso, acesso a detalhe/camera/notes  │
│                                            │
├────────────────────────────────────────────┤
│  🏠 My Lots    📅 Agenda    ⚙️ Config     │
└────────────────────────────────────────────┘
```

### 3 Tabs

| Tab | Arquivo | Funcao |
|-----|---------|--------|
| **My Lots** | `app/(tabs)/index.tsx` | Lista de lotes via `egl_houses` + `egl_sites`, stats, progress bars |
| **Agenda** | `app/(tabs)/agenda.tsx` | Eventos do site (weather, inspections, deadlines) via @onsite/agenda |
| **Config** | `app/(tabs)/config.tsx` | Profile, QR scanner link, sign out |

### Telas Stack (fora das tabs)

| Tela | Arquivo | Quando abre |
|------|---------|-------------|
| **Login** | `app/(auth)/login.tsx` | Sem sessao ativa → redirect automatico |
| **Lot Detail** | `app/lot/[id]/index.tsx` | Tap no card do lote |
| **Lot Timeline** | `app/lot/[id]/timeline.tsx` | Quick action "Timeline" no detalhe |
| **Lot Documents** | `app/lot/[id]/documents.tsx` | Quick action "Docs" no detalhe |
| **Add Note** | `app/lot/[id]/notes.tsx` | Quick action "Note" (modal) |
| **Camera** | `app/camera.tsx` | Quick action "Photo" → sempre de dentro de um lot |
| **QR Scanner** | `app/scanner.tsx` | Config → Scan QR → vincular a site |

### Cor Accent
`#0F766E` (verde teal) — Enterprise Theme v3, identico ao Operator e Monitor.

### Fluxo de Dados
```
Worker (Field) → egl_timeline/egl_messages → Monitor (supervisor) → Operator (e vice-versa)
```

---

## 2. Comandos de Build (Local)

> **MONOREPO:** Comandos Expo SEMPRE de dentro de `apps/field/`, NUNCA da raiz.

### Primeira vez (sem pasta `android/`)

```bash
cd apps/field
npx expo prebuild --platform android
npx expo run:android
```

O `expo run:android` faz: prebuild → gradle build → instala no device → inicia Metro.

### Builds seguintes (pasta `android/` ja existe)

```bash
# SEMPRE entrar na pasta primeiro
cd apps/field

# Se mudou APENAS codigo JS/TS:
npx expo start --dev-client

# Se mudou native deps (package.json, plugins, app.json):
npx expo prebuild --clean --platform android
npx expo run:android
```

### Dev com device fisico (2 terminais)

```bash
# Terminal 1 — Metro
cd apps/field
npx expo start --dev-client --localhost --clear --port 8081

# Terminal 2 — ADB reverse (device fisico)
adb reverse tcp:8081 tcp:8081
```

### Quando precisa de rebuild nativo?

| Mudou o que? | Comando (sempre de dentro de `apps/field/`) |
|--------------|----------------------------------------------|
| Codigo JS/TS | `npx expo start --dev-client` |
| `package.json` (nova dep nativa) | `npx expo run:android` |
| `app.json` (plugins, bundle id) | `npx expo prebuild --clean && npx expo run:android` |
| `metro.config.js` | Reiniciar Metro (`npx expo start --dev-client -c`) |
| `babel.config.js` | Reiniciar Metro com cache clear (`-c`) |
| `npm install` na raiz | Reiniciar Metro (`npx expo start --dev-client -c`) |

---

## 3. Configs Criticos

### metro.config.js — React 18/19 Isolation

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

**Por que:** Monorepo tem React 19 hoisted no root (Next.js apps). Sem blockList, Metro resolve React 19 → crash em runtime.

### babel.config.js — Sem plugins extras

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
```

**PROIBIDO:** `transform-inline-environment-variables`. Quebra route discovery do Expo Router.

### app.json — newArchEnabled: false

```json
{ "newArchEnabled": false }
```

---

## 4. Packages Usados

| Package | Import | Uso |
|---------|--------|-----|
| `@onsite/auth` | `AuthProvider`, `useAuth` | Login, auth guard, sign out |
| `@onsite/timeline` | `fetchMessages`, `sendMessage`, `subscribeToMessages` | Timeline WhatsApp-style dentro do lot |
| `@onsite/agenda` | `fetchAgendaEvents`, `buildDaySummaries`, `AGENDA_EVENT_CONFIG` | Tab Agenda — eventos do site |
| `@onsite/offline` | `initQueue`, `useOfflineSync` | Queue offline para sync |
| `@onsite/sharing` | `parseQRPayload`, `isJoinSitePayload`, `joinSite` | QR scanner para vincular a site |
| `@onsite/shared` | Types compartilhados | Interfaces |

### Native deps

| Dep | Versao | Uso |
|-----|--------|-----|
| `expo-camera` | ~16.0.0 | QR scanner + camera |
| `expo-file-system` | ~18.0.12 | Leitura de arquivos para upload base64 |
| `@react-native-async-storage/async-storage` | 1.23.1 | Persistencia de sessao Supabase |
| `@react-native-community/netinfo` | 11.4.1 | Status de conexao para offline sync |

---

## 5. Variaveis de Ambiente

Arquivo: `apps/field/.env.local` (NAO commitar)

```
EXPO_PUBLIC_SUPABASE_URL=https://dbasazrdbtigrdntaehb.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
```

Referencia: copiar de `apps/timekeeper/.env.local` (mesmo projeto Supabase).

---

## 6. Codemagic CI/CD — Pipeline Android

### 6.1 Visao Geral

Codemagic builda o app via YAML config commitado no repo. O fluxo na CI e:

```
1. Clone do repositorio
2. npm install (raiz — npm workspaces resolve tudo)
3. cd apps/field && npx expo prebuild --clean --platform android
4. Gradle bundleRelease (embarca JS bundle, sem Metro server)
5. Coleta artefatos (.aab para Play Store, .apk para teste)
6. Publica (email, Google Play, etc.)
```

**Diferenca da build local:** `expo run:android` = prebuild + gradle + install + Metro.
Na CI, Gradle faz o bundle do JS automaticamente (task `bundleReleaseJsAndAssets`). Metro nao roda como server.

### 6.2 Custo

| Instancia | Custo/min | Build ~25min | Free tier |
|-----------|-----------|-------------|-----------|
| **`linux_x2`** | **$0.045** | **~$1.13** | Nao (billing obrigatorio) |
| `mac_mini_m2` | $0.095 | ~$2.38 | **500 min/mes gratis** |
| `mac_mini_m4` | $0.114 | ~$2.85 | Nao |

**Recomendacao:** Use `mac_mini_m2` para comecar (500 min gratis = ~20 builds/mes).
Quando escalar, mude para `linux_x2` (metade do custo, so Android).

### 6.3 Pre-requisitos no Codemagic Dashboard

Antes de rodar o pipeline, configure no dashboard:

#### A. Keystore (assinatura Android)

1. Gerar keystore (se nao tem):
```bash
keytool -genkey -v -keystore field-release.keystore \
  -storetype JKS -keyalg RSA -keysize 2048 -validity 10000 \
  -alias field-key
```

2. Dashboard → **Team settings → codemagic.yaml settings → Code signing identities → Android keystores**
3. Upload do `.keystore`, preencher password/alias/key password
4. Reference name: `field_keystore`

> IMPORTANTE: Guarde backup do keystore. Codemagic nao permite re-download.

#### B. Variaveis de ambiente

Dashboard → **Team settings → codemagic.yaml settings → Environment variables**

Criar grupo `field_env`:

| Variavel | Valor | Secure |
|----------|-------|--------|
| `EXPO_PUBLIC_SUPABASE_URL` | `https://dbasazrdbtigrdntaehb.supabase.co` | No |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `<anon_key>` | **Yes** |

### 6.4 codemagic.yaml

Colocar na **raiz do monorepo** (`onsite-eagle/codemagic.yaml`):

```yaml
workflows:
  field-android-debug:
    name: Field Android Debug APK
    max_build_duration: 60
    instance_type: mac_mini_m2  # 500 min/mes gratis

    environment:
      groups:
        - field_env
      vars:
        EXPO_NO_GIT_STATUS: "1"
      node: 20
      java: 17

    triggering:
      events:
        - push
      branch_patterns:
        - pattern: main
          include: true
        - pattern: field/*
          include: true

    scripts:
      - name: Install dependencies
        script: |
          cd $CM_BUILD_DIR
          npm install

      - name: Expo prebuild
        script: |
          cd $CM_BUILD_DIR/apps/field
          npx expo prebuild --clean --platform android

      - name: Fix Kotlin version
        script: |
          cd $CM_BUILD_DIR/apps/field/android
          echo "android.kotlinVersion=1.9.25" >> gradle.properties

      - name: Set Android SDK location
        script: |
          echo "sdk.dir=$ANDROID_SDK_ROOT" > "$CM_BUILD_DIR/apps/field/android/local.properties"

      - name: Build debug APK
        script: |
          cd $CM_BUILD_DIR/apps/field/android
          ./gradlew app:assembleDebug

    artifacts:
      - apps/field/android/app/build/outputs/**/*.apk

    publishing:
      email:
        recipients:
          - cristony.silva@gmail.com
        notify:
          success: true
          failure: true

  field-android-release:
    name: Field Android Release
    max_build_duration: 60
    instance_type: mac_mini_m2

    environment:
      android_signing:
        - field_keystore
      groups:
        - field_env
      vars:
        EXPO_NO_GIT_STATUS: "1"
      node: 20
      java: 17

    triggering:
      events:
        - push
      branch_patterns:
        - pattern: release/field-*
          include: true

    scripts:
      - name: Install dependencies
        script: |
          cd $CM_BUILD_DIR
          npm install

      - name: Expo prebuild
        script: |
          cd $CM_BUILD_DIR/apps/field
          npx expo prebuild --clean --platform android

      - name: Fix Kotlin version
        script: |
          cd $CM_BUILD_DIR/apps/field/android
          echo "android.kotlinVersion=1.9.25" >> gradle.properties

      - name: Set Android SDK location
        script: |
          echo "sdk.dir=$ANDROID_SDK_ROOT" > "$CM_BUILD_DIR/apps/field/android/local.properties"

      - name: Configure release signing
        script: |
          cd $CM_BUILD_DIR/apps/field/android/app

          # Inject signingConfigs into build.gradle
          cat >> build.gradle << 'SIGNING'

          android.signingConfigs {
              release {
                  storeFile file(System.getenv("CM_KEYSTORE_PATH") ?: "/dev/null")
                  storePassword System.getenv("CM_KEYSTORE_PASSWORD") ?: ""
                  keyAlias System.getenv("CM_KEY_ALIAS") ?: ""
                  keyPassword System.getenv("CM_KEY_PASSWORD") ?: ""
              }
          }
          android.buildTypes.release.signingConfig = android.signingConfigs.release
          SIGNING

      - name: Build release AAB
        script: |
          cd $CM_BUILD_DIR/apps/field/android
          ./gradlew app:bundleRelease

      - name: Build release APK
        script: |
          cd $CM_BUILD_DIR/apps/field/android
          ./gradlew app:assembleRelease

    artifacts:
      - apps/field/android/app/build/outputs/**/*.aab
      - apps/field/android/app/build/outputs/**/*.apk

    publishing:
      email:
        recipients:
          - cristony.silva@gmail.com
        notify:
          success: true
          failure: true
      # Descomentar quando pronto para Google Play:
      # google_play:
      #   credentials: $GCLOUD_SERVICE_ACCOUNT_CREDENTIALS
      #   track: internal
      #   submit_as_draft: true
```

### 6.5 Explicacao dos Steps

| Step | O que faz | Por que |
|------|-----------|---------|
| **Install dependencies** | `npm install` na raiz | npm workspaces resolve todos os packages + apps |
| **Expo prebuild** | Gera `android/` com Gradle project | `--clean` garante estado limpo na CI |
| **Fix Kotlin version** | Seta `android.kotlinVersion=1.9.25` | Expo prebuild gera sem versao explicita → Gradle resolve 1.9.24 → Compose Compiler crash |
| **Set Android SDK** | Escreve `local.properties` | Gradle precisa saber onde esta o SDK |
| **Configure signing** (release) | Injeta `signingConfigs` no build.gradle | Expo prebuild gera com signing debug. CI precisa release keystore |
| **Build** | `gradlew assembleDebug/Release` ou `bundleRelease` | APK para teste, AAB para Play Store |

### 6.6 Artefatos

| Tipo | Comando Gradle | Path de saida |
|------|---------------|---------------|
| **APK debug** | `assembleDebug` | `android/app/build/outputs/apk/debug/app-debug.apk` |
| **APK release** | `assembleRelease` | `android/app/build/outputs/apk/release/app-release.apk` |
| **AAB release** | `bundleRelease` | `android/app/build/outputs/bundle/release/app-release.aab` |

### 6.7 Como Usar

1. Commitar `codemagic.yaml` na raiz do repo
2. Conectar repo no [Codemagic Dashboard](https://codemagic.io/)
3. Push para `main` → trigger automatico do workflow `field-android-debug`
4. Push para `release/field-*` → trigger do workflow `field-android-release`
5. APK/AAB aparece em **Artifacts** no dashboard

### 6.8 Variaveis Automaticas do Codemagic

| Variavel | Descricao |
|----------|-----------|
| `CM_BUILD_DIR` | Path absoluto da raiz do repo clonado |
| `ANDROID_SDK_ROOT` | Path do Android SDK |
| `BUILD_NUMBER` | Numero auto-incrementado |
| `CM_BRANCH` | Branch atual |
| `CM_COMMIT` | Hash do commit |
| `CM_KEYSTORE_PATH` | Path do keystore uploaded (se configurado) |
| `CM_KEYSTORE_PASSWORD` | Password do keystore |
| `CM_KEY_ALIAS` | Alias da key |
| `CM_KEY_PASSWORD` | Password da key |

---

## 7. Estrutura de Arquivos

```
apps/field/
├── app/
│   ├── _layout.tsx              # Root (AuthProvider, offline sync, auth guard)
│   ├── (auth)/
│   │   ├── _layout.tsx          # Auth group layout
│   │   └── login.tsx            # Email/password login
│   ├── (tabs)/
│   │   ├── _layout.tsx          # 3 tabs: My Lots, Agenda, Config
│   │   ├── index.tsx            # My Lots — egl_houses + egl_sites
│   │   ├── agenda.tsx           # Agenda — @onsite/agenda events
│   │   └── config.tsx           # Config — profile, QR, sign out
│   ├── lot/
│   │   └── [id]/
│   │       ├── _layout.tsx      # Lot Stack (white header)
│   │       ├── index.tsx        # Lot detail — progress, quick actions, activity
│   │       ├── timeline.tsx     # Chat WhatsApp-style — @onsite/timeline
│   │       ├── documents.tsx    # Documents grouped by category
│   │       └── notes.tsx        # Quick note templates (8 presets) + custom
│   ├── camera.tsx               # Phase photo — egl-media bucket
│   └── scanner.tsx              # QR scanner — @onsite/sharing joinSite
├── index.js                     # Entry point (import "expo-router/entry")
├── src/
│   └── lib/
│       └── supabase.ts          # Supabase client (AsyncStorage sessions)
├── assets/                      # Icons e splash
├── .env.local                   # Supabase keys (NAO commitar)
├── app.json                     # Expo config (newArchEnabled: false)
├── babel.config.js              # Apenas babel-preset-expo
├── metro.config.js              # React 18/19 isolation + watchFolders
├── package.json                 # Dependencies
├── tsconfig.json                # TypeScript config
└── PIPELINE.md                  # Este arquivo
```

---

## 8. Checklist Pre-Build (Local)

```
[ ] cd apps/field  ← PRIMEIRO!
[ ] Device conectado via USB (adb devices mostra o device)
[ ] .env.local com anon key real
[ ] npm install feito na RAIZ do monorepo
[ ] Java 17+ instalado (JAVA_HOME setado)
[ ] Android SDK instalado (ANDROID_HOME setado)
[ ] USB debugging habilitado no device
[ ] Assets existem (icon.png, splash-icon.png, adaptive-icon.png, favicon.png)
```

---

## 9. Checklist Pre-Build (Codemagic)

```
[ ] codemagic.yaml commitado na raiz do monorepo
[ ] Keystore uploaded no dashboard (reference: field_keystore)
[ ] Environment group "field_env" criado com SUPABASE_URL + ANON_KEY
[ ] Assets existem no repo (icon.png, splash, etc.)
[ ] app.json com package name correto (com.onsiteclub.field)
[ ] Repo conectado no Codemagic dashboard
```

---

## 10. Troubleshooting

| Erro | Causa | Fix |
|------|-------|-----|
| Tela branca, nenhuma rota | babel plugin errado | Remover transform-inline-env-vars |
| `property is not writable` | React 19 no bundle | Verificar blockList no metro.config |
| `ReactCurrentOwner undefined` | React version mismatch | blockList + extraNodeModules |
| `Supabase not configured` | .env.local vazio | Copiar anon key do timekeeper |
| `File not found: icon.png` | Sem assets | Criar/copiar PNGs para `assets/` |
| `Compose Compiler requires Kotlin 1.9.25` | Kotlin no gradle | `android.kotlinVersion=1.9.25` em gradle.properties |
| `ERR_PACKAGE_PATH_NOT_EXPORTED` getMinifier | metro-transform-worker 0.83.3 hoisted | Root devDeps: `metro-transform-worker@0.81.0` + `metro-cache-key@0.81.0` |
| `Unable to resolve "@onsite/timeline/data"` | Metro nao suporta subpath exports | Import de `@onsite/timeline` (root export) |
| Metro trava >5min | `android/` fantasma na raiz | Deletar `rm -rf android/` da raiz |
| `expo prebuild` adiciona deps na raiz | Rodou da raiz do monorepo | SEMPRE `cd apps/field` primeiro |
| Codemagic: `sdk.dir not set` | Falta local.properties | Step "Set Android SDK location" |
| Codemagic: signing falha | Keystore nao configurado | Upload keystore no dashboard |
| Codemagic: `EXPO_ROUTER_APP_ROOT undefined` | CI nao tem vars de build | Set `EXPO_NO_GIT_STATUS=1` |

---

## 11. Recursos

- [Codemagic Docs — React Native](https://docs.codemagic.io/yaml-quick-start/building-a-react-native-app/)
- [Codemagic Docs — Android Signing](https://docs.codemagic.io/yaml-code-signing/signing-android/)
- [Codemagic Docs — Environment Variables](https://docs.codemagic.io/yaml-basic-configuration/environment-variables/)
- [Codemagic Pricing](https://codemagic.io/pricing/)
- [Expo Prebuild Docs](https://docs.expo.dev/workflow/prebuild/)
- [Expo Monorepo Guide](https://docs.expo.dev/guides/monorepos/)
