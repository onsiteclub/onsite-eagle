# Diretiva de Implementação: Framing Operations System
## Para o agente de desenvolvimento

> **Documento de referência:** `onsite-technical-spec.md` — essa é a fonte de verdade. Toda decisão técnica que não esteja aqui, consulte Cris antes de implementar.

---

## Contexto

O monorepo OnSite Eagle tem ~10 apps e ~17 packages. A maioria está em estado de demo/scaffold. O sistema precisa ser refatorado para implementar o Framing Operations System descrito no technical spec.

**Liberdade de refatoração: TOTAL.** Não há dados em produção. Pode quebrar, reestruturar, renomear. A prioridade é implementar o sistema correto, não preservar código demo.

---

## Sua Primeira Tarefa

ANTES de escrever qualquer código:

1. **Leia** o `onsite-technical-spec.md` completamente
2. **Investigue** o monorepo inteiro:
   - Quais apps existem e o que cada um faz hoje
   - Quais packages existem e o que cada um exporta
   - Qual é o schema atual do Supabase (tabelas, RLS, views)
   - Quais tabelas existem com prefixo `core_*`, `tmk_*`, `egl_*`
   - Qual é a estrutura de autenticação atual
   - Como os apps se conectam ao Supabase (SSR? direct? anon key?)
3. **Mapeie** o gap entre o estado atual e o technical spec:
   - Quais tabelas `frm_*` precisam ser criadas
   - Quais apps precisam de refatoração vs integração vs manter como está
   - Quais packages precisam ser criados ou modificados
   - Quais RLS policies precisam ser criadas
4. **Volte com um plano de implementação** organizado em sprints antes de codar

---

## Estrutura de Sprints Sugerida

O plano abaixo é uma SUGESTÃO. Ajuste conforme o que encontrar no monorepo.

### Sprint 0 — Fundação (1 semana)
**Objetivo:** Database pronto, auth expandido, seed data.

- [ ] Criar migration com TODAS as tabelas `frm_*` do technical spec
- [ ] Seed data: phases, gate check templates
- [ ] Expandir sistema de roles: adicionar `builder`, `foreman`, `crew_lead`, `worker`, `operator`
- [ ] Criar RLS policies para todas as tabelas `frm_*`
- [ ] Criar package `@onsite/framing` com types TypeScript para todas as entidades
- [ ] Verificar se `core_profiles` suporta os campos necessários (crew_id, role, certifications)

### Sprint 1 — Core Loop: Lotes + Fases + Crews (1-2 semanas)
**Objetivo:** Foreman consegue criar jobsite, adicionar lotes, atribuir crews a fases.

Apps afetados: **Dashboard** (gestão), **Auth** (roles)

- [ ] Dashboard: tela de gestão de jobsites (CRUD)
- [ ] Dashboard: tela de gestão de lotes dentro de um jobsite
- [ ] Dashboard: tela de atribuição de crews a fases (frm_phase_assignments)
- [ ] Dashboard: tela de gestão de crews (CRUD)
- [ ] Visualização de progresso: qual lote está em qual fase
- [ ] Status flow do lote: pending → released → in_progress → paused_for_trades → backframe → inspection → completed

### Sprint 2 — Documento Vivo + Gate Checks (2 semanas)
**Objetivo:** Monitor vira o hub de qualidade. Checklist inteligente com roteamento.

Apps afetados: **Monitor** (refatoração principal), **Inspect** (vira gate check), **Field** (fotos)

- [ ] **Monitor: REFATORAR completamente** — tirar sistema de sheets, implementar frm_house_items
  - [ ] Formulário de novo item: tipo, severidade, fase, foto (obrigatória), descrição
  - [ ] Auto-preenchimento de crew_id via frm_phase_assignments (dado lot_id + phase_id)
  - [ ] Lista de items por lote com filtros (por fase, por crew, por status, por tipo)
  - [ ] Resolução de item: foto obrigatória, nota, muda status
  - [ ] Roteamento: crew lead vê SÓ items das suas fases. Safety vai pra todos.
- [ ] **Inspect: REFATORAR** — vira ferramenta de gate check
  - [ ] Foreman seleciona lote + transição → carrega template de frm_gate_check_templates
  - [ ] Cada item: pass/fail/na com foto
  - [ ] Fail → auto-cria item em frm_house_items com link (gate_check_id)
  - [ ] Todos pass → libera lote para próxima trade
  - [ ] Algum fail → lote BLOQUEADO, mostra itens pendentes
- [ ] **Field: INTEGRAR** — fotos taggeadas com lot_id + phase_id
  - [ ] Foto tirada → pode ser anexada a um frm_house_items existente
  - [ ] OU cria novo item diretamente da foto

### Sprint 3 — Safety + Warnings (1 semana)
**Objetivo:** Safety como camada que bloqueia. Advertências persistentes.

