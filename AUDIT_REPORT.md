# Auditoria Completa do Monorepo — OnSite Eagle

**Data:** 2026-03-01
**Escopo:** Todas as apps + @onsite/framing + Supabase schema
**Regra:** Somente relatorio. Nenhuma correcao aplicada.

---

## PARTE 1 — Inventario de Telas

### 1.1 Dashboard (`apps/dashboard/`)

#### Framing Hub — `app/(club)/app/framing/page.tsx`
| Elemento | Tipo | Leitura | Escrita |
|----------|------|---------|---------|
| Stats: Sites, Lots, Crews, Assignments, Payments | StatBox | `listJobsites`, `listCrews`, `frm_phase_assignments` (count), `getPaymentSummary` | — |
| Links: Jobsites, Crews, Assignments, Payments | Link cards | — | — |

#### Jobsites — `app/(club)/app/framing/jobsites/page.tsx`
| Elemento | Tipo | Leitura | Escrita |
|----------|------|---------|---------|
| Lista de jobsites | Table | `listJobsites` → `frm_jobsites` | — |
| Botao "New Jobsite" | Modal + Form | — | `createJobsite` → INSERT `frm_jobsites` |
| Botao "Delete" | Confirm | — | `deleteJobsite` → DELETE `frm_jobsites` |
| Link para detalhe | Navigation | — | — |

#### Jobsite Detail — `app/(club)/app/framing/jobsites/[id]/page.tsx`
| Elemento | Tipo | Leitura | Escrita |
|----------|------|---------|---------|
| Info do jobsite | Header | `getJobsite` → `frm_jobsites` | — |
| Lista de lots | Table | `listLotsByJobsite` → `frm_lots` | — |
| Botao "Add Lot" | Modal + Form | — | `createLot` → INSERT `frm_lots` |
| Botao "Delete Lot" | Confirm | — | `deleteLot` → DELETE `frm_lots` |
| Status badge por lot | Badge | `frm_lots.status` | — |

#### Crews — `app/(club)/app/framing/crews/page.tsx`
| Elemento | Tipo | Leitura | Escrita |
|----------|------|---------|---------|
| Lista de crews | Table | `listCrews` → `frm_crews` | — |
| Botao "New Crew" | Modal + Form | — | `createCrew` → INSERT `frm_crews` |
| Membros expandidos | Nested list | `frm_crew_workers` + `core_profiles` | — |
| Botao "Add Worker" | Modal | `core_profiles` (search) | `addCrewWorker` → INSERT `frm_crew_workers` |
| Botao "Remove Worker" | Confirm | — | `removeCrewWorker` → DELETE `frm_crew_workers` |

#### Assignments — `app/(club)/app/framing/assignments/page.tsx`
| Elemento | Tipo | Leitura | Escrita |
|----------|------|---------|---------|
| Lista de assignments | Table | `listAssignments` → `frm_phase_assignments` + joins | — |
| Filtros: Jobsite, Phase, Crew | Dropdowns | `listJobsites`, `FRAMING_PHASES`, `listCrews` | — |
| Botao "New Assignment" | Modal + Form | lots, phases, crews | `createAssignment` → INSERT `frm_phase_assignments` |
| Botao "Delete" | Confirm | — | `deleteAssignment` → DELETE `frm_phase_assignments` |

#### Payments — `app/(club)/app/framing/payments/page.tsx` + `PaymentsClient.tsx`
| Elemento | Tipo | Leitura | Escrita |
|----------|------|---------|---------|
| Stats: Unpaid, Pending, Approved, Paid, Holdback | 5 StatCards | `getPaymentSummary`, `getHoldbackSummary` | — |
| Lista de payments | Table | `listPaymentsByJobsite` → `frm_phase_payments` + joins | — |
| Filtros: Jobsite, Phase, Crew, Status, Holdback | Dropdowns | Dados do server | — |
| Colunas: Lot, Phase, Crew, SqFt, Rate, Total, Deductions, Extras, Final, Payable, Holdback, Status | Table cols | `frm_phase_payments.*` | — |
| Botao "Create Payment" | Modal + Form | lots, phases, crews | `createPayment` → INSERT `frm_phase_payments` |
| Botao "Approve" | Modal (deductions/extras/notes) | — | `approvePayment` → UPDATE status='approved' |
| Botao "Mark Paid" | Confirm | — | `markPaymentPaid` → UPDATE status='paid' |
| Botao "Release Holdback" | Modal (notes) | `holdbackEligibleLots` | `releaseHoldback` → UPDATE holdback_status='released' |
| Botao "Reassign Holdback" | Modal (crew + reason) | `crews` | `reassignHoldback` → UPDATE holdback_status='reassigned' |
| Botao "Delete" | Confirm | — | `deletePayment` → DELETE `frm_phase_payments` |

