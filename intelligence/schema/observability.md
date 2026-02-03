# Schema: Observability (Logs, Agregacoes, Intelligence)

> Tabelas de logs, metricas agregadas, e dados para ML.

---

## Logs (log_*)

### log_errors

Erros de aplicacao.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `id` | uuid PK | ID |
| `user_id` | uuid FK | Usuario |
| `error_type` | text | Tipo |
| `error_message` | text | Mensagem |
| `error_stack` | text | Stack trace |
| `app_name` | text | App |
| `screen_name` | varchar | Tela |
| `device_model` | varchar | Dispositivo |
| `app_version` | varchar | Versao |
| `occurred_at` | timestamptz | Quando |

---

### log_events

Eventos de produto.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `id` | uuid PK | ID |
| `user_id` | uuid FK | Usuario |
| `event_name` | text | Nome do evento |
| `event_category` | varchar | Categoria |
| `app_name` | text | App |
| `screen_name` | varchar | Tela |
| `properties` | jsonb | Propriedades |
| `success` | bool | Sucesso |
| `duration_ms` | int | Duracao |
| `session_id` | uuid | Sessao |

---

### log_locations

Eventos de GPS.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `id` | uuid PK | ID |
| `user_id` | uuid FK | Usuario |
| `event_type` | text | enter/exit/dwell |
| `latitude` | double | Lat |
| `longitude` | double | Lng |
| `accuracy` | double | Precisao |
| `geofence_id` | uuid FK | Geofence |

---

## Agregacoes (agg_*)

### agg_platform_daily

Metricas diarias da plataforma (PK: date).

| Coluna | Descricao |
|--------|-----------|
| `total_users` | Total usuarios |
| `active_users` | Ativos no dia |
| `new_users` | Novos no dia |
| `total_entries` | Entries Timekeeper |
| `total_calculations` | Calculos Calculator |
| `total_revenue` | Receita Shop |
| `total_errors` | Erros |

---

### agg_user_daily

Metricas diarias por usuario (PK: date + user_id).

| Coluna | Descricao |
|--------|-----------|
| `app_opens` | Aberturas |
| `sessions_count` | Sessoes |
| `work_minutes_total` | Minutos trabalhados |
| `calculations_count` | Calculos |
| `voice_success_rate` | Taxa sucesso voz |

---

### agg_trade_weekly

Metricas semanais por oficio (PK: week_start + trade_id + province).

| Coluna | Descricao |
|--------|-----------|
| `active_users` | Usuarios ativos |
| `total_work_hours` | Horas trabalhadas |
| `avg_hours_per_user` | Media horas/usuario |
| `peak_start_hour` | Horario pico inicio |
| `voice_usage_pct` | % uso de voz |
| `common_terms` | Termos comuns (jsonb) |

---

## Intelligence (int_*)

### int_behavior_patterns

Padroes de comportamento para ML.

| Coluna | Descricao |
|--------|-----------|
| `segment_type` | trade/province/experience |
| `segment_value` | Valor do segmento |
| `avg_hours_per_week` | Media horas/semana |
| `peak_work_day` | Dia de pico |
| `feature_adoption` | Adocao de features (jsonb) |

---

### int_voice_patterns

Padroes de voz para treinar Prumo.

| Coluna | Descricao |
|--------|-----------|
| `pattern_type` | term/phrase/intent |
| `raw_form` | Forma falada |
| `normalized_form` | Forma normalizada |
| `language` | Idioma |
| `trade_context` | Oficio |
| `occurrence_count` | Ocorrencias |
| `is_validated` | Validado por humano |

---

## Views Analiticas (v_*)

| View | Proposito |
|------|-----------|
| `v_churn_risk` | Usuarios em risco de churn |
| `v_mrr` | MRR/ARR por app |
| `v_user_health` | Score de saude do usuario |
| `v_subscription_funnel` | Funil de conversao |
| `v_top_errors` | Erros mais frequentes |
| `v_revenue_by_province` | Receita por provincia |
| `v_voice_adoption_by_trade` | Adocao de voz por oficio |
| `v_daily_platform_metrics` | KPIs diarios |

---

## RLS

- log_*: authenticated, proprio usuario
- agg_platform_daily, agg_trade_weekly: admin only
- agg_user_daily: proprio usuario
- int_*: admin only

---

*Ultima atualizacao: 2026-02-01*
