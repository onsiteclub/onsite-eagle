# OnSite Inspect — Build Pipeline

> **Device:** Samsung SM_G990W (Android) — cabo USB direto
> **Stack:** Expo 52 + React Native 0.76.0 + Expo Router 4
> **Base:** Reconstruido do zero (2026-02-25), padrao Operator v2

---

## Quick Reference

```bash
# PRIMEIRO BUILD (sem android/ local ainda)
cd apps/inspect
npx expo prebuild --clean --platform android
npx expo run:android

# DEV MODE (app ja instalado no device)
# Terminal 1:
cd apps/inspect
npx expo start --dev-client --localhost --clear --port 8082

# Terminal 2:
adb reverse tcp:8082 tcp:8082
```

**Nota:** Inspect usa porta **8082** para nao conflitar com Operator (8081).

---

## Pre-Flight Checklist

Antes de qualquer build, verificar:

```
[ ] 1. Estou em apps/inspect/ (NUNCA rodar Expo da raiz!)
[ ] 2. .env.local existe com chaves reais (nao placeholder)
[ ] 3. assets/ tem 4 PNGs (icon, splash-icon, favicon, adaptive-icon)
[ ] 4. Root devDeps tem metro-cache-key@0.81.0 e metro-transform-worker@0.81.0
[ ] 5. Nao existe android/ fantasma na raiz do monorepo
[ ] 6. Cabo USB conectado, device aparece em `adb devices`
[ ] 7. Nenhum Metro rodando na porta 8082 (matar se tiver)
```

---

## Arquivos Criticos

| Arquivo | Regra | Consequencia se errar |
|---------|-------|----------------------|
| `index.js` | `import "expo-router/entry"` | 404 no bundle, app nao abre |
| `metro.config.js` | blockList + watchFolders especificos | React 19 crash / Metro trava |
| `babel.config.js` | SOMENTE `babel-preset-expo` | Tela branca, rotas nao encontradas |
| `app.json` | `newArchEnabled: false` | Crash nativo ao iniciar |
| `package.json` | `"main": "./index.js"` | Entry point nao encontrado |
| `.env.local` | Chaves reais do Supabase | Queries retornam null |

---

## .env.local (nunca commitar)

```bash
EXPO_PUBLIC_SUPABASE_URL=https://dbasazrdbtigrdntaehb.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<copiar do Operator ou Timekeeper>
EXPO_PUBLIC_MONITOR_API_URL=https://monitor.onsiteclub.ca
```

Copiar a anon key de `apps/operator/.env.local` — mesmo projeto Supabase.

---

## Metro Config — O Que Faz e Por Que

### watchFolders (10 packages)

```javascript
config.watchFolders = [
  'packages/auth',      // AuthProvider, useAuth
  'packages/shared',    // Types: Site, House, HouseStatus
  'packages/timeline',  // fetchMessages, sendMessage
  'packages/media',     // fetchDocuments, uploadFile
  'packages/agenda',    // fetchAgendaEvents
  'packages/camera',    // Photo capture + metadata
  'packages/offline',   // Queue + useOfflineSync
  'packages/sharing',   // QR-based access grants
  'packages/ai',        // AI specialists
  'packages/logger',    // Structured logging
];
```

**NUNCA usar `[monorepoRoot]`** — no Windows, Metro escaneia `.next/`, `.turbo/`, todos os apps, e trava (>5 min sem output).

### blockList (3 isolamentos)

1. **React 18/19** — Root tem React 19 (Next.js), local tem 18.3.1 (Expo)
2. **React-DOM** — Mesmo motivo
3. **React-Native** — Root tem 0.76.9, local tem 0.76.0
4. **Build artifacts** — `.next/`, `dist/`, `build/`, `.turbo/`, `coverage/`

### extraNodeModules

Redireciona `react`, `react-dom`, `react-native` para versoes locais.

### disableHierarchicalLookup

Impede Metro de subir na arvore de diretorios procurando modulos. Essencial no Windows.

---

## Comandos por Cenario

### Primeiro build completo

```bash
cd apps/inspect
npx expo prebuild --clean --platform android
npx expo run:android
```

Tempo: ~5-10 min (Gradle compile)

### Mudanca so em JS/TS

```bash
# Metro ja rodando? Salvar arquivo = hot reload automatico
# Metro nao rodando?
npx expo start --dev-client --localhost --clear --port 8082
```

### Mudanca em package.json (deps novas)

```bash
cd ../..          # raiz do monorepo
npm install       # instala deps
cd apps/inspect
npx expo start --dev-client -c --port 8082
```

### Mudanca em app.json (plugins nativos)

```bash
npx expo prebuild --clean --platform android
npx expo run:android
```

### Mudanca em metro.config.js

```bash
npx expo start --dev-client -c --port 8082
```

### Nuclear option (tudo quebrado)

```bash
cd ../..
rm -rf android/                          # fantasma na raiz (se existir)
rm -rf apps/inspect/android/             # android local
rm -rf apps/inspect/node_modules/
rm -rf node_modules/
npm install
cd apps/inspect
npx expo prebuild --clean --platform android
npx expo run:android
```

---

## Erros Conhecidos (do Ecossistema)

Estes erros ja foram resolvidos no Operator. O Inspect herda as mesmas protecoes.

### 1. Tela branca / rotas nao encontradas

**Causa:** Plugin `transform-inline-environment-variables` no babel.config.js
**Fix:** Manter SOMENTE `babel-preset-expo`. Nenhum plugin extra.
**Prevencao:** ✅ babel.config.js do Inspect ja esta correto.

### 2. Crash nativo ao iniciar (New Architecture)

