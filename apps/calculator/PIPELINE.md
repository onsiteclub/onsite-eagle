<!--
  @ai-rules
  1. NUNCA delete entradas de "Historico de Erros" — apenas ADICIONE novas com data.
  2. NUNCA delete entradas de "Troubleshooting" — apenas ADICIONE novas linhas.
  3. Ao corrigir um erro de build, SEMPRE adicione ao Historico de Erros com:
     data, sintoma, causa raiz, fix, e arquivos alterados.
  4. Mantenha as secoes na ordem. Nao reorganize.
  5. Este arquivo e a UNICA FONTE DE VERDADE para build e deploy deste app.
-->

# OnSite Calculator — Pipeline & Build Guide

> Stack: Vite 5.4 + React 18.3.1 + Capacitor 6.1 + TailwindCSS 3.4
> API: Vercel Serverless (api/interpret.ts — Whisper + GPT-4o)
> CI/CD: Codemagic (4 workflows: Android release/debug, iOS TestFlight/debug)

---

## 1. Quick Reference

```bash
# Web dev
cd apps/calculator && npm run dev                  # localhost:5173

# Android (device USB)
npm run build && npm run cap:sync && npm run cap:android  # abre Android Studio
# No Android Studio: Run > app (device selecionado)

# Tests
npm run test                                       # Vitest
npm run validate                                   # types + lint + test + build
```

---

## 2. Build Commands

### Web (Desenvolvimento)

```bash
cd apps/calculator
npm run dev          # Vite dev server em localhost:5173
```

### Web (Producao — Vercel)

```bash
npm run build        # tsc -b && vite build → dist/
# Deploy: Push para main → Vercel auto-deploy
```

### Android (Device USB)

```bash
npm run build                    # Build web assets
npm run cap:sync                 # Sync para plataforma nativa
npm run cap:android              # Abre Android Studio
# Android Studio → Run > app (device selecionado)
```

### Android (APK para distribuicao)

```bash
npm run build && npm run cap:sync
cd android
./gradlew assembleRelease
# Output: android/app/build/outputs/apk/release/app-release.apk
```

### Android (AAB para Google Play)

```bash
npm run build && npm run cap:sync
cd android
./gradlew bundleRelease
# Output: android/app/build/outputs/bundle/release/app-release.aab
```

### iOS (via Codemagic)

Push para `main` → Codemagic builda automaticamente → TestFlight.

### Quando rebuildar?

| Mudou o que? | Comando |
|--------------|---------|
| Codigo JS/TS | `npm run dev` (hot reload) |
| Capacitor plugin | `npm run cap:sync` + rebuild no Studio |
| `capacitor.config.ts` | `npm run cap:sync` |
| Dependencia nativa | `npm run cap:sync` + full rebuild |
| API (`api/interpret.ts`) | Push → Vercel auto-deploy |

### Versionamento (CRITICO — manter sincronizado)

| Arquivo | Campo | Exemplo |
|---------|-------|---------|
| `package.json` | `version` | `"1.0.11"` |
| `android/app/build.gradle` | `versionCode` + `versionName` | `11` + `"1.0.11"` |
| `ios/App/App.xcodeproj/project.pbxproj` | `CURRENT_PROJECT_VERSION` + `MARKETING_VERSION` | `11` + `"1.0.11"` |

---

## 3. Configs Criticos

### vite.config.ts

```typescript
// Alias: @ → ./src
// Port: 5173 (strict)
// Build: minify esbuild, no sourcemap
// Chunks: vendor (react), supabase (separado)
```

### capacitor.config.ts

- `server.androidScheme: 'https'` — obrigatorio para Supabase auth
- `plugins.CapacitorHttp.enabled: false` — desabilita HTTP nativo (bug com query params)

### Android Manifest — Permissoes

| Permissao | Motivo |
|-----------|--------|
| `RECORD_AUDIO` | Microfone para voice input |
| `MODIFY_AUDIO_SETTINGS` | WebView getUserMedia() |
| `INTERNET` | Acesso a rede |

### Keystore Android

- Arquivo: `android/app/onsite-calculator-release.keystore`
- Alias: `onsite-calculator`
- **EM .gitignore** — NAO perder o backup!

---

## 4. Packages Usados

| Package | Import | Uso |
|---------|--------|-----|
| `@onsite/auth` | `AuthProvider`, `useAuth` | Auth context (freemium: anon funciona) |
| `@onsite/auth-ui` | Auth components | Login/signup modals |
| `@onsite/logger` | Structured logging | Logs da calculadora |
| `@onsite/tokens` | Design tokens | Cores, espacamento |
| `@onsite/utils` | Utilities | Formatters (sub-export para evitar tailwind-merge) |

