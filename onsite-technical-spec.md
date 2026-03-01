# OnSite Club — Technical Specification
## Framing Operations System v1.0

> **Status:** Fonte de verdade do sistema. Todo código deve implementar este documento.
> **Escopo:** Exclusivo para operações de wood frame residencial.
> **Data:** Março 2026

---

## 1. Domínio do Negócio

### 1.1 O que é

Software para empresas de **wood framing** residencial no Canadá (Ottawa). A empresa de framing é contratada por uma construtora (builder) para construir a estrutura de madeira de casas residenciais. O software gerencia todo o ciclo: schedule, material, crews, fases, qualidade, segurança e pagamento.

### 1.2 O que NÃO é

- Não gerencia a construtora (eles têm sistema próprio)
- Não cobre drywall, HVAC, plumbing, elétrica, janelas, acabamentos
- Não é um ERP genérico de construção
- Não substitui o schedule da construtora

### 1.3 Cadeia de contratação

```
Construtora (builder/developer)         ← dono do site, compra material, agenda schedule
  └── Empresa de Framing                ← contratada principal, cliente do OnSite
        └── Subframers (2-5 pessoas)    ← subcontratos por fase/especialidade
              └── Workers por hora      ← quarteirizados dentro dos subframers
```

### 1.4 Comunicação

```
Construtora ──→ Foreman ──→ Crews/Workers
                  ↑              │
                  └──────────────┘
```

A construtora NUNCA se comunica diretamente com crews no site. Tudo passa pelo foreman.

---

## 2. Personas e Permissões

| Persona | Role ID | Vê | Faz |
|---------|---------|----|----|
| **Construtora** | `builder` | Progresso por lote, safety, status geral | Read-only. Não insere dados. |
| **Foreman/Supervisor** | `foreman` | Tudo — todos os lotes, crews, checklists, pagamentos | Gerencia tudo. Hub de comunicação. |
| **Crew Lead** | `crew_lead` | Seus lotes, suas fases, seus checklists, seus pagamentos | Solicita material, reporta progresso, resolve deficiências |
| **Worker** | `worker` | Seu lote atual, safety | Ponto (Timekeeper), reporta erros/safety |
| **Maquinista** | `operator` | Solicitações de equipamento | Aceita/agenda operações de máquina |

### RLS Strategy

Todas as tabelas `frm_*` usam RLS baseado em:
- `builder`: SELECT onde `jobsite_id` IN seus jobsites
- `foreman`: ALL onde `jobsite_id` IN seus jobsites
- `crew_lead`: SELECT/INSERT/UPDATE onde `crew_id` = sua crew
- `worker`: SELECT onde atribuído via `frm_phase_assignments`, INSERT em `frm_house_items` e `frm_safety_checks`
- `operator`: SELECT/UPDATE em `frm_equipment_requests`

---

## 3. Fases da Construção

### 3.1 As 6 fases + capping

| Código | Nome | Descrição | Crew típica |
|--------|------|-----------|-------------|
| `capping` | Capping | Sazonal (inverno). Cobre fundação para concreto não congelar. Aquecedor dentro. | Capping crew |
| `floor_1` | First Floor | Estrutura do piso térreo sobre a fundação | Framing crew |
| `walls_1` | First Floor Walls | Paredes externas e internas do térreo | Framing crew |
| `floor_2` | Second Floor | Estrutura do piso superior | Framing crew |
| `walls_2` | Second Floor Walls | Paredes externas e internas do 2º andar | Framing crew |
| `roof` | Roof | Estrutura do telhado (trusses, rafters, sheathing) | Roofing crew |
| `backframe_basement` | Backframe Basement | Backframe do porão | Backframe crew |
| `backframe_strapping` | Backframe Strapping | Strapping (preparação para drywall) | Strapping crew |
| `backframe_backing` | Backframe Backing | Alinhamento, fireplaces, escadas permanentes, limpeza | Backing crew |

### 3.2 Fluxo sequencial

