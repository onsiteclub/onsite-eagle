# SCHEMA REGISTRY — OnSite Eagle

> Ultima atualizacao: 2026-02-27
> Gerado por: Cerbero (raio-X do banco)
> Supabase Project: dbasazrdbtigrdntaehb
> Total: 90 tabelas | 0 views | 11 funcoes | 3 Edge Functions

---

## COMO USAR ESTE DOCUMENTO

- **IA**: Leia ANTES de criar ou alterar qualquer tabela
- **Humano**: Consulte para entender relacionamentos entre tabelas
- **Changelog**: No final — cada mudanca e logada com data e descricao
- **Regra**: Toda alteracao no banco DEVE ser refletida aqui

---

## PADROES DE RLS (apos migration fix_security_*)

| Padrao | Nome | Regra |
|--------|------|-------|
| A | Eagle (dev seguro) | SELECT: authenticated livre. INSERT/UPDATE: auth.uid() IS NOT NULL. DELETE: auth.uid() IS NOT NULL. Anon bloqueado. |
| B | User-owned | CRUD: user_id = auth.uid() |
| C | Reference (publico) | SELECT: qualquer role (is_active = true). Sem INSERT/UPDATE/DELETE. |
| D | Admin | Via is_active_admin() helper |
| E | Metrics (read-only) | SELECT: authenticated. INSERT/UPDATE: service_role only. |
| F | Custom | Policies especificas documentadas na tabela |

---

## TABLES BY DOMAIN

### Eagle (egl_*) — 27 tabelas

#### egl_sites
- **Proposito**: Sites/loteamentos de construcao
- **Apps**: Monitor, Field, Inspect, Timekeeper
- **RLS**: Pattern A
- **FKs**: none
- **Unique**: —
- **Status**: ✅

#### egl_houses
- **Proposito**: Lotes/casas dentro de um site
- **Apps**: Monitor, Field, Inspect
- **RLS**: Pattern A
- **FKs**: site_id → egl_sites.id, issued_to_worker_id → core_profiles.id
- **Unique**: (site_id, lot_number)
- **Status**: ✅

#### egl_photos
- **Proposito**: Fotos de fases por lote
- **Apps**: Monitor, Field, Inspect
- **RLS**: Pattern A
- **FKs**: house_id → egl_houses.id, phase_id → ref_eagle_phases.id, uploaded_by → core_profiles.id
- **Unique**: —
- **Status**: ✅

#### egl_progress
- **Proposito**: Progresso por fase por lote
- **Apps**: Monitor, Field, Inspect
- **RLS**: Pattern A
- **FKs**: house_id → egl_houses.id, phase_id → ref_eagle_phases.id, approved_by → core_profiles.id
- **Unique**: (house_id, phase_id)
- **Status**: ✅

#### egl_timeline
- **Proposito**: Eventos da timeline por lote
- **Apps**: Monitor
- **RLS**: Pattern A
- **FKs**: house_id → egl_houses.id, created_by → core_profiles.id
- **Unique**: —
- **Status**: ✅

#### egl_issues
- **Proposito**: Issues/problemas reportados
- **Apps**: Monitor
- **RLS**: Pattern A
- **FKs**: house_id → egl_houses.id, phase_id → ref_eagle_phases.id, reported_by → core_profiles.id, resolved_by → core_profiles.id
- **Unique**: —
- **Status**: ✅

#### egl_scans
- **Proposito**: Plan scans (PDF para SVG)
- **Apps**: Monitor
- **RLS**: Pattern A
- **FKs**: site_id → egl_sites.id
- **Unique**: —
- **Status**: ✅

#### egl_schedules
- **Proposito**: Cronograma por lote (1:1)
- **Apps**: Monitor
- **RLS**: Pattern A
- **FKs**: house_id → egl_houses.id (UNIQUE), site_id → egl_sites.id
- **Unique**: house_id (1:1)
- **Status**: ✅