---

### 1.2 Monitor (`apps/monitor/`)

#### Home — `src/app/page.tsx`
| Elemento | Tipo | Leitura | Escrita |
|----------|------|---------|---------|
| Lista de sites | Cards | `frm_jobsites` (ou `egl_sites` legacy) | — |
| Botao "New Site" | Link | — | — |
| Site cards: nome, endereco, progresso | Card | `frm_jobsites.*` | — |

#### New Site — `src/app/site/new/page.tsx`
| Elemento | Tipo | Leitura | Escrita |
|----------|------|---------|---------|
| Form: nome, endereco, SVG upload | Form | — | INSERT `frm_jobsites` |

#### Site Detail — `src/app/site/[id]/page.tsx`
| Elemento | Tipo | Leitura | Escrita |
|----------|------|---------|---------|
| Mapa SVG interativo | SiteMap component | `frm_lots` (coordinates, status) | — |
| Lot drawer (ao clicar no lote) | LotDrawer | `frm_lots`, `frm_house_items`, `frm_phase_assignments` | — |
| Add Lot modal | AddLotModal | — | INSERT `frm_lots` |
| Spreadsheet tabs (7) | Sheet components | Ver abaixo | — |
| Gantt chart | GanttView | `frm_schedules`, `frm_schedule_phases` | — |

##### Spreadsheet Tabs (Monitor Site Detail)
| Tab | Component | Tabelas lidas |
|-----|-----------|---------------|
| Management | `ManagementSheet` | `frm_lots`, `frm_schedules`, `frm_schedule_phases`, `ref_eagle_phases` |
| Frame-Check | `FrameCheckSheet` | `frm_lots`, `frm_progress` |
| Framers | `FramersSheet` | `frm_lots`, `frm_phase_assignments`, `ref_eagle_phases`, `core_profiles` |
| Steel Posts | `SteelPostsSheet` | `frm_lots`, `frm_material_tracking` |
| Vista | `VistaSheet` | `frm_lots`, `frm_phase_assignments`, `ref_eagle_phases`, `core_profiles`, `frm_phase_payments`, `frm_schedules` |
| Progress | `ProgressSheet` | `frm_lots`, `frm_schedules`, `frm_schedule_phases`, `ref_eagle_phases` |
| Hours | `HoursSheet` | `tmk_geofences`, `tmk_entries`, `core_profiles` |

#### Lot Detail — `src/app/site/[id]/lot/[lotId]/page.tsx`
| Elemento | Tipo | Leitura | Escrita |
|----------|------|---------|---------|
| Sidebar: Timeline, Items, Gate Checks, Safety, Documents, Schedule, Materials, Team | 8 tabs | Ver abaixo | — |
| Lot status bar | LotStatusBar | `frm_lots.status`, `frm_lots.current_phase` | UPDATE `frm_lots.status` |
| AI Copilot suggestions | AISuggestionPanel | `useAICopilot` hook | — |

| Sidebar Tab | Component | Tabelas | Acoes |
|-------------|-----------|---------|-------|
| Timeline | `ChatTimeline` | `frm_timeline_events` | INSERT eventos |
| Items | `HouseItemsList` + `HouseItemForm` + `HouseItemResolve` | `frm_house_items` | CREATE, UPDATE, RESOLVE |
| Gate Checks | `GateCheckView` | `frm_gate_checks`, `frm_gate_check_items` | START, PASS/FAIL items, COMPLETE |
| Safety | `SafetyTab` + `SafetyPanel` | `frm_safety_checks` | CREATE, RESOLVE |
| Documents | Inline | `frm_documents` | UPLOAD, DELETE |
| Schedule | `ScheduleTab` | `frm_schedules`, `frm_schedule_phases` | VIEW |
| Materials | `MaterialRequestsView` + `CreateMaterialRequestModal` | `frm_material_requests` | CREATE, UPDATE status |
| Team | Inline | `frm_phase_assignments`, `core_profiles` | ADD/REMOVE |

