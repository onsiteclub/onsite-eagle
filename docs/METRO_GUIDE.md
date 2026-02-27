<!--
  @ai-rules
  1. NUNCA remova secoes deste guia sem confirmar que TODOS os 4 Expo apps foram atualizados.
  2. Ao descobrir novo erro de Metro, adicione na secao "Erros Conhecidos".
  3. Este guia e a referencia canonica para metro.config.js de apps Expo neste monorepo.
-->

# Metro Guide — React 18/19 Isolation

> Como configurar Metro em apps Expo que vivem num monorepo com apps Next.js (React 19).

## O Problema

O monorepo tem apps Expo (React 18.3.1) e apps Next.js (React 19.x). Sem isolamento, Metro resolve `react` do `node_modules` raiz (React 19), causando crashes como:

- `recentlyCreatedOwnerStacks is not a function`
- `ReactCurrentOwner is not defined`
- `Cannot read properties of undefined (reading 'ReactCurrentOwner')`
- `react-native` version mismatch (root 0.76.9 vs local 0.76.0)

## Config Padrao (Copiar para Novos Apps)

```javascript
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// ── 1. watchFolders: APENAS packages usados ──
// NUNCA usar [monorepoRoot] — trava no Windows escaneando .next/.turbo/etc.
config.watchFolders = [
  path.resolve(monorepoRoot, 'packages', 'shared'),
  path.resolve(monorepoRoot, 'packages', 'auth'),
  path.resolve(monorepoRoot, 'packages', 'auth-ui'),
  path.resolve(monorepoRoot, 'packages', 'tokens'),
  path.resolve(monorepoRoot, 'packages', 'timeline'),
  // ... adicionar apenas packages que o app REALMENTE usa
];

// ── 2. nodeModulesPaths ──
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = true;

// ── 3. blockList: Bloquear React 19 + RN do root ──
const rootReact = path.resolve(monorepoRoot, 'node_modules', 'react')
  .replace(/[\\]/g, '\\\\');
const rootReactDom = path.resolve(monorepoRoot, 'node_modules', 'react-dom')
  .replace(/[\\]/g, '\\\\');
const rootRN = path.resolve(monorepoRoot, 'node_modules', 'react-native')
  .replace(/[\\]/g, '\\\\');

config.resolver.blockList = [
  new RegExp(`${rootReact}[\\\\/].*`),
  new RegExp(`${rootReactDom}[\\\\/].*`),
  new RegExp(`${rootRN}[\\\\/].*`),
  /.*[\\/]apps[\\/].*[\\/]\.next[\\/].*/,
  /.*[\\/]apps[\\/].*[\\/]dist[\\/].*/,
  /.*[\\/]apps[\\/].*[\\/]build[\\/].*/,
  /.*[\\/]\.turbo[\\/].*/,
  /.*[\\/]coverage[\\/].*/,
];

// ── 4. extraNodeModules: Forcar versoes locais ──
config.resolver.extraNodeModules = {
  react: path.resolve(projectRoot, 'node_modules/react'),
  'react-dom': path.resolve(projectRoot, 'node_modules/react-dom'),
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
};

module.exports = config;
```

## Por Que Cada Parte Importa

| Secao | O Que Faz | Sem Ela |
|-------|-----------|---------|
| **watchFolders** | Metro ve arquivos dos packages | `Unable to resolve module '@onsite/...'` |
| **nodeModulesPaths** | Resolve deps de packages via root | `Unable to resolve module 'react'` dentro de packages |
| **disableHierarchicalLookup** | Evita lookup ambiguo no monorepo | Pode achar React 19 do root |
| **blockList (react/react-dom)** | Impede React 19 de entrar no bundle | `recentlyCreatedOwnerStacks` crash |
| **blockList (react-native)** | Impede RN 0.76.9 do root | Version mismatch warnings/crashes |
| **blockList (.next/.turbo)** | Ignora builds de outros apps | Metro trava escaneando milhares de arquivos |
| **extraNodeModules** | Redireciona imports para versao local | Mesmo com blockList, deps transitivas podem errar |

## Estado Atual dos Apps

| App | watchFolders | React Isolation | RN Isolation | Conforme? |
|-----|-------------|-----------------|--------------|-----------|
| Field | Especificos (9 pkgs) | Sim | Sim | Sim |
| Inspect | Especificos (12 pkgs) | Sim | Sim | Sim |
| Operator | Especificos (8 pkgs) | Sim | Sim | Sim |
| Timekeeper | `[monorepoRoot]` | **NAO** | Sim | **NAO** |

**Timekeeper** precisa ser atualizado para seguir o padrao. Funciona hoje porque React 18 esta instalado localmente e Metro o encontra antes do root, mas e fragil.

## watchFolders por App

Cada app deve listar APENAS os packages que importa (ver `docs/PACKAGE_GRAPH.md`):

| App | watchFolders |
|-----|-------------|
| **Field** | auth, auth-ui, tokens, shared, timeline, agenda, offline, sharing, camera |
| **Inspect** | auth, auth-ui, tokens, shared, logger, timeline, media, agenda, camera, offline, sharing, ai |
| **Operator** | auth, auth-ui, tokens, shared, timeline, camera, offline, sharing |
| **Timekeeper** | auth-ui, tokens, shared, timeline, agenda, media, offline, ui |

## Erros Conhecidos

| Sintoma | Causa | Fix |
|---------|-------|-----|
| `recentlyCreatedOwnerStacks` | React 19 no bundle | Adicionar `blockList` para root react |
| `ReactCurrentOwner` undefined | React 19 no bundle | Adicionar `blockList` para root react |
| `Unable to resolve '@onsite/...'` | Package nao esta em watchFolders | Adicionar ao watchFolders |
| Metro trava por minutos no start | watchFolders = monorepoRoot no Windows | Listar packages especificos |
| `ERR_PACKAGE_PATH_NOT_EXPORTED` | metro-*@0.83.3 hoisted do @onsite/camera | Root devDeps: `metro-cache-key@0.81.0` + `metro-transform-worker@0.81.0` |
| `metro_cache_key_1.default is not a function` | Mesmo acima | Mesmo fix |
| 404 no bundle (network request failed) | Falta `index.js` no root do app | Criar `index.js` com `import "expo-router/entry"` |
| Metro resolve subpath export errado | Metro nao suporta `exports` map | Usar import raiz: `@onsite/timeline` nao `@onsite/timeline/data` |

## NAO Fazer

| Anti-Pattern | Por Que |
|--------------|---------|
| `watchFolders = [monorepoRoot]` | Trava no Windows escaneando .next, .turbo, node_modules de outros apps |
| `resolveRequest` para isolamento | `context` pode ser frozen/read-only em Metro recente; deps transitivas bypassam |
| Adicionar plugins ao babel.config.js | Apenas `babel-preset-expo`. `transform-inline-environment-variables` quebra Expo Router |
| `subpath exports` em imports | Metro nao suporta. Usar root import do package |
