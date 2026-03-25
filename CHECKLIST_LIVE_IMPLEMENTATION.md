# Checklist Live — Plano de Implementacao

> **Data:** 2026-03-15
> **Status:** Planejamento
> **Autor:** Cerbero + Cris

---

## REGRA ZERO — NAO MEXER NO CODIGO EXISTENTE

```
╔════════════════════════════════════════════════════════════════════════╗
║  AVISO CRITICO                                                        ║
║                                                                        ║
║  O modo self-service (apps/checklist/app/self/*) esta DEPLOYADO       ║
║  e em USO via Vercel. Qualquer alteracao nesses arquivos afeta        ║
║  usuarios em producao imediatamente.                                  ║
║                                                                        ║
║  ARQUIVOS PROTEGIDOS (NAO MODIFICAR):                                 ║
║  - apps/checklist/app/self/page.tsx                                   ║
║  - apps/checklist/app/self/check/[transition]/page.tsx                ║
║  - apps/checklist/app/self/check/[transition]/complete/page.tsx       ║
║                                                                        ║
║  ARQUIVOS COMPARTILHADOS (MODIFICAR COM CUIDADO):                     ║
║  - apps/checklist/lib/templates.ts        ← usado por self + live     ║
║  - apps/checklist/lib/pdf-report.ts       ← usado por self + live     ║
║  - apps/checklist/lib/compress.ts         ← usado por self + live     ║
║  - apps/checklist/components/ProgressBar.tsx                          ║
║  - apps/checklist/components/PhotoCaptureLocal.tsx                    ║
║                                                                        ║
║  Ao modificar arquivos compartilhados, TESTAR ambos os modos.        ║
╚════════════════════════════════════════════════════════════════════════╝
```

---

## 1. Visao Geral

### O que existe hoje

| Modo | Rota | Auth | Dados | Status |
|------|------|------|-------|--------|
| **Self-service** | `/self/*` | Nenhum | sessionStorage + base64 | **DEPLOYED (Vercel)** |
| **App (auth)** | `/app/*` | Supabase auth | `frm_gate_checks` via `@onsite/framing` | Funcional, pouco usado |

### O que sera adicionado

| Modo | Rota | Auth | Dados | Status |
|------|------|------|-------|--------|
| **Live (carpenter)** | `/live/[token]` | Nenhum (token publico) | Supabase Realtime | **A IMPLEMENTAR** |
| **Monitor (supervisor)** | `/site/[id]/lot/[lotId]?tab=gate-checks` | Supabase auth | Supabase Realtime | **EXTENDER existente** |

### Fluxo Completo

```
MONITOR (Supervisor)                         CHECKLIST APP (Carpenter)
────────────────────                         ────────────────────────
1. Abre lot → tab Gate Checks
2. Clica "New Gate Check"
3. Seleciona transicao (Framing/Trusses/Backing)
4. Nomeia o carpenter (nome ou perfil)
5. Sistema cria chk_session + share_token
6. Exibe QR code + link copiavel
7. Envia link (WhatsApp/SMS)
                                             8. Carpenter abre /live/{token}
                                             9. Ve o checklist (read/write)
                                             10. Marca Pass/Fail/NA por item
                                             11. Tira fotos (upload Supabase Storage)
                                             12. Cada save → Supabase UPDATE
                                                 → Realtime broadcast
13. Monitor recebe updates live ←────────
    (progresso atualiza, badge "5/13")
                                             14. Carpenter marca todos → "Submit"
                                             15. Status: submitted
16. Supervisor recebe notificacao
17. Revisa cada item no Monitor
18a. APROVA TODOS
     → status = approved
     → lot avanca de fase (auto)
     → PDF gerado e salvo no Storage
     → Checklist vira read-only

18b. REPROVA item(s)
     → Marca quais itens reprovar + notes
     → status = needs_rework
     → round++ (nova rodada)
                                             19. Carpenter ve itens rejeitados
                                                 (destacados em vermelho)
                                             20. Corrige + re-submete
21. Supervisor recebe notificacao ←──────
22. Revisa novamente → volta ao 18
```

