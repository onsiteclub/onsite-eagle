# REFACTOR V2 — Reestruturacao do Ecossistema OnSite Eagle

> **Criado por:** Cerbero | **Data:** 2026-02-19
> **Baseado em:** Raio-X completo do ecossistema + decisoes arquiteturais da sessao 12
> **Escopo:** Reestruturacao de apps + absorcao Field + nova UX Timekeeper
> **Referencia visual:** Screenshots do Timekeeper v1 (telas Home + Jobsites)
> **IMPORTANTE:** Repo de producao separado em `c:\Dev\Onsite-club\onsite-timekeeper\`
> O monorepo `onsite-eagle` tem uma versao DESATUALIZADA do Timekeeper.
> A versao de producao e a fonte de verdade para UI/UX.

---

## 0. DECISOES ARQUITETURAIS CONFIRMADAS

| # | Decisao | Status |
|---|---------|--------|
| 1 | Auth app mantem como app (recebe webhooks/callbacks) | ✅ Confirmado |
| 2 | UI package: montar estrutura, ultima prioridade | ✅ Confirmado |
| 3 | Field app: **DELETAR**, absorver como tab "Sites" no Timekeeper | ✅ Confirmado |
| 4 | Inspect app: manter separado (Expo), compartilhar packages | ✅ Confirmado |
| 5 | Dashboard: hub web unificado para versoes web dos apps | ✅ Confirmado |
| 6 | Timekeeper: 7 tabs → 4 tabs + hamburger menu | ✅ Confirmado |
| 7 | Settings: sai das tabs, vai para hamburger no header | ✅ Confirmado |
| 8 | Timekeeper-web: congelado, funcionalidades migram para Dashboard | ✅ Confirmado |

---

## 1. TIMEKEEPER — REESTRUTURACAO COMPLETA

### 1.0 REFERENCIA VISUAL: Repo de Producao

```
c:\Dev\Onsite-club\onsite-timekeeper\   ← PRODUCAO (referencia UX/UI APENAS)
  - 4 tabs: Home, Jobsites, Crew, Settings
  - FloatingMicButton (FAB draggable)
  - VoiceCommandSheet (chat AI)
  - Layout: cronometro + calendario na Home
  - Layout: mapa 75% + panel 25% no Jobsites
  - RadiusSlider (200m, 300m, 500m, 800m)