#### Builder Portal — `src/app/builder/[token]/page.tsx`
| Elemento | Tipo | Leitura | Escrita |
|----------|------|---------|---------|
| Token validation | Server | `frm_builder_tokens` (via API route) | — |
| Lot grid com status | Read-only cards | `frm_lots`, `frm_phase_assignments`, `frm_house_items` | — |
| Timeline por lote | Read-only list | `frm_timeline_events` (public only) | — |
| Gate check results | Read-only badges | `frm_gate_checks` | — |

#### Settings — `src/app/site/[id]/settings/page.tsx`
| Elemento | Tipo | Leitura | Escrita |
|----------|------|---------|---------|
| Builder token management | Form | `frm_builder_tokens` | CREATE, REVOKE tokens |
| Warning composer | WarningComposer | — | INSERT `frm_warnings` |

---

### 1.3 Field (`apps/field/`) — Worker Mobile App

| Tela | Arquivo | Funcao |
|------|---------|--------|
| Login | `app/(auth)/login.tsx` | Auth via `@onsite/auth` |
| Home (Sites) | `app/(tabs)/index.tsx` | Lista de lotes atribuidos ao worker via `frm_crew_workers` → `frm_phase_assignments` → `frm_lots` |
| Tasks | `app/(tabs)/tasks.tsx` | Fila de tarefas pendentes (assignments com status) |
| Schedule | `app/(tabs)/schedule.tsx` | Agenda do worker |
| Materials | `app/(tabs)/materials.tsx` | Pedidos de material do worker |
| Agenda | `app/(tabs)/agenda.tsx` | Eventos do site |
| Config | `app/(tabs)/config.tsx` | Configuracoes do app |
| Scanner | `app/scanner.tsx` | QR code scanner |
| Camera | `app/camera.tsx` | Captura de fotos |
| Lot Detail | `app/lot/[id]/index.tsx` | Detalhe do lote (fases, progresso, issues) |
| Lot Timeline | `app/lot/[id]/timeline.tsx` | Timeline de eventos do lote |
| Lot Notes | `app/lot/[id]/notes.tsx` | Notas por lote |
| Lot Documents | `app/lot/[id]/documents.tsx` | Documentos por lote |

**Queries Field:** `frm_crew_workers`, `frm_phase_assignments`, `frm_lots`, `frm_jobsites`, `frm_house_items`, `frm_timeline_events`, `frm_documents`, `frm_material_requests`
**Writes Field:** INSERT `frm_house_items` (reportar defeitos), INSERT `frm_timeline_events` (notas), INSERT `frm_material_requests`, UPDATE `frm_phase_assignments` (start/complete task)

---

### 1.4 Inspect (`apps/inspect/`) — Inspector Mobile App

| Tela | Arquivo | Funcao |
|------|---------|--------|
| Login | `app/(auth)/login.tsx` | Auth via `@onsite/auth` |
| Home | `app/(app)/index.tsx` | Grid de lotes do site, feature cards (Agenda, Team, Timeline, Documents) |
| Site Detail | `app/(app)/site/[id].tsx` | Detalhe do site |
| Lot Detail | `app/(app)/lot/[lotId].tsx` | Timeline + items do lote |
| Gate Check Start | `app/(app)/gate-check/[lotId].tsx` | Seleciona transicao (4 opcoes), inicia gate check |
| Gate Check Checklist | `app/(app)/gate-check/checklist.tsx` | Lista de itens do gate check, pass/fail cada |
| Gate Check Summary | `app/(app)/gate-check/summary.tsx` | Resumo com resultado final (passed/failed) |
| Agenda | `app/(app)/agenda.tsx` | Eventos do site |
| Team | `app/(app)/team.tsx` | Workers do site |
| Site Timeline | `app/(app)/site-timeline.tsx` | Timeline do site |
| Documents | `app/(app)/documents.tsx` | Documentos do site |
| Camera | `app/(app)/camera.tsx` | Captura de fotos |
| Settings | `app/(app)/settings.tsx` | Configuracoes |

**Queries Inspect:** `frm_jobsites`, `frm_lots`, `frm_gate_checks`, `frm_gate_check_items`, `frm_house_items`, `frm_timeline_events`, `frm_documents`
**Writes Inspect:** INSERT/UPDATE `frm_gate_checks`, UPDATE `frm_gate_check_items` (pass/fail), INSERT `frm_house_items` (defeitos)

