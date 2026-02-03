# OnSite Eagle — AI-Native Architecture

> **"O app não usa IA. O app É uma IA que usa humanos para validação."**

---

## 1. O Problema com Software Tradicional

### Como software sempre foi feito

```
┌─────────────────────────────────────────────────────────────┐
│                    SOFTWARE TRADICIONAL                      │
│                                                              │
│    Humano ──→ Input ──→ Regras Fixas ──→ Output ──→ Humano  │
│                              │                               │
│                              │                               │
│                    "if X then Y"                            │
│                    "validate field"                          │
│                    "save to database"                        │
│                                                              │
│    O software é uma FERRAMENTA passiva.                     │
│    Espera o humano agir.                                    │
│    Executa regras pré-definidas.                            │
│    Não aprende. Não melhora. Não pensa.                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Como IA é adicionada hoje (o erro comum)

```
┌─────────────────────────────────────────────────────────────┐
│              SOFTWARE + IA (abordagem típica)                │
│                                                              │
│    ┌─────────────────────────────────────────────────────┐  │
│    │              SOFTWARE TRADICIONAL                    │  │
│    │                                                      │  │
│    │   Forms, CRUD, dashboards, relatórios...            │  │
│    │                                                      │  │
│    └─────────────────────────────────────────────────────┘  │
│                           │                                  │
│                           │ (conexão fraca)                  │
│                           ▼                                  │
│    ┌─────────────────────────────────────────────────────┐  │
│    │                 CHATBOT NO CANTO                     │  │
│    │                                                      │  │
│    │   "Posso ajudar?" 🤖                                 │  │
│    │                                                      │  │
│    │   - Responde perguntas                              │  │
│    │   - Não tem contexto real                           │  │
│    │   - Não toma decisões                               │  │
│    │   - Feature opcional, ignorável                     │  │
│    └─────────────────────────────────────────────────────┘  │
│                                                              │
│    IA é um ADD-ON. Um módulo. Um widget.                    │
│    O software funcionaria igual sem ela.                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Exemplos desse padrão:**
- Notion AI (escreve texto, mas Notion funciona sem)
- GitHub Copilot (sugere código, mas VS Code funciona sem)
- Chatbots de suporte (respondem FAQs, mas o sistema funciona sem)

---

## 2. O Que Significa Ser AI-Native

### A inversão fundamental

```
┌─────────────────────────────────────────────────────────────┐
│                       AI-NATIVE                              │
│                                                              │
│                         ┌─────┐                              │
│                         │ IA  │                              │
│                         │CORE │                              │
│                         └──┬──┘                              │
│                            │                                 │
│          ┌─────────────────┼─────────────────┐              │
│          │                 │                 │              │
│          ▼                 ▼                 ▼              │
│    ┌──────────┐     ┌──────────┐     ┌──────────┐          │
│    │ Percebe  │     │ Decide   │     │   Age    │          │
│    │          │     │          │     │          │          │
│    │ - Fotos  │     │ - Valida │     │ - Cria   │          │
│    │ - Voz    │     │ - Alerta │     │ - Notifica│         │
│    │ - GPS    │     │ - Prediz │     │ - Agenda │          │
│    │ - Tempo  │     │ - Sugere │     │ - Aprende│          │
│    └──────────┘     └──────────┘     └──────────┘          │
│          │                 │                 │              │
│          └─────────────────┼─────────────────┘              │
│                            │                                 │
│                            ▼                                 │
│                    ┌──────────────┐                         │
│                    │   HUMANO     │                         │
│                    │  (valida)    │                         │
│                    └──────────────┘                         │
│                                                              │
│    IA É o sistema. Humano supervisiona.                     │
│    Sem IA, o app não funciona.                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### A diferença em uma frase

| Abordagem | Descrição |
|-----------|-----------|
| **Tradicional** | Humano faz, computador registra |
| **Software + IA** | Humano faz, IA ajuda às vezes |
| **AI-Native** | IA faz, humano valida quando necessário |

---

## 3. Por Que OnSite Eagle é Diferente

### Construção civil hoje

```
┌─────────────────────────────────────────────────────────────┐
│               COMO CONSTRUÇÃO FUNCIONA HOJE                  │
│                                                              │
│   Supervisor dirige até o site                              │
│           ↓                                                  │
│   Caminha pelo lote, olha cada canto                        │
│           ↓                                                  │
│   Detecta problemas com experiência (20+ anos)              │
│           ↓                                                  │
│   Anota num papel ou manda WhatsApp                         │
│           ↓                                                  │
│   Volta pro escritório, digita relatório                    │
│           ↓                                                  │
│   Manda email pro cliente                                   │
│           ↓                                                  │
│   Espera resposta                                           │
│           ↓                                                  │
│   Problema pode já ter virado retrabalho de $10k            │
│                                                              │
│   TEMPO: 2-3 dias entre problema e ação                     │
│   DEPENDE: 100% do conhecimento de UMA pessoa               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Apps de construção existentes