```
[Construtora libera] → [capping?] → floor_1 → walls_1 → floor_2 → walls_2 → roof
                                                                                  │
                                                         [PAUSA: outras trades]   │
                                                                                  │
                                                backframe_basement → backframe_strapping → backframe_backing
                                                                                                        │
                                                                              [Inspeção final] → [Contrato encerrado]
```

### 3.3 Regras

- Fases são sequenciais dentro do framing (floor_1 antes de walls_1, etc.)
- Material vem do Lumberyard NUMERADO por fase
- Entre `roof` e `backframe_*`, a equipe de carpintaria SAI e outras trades entram (HVAC, plumbing, elétrica, janelas)
- Backframe só inicia quando outras trades terminam
- Capping é OPCIONAL (só no inverno)
- Uma crew pode fazer múltiplas fases do mesmo lote

---

## 4. Schema do Banco de Dados

### 4.1 Prefixo: `frm_`

Todas as tabelas do sistema de framing usam o prefixo `frm_`. Tabelas existentes de outros módulos (core_*, tmk_*, egl_*) permanecem inalteradas.

### 4.2 Tabelas

#### `frm_jobsites`
O desenvolvimento/subdivision. Pode ter dezenas ou centenas de lotes.

```sql
CREATE TABLE frm_jobsites (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name            TEXT NOT NULL,                          -- "Riverside Phase 3"
  builder_name    TEXT NOT NULL,                          -- nome da construtora
  address         TEXT,
  city            TEXT DEFAULT 'Ottawa',
  total_lots      INTEGER DEFAULT 0,
  status          TEXT DEFAULT 'active',                  -- active | paused | completed
  foreman_id      UUID REFERENCES core_profiles(id),
  lumberyard_notes TEXT,                                  -- info do lumberyard desse site
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
```

#### `frm_lots`
Cada casa/lote dentro do jobsite.

```sql
CREATE TABLE frm_lots (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  jobsite_id      UUID NOT NULL REFERENCES frm_jobsites(id) ON DELETE CASCADE,
  lot_number      TEXT NOT NULL,                          -- "157", "B-12"
  block           TEXT,                                   -- bloco se aplicável
  model           TEXT,                                   -- modelo da casa
  total_sqft      NUMERIC(10,2),                          -- sqft total
  status          TEXT DEFAULT 'pending',                 -- pending | released | in_progress | paused_for_trades | backframe | inspection | completed
  released_at     TIMESTAMPTZ,                            -- quando construtora liberou
  started_at      TIMESTAMPTZ,                            -- quando framing começou
  completed_at    TIMESTAMPTZ,                            -- quando backframe terminou
  current_phase   TEXT,                                   -- fase atual (código)
  has_capping     BOOLEAN DEFAULT FALSE,
  blueprint_url   TEXT,                                   -- link para planta
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(jobsite_id, lot_number)
);
```

#### `frm_phases`
Definição estática das fases. Seed data.

```sql
CREATE TABLE frm_phases (
  id              TEXT PRIMARY KEY,                       -- 'floor_1', 'walls_1', etc.
  name            TEXT NOT NULL,
  description     TEXT,
  sort_order      INTEGER NOT NULL,
  is_backframe    BOOLEAN DEFAULT FALSE,
  is_optional     BOOLEAN DEFAULT FALSE                   -- capping é opcional
);

-- Seed
INSERT INTO frm_phases VALUES
  ('capping',               'Capping',               'Cobertura de fundação (inverno)',           0, false, true),
  ('floor_1',               'First Floor',           'Piso térreo',                               1, false, false),
  ('walls_1',               'First Floor Walls',     'Paredes térreo',                            2, false, false),
  ('floor_2',               'Second Floor',          'Piso superior',                             3, false, false),
  ('walls_2',               'Second Floor Walls',    'Paredes 2º andar',                          4, false, false),
  ('roof',                  'Roof',                  'Telhado',                                   5, false, false),
  ('backframe_basement',    'Backframe Basement',    'Backframe porão',                           6, true,  false),
  ('backframe_strapping',   'Backframe Strapping',   'Strapping',                                 7, true,  false),
  ('backframe_backing',     'Backframe Backing',     'Backing, escadas, fireplaces, limpeza',     8, true,  false);
```