**Transicoes gate check implementadas:** `framing_to_roofing` (16 itens), `roofing_to_trades` (5), `trades_to_backframe` (7), `backframe_to_final` (20)

---

### 1.5 Operator (`apps/operator/`) — Logistics Mobile App

| Tela | Arquivo | Funcao |
|------|---------|--------|
| Login | `app/(auth)/login.tsx` | Auth via `@onsite/auth` |
| Pedidos (Queue) | `app/(tabs)/index.tsx` | Toggle Material/Equipment, cards com urgencia, acoes inline |
| Report | `app/(tabs)/report.tsx` | Reportar problemas |
| Config | `app/(tabs)/config.tsx` | Configuracoes |
| Scanner | `app/scanner.tsx` | QR code scanner |
| Photo | `app/photo.tsx` | Captura de foto (prova de entrega) |
| Delivery Detail | `app/deliver/[id].tsx` | Confirmar entrega de material |
| Request Detail | `app/requests/[id].tsx` | Detalhe de pedido |
| Request List | `app/requests/index.tsx` | Lista completa de requests |

**Queries Operator:** `frm_material_requests` (via `getOperatorQueue`), `frm_equipment_requests` (via `getEquipmentQueue`)
**Writes Operator:** UPDATE `frm_material_requests.status` (acknowledge → in_transit → delivered), UPDATE `frm_equipment_requests` (accept, complete)
**Realtime:** Subscription em `frm_material_requests` + `frm_equipment_requests` para updates ao vivo

---

### 1.6 Resumo de Telas

| App | Telas | Read tables | Write tables |
|-----|-------|-------------|--------------|
| Dashboard | 6 paginas | 8 tabelas frm_* | 6 tabelas frm_* |
| Monitor | 6 paginas + 7 sheets + 8 sidebar tabs | 15+ tabelas frm_* + tmk_* | 8 tabelas frm_* |
| Field | 13 telas | 8 tabelas frm_* | 4 tabelas frm_* |
| Inspect | 13 telas | 6 tabelas frm_* | 3 tabelas frm_* |
| Operator | 9 telas | 2 tabelas frm_* | 2 tabelas frm_* |
| **TOTAL** | **47 telas** | — | — |

---

## PARTE 2 — Regras de Negocio (20 verificacoes)

### Legenda
- ✅ Implementada e funcional
- ⚠️ Parcialmente implementada
- ❌ Nao implementada