```
┌─────────────────────────────────────────────────────────────┐
│         APPS DE CONSTRUÇÃO NO MERCADO (Procore, etc)        │
│                                                              │
│   Worker abre app                                           │
│           ↓                                                  │
│   Preenche formulário manualmente                           │
│           ↓                                                  │
│   Tira foto, faz upload                                     │
│           ↓                                                  │
│   Supervisor HUMANO revisa                                  │
│           ↓                                                  │
│   Supervisor HUMANO decide se tem problema                  │
│           ↓                                                  │
│   Supervisor HUMANO cria tarefa                             │
│           ↓                                                  │
│   Supervisor HUMANO notifica pessoas                        │
│                                                              │
│   DIGITALIZOU o papel, mas ainda 100% dependente de humano  │
│   IA? Zero. Machine Learning? Zero. Automação real? Zero.   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### OnSite Eagle (AI-Native)

```
┌─────────────────────────────────────────────────────────────┐
│                     ONSITE EAGLE                             │
│                                                              │
│   Worker chega no site                                      │
│           ↓                                                  │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  PRUMO (IA): "Bom dia João. Lot 42 precisa de       │   │
│   │  fotos da Phase 3. Detectei possível problema       │   │
│   │  no canto NE ontem. Comece por lá."                 │   │
│   └─────────────────────────────────────────────────────┘   │
│           ↓                                                  │
│   Worker aponta câmera                                      │
│           ↓                                                  │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  PRUMO (tempo real): "Vejo shingles. Mova 2 passos  │   │
│   │  à direita para capturar a junção completa."        │   │
│   └─────────────────────────────────────────────────────┘   │
│           ↓                                                  │
│   Worker tira foto                                          │
│           ↓                                                  │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  PRUMO (instantâneo):                                │   │
│   │                                                      │   │
│   │  ✓ Shingles alinhados (99% confiança)               │   │
│   │  ✓ Flashing instalado (97% confiança)               │   │
│   │  ⚠ Gap detectado no vale (84% confiança)            │   │
│   │                                                      │   │
│   │  "Confirma o gap? Parece 2-3mm."                    │   │
│   └─────────────────────────────────────────────────────┘   │
│           ↓                                                  │
│   Worker: "Sim, tem gap"                                    │
│           ↓                                                  │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  PRUMO (automático):                                 │   │
│   │                                                      │   │
│   │  ✓ Issue criado: "Gap no vale do telhado"           │   │
│   │  ✓ Severidade: MÉDIA (847 casos similares)          │   │
│   │  ✓ Bob (contractor) notificado                      │   │
│   │  ✓ Sugestão: corrigir antes de Phase 4              │   │
│   │  ✓ Mike disponível, a 10min do site                 │   │
│   │                                                      │   │
│   │  "Quer que eu peça pro Mike vir corrigir?"          │   │
│   └─────────────────────────────────────────────────────┘   │
│           ↓                                                  │
│   Worker: "Sim"                                             │
│           ↓                                                  │
│   Mike recebe notificação, confirma, vai ao site            │
│           ↓                                                  │
│   TEMPO: 15 minutos entre detecção e ação                   │
│   DEPENDE: IA + validação humana simples                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Os Três Níveis de Autonomia

### Nível 1: IA Reativa (onde estamos hoje)

```
Humano age → IA responde

Worker tira foto → IA valida
Worker pergunta → IA responde
Worker decide tudo, IA é ferramenta
```

**Implementação atual:**
- Upload de foto → Claude Vision analisa
- Resultado: aprovado/rejeitado
- Humano ainda decide o que fazer com a informação