#### egl_schedule_phases
- **Proposito**: Fases do cronograma
- **Apps**: Monitor
- **RLS**: Pattern A
- **FKs**: schedule_id → egl_schedules.id, phase_id → ref_eagle_phases.id, payment_approved_by → core_profiles.id
- **Unique**: (schedule_id, phase_id)
- **Status**: ✅

#### egl_external_events
- **Proposito**: Eventos externos (clima, feriado, inspecao)
- **Apps**: Monitor
- **RLS**: Pattern A
- **FKs**: site_id → egl_sites.id, house_id → egl_houses.id
- **Unique**: —
- **Status**: ✅

#### egl_messages
- **Proposito**: Chat da timeline (AI-mediated)
- **Apps**: Monitor
- **RLS**: Pattern A
- **FKs**: site_id → egl_sites.id, house_id → egl_houses.id, sender_id → core_profiles.id, reply_to_id → egl_messages.id
- **Unique**: —
- **Realtime**: Monitor subscreve INSERT
- **Status**: ✅

#### egl_assignments
- **Proposito**: Atribuicao de worker a lote
- **Apps**: Monitor, Field
- **RLS**: Pattern F (worker_id checks)
- **FKs**: house_id → egl_houses.id, worker_id → core_profiles.id, assigned_by → core_profiles.id
- **Unique**: Partial (house_id, worker_id) WHERE status NOT IN ('cancelled','completed')
- **Status**: ✅

#### egl_phase_assignments
- **Proposito**: Atribuicao de worker a fase especifica
- **Apps**: Monitor
- **RLS**: Pattern A
- **FKs**: house_id → egl_houses.id, phase_id → ref_eagle_phases.id, worker_id → core_profiles.id
- **Unique**: (house_id, phase_id, worker_id)
- **Status**: ✅

#### egl_phase_rates
- **Proposito**: Rate por sqft por fase
- **Apps**: Monitor
- **RLS**: Pattern A
- **FKs**: site_id → egl_sites.id, phase_id → ref_eagle_phases.id
- **Unique**: (site_id, phase_id, effective_from)
- **Status**: ✅

#### egl_material_tracking
- **Proposito**: Pipeline de materiais (ordered, delivered, installed, welded)
- **Apps**: Monitor
- **RLS**: Pattern A
- **FKs**: house_id → egl_houses.id, site_id → egl_sites.id, phase_id → ref_eagle_phases.id, ordered_by → core_profiles.id, installed_by → core_profiles.id, verified_by → core_profiles.id
- **Unique**: —
- **Status**: ✅

#### egl_material_requests
- **Proposito**: Pedidos de material
- **Apps**: Monitor, Operator
- **RLS**: Pattern A
- **FKs**: site_id → egl_sites.id, house_id → egl_houses.id, requested_by_id → core_profiles.id, acknowledged_by_id → core_profiles.id, delivered_by_id → core_profiles.id, cancelled_by_id → core_profiles.id
- **Unique**: —
- **Soft delete**: deleted_at
- **Realtime**: Operator subscreve changes
- **Status**: ✅

#### egl_documents
- **Proposito**: Documentos/plantas por site ou lote
- **Apps**: Monitor
- **RLS**: Pattern A
- **FKs**: site_id → egl_sites.id, house_id → egl_houses.id, batch_id → egl_document_batches.id
- **Unique**: —
- **Soft delete**: deleted_at
- **Status**: ✅

#### egl_document_links
- **Proposito**: Link N:N entre documento e lote
- **Apps**: Monitor
- **RLS**: Pattern A
- **FKs**: document_id → egl_documents.id, house_id → egl_houses.id, created_by → core_profiles.id
- **Unique**: (document_id, house_id)
- **Status**: ✅

#### egl_document_batches
- **Proposito**: Batches de upload de documentos
- **Apps**: Monitor
- **RLS**: Pattern A
- **FKs**: site_id → egl_sites.id, uploaded_by → core_profiles.id
- **Unique**: —
- **Status**: ✅