| # | Regra | Status | Evidencia |
|---|-------|--------|-----------|
| 1 | **Assignment e POR FASE por lote** | ✅ | `packages/framing/src/queries/assignments.ts:54-70` — INSERT em `frm_phase_assignments` com `lot_id` + `phase_id` + `crew_id` |
| 2 | **Phases sao ~10 (sub-fases reais)** | ✅ | `packages/framing/src/constants/phases.ts` — FRAMING_PHASES define: capping, floor_1, walls_1, floor_2, walls_2, roof, backframe_basement, backframe_strapping, backframe_backing |
| 3 | **Gate check failed items viram house items** | ❌ | `packages/framing/src/queries/gate-checks.ts:162-200` — `completeGateCheck()` so atualiza status para 'passed'/'failed'. NAO cria house items dos itens reprovados. `apps/monitor/src/components/GateCheckView.tsx:105-119` — componente tambem nao converte |
| 4 | **Gate check passed auto-avanca fase do lote** | ❌ | `packages/framing/src/queries/gate-checks.ts` — nenhuma funcao avanca o `frm_lots.current_phase` apos gate check. Avanco e 100% manual |
| 5 | **Assignment auto-cria payment** | ❌ | `packages/framing/src/queries/assignments.ts:54-70` — `createAssignment()` so faz INSERT na tabela de assignments. Comentario na `payments.ts:117` diz "Typically auto-created" mas NAO esta implementado. Sem trigger SQL |
| 6 | **Valores sao por sqft por fase** | ✅ | `packages/framing/src/types/payment.ts:12-13` — `sqft: number`, `rate_per_sqft: number`. `total` e GENERATED = `sqft * rate_per_sqft` |
| 7 | **Holdback 10% em todas as fases** | ✅ | Migration `add_holdback_to_phase_payments` — `holdback_pct DEFAULT 10.00`, `holdback_amount` GENERATED, `payable_now` GENERATED. `packages/framing/src/types/payment.ts:24-31` |
| 8 | **Foreman decide sozinho holdback** | ✅ | `packages/framing/src/queries/payments.ts:254-275` — `releaseHoldback()` aceita qualquer `releasedBy` UUID sem checagem de role. Sem aprovacao admin |
| 9 | **Gate check backframe_to_final libera holdbacks** | ✅ | `apps/dashboard/app/(club)/app/framing/payments/page.tsx:71-77` — query `frm_gate_checks` WHERE `transition='backframe_to_final'` AND `status='passed'`. Set `holdbackEligibleLots` passado ao client |
| 10 | **canAdvancePhase checa blocking items** | ✅ | `packages/framing/src/helpers/phase-flow.ts:44-46` — `countBlockingItems(supabase, lotId, currentPhaseId)` |
| 11 | **canAdvancePhase checa gate check** | ✅ | `packages/framing/src/helpers/phase-flow.ts:50-66` — busca latest gate check para a transicao requerida, exige `status='passed'` |
| 12 | **canAdvancePhase checa safety violations** | ❌ | `packages/framing/src/helpers/phase-flow.ts:36-72` — `canAdvancePhase()` so checa blocking items + gate check. NAO checa `frm_safety_checks` nao resolvidos |
| 13 | **Cert expiry auto-gera warning** | ❌ | `packages/framing/src/queries/certifications.ts:26-46` — `listExpiringCertifications()` e read-only. Nenhuma funcao auto-cria warning quando cert expira |
| 14 | **Safety check bloqueante cria house item** | ❌ | `packages/framing/src/queries/safety.ts:47-78` — `createSafetyCheck()` define `blocking: true` mas NAO cria `frm_house_items` correspondente. Sistemas independentes |
| 15 | **Warning dismissal tem audit trail** | ⚠️ | `packages/framing/src/queries/warnings.ts:109-129` — `resolveWarning()` registra `resolved_by`, `resolved_at`, `resolved_proof` IN-PLACE. Sem tabela de audit separada |
| 16 | **Lot status state machine** | ❌ | `packages/framing/src/queries/lots.ts:157-173` — `updateLotStatus()` aceita QUALQUER `LotStatus` sem validar transicao. Nao ha machine: pending pode ir direto para completed |
| 17 | **Material request pipeline completo** | ✅ | Operator app tem flow: `requested` → `acknowledged` → `in_transit` → `delivered`. Cards com urgencia, inline actions, realtime subscription |
| 18 | **Equipment request pipeline completo** | ✅ | Operator app tab Equipment: `requested` → `accepted` → `scheduled` → `in_progress` → `completed`/`cancelled`. `packages/framing/src/queries/equipment.ts` |
| 19 | **Builder portal e read-only** | ✅ | `apps/monitor/src/app/builder/[token]/page.tsx` — token-based access, nenhuma acao de escrita. API route usa `SUPABASE_SERVICE_ROLE_KEY` para bypass RLS |
| 20 | **Checklist de inspecao tem 48 itens** | ✅ | `packages/framing/src/constants/gate-checks.ts` — 4 transicoes: framing_to_roofing (16), roofing_to_trades (5), trades_to_backframe (7), backframe_to_final (20) = **48 itens total** |

### Resumo Regras de Negocio

| Status | Qtd | Regras |
|--------|-----|--------|
| ✅ Implementada | 12 | #1, #2, #6, #7, #8, #9, #10, #11, #17, #18, #19, #20 |
| ⚠️ Parcial | 1 | #15 |
| ❌ Nao implementada | 7 | #3, #4, #5, #12, #13, #14, #16 |

---

## PARTE 3 — Tabelas sem UI

### 3.1 Tabelas completamente mortas (zero queries, zero UI)

| Tabela | Tipo definido em | Status |
|--------|------------------|--------|
| `frm_trade_pauses` | `packages/framing/src/types/operations.ts:3-12` | **MORTA** — Type `FrmTradePause` exportado mas nunca importado. Sem queries. Sem UI |
| `frm_third_party_entries` | `packages/framing/src/types/operations.ts:14-25` | **MORTA** — Type `FrmThirdPartyEntry` exportado mas nunca importado. Sem queries. Sem UI |
| `frm_return_visits` | `packages/framing/src/types/operations.ts:29-44` | **MORTA** — Types `FrmReturnVisit` + `ReturnVisitStatus` exportados mas nunca importados. Sem queries. Sem UI |

### 3.2 Tabelas com queries mas sem UI dedicada