### Nível 2: IA Proativa (próximo passo)

```
IA sugere → Humano decide

IA: "Você deveria tirar foto do Lot 42"
IA: "Detectei problema, quer criar issue?"
IA: "Mike está livre, quer que eu notifique?"

Humano ainda tem poder de decisão final
```

**O que muda:**
- IA tem contexto completo (localização, hora, histórico)
- IA antecipa necessidades
- IA sugere ações específicas
- Humano pode aceitar/recusar com um toque

### Nível 3: IA Autônoma Supervisionada (Prumo 2027)

```
IA decide → Humano valida exceções

IA detecta problema
IA cria issue automaticamente
IA notifica pessoas relevantes
IA agenda correção
IA atualiza timeline
IA aprende com resultado

Humano só intervém quando:
- Confiança da IA < threshold
- Decisão de alto impacto ($$$)
- IA pede confirmação
- Humano discorda (feedback)
```

**O que muda:**
- IA é o "gerente" padrão
- Humano é "auditor" ocasional
- 90% das decisões são automáticas
- 10% precisam validação humana

---

## 5. Arquitetura Técnica

### Prumo: O Cérebro Central

```
┌─────────────────────────────────────────────────────────────┐
│                         PRUMO                                │
│                 (Cérebro do OnSite Eagle)                   │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                    PERCEPÇÃO                           │  │
│  │                                                        │  │
│  │  Vision        Voice        Location       Time        │  │
│  │  (fotos)       (calc)       (GPS)          (horas)     │  │
│  │                                                        │  │
│  │  "O que está   "O que o     "Onde está    "Quando      │  │
│  │   acontecendo?" worker       o worker?"    aconteceu?" │  │
│  │                 disse?"                                │  │
│  └───────────────────────────────────────────────────────┘  │
│                            │                                 │
│                            ▼                                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                    RACIOCÍNIO                          │  │
│  │                                                        │  │
│  │  Análise         Predição        Priorização          │  │
│  │                                                        │  │
│  │  "Isso é um      "Se não         "Isso é mais         │  │
│  │   problema?"      corrigir,       urgente que         │  │
│  │                   vai atrasar"    aquilo"             │  │
│  └───────────────────────────────────────────────────────┘  │
│                            │                                 │
│                            ▼                                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                      AÇÃO                              │  │
│  │                                                        │  │
│  │  Notifica       Cria          Agenda        Aprende   │  │
│  │                 Issues        Tarefas                  │  │
│  │                                                        │  │
│  │  "Bob precisa   "Issue #47    "Mike às      "Gap no   │  │
│  │   saber"         criado"       14h"          vale =   │  │
│  │                                              MÉDIA"   │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Apps como Interfaces Sensoriais

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│   Cada app é um SENTIDO do Prumo, não um produto separado   │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│   │   FIELD     │  │  TIMEKEEPER │  │ CALCULATOR  │        │
│   │             │  │             │  │             │        │
│   │   👁️ OLHOS  │  │   💓 PULSO  │  │   🖐️ MÃOS   │        │
│   │             │  │             │  │             │        │
│   │  Vê o que   │  │  Sente o    │  │  Faz os     │        │
│   │  acontece   │  │  ritmo do   │  │  cálculos   │        │
│   │  no site    │  │  trabalho   │  │  do trade   │        │
│   └─────────────┘  └─────────────┘  └─────────────┘        │
│          │                │                │                │
│          └────────────────┼────────────────┘                │
│                           │                                 │
│                           ▼                                 │
│                    ┌─────────────┐                          │
│                    │   MONITOR   │                          │
│                    │             │                          │
│                    │   🧠 MENTE  │                          │
│                    │             │                          │
│                    │  Onde Prumo │                          │
│                    │  mostra o   │                          │
│                    │  que pensa  │                          │
│                    └─────────────┘                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Fluxo de Dados

```
┌──────────────────────────────────────────────────────────────┐
│                      FLUXO AI-NATIVE                         │
│                                                               │
│   EVENTO                                                      │
│   (foto, entrada de hora, cálculo, localização)              │
│           │                                                   │
│           ▼                                                   │
│   ┌───────────────────────────────────────────────────────┐  │
│   │                 PRUMO PROCESSA                         │  │
│   │                                                        │  │
│   │   1. Contexto: quem, onde, quando, histórico          │  │
│   │   2. Análise: o que significa esse evento?            │  │
│   │   3. Decisão: o que fazer com isso?                   │  │
│   │   4. Confiança: quão certo estou?                     │  │
│   └───────────────────────────────────────────────────────┘  │
│           │                                                   │
│           ├──────────────────────────────────────┐           │
│           │                                      │           │
│           ▼                                      ▼           │
│   ┌───────────────────┐                 ┌───────────────────┐│
│   │ Confiança >= 90%  │                 │ Confiança < 90%   ││
│   │                   │                 │                   ││
│   │ IA age sozinha    │                 │ IA pede validação ││
│   │ - Aprova foto     │                 │ - "Confirma X?"   ││
│   │ - Cria issue      │                 │ - "Isso é Y?"     ││
│   │ - Notifica        │                 │                   ││
│   │ - Atualiza        │                 │ Humano responde   ││
│   │   progresso       │                 │ IA aprende        ││
│   └───────────────────┘                 └───────────────────┘│
│           │                                      │           │
│           └──────────────────┬───────────────────┘           │
│                              │                                │
│                              ▼                                │
│   ┌───────────────────────────────────────────────────────┐  │
│   │                    SUPABASE                            │  │
│   │                                                        │  │
│   │   ai_decisions: registra TODA decisão da IA           │  │
│   │   - input (contexto)                                   │  │
│   │   - output (decisão)                                   │  │
│   │   - confiança                                          │  │
│   │   - validação humana (se houve)                        │  │
│   │   - feedback (humano concordou?)                       │  │
│   │                                                        │  │
│   │   → Alimenta aprendizado contínuo                      │  │
│   └───────────────────────────────────────────────────────┘  │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## 6. Schema para IA

