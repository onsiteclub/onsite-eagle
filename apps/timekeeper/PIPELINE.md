<!--
  @ai-rules
  1. NUNCA delete entradas de "Sessao de Build" ou "Historico de Erros" — apenas ADICIONE novas com data.
  2. NUNCA delete entradas de "Troubleshooting Rapido" — apenas ADICIONE novas linhas.
  3. Ao corrigir um erro de build, SEMPRE adicione ao historico com:
     data, sintoma, causa raiz, fix, e arquivos alterados.
  4. Mantenha as secoes na ordem. Nao reorganize.
  5. Este arquivo e a UNICA FONTE DE VERDADE para build e deploy deste app.
-->

# OnSite Timekeeper — Pipeline & Build Guide

> Stack: Expo 52 + React Native 0.76.0 + Zustand + SQLite + expo-location
> Device: Samsung SM_G990W (Android) via USB
> CI/CD: Nenhum configurado ainda (build manual)

---

## 1. Quick Reference

```bash
cd apps/timekeeper

# Full build (prebuild + gradle + install + metro)
npx expo run:android

# Metro only (app ja instalada no device)
npx expo start --dev-client --localhost --clear --port 8081

# Em outro terminal:
adb reverse tcp:8081 tcp:8081
```

---

## 2. Build Commands

### Desenvolvimento Local (2 terminais)

**Terminal 1 — Metro:**
```bash
cd apps/timekeeper
npx expo start --dev-client --localhost --clear --port 8081
```

**Terminal 2 — ADB reverse:**
```bash
adb reverse tcp:8081 tcp:8081
```

### Full Build (quando mudar native code)

```bash
cd apps/timekeeper
npx expo run:android
```

Isso roda: prebuild → gradle build → install no device → start Metro.

### Quando Rebuildar?

| Mudou o que? | Comando |
|--------------|---------|
| Codigo JS/TS | Hot reload automatico |
| `package.json` (deps JS) | `npm install` na raiz + restart Metro |
| `app.json` (plugins, permissions) | `npx expo run:android` (full rebuild) |
| Packages nativos (expo-location, etc.) | `npx expo run:android` (full rebuild) |
| `metro.config.js` | Restart Metro |
| `babel.config.js` | Restart Metro com `--clear` |
| Packages `@onsite/*` | Restart Metro |

---

## 3. Configs Criticos

### metro.config.js

```javascript
// blockList: Bloqueia react-native 0.76.9 do root para isolar 0.76.0 local
// watchFolders: [monorepoRoot] — ATENCAO: pode travar no Windows
// extraNodeModules: Mapeia react-native para versao local
```

**PROBLEMA CONHECIDO:** `watchFolders: [monorepoRoot]` pode travar no Windows escaneando .next/.turbo/etc. Se travar, mudar para lista especifica de packages (como apps/operator faz).

### babel.config.js

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'],
  };
};
```

**NAO adicionar:** `transform-inline-environment-variables` — quebra route discovery do Expo Router.

**reanimated/plugin** DEVE ser o ultimo plugin da lista.

### app.json — Plugins

```json
"plugins": [
  "expo-router",
  "expo-sqlite",
  ["expo-location", { ... }],
  ["expo-notifications", { ... }],
  ["expo-build-properties", { ... }]
]
```

### app.json — Permissoes Android

```json
"permissions": [
  "ACCESS_FINE_LOCATION",
  "ACCESS_COARSE_LOCATION",
  "ACCESS_BACKGROUND_LOCATION",
  "FOREGROUND_SERVICE",
  "FOREGROUND_SERVICE_LOCATION",
  "RECEIVE_BOOT_COMPLETED",
  "WAKE_LOCK"
]
```

### Entry Point (index.js)

```javascript
import "expo-router/entry";
```

**OBRIGATORIO** em monorepo. Sem ele, Metro resolve `expo/AppEntry.js` no root e retorna 404.

### Supabase Client (src/lib/supabase.ts)

- Usa AsyncStorage para persistencia de tokens
- Dual credential source: `process.env` (Expo Go) + `Constants.expoConfig.extra` (EAS Build)
- **ATENCAO:** app.json tem Supabase URL diferente do projeto principal!

---

## 4. Packages Usados

| Package | Import | Uso |
|---------|--------|-----|
| `@onsite/agenda` | Agenda functions | Eventos do site (calendario) |
| `@onsite/auth-ui` | Auth components | UI de login/register |
| `@onsite/media` | Media functions | Upload de fotos |
| `@onsite/offline` | Offline queue | Sync offline |
| `@onsite/shared` | Types | Interfaces compartilhadas |
| `@onsite/timeline` | Timeline functions | Chat WhatsApp-style |
| `@onsite/tokens` | Design tokens | Cores, espacamento |
| `@onsite/ui` | UI components | Componentes base |

---

## 5. Variaveis de Ambiente

Configuradas em `app.json > expo > extra`:

| Variavel | Descricao | Onde |
|----------|-----------|-----|
| `EXPO_PUBLIC_SUPABASE_URL` | URL do Supabase | app.json extra |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Anon key | app.json extra |

**Nota:** Tambem funciona via `process.env` no Expo Go (development).

---

## 6. Arquitetura do Tracking Engine

### State Machine

```
IDLE ──[enter geofence]──→ TRACKING ──[exit geofence]──→ EXIT_PENDING ──[30s timeout]──→ IDLE
                               ↑                               │
                               └──[re-enter within 30s]────────┘