| Tabela | Queries | UI |
|--------|---------|-----|
| `frm_certifications` | `packages/framing/src/queries/certifications.ts` — listByCrew, listExpiring, verify, create | **Nenhuma UI** — funcoes existem mas nenhum app as chama |
| `frm_safety_checks` | `packages/framing/src/queries/safety.ts` — create, resolve, list, count | **UI no Monitor** via `SafetyTab.tsx` + `SafetyPanel.tsx` |
| `frm_warnings` | `packages/framing/src/queries/warnings.ts` — create, resolve, dismiss, list | **UI no Monitor** via `WarningComposer.tsx` |

### 3.3 Types mortos em `carried-over.ts`

23 de 24 types em `packages/framing/src/types/carried-over.ts` nunca sao importados:

| Type | Usado? |
|------|--------|
| `FrmPhoto`, `PhotoType`, `ValidationStatus` | ❌ |
| `FrmTimelineEvent`, `TimelineEventType` | ❌ |
| `FrmProgress`, `ProgressStatus` | ❌ |
| `FrmDocument`, `FrmDocumentBatch`, `FrmDocumentLink` | ❌ |
| `FrmMessage` | ❌ |
| `FrmSchedule`, `FrmSchedulePhase` | ❌ |
| `FrmExternalEvent` | ❌ |
| `FrmScan` | ❌ |
| `FrmSiteWorker` | ❌ |
| `FrmOperatorAssignment` | ❌ |
| `FrmAiReport` | ❌ |
| `FrmAssignment`, `AssignmentStatus` | ❌ |
| `FrmMaterialTracking`, `MaterialTrackingStatus` | ❌ |
| **`FrmPhaseAssignment`** | **✅ Unico ativo** — importado em `assignments.ts:2` |

### 3.4 Export morto no index.ts

```
packages/framing/src/index.ts:12 → export * from './types/operations'  // MORTO
packages/framing/src/index.ts:13 → export * from './types/carried-over' // 23/24 types mortos
```

---

## PARTE 4 — Simulacao por Persona

### 4.1 Foreman (Monitor app)

**Fluxo:** Login → Sites → Site Detail → Lot Detail

| Passo | Tela | Funciona? | Gaps |
|-------|------|-----------|------|
| 1. Ver sites | Home | ✅ | — |
| 2. Criar site | New Site | ✅ | — |
| 3. Adicionar lotes | Site Detail → AddLotModal | ✅ | — |
| 4. Ver mapa SVG | SiteMap | ✅ | — |
| 5. Clicar num lote | LotDrawer → Lot Detail | ✅ | — |
| 6. Ver timeline | ChatTimeline | ✅ | — |
| 7. Reportar defeito | HouseItemForm | ✅ | — |
| 8. Resolver defeito | HouseItemResolve | ✅ | Requer foto de prova |
| 9. Iniciar gate check | GateCheckView | ✅ | — |
| 10. Passar/falhar itens | GateCheckView | ✅ | — |
| 11. Completar gate check | GateCheckView | ⚠️ | **Itens falhos NAO viram house items automaticamente** |
| 12. Avancar fase do lote | LotStatusBar | ⚠️ | **Nao ha botao "Advance Phase". Status muda manualmente sem validacao** |
| 13. Criar warning | WarningComposer | ✅ | — |
| 14. Ver safety checks | SafetyTab | ✅ | — |
| 15. Criar safety check | SafetyTab | ✅ | — |
| 16. Resolver safety check | SafetyTab | ✅ | Requer foto de prova |
| 17. Gerenciar materiais | MaterialRequestsView | ✅ | — |
| 18. Upload documentos | Documents tab | ✅ | — |
| 19. Ver planilhas | Sheet tabs (7) | ✅ | — |
| 20. Gerar builder token | Settings | ✅ | — |

**Gaps Foreman:**
- Gate check falho nao auto-cria house items (manual)
- Nao ha botao "Advance Phase" que chama `canAdvancePhase()` antes de mudar
- Lot status pode ser mudado para qualquer estado sem validacao

---

### 4.2 Crew Lead (Field app)

**Fluxo:** Login → Home (assigned lots) → Lot Detail