### Tabela Central: ai_decisions

```sql
CREATE TABLE ai_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- O que triggou essa decisão
  trigger_type VARCHAR(50) NOT NULL,
  -- photo_upload, time_entry, location_change,
  -- issue_detected, progress_update, schedule_request

  trigger_id UUID,  -- ID do evento original

  -- Contexto que a IA tinha
  context JSONB NOT NULL,
  -- {
  --   user_id, house_id, phase_id,
  --   previous_photos: [...],
  --   open_issues: [...],
  --   worker_history: {...},
  --   site_status: {...}
  -- }

  -- O que a IA decidiu
  decision_type VARCHAR(50) NOT NULL,
  -- approve, reject, create_issue, notify,
  -- suggest, schedule, escalate, ask_human

  decision_data JSONB NOT NULL,
  -- {
  --   action: "create_issue",
  --   issue: { title, severity, assigned_to },
  --   notifications: [{ to, message }],
  --   suggestions: [{ action, reason }]
  -- }

  confidence NUMERIC(3,2) NOT NULL,  -- 0.00 a 1.00
  reasoning TEXT,  -- Explicação da IA (para debug/audit)

  -- Ações que a IA executou automaticamente
  actions_executed JSONB,
  -- [
  --   { type: "insert", table: "egl_issues", id: "..." },
  --   { type: "notify", user_id: "...", message: "..." }
  -- ]

  -- Validação humana (se necessária)
  required_human_validation BOOLEAN DEFAULT FALSE,
  human_validated BOOLEAN,
  human_agreed BOOLEAN,  -- NULL = não validou, TRUE = concordou, FALSE = discordou
  human_feedback TEXT,   -- O que o humano disse
  human_correction JSONB, -- O que o humano corrigiu
  validated_by UUID REFERENCES core_profiles(id),
  validated_at TIMESTAMPTZ,

  -- Meta
  model_version VARCHAR(50),  -- Versão do Prumo que decidiu
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para análise
CREATE INDEX idx_ai_decisions_type ON ai_decisions(decision_type);
CREATE INDEX idx_ai_decisions_confidence ON ai_decisions(confidence);
CREATE INDEX idx_ai_decisions_disagreement ON ai_decisions(human_agreed)
  WHERE human_agreed = FALSE;  -- Para analisar onde a IA erra
```

### View: Onde a IA erra