---

## 2. Arquitetura de Dados

### 2.1 Novas Tabelas

```sql
-- ============================================================
-- chk_sessions: Sessao de gate check colaborativa
-- ============================================================
CREATE TABLE chk_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Contexto (vincula ao Eagle)
  site_id UUID REFERENCES egl_sites(id),
  house_id UUID REFERENCES egl_houses(id),
  organization_id UUID REFERENCES core_organizations(id),
  transition VARCHAR NOT NULL,  -- framing_to_roofing | roofing_to_trades | backframe_to_final

  -- Participantes
  carpenter_name VARCHAR NOT NULL,         -- nome livre (sempre preenchido)
  carpenter_id UUID REFERENCES core_profiles(id),  -- vinculo opcional ao perfil
  supervisor_id UUID NOT NULL REFERENCES core_profiles(id),

  -- Compartilhamento
  share_token VARCHAR(32) UNIQUE NOT NULL, -- token curto para URL publica
  share_url TEXT,                           -- URL completa gerada

  -- Status machine
  status VARCHAR NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'in_progress', 'submitted', 'needs_rework', 'approved', 'rejected')),
  round INT NOT NULL DEFAULT 1,            -- rodada de revisao (1 = primeira, 2+ = rework)

  -- Resultado
  passed BOOLEAN,                          -- NULL ate aprovado/rejeitado
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES core_profiles(id),

  -- PDF
  pdf_storage_path TEXT,                   -- path no bucket apos aprovacao

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indices
CREATE INDEX idx_chk_sessions_house ON chk_sessions(house_id);
CREATE INDEX idx_chk_sessions_token ON chk_sessions(share_token);
CREATE INDEX idx_chk_sessions_supervisor ON chk_sessions(supervisor_id);
CREATE INDEX idx_chk_sessions_status ON chk_sessions(status);

-- ============================================================
-- chk_item_results: Resultado de cada item do checklist
-- ============================================================
CREATE TABLE chk_item_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chk_sessions(id) ON DELETE CASCADE,

  -- Item do template
  item_code VARCHAR NOT NULL,
  item_label TEXT NOT NULL,
  sort_order INT NOT NULL,
  is_blocking BOOLEAN NOT NULL DEFAULT false,

  -- Resultado do carpenter
  result VARCHAR NOT NULL DEFAULT 'pending'
    CHECK (result IN ('pending', 'pass', 'fail', 'na')),
  notes TEXT,

  -- Revisao do supervisor
  supervisor_result VARCHAR
    CHECK (supervisor_result IN ('approved', 'rejected')),
  supervisor_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES core_profiles(id),

  -- Controle
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(session_id, item_code)
);

CREATE INDEX idx_chk_items_session ON chk_item_results(session_id);

-- ============================================================
-- chk_photos: Fotos por item
-- ============================================================
CREATE TABLE chk_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_result_id UUID NOT NULL REFERENCES chk_item_results(id) ON DELETE CASCADE,

  storage_path TEXT NOT NULL,      -- path no bucket egl-media
  thumbnail_path TEXT,             -- thumbnail gerado (futuro)
  sort_order INT NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_chk_photos_item ON chk_photos(item_result_id);
```

### 2.2 RLS Policies

