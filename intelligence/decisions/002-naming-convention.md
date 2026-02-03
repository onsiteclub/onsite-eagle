# ADR-002: Nova Nomenclatura de Tabelas (DIRECTIVE 2026-02-01)

**Status:** Aceito
**Data:** 2026-02-01
**Decisores:** Cris (Fundador), Blue (Orchestrator Agent)

---

## Contexto

O banco de dados Supabase do OnSite Club cresceu organicamente com diferentes convencoes de nomenclatura:

### Problema: Nomenclatura Inconsistente

```
# Exemplos de nomes atuais (inconsistentes)
app_timekeeper_entries      # app_ prefix
app_calculator_calculations # app_ prefix
core_profiles               # core_ prefix
phases                      # sem prefix (ambiguo!)
houses                      # sem prefix (ambiguo!)
voice_logs                  # sem prefix (ambiguo!)
billing_subscriptions       # billing_ prefix
```

### Problemas Identificados

1. **Ambiguidade:** `phases` e de qual app? Eagle? Timekeeper?
2. **Verbosidade:** `app_timekeeper_entries` e longo demais
3. **Inconsistencia:** Alguns com prefix, outros sem
4. **Busca dificil:** Claude/devs nao sabem onde buscar

---

## Decisao

**Nova nomenclatura com prefixos curtos e significativos.**

### Regra Principal

> **1 dono = prefixo do app | +1 donos = core_**

### Tabela de Prefixos

| Prefixo | Significado | Quando Usar | Exemplo |
|---------|-------------|-------------|---------|
| `tmk_` | Timekeeper | Tabelas exclusivas do Timekeeper | `tmk_entries`, `tmk_geofences` |
| `ccl_` | Calculator | Tabelas exclusivas do Calculator | `ccl_calculations`, `ccl_templates` |
| `egl_` | Eagle | Tabelas exclusivas do Eagle | `egl_sites`, `egl_houses`, `egl_photos` |
| `shp_` | Shop | Tabelas exclusivas do Shop | `shp_products`, `shp_orders`, `shp_carts` |
| `core_` | Core/Compartilhado | Usado por 2+ apps | `core_profiles`, `core_devices` |
| `ref_` | Reference | Dados de lookup/referencia | `ref_trades`, `ref_provinces`, `ref_units` |
| `bil_` | Billing | Cobranca e assinaturas | `bil_subscriptions`, `bil_products` |
| `log_` | Logs | Eventos, erros, observabilidade | `log_errors`, `log_events` |
| `agg_` | Aggregations | Dados pre-agregados | `agg_platform_daily`, `agg_user_daily` |
| `int_` | Intelligence | Padroes para ML | `int_behavior_patterns`, `int_voice_patterns` |

---

## Mapeamento Completo

### De → Para

| Tabela Atual | Nova Tabela | Justificativa |
|--------------|-------------|---------------|
| `app_timekeeper_entries` | `tmk_entries` | Unico dono: Timekeeper |
| `app_timekeeper_geofences` | `tmk_geofences` | Unico dono: Timekeeper |
| `app_timekeeper_projects` | `tmk_projects` | Unico dono: Timekeeper |
| `app_calculator_calculations` | `ccl_calculations` | Unico dono: Calculator |
| `app_calculator_templates` | `ccl_templates` | Unico dono: Calculator |
| `sites` | `egl_sites` | Unico dono: Eagle |
| `houses` | `egl_houses` | Unico dono: Eagle |
| `phases` | `ref_eagle_phases` | Reference data para Eagle |
| `phase_items` | `ref_eagle_phase_items` | Reference data para Eagle |
| `house_progress` | `egl_progress` | Unico dono: Eagle |
| `phase_photos` | `egl_photos` | Unico dono: Eagle |
| `timeline_events` | `egl_timeline` | Unico dono: Eagle |
| `issues` | `egl_issues` | Unico dono: Eagle |
| `plan_scans` | `egl_scans` | Unico dono: Eagle |
| `app_shop_products` | `shp_products` | Unico dono: Shop |
| `app_shop_product_variants` | `shp_variants` | Unico dono: Shop |
| `app_shop_categories` | `shp_categories` | Unico dono: Shop |
| `app_shop_orders` | `shp_orders` | Unico dono: Shop |
| `app_shop_order_items` | `shp_order_items` | Unico dono: Shop |
| `app_shop_carts` | `shp_carts` | Unico dono: Shop |
| `core_profiles` | `core_profiles` | Mantido (ja correto) |
| `core_devices` | `core_devices` | Mantido (ja correto) |
| `core_consents` | `core_consents` | Mantido (ja correto) |
| `access_grants` | `core_access_grants` | Usado por Timekeeper + Web |
| `pending_tokens` | `core_pending_tokens` | Usado por Timekeeper + Web |
| `admin_users` | `core_admin_users` | Compartilhado |
| `admin_logs` | `core_admin_logs` | Compartilhado |
| `voice_logs` | `core_voice_logs` | Usado por Calculator + outros |
| `argus_conversations` | `core_ai_conversations` | Compartilhado |
| `billing_products` | `bil_products` | Billing |
| `billing_subscriptions` | `bil_subscriptions` | Billing |
| `payment_history` | `bil_payments` | Billing |
| `checkout_codes` | `bil_checkout_codes` | Billing |
| `log_errors` | `log_errors` | Mantido (ja correto) |
| `log_events` | `log_events` | Mantido (ja correto) |
| `log_locations` | `log_locations` | Mantido (ja correto) |
| `agg_platform_daily` | `agg_platform_daily` | Mantido (ja correto) |
| `agg_user_daily` | `agg_user_daily` | Mantido (ja correto) |
| `agg_trade_weekly` | `agg_trade_weekly` | Mantido (ja correto) |
| `int_behavior_patterns` | `int_behavior_patterns` | Mantido (ja correto) |
| `int_voice_patterns` | `int_voice_patterns` | Mantido (ja correto) |
| `ref_trades` | `ref_trades` | Mantido (ja correto) |
| `ref_provinces` | `ref_provinces` | Mantido (ja correto) |
| `ref_units` | `ref_units` | Mantido (ja correto) |