---

## 5. Variaveis de Ambiente

### Web (.env.local)

| Variavel | Descricao | Secret |
|----------|-----------|--------|
| `VITE_SUPABASE_URL` | URL do projeto Supabase | Nao |
| `VITE_SUPABASE_ANON_KEY` | Anon key do Supabase | Nao |
| `OPENAI_API_KEY` | API key OpenAI (Whisper + GPT) | **Sim** |
| `VITE_STRIPE_CHECKOUT_URL` | URL de checkout Stripe | Nao |

### Codemagic (Environment Groups)

- `supabase_credentials` — VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
- `google_play_credentials` — Para Google Play upload

Referencia: `.env.example` no app.

---

## 6. CI/CD — Codemagic (4 Workflows)

### Workflow 1: android-release (push para main)

```
npm install → vite build → cap sync → gradlew bundleRelease + assembleRelease
→ AAB + APK → Google Play (internal track, draft) + Email
```
- Instance: `linux_x2` (Node 18, Java 17)
- Keystore: upload no Codemagic dashboard

### Workflow 2: android-debug (PR aberto)

```
npm install → vite build → cap sync → gradlew assembleDebug → APK → Email
```

### Workflow 3: ios-testflight (push para main)

```
npm install → vite build → cap sync → xcodebuild (archive) → TestFlight upload
```
- Instance: `mac_mini_m1` (Xcode latest)
- Auto-incrementa build number do TestFlight
- Signing: automatic via App Store Connect API key

### Workflow 4: ios-debug (PR aberto)

```
npm install → vite build → cap sync → xcodebuild (debug) → IPA → Email
```

### Config: `codemagic.yaml` na raiz de `apps/calculator/`

---

## 7. Estrutura de Arquivos

```
apps/calculator/
├── src/
│   ├── App.tsx                # Main component (tabs, auth gate)
│   ├── main.tsx               # Entry point
│   ├── components/
│   │   ├── Calculator.tsx     # Calculadora principal + voice
│   │   ├── StairsCalculator.tsx
│   │   ├── TriangleCalculator.tsx
│   │   ├── UnitConverter.tsx
│   │   ├── HamburgerMenu.tsx  # Settings menu
│   │   ├── AuthGate.tsx       # Login modal para features premium
│   │   ├── VoiceConsentModal.tsx
│   │   ├── HistoryModal.tsx
│   │   ├── LegalModal.tsx
│   │   ├── Toast.tsx
│   │   └── AutoFitText.tsx
│   ├── hooks/
│   │   ├── useCalculator.ts   # Engine (tokenizer, parser, PEMDAS)
│   │   ├── useVoiceRecorder.ts
│   │   └── useVoiceUsage.ts
│   ├── lib/
│   │   ├── calculator/        # Math engine core
│   │   ├── supabase.ts        # Capacitor + localStorage adapter
│   │   ├── consent.ts
│   │   └── logger.ts
│   └── styles/App.css
├── api/
│   ├── interpret.ts           # Vercel serverless: Whisper + GPT-4o
│   └── lib/
│       ├── rate-limit.ts      # 30 req/min
│       └── voice-logs.ts      # Log voice input metadata
├── android/                   # Capacitor Android platform
├── ios/                       # Capacitor iOS platform
├── tests/unit/                # Vitest tests
├── docs/                      # Legal (Privacy Policy, Terms)
├── .env.example               # Template de variaveis
├── vite.config.ts
├── capacitor.config.ts
├── codemagic.yaml
├── tailwind.config.js
├── index.html
└── package.json
```

---

## 8. Pre-Build Checklist

```
[ ] .env.local com chaves reais (Supabase + OpenAI)
[ ] npm install na raiz do monorepo
[ ] Keystore existe (android/app/onsite-calculator-release.keystore)
[ ] Versao sincronizada (package.json = build.gradle = pbxproj)
[ ] Tests passando (npm run test)
```

---

## 9. Troubleshooting