```sql
-- Habilitar RLS
ALTER TABLE chk_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chk_item_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE chk_photos ENABLE ROW LEVEL SECURITY;

-- ── chk_sessions ──

-- Supervisor pode tudo nas suas sessoes
CREATE POLICY "Supervisor full access" ON chk_sessions
FOR ALL TO authenticated
USING (supervisor_id = auth.uid())
WITH CHECK (supervisor_id = auth.uid());

-- Membros da org podem ver sessoes da org
CREATE POLICY "Org members view sessions" ON chk_sessions
FOR SELECT TO authenticated
USING (organization_id IN (SELECT get_user_organization_ids()));

-- ── chk_item_results ──

-- Quem tem acesso a sessao pode ver itens
CREATE POLICY "Session participants view items" ON chk_item_results
FOR SELECT TO authenticated
USING (
  session_id IN (
    SELECT id FROM chk_sessions
    WHERE supervisor_id = auth.uid()
    OR organization_id IN (SELECT get_user_organization_ids())
  )
);

-- Supervisor pode atualizar revisao
CREATE POLICY "Supervisor review items" ON chk_item_results
FOR UPDATE TO authenticated
USING (
  session_id IN (
    SELECT id FROM chk_sessions WHERE supervisor_id = auth.uid()
  )
);

-- ── chk_photos ──

-- Mesma logica: quem ve o item ve as fotos
CREATE POLICY "View photos via session" ON chk_photos
FOR SELECT TO authenticated
USING (
  item_result_id IN (
    SELECT ir.id FROM chk_item_results ir
    JOIN chk_sessions s ON s.id = ir.session_id
    WHERE s.supervisor_id = auth.uid()
    OR s.organization_id IN (SELECT get_user_organization_ids())
  )
);

-- ── Acesso publico via token (carpenter sem auth) ──
-- Implementado via SECURITY DEFINER functions (ver secao 2.3)
```

### 2.3 Funcoes SECURITY DEFINER (Acesso Publico)

O carpenter acessa via link publico (sem auth). Precisamos de funcoes
SECURITY DEFINER para permitir leitura/escrita controlada via token.

```sql
-- Buscar sessao por token (publico)
CREATE OR REPLACE FUNCTION chk_get_session_by_token(p_token VARCHAR)
RETURNS TABLE (
  id UUID,
  transition VARCHAR,
  status VARCHAR,
  carpenter_name VARCHAR,
  site_name VARCHAR,
  lot_number VARCHAR,
  round INT
)
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id, s.transition, s.status, s.carpenter_name,
    es.name AS site_name,
    eh.lot_number
  FROM chk_sessions s
  LEFT JOIN egl_sites es ON es.id = s.site_id
  LEFT JOIN egl_houses eh ON eh.id = s.house_id
  WHERE s.share_token = p_token
  AND s.status NOT IN ('approved', 'rejected');
$$;

-- Buscar itens de uma sessao por token (publico)
CREATE OR REPLACE FUNCTION chk_get_items_by_token(p_token VARCHAR)
RETURNS TABLE (
  id UUID,
  item_code VARCHAR,
  item_label TEXT,
  sort_order INT,
  is_blocking BOOLEAN,
  result VARCHAR,
  notes TEXT,
  supervisor_result VARCHAR,
  supervisor_notes TEXT,
  photo_count BIGINT
)
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ir.id, ir.item_code, ir.item_label, ir.sort_order, ir.is_blocking,
    ir.result, ir.notes,
    ir.supervisor_result, ir.supervisor_notes,
    (SELECT COUNT(*) FROM chk_photos p WHERE p.item_result_id = ir.id)
  FROM chk_item_results ir
  JOIN chk_sessions s ON s.id = ir.session_id
  WHERE s.share_token = p_token
  ORDER BY ir.sort_order;
$$;

-- Atualizar resultado de um item (carpenter via token)
CREATE OR REPLACE FUNCTION chk_update_item_result(
  p_token VARCHAR,
  p_item_id UUID,
  p_result VARCHAR,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE chk_item_results ir
  SET result = p_result,
      notes = p_notes,
      updated_at = now()
  FROM chk_sessions s
  WHERE ir.session_id = s.id
  AND s.share_token = p_token
  AND ir.id = p_item_id
  AND s.status IN ('in_progress', 'needs_rework')
  AND p_result IN ('pass', 'fail', 'na');

  RETURN FOUND;
END;
$$;

-- Submeter checklist (carpenter marca como pronto)
CREATE OR REPLACE FUNCTION chk_submit_session(p_token VARCHAR)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE chk_sessions
  SET status = 'submitted',
      updated_at = now()
  WHERE share_token = p_token
  AND status IN ('in_progress', 'needs_rework');

  RETURN FOUND;
END;
$$;
```

### 2.4 Storage