#### `frm_crews`
Empresas/subframers.

```sql
CREATE TABLE frm_crews (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name            TEXT NOT NULL,                          -- "Crew do João", "ABC Roofing"
  lead_id         UUID REFERENCES core_profiles(id),      -- crew lead
  specialty       TEXT[],                                  -- ['framing','backframe'], ['roofing'], etc.
  phone           TEXT,
  email           TEXT,
  wsib_number     TEXT,                                   -- WSIB certificate
  wsib_expires    DATE,
  status          TEXT DEFAULT 'active',                  -- active | inactive | suspended
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

#### `frm_crew_workers`
Workers dentro de uma crew.

```sql
CREATE TABLE frm_crew_workers (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  crew_id         UUID NOT NULL REFERENCES frm_crews(id) ON DELETE CASCADE,
  worker_id       UUID NOT NULL REFERENCES core_profiles(id),
  role            TEXT DEFAULT 'worker',                  -- worker | lead
  employment_type TEXT DEFAULT 'subcontract',             -- employee | hourly | subcontract
  joined_at       TIMESTAMPTZ DEFAULT now(),
  left_at         TIMESTAMPTZ,
  UNIQUE(crew_id, worker_id)
);
```

#### `frm_phase_assignments`
Qual crew faz qual fase de qual lote. Many-to-many.

```sql
CREATE TABLE frm_phase_assignments (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lot_id          UUID NOT NULL REFERENCES frm_lots(id) ON DELETE CASCADE,
  phase_id        TEXT NOT NULL REFERENCES frm_phases(id),
  crew_id         UUID NOT NULL REFERENCES frm_crews(id),
  status          TEXT DEFAULT 'assigned',                -- assigned | in_progress | completed | on_hold
  assigned_at     TIMESTAMPTZ DEFAULT now(),
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  notes           TEXT,
  UNIQUE(lot_id, phase_id, crew_id)
);
```

#### `frm_material_requests`
Solicitação de material do Lumberyard por fase.

```sql
CREATE TABLE frm_material_requests (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lot_id          UUID NOT NULL REFERENCES frm_lots(id),
  phase_id        TEXT NOT NULL REFERENCES frm_phases(id),
  requested_by    UUID NOT NULL REFERENCES core_profiles(id),  -- carpinteiro
  authorized_by   UUID REFERENCES core_profiles(id),           -- foreman (se necessário)
  operator_id     UUID REFERENCES core_profiles(id),           -- maquinista que entrega
  status          TEXT DEFAULT 'requested',               -- requested | authorized | delivering | delivered
  requested_at    TIMESTAMPTZ DEFAULT now(),
  authorized_at   TIMESTAMPTZ,
  delivered_at    TIMESTAMPTZ,
  notes           TEXT
);
```

#### `frm_equipment_requests`
Solicitação de máquina/crane (movimentos pontuais).

```sql
CREATE TABLE frm_equipment_requests (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lot_id          UUID NOT NULL REFERENCES frm_lots(id),
  phase_id        TEXT NOT NULL REFERENCES frm_phases(id),
  requested_by    UUID NOT NULL REFERENCES core_profiles(id),
  operator_id     UUID REFERENCES core_profiles(id),
  operation_type  TEXT NOT NULL,                           -- 'lift_beam', 'lift_truss', 'material_move'
  description     TEXT,
  status          TEXT DEFAULT 'requested',               -- requested | scheduled | in_progress | completed
  priority        TEXT DEFAULT 'normal',                  -- normal | urgent
  requested_at    TIMESTAMPTZ DEFAULT now(),
  scheduled_at    TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ
);
```

#### `frm_phase_payments`
Pagamento por fase/sqft/crew. Valores vêm da planta.

```sql
CREATE TABLE frm_phase_payments (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lot_id          UUID NOT NULL REFERENCES frm_lots(id),
  phase_id        TEXT NOT NULL REFERENCES frm_phases(id),
  crew_id         UUID NOT NULL REFERENCES frm_crews(id),
  sqft            NUMERIC(10,2) NOT NULL,
  rate_per_sqft   NUMERIC(8,4) NOT NULL,
  total           NUMERIC(12,2) GENERATED ALWAYS AS (sqft * rate_per_sqft) STORED,
  status          TEXT DEFAULT 'unpaid',                  -- unpaid | pending | approved | paid
  approved_by     UUID REFERENCES core_profiles(id),
  approved_at     TIMESTAMPTZ,
  paid_at         TIMESTAMPTZ,
  deductions      NUMERIC(10,2) DEFAULT 0,                -- deduções (erros, retrabalho)
  extras          NUMERIC(10,2) DEFAULT 0,                -- extras (trabalho adicional)
  final_amount    NUMERIC(12,2) GENERATED ALWAYS AS (sqft * rate_per_sqft - deductions + extras) STORED,
  notes           TEXT,
  UNIQUE(lot_id, phase_id, crew_id)
);
```

#### `frm_house_items` — Documento Vivo

O documento vivo da casa. Cresce durante toda a obra. Qualquer pessoa alimenta.

```sql
CREATE TABLE frm_house_items (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lot_id          UUID NOT NULL REFERENCES frm_lots(id),
  phase_id        TEXT REFERENCES frm_phases(id),          -- fase onde foi encontrado
  crew_id         UUID REFERENCES frm_crews(id),           -- crew responsável (auto via phase_assignment)
  type            TEXT NOT NULL,                           -- deficiency | structural | safety | builder_note | measurement
  severity        TEXT DEFAULT 'medium',                   -- low | medium | high | critical
  title           TEXT NOT NULL,
  description     TEXT,
  photo_url       TEXT NOT NULL,                           -- foto obrigatória na abertura
  reported_by     UUID NOT NULL REFERENCES core_profiles(id),
  reported_at     TIMESTAMPTZ DEFAULT now(),
  status          TEXT DEFAULT 'open',                    -- open | in_progress | resolved | escalated
  blocking        BOOLEAN DEFAULT FALSE,                  -- bloqueia avanço de fase?
  resolved_by     UUID REFERENCES core_profiles(id),
  resolved_at     TIMESTAMPTZ,
  resolved_photo  TEXT,                                   -- foto obrigatória na resolução
  resolution_note TEXT,
  gate_check_id   UUID REFERENCES frm_gate_checks(id)     -- se veio de um gate check
);
```

#### `frm_gate_checks` — Handoff entre Trades

Quality gate obrigatório entre cada transição.

```sql
CREATE TABLE frm_gate_checks (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lot_id          UUID NOT NULL REFERENCES frm_lots(id),
  transition      TEXT NOT NULL,                          -- framing_to_roofing | roofing_to_trades | trades_to_backframe | backframe_to_final
  checked_by      UUID NOT NULL REFERENCES core_profiles(id),
  status          TEXT DEFAULT 'in_progress',             -- in_progress | passed | blocked
  started_at      TIMESTAMPTZ DEFAULT now(),
  completed_at    TIMESTAMPTZ,
  released_at     TIMESTAMPTZ                             -- quando liberou para próxima trade
);