| Sintoma | Causa | Fix |
|---------|-------|-----|
| Voice nao funciona | OPENAI_API_KEY faltando | Setar em .env.local |
| Voice retorna NaN | Regex de sanitize quebrou | Verificar SYSTEM_PROMPT v9 no interpret.ts |
| Build Android falha | Keystore nao encontrado | Verificar path em build.gradle |
| Capacitor sync falha | Dist vazio | Rodar `npm run build` antes |
| Web nao abre | Porta 5173 ocupada | Matar processo na porta |
| iPad rejeita build | Multitasking orientations | Info.plist: `UIRequiresFullScreen = YES` |
| Audio permission denied | Manifest incorreto | RECORD_AUDIO + MODIFY_AUDIO_SETTINGS |
| CORS error no voice | Dominio nao permitido | Adicionar em allowedOrigins no interpret.ts |
| "100 - 10%" = 99.9 | Percentage bug | 3-layer sanitize (prompt + client + server regex) |
| Console invisivel no WebView | Android WebView limita console | `adb logcat -s chromium` |

---

## 10. Historico de Erros

### Sessao: Pre-v1.0 — Erros de Build Android/iOS

#### Erro 001: iPad Multitasking Orientations

| Campo | Detalhe |
|-------|---------|
| **Data** | Pre-2026-01 |
| **Sintoma** | App Store rejeitou build iOS. Erro: "Missing UISupportedInterfaceOrientations for iPad" |
| **Causa Raiz** | `Info.plist` nao tinha `UIRequiresFullScreen = YES`. iPad exige declaracao de orientacoes ou fullscreen |
| **Fix** | Adicionado `UIRequiresFullScreen = YES` no Info.plist |
| **Arquivos** | `ios/App/App/Info.plist` |

#### Erro 002: MODIFY_AUDIO_SETTINGS Removido

| Campo | Detalhe |
|-------|---------|
| **Data** | Pre-2026-01 |
| **Sintoma** | Voice input falha silenciosamente no Android. `getUserMedia()` rejeita permissao |
| **Causa Raiz** | Permissao `MODIFY_AUDIO_SETTINGS` removida do AndroidManifest |
| **Fix** | Re-adicionado `<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS"/>` |
| **Arquivos** | `android/app/src/main/AndroidManifest.xml` |

#### Erro 003: Percentage Voice → /100

| Campo | Detalhe |
|-------|---------|
| **Data** | Pre-2026-01 |
| **Sintoma** | "100 minus 10 percent" retorna 99.9 em vez de 90 |
| **Causa Raiz** | GPT convertia `10%` para `10/100` (= 0.1). Engine calculava `100 - 0.1 = 99.9` |
| **Fix** | 3 camadas de sanitize: (1) SYSTEM_PROMPT com secao PERCENTAGE explicita, (2) client-side regex `(\d+)\s*/\s*100\b` → `$1%`, (3) server-side regex identico |
| **Arquivos** | `api/interpret.ts` (SYSTEM_PROMPT v9), `src/hooks/useCalculator.ts`, `src/lib/calculator/engine.ts` |

#### Erro 004: Consent Modal Blocks Voice

| Campo | Detalhe |
|-------|---------|
| **Data** | Pre-2026-01 |
| **Sintoma** | Apos negar consent, voice nao funciona mais. Sem forma de re-consentir |
| **Fix** | Re-exibir modal quando usuario tenta usar voice sem consent ativo |
| **Arquivos** | `src/components/VoiceConsentModal.tsx`, `src/App.tsx` |

#### Erro 005: onError Nao Reseta Voice State

| Campo | Detalhe |
|-------|---------|
| **Data** | Pre-2026-01 |
| **Sintoma** | Apos erro de voz, botao fica em "recording" state permanentemente |
| **Fix** | Reset de `isRecording` e `isProcessing` no catch do onError |
| **Arquivos** | `src/hooks/useVoiceRecorder.ts` |

#### Erro 006: console.log Invisivel no WebView Android

| Campo | Detalhe |
|-------|---------|
| **Data** | Pre-2026-01 |
| **Sintoma** | `console.log` nao aparece no terminal durante debug Android |
| **Causa Raiz** | Android WebView redireciona console para logcat do Chromium |
| **Fix** | Workaround: `adb logcat -s chromium` para ver logs |

#### Erro 007: Delete/Export Re-adicionados por Regressao

| Campo | Detalhe |
|-------|---------|
| **Data** | Pre-2026-01 (v1.0, versionCode 11) |
| **Sintoma** | Funcoes "Delete Account" e "Export Data" apareceram no menu apos merge |
| **Causa Raiz** | Regressao — funcoes removidas foram re-adicionadas em commit |
| **Fix** | Removidas permanentemente do HamburgerMenu.tsx |
| **Arquivos** | `src/components/HamburgerMenu.tsx` |