```
Bucket: egl-media (ja existe, publico)

Path: chk/{session_id}/{item_code}/{timestamp}_{random}.jpg

Exemplo:
egl-media/chk/a1b2c3d4/house_clean/1710500000_x7k2m.jpg
```

Storage policy para upload publico via token sera implementada
como funcao SECURITY DEFINER que retorna signed upload URL.

---

## 3. Onde Cada Coisa Vive

### 3.1 Monitor (Supervisor) — `apps/monitor/`

```
apps/monitor/src/
  components/
    GateCheckView.tsx         ← JA EXISTE (gate checks via @onsite/framing)
    GateCheckLive.tsx         ← NOVO: UI de sessao live
    GateCheckReview.tsx       ← NOVO: Tela de revisao do supervisor
    GateCheckQRModal.tsx      ← NOVO: Modal com QR + link copiavel

  app/site/[id]/lot/[lotId]/
    page.tsx                  ← EXTENDER: adicionar opcao "Live Gate Check" na tab
```

**Mudancas no lot page existente:**
- Na tab "Gate Checks", adicionar botao "Start Live Check" ao lado do existente
- O gate check existente (`GateCheckView.tsx` via `@onsite/framing`) **continua funcionando**
- O live check e uma **opcao adicional**, nao substituta

### 3.2 Checklist App (Carpenter) — `apps/checklist/`

```
apps/checklist/
  app/
    self/                     ← NAO TOCAR (deployed, em uso)
      page.tsx
      check/[transition]/
        page.tsx
        complete/page.tsx

    live/                     ← NOVO (rota publica, sem auth)
      [token]/
        page.tsx              # Checklist interativo (Supabase Realtime)
        submitted/
          page.tsx            # Tela pos-submissao (aguardando revisao)

  components/
    PhotoCaptureLocal.tsx     ← EXISTENTE (reutilizar no live)
    PhotoCaptureLive.tsx      ← NOVO (upload para Supabase Storage)
    ProgressBar.tsx           ← EXISTENTE (reutilizar)
    LiveStatusBanner.tsx      ← NOVO (status da sessao: em revisao, needs rework)

  lib/
    templates.ts              ← EXISTENTE (reutilizar, mesmo source de verdade)
    pdf-report.ts             ← EXISTENTE (reutilizar para PDF final)
    compress.ts               ← EXISTENTE (reutilizar)
    live-api.ts               ← NOVO (chamadas RPC ao Supabase via token)
```

---

## 4. Fases de Implementacao

### Fase 1: Migration + Funcoes (Backend)

**Objetivo:** Criar tabelas, RLS, funcoes SECURITY DEFINER.

**Arquivos:**
- `supabase/migrations/0XX_checklist_live.sql`

**Entregavel:** Tabelas `chk_sessions`, `chk_item_results`, `chk_photos` com RLS e funcoes.

**Validacao:**
- [ ] Tabelas criadas
- [ ] RLS habilitado em todas
- [ ] Funcoes SECURITY DEFINER testadas via `execute_sql`
- [ ] Storage path acessivel

---

### Fase 2: Monitor — Criar Sessao + QR Code

**Objetivo:** Supervisor cria sessao live e compartilha link/QR.

**Arquivos novos:**
- `apps/monitor/src/components/GateCheckLive.tsx`
- `apps/monitor/src/components/GateCheckQRModal.tsx`

**Arquivos modificados:**
- `apps/monitor/src/app/site/[id]/lot/[lotId]/page.tsx` — adicionar botao na tab Gate Checks

**Fluxo:**
1. Supervisor clica "Start Live Check" na tab Gate Checks
2. Seleciona transicao + nome do carpenter
3. POST para API route que cria `chk_session` + items do template
4. Modal exibe QR code + link copiavel + botao WhatsApp
5. Status: `draft` → `in_progress`

**API Route nova:**
- `apps/monitor/src/app/api/gate-check-live/route.ts` — CRUD de sessoes

**Dependencias:**
- `@onsite/sharing` (ja existe no Monitor) para QR code
- Templates de `apps/checklist/lib/templates.ts` — importar ou duplicar como constante

---