#### egl_crews
- **Proposito**: Equipes de campo
- **Apps**: (planned)
- **RLS**: Pattern A
- **FKs**: leader_id → core_profiles.id
- **Unique**: —
- **Status**: ✅

#### egl_crew_members
- **Proposito**: Membros de equipe
- **Apps**: (planned)
- **RLS**: Pattern A
- **FKs**: crew_id → egl_crews.id, worker_id → core_profiles.id
- **Unique**: (crew_id, worker_id)
- **Status**: ✅

#### egl_site_workers
- **Proposito**: Workers atribuidos a sites
- **Apps**: Monitor, Timekeeper
- **RLS**: Pattern F (worker_id checks)
- **FKs**: site_id → egl_sites.id
- **Unique**: (site_id, worker_id)
- **Status**: ✅

#### egl_operator_assignments
- **Proposito**: Operadores atribuidos a sites
- **Apps**: Operator
- **RLS**: Pattern F (operator_id checks)
- **FKs**: operator_id → core_profiles.id, site_id → egl_sites.id, assigned_by → core_profiles.id
- **Unique**: (operator_id, site_id)
- **Status**: ✅

#### egl_ai_reports
- **Proposito**: Relatorios gerados por IA
- **Apps**: Monitor
- **RLS**: Pattern A
- **FKs**: site_id → egl_sites.id, house_id → egl_houses.id, reviewed_by → core_profiles.id
- **Unique**: —
- **Status**: ✅

#### egl_app_registry
- **Proposito**: Registro de apps do ecossistema (metadata)
- **Apps**: Architecture
- **RLS**: Pattern E (metrics read-only)
- **FKs**: —
- **Unique**: —
- **Status**: ✅

#### egl_business_metrics
- **Proposito**: Metricas de negocio
- **Apps**: Architecture
- **RLS**: Pattern E
- **FKs**: —
- **Unique**: —
- **Status**: ✅

#### egl_data_metrics
- **Proposito**: Metricas de dados
- **Apps**: Architecture
- **RLS**: Pattern E
- **FKs**: —
- **Unique**: —
- **Status**: ✅

---

### Timekeeper (tmk_*) — 10 tabelas

#### tmk_entries
- **Proposito**: Registros de ponto (clock in/out)
- **Apps**: Timekeeper, Dashboard, Analytics
- **RLS**: Pattern B
- **FKs**: user_id → core_profiles.id, geofence_id → tmk_geofences.id, project_id → tmk_projects.id
- **Unique**: —
- **Soft delete**: deleted_at
- **Status**: ✅

#### tmk_geofences
- **Proposito**: Locais de trabalho com geofencing
- **Apps**: Timekeeper, Dashboard, Monitor
- **RLS**: Pattern B
- **FKs**: user_id → core_profiles.id
- **Unique**: —
- **Soft delete**: deleted_at
- **Status**: ✅

#### tmk_projects
- **Proposito**: Projetos do Timekeeper
- **Apps**: Timekeeper
- **RLS**: Pattern B
- **FKs**: user_id → core_profiles.id
- **Unique**: —
- **Soft delete**: deleted_at
- **Status**: ✅

#### tmk_sessions
- **Proposito**: Sessoes de tracking GPS
- **Apps**: Timekeeper
- **RLS**: Pattern B
- **FKs**: user_id → core_profiles.id
- **Unique**: —
- **Status**: ✅

#### tmk_day_summary
- **Proposito**: Resumo diario de horas
- **Apps**: Timekeeper
- **RLS**: Pattern B
- **FKs**: user_id → core_profiles.id
- **Unique**: —
- **Status**: ✅

#### tmk_corrections
- **Proposito**: Correcoes de ponto
- **Apps**: Timekeeper
- **RLS**: Pattern B
- **FKs**: session_id → tmk_sessions.id
- **Unique**: —
- **Status**: ✅

