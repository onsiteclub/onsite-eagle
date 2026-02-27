<!--
  @ai-rules
  1. NUNCA delete entradas de "Historico de Evolucao" — apenas ADICIONE novas com data.
  2. NUNCA delete entradas de "Decisoes de Arquitetura" — apenas ADICIONE.
  3. Ao fazer mudancas significativas (features, refactors, migracoes),
     SEMPRE adicione uma entrada ao Historico de Evolucao.
  4. Mantenha a tabela Tech Stack atualizada — atualize versoes quando mudarem.
  5. Este arquivo descreve O QUE o app e e COMO evoluiu.
     Para build/deploy, veja PIPELINE.md.
-->

# OnSite Monitor

> Dashboard do supervisor para monitoramento visual de canteiros de obra com AI integrada.

## 1. Identidade

| Campo | Valor |
|-------|-------|
| **Nome** | OnSite Eagle Monitor |
| **Diretorio** | `apps/monitor` |
| **Proposito** | Dashboard central do supervisor. Visualiza sites, acompanha progresso de lotes, valida fotos com AI, gerencia timeline colaborativa, gera relatorios semanais automaticos. E o hub onde todos os dados dos apps de campo convergem. |
| **Audiencia** | Supervisores de construcao |
| **Plataforma** | Web |
| **Porta Dev** | 3000 |
| **URL Producao** | *(nao configurado ainda)* |

## 2. Tech Stack

| Camada | Tecnologia | Versao |
|--------|------------|--------|
| Framework | Next.js | 16.1.6 |
| React | React | 19.2.3 |
| Styling | Tailwind CSS | 4.x (via @tailwindcss/postcss) |
| Canvas | Konva + react-konva | 9.3.18 / 18.2.10 |
| PDF | pdfjs-dist | 4.0.379 |
| Database | Supabase JS | ^2.93.3 |
| AI | OpenAI | ^4.77.0 |
| Icons | lucide-react | ^0.563.0 |
| Dates | date-fns | ^4.1.0 |

## 3. Telas / Rotas

### Paginas

| Rota | Descricao | Auth |
|------|-----------|------|
| `/` | Overview — lista de sites com stats | Sim |
| `/login` | Login (supervisors only, sem signup) | Nao |
| `/settings` | Configuracoes admin | Sim |
| `/site/new` | Criar novo site | Sim |
| `/site/[id]` | Site detail — multi-tab (lotes, schedule, gantt, chat, team, docs, reports) | Sim |
| `/site/[id]/lot/[lotId]` | Lot detail — sidebar com timeline, docs, schedule, materials, team | Sim |
| `/site/[id]/settings` | Configuracoes do site | Sim |
| `/share/site/[id]` | Link publico (read-only) | Nao |

### API Routes (18)

| Rota | Descricao |
|------|-----------|
| `/api/ai-copilot` | Analise AI de fotos → checklist, defeitos, sugestoes |
| `/api/validate-photo` | Validacao de foto contra checklist da fase |
| `/api/timeline/mediate` | AI interpreta mensagem → evento tipado na timeline |
| `/api/chat-ai` | Chat completions para copilot |
| `/api/generate-report` | Gera relatorio semanal narrativo |
| `/api/reports/weekly` | Relatorio semanal agendado |
| `/api/messages` | CRUD de mensagens da timeline |
| `/api/documents` | Lista documentos do lote/site |
| `/api/upload` | Upload de arquivos para Supabase Storage |
| `/api/lots/[id]` | CRUD de lotes (egl_houses) |
| `/api/lots/[id]/issue` | Criar issue (egl_issues) |
| `/api/schedules` | Dados de schedule (egl_schedules) |
| `/api/events` | Eventos externos (weather, permits) |
| `/api/push/send` | Enviar push notification |
| `/api/public/site/[id]` | API publica para links compartilhados |

## 4. Packages Internos

| Package | Proposito |
|---------|-----------|
| `@onsite/ai` | Specialists: mediator (mensagem → evento), eagle (relatorios) |
| `@onsite/agenda` | Calendario de eventos do site |
| `@onsite/media` | Upload e gestao de documentos |
| `@onsite/shared` | Types (Site, House, CopilotRequest, etc.) |
| `@onsite/sharing` | Links publicos de compartilhamento |
| `@onsite/timeline` | Types e constantes da timeline |
| `@onsite/ui` | Calendar, QRCode components |
| `@onsite/auth` | AuthProvider, useAuth |
| `@onsite/auth-ui` | AuthFlow component |

## 5. Fluxo de Dados

### Tabelas Supabase (leitura)

