<!--
  @ai-rules
  1. NUNCA delete entradas de "Historico de Erros" — apenas ADICIONE novas com data.
  2. NUNCA delete entradas de "Troubleshooting" — apenas ADICIONE novas linhas.
  3. Ao corrigir um erro de build, SEMPRE adicione ao Historico de Erros com:
     data, sintoma, causa raiz, fix, e arquivos alterados.
  4. Mantenha as secoes na ordem. Nao reorganize.
  5. Este arquivo e a UNICA FONTE DE VERDADE para build e deploy deste app.
-->

# OnSite Architecture — Pipeline & Build Guide

> Stack: Next.js 16.1.6 + React 19 + Recharts + Supabase JS
> Platform: Web (internal architecture dashboard + investor view)
> CI/CD: Vercel (auto-deploy)

---

## 1. Quick Reference

```bash
cd apps/architecture
npm run dev          # localhost:3060
npm run build        # Build producao (roda analyze primeiro)
npm run analyze      # Escaneia monorepo e gera data/*.json
```

---

## 2. Build Commands

### Desenvolvimento Local

```bash
# Na raiz do monorepo
npm install

# Dev server
cd apps/architecture
npm run dev          # http://localhost:3060
```

### Producao

```bash
npm run build        # prebuild (analyze) + next build
npm run start        # next start --port 3060
```

### Quando Rebuildar?

| Mudou o que? | Comando |
|--------------|---------|
| Codigo JS/TS | Hot reload automatico |
| `package.json` (deps) | `npm install` na raiz + restart dev |
| `next.config.ts` | Restart dev server |
| Estrutura do monorepo (apps/packages) | `npm run analyze` + restart |

---

## 3. Configs Criticos

### Prebuild Script (analyze)

Roda automaticamente antes de `dev` e `build`. Executa 5 scanners:
- `scan-apps.ts` — Detecta apps, runtime, deps, ports
- `scan-packages.ts` — Detecta packages, layers, exports
- `scan-docs.ts` — Escaneia .md files, headings, table refs
- `scan-deps.ts` — Gera grafo de dependencias, orphans, hubs
- `scan-migrations.ts` — Parseia SQL migrations, conta DDL statements

Gera 5 JSONs em `data/` que alimentam as API routes.

### Supabase (opcional)

Conecta ao Supabase para dados live (`egl_app_registry`, `egl_data_metrics`, `egl_business_metrics`).
Sem conexao, funciona em **modo estatico** com dados hardcoded.

---

## 4. Packages Usados

| Package | Import | Uso |
|---------|--------|-----|
| `@supabase/supabase-js` | `createClient` | Conexao direta (nao usa @onsite/supabase) |

**Nota:** Este app NAO usa packages `@onsite/*`. Conexao Supabase e direta.

---

## 5. Variaveis de Ambiente

Arquivo: `apps/architecture/.env.local` (NAO commitar)

| Variavel | Descricao | Secret | Obrigatorio |
|----------|-----------|--------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do Supabase | Nao | Nao (funciona em modo static) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key | Nao | Nao (funciona em modo static) |

---

## 6. Estrutura de Arquivos

```
apps/architecture/
├── app/
│   ├── layout.tsx                    # Root layout (JetBrains Mono)
│   ├── api/
│   │   ├── apps/route.ts            # GET apps (Supabase ou static)
│   │   ├── schema/route.ts          # GET tables + policies (live SQL)
│   │   ├── health/route.ts          # GET findings (orphans, RLS, docs)
│   │   ├── metrics/route.ts         # POST update app status (CI)
│   │   ├── packages/route.ts        # GET packages (from data/)
│   │   ├── deps/route.ts            # GET dep graph (from data/)
│   │   ├── docs/route.ts            # GET docs (from data/)
│   │   └── migrations/route.ts      # GET migrations (from data/)
│   └── investor/page.tsx            # Investor dashboard (static)
├── data/                             # Gerado por analyze (gitignored)
│   ├── apps.json
│   ├── packages.json
│   ├── docs.json
│   ├── deps.json
│   └── migrations.json
├── lib/
│   ├── supabase.ts                  # Client + isStaticMode flag
│   ├── queries.ts                   # getApps, getMetrics, getBusinessMetrics
│   ├── types.ts                     # Interfaces + RUNTIME_LABELS
│   └── utils.ts                     # timeAgo, formatNumber, statusConfig
├── scripts/
│   ├── analyze.ts                   # Orchestrator (prebuild)
│   ├── scan-apps.ts
│   ├── scan-packages.ts
│   ├── scan-docs.ts
│   ├── scan-deps.ts
│   └── scan-migrations.ts
├── public/
│   └── logo.png
├── next.config.ts
├── tsconfig.json
└── package.json
```

---

## 7. Pre-Build Checklist

```
[ ] npm install na raiz do monorepo
[ ] Node >= 20
[ ] (Opcional) .env.local com Supabase keys para modo live
```

---

## 8. Deploy Vercel — Passo a Passo

### 8.1 Criar Projeto na Vercel

1. Abrir [vercel.com/new](https://vercel.com/new)
2. Importar repositorio `onsite-eagle`
3. Em **Root Directory**, clicar Edit e selecionar: `apps/architecture`
4. Framework Preset: **Next.js** (auto-detectado)
5. Build Command: deixar default (`turbo build`)
6. Clicar **Deploy**

### 8.2 Environment Variables

Em **Settings > Environment Variables**, adicionar para Production + Preview:

| Variavel | Tipo | Valor |
|----------|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Plain | `https://dbasazrdbtigrdntaehb.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Plain | *(anon key do projeto)* |

> Opcional: sem env vars, funciona em modo static com dados hardcoded.

### 8.3 Custom Domain

1. Settings > Domains > Add Domain
2. Adicionar: `architecture.onsiteclub.ca`
3. No DNS, criar CNAME: `architecture → cname.vercel-dns.com`

### 8.4 Ignored Build Step

Settings > Build & Deployment > Ignored Build Step:
```
npx turbo-ignore
```

### 8.5 Verificacao Pos-Deploy

```
[ ] / carrega (architecture dashboard ou investor page)
[ ] /investor mostra KPIs, Prumo progress, roadmap
[ ] /api/apps retorna lista de apps
[ ] /api/health retorna findings
[ ] Custom domain com HTTPS ativo
```

---

## 9. Troubleshooting

| Sintoma | Causa | Fix |
|---------|-------|-----|
| APIs retornam dados vazios | data/*.json nao gerados | Rodar `npm run analyze` |
| /api/schema retorna static | Sem .env.local ou Supabase desconectado | Adicionar env vars |
| Build falha no prebuild | tsx nao instalado | `npm install` na raiz |
| Investor page sem dados live | Modo static (sem env vars) | Dados placeholder sao exibidos |

---

## 10. Historico de Erros

*(Nenhum erro documentado ainda. Adicionar conforme surgirem.)*