#### tmk_audit
- **Proposito**: Audit trail
- **Apps**: Timekeeper
- **RLS**: Pattern B
- **FKs**: session_id → tmk_sessions.id, user_id → core_profiles.id
- **Unique**: —
- **Status**: ✅

#### tmk_errors
- **Proposito**: Erros do Timekeeper
- **Apps**: Timekeeper
- **RLS**: Pattern B
- **FKs**: user_id → core_profiles.id
- **Unique**: —
- **Status**: ✅

#### tmk_events
- **Proposito**: Eventos do Timekeeper
- **Apps**: Timekeeper
- **RLS**: Pattern B
- **FKs**: —
- **Unique**: —
- **Status**: ✅

#### tmk_analytics
- **Proposito**: Analytics do Timekeeper
- **Apps**: Timekeeper
- **RLS**: Pattern B
- **FKs**: —
- **Unique**: —
- **Status**: ✅

---

### Core (core_*) — 9 tabelas

#### core_profiles
- **Proposito**: Perfil do usuario (1:1 com auth.users)
- **Apps**: ALL
- **RLS**: Pattern B + shared via access_grants
- **FKs**: id → auth.users.id, trade_id → ref_trades.id, referred_by_user_id → core_profiles.id
- **Unique**: worker_code
- **Status**: ✅

#### core_devices
- **Proposito**: Dispositivos do usuario
- **Apps**: Timekeeper, Operator, Inspect
- **RLS**: Pattern B
- **FKs**: user_id → core_profiles.id
- **Unique**: —
- **Status**: ✅

#### core_consents
- **Proposito**: Consentimentos LGPD
- **Apps**: Calculator
- **RLS**: Pattern B (INSERT/SELECT only)
- **FKs**: user_id → core_profiles.id
- **Unique**: —
- **Status**: ✅

#### core_access_grants
- **Proposito**: Compartilhamento de dados (QR code)
- **Apps**: Timekeeper
- **RLS**: Pattern F (owner/viewer checks)
- **FKs**: owner_id → core_profiles.id, viewer_id → core_profiles.id
- **Unique**: —
- **Status**: ✅

#### core_pending_tokens
- **Proposito**: Tokens temporarios para QR
- **Apps**: Timekeeper
- **RLS**: Pattern F (owner + lookup_pending_token())
- **FKs**: owner_id → core_profiles.id
- **Unique**: —
- **Status**: ✅

#### core_admin_users
- **Proposito**: Admins
- **Apps**: Dashboard, Analytics
- **RLS**: Pattern D
- **FKs**: user_id → core_profiles.id, approved_by → core_profiles.id
- **Unique**: —
- **Status**: ✅

#### core_admin_logs
- **Proposito**: Log de acoes admin
- **Apps**: Dashboard
- **RLS**: Pattern D
- **FKs**: admin_id → core_profiles.id
- **Unique**: —
- **Status**: ✅

#### core_ai_conversations
- **Proposito**: Conversas com AI
- **Apps**: Dashboard
- **RLS**: Pattern B
- **FKs**: user_id → core_profiles.id
- **Unique**: —
- **Status**: ✅

#### core_voice_logs
- **Proposito**: Logs de voz
- **Apps**: Calculator
- **RLS**: Pattern B
- **FKs**: user_id → core_profiles.id, retry_of_id → core_voice_logs.id
- **Unique**: —
- **Status**: ✅

---

### Club (club_*) — 8 tabelas (Gamificacao/Fidelidade)

#### club_badges
- **Proposito**: Definicao de badges
- **Apps**: Dashboard
- **RLS**: Pattern C (public SELECT where active)
- **FKs**: —
- **Unique**: —
- **Status**: ✅

#### club_user_badges
- **Proposito**: Badges do usuario
- **Apps**: Dashboard
- **RLS**: Pattern B
- **FKs**: user_id → core_profiles.id, badge_id → club_badges.id
- **Unique**: —
- **Status**: ✅