### Fase 3: Checklist App — Rota /live/[token]

**Objetivo:** Carpenter abre link e preenche checklist com dados indo pro Supabase.

**Arquivos novos:**
- `apps/checklist/app/live/[token]/page.tsx`
- `apps/checklist/app/live/[token]/submitted/page.tsx`
- `apps/checklist/components/PhotoCaptureLive.tsx`
- `apps/checklist/lib/live-api.ts`

**UI:** Reutiliza 90% do layout de `/self/check/[transition]/page.tsx`:
- Mesmo card layout (Pass/Fail/NA buttons)
- Mesmo ProgressBar
- Mesma Photo capture (mas upload vai pro Storage em vez de base64)
- Mesmo guidance de cleanup photos

**Difereneas do self:**
- Dados vem/vao do Supabase (via funcoes RPC com token)
- Fotos vao para Supabase Storage (nao base64)
- Submit → status `submitted` (nao gera PDF local)
- Apos submit → tela "Awaiting Review" com status live
- Se supervisor reprova → itens rejeitados aparecem em vermelho
- Carpenter corrige e re-submete

**live-api.ts:**
```typescript
// Wrapper para chamadas RPC com token
export async function getSessionByToken(token: string) { ... }
export async function getItemsByToken(token: string) { ... }
export async function updateItemResult(token: string, itemId: string, result, notes?) { ... }
export async function submitSession(token: string) { ... }
export async function uploadPhoto(token: string, itemCode: string, file: File) { ... }
```

**Supabase client:** Usar anon key (sem auth), as funcoes SECURITY DEFINER
validam o token internamente.

---

### Fase 4: Monitor — Realtime + Revisao

**Objetivo:** Supervisor ve progresso em tempo real e pode aprovar/reprovar.

**Arquivos novos:**
- `apps/monitor/src/components/GateCheckReview.tsx`

**Arquivos modificados:**
- `apps/monitor/src/components/GateCheckLive.tsx` — adicionar Realtime subscribe

**Realtime Setup:**
```typescript
// Subscribe em mudancas nos itens da sessao
supabase
  .channel(`gate-check-${sessionId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'chk_item_results',
    filter: `session_id=eq.${sessionId}`
  }, (payload) => {
    // Atualizar item no state local
    updateItem(payload.new)
  })
  .subscribe()