c:\Dev\Onsite-club\onsite-eagle\apps\timekeeper\   ← MONOREPO (base real)
  - Arquitetura propria (SDK, packages @onsite/*, stores)
  - Sistema totalmente diferente por baixo
  - Manter toda a infraestrutura/logica do eagle
  - Apenas RECRIAR as telas para parecer com producao
```

**ESTRATEGIA:** Usar producao como referencia de UX/UI.
Recriar as telas DENTRO do eagle com a arquitetura existente.
NAO copiar codigo — as bases sao incompativeis (Jenga).

### 1.1 De → Para (Tabs)

**Producao JA tem 4 tabs:**
```
PRODUCAO (onsite-timekeeper)         EAGLE (onsite-eagle) — OBJETIVO
────────────────────────────         ──────────────────────────────────
Home (cronometro + calendario)  →    Home (manter igual)
Jobsites (mapa + geofences)    →    Jobsites (manter igual)
Crew (QR + workers linkados)   →    Crew (manter igual)
Settings (accordion tab)       →    ☰ Hamburger Menu (mover)
                                →    Sites (NEW - absorve Field app)
```

**A unica mudanca real e:**
1. Settings tab → Hamburger menu
2. Adicionar tab Sites (absorve Field)

### 1.2 Layout Final

```
┌────────────────────────────────────────────┐
│  [☰]     OnSite Timekeeper       [avatar]  │  ← Header com hamburger
├────────────────────────────────────────────┤
│                                            │
│            CONTEUDO DA TAB                 │
│                                            │
│                                            │
│                                     [🎤]   │  ← FAB microfone (voice)
├────────────────────────────────────────────┤
│  🏠 Home  │ 🏗 Jobsites │ 👥 Crew │ 📋 Sites │  ← 4 tabs
└────────────────────────────────────────────┘
```

### 1.3 Tab: HOME (calendario + cronometro)

**Merge de:** Home (antigo) + Reports (antigo)

```
┌────────────────────────────────────────────┐
│                                            │
│          ┌─ tim4 ─┐                        │  ← Geofence badge ativo
│          00:00:00                           │  ← Cronometro grande
│         [▶ START]                           │  ← Botao principal
│                                            │
├────────────────────────────────────────────┤
│   ◄    February 2026    ►                  │
│   Monthly Total: 16h 25min                 │
│                                            │
│   S  M  T  W  T  F  S                     │
│   1  2  3  4  5  6  7                      │
│   -  -  -  -  -  -  -                      │
│   8  9  10 11 12 13 14                     │
│   -  -  5h2 8h -  -  -                     │
│   15 [16] 17 18 19 20 21                   │
│   13m 3h10 -  -  -  -  -                   │
│   22 23 24 25 26 27 28                     │
│                                            │
│  [📅 Select Dates to Export]        [🎤]   │
└────────────────────────────────────────────┘
```

**Funcionalidades:**
- Cronometro com START/STOP/PAUSE (existente)
- Badge de geofence ativo (existente)
- Calendario mensal com horas por dia (vem do Reports)
- Total mensal (vem do Reports)
- Export de datas selecionadas (vem do Reports)
- FAB de microfone (voice)
- Tap em dia → modal com detalhe (day-detail.tsx)

**Arquivos afetados:**
- `app/(tabs)/index.tsx` — Merge do conteudo de reports.tsx
- `app/(tabs)/reports.tsx` — **DELETAR**
- `src/screens/home/hooks.ts` — Adicionar logica do calendario
- `src/screens/home/styles/` — Merge styles

### 1.4 Tab: JOBSITES (mapa + geofences)

**Renomeia:** Map → Jobsites

```
┌────────────────────────────────────────────┐
│  [🔍 100 New Orchard Ave N, Ottawa...]     │  ← Search bar
│                                            │
│              [MAPA]                         │
│          Geofence circles                  │  ← Circulos de geofence
│          Pulsing blue dot                  │  ← GPS atual
│                                   [◎]      │  ← My location button
│                                            │
├────────────────────────────────────────────┤
│  tim4                                      │  ← Nome do local
│  [200m] 300m  500m  800m                   │  ← Raio selector
│                                            │
│  [🗑 Delete Jobsite]                [🎤]   │
└────────────────────────────────────────────┘
```

**Funcionalidades:** Identicas ao Map atual. Apenas renomeia.

**Arquivos afetados:**
- `app/(tabs)/map.tsx` — Renomear titulo para "Jobsites"
- `app/(tabs)/_layout.tsx` — Mudar label e icone da tab

### 1.5 Tab: CREW (QR + workers)

**Renomeia:** Team → Crew

**Funcionalidades:** Identicas ao Team atual. Apenas renomeia.

**Arquivos afetados:**
- `app/(tabs)/team.tsx` — Renomear titulo para "Crew"
- `app/(tabs)/_layout.tsx` — Mudar label

### 1.6 Tab: SITES (NEW — absorve Field app)

```
┌────────────────────────────────────────────┐
│  My Sites                                  │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │ 🏠 Lot 12 — Maple Ridge              │  │
│  │    Phase 3: Framing                   │  │
│  │    ████████░░ 60%                     │  │
│  │    Last update: 2h ago                │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │ 🏠 Lot 15 — Maple Ridge              │  │
│  │    Phase 1: Foundation                │  │
│  │    ██░░░░░░░░ 15%                     │  │
│  │    Last update: 1d ago                │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │ 🏠 Lot 8 — Cedar Park                │  │
│  │    Phase 5: Electrical                │  │
│  │    ██████████ 100% ✓                  │  │
│  └──────────────────────────────────────┘  │
│                                     [🎤]   │
└────────────────────────────────────────────┘
```

**Tap em Lot → Abre detalhe:**

```
┌────────────────────────────────────────────┐
│  [←] Lot 012 — Fairbank 3 D               │
│  2275 sqft | Framing: $8,190              │
├────────────────────────────────────────────┤
│                                            │
│  FASES & WORKERS (dados Avalon reais)      │
│  ──────────────────────────────────────    │
│  CAP: Cristony | FRAME: Carlos             │
│  ROOF: Carlos  | BKN: Gabriel              │
│                                            │
│  ┌ backfill        ✅                  ┐   │
│  │ frame start     ✅                  │   │
│  │ Roof Ply        ✅  Apr 27          │   │
│  │ backing         ✅  Apr 21          │   │
│  │ framecheck      ✅  May 2           │   │
│  │ wire            🔄  in progress     │   │
│  │ city framing    ⬜  pending         │   │
│  └─────────────────────────────────────┘   │
│                                            │
│  TIMELINE (compartilhada com Monitor)      │
│  ──────────────────────────────────────    │
│                                            │
│  📷 Supervisor: "Framing complete north    │
│     wall" [photo attached]                 │
│  📦 System: "Steel post 109" delivered"    │
│  ✅ System: "MW06: Sheathing nailed 6"     │
│     on edges - PASSED"                     │
│                                            │
├────────────────────────────────────────────┤
│  ACTION BAR (bottom)                       │
│  [📷] [📦] [✅] [📄] [❓]                 │
│  Foto Material Check Plans Question        │
└────────────────────────────────────────────┘
```

**Action Bar do Lot Detail:**

| Botao | Acao | Destino |
|-------|------|---------|
| 📷 Foto | Abre camera, foto vai pra timeline | Camera → upload → egl_photos + timeline event |
| 📦 Material | Tracking de material (ordered/delivered/installed/welded) | Modal → egl_material_tracking (pipeline) |
| ✅ Checklist | Checklist codificado da fase (RA/SF/MW/ST/MF/OS/GA — 140 itens) | Modal → ref_eagle_phase_items + egl_progress |
| 📄 Plantas | Download dos planos/red lines/RSO/trusses | Modal → egl_documents (filtro por doc_type) |
| ❓ Dúvida | Envia mensagem/pergunta | Input → egl_messages (tipo: question) |

**Checklist expande para a fase atual (ex: Main Floor Wall):**

```
┌────────────────────────────────────────────┐
│  [←] Checklist: Main Floor Wall            │
│  12/19 items passed                        │
├────────────────────────────────────────────┤
│  ☑ MW01  Warped studs                      │
│  ☑ MW02  Walls plumb (1/4 per 4')         │
│  ☑ MW03  Top plates lapped at corners      │
│  ☐ MW07  Sheathing no gaps or holes        │
│  ☐ MW08  Tall-wall double stud blocking    │
│  ☑ MW09  Top of windows as per plan        │
│  ☑ MW10  Windows/doors square and plumb    │
│  ...                                        │
│  [📷 Photo Evidence]  [✅ Submit Review]    │
└────────────────────────────────────────────┘
```

**Novos arquivos necessarios:**
- `app/(tabs)/sites.tsx` — Nova tab
- `app/site/[id].tsx` — Detalhe do lot (stack modal)
- `src/screens/sites/SitesList.tsx` — Lista de lotes linkados
- `src/screens/sites/LotDetail.tsx` — Detalhe com timeline + action bar
- `src/screens/sites/ActionBar.tsx` — Barra de acoes (foto, material, etc.)
- `src/screens/sites/PhotoCapture.tsx` — Camera wrapper
- `src/screens/sites/MaterialRequestForm.tsx` — Form de pedido
- `src/screens/sites/PhaseChecklist.tsx` — Checklist da fase
- `src/screens/sites/PlansViewer.tsx` — Viewer de plantas

**Packages necessarios:**
- `@onsite/timeline` — fetchMessages, sendMessage, subscribe
- `@onsite/camera` — uploadPhoto, buildPhotoMetadata
- `@onsite/media` — fetchDocuments, fetchPlans
- `@onsite/shared` — types (House, MaterialRequest, PhaseItem)

**Dados (Supabase) — atualizado com modelo Avalon:**
- Worker vê lotes via: `egl_phase_assignments` WHERE worker_id = auth.uid() (ver 7.1)
- Ou via org membership: `core_org_memberships` → `egl_sites` → `egl_houses`
- Fases/workers: `egl_phase_assignments` WHERE house_id = lot.id (com role: captain/worker/helper)
- Sub-fases: `egl_schedule_phases` JOIN `ref_eagle_phases` (20+ fases reais, ver 12.3)
- Timeline: `egl_messages` WHERE house_id = lot.id
- Fotos: `egl_photos` WHERE house_id = lot.id
- Materials: `egl_material_tracking` WHERE house_id = lot.id (pipeline: ordered→delivered→installed→welded)
- Checklist: `ref_eagle_phase_items` (140 itens codificados RA/SF/MW/ST/MF/OS/GA) + `egl_progress`
- Documentos: `egl_documents` WHERE house_id = lot.id (plan, red_lines, RSO, trusses, etc.)
- Financeiro: `egl_phase_rates` JOIN sqft → valor por fase por lote

### 1.7 Hamburger Menu (substitui Settings tab)

```
┌────────────────────────────────────────────┐
│  ☰ Menu                            [✕]    │
├────────────────────────────────────────────┤
│                                            │
│  👤 John Smith                             │
│     john@email.com                         │
│     Carpenter — 5 years                    │
│                                            │
│  ─────────────────────────────────────     │
│                                            │
│  ⚙️  Settings                              │
│      Auto-start, timeouts, notifications   │
│                                            │
│  📊  Export Data                            │
│      PDF, CSV export                       │
│                                            │
│  🔔  Notifications                          │
│      Sound, vibration, alerts              │
│                                            │
│  ℹ️  About                                  │
│      Version, legal, privacy               │
│                                            │
│  ─────────────────────────────────────     │
│                                            │
│  🚪  Sign Out                               │
│                                            │
└────────────────────────────────────────────┘
```

**Novos arquivos:**
- `src/components/HamburgerMenu.tsx` — Drawer lateral (ref: Calculator HamburgerMenu)
- `src/components/Header.tsx` — Header com hamburger + avatar

**Conteudo migrado de:**
- `app/(tabs)/settings.tsx` — Accordion sections → itens do menu
- `src/stores/settingsStore.ts` — Continua existindo, acesso via menu

### 1.8 Arquivos a DELETAR

| Arquivo | Razao |
|---------|-------|
| `app/(tabs)/reports.tsx` | Merged no Home |
| `app/(tabs)/timeline.tsx` | Agora e per-lot |
| `app/(tabs)/plans.tsx` | Dentro do lot detail |
| `app/(tabs)/settings.tsx` | Vai para hamburger |
| `app/(tabs)/lots.tsx` | Deprecated (nunca usado) |

### 1.9 Tabs Layout Final (_layout.tsx)

```typescript
// app/(tabs)/_layout.tsx — v2.0

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: true,           // ATIVA header
      header: () => <Header />,    // Header customizado com hamburger
      tabBarActiveTintColor: colors.tabActive,   // Amber
      tabBarInactiveTintColor: colors.tabInactive,
    }}>
      <Tabs.Screen name="index" options={{
        title: 'Home',
        tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
      }} />
      <Tabs.Screen name="map" options={{
        title: 'Jobsites',
        tabBarIcon: ({ color, size }) => <Ionicons name="business" size={size} color={color} />,
      }} />
      <Tabs.Screen name="team" options={{
        title: 'Crew',
        tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
      }} />
      <Tabs.Screen name="sites" options={{
        title: 'Sites',
        tabBarIcon: ({ color, size }) => <Ionicons name="construct" size={size} color={color} />,
      }} />
    </Tabs>
  );
}
```

---

## 2. FIELD APP — ABSORCAO

### 2.1 Status Atual

O `apps/field` e um skeleton com:
- Home (lista de sites)
- Scan (QR)
- Camera
- Lot detail (docs, notes)

**Tudo isso sera absorvido pela tab "Sites" do Timekeeper.**

### 2.2 Plano de Absorcao

| Feature do Field | Destino no Timekeeper |
|------------------|----------------------|
| Lista de sites/lots | Tab "Sites" → SitesList.tsx |
| QR scan (lot) | Fluxo de linking (scan QR do Monitor) |
| Camera + upload | Action bar → 📷 Foto |
| Lot documents | Action bar → 📄 Plantas |
| Lot notes | Timeline (mensagens tipo "question") |

### 2.3 Acao

1. **NAO deletar `apps/field` ainda** — manter como referencia
2. Implementar tab "Sites" no Timekeeper
3. Testar todas funcionalidades
4. Quando 100% funcional → deletar `apps/field`

---

## 3. DASHBOARD — HUB WEB UNIFICADO

### 3.1 Estrutura Atual

```
apps/dashboard/
├── app/(dashboard)/account/page.tsx          ← Perfil
├── app/(dashboard)/account/calculator/page.tsx ← Calculator settings
├── app/(dashboard)/account/shop/page.tsx     ← Loja
└── components/ (AuthModal, Header, Sidebar)
```

### 3.2 Expansao Planejada

```
apps/dashboard/
├── app/(dashboard)/
│   ├── account/                    ← Perfil + billing (existente)
│   ├── timekeeper/                 ← NEW: Timekeeper Web
│   │   ├── page.tsx               ← Dashboard de horas
│   │   ├── team/page.tsx          ← Equipe + QR
│   │   └── reports/page.tsx       ← Relatorios + export
│   ├── calculator/page.tsx        ← Calculator settings (existente)
│   ├── shop/page.tsx              ← Loja (existente)
│   └── sites/                     ← NEW: Sites/Field Web (futuro)
│       ├── page.tsx               ← Meus lotes
│       └── [id]/page.tsx          ← Detalhe do lote (timeline, fotos)
```

### 3.3 ~~Migracao do Timekeeper-Web~~ (REMOVIDO)

`apps/timekeeper-web` foi **deletado do monorepo** em 2026-02-25.
Web build do Timekeeper agora e via `expo export --platform web`.

---

## 4. INSPECT APP — PLANO

### 4.1 Por que separado?

| Monitor (Web) | Inspect (Mobile) |
|----------------|-----------------|
| Next.js 16 | Expo 52 |
| Desktop/browser | Tablet/smartphone |
| Supervisor no escritorio | Inspetor no campo |
| Online always | **Offline-capable** |
| Web camera | **Camera nativa** |
| Sem GPS | **GPS ativo** |

### 4.2 Funcionalidades Planejadas

```
Inspect App (Expo 52)
├── Home — Lista de sites/lotes atribuidos
├── Lot Detail — Progresso por fase
│   ├── Fotos por fase (galeria)
│   ├── Aprovar/Rejeitar fase
│   ├── Notas de inspecao
│   └── Timeline (compartilhada com Monitor + Timekeeper)
├── Camera — Foto com metadata (GPS, device, timestamp)
├── Checklist — Validacao de itens por fase
└── Scan — QR code do lote
```

### 4.3 Packages Compartilhados

```
Monitor + Inspect compartilham:
├── @onsite/shared      (tipos, queries)
├── @onsite/timeline    (mesma timeline)
├── @onsite/agenda      (mesmo calendario)
├── @onsite/media       (mesmos documentos)
├── @onsite/camera      (upload de fotos)
├── @onsite/ai          (validacao AI de fotos)
├── @onsite/auth        (mesmo auth)
└── @onsite/offline     (queue para campo sem Wi-Fi)
```

### 4.4 Prioridade

**BAIXA** — Foco atual e Timekeeper + Monitor. Inspect sera desenvolvido depois.

---

## 5. PROBLEMAS CRITICOS A RESOLVER

### 5.1 Supabase JS Version (P0)

```
INCONSISTENTE:
  @onsite/supabase: 2.49.2
  @onsite/auth: 2.93.3
  apps/timekeeper: 2.49.2
  apps/monitor: 2.93.3
  apps/field: 2.93.3

ACAO: Padronizar para 2.93.3 em todo o monorepo
RISCO: Baixo — minor version bump, backward compatible
```

### 5.2 date-fns Version (P0)

```
INCONSISTENTE:
  apps/analytics: 3.3.1
  apps/dashboard: 3.6.0
  apps/monitor: 4.1.0
  apps/timekeeper: 4.1.0

ACAO: Padronizar para 4.x em todo o monorepo
RISCO: Medio — date-fns 4.x tem breaking changes vs 3.x
```

### 5.3 Operator Metro Config (P1)

```
PROBLEMA: Falta React 18/19 isolation (blockList + extraNodeModules)
RISCO: Runtime crash ao importar React 19 do root node_modules

ACAO: Copiar padrao do Timekeeper metro.config.js
```

### 5.4 Operator Babel Config (P1)

```
PROBLEMA: transform-inline-environment-variables roda antes de babel-preset-expo
RISCO: EXPO_ROUTER_APP_ROOT vira undefined, quebrando route discovery

ACAO: Remover plugin, usar apenas babel-preset-expo
```

### 5.5 Timeline/Agenda Data Stubs (P2)

```
PROBLEMA: fetchMessages(), fetchAgendaEvents() retornam arrays vazios
IMPACTO: Monitor e Operator dependem disso

ACAO: Implementar queries Supabase reais em:
  - packages/timeline/src/data.ts
  - packages/agenda/src/data.ts
```

### 5.6 Field/Inspect Schema Mismatch (P3)

```
PROBLEMA: Usam nomes de tabela antigos (app_eagle_* em vez de egl_*)
IMPACTO: Queries falham com tabelas renomeadas

ACAO: Field sera deletado (absorvido). Inspect sera refeito.
       Nenhuma acao necessaria agora.
```

---

## 6. ORDEM DE EXECUCAO

### Fase 1: Timekeeper Restructure (PRIORIDADE MAXIMA)

```
1.1  Criar Header.tsx + HamburgerMenu.tsx
1.2  Criar tab Sites (SitesList + LotDetail + ActionBar)
1.3  Merge Reports → Home (calendario + cronometro)
1.4  Renomear Map → Jobsites, Team → Crew
1.5  Mover Settings para hamburger
1.6  Deletar tabs: reports, timeline, plans, settings, lots
1.7  Atualizar _layout.tsx para 4 tabs + header
1.8  Testar build Android + Web
```

### Fase 2: Critical Fixes

```
2.1  Padronizar Supabase JS → 2.93.3
2.2  Padronizar date-fns → 4.x
2.3  Fix Operator metro.config (React 18/19 isolation)
2.4  Fix Operator babel.config (remover plugin)
```

### Fase 3: Package Data Layer

```
3.1  Implementar timeline/data.ts (queries reais)
3.2  Implementar agenda/data.ts (queries reais)
3.3  Implementar camera/upload.ts (pipeline completo)
3.4  Implementar media/data.ts (fetch documentos reais)
```

### Fase 4: Dashboard Expansion

```
4.1  Migrar Timekeeper-Web → Dashboard /timekeeper/
4.2  Criar /sites/ section no Dashboard
```

### Fase 5: Inspect App

```
5.1  Refazer Inspect do zero com nova arquitetura
5.2  Compartilhar maxximo de packages com Monitor
```

### Fase 6: UI Package (ultima)

```
6.1  Consolidar tokens de todas as apps
6.2  Criar component catalog compartilhado
6.3  Migrar apps para usar @onsite/ui
```

---

## 7. MAPA DE MIGRACOES SUPABASE NECESSARIAS

> **ATUALIZADO 2026-02-19:** Expandido com base na planilha Avalon CONTROL (secao 12).
> O modelo anterior (assigned_worker_id na egl_houses) e INSUFICIENTE.
> A realidade e: workers diferentes POR FASE no mesmo lote.

### 7.1 Worker Assignment POR FASE (P0)

```sql
-- SUBSTITUI o antigo "assigned_worker_id" na egl_houses.
-- Na planilha Avalon, cada lote tem workers diferentes para Frame, Roof, Bsmt, Backing, Strap.

CREATE TABLE egl_phase_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id UUID NOT NULL REFERENCES egl_houses(id) ON DELETE CASCADE,
  phase_id UUID NOT NULL REFERENCES ref_eagle_phases(id),
  worker_id UUID NOT NULL REFERENCES core_profiles(id),
  role VARCHAR(20) DEFAULT 'worker',  -- worker, captain, helper
  rate_per_sqft DECIMAL(8,2),         -- rate negociado para este assignment
  total_value DECIMAL(10,2),          -- calculado: sqft x rate
  status VARCHAR(20) DEFAULT 'assigned', -- assigned, in_progress, completed
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(house_id, phase_id, worker_id)
);

-- RLS: worker ve seus assignments + org members veem do site
CREATE POLICY "Worker sees own assignments" ON egl_phase_assignments
FOR SELECT TO authenticated
USING (
  worker_id = auth.uid()
  OR house_id IN (
    SELECT h.id FROM egl_houses h
    JOIN egl_sites s ON h.site_id = s.id
    WHERE s.organization_id IN (SELECT get_user_organization_ids())
  )
);
```

### 7.2 Expand ref_eagle_phases (P0)

```sql
-- As 7 fases genericas viram ~20 sub-fases reais (aba Management da Avalon).
-- Adicionar campos de rate e categoria.

ALTER TABLE ref_eagle_phases ADD COLUMN IF NOT EXISTS category VARCHAR(30);
  -- 'site_prep', 'structure', 'envelope', 'mechanicals', 'finishing', 'inspection'
ALTER TABLE ref_eagle_phases ADD COLUMN IF NOT EXISTS default_rate_per_sqft DECIMAL(8,2);
ALTER TABLE ref_eagle_phases ADD COLUMN IF NOT EXISTS is_billable BOOLEAN DEFAULT true;
ALTER TABLE ref_eagle_phases ADD COLUMN IF NOT EXISTS depends_on UUID[];  -- phase_ids
ALTER TABLE ref_eagle_phases ADD COLUMN IF NOT EXISTS typical_duration_days INT;
ALTER TABLE ref_eagle_phases ADD COLUMN IF NOT EXISTS requires_inspection BOOLEAN DEFAULT false;

-- SEED com fases reais da planilha Avalon:
-- (ver secao 12.3 para lista completa)
-- order_index determina a sequencia real de construcao
```

### 7.3 Seed ref_eagle_phase_items com FRAME-CHECK (P0)

```sql
-- Os 140 itens de inspecao da planilha Avalon (secao 12.4)
-- sao o seed obrigatorio para ref_eagle_phase_items.

-- Cada item tem codigo unico (RA01, SF01, MW01, etc.)
ALTER TABLE ref_eagle_phase_items ADD COLUMN IF NOT EXISTS code VARCHAR(10) UNIQUE;
ALTER TABLE ref_eagle_phase_items ADD COLUMN IF NOT EXISTS category VARCHAR(30);
  -- 'roof_attic', 'second_floor_deck', 'main_floor_wall', 'second_floor_wall',
  -- 'stairs', 'main_floor_deck', 'outside', 'garage'
ALTER TABLE ref_eagle_phase_items ADD COLUMN IF NOT EXISTS severity VARCHAR(10) DEFAULT 'standard';
  -- 'critical', 'standard', 'cosmetic'

-- SEED: inserir os 140 itens reais (ver secao 12.4)
```

### 7.4 Material Tracking (P1)

```sql
-- Pipeline de material: ordered → delivered → installed → verified
-- Baseado na aba "Steel Posts" da Avalon

CREATE TABLE egl_material_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id UUID NOT NULL REFERENCES egl_houses(id) ON DELETE CASCADE,
  site_id UUID REFERENCES egl_sites(id),
  phase_id UUID REFERENCES ref_eagle_phases(id),
  organization_id UUID REFERENCES core_organizations(id),

  -- Material info
  material_type VARCHAR(50) NOT NULL, -- steel_post, lumber, tyvek, hanger, bracket, etc.
  material_subtype VARCHAR(50),       -- 15B, BSMT, etc.
  description TEXT,
  quantity INT NOT NULL DEFAULT 1,
  unit VARCHAR(20) DEFAULT 'unit',    -- unit, bundle, roll, sheet
  length_inches DECIMAL(8,2),         -- para steel posts: 109, 75.5, etc.

  -- Pipeline status
  status VARCHAR(20) NOT NULL DEFAULT 'needed',
    -- needed, ordered, delivered, installed, welded, verified
  ordered_at TIMESTAMPTZ,
  ordered_by UUID REFERENCES core_profiles(id),
  delivered_at TIMESTAMPTZ,
  installed_at TIMESTAMPTZ,
  installed_by UUID REFERENCES core_profiles(id),
  welded_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES core_profiles(id),

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: org members
CREATE POLICY "Org members manage materials" ON egl_material_tracking
FOR ALL TO authenticated
USING (organization_id IN (SELECT get_user_organization_ids()));
```

### 7.5 Phase Rates / Financeiro (P1)

```sql
-- Valores por fase baseado em sqft x rate (Avalon Vista 2)
-- Exemplo: Framing = ~$4.00/sqft, Roofing = ~$2.00/sqft

CREATE TABLE egl_phase_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES egl_sites(id),
  phase_id UUID NOT NULL REFERENCES ref_eagle_phases(id),
  organization_id UUID REFERENCES core_organizations(id),

  rate_per_sqft DECIMAL(8,2) NOT NULL,
  rate_per_sqft_basement DECIMAL(8,2), -- rate diferente para bsmt
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(site_id, phase_id, effective_from)
);

-- RLS: org admins/owners only
CREATE POLICY "Org admins manage rates" ON egl_phase_rates
FOR ALL TO authenticated
USING (
  organization_id IN (SELECT get_user_organization_ids())
  AND (SELECT get_user_org_role(organization_id)) IN ('owner', 'admin')
);
```

### 7.6 Lot Documents (P2)

```sql
-- Documentos por lote: plans, red lines, RSO, sales details, etc.
-- Baseado na aba Management > DOCUMENTATION da Avalon

CREATE TABLE egl_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id UUID REFERENCES egl_houses(id),
  site_id UUID REFERENCES egl_sites(id),
  organization_id UUID REFERENCES core_organizations(id),

  doc_type VARCHAR(30) NOT NULL,
    -- plan, red_lines, rso, sales_details, site_grade,
    -- stair_layout, landing_detail, floor_joist_layout,
    -- truss_book, kitchen_cabinets, safety_expectations
  title VARCHAR(200) NOT NULL,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  file_type VARCHAR(10),  -- pdf, png, jpg, dwg

  status VARCHAR(20) DEFAULT 'pending', -- pending, received, reviewed
  received_at TIMESTAMPTZ,
  received_by UUID REFERENCES core_profiles(id),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES core_profiles(id),

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 7.7 Crews (P2)

```sql
-- Equipes de campo (Frama, New York, etc.)
-- Baseado na aba Framers da Avalon

CREATE TABLE egl_crews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core_organizations(id),
  name VARCHAR(100) NOT NULL,  -- "Frama", "New York", "Alex & Gui"
  leader_id UUID REFERENCES core_profiles(id),
  specialty VARCHAR(50),  -- framing, roofing, backing, general
  is_active BOOLEAN DEFAULT true,
  total_houses_completed INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE egl_crew_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id UUID NOT NULL REFERENCES egl_crews(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES core_profiles(id),
  role VARCHAR(20) DEFAULT 'member',  -- leader, member
  joined_at TIMESTAMPTZ DEFAULT now(),
  left_at TIMESTAMPTZ,
  UNIQUE(crew_id, worker_id)
);

-- egl_phase_assignments.worker_id pode apontar para
-- um crew leader, e a crew inteira e inferida.
```

### 7.8 Worker vê seus lotes (atualizado)

```sql
-- Worker ve lotes onde tem phase_assignment OU via org membership
CREATE POLICY "Worker sees assigned houses"
ON egl_houses FOR SELECT TO authenticated
USING (
  id IN (
    SELECT house_id FROM egl_phase_assignments
    WHERE worker_id = auth.uid()
  )
  OR site_id IN (
    SELECT s.id FROM egl_sites s
    WHERE s.organization_id IN (SELECT get_user_organization_ids())
  )
);
```

---

## 8. REFERENCIA VISUAL (Screenshots)

### Home Tab (existente — sera mantido)
- Cronometro grande com geofence badge ("tim4")
- Botao START/STOP verde
- Calendario mensal abaixo com horas por dia
- Total mensal
- Botao "Select Dates to Export"
- FAB microfone (voice) no canto inferior direito
- Cores: amber (#C58B1B) para tabs ativas, verde (#0F766E) para acoes

### Jobsites Tab (existente — renomear apenas)
- Search bar no topo com endereco
- Mapa Google com circulos de geofence
- Bottom sheet com nome do local + radius selector (200m, 300m, 500m, 800m)
- Botao "Delete Jobsite"
- FAB microfone

### Design System Atual (manter)
```
Neutrals: 85-90%  (#F6F7F9 bg, #FFFFFF cards, #101828 text)
Green:    8-12%   (#0F766E acoes, botoes, active states)
Amber:    2-5%    (#C58B1B tabs, warnings, paused)
Error:    rare    (#DC2626 danger)
```

---

## 9. DEPENDENCIAS ENTRE FASES

```
Fase 1 (Timekeeper Restructure)
  └── Depende de: nada (pode comecar ja)

Fase 2 (Critical Fixes)
  └── Depende de: nada (independente, pode rodar em paralelo)

Fase 3 (Package Data Layer)
  └── Depende de: Fase 1.2 (Sites tab precisa de timeline/camera/media reais)

Fase 4 (Dashboard Expansion)
  └── Depende de: Fase 1 completa (Timekeeper estavel)

Fase 5 (Inspect App)
  └── Depende de: Fase 3 (packages com data layer real)

Fase 6 (UI Package)
  └── Depende de: todas as outras (consolida depois)
```

---

## 10. APPS/FIELD — PLANO DE DELECAO

```
ANTES de deletar apps/field:
1. ✅ Tab Sites implementada no Timekeeper
2. ✅ Camera funcional dentro do Timekeeper
3. ✅ Timeline per-lot funcional
4. ✅ Material request funcional
5. ✅ Checklist funcional
6. ✅ Plans viewer funcional

DEPOIS de confirmar tudo:
- rm -rf apps/field
- Remover do turbo.json
- Remover do package.json workspaces
- Remover referencia do CLAUDE.md
```

---

---

## 11. REFERENCIA UX DO REPO DE PRODUCAO

O repo `onsite-timekeeper` serve APENAS como referencia visual.
Nenhum codigo sera copiado — as bases sao incompativeis.

### 11.1 Elementos de UX a Recriar no Eagle

| Elemento | Referencia (producao) | Implementar no Eagle |
|----------|----------------------|----------------------|
| **Home layout** | Cronometro compacto + calendario mensal | Merge reports.tsx + index.tsx existentes |
| **Jobsites layout** | Mapa 75% + bottom panel 25% | Refatorar map.tsx (remover modais, usar panel) |
| **RadiusSlider** | Slider de raio (200/300/500/800m) | Criar componente novo no eagle |
| **FloatingMicButton** | FAB draggable com reanimated | Criar componente novo (usa reanimated do eagle) |
| **VoiceCommandSheet** | Bottom sheet com chat AI | Criar componente novo (usa @onsite/ai do eagle) |
| **Tab bar** | 4 tabs amber/gray com labels | Ja similar, ajustar para 4+Sites |
| **Color scheme** | Amber tabs, green actions, neutral bg | Ja existe em colors.ts do eagle |

### 11.2 O Que NAO Copiar (eagle ja tem melhor)

| Feature | Producao | Eagle (manter) |
|---------|----------|----------------|
| Database | SQLite custom | SQLite + @onsite/offline |
| Sync | Custom sync engine | syncStore + @onsite/offline |
| Auth | Supabase direto | @onsite/auth package |
| Timeline | Nao tem | @onsite/timeline package |
| Agenda | Nao tem | @onsite/agenda package |
| AI | Inline prompts | @onsite/ai package |
| Camera | Nao tem | @onsite/camera package |
| Media | Nao tem | @onsite/media package |

---

## 12. AVALON CONTROL — BASELINE REAL DO SUPERVISOR

> **Fonte:** `C:\Users\crist\OneDrive\Desktop\Avalon CONTROL.xlsx`
> **Projeto:** The Ridge Stage 1 (Caivan/Minto) — 65 lotes
> **Importancia:** Esta planilha e a ferramenta REAL usada pelo fundador como supervisor
> de framing. Ela define o padrao minimo que o Eagle precisa substituir.

### 12.1 O Que a Planilha É

Planilha Excel com **13 abas** que controla um site inteiro de construcao residencial:
65 lotes, ~20 modelos de casa (Quinton, Mapleton, Frontenac, Fairbank, etc.),
~15 framers/crews, controle de materiais, financeiro por fase, e checklists de inspecao.

**Este e o "sistema legado" que o Eagle precisa substituir com vantagem.**

### 12.2 Mapeamento Aba ↔ Eagle

| # | Aba | Conteudo | Equivalente Eagle | Gap |
|---|-----|---------|-------------------|-----|
| 1 | **Vista 2** | 65 lotes: worker/fase, modelo, sqft, $$$ | `egl_houses` + `egl_schedule_phases` | Workers POR FASE e valores $$$ faltam |
| 2 | **Management** | ~80 itens/lote: sub-tasks + docs + materiais + exterior | `egl_schedule_phases` + `ref_eagle_phase_items` | Granularidade MUITO insuficiente |
| 3 | **Progress** | % por lote (Framing/Roofing/Backing/Inspection) | `egl_progress` | Existe mas com fases genericas |
| 4 | **Windows** | Specs de janela por modelo/room | Nenhum | P3 — pode ser metadata |
| 5 | **SQFT** | Metragem por modelo (~24 modelos) | `egl_houses.sqft_*` | Existe (migration 004) |
| 6 | **ADM** | Checklist admin: plating, beams, tyvek, docs | Nenhum | P2 — pre-frame checklist |
| 7 | **Minto Super Schedule** | Datas por fase (roof ply: Apr 22, etc.) | `egl_schedule_phases` | Existe |
| 8 | **Framers** | 43 crews com producao | `int_worker_profiles` | Parcial — falta conceito de crew |
| 9 | **Legend** | Codigos de trade (F/R/B/U/W) | `ref_trades` | Parcial |
| 10 | **FT2** | Calculadora sqft | Calculator app | Existe |
| 11 | **Steel Posts** | Material tracking (ordered/delivered/installed/welded) | Nenhum | P1 — material tracking |
| 12 | **FRAME-CHECK** | 100+ itens de inspecao codificados | `ref_eagle_phase_items` | **GAP CRITICO** |
| 13 | **FC** | Template do Frame-Check | Mesmo acima | Idem |

### 12.3 Sub-Fases Reais (da aba Management)

A planilha revela que o fluxo real de construcao NAO sao "7 fases genericas".
Sao ~20 sub-tarefas sequenciais + 3 categorias de suporte:

```
CONSTRUCAO (sequencial):
 1. backfill            ← Preparacao do terreno
 2. frame start         ← Inicio do framing
 3. ols roof ply        ← Compensado do telhado (lower)
 4. Roof Ply            ← Compensado do telhado
 5. Shingle             ← Telhas
 6. Window              ← Janelas
 7. prep insulation     ← Preparacao isolamento
 8. foam rim board      ← Espuma rim board
 9. prep drywall        ← Preparacao drywall
10. weld                ← Solda (steel posts)
11. pour bsmt           ← Concretagem basement
12. fireplace/hwt       ← Lareira / hot water tank
13. stairs              ← Escadas
14. plumbing            ← Encanamento
15. hvac                ← Ar condicionado/aquecimento
16. finish bsmt         ← Acabamento basement (yes/no)
17. backing             ← Backing (drywall supports)
18. framecheck          ← Inspecao de framing
19. wire                ← Eletrica
20. city framing        ← Inspecao municipal
21. ols insulation      ← Isolamento
22. City Insulation     ← Inspecao municipal isolamento

DOCUMENTACAO (pre-requisitos):
 - Plan, Red Lines, RSO, Sales Details, Site Grade
 - Stair Layouts, Landing detail, Floor joists layout
 - Trusses book, Kitchen Cabinets, Safety Expectations

MATERIAIS (tracking):
 - Gasket, Tyvek, Glue, Hangers, Poly, Shims
 - A32/A35 brackets, Steel beams, Steel posts, Steel plates
 - 2x10 hangers, Subfloor loads, Wall loads
 - Roof/Trusses loads, Basement load, Backing load
 - PT Porch Posts, Porch/Balcony/Landing packages

EXTERIOR/GARAGE/PORCH (checklists):
 - Wall sheathing alignment, clean-up, lumber organization
 - Steel posts support, beam leveling, frame completion
 - Porch beam installation, brick clearance, PT posts
 - Temporary braces removal
```

### 12.4 Checklist de Inspecao Real (FRAME-CHECK)

A aba FRAME-CHECK contem **100+ itens codificados** em 8 categorias.
Este checklist DEVE ser o `seed` de `ref_eagle_phase_items`:

```
ROOF AND ATTIC (RA01-RA23) — 23 itens
  RA01: Trusses following layout details
  RA02: Truss hangers fully nailed follow engineer details
  RA03: Multy ply trusses and beams fully nailed following drawing
  RA04: Roof return leveled
  RA05: Firestop complete
  RA06: Drywall inside truss like blueprint
  RA07: Backing at porch
  RA08: Trim for brick
  RA09: Backing for drywall at the ceiling
  RA10: Roof deck space between sheets less than 1/4"
  RA11: Valley supported
  RA12: Truss bearing 1 1/2" min. and girder 3" min.
  RA13: Truss bracing following engineer details
  RA14: Hips properly supported
  RA15: Edges properly supported
  RA16: Ridges properly supported
  RA17: Backing for insulation at cathedral ceiling
  RA18: Insulation stop
  RA19: "H" clips installed properly
  RA20: Remove temporary bracing/blocks, bend nails (2nd floor + garage)
  RA21: Remove scaffoldings and useless lumber from walls
  RA22: Extra lumber/sheathing removed and organized for pick-up
  RA23: (reserved)

SECOND FLOOR DECK (SF01-SF17) — 17 itens
  SF01: Floor deck level right dimension
  SF02: Floor joist bearing 1 1/2"
  SF03: No nails or glue on side of joists (musical floor)
  SF04: Beam bearing min. 3" (full)
  SF05: Joist blocking as per layout nailed at bottom
  SF06: Joist hangers fully nailed and screwed @ bottom
  SF07: Nailing of built-up beams following blueprint
  SF08: Parallel blocking installed as per floor joist layout
  SF09: Squash blocks installed properly
  SF10: Floor deck nailed @ 6" on edges and @ 12" int.
  SF11: Blocks under posts above (point loads)
  SF12: Drywall on rimboard at fire wall side
  SF13: Roxul properly installed as per details
  SF14: Joist not in the way for plumbing pipe

MAIN FLOOR WALL (MW01-MW19) — 19 itens
  MW01: Warped studs
  MW02: Walls plumb (1/4 per 4')
  MW03: Top plates lapped at corners
  MW04: Walls plates nailed at floor
  MW05: Studs end and toe nailed to plates
  MW06: Sheathing nailed at 6" on edges and 12" int.
  MW07: Sheathing without space on joints, gaps or holes
  MW08: Tall-wall full height double stud with blocking each 4 feet
  MW09: Top of windows as per plan
  MW10: Windows and doors opening square and plumb
  MW11: Posts under point loads
  MW12: Backing for drywall at inside corners
  MW13: Poly where int. walls meet ext. walls
  MW14: Door openings toe nailed
  MW15: Int. door RSO as blueprint
  MW16: Fireplace framed following blueprint + details
  MW17: Drywall between int. ext. walls fw side
  MW18: Windows and doors heights as per drawing
  MW19: Nails bent or removed from bottom plates, floor or walls

SECOND FLOOR WALLS (SW01-SW25) — 25 itens
  SW01-SW24: Mesma estrutura que MW, adaptada para 2nd floor
  + SW21: Knee walls around stair-case
  + SW22: Internal wall division stud at 24" and bathroom at 16"
  + SW23: 12" between studs for shower or bath plumbing
  + SW24: Walls square and level and straight

STAIRS (ST01-ST15) — 15 itens
  ST01: Temporary guardrails installed @ 42" and 24" and @ bottom
  ST02: Temp. handrails installed at stairs @ 42" and 24"
  ST03: Stair landings following stair layout
  ST04: Stair landings leveled and hangered
  ST05: Stair landing properly support (carry down)
  ST06: Knee-wall properly installed (level + secure)
  ST07: Stair opening at right dimension and place
  ST08: Tall-wall properly nailed at both sides and @ bottom (no gaps)
  ST09: Nailing pattern
  ST10: Flush framing

MAIN FLOOR DECK (MF01-MF24) — 24 itens
  MF01-MF23: Joists, beams, bearing, blocking, hangers, nailing,
  squash blocks, drywall, roxul, tyvek, anchor bolts, posts, steel

OUTSIDE (OS01-OS10) — 10 itens
  OS01: Porch beam follow details (height, measurement, level, square)
  OS02: Porch 45 angle support
  OS03: Porch box trim for brick 5"
  OS04: Exterior sheathing nailed properly
  OS05: External walls aligned (less than 1/4 sticking out)
  OS06: Porch and garage walls height aligned for roofing
  OS07: Furr-out walls to match brick and overhangs
  OS08: Returns right dimension and level
  OS09: OSB installed on bottom plate
  OS10: Fascia straight and level

GARAGE (GA01-GA07) — 7 itens
  GA01: Tyvek between double plates face down min 9"
  GA02: Tyvek behind trusses
  + Steel posts, beam leveling, frame completion, brick clearance
```

**TOTAL: ~140 itens de inspecao reais.**

### 12.5 Modelo Financeiro (Vista 2)

A planilha calcula valores por fase baseado em **sqft x rate**:

```
Exemplo Lot 001 — Quinton 5 D GS (3418 sqft + 822 bsmt):
  Framing:  $13,672  (~$4.00/sqft)
  Roofing:   $6,836  (~$2.00/sqft)
  Backing:   $3,760  (~$1.10/sqft)
  Basement:  $1,644  (~$2.00/sqft bsmt)

Totais do site (65 lotes):
  Total SQFT: 173,914
  Total BSMT: 16,790
  Framing total: $689,607
  Roofing total: $347,463
  Backing total: $191,305
```

**Implicacao:** O Eagle precisa de `egl_phase_rates` ou campos de rate
em `ref_eagle_phases` para calcular automaticamente.

### 12.6 Modelo de Workers POR FASE (Vista 2)

A planilha atribui workers DIFERENTES para cada fase do MESMO lote:

```
Lot 001:
  CAP (Capitao):  (vazio)
  FRAME:          Ivan
  ROOF:           Carlos
  BSMT:           Cristony
  BKN (Backing):  Cristony
  STRAP:          Yuri

Lot 009:
  CAP:    Gregorio
  FRAME:  Gregorio
  ROOF:   Frama
  BSMT:   Andrey
  BKN:    Andrey
  STRAP:  Andrey
```

**Implicacao:** `assigned_worker_id` na `egl_houses` e INSUFICIENTE.
Precisa de uma tabela de junction `egl_phase_assignments` (house_id + phase_id + worker_id + role).

### 12.7 Crews vs Individuals

A aba **Framers** lista 43 entries, mas mistura individuos e crews:
- "Frama" = crew (37 casas de roof)
- "Valmir" = individual (6 casas total)
- "Cuba" = individual (1 casa)
- "Alex & Gui" = dupla

**Implicacao:** O modelo precisa suportar crews como entidade agrupadora
(similar a `core_organizations` mas para equipes de campo).

### 12.8 Material Tracking (Steel Posts)

A aba **Steel Posts** rastreia ~80 ordens com pipeline:

```
LOT | QTY | POST TYPE | LENGTH | ORDERED | DELIVERED | INSTALLED | WELDED
65  | 2   |           | 109"   | 25-Jun  |           |           |
71  | 1   | BSMT      | 92 BSMT| YES     |           | YES       |
80  | 4   | 15B       |        | YES     |           | YES       |
```

**Pipeline de material:** `ordered → delivered → installed → welded`

**Implicacao:** Tabela `egl_material_tracking` com status pipeline
e referencia ao lote. Nao apenas "pedido" mas lifecycle completo.

### 12.9 GAPs Prioritarios (Avalon → Eagle)

| # | Gap | Impacto | Tabela(s) Necessaria(s) | Prioridade |
|---|-----|---------|------------------------|------------|
| 1 | Sub-fases reais (~20 vs 7 genericas) | CRITICO — workflow diario | Seed `ref_eagle_phases` com 20+ fases | **P0** |
| 2 | Worker assignment POR FASE | CRITICO — quem faz o que | `egl_phase_assignments` | **P0** |
| 3 | Checklist de inspecao (140 itens) | CRITICO — core do Inspect | Seed `ref_eagle_phase_items` com dados reais | **P0** |
| 4 | Valores $$$ por fase | ALTO — billing de subs | `egl_phase_rates` ou campos em `ref_eagle_phases` | **P1** |
| 5 | Material tracking com lifecycle | ALTO — supply chain | `egl_material_tracking` | **P1** |
| 6 | Documentacao pre-frame por lote | MEDIO — pre-requisitos | `egl_documents` (type: plan/red_line/rso/etc.) | **P2** |
| 7 | Conceito de Crew | MEDIO — equipes de campo | `egl_crews` + `egl_crew_members` | **P2** |
| 8 | Checklist ADM (pre-frame) | MEDIO — admin tracking | Categoria extra em `ref_eagle_phase_items` | **P2** |

---

## 13. DIRETIVA: AVALON COMO SPEC FUNCIONAL

```
╔══════════════════════════════════════════════════════════════════╗
║  DIRETIVA 2026-02-19: AVALON E A SPEC FUNCIONAL DO EAGLE       ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  A planilha "Avalon CONTROL.xlsx" no Desktop do fundador e a    ║
║  ferramenta REAL usada em producao como supervisor de framing.   ║
║                                                                  ║
║  REGRAS:                                                         ║
║                                                                  ║
║  1. O Eagle so substitui a planilha quando cobrir 100% dos      ║
║     workflows reais que ela resolve. Ate la, coexistem.         ║
║                                                                  ║
║  2. As 7 fases genericas do ref_eagle_phases DEVEM ser          ║
║     expandidas para ~20 sub-fases baseadas na aba Management.   ║
║                                                                  ║
║  3. Os 140 itens de inspecao da aba FRAME-CHECK sao o seed      ║
║     OBRIGATORIO para ref_eagle_phase_items. Nao inventar.       ║
║                                                                  ║
║  4. Worker assignment DEVE ser POR FASE (egl_phase_assignments) ║
║     e nao por casa. A planilha prova que cada fase tem workers  ║
║     diferentes no mesmo lote.                                    ║
║                                                                  ║
║  5. Valores $$$ por fase (sqft x rate) sao essenciais para      ║
║     billing de subcontractors. Sem isso o supervisor nao larga  ║
║     a planilha.                                                  ║
║                                                                  ║
║  6. Material tracking com pipeline (ordered→delivered→           ║
║     installed→welded) e necessario para steel posts e outros.   ║
║                                                                  ║
║  7. Qualquer agente que implemente o Eagle DEVE consultar a     ║
║     secao 12 deste documento como referencia de dados reais.    ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

---

*Documento criado por Cerbero — Sessao 12, 2026-02-19*
*Atualizado: Sessao 13 — Integracao da planilha Avalon CONTROL como baseline real*
*Baseado em raio-X completo do ecossistema + decisoes do fundador*
*Producao (onsite-timekeeper) como referencia UX apenas — sem copia de codigo*
*Avalon CONTROL.xlsx como spec funcional — dados reais de 65 lotes*