#### club_streaks
- **Proposito**: Streaks do usuario
- **Apps**: Dashboard
- **RLS**: Pattern B
- **FKs**: user_id → core_profiles.id
- **Unique**: —
- **Status**: ✅

#### club_campaigns
- **Proposito**: Campanhas
- **Apps**: Dashboard
- **RLS**: Pattern F (authenticated SELECT active)
- **FKs**: created_by → core_profiles.id
- **Unique**: —
- **Status**: ✅

#### club_campaign_interactions
- **Proposito**: Interacoes em campanhas
- **Apps**: Dashboard
- **RLS**: Pattern B
- **FKs**: user_id → core_profiles.id
- **Unique**: —
- **Status**: ✅

#### club_news
- **Proposito**: Noticias
- **Apps**: Dashboard
- **RLS**: Pattern C (public SELECT active)
- **FKs**: created_by → core_profiles.id
- **Unique**: —
- **Status**: ✅

#### club_partner_offers
- **Proposito**: Ofertas de parceiros
- **Apps**: Dashboard
- **RLS**: Pattern F (authenticated SELECT active)
- **FKs**: —
- **Unique**: —
- **Status**: ✅

#### club_partner_redemptions
- **Proposito**: Resgates de ofertas
- **Apps**: Dashboard
- **RLS**: Pattern B
- **FKs**: user_id → core_profiles.id
- **Unique**: —
- **Status**: ✅

---

### Reference (ref_*) — 6 tabelas

#### ref_trades
- **Proposito**: Trades/oficios de construcao
- **Apps**: ALL
- **RLS**: Pattern C
- **FKs**: parent_trade_id → ref_trades.id
- **Unique**: —
- **Status**: ✅

#### ref_provinces
- **Proposito**: Provincias canadenses
- **Apps**: ALL
- **RLS**: Pattern C
- **FKs**: —
- **Unique**: —
- **Status**: ✅

#### ref_units
- **Proposito**: Unidades de medida
- **Apps**: Calculator
- **RLS**: Pattern C
- **FKs**: —
- **Unique**: —
- **Status**: ✅

#### ref_eagle_phases
- **Proposito**: Fases de construcao (67 rows)
- **Apps**: Monitor, Field, Inspect
- **RLS**: Pattern C
- **FKs**: —
- **Unique**: —
- **Status**: ✅

#### ref_eagle_phase_items
- **Proposito**: Itens de checklist por fase
- **Apps**: Monitor
- **RLS**: Pattern C
- **FKs**: phase_id → ref_eagle_phases.id
- **Unique**: —
- **Status**: ✅

#### ref_material_types
- **Proposito**: Tipos de material
- **Apps**: Monitor, Operator
- **RLS**: Pattern C
- **FKs**: —
- **Unique**: —
- **Status**: ✅

---

### Shop (shp_*) — 6 tabelas

#### shp_products
- **Proposito**: Produtos da loja
- **Apps**: Dashboard
- **RLS**: Pattern C (public SELECT active)
- **FKs**: —
- **Unique**: —
- **Status**: ✅

#### shp_variants
- **Proposito**: Variantes de produto
- **Apps**: Dashboard
- **RLS**: Pattern C
- **FKs**: product_id → shp_products.id
- **Unique**: —
- **Status**: ✅

#### shp_categories
- **Proposito**: Categorias
- **Apps**: Dashboard
- **RLS**: Pattern C
- **FKs**: parent_id → shp_categories.id
- **Unique**: —
- **Status**: ✅

#### shp_orders
- **Proposito**: Pedidos
- **Apps**: Dashboard
- **RLS**: Pattern B
- **FKs**: user_id → core_profiles.id
- **Unique**: —
- **Status**: ✅

#### shp_order_items
- **Proposito**: Itens do pedido
- **Apps**: Dashboard
- **RLS**: Pattern B
- **FKs**: order_id → shp_orders.id, product_id → shp_products.id, variant_id → shp_variants.id
- **Unique**: —
- **Status**: ✅