| Tabela | Uso |
|--------|-----|
| `egl_sites` | Sites de construcao |
| `egl_houses` | Lotes com status e progresso |
| `egl_progress` | Fases por lote |
| `egl_photos` | Fotos com validacao AI |
| `egl_timeline` / `egl_messages` | Timeline colaborativa |
| `egl_issues` | Defeitos reportados |
| `egl_documents` | Documentos por lote |
| `egl_schedules` | Cronograma por lote |
| `egl_schedule_phases` | Fases do cronograma |
| `egl_external_events` | Clima, permits, inspecoes |
| `egl_material_requests` | Pedidos de materiais |
| `core_profiles` | Perfis de usuarios |
| `ref_eagle_phases` | 7 fases padrao |
| `ref_eagle_phase_items` | 66 itens de checklist |

### Tabelas Supabase (escrita)

| Tabela | Uso |
|--------|-----|
| `egl_houses` | Criar/editar lotes |
| `egl_timeline` | Postar eventos |
| `egl_photos` | Upload + resultado AI |
| `egl_issues` | Criar issues |
| `egl_progress` | Aprovar fases |
| `egl_documents` | Upload documentos |
| `egl_material_requests` | Criar pedidos de material |

### Storage

| Bucket | Uso |
|--------|-----|
| `egl-media` | Fotos, documentos, plantas |

### Componentes Principals (20+)

| Componente | Funcao |
|-----------|--------|
| `ChatTimeline` | Timeline AI-mediated (mensagens, fotos, emoji, roles) |
| `FrameCheckSheet` | Checklist de 140 itens codificados (Avalon CONTROL) |
| `GanttView` | Gantt chart com Konva (canvas) |
| `ScheduleTab` | Planejamento de cronograma |
| `MaterialRequestsView` | Pipeline de materiais (ordered→delivered→installed) |
| `ManagementSheet` | Vista de gestao (estilo Excel) |
| `VistaSheet` | Pricing por sqft por fase |
| `SiteMap` | Mapa SVG de lotes |
| `PhotoValidator` | Validacao AI de fotos |
| `WeeklyReport` | Exibicao de relatorios gerados |

### Conexao com Outros Apps

```
Field (worker) ──[fotos]──→ egl_photos ──→ Monitor (supervisor valida)
Monitor ──[pedido material]──→ egl_material_requests ──→ Operator (entrega)
Monitor ──[timeline msg]──→ AI mediate → egl_timeline ──→ Field + Operator (veem)
Timekeeper ──[horas]──→ tmk_entries ──→ Monitor (HoursSheet consulta)
```

## 6. Decisoes de Arquitetura

1. **Pre-2026: AI-mediated timeline** — Nao e chat direto. Supervisor escreve mensagem, AI classifica (photo, calendar, note, alert, etc.) e posta como evento tipado. Mantém timeline estruturada.

2. **Pre-2026: Konva para visualizacoes** — GanttView e SiteMap usam canvas (Konva) para renderizacao performante de muitos lotes simultaneamente.

3. **Pre-2026: 140 itens de checklist (Avalon CONTROL)** — FrameCheckSheet implementa os codigos reais usados pelo fundador (RA01-RA23, SF01-SF17, etc.). Isso e o padrao minimo para substituir o Excel.

4. **Pre-2026: Server-side OpenAI** — Todas as chamadas AI sao via API routes Next.js (server-side). Key nunca exposta ao client.

5. **Pre-2026: Multi-tab site detail** — Site page tem tabs: Lots, Schedule, Gantt, Chat, Team, Docs, Reports. Cada tab e um componente pesado.

6. **2026-02-25: AI Mediator fix** — Corrigido fluxo timeline → material_request. Bug: condicao muito restritiva + campo NOT NULL faltando.

## 7. Historico de Evolucao

### Pre-2026 — v1: Eagle Dashboard
- Dashboard de supervisor com sites e lotes
- AI copilot para validacao de fotos
- Timeline AI-mediated
- Visualizacao de sites com Canvas/Konva
- Relatorios semanais automaticos
- FrameCheckSheet com 140 itens Avalon CONTROL
- Material requests pipeline
- Integracao com 9 packages @onsite/*

### 2026-02-25 — AI Mediator Fix
- Corrigido pipeline timeline → material_request no mediator
- Bug 1: condicao `event_type === 'material_request'` muito restritiva
- Bug 2: `material_type` NOT NULL faltando no insert
- Arquivos: `apps/monitor/src/app/api/timeline/mediate/route.ts`, `packages/ai/src/specialists/mediator.ts`