| Passo | Tela | Funciona? | Gaps |
|-------|------|-----------|------|
| 1. Login | Auth screen | ✅ | — |
| 2. Ver lotes atribuidos | Home (Sites tab) | ✅ | Via `frm_crew_workers` → `frm_phase_assignments` |
| 3. Ver tarefa ativa | Current Task card | ✅ | — |
| 4. Navegar para lote | Lot Detail | ✅ | — |
| 5. Ver fases do lote | Lot Detail | ✅ | — |
| 6. Reportar defeito | House Items | ✅ | — |
| 7. Ver timeline | Lot Timeline | ✅ | — |
| 8. Pedir material | Materials tab | ✅ | — |
| 9. Ver documentos | Documents tab | ✅ | — |
| 10. Start/Complete tarefa | Task actions | ✅ | — |
| 11. Ver schedule | Schedule tab | ✅ | — |
| 12. Tirar foto | Camera | ✅ | — |
| 13. Ver agenda | Agenda tab | ✅ | — |

**Gaps Crew Lead:**
- Nao ve pagamentos (precisa pedir ao foreman)
- Nao ve holdback status da sua crew
- Nao pode contestar defeitos (house items nao tem "contest" action)

---

### 4.3 Worker (Field app — mesmo que Crew Lead)

Mesmo fluxo do Crew Lead. Acesso baseado em `frm_crew_workers.worker_id`.

---

### 4.4 Operator (Operator app)

**Fluxo:** Login → Queue → Delivery

| Passo | Tela | Funciona? | Gaps |
|-------|------|-----------|------|
| 1. Login | Auth screen | ✅ | — |
| 2. Ver fila de materiais | Pedidos tab (Materials) | ✅ | Cards com urgencia, sorted |
| 3. Acknowledge pedido | Inline "Acknowledge" | ✅ | — |
| 4. Marcar em transito | Inline "In Transit" | ✅ | — |
| 5. Entregar material | Deliver detail | ✅ | Com foto de prova |
| 6. Ver fila de equipamentos | Pedidos tab (Equipment) | ✅ | — |
| 7. Aceitar pedido equipamento | Inline "Accept" | ✅ | — |
| 8. Completar equipamento | Inline "Complete" | ✅ | — |
| 9. Reportar problema | Report tab | ✅ | — |
| 10. Config | Config tab | ✅ | — |
| 11. Realtime updates | Subscription | ✅ | Via Supabase realtime |

**Gaps Operator:** Nenhum gap significativo. Fluxo completo.

---

### 4.5 Inspector (Inspect app)

**Fluxo:** Login → Home → Lot → Gate Check

| Passo | Tela | Funciona? | Gaps |
|-------|------|-----------|------|
| 1. Login | Auth screen | ✅ | — |
| 2. Ver site | Home | ✅ | Feature cards + lot grid |
| 3. Selecionar lote | Lot Detail | ✅ | — |
| 4. Iniciar gate check | Gate Check [lotId] | ✅ | 4 transicoes disponiveis |
| 5. Selecionar transicao | Gate Check [lotId] | ✅ | — |
| 6. Preencher checklist | Checklist screen | ✅ | Pass/fail cada item |
| 7. Ver resultado | Summary screen | ✅ | Passed/failed com contagem |
| 8. Reportar defeito | House Items | ✅ | — |
| 9. Ver documentos | Documents | ✅ | — |
| 10. Ver agenda | Agenda | ✅ | — |
| 11. Ver equipe | Team | ✅ | — |
| 12. Ver timeline | Site Timeline | ✅ | — |

**Gaps Inspector:**
- Itens falhos no gate check NAO viram house items automaticamente
- Nao ha flow para "re-inspect" (repetir gate check apos correcoes)

---

### 4.6 Builder (Builder Portal — Monitor app)

**Fluxo:** Acessa via token URL → Ve progresso read-only

| Passo | Tela | Funciona? | Gaps |
|-------|------|-----------|------|
| 1. Acessar com token | Builder [token] | ✅ | Validacao de token |
| 2. Ver grid de lotes | Builder page | ✅ | Status badges, progresso |
| 3. Ver timeline publica | Builder page | ✅ | Eventos filtrados |
| 4. Ver gate check results | Builder page | ✅ | Badges passed/failed |
| 5. Download documentos | Builder page | ⚠️ | Depende de `is_public` flag nos documentos |

**Gaps Builder:**
- Portal 100% read-only (correto por design)
- Nao ha notificacoes push para builder quando gate check completa

---

## PARTE 5 — Codigo Morto e Referencias Legacy

### 5.1 Referencias `egl_` no codigo ativo