Apps afetados: **Monitor** (safety tab), **Timekeeper** (warnings no app do worker)

- [ ] Monitor: tab/seção de safety separada
  - [ ] Reportar safety check (frm_safety_checks)
  - [ ] Safety com blocking=true impede avanço de fase no sistema
  - [ ] Notificação para TODOS quando safety é reportado
- [ ] Sistema de warnings (frm_warnings)
  - [ ] Foreman cria warning → popup na tela do destinatário
  - [ ] Worker recebe popup persistente (não some até resolver)
  - [ ] Worker resolve enviando foto/comprovante
  - [ ] Visual: 🔴 safety (não minimizável) | 🟡 compliance | 🔵 operacional
- [ ] Auto-warnings para certificações (frm_certifications)
  - [ ] Cron/trigger: 15 dias antes do vencimento → cria warning automático
  - [ ] Worker pode enviar comprovante renovado → foreman verifica → warning some

### Sprint 4 — Pagamentos + Material (1-2 semanas)
**Objetivo:** Pagamento por fase/sqft funcional. Solicitação de material.

Apps afetados: **Payments** (integrar), **Dashboard** (pagamento), **Operator** (material)

- [ ] frm_phase_payments: CRUD pelo foreman
  - [ ] Ao atribuir crew a fase → auto-cria payment entry com sqft e rate da planta
  - [ ] Fase completa → status muda para pending
  - [ ] Foreman aprova (com deduções/extras opcionais)
  - [ ] Dashboard de pagamentos por crew, por lote, por período
- [ ] frm_material_requests: fluxo de solicitação
  - [ ] Crew lead solicita material da fase X
  - [ ] Se foreman autorização necessária → notifica foreman
  - [ ] Maquinista recebe e entrega
- [ ] frm_equipment_requests: solicitações pontuais
  - [ ] Crew solicita máquina (tipo, urgência)
  - [ ] Operador aceita/agenda
  - [ ] Operador confirma conclusão

### Sprint 5 — Integração Timekeeper + Analytics (1 semana)
**Objetivo:** Ponto vinculado a lote/fase. Dashboards reais.

Apps afetados: **Timekeeper** (integrar), **Analytics** (refatorar)

- [ ] Timekeeper: ao bater ponto, vincular a lot_id + phase_id
  - [ ] Worker seleciona lote e fase ao fazer clock-in
  - [ ] OU auto-detectar via geofencing do lote
  - [ ] Horas por worker por fase por lote → alimenta analytics
- [ ] Analytics: dashboards puxando de frm_*
  - [ ] Progresso por jobsite (quantos lotes em cada status)
  - [ ] Progresso por lote (fases completas vs pendentes)
  - [ ] Performance por crew (tempo médio por fase, deficiências)
  - [ ] Pagamentos (total pago, pendente, por crew)
  - [ ] Safety (items abertos, tempo de resolução)

### Sprint 6 — Builder View + Polish (1 semana)
**Objetivo:** Construtora tem visibilidade read-only.

- [ ] Tela específica para builder role (read-only)
  - [ ] Visão de todos os lotes do jobsite com status
  - [ ] Safety items abertos
  - [ ] Progresso geral (quantas casas em cada fase)
  - [ ] SEM acesso a pagamentos, crews, dados internos da empresa de framing
- [ ] Token-based access (alternativa a login, como o investor dashboard)

---

## Decisões Técnicas que Você Deve Tomar

Ao investigar o monorepo, responda estas perguntas no seu plano:

1. **Package `@onsite/framing`**: Cria novo ou extende `@onsite/shared`?
2. **Migrations**: Uma grande migration ou uma por sprint? (recomendo uma grande, é mais limpo)
3. **Monitor refactoring**: Reescrever do zero ou refatorar incrementalmente? (recomendo reescrever, é demo)
4. **Inspect**: Mesmo caso — reescrever como gate check tool?
5. **Realtime**: Warnings/safety precisam de realtime subscriptions ou polling é suficiente?
6. **Storage**: Fotos vão pro Supabase Storage? Já está configurado?
7. **Notifications**: Push notifications pro mobile (Expo) ou só in-app?

---

## Regras para o Agente

1. **Não implemente sem plano aprovado.** Volte com o plano primeiro.
2. **Technical spec é lei.** Se algo não está no spec, pergunte antes de inventar.
3. **Teste cada sprint.** Cada sprint deve ter um estado funcional no final.
4. **Priorize o core loop.** Se tiver que cortar escopo, corte do Sprint 5-6, nunca do 0-3.
5. **Mantenha o prefixo frm_.** Não misture com tabelas de outros módulos.
6. **RLS desde o dia 1.** Não crie tabelas sem policy.
7. **Fotos são obrigatórias.** Se o spec diz "foto obrigatória", o form não salva sem foto. Sem exceção.
