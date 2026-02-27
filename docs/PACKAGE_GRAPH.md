<!--
  @ai-rules
  1. Manter tabela de dependencias atualizada ao adicionar/remover packages de qualquer app.
  2. Ao criar novo package, adicionar linha na secao "Packages".
  3. Ao mudar deps de um app, atualizar AMBAS as tabelas (por app E por package).
-->

# Package Dependency Graph

> Qual app usa qual package. Atualizado: 2026-02-26.

## Por App

| App | Stack | @onsite/ Packages |
|-----|-------|--------------------|
| **Monitor** | Next.js 16 | auth, auth-ui, ai, agenda, media, shared, sharing, timeline, ui |
| **Analytics** | Next.js 16 | auth, auth-ui, supabase, utils, hooks |
| **Dashboard** | Next.js 16 | auth, auth-ui, supabase, utils |
| **Auth** | Next.js 16 | supabase |
| **Field** | Expo 52 | auth, auth-ui, tokens, shared, timeline, agenda, offline, sharing, camera |
| **Inspect** | Expo 52 | auth, auth-ui, tokens, shared, logger, timeline, media, agenda, camera, offline, sharing, ai |
| **Operator** | Expo 52 | auth, auth-ui, tokens, shared, timeline, camera, offline, sharing |
| **Timekeeper** | Expo 52 | auth-ui, tokens, shared, timeline, agenda, media, offline, ui |
| **Calculator** | Vite+Cap | auth, auth-ui, logger, tokens, utils |

## Por Package

| Package | Usado Por | Total |
|---------|-----------|-------|
| **@onsite/auth** | Monitor, Analytics, Dashboard, Field, Inspect, Operator, Calculator | 7 |
| **@onsite/auth-ui** | Monitor, Analytics, Dashboard, Field, Inspect, Operator, Timekeeper, Calculator | 8 |
| **@onsite/tokens** | Field, Inspect, Operator, Timekeeper, Calculator | 5 |
| **@onsite/shared** | Monitor, Field, Inspect, Operator, Timekeeper | 5 |
| **@onsite/timeline** | Monitor, Field, Inspect, Operator, Timekeeper | 5 |
| **@onsite/agenda** | Monitor, Field, Inspect, Timekeeper | 4 |
| **@onsite/offline** | Field, Inspect, Operator, Timekeeper | 4 |
| **@onsite/camera** | Field, Inspect, Operator | 3 |
| **@onsite/sharing** | Monitor, Field, Inspect, Operator | 4 |
| **@onsite/media** | Monitor, Inspect, Timekeeper | 3 |
| **@onsite/ui** | Monitor, Timekeeper | 2 |
| **@onsite/supabase** | Analytics, Dashboard, Auth | 3 |
| **@onsite/utils** | Analytics, Dashboard, Calculator | 3 |
| **@onsite/ai** | Monitor, Inspect | 2 |
| **@onsite/hooks** | Analytics | 1 |
| **@onsite/logger** | Inspect, Calculator | 2 |
| **@onsite/voice** | *(nenhum app ainda)* | 0 |
| **@onsite/export** | *(nenhum app ainda)* | 0 |

## Grafo Visual

```
                    ┌─────────────────────────────────────────┐
                    │              APPS (9)                    │
                    └─────────────────────────────────────────┘

  Web (Next.js)                    Mobile (Expo)              Hybrid
  ┌─────────┐ ┌─────────┐        ┌─────────┐ ┌─────────┐   ┌──────────┐
  │ Monitor │ │Analytics│        │  Field  │ │ Inspect │   │Calculator│
  │ 9 pkgs  │ │ 5 pkgs  │        │ 9 pkgs  │ │ 12 pkgs │   │ 5 pkgs   │
  └────┬────┘ └────┬────┘        └────┬────┘ └────┬────┘   └────┬─────┘
       │           │                  │           │              │
  ┌────┴───┐  ┌────┴───┐        ┌────┴────┐ ┌───┴──────┐  ┌───┴──┐
  │  Auth  │  │Dashboard│        │Operator │ │Timekeeper│  │      │
  │ 1 pkg  │  │ 4 pkgs  │        │ 8 pkgs  │ │ 8 pkgs   │  │      │
  └────┬───┘  └────┬────┘        └────┬────┘ └────┬─────┘  │      │
       │           │                  │           │         │      │
       └───────────┴──────────────────┴───────────┴─────────┘
                              │
                    ┌─────────┴─────────────────────────────────┐
                    │              PACKAGES (17)                  │
                    ├────────────────────────────────────────────┤
                    │                                            │
                    │  Core:  auth, auth-ui, supabase, shared   │
                    │  UI:    ui, tokens                         │
                    │  Data:  timeline, agenda, media, offline   │
                    │  Tools: utils, hooks, logger, camera       │
                    │  AI:    ai, voice                          │
                    │  Other: sharing, export                    │
                    │                                            │
                    └────────────────────────────────────────────┘
```

## Regras de Uso

| Regra | Detalhe |
|-------|---------|
| **Web apps** usam `@onsite/supabase` | SSR wrappers (client, server, middleware) |
| **Mobile apps** criam cliente direto | `createClient()` com AsyncStorage |
| **Mobile NUNCA importa root de `@onsite/utils`** | Puxa `tailwind-merge` (web-only). Usar `@onsite/utils/format` |
| **`@onsite/shared`** e zero-deps | Seguro para qualquer app/package |
| **`@onsite/tokens`** e zero-deps | Apenas constantes de design |