CREATE TABLE frm_gate_check_items (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gate_check_id   UUID NOT NULL REFERENCES frm_gate_checks(id) ON DELETE CASCADE,
  item_code       TEXT NOT NULL,                          -- 'joist_clearance', 'window_size', etc.
  item_label      TEXT NOT NULL,                          -- nome legível
  result          TEXT DEFAULT 'pending',                 -- pending | pass | fail | na
  photo_url       TEXT,                                   -- foto obrigatória
  notes           TEXT,
  deficiency_id   UUID REFERENCES frm_house_items(id)     -- se fail, link para deficiency criada
);
```

##### Gate Check Templates

```sql
CREATE TABLE frm_gate_check_templates (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transition      TEXT NOT NULL,
  item_code       TEXT NOT NULL,
  item_label      TEXT NOT NULL,
  sort_order      INTEGER DEFAULT 0,
  is_blocking     BOOLEAN DEFAULT TRUE,                   -- se fail, bloqueia liberação
  UNIQUE(transition, item_code)
);

-- Seed: framing_to_roofing
INSERT INTO frm_gate_check_templates (transition, item_code, item_label, sort_order) VALUES
  ('framing_to_roofing', 'joist_clearance',  'Joist livre para encanamento',    1),
  ('framing_to_roofing', 'window_size',      'Tamanho de janelas confere',      2),
  ('framing_to_roofing', 'landing_size',     'Landing de escada nas medidas',   3),
  ('framing_to_roofing', 'stair_opening',    'Buraco de escada correto',        4),
  ('framing_to_roofing', 'kitchen_wall',     'Parede de cozinha nas medidas',   5),
  ('framing_to_roofing', 'level_square',     'Nível e esquadro OK',             6),
  ('framing_to_roofing', 'stud_spacing',     'Espaçamento de studs correto',    7),
  ('framing_to_roofing', 'temp_safety',      'Safety temporários no lugar',     8),
  ('framing_to_roofing', 'cleanup',          'Área limpa e organizada',         9),
  ('framing_to_roofing', 'point_loads',      'Point loads corretos',           10),
  ('framing_to_roofing', 'door_plate',       'Plate de porta cortado',         11);