**Causa:** `newArchEnabled: true` no app.json
**Fix:** `"newArchEnabled": false`
**Prevencao:** ✅ app.json do Inspect ja tem `false`.

### 3. `TypeError: property is not writable` / `ReactCurrentOwner undefined`

**Causa:** React 19 do root misturado no bundle
**Fix:** blockList no metro.config.js isolando React 18/19
**Prevencao:** ✅ metro.config.js do Inspect tem blockList completo.

### 4. Supabase queries retornam null

**Causa:** `.env.local` com placeholder ou ausente
**Fix:** Copiar chaves reais do Operator/Timekeeper
**Prevencao:** Criar `.env.local` ANTES do primeiro build.

### 5. `expo prebuild: File not found: icon.png`

**Causa:** Diretorio `assets/` ausente ou incompleto
**Fix:** Criar 4 PNGs: icon, splash-icon, favicon, adaptive-icon
**Prevencao:** ✅ assets/ preservado do scaffold antigo.

### 6. `ERR_PACKAGE_PATH_NOT_EXPORTED: ./src/utils/getMinifier`

**Causa:** `metro-transform-worker@0.83.3` hoisted pelo expo@54
**Fix:** `npm install metro-transform-worker@0.81.0 --save-dev` na raiz
**Prevencao:** ✅ Root package.json ja tem pin em 0.81.0.

### 7. `metro_cache_key_1.default is not a function`

**Causa:** `metro-cache-key@0.83.3` mudou API
**Fix:** `npm install metro-cache-key@0.81.0 --save-dev` na raiz
**Prevencao:** ✅ Root package.json ja tem pin em 0.81.0.

### 8. `Unable to resolve "@onsite/timeline/data"`

**Causa:** Metro NAO suporta subpath exports
**Fix:** Usar import root: `@onsite/timeline` (sem `/data`)
**Prevencao:** ✅ Todos os imports no Inspect usam root.

### 9. Metro trava (>5 min sem output)

**Causa:** (1) `android/` fantasma na raiz, (2) `watchFolders = [monorepoRoot]`
**Fix:** Deletar android/ da raiz + usar watchFolders especificos
**Prevencao:** ✅ watchFolders lista 10 packages especificos.

### 10. `Compose Compiler 1.5.15 requires Kotlin 1.9.25`

**Causa:** gradle.properties sem kotlinVersion explicito
**Fix:** Adicionar `android.kotlinVersion=1.9.25` em gradle.properties
**Acao:** Verificar apos `expo prebuild`. Se erro, editar gradle.properties.

### 11. Push token nao registra

**Causa:** Typo `Constants.expiConfig` ou API deprecated
**Fix:** Usar `Constants.expoConfig?.extra?.eas?.projectId`
**Prevencao:** ✅ pushRegistration.ts copiado corretamente do Operator.

### 12. `expo prebuild` da raiz contaminou root

**Causa:** Rodou Expo fora do app (criou android/ na raiz)
**Fix:** `rm -rf android/` na raiz + limpar root package.json
**Prevencao:** SEMPRE `cd apps/inspect/` antes de qualquer comando Expo.

---

## Diferencas vs Operator

| Aspecto | Operator | Inspect |
|---------|----------|---------|
| Porta Metro | 8081 | **8082** |
| Navegacao | 3 root tabs | Stack + tabs internos por site |
| Packages | 6 | **10** (+media, +agenda, +ai, +logger) |
| Camera | QR scanner | **Fotos de inspecao + upload** |
| Orientacao | portrait | **default** (landscape em tablet) |
| Splash bg | #1F2937 (dark) | **#F6F7F9** (light/Enterprise v3) |

---

## Fluxo de Build (Step by Step)

### 1. Setup inicial

```bash
# Raiz do monorepo
npm install

# Verificar root devDeps
cat package.json | grep metro
# Deve mostrar: metro-cache-key@0.81.0, metro-transform-worker@0.81.0
```

### 2. Criar .env.local

```bash
cd apps/inspect
cp ../operator/.env.local .env.local
# Adicionar: EXPO_PUBLIC_MONITOR_API_URL=https://monitor.onsiteclub.ca
```

### 3. Prebuild Android

```bash
npx expo prebuild --clean --platform android
```

Se erro de Kotlin: editar `android/gradle.properties`:
```properties
android.kotlinVersion=1.9.25
```

### 4. Build e instalar

```bash
npx expo run:android
```

### 5. Dev mode (apos instalado)

```bash
# Terminal 1
npx expo start --dev-client --localhost --clear --port 8082

# Terminal 2
adb reverse tcp:8082 tcp:8082
```

### 6. Verificar no device

- [ ] App abre sem crash
- [ ] Login funciona
- [ ] Lista de sites carrega
- [ ] Tap em site → 8 tabs aparecem
- [ ] Tap em lote → detail com fases
- [ ] Camera abre e tira foto
- [ ] Voltar funciona em todas as telas

---

## Troubleshooting Rapido

| Sintoma | Primeiro check | Segundo check |
|---------|---------------|---------------|
| App nao abre | `adb logcat -s Expo:*` | Verificar .env.local |
| Tela branca | babel.config.js | index.js existe? |
| Metro trava | `android/` fantasma na raiz? | watchFolders correto? |
| "Network error" | `adb reverse tcp:8082 tcp:8082` | Metro rodando? |
| Crash ao navegar | React 19 no bundle? | blockList no metro? |
| Fotos nao carregam | Bucket `egl-media` existe? | RLS permite SELECT? |
| Login falha | .env.local correto? | Supabase auth habilitado? |

---

*Criado: 2026-02-25 — Baseado no historico de 12 erros do Operator v2*
