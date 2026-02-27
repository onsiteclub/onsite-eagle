<!--
  @ai-rules
  1. NUNCA delete entradas de "Historico de Erros" — apenas ADICIONE novas com data.
  2. NUNCA delete entradas de "Troubleshooting" — apenas ADICIONE novas linhas.
  3. Ao corrigir um erro de build, SEMPRE adicione ao Historico de Erros com:
     data, sintoma, causa raiz, fix, e arquivos alterados.
  4. Mantenha as secoes na ordem. Nao reorganize.
  5. Este arquivo e a UNICA FONTE DE VERDADE para build e deploy deste app.
-->

# OnSite Monitor — Pipeline & Build Guide

> Stack: Next.js 16.1.6 + React 19.2.3 + Tailwind CSS 4 + Konva
> AI: OpenAI 4.77.0 (photo validation, reports, mediation)
> CI/CD: Nenhum configurado (deploy manual Vercel)

---

## 1. Quick Reference

```bash
cd apps/monitor
npm run dev          # localhost:3000
npm run build        # Build producao
npm run lint         # ESLint
```

---

## 2. Build Commands

### Desenvolvimento Local

```bash
# Na raiz do monorepo
npm install

# Dev server
cd apps/monitor
npm run dev          # http://localhost:3000
```

### Producao

```bash
npm run build        # next build
npm run start        # next start
```

### Deploy (Vercel — manual)

Nao tem `vercel.json`. Deploy via Vercel dashboard ou CLI:
```bash
vercel --prod
```

### Quando rebuildar?

| Mudou o que? | Comando |
|--------------|---------|
| Codigo JS/TS | Hot reload automatico |
| `package.json` (deps) | `npm install` na raiz + restart dev |
| `next.config.ts` | Restart dev server |
| Packages `@onsite/*` | Restart dev server |

---

## 3. Configs Criticos

### next.config.ts

```typescript
transpilePackages: ['@onsite/shared', '@onsite/ui', '@onsite/auth', '@onsite/auth-ui']
```

**Por que transpile:** Packages sao TypeScript puro, Next.js precisa compilar.

### Tailwind CSS 4

Usa `@tailwindcss/postcss` (v4, nao v3). Config via PostCSS, nao `tailwind.config.js`.

---

## 4. Packages Usados

| Package | Uso |
|---------|-----|
| `@onsite/ai` | Specialists: mediator (timeline), eagle (reports) |
| `@onsite/agenda` | Calendario de eventos do site |
| `@onsite/media` | Upload e gestao de documentos |
| `@onsite/shared` | Types (Site, House, CopilotRequest) |
| `@onsite/sharing` | Links publicos de compartilhamento |
| `@onsite/timeline` | Timeline types e constantes |
| `@onsite/ui` | Calendar, QRCode components |
| `@onsite/auth` | AuthProvider, useAuth |
| `@onsite/auth-ui` | AuthFlow component |

---

## 5. Variaveis de Ambiente

Arquivo: `apps/monitor/.env.local` (NAO commitar)

| Variavel | Descricao | Secret |
|----------|-----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do Supabase | Nao |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key | Nao |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (server-side only) | **Sim** |
| `OPENAI_API_KEY` | OpenAI API key | **Sim** |

---

## 6. Estrutura de Arquivos

```
apps/monitor/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Overview — lista de sites
│   │   ├── login/page.tsx              # Login (supervisors only)
│   │   ├── settings/page.tsx           # Admin settings
│   │   ├── site/new/page.tsx           # Criar novo site
│   │   ├── site/[id]/
│   │   │   ├── page.tsx                # Site detail (multi-tab)
│   │   │   ├── lot/[lotId]/page.tsx    # Lot detail + sidebar
│   │   │   └── settings/page.tsx       # Site settings
│   │   ├── share/site/[id]/page.tsx    # Link publico
│   │   └── api/                        # 18 API routes
│   │       ├── ai-copilot/route.ts
│   │       ├── validate-photo/route.ts
│   │       ├── timeline/mediate/route.ts
│   │       ├── generate-report/route.ts
│   │       ├── reports/weekly/route.ts
│   │       ├── chat-ai/route.ts
│   │       ├── messages/route.ts
│   │       ├── documents/route.ts
│   │       ├── upload/route.ts
│   │       ├── lots/[id]/route.ts
│   │       ├── lots/[id]/issue/route.ts
│   │       ├── schedules/route.ts
│   │       ├── events/route.ts
│   │       ├── push/send/route.ts
│   │       └── public/...
│   ├── components/                      # 20+ componentes
│   │   ├── ChatTimeline.tsx             # Timeline AI-mediated
│   │   ├── FrameCheckSheet.tsx          # 140 itens de inspecao
│   │   ├── GanttView.tsx                # Gantt com Konva
│   │   ├── ScheduleTab.tsx              # Planning
│   │   ├── MaterialRequestsView.tsx     # Pipeline de materiais
│   │   ├── ManagementSheet.tsx          # Gestao (estilo Excel)
│   │   ├── VistaSheet.tsx               # Pricing por sqft
│   │   ├── SiteMap.tsx                  # Mapa SVG de lotes
│   │   └── ...
│   ├── hooks/
│   │   └── useAICopilot.ts             # Orquestracao AI
│   ├── lib/
│   │   └── supabase.ts                 # Client Supabase
│   └── types/
├── next.config.ts
├── tsconfig.json
├── postcss.config.mjs
└── package.json
```

---

## 7. Pre-Build Checklist

```
[ ] npm install na raiz do monorepo
[ ] .env.local com 4 chaves (Supabase URL, Anon, Service Role, OpenAI)
[ ] Node >= 20
```

---

## 8. Troubleshooting

| Sintoma | Causa | Fix |
|---------|-------|-----|
| Pagina branca | Package @onsite/* nao compilado | Verificar `transpilePackages` no next.config.ts |
| API retorna 500 | OPENAI_API_KEY faltando | Setar em .env.local |
| Supabase queries vazias | Service role key errada | Verificar SUPABASE_SERVICE_ROLE_KEY |
| Konva nao renderiza | SSR tentando renderizar canvas | Verificar `dynamic import` com `ssr: false` |

---

## 9. Historico de Erros

*(Nenhum erro documentado ainda. Adicionar conforme surgirem.)*