| Status | Detalhe |
|--------|---------|
| **0 referencias em codigo de producao** | Todas as queries usam `frm_*` corretamente |
| **Encontradas em:** | Documentacao (CLAUDE.md, README), migrations historicas, SCHEMA_REGISTRY.md |

### 5.2 Arquivos mortos / exports mortos

| Arquivo | Problema | Impacto |
|---------|----------|---------|
| `packages/framing/src/types/operations.ts` | 3 types + 1 enum nunca importados | Export morto no index.ts |
| `packages/framing/src/types/carried-over.ts` | 23/24 types nunca importados | Peso morto no bundle. So `FrmPhaseAssignment` e usado |
| `packages/framing/src/index.ts:12` | `export * from './types/operations'` | Export inteiro e morto |

### 5.3 Tabelas SQL sem queries

| Tabela | Existe em migration | Tem query | Tem UI |
|--------|--------------------:|-----------|--------|
| `frm_trade_pauses` | ✅ | ❌ | ❌ |
| `frm_third_party_entries` | ✅ | ❌ | ❌ |
| `frm_return_visits` | ✅ | ❌ | ❌ |

### 5.4 Monitor sheets — Status de migracao

| Sheet | Tabelas usadas | egl_ refs? |
|-------|----------------|------------|
| ManagementSheet | `frm_lots`, `frm_schedules`, `frm_schedule_phases`, `ref_eagle_phases` | ❌ Limpo |
| FrameCheckSheet | `frm_lots`, `frm_progress` | ❌ Limpo |
| FramersSheet | `frm_lots`, `frm_phase_assignments`, `ref_eagle_phases`, `core_profiles` | ❌ Limpo |
| SteelPostsSheet | `frm_lots`, `frm_material_tracking` | ❌ Limpo |
| VistaSheet | `frm_lots`, `frm_phase_assignments`, `ref_eagle_phases`, `core_profiles`, `frm_phase_payments`, `frm_schedules` | ❌ Limpo |
| ProgressSheet | `frm_lots`, `frm_schedules`, `frm_schedule_phases`, `ref_eagle_phases` | ❌ Limpo |
| HoursSheet | `tmk_geofences`, `tmk_entries`, `core_profiles` | ❌ Limpo |

**Todos os 7 sheets migrados com sucesso de `egl_` para `frm_`.**

---

## Proximas Acoes (Priorizadas)

### Criticas (Gaps que afetam fluxo de trabalho real)

| # | Acao | Regra | Impacto |
|---|------|-------|---------|
| C1 | **Gate check falho → auto-criar house items** | #3 | Inspector marca item como failed mas foreman precisa re-criar manualmente como house item. Perda de dados e retrabalho |
| C2 | **Assignment → auto-criar payment** | #5 | Cada assignment manual precisa de um payment manual separado. Duplicacao de trabalho do admin |
| C3 | **Lot status state machine** | #16 | Qualquer status pode transitar para qualquer outro. Lote pode ir de "pending" direto para "completed" sem passar pelas fases |

### Importantes (Melhoram integridade mas nao bloqueiam uso)

| # | Acao | Regra | Impacto |
|---|------|-------|---------|
| I1 | **canAdvancePhase checar safety checks** | #12 | Fase pode avancar mesmo com safety check bloqueante nao resolvido |
| I2 | **Gate check passed → auto-avancar fase** | #4 | Apos gate check passar, foreman precisa manualmente mudar status do lote |
| I3 | **Cert expiry → auto-warning** | #13 | Certs expiradas nao geram alerta. Funcao de query existe mas sem cron/trigger |
| I4 | **Safety check → auto-criar house item** | #14 | Safety check bloqueante nao aparece como blocking item no canAdvancePhase |

### Desejaveis (Cleanup tecnico)

| # | Acao | Impacto |
|---|------|---------|
| D1 | Remover `types/operations.ts` (3 types mortos) + limpar export do index.ts | Reduce bundle weight |
| D2 | Limpar `types/carried-over.ts` (23 types mortos) — manter so `FrmPhaseAssignment` | Reduce confusion |
| D3 | Decidir destino das 3 tabelas mortas (`frm_trade_pauses`, `frm_third_party_entries`, `frm_return_visits`) | DROP ou implementar queries+UI |
| D4 | Criar UI para `frm_certifications` (queries existem, UI nao) | Feature de compliance |
| D5 | Warning audit trail em tabela separada (hoje e in-place) | Melhor auditabilidade |

---

*Fim do relatorio. Nenhuma correcao foi aplicada.*