```

**Regra:** O Tracking Engine e o UNICO modulo que decide quando iniciar/parar sessoes. Nenhum outro arquivo modifica tracking status (exceto manual entry).

### 5 Blocos Criticos que Impedem Auto-Stop

1. **Effects Queue Block** — FIFO queue com race condition se multiplos eventos chegam rapidos
2. **State Machine Block** — Transicao TRACKING → EXIT_PENDING pode falhar se state ja mudou
3. **Confidence Scoring Block** — Score de confianca do GPS muito baixo rejeita exit event
4. **Background Task Block** — Task Manager nao dispara callback se app killed pelo OS
5. **Sync Block** — Upload da sessao para Supabase falha, session fica "phantom"

### Cooldown de 30 Segundos

Quando worker sai da geofence, o sistema espera 30s antes de fechar a sessao. Se o worker re-entrar nesse periodo, a sessao continua. Previne splits por GPS bounce.

### SQLite (Offline-First)

11 tabelas locais. SQLite e source of truth. Supabase e backup.

### Sync Bidirecional

```
Upload (local → cloud) → Download (cloud → local) → Rebuild Aggregates
```

Conflitos resolvidos por timestamp (last-write-wins).

---

## 7. Estrutura de Arquivos

```
apps/timekeeper/
├── app/
│   ├── _layout.tsx                  # Root (bootstrap + Stack)
│   ├── index.tsx                    # Auth redirect gateway
│   ├── (auth)/
│   │   ├── _layout.tsx             # Auth stack
│   │   ├── login.tsx               # Login
│   │   └── register.tsx            # Register
│   ├── (tabs)/
│   │   ├── _layout.tsx             # 8 tabs
│   │   ├── index.tsx               # Home — Timer + today's sessions
│   │   ├── reports.tsx             # Reports — Calendar + export
│   │   ├── timeline.tsx            # Timeline — Chat AI-mediated
│   │   ├── plans.tsx               # Plans — Agenda do site
│   │   ├── lots.tsx                # Lots — Construction lots (Eagle)
│   │   ├── map.tsx                 # Map — Geofences/locations
│   │   ├── team.tsx                # Team — QR sharing
│   │   └── settings.tsx            # Settings + avatar
│   ├── lot/[id]/
│   │   ├── _layout.tsx             # Lot detail stack
│   │   ├── index.tsx               # Lot overview
│   │   ├── documents.tsx           # Docs (plans, RSO, red lines)
│   │   └── notes.tsx               # Notes (Eagle timeline)
│   ├── add-location.tsx            # Criar geofence modal
│   ├── day-detail.tsx              # Day breakdown
│   ├── manual-entry.tsx            # Manual session entry
│   ├── voice.tsx                   # Voice commands
│   ├── share-qr.tsx                # QR code display
│   ├── scan-qr.tsx                 # QR scanner
│   └── lot-scan.tsx                # Lot QR scanner
├── src/
│   ├── components/                 # UI components
│   ├── hooks/                      # Custom hooks
│   ├── lib/
│   │   ├── supabase.ts            # Client Supabase
│   │   └── ...
│   ├── stores/                     # Zustand stores (auth, location, records, sync, settings)
│   └── types/
├── index.js                        # Entry point: import "expo-router/entry"
├── app.json                        # Expo config (plugins, permissions)
├── metro.config.js                 # React isolation + watchFolders
├── babel.config.js                 # babel-preset-expo + reanimated
├── tsconfig.json
└── package.json
```

---

## 8. Pre-Build Checklist

```
[ ] cd apps/timekeeper/ (NUNCA root)
[ ] npm install na raiz do monorepo
[ ] Device conectado via USB (adb devices mostra device)
[ ] adb reverse tcp:8081 tcp:8081
[ ] Supabase URL/Key em app.json > extra
[ ] Node >= 20
```

---

## 9. Troubleshooting

| Sintoma | Causa | Fix |
|---------|-------|-----|
| Metro trava (Windows) | watchFolders = [monorepoRoot] escaneia .next/.turbo | Mudar para lista especifica de packages |
| Bundle 404 | index.js faltando | Criar `index.js` com `import "expo-router/entry"` |
| React version mismatch | Root 0.76.9 vs local 0.76.0 | blockList no metro.config.js |
| Route discovery quebrada | Plugin babel errado | Remover transform-inline-environment-variables |
| Black screen no device | Varias causas | Ver `timekeeper-android-fix.md` na memory |
| Geofence nao dispara | notifyOnEnter/Exit nao setado | Setar explicitamente nas opcoes do startGeofencing |
| Auto-stop nao funciona | 5 blocos criticos | Ver secao 6 (Tracking Engine) |
| Session phantom | Sync falha apos fechar | Verificar Supabase connection + retry |
| GPS bounce (splits) | Saida e re-entrada rapida | Cooldown de 30s ja implementado |
| Avatar nao carrega | Bucket core-avatars nao existe | Criar no Supabase Dashboard |
| Layout overlap | Flex ratios fixas | Usar auto-height (LAYOUT_FIX resolvido) |

---

## 10. Historico de Erros

### Sessao: 2025-01 — UX Redesign v2.0

#### Melhoria 1: Manual Entry Redesign
| Campo | Detalhe |
|-------|---------|
| **Data** | 2025-01 |
| **Sintoma** | Input de horas manual era confuso e propenso a erros |
| **Fix** | Redesign completo: native date picker, time pickers separados (entrada/saida), break input |
| **Arquivos** | `app/manual-entry.tsx`, components de input |

### Sessao: 2025-01 — UX v2.1

#### Melhoria 2: Location Carousel
| Campo | Detalhe |
|-------|---------|
| **Data** | 2025-01 |
| **Sintoma** | Selecao de local era dificil de usar, timer ocupava pouco espaco |
| **Fix** | Location carousel movido acima do form, timer expandido para 57% da tela, layout simplificado |
| **Arquivos** | `app/(tabs)/index.tsx`, layout components |

### Sessao: 2025-02 — Geofence Reliability

#### Fix 1: Geofence Init Enhancement
| Campo | Detalhe |
|-------|---------|
| **Data** | 2025-02 |
| **Sintoma** | Geofence nao disparava eventos de entrada/saida |
| **Causa Raiz** | `notifyOnEnter` e `notifyOnExit` nao estavam setados explicitamente |
| **Fix** | Setar flags explicitamente + debug logging + verification apos start |
| **Arquivos** | Tracking engine, geofence init module |

### Sessao: 2025-02 — Layout Fix

#### Fix 2: Flex Overlap
| Campo | Detalhe |
|-------|---------|
| **Data** | 2025-02 |
| **Sintoma** | Elementos se sobrepunham na tela principal |
| **Causa Raiz** | Proporcoes flex fixas nao acomodavam conteudo variavel |
| **Fix** | Remover flex ratios fixas, usar auto-height |
| **Arquivos** | `app/(tabs)/index.tsx`, layout components |

### Sessao: 2025-02 — Exit Flow Investigation

#### Investigacao 1: 5 Blocos Criticos de Auto-Stop
| Campo | Detalhe |
|-------|---------|
| **Data** | 2025-02 |
| **Sintoma** | Sessoes nao fechavam automaticamente quando worker saia da geofence |
| **Causa Raiz** | 5 pontos de falha identificados: Effects Queue, State Machine, Confidence Score, Background Task, Sync |
| **Fix** | Documentacao completa dos 9 checkpoints do fluxo de saida. Fixes parciais aplicados. |
| **Arquivos** | Tracking engine, effects queue, background task manager |

### Sessao: 2025-02 — GPS Analysis

#### Investigacao 2: Ping-Pong Events
| Campo | Detalhe |
|-------|---------|
| **Data** | 2025-02 |
| **Sintoma** | Eventos de entrada/saida alternavam rapidamente (ping-pong) |
| **Causa Raiz** | GPS accuracy margins + geofence boundary proximity |
| **Fix** | Cooldown de 30 segundos ja implementado, analise documentada |
| **Arquivos** | Tracking engine, state machine |

### Sessao: 2025-02 — Avatar System

#### Feature 1: Profile Photo Upload
| Campo | Detalhe |
|-------|---------|
| **Data** | 2025-02 |
| **Sintoma** | Nenhum sistema de avatar existia |
| **Fix** | Setup completo: bucket `core-avatars` no Supabase, RLS policies, upload UI na settings |
| **Arquivos** | `app/(tabs)/settings.tsx`, Supabase storage config |
