# Arquitetura Ampulheta (Hourglass Architecture)

> O modelo de dados do OnSite Club: Coleta → Centralizacao → Inteligencia

---

## O Conceito

A arquitetura do OnSite Club segue o modelo de uma **ampulheta** (hourglass), com tres camadas distintas:

```
     ┌─────────────────────────────────────────┐
     │         COLETA (Topo / Collection)       │
     │    Multiple specialized apps, each       │
     │    capturing specific real-world data    │
     │                                          │
     │  Calculator  Timekeeper  Shop  SheetChat │
     │    (voice)    (GPS/geo)  ($$)  (social)  │
     └──────────────────┬──────────────────────┘
                        │
                        │  Dados brutos fluem
                        │  para baixo
                        ▼
          ┌─────────────────────────────┐
          │  CENTRALIZACAO (Centro)     │
          │  Supabase unified backend   │
          │  PostgreSQL + RLS + Auth    │
          │  Normalized & secure data   │
          │  agg_* / log_* / int_*     │
          └─────────────┬───────────────┘
                        │
                        │  Dados processados
                        │  geram inteligencia
                        ▼
     ┌─────────────────────────────────────────┐
     │      INTELIGENCIA (Base / Output)       │
     │                                          │
     │  Onsite Analytics  ← "olhos e ouvidos"  │
     │    (business health, KPIs, dashboards)   │
     │                                          │
     │  IA Prumo (2027)  ← aprendizado do setor│
     │    (proprietary AI trained on real data) │
     │                                          │
     │  v_* views  ← insights acionaveis       │
     │    (churn, MRR, health, funnel, etc.)    │
     └─────────────────────────────────────────┘
```

---

## Camada 1: Coleta (Topo)

A parte **larga superior** da ampulheta representa os multiplos apps especializados que coletam dados do mundo real.

### Apps de Coleta

| App | Dados Coletados | Volume Esperado |
|-----|-----------------|-----------------|
| **Timekeeper Mobile** | Horas trabalhadas, localizacoes GPS, padroes de movimento, horarios de entrada/saida | 100k+ entries/mes |
| **Timekeeper Web** | Entradas manuais, estruturas de equipe, correcoes | 10k+ entries/mes |
| **Calculator** | Comandos de voz, tipos de calculo, formulas por oficio | 50k+ calculations/mes |
| **Shop** | Compras, produtos populares, demanda por oficio/regiao | 1k+ orders/mes |
| **SheetChat** *(planejado)* | Mensagens, traducoes, problemas recorrentes | TBD |
| **Eagle** | Fotos de obras, progresso, issues, inspecoes | 10k+ photos/mes |

### Principio de Coleta

Cada app e um **ponto de coleta especializado**. Eles nao tentam fazer tudo — fazem uma coisa muito bem:

- Calculator = especialista em **voz e calculos**
- Timekeeper = especialista em **localizacao e tempo**
- Shop = especialista em **transacoes e produtos**
- Eagle = especialista em **visual e progresso**

### Etica de Coleta

- **Transparencia:** Usuarios sabem que dados sao coletados
- **Consentimento:** `core_consents` registra cada consentimento
- **LGPD/PIPEDA:** Compliance com leis de privacidade
- **Valor:** Dados coletados geram valor para o proprio usuario (relatorios, insights)

---

## Camada 2: Centralizacao (Centro)

O **gargalo** da ampulheta e o Supabase — um ponto unico onde todos os dados convergem.

### Supabase como Centro

```
┌─────────────────────────────────────────────────────────────┐
│                      SUPABASE                               │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  PostgreSQL │  │    Auth     │  │   Storage   │        │
│  │  (dados)    │  │  (identity) │  │  (files)    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │    RLS      │  │   Realtime  │  │    Edge     │        │
│  │ (security)  │  │  (sync)     │  │  Functions  │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                             │
│  Project ID: bjkhofdrzpczgnwxoauk                          │
└─────────────────────────────────────────────────────────────┘
```

### Por que um unico Supabase?

1. **Identidade unica:** Usuario cria conta uma vez, usa em todos os apps
2. **Dados conectados:** Horas do Timekeeper ligadas a calculos do Calculator
3. **Seguranca centralizada:** RLS aplicado consistentemente
4. **Analytics unificado:** Views cruzam dados de todos os apps

### Tabelas de Centralizacao

| Prefixo | Proposito | Exemplo |
|---------|-----------|---------|
| `core_` | Identidade compartilhada | `core_profiles`, `core_devices` |
| `ref_` | Dados de referencia | `ref_trades`, `ref_provinces` |
| `log_` | Eventos e erros | `log_events`, `log_errors` |
| `agg_` | Agregacoes pre-calculadas | `agg_platform_daily`, `agg_user_daily` |

### Agregacoes

Os dados brutos sao agregados em tabelas `agg_*` para:
- Performance (queries rapidas)
- Privacidade (dados anonimizados)
- Analytics (metricas prontas)