```sql
CREATE VIEW v_ai_learning_opportunities AS
SELECT
  decision_type,
  trigger_type,
  COUNT(*) as total_decisions,
  COUNT(*) FILTER (WHERE human_agreed = FALSE) as disagreements,
  ROUND(
    COUNT(*) FILTER (WHERE human_agreed = FALSE)::numeric /
    NULLIF(COUNT(*) FILTER (WHERE human_validated), 0) * 100,
    2
  ) as disagreement_rate,
  AVG(confidence) as avg_confidence,
  AVG(confidence) FILTER (WHERE human_agreed = FALSE) as avg_confidence_when_wrong
FROM ai_decisions
WHERE human_validated = TRUE
GROUP BY decision_type, trigger_type
ORDER BY disagreement_rate DESC;
```

---

## 7. Implementação por Fase

### Fase 1: Foundation (Agora)

```
[ ] Criar packages/prumo/ (estrutura base)
[ ] Criar tabela ai_decisions
[ ] Integrar Claude Vision no upload de fotos
[ ] Registrar cada decisão da IA
[ ] UI básica para validação humana
```

**Resultado:** IA valida fotos, humano pode concordar/discordar.

### Fase 2: Proactive (Q2 2026)

```
[ ] IA sugere próximas ações ao worker
[ ] IA detecta problemas e pergunta confirmação
[ ] IA cria issues com confirmação humana
[ ] IA notifica pessoas relevantes
[ ] Dashboard de decisões da IA
```

**Resultado:** IA sugere, humano decide com um toque.

### Fase 3: Autonomous (Q3-Q4 2026)

```
[ ] IA age automaticamente quando confiança > 90%
[ ] IA aprende com feedback humano
[ ] IA melhora confiança com mais dados
[ ] Métricas de precisão por tipo de decisão
[ ] A/B testing de modelos
```

**Resultado:** IA age sozinha na maioria dos casos.

### Fase 4: Prumo Full (2027)

```
[ ] Modelo próprio treinado em dados reais
[ ] Predição de atrasos
[ ] Otimização de recursos (workers)
[ ] Detecção de padrões cross-site
[ ] API para terceiros
```

**Resultado:** IA como vantagem competitiva imbatível.

---

## 8. Por Que Isso Importa

### Para o Mercado

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│   259,000 casas/ano no Canadá                               │
│   × 7 phases por casa                                       │
│   × 2-5 fotos por phase                                     │
│   = 3.6 a 9 MILHÕES de fotos/ano                           │
│                                                              │
│   Se Prumo valida 90% automaticamente:                      │
│   = 3.2 a 8 milhões de decisões automáticas                 │
│   = Milhares de horas de supervisor economizadas            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Para o OnSite Club

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│   Cada decisão da IA:                                       │
│   - Gera dado de treinamento                                │
│   - Melhora o modelo                                        │
│   - Aumenta a barreira de entrada para competidores         │
│                                                              │
│   Após 2 anos:                                              │
│   - Milhões de decisões registradas                         │
│   - Modelo treinado em dados REAIS canadenses               │
│   - Conhecimento que nenhum competidor pode copiar          │
│                                                              │
│   MOAT = dados + modelo + tempo                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Para os Workers

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│   Antes: Supervisor critica trabalho 2 dias depois          │
│   Depois: IA valida em tempo real, worker corrige na hora   │
│                                                              │
│   Antes: Experiência fica na cabeça de quem tem 20 anos     │
│   Depois: IA transfere conhecimento para qualquer worker    │
│                                                              │
│   Antes: Erro vira retrabalho de $10k                       │
│   Depois: IA detecta antes de virar problema                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. Resumo

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│   OnSite Eagle não é um app que usa IA.                     │
│                                                              │
│   OnSite Eagle É uma IA chamada Prumo                       │
│   que usa apps como sensores                                │
│   e humanos como validadores.                               │
│                                                              │
│   Cada foto treina o modelo.                                │
│   Cada validação melhora a precisão.                        │
│   Cada dia que passa, Prumo fica mais inteligente.          │
│                                                              │
│   Em 2027, Prumo será o supervisor que nunca dorme,         │
│   nunca esquece, nunca perde um detalhe.                    │
│                                                              │
│   E um dia, Prumo vai controlar os robôs.                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

*Documento criado em 2026-02-01*
*OnSite Eagle — AI-Native desde o primeiro dia*