```

#### `frm_warnings` — Advertências Persistentes

Popups que não somem até serem resolvidos.

```sql
CREATE TABLE frm_warnings (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lot_id          UUID REFERENCES frm_lots(id),           -- null se pessoal/compliance
  target_type     TEXT NOT NULL,                           -- crew | worker | all
  target_id       UUID,                                    -- crew_id ou worker_id (null se all)
  category        TEXT NOT NULL,                           -- safety | compliance | operational
  title           TEXT NOT NULL,
  description     TEXT,
  sent_by         UUID REFERENCES core_profiles(id),       -- null se automático
  priority        TEXT DEFAULT 'warning',                  -- critical | warning | info
  persistent      BOOLEAN DEFAULT TRUE,
  dismissable     BOOLEAN DEFAULT TRUE,                    -- false para safety
  status          TEXT DEFAULT 'active',                   -- active | resolved | expired | dismissed
  resolved_by     UUID REFERENCES core_profiles(id),
  resolved_at     TIMESTAMPTZ,
  resolved_proof  TEXT,                                    -- foto ou documento
  expires_at      TIMESTAMPTZ,                             -- para compliance
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

#### `frm_certifications` — Certificações de Workers

```sql
CREATE TABLE frm_certifications (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id       UUID NOT NULL REFERENCES core_profiles(id),
  cert_type       TEXT NOT NULL,                           -- 'working_at_heights', 'whmis', 'first_aid', 'wsib'
  cert_number     TEXT,
  issued_at       DATE,
  expires_at      DATE,
  document_url    TEXT,                                    -- comprovante uploaded
  verified_by     UUID REFERENCES core_profiles(id),       -- foreman que verificou
  verified_at     TIMESTAMPTZ,
  status          TEXT DEFAULT 'pending',                  -- pending | verified | expired | rejected
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

#### `frm_safety_checks`

```sql
CREATE TABLE frm_safety_checks (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lot_id          UUID NOT NULL REFERENCES frm_lots(id),
  phase_id        TEXT REFERENCES frm_phases(id),
  type            TEXT NOT NULL,                           -- guardrail | fall_protection | ramp | brace | epi | signage
  status          TEXT DEFAULT 'open',                    -- open | resolved | escalated
  blocking        BOOLEAN DEFAULT TRUE,                   -- safety sempre bloqueia por padrão
  reported_by     UUID NOT NULL REFERENCES core_profiles(id),
  photo_url       TEXT NOT NULL,
  description     TEXT,
  resolved_by     UUID REFERENCES core_profiles(id),
  resolved_at     TIMESTAMPTZ,
  resolved_photo  TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

#### `frm_trade_pauses`
Período entre roof e backframe quando outras trades trabalham.

```sql
CREATE TABLE frm_trade_pauses (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lot_id          UUID NOT NULL REFERENCES frm_lots(id),
  started_at      TIMESTAMPTZ NOT NULL,                   -- quando framing saiu
  expected_end    TIMESTAMPTZ,                             -- previsão de retorno
  ended_at        TIMESTAMPTZ,                             -- quando trades terminaram
  trades_in       TEXT[],                                  -- ['hvac', 'plumbing', 'electrical', 'windows']
  notes           TEXT
);
```

#### `frm_third_party_entries`

```sql
CREATE TABLE frm_third_party_entries (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lot_id          UUID NOT NULL REFERENCES frm_lots(id),
  phase_id        TEXT REFERENCES frm_phases(id),
  company         TEXT NOT NULL,                           -- empresa que entrou
  purpose         TEXT NOT NULL,                           -- 'measure_stairs', 'measure_doors', 'measure_posts', 'install_posts'
  entered_at      TIMESTAMPTZ DEFAULT now(),
  exited_at       TIMESTAMPTZ,
  authorized_by   UUID REFERENCES core_profiles(id),       -- foreman que autorizou
  notes           TEXT
);
```

#### `frm_return_visits`

```sql
CREATE TABLE frm_return_visits (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lot_id          UUID NOT NULL REFERENCES frm_lots(id),
  crew_id         UUID REFERENCES frm_crews(id),
  reason          TEXT NOT NULL,
  requested_by    UUID REFERENCES core_profiles(id),       -- quem pediu o retorno
  assigned_to     UUID REFERENCES core_profiles(id),       -- quem vai resolver
  status          TEXT DEFAULT 'pending',                  -- pending | scheduled | completed
  scheduled_at    TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  photo_before    TEXT,
  photo_after     TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

---

## 5. Caminhos Independentes (Paths)

Cada um destes caminhos opera com seu próprio timeline, dependências e responsáveis.

### 5.1 Material por Fase
```
Construtora compra → Lumberyard (numerado por fase)
  → Carpinteiro solicita (frm_material_requests)
  → Maquinista autoriza/entrega
  → Material no lote
```

### 5.2 Postes de Ferro (CRITICAL PATH)
```
Fase walls_1/floor_2: terceiro mede (frm_third_party_entries)
  → Construtora encomenda (lead time 2-3 semanas)
  → Fase roof: entrega no site
  → Empresa externa instala/solda
  → Máquina levanta beams (frm_equipment_requests)
```

### 5.3 Escadas Temporárias
```
Fase walls_1: solicitação (frm_material_requests com tag 'temp_stairs')
  → Instalação durante construção
  → Backframe: remoção quando escada permanente entra
```

### 5.4 Máquina/Crane
```
Momento pontual → Solicitação (frm_equipment_requests)
  → Maquinista aceita/agenda
  → Operação (lift_beam, lift_truss, material_move)
  → Libera
```

### 5.5 Outras Trades (Pausa)
```
Roof completo → Equipe sai → frm_trade_pauses criado
  → HVAC, plumbing, elétrica, janelas trabalham
  → Trades terminam → frm_trade_pauses.ended_at preenchido
  → Gate check (trades_to_backframe)
  → Backframe autorizado
```

### 5.6 Medições por Terceiros
```
Fases walls_1/floor_2: terceiros entram (frm_third_party_entries)
  → Medem escadas, portas, postes
  → Registram entrada/saída
  → Voltam na fase correspondente para instalar
```

### 5.7 Documento Vivo (Quality)
```
Qualquer momento → Worker/supervisor/construtora cria item (frm_house_items)
  → Item roteado por fase → crew responsável (via frm_phase_assignments)
  → Crew resolve com foto → status = resolved
  → OU fica aberto → aparece no checklist final
  → Checklist final = soma(items) - soma(resolved) = pendentes
```

### 5.8 Gate Checks (Handoffs)
```
Trade termina → Foreman inicia gate check (frm_gate_checks)
  → Template carregado (frm_gate_check_templates)
  → Cada item: pass/fail com foto
  → Fails → criam items no documento vivo (frm_house_items)
  → Todos pass → casa liberada para próxima trade
  → Algum fail → casa BLOQUEADA
```

### 5.9 Safety (Camada Global)
```
A qualquer momento → Qualquer pessoa reporta (frm_safety_checks)
  → Notifica TODOS (crew + supervisor + construtora)
  → blocking = true → fase NÃO avança
  → Resolução com foto obrigatória
  → Também gera frm_warnings persistentes
```

### 5.10 Advertências
```
Foreman envia → frm_warnings com target_type/target_id
  → Popup persistente na tela do destinatário
  → Não some até resolver com foto/comprovante
  → Safety: vermelho, não minimizável, não dispensável
  → Compliance: amarelo, auto-gerado quando certificação vence
  → Operacional: azul, minimizável
```

### 5.11 Pagamento
```
Planta define sqft e rate por fase → frm_phase_payments criado quando crew é atribuída
  → Fase completa → status = pending
  → Foreman aprova (com deduções/extras se houver) → approved
  → Pagamento efetuado → paid
```

### 5.12 Contrato/Retornos
```
Backframe completo → Inspeção final (gate check backframe_to_final)
  → Contrato encerrado → lot.status = completed
  → Retornos eventuais → frm_return_visits com foto before/after
```

---

## 6. Mapeamento para Apps Existentes

| App | Estado atual | Refatoração necessária |
|-----|-------------|----------------------|
| **Monitor** | Demo funcional, sheets para checklist | REFATORAR: vira o hub do documento vivo (frm_house_items), gate checks, safety checks. Sheets → database. Adicionar roteamento inteligente por crew/fase. |
| **Timekeeper** | Funcional com geofencing | INTEGRAR: vincular clock-in/out a lot_id + phase_id. Worker bate ponto → sistema sabe em qual lote/fase está trabalhando. |
| **Field** | Fotos básicas | INTEGRAR: fotos alimentam frm_house_items e frm_safety_checks. Cada foto taggeada com lot_id + phase_id. |
| **Operator** | QR/câmera | ADAPTAR: vira o app do maquinista. Recebe frm_equipment_requests. QR scan pode ser usado pra confirmar entrega de material. |
| **Inspect** | Checklists básicos | REFATORAR: vira gate check tool. Templates carregados de frm_gate_check_templates. |
| **Calculator** | Cálculos com voz | MANTER: standalone, sem refatoração. |
| **Analytics** | Dashboard demo | REFATORAR: dashboards puxando de frm_* tables. Progresso por lote, por crew, por fase. Pagamentos. Safety. |
| **Dashboard** | Admin demo | INTEGRAR: gestão de crews, jobsites, lotes, phase assignments. |
| **Auth** | Funcional | EXPANDIR: adicionar roles (builder, foreman, crew_lead, worker, operator). |
| **Payments** | Em desenvolvimento | INTEGRAR: conectar com frm_phase_payments. |

---

## 7. Regras de Negócio Críticas

1. **Foto obrigatória**: Toda abertura e resolução de item requer foto. Sem foto = não salva.
2. **Safety bloqueia**: Item de safety com blocking=true impede avanço de fase.
3. **Gate check bloqueia**: Casa não avança para próxima trade sem gate check passed.
4. **Roteamento inteligente**: Checklist é por casa, mas cada item vai SÓ pra crew da fase correspondente. Safety vai pra todos.
5. **Foreman é hub**: Construtora não se comunica com crews. Tudo via foreman.
6. **Material por fase**: Não se entrega material de fase futura antecipadamente.
7. **Advertências persistentes**: Safety popups não são dispensáveis. Compliance popups voltam até resolver.
8. **Pagamento calculado**: total = sqft × rate_per_sqft. final_amount = total - deductions + extras.
9. **Certificações auto-monitoradas**: Sistema gera warning automático quando certificação está vencendo (15 dias antes).
10. **Construtora read-only**: Builder vê tudo mas não insere dados no sistema.