#### shp_carts
- **Proposito**: Carrinhos
- **Apps**: Dashboard
- **RLS**: Pattern B
- **FKs**: user_id → core_profiles.id
- **Unique**: —
- **Status**: ✅

---

### Card (crd_*) — 6 tabelas (Programa de cartao)

#### crd_cardholders
- **Proposito**: Portadores de cartao
- **Apps**: Dashboard
- **RLS**: Pattern B
- **FKs**: user_id → core_profiles.id
- **Unique**: —
- **Status**: ✅

#### crd_cards
- **Proposito**: Cartoes emitidos
- **Apps**: Dashboard
- **RLS**: Pattern F (via cardholder subquery)
- **FKs**: cardholder_id → crd_cardholders.id, replaced_by → crd_cards.id
- **Unique**: —
- **Status**: ✅

#### crd_transactions
- **Proposito**: Transacoes do cartao
- **Apps**: Dashboard
- **RLS**: Pattern F (via card, cardholder chain)
- **FKs**: card_id → crd_cards.id, house_id → egl_houses.id
- **Unique**: —
- **Status**: ✅

#### crd_blades_ledger
- **Proposito**: Ledger de Blades (moeda virtual)
- **Apps**: Dashboard
- **RLS**: Pattern B
- **FKs**: user_id → core_profiles.id
- **Unique**: —
- **Status**: ✅

#### crd_funding_events
- **Proposito**: Eventos de funding
- **Apps**: Dashboard
- **RLS**: Pattern F
- **FKs**: cardholder_id → crd_cardholders.id
- **Unique**: —
- **Status**: ✅

#### crd_waitlist
- **Proposito**: Lista de espera
- **Apps**: Dashboard
- **RLS**: Pattern F (anon INSERT sem user_id, authenticated own)
- **FKs**: user_id → core_profiles.id
- **Unique**: —
- **Status**: ✅

---

### Billing (bil_*) — 4 tabelas

#### bil_products
- **Proposito**: Planos de assinatura
- **Apps**: Auth, Dashboard
- **RLS**: Pattern C (public SELECT active)
- **FKs**: —
- **Unique**: —
- **Status**: ✅

#### bil_subscriptions
- **Proposito**: Assinaturas ativas
- **Apps**: Auth, Dashboard, Analytics
- **RLS**: Pattern B (SELECT only)
- **FKs**: user_id → core_profiles.id, plan_id → bil_products.id
- **Unique**: —
- **Status**: ✅

#### bil_payments
- **Proposito**: Historico de pagamentos
- **Apps**: Dashboard, Analytics
- **RLS**: Pattern B (SELECT only)
- **FKs**: user_id → core_profiles.id
- **Unique**: —
- **Status**: ✅

#### bil_checkout_codes
- **Proposito**: Codigos de checkout
- **Apps**: Auth
- **RLS**: Pattern B
- **FKs**: user_id → core_profiles.id
- **Unique**: —
- **Status**: ✅

---

### Logs (log_*) — 3 tabelas

#### log_errors
- **Proposito**: Erros de app
- **Apps**: Analytics
- **RLS**: Pattern B
- **FKs**: user_id → core_profiles.id
- **Unique**: —
- **Status**: ✅

#### log_events
- **Proposito**: Eventos de app
- **Apps**: Analytics
- **RLS**: Pattern B
- **FKs**: —
- **Unique**: —
- **Status**: ✅

#### log_locations
- **Proposito**: Localizacoes GPS
- **Apps**: Timekeeper
- **RLS**: Pattern B
- **FKs**: user_id → core_profiles.id
- **Unique**: —
- **Status**: ✅

---

### Sheets (sht_*) — 3 tabelas

#### sht_saved_views
- **Proposito**: Views salvas pelo usuario
- **Apps**: Sheets
- **RLS**: Pattern B
- **FKs**: user_id → core_profiles.id
- **Unique**: —
- **Status**: ✅