---

## Alternativas Consideradas

### Alternativa 1: Manter app_ prefix

```
app_timekeeper_entries
app_calculator_calculations
app_eagle_sites
```

**Pros:**
- Ja em uso parcialmente
- Claro que e uma tabela de app

**Cons:**
- Muito longo (25+ caracteres)
- Redundante (`app_` + nome do app)

**Decisao:** Rejeitado

### Alternativa 2: Prefixos de 2 letras

```
tk_entries (Timekeeper)
cc_calculations (Calculator)
eg_sites (Eagle)
```

**Pros:**
- Ainda mais curto

**Cons:**
- Menos legivel
- Conflito potencial (eg = exemplo?)

**Decisao:** Rejeitado

### Alternativa 3: Schema por app

```
timekeeper.entries
calculator.calculations
eagle.sites
```

**Pros:**
- Separacao clara
- Nativo do PostgreSQL

**Cons:**
- Muda drasticamente RLS
- Complexidade no Supabase
- Queries cross-schema mais complexas

**Decisao:** Rejeitado (para o futuro, talvez)

---

## Consequencias

### Positivas

1. **Busca facil:** `tmk_*` = todas as tabelas do Timekeeper
2. **Menos digitacao:** `tmk_entries` vs `app_timekeeper_entries`
3. **Consistencia:** Uma regra para todos
4. **AI-friendly:** Claude entende melhor o dominio
5. **Documentacao natural:** Prefixo e auto-explicativo

### Negativas

1. **Breaking change:** Apps precisam atualizar queries
2. **Migracao:** Requires renaming tables
3. **Views temporarias:** Backward-compat durante transicao

### Mitigacao

```sql
-- Views de compatibilidade temporarias
CREATE VIEW app_timekeeper_entries AS SELECT * FROM tmk_entries;
CREATE VIEW app_calculator_calculations AS SELECT * FROM ccl_calculations;
-- Remover apos migracao completa do codigo
```

---

## Implementacao

### Fase 1: Preparacao
- [x] Definir mapeamento completo
- [x] Documentar em ADR
- [x] Criar MIGRATION_PROMPT.md

### Fase 2: SQL de Migracao
- [ ] Gerar SQL de criacao com novos nomes
- [ ] Gerar views de compatibilidade
- [ ] Testar em branch Supabase

### Fase 3: Codigo
- [ ] Atualizar tipos TypeScript
- [ ] Atualizar queries em apps
- [ ] Atualizar RLS policies

### Fase 4: Deploy
- [ ] Aplicar migration em producao
- [ ] Monitorar erros
- [ ] Remover views de compatibilidade

---

## Regras para Novas Tabelas

Ao criar uma nova tabela, pergunte:

1. **Quantos apps usam esta tabela?**
   - 1 app → prefixo do app (`tmk_`, `ccl_`, `egl_`, `shp_`)
   - 2+ apps → `core_`

2. **E dado de referencia/lookup?**
   - Sim → `ref_`

3. **E relacionado a billing?**
   - Sim → `bil_`

4. **E log/evento/erro?**
   - Sim → `log_`

5. **E dado agregado?**
   - Sim → `agg_`

6. **E dado para ML/intelligence?**
   - Sim → `int_`

---

## Exemplos de Aplicacao

### Cenario 1: Nova tabela de notificacoes

*Pergunta:* Quem usa?
*Resposta:* Todos os apps (Timekeeper, Calculator, Eagle)
*Decisao:* `core_notifications`

### Cenario 2: Nova tabela de receitas do Calculator

*Pergunta:* Quem usa?
*Resposta:* Apenas Calculator
*Decisao:* `ccl_recipes`

### Cenario 3: Nova tabela de inspetores do Eagle

*Pergunta:* Quem usa?
*Resposta:* Apenas Eagle
*Decisao:* `egl_inspectors`

### Cenario 4: Nova tabela de tradeos populares

*Pergunta:* E dado de referencia?
*Resposta:* Sim
*Decisao:* `ref_popular_trades`

---

*Ultima atualizacao: 2026-02-01*