```

**UI de Revisao (GateCheckReview):**
- Lista de items com resultado do carpenter (Pass/Fail/NA)
- Fotos inline (clicaveis para ampliar)
- Botoes por item: "Approve" / "Reject" + campo de notes
- Botao global: "Approve All" / "Request Rework"
- Ao aprovar tudo:
  - `status = approved`
  - Gera PDF via `pdf-report.ts` (server-side)
  - Salva no Storage (`egl-media/chk/{session_id}/report.pdf`)
  - Auto-avanca fase do lot (se aplicavel)

---

### Fase 5: Notificacoes + Polish

**Objetivo:** Notificar supervisor quando carpenter submete, e vice-versa.

**Opcoes de notificacao (por prioridade):**
1. **Realtime badge** — Badge no tab Gate Checks pisca quando tem update (mais facil)
2. **Push notification** — Via `apps/monitor/src/app/api/push/send/route.ts` (ja existe)
3. **Email** — Futuro

**Polish:**
- Historico de sessoes por lot (lista de gate checks anteriores)
- Indicador de rodada ("Round 2 — Rework")
- Timestamp de cada acao
- Download PDF na tela de revisao

---

## 5. Mapa de Dependencias

```
                    ┌─────────────────────────────────┐
                    │         SUPABASE                │
                    │                                  │
                    │  chk_sessions                   │
                    │  chk_item_results               │
                    │  chk_photos                     │
                    │  egl-media bucket               │
                    │  SECURITY DEFINER functions     │
                    │  Realtime (postgres_changes)    │
                    └──────────┬──────────────────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
    ┌─────────────────┐ ┌──────────────┐ ┌──────────────────┐
    │  MONITOR        │ │  CHECKLIST   │ │  CHECKLIST       │
    │  (Supervisor)   │ │  /live/[tok] │ │  /self/*         │
    │                 │ │  (Carpenter) │ │  (Offline)       │
    │  Auth: Supabase │ │  Auth: Token │ │  Auth: Nenhum    │
    │  React 19       │ │  React 19   │ │  React 19        │
    │  Port 3000      │ │  Port 3004  │ │  Port 3004       │
    └─────────────────┘ └──────────────┘ └──────────────────┘
    Cria sessao         Preenche check    Modo independente
    Ve progresso live   Tira fotos        Gera PDF local
    Aprova/reprova      Submete           Sem banco
    Gera PDF final      Recebe feedback   NAO TOCAR
```

---

## 6. Relacao com Gate Check Existente (@onsite/framing)

O Monitor ja tem gate checks via `@onsite/framing` (`GateCheckView.tsx`).
Esse sistema usa tabelas `frm_gate_checks` e `frm_gate_check_items`.

**O live check NAO substitui o existente.** Sao dois caminhos:

| Aspecto | Gate Check Existente | Live Gate Check |
|---------|---------------------|-----------------|
| Tabelas | `frm_gate_checks` + `frm_gate_check_items` | `chk_sessions` + `chk_item_results` |
| Quem preenche | Supervisor no Monitor | Carpenter via link |
| Colaboracao | Nenhuma (solo) | Tempo real (2 pessoas) |
| Fotos | 1 por item (Storage) | Ate 6 por item (Storage) |
| Revisao | Nao tem | Supervisor aprova/reprova |
| Rework loop | Nao tem | Sim (multiplas rodadas) |
| PDF | Nao gera | Gera ao aprovar |

**Futuro:** Quando o live estiver maduro, o gate check existente pode ser
descontinuado. Mas por agora ambos coexistem na tab Gate Checks.

---

## 7. Tabelas Existentes Relevantes

| Tabela | Uso no Live Check |
|--------|-------------------|
| `egl_sites` | Nome do site (exibido no link do carpenter) |
| `egl_houses` | Lot number + status (auto-avanca ao aprovar) |
| `core_profiles` | supervisor_id, carpenter_id (opcional) |
| `core_organizations` | Scoping multi-tenant |

---

## 8. Estimativa por Fase

| Fase | Escopo | Complexidade |
|------|--------|-------------|
| 1. Migration | 3 tabelas + RLS + 4 funcoes | Baixa |
| 2. Monitor: criar sessao | 2 componentes + 1 API route | Media |
| 3. Checklist: /live/[token] | 4 arquivos novos, reutiliza UI | Media |
| 4. Monitor: Realtime + revisao | 1 componente + Realtime setup | Media-Alta |
| 5. Notificacoes + polish | Badge + push + historico | Baixa |

---

## 9. Riscos e Mitigacoes

| Risco | Mitigacao |
|-------|----------|
| Mexer no `/self/*` e quebrar producao | REGRA ZERO: nao tocar |
| Token previsivel/brute-forceable | Gerar token com `gen_random_uuid()` (32 chars) |
| Carpenter deixa sessao aberta pra sempre | TTL de 48h, limpar sessoes draft antigas |
| Muitas fotos = Storage caro | Comprimir antes (ja faz via compress.ts), max 6 por item |
| Realtime nao funciona em mobile Safari | Fallback: polling a cada 10s |
| Supervisor e carpenter em fusos diferentes | Timestamps sempre em UTC, exibir local |

---

## 10. Checklist Pre-Implementacao

```
[ ] 1. Templates de checklist estao corretos e atualizados?
[ ] 2. Bucket egl-media tem policy de upload para anon?
[ ] 3. Monitor tem @onsite/sharing para QR code?
[ ] 4. Checklist app tem @supabase/supabase-js instalado?
[ ] 5. Realtime esta habilitado no projeto Supabase?
[ ] 6. CORS permite acesso do dominio checklist.onsiteclub.ca?
[ ] 7. Environment vars do Supabase estao no Vercel?
```

---

*Documento criado por Cerbero — 2026-03-15*