#### sht_exports
- **Proposito**: Exports gerados
- **Apps**: Sheets
- **RLS**: Pattern B
- **FKs**: user_id → core_profiles.id
- **Unique**: —
- **Status**: ✅

#### sht_qb_mappings
- **Proposito**: Mapeamentos QuickBooks
- **Apps**: Sheets
- **RLS**: Pattern A (dev seguro)
- **FKs**: —
- **Unique**: —
- **Status**: ✅

---

### Aggregation (agg_*) — 3 tabelas

#### agg_platform_daily
- **Proposito**: Metricas diarias da plataforma
- **Apps**: Analytics
- **RLS**: Pattern E
- **FKs**: —
- **PK**: date
- **Status**: ✅

#### agg_trade_weekly
- **Proposito**: Metricas semanais por trade
- **Apps**: Analytics
- **RLS**: Pattern E
- **FKs**: —
- **PK**: (week_start, trade_id, province)
- **Status**: ✅

#### agg_user_daily
- **Proposito**: Metricas diarias por usuario
- **Apps**: Analytics
- **RLS**: Pattern B
- **FKs**: user_id → core_profiles.id
- **PK**: (date, user_id)
- **Status**: ✅

---

### Calculator (ccl_*) — 2 tabelas

#### ccl_calculations
- **Proposito**: Calculos realizados
- **Apps**: Calculator
- **RLS**: Pattern B
- **FKs**: user_id → core_profiles.id, template_id → ccl_templates.id, voice_log_id → core_voice_logs.id
- **Unique**: —
- **Status**: ✅

#### ccl_templates
- **Proposito**: Templates de calculo
- **Apps**: Calculator
- **RLS**: Pattern F (system public read, user own write)
- **FKs**: trade_id → ref_trades.id, created_by_user_id → core_profiles.id
- **Unique**: —
- **Status**: ✅

---

### Intelligence (int_*) — 2 tabelas

#### int_behavior_patterns
- **Proposito**: Padroes de comportamento (ML)
- **Apps**: Analytics
- **RLS**: Pattern E
- **FKs**: —
- **Unique**: —
- **Status**: ✅

#### int_voice_patterns
- **Proposito**: Padroes de voz (ML)
- **Apps**: Analytics
- **RLS**: Pattern E
- **FKs**: —
- **Unique**: —
- **Status**: ✅

---

### Outro — 1 tabela

#### blades_transactions
- **Proposito**: Transacoes de Blades (moeda virtual)
- **Apps**: Dashboard
- **RLS**: Pattern B
- **FKs**: user_id → core_profiles.id
- **Unique**: —
- **Status**: ⚠️ Sem prefixo padrao

---

## VIEWS

Nenhuma view existe no schema public. As 35 views backward-compat foram dropadas em 2026-02-27 (migration `drop_all_backward_compat_views`). Apps devem usar nomes reais das tabelas diretamente.

---

## FUNCOES HELPER (11)

| Funcao | Tipo | Proposito |
|--------|------|-----------|
| update_updated_at() | TRIGGER | Auto-atualiza updated_at |
| check_email_exists(email) | SECURITY DEFINER | Verifica se email existe em auth.users |
| is_active_admin() | SECURITY DEFINER | RLS helper para admin |
| is_super_admin() | SECURITY DEFINER | RLS helper para super admin |
| lookup_pending_token(token) | SECURITY DEFINER | Busca token QR de forma segura |
| generate_worker_code() | TRIGGER | Gera worker_code automatico (OSC-XXXXX) |
| auto_link_document_to_lot() | TRIGGER | Auto-link documento ao lote por lot_number |
| get_report_context(site_id, house_id) | NORMAL | Busca contexto para relatorio AI |
| calculate_material_urgency_score() | TRIGGER | Calcula score de urgencia de material |
| calculate_material_request_urgency() | TRIGGER | Recalcula urgencia em material requests |
| create_profile_on_signup() | TRIGGER | Cria core_profiles quando auth.users e criado |

