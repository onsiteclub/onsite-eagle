<!--
  @ai-rules
  1. Este arquivo e um INDICE. Detalhes de build ficam em cada apps/*/PIPELINE.md.
  2. Ao criar novo app, adicionar linha na tabela.
  3. NAO duplicar informacao que ja esta nos PIPELINE.md individuais.
-->

# PIPELINES — Indice de Build & Deploy

> Hub central apontando para o PIPELINE.md de cada app.
> Cada app tem seu proprio guia completo com troubleshooting e historico de erros.

## Apps

| App | Stack | Dir | Build Guide |
|-----|-------|-----|-------------|
| **Monitor** | Next.js 16 / React 19 | `apps/monitor/` | [PIPELINE.md](apps/monitor/PIPELINE.md) |
| **Analytics** | Next.js 16 / React 19 | `apps/analytics/` | [PIPELINE.md](apps/analytics/PIPELINE.md) |
| **Dashboard** | Next.js 16 / React 19 | `apps/dashboard/` | [PIPELINE.md](apps/dashboard/PIPELINE.md) |
| **Auth** | Next.js 16 / React 19 | `apps/auth/` | [PIPELINE.md](apps/auth/PIPELINE.md) |
| **Field** | Expo 52 / React 18 | `apps/field/` | [PIPELINE.md](apps/field/PIPELINE.md) |
| **Inspect** | Expo 52 / React 18 | `apps/inspect/` | [PIPELINE.md](apps/inspect/PIPELINE.md) |
| **Operator** | Expo 52 / React 18 | `apps/operator/` | [PIPELINE.md](apps/operator/PIPELINE.md) |
| **Timekeeper** | Expo 52 / React 18 | `apps/timekeeper/` | [PIPELINE.md](apps/timekeeper/PIPELINE.md) |
| **Calculator** | Vite 5 + Capacitor 6 / React 18 | `apps/calculator/` | [PIPELINE.md](apps/calculator/PIPELINE.md) |

## As 3 Stacks

```
┌──────────────────────────────────────────────────────────────────┐
│                       MONOREPO ROOT                               │
│  Node >=20 | npm 10.0.0 | Turborepo 2.3.0                      │
│                                                                   │
│  ┌──────────────┐  ┌────────────────┐  ┌──────────────────┐     │
│  │   NEXT.JS    │  │  EXPO / RN     │  │ VITE + CAPACITOR │     │
│  │   React 19   │  │  React 18.3.1  │  │ React 18.3.1     │     │
│  │              │  │                │  │                  │     │
│  │  monitor     │  │  field         │  │  calculator      │     │
│  │  analytics   │  │  inspect       │  │                  │     │
│  │  dashboard   │  │  operator      │  │                  │     │
│  │  auth        │  │  timekeeper    │  │                  │     │
│  └──────────────┘  └────────────────┘  └──────────────────┘     │
└──────────────────────────────────────────────────────────────────┘
```

## Docs Compartilhados

| Doc | Conteudo |
|-----|----------|
| [METRO_GUIDE.md](docs/METRO_GUIDE.md) | React 18/19 isolation, watchFolders, blockList — para apps Expo |
| [SUPABASE_GUIDE.md](docs/SUPABASE_GUIDE.md) | Como conectar Supabase em cada tipo de app |
| [PACKAGE_GRAPH.md](docs/PACKAGE_GRAPH.md) | Qual app usa qual package |

## Quick Commands

```bash
# Dev (qualquer app Next.js)
npm run dev:monitor        # porta 3000
npm run dev:analytics      # porta 3001
npm run dev:dashboard      # porta 3002
npm run dev:auth           # porta 3003

# Dev (Expo — rodar de DENTRO do diretorio do app)
cd apps/operator && npx expo start --dev-client --localhost --clear --port 8081
# Terminal 2: adb reverse tcp:8081 tcp:8081

# Build all
npm run build

# Lint all
npm run lint
```

## Regras Criticas

1. **Expo apps**: Rodar comandos de DENTRO do diretorio do app, nunca da raiz
2. **Metro**: Ver [METRO_GUIDE.md](docs/METRO_GUIDE.md) antes de qualquer mudanca
3. **Root devDeps**: NAO remover `metro-cache-key@0.81.0` e `metro-transform-worker@0.81.0`
4. **React split**: Next.js usa 19.x, Expo usa 18.3.1 — `blockList` no metro.config.js isola
5. **Device fisico**: `adb reverse tcp:8081 tcp:8081` obrigatorio para USB