```sql
-- Exemplo: agg_platform_daily
date | total_users | active_users | total_entries | total_calculations | total_revenue
2026-02-01 | 5000 | 1200 | 15000 | 8000 | 12500.00
```

---

## Camada 3: Inteligencia (Base)

A parte **larga inferior** da ampulheta e onde os dados processados geram valor.

### Onsite Analytics — "Olhos e Ouvidos"

O primeiro produto da camada de inteligencia. Dashboard para admins/gestores.

```
  ┌─────────────────────────────────────────────────────────────┐
  │                    ONSITE ANALYTICS                         │
  │                 (Gargalo da Ampulheta)                      │
  │                                                             │
  │   ENTRADA (Cyan/Blue)         SAIDA (Amber/Green)          │
  │   ┌─────────────────┐        ┌─────────────────┐          │
  │   │  1. Identity     │        │  1. AI Training  │          │
  │   │  2. Business     │   ──>  │  2. Market Intel │          │
  │   │  3. Product      │   ──>  │  3. App Optimize │          │
  │   │  4. Debug        │   ──>  │  4. Commerce     │          │
  │   │  5. Visual       │        │  5. Reports      │          │
  │   └─────────────────┘        └─────────────────┘          │
  │                                                             │
  └─────────────────────────────────────────────────────────────┘
```

#### 5 Esferas de Entrada (Input)

| Esfera | Pergunta | Fontes |
|--------|----------|--------|
| **Identity** | Quem sao os usuarios? | `core_profiles`, `v_churn_risk`, `v_user_health` |
| **Business** | Quanto valor e gerado? | `tmk_entries`, `bil_subscriptions`, `v_mrr` |
| **Product** | Como os usuarios usam? | `log_events`, `agg_user_daily` |
| **Debug** | O que esta quebrando? | `log_errors`, `v_top_errors` |
| **Visual** | O que as fotos mostram? | `egl_photos`, image annotations |

#### 5 Esferas de Saida (Output)

| Esfera | Proposito | Formato |
|--------|-----------|---------|
| **AI Training** | Datasets para ML | COCO JSON, CSV, `.onnx` |
| **Market Intel** | Previsoes, tendencias | Dashboards, alertas |
| **App Optimize** | Melhorias de UX | Feature flags, recomendacoes |
| **Commerce** | Otimizacao de vendas | Pricing, produtos |
| **Reports** | Relatorios automaticos | PDF, email digests |

### IA Prumo (2027+)

O objetivo final: uma IA proprietaria treinada em dados reais de construcao canadense.

Ver: [Prumo AI](./prumo-ai.md)

### Views Analiticas (v_*)

Views materializadas que cruzam dados de multiplas tabelas:

| View | Proposito |
|------|-----------|
| `v_churn_risk` | Usuarios em risco de cancelar |
| `v_mrr` | MRR/ARR por app |
| `v_user_health` | Score de saude do usuario |
| `v_subscription_funnel` | Funil de conversao |
| `v_revenue_by_province` | Receita por provincia |
| `v_top_errors` | Erros mais frequentes |
| `v_voice_adoption_by_trade` | Adocao de voz por oficio |

---

## Fluxo de Dados

```
[Usuario no campo]
      │
      ▼
[App Mobile] ─── dados brutos ───► [Supabase]
      │                                │
      │                                ▼
      │                         [Tabelas tmk_*, ccl_*, etc]
      │                                │
      │                                ▼
      │                         [Triggers/Functions]
      │                                │
      │                                ▼
      │                         [Tabelas agg_*, log_*]
      │                                │
      │                                ▼
      │                         [Views v_*]
      │                                │
      │                                ▼
[Relatorios] ◄─── insights ────[Onsite Analytics]
      │                                │
      │                                ▼
      │                         [Datasets ML]
      │                                │
      │                                ▼
[Melhores decisoes] ◄───────── [IA Prumo (2027)]
```

---

## Beneficios da Arquitetura

### 1. Escalabilidade Horizontal
- Adicionar novo app = novo ponto de coleta
- Dados fluem para o mesmo centro
- Analytics automaticamente inclui novos dados

### 2. Seguranca por Design
- RLS no gargalo protege tudo
- Um unico ponto de auditoria
- Dados anonimizados nas agregacoes

### 3. Time to Insight
- Dados ja normalizados e conectados
- Views pre-calculadas para queries rapidas
- Analytics em tempo real

### 4. AI-Ready
- Dados estruturados para ML
- Historico preservado
- Labels/annotations padronizadas

---

## Comparacao com Arquiteturas Tradicionais

| Aspecto | Tradicional | Ampulheta |
|---------|-------------|-----------|
| Banco | Um por app | Um centralizado |
| Identidade | Fragmentada | Unica |
| Analytics | Por app | Cruzado |
| ML Training | Dificil | Nativo |
| Seguranca | Inconsistente | Centralizada |

---

*Ultima atualizacao: 2026-02-01*