---

## EDGE FUNCTIONS (3)

| Function | JWT | Proposito |
|----------|-----|-----------|
| ai-gateway | Sim | Gateway para chamadas AI (Claude API) |
| ai-whisper | Sim | Transcricao de voz (Whisper) |
| update-data-metrics | Sim | Atualiza egl_app_registry, egl_business_metrics, egl_data_metrics |

---

## STORAGE BUCKETS

| Bucket | Apps | Conteudo |
|--------|------|----------|
| egl-documents | Monitor | Documentos/plantas de lotes |
| (egl-media planned) | Monitor, Field | Fotos de lotes |

---

## MAPA DE RELACIONAMENTOS PRINCIPAL

```
auth.users (1:1)
  └── core_profiles
        ├── tmk_entries (user_id)
        ├── tmk_geofences (user_id)
        ├── tmk_projects (user_id)
        ├── ccl_calculations (user_id)
        ├── bil_subscriptions (user_id)
        ├── shp_orders (user_id)
        ├── core_devices (user_id)
        ├── egl_assignments (worker_id)
        ├── egl_site_workers (worker_id)
        └── egl_operator_assignments (operator_id)

egl_sites
  ├── egl_houses (site_id)
  │     ├── egl_photos (house_id)
  │     ├── egl_progress (house_id)
  │     ├── egl_timeline (house_id)
  │     ├── egl_issues (house_id)
  │     ├── egl_schedules (house_id, 1:1)
  │     │     └── egl_schedule_phases (schedule_id)
  │     ├── egl_assignments (house_id)
  │     ├── egl_phase_assignments (house_id)
  │     ├── egl_material_tracking (house_id)
  │     ├── egl_material_requests (house_id)
  │     ├── egl_documents (house_id)
  │     └── egl_document_links (house_id)
  ├── egl_messages (site_id)
  ├── egl_external_events (site_id)
  ├── egl_phase_rates (site_id)
  ├── egl_document_batches (site_id)
  ├── egl_site_workers (site_id)
  └── egl_operator_assignments (site_id)

ref_eagle_phases
  ├── egl_photos (phase_id)
  ├── egl_progress (phase_id)
  ├── egl_issues (phase_id)
  ├── egl_schedule_phases (phase_id)
  ├── egl_phase_assignments (phase_id)
  ├── egl_phase_rates (phase_id)
  ├── egl_material_tracking (phase_id)
  └── ref_eagle_phase_items (phase_id)
```

---

## CHANGELOG

| Data | Autor | Acao | Tabelas Afetadas |
|------|-------|------|------------------|
| 2026-02-27 | Cerbero | Documento criado (raio-X completo) | Todas — 90 tabelas documentadas |
| 2026-02-27 | Cerbero | Migration `fix_security_rls_policies` — RLS on egl_schedules, drop ~60 policies USING(true) anon/public, create ~84 policies "dev seguro" | 21 egl_* + sht_qb_mappings + agg_* + int_* + egl_app_registry/business_metrics/data_metrics |
| 2026-02-27 | Cerbero | Migration `fix_security_views_and_functions` — 35 views → SECURITY INVOKER, 10 funcoes → search_path='' | 35 views, 10 funcoes |
| 2026-02-27 | Cerbero | Migration `add_missing_fk_indexes` — ~57 indexes em FK columns | 50+ tabelas em todos os dominios |
| 2026-02-27 | Cerbero | Migration `drop_all_backward_compat_views` — DROP todas 35 views legacy. Apps usam nomes reais. | 35 views removidas, 0 views restam |
| 2026-02-27 | Cerbero | Migrar codigo: 131+ `.from()` calls atualizados de nomes antigos para nomes reais das tabelas | 34+ arquivos em 7 apps + 2 packages (schema, sharing) |

---

*Cerbero — Guardiao do Supabase OnSite*
