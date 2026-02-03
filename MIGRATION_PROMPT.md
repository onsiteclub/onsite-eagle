# Prompt: Migracao Completa para Nova Nomenclatura

> **Use este prompt em uma nova sessao Claude no onsite-eagle**
> **Prerequisito:** MCP Supabase configurado e funcionando

---

## TAREFA

Voce vai fazer uma migracao completa do esquema do banco de dados para a nova nomenclatura de tabelas.

### Fase 1: Escanear Projetos

1. **Liste todos os apps em `apps/`**
   - Identifique a stack de cada um (Next.js, Expo, Vite, etc.)
   - Encontre onde cada app faz queries ao Supabase
   - Liste as tabelas que cada app USA

2. **Liste todos os packages em `packages/`**
   - Identifique tipos, hooks, queries compartilhadas
   - Encontre referencias a tabelas

3. **Leia o schema atual do Supabase**
   - Use `list_tables` para ver todas as tabelas
   - Use `execute_sql` para ver estrutura de cada tabela

### Fase 2: Criar Mapeamento

Usando a DIRECTIVE 2026-02-01 do CLAUDE.md, crie uma tabela completa:

```
| Tabela Atual | Nova Tabela | Owner | Usuarios | Justificativa |
```

Regras:
- 1 dono = prefixo do app (tmk_, ccl_, egl_, shp_)
- +1 dono = core_
- Reference data = ref_
- Billing = bil_
- Logs = log_
- Aggregations = agg_
- Intelligence = int_

### Fase 3: Gerar SQL de Criacao

Crie um arquivo `supabase/migrations/000_initial_schema.sql` com:

1. **Extensions**
   ```sql
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   CREATE EXTENSION IF NOT EXISTS "postgis" WITH SCHEMA extensions;
   ```

2. **Reference tables primeiro** (sem FKs)
   - ref_trades
   - ref_provinces
   - ref_units
   - ref_eagle_phases
   - ref_eagle_phase_items

3. **Core tables** (identidade)
   - core_profiles
   - core_devices
   - core_consents
   - core_access_grants
   - core_pending_tokens
   - core_admin_users
   - core_admin_logs
   - core_voice_logs
   - core_ai_conversations

4. **App tables** (por app)
   - tmk_entries, tmk_geofences, tmk_projects
   - ccl_calculations, ccl_templates
   - egl_sites, egl_houses, egl_photos, egl_progress, egl_issues, egl_timeline, egl_scans
   - shp_products, shp_variants, shp_categories, shp_orders, shp_order_items, shp_carts

5. **Billing tables**
   - bil_products, bil_subscriptions, bil_payments, bil_checkout_codes

6. **Log tables**
   - log_errors, log_events, log_locations

7. **Aggregation tables**
   - agg_platform_daily, agg_user_daily, agg_trade_weekly

8. **Intelligence tables**
   - int_behavior_patterns, int_voice_patterns

9. **Indexes**

10. **Triggers** (updated_at)

11. **RLS Policies** (seguindo padroes do CLAUDE.md secao 9)

12. **Functions** (check_email_exists, lookup_pending_token, is_active_admin, is_super_admin)

### Fase 4: Criar Views de Compatibilidade (opcional)

Se precisar manter compatibilidade temporaria:

```sql
CREATE VIEW app_timekeeper_entries AS SELECT * FROM tmk_entries;
CREATE VIEW app_calculator_calculations AS SELECT * FROM ccl_calculations;
-- etc
```

### Fase 5: Documentar

Crie/atualize `intelligence/schema/` com um arquivo por dominio:
- `intelligence/schema/core.md`
- `intelligence/schema/timekeeper.md`
- `intelligence/schema/calculator.md`
- `intelligence/schema/eagle.md`
- `intelligence/schema/shop.md`
- `intelligence/schema/billing.md`
- `intelligence/schema/observability.md`

---

## OUTPUT ESPERADO

1. **Mapeamento completo** de tabelas antigas → novas
2. **SQL unico** em `supabase/migrations/000_initial_schema.sql`
3. **Documentacao** em `intelligence/schema/`
4. **Lista de breaking changes** para cada app

---

## REGRAS

- NAO execute migrations no Supabase atual
- GERE o SQL para um Supabase NOVO
- MANTENHA todas as colunas existentes
- MANTENHA todas as constraints e checks
- ATUALIZE nomes de FKs para refletir novos nomes
- DOCUMENTE tudo

---

## EXEMPLO DE OUTPUT SQL

```sql
-- ================================================
-- OnSite Eagle - Initial Schema
-- Generated: 2026-02-01
-- Nomenclatura: DIRECTIVE 2026-02-01
-- ================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================
-- REFERENCE TABLES
-- ================================================

CREATE TABLE ref_trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(20) UNIQUE,
  name_en VARCHAR(100) NOT NULL,
  name_fr VARCHAR(100),
  name_pt VARCHAR(100),
  name_es VARCHAR(100),
  category VARCHAR(50),
  subcategory VARCHAR(50),
  parent_trade_id UUID REFERENCES ref_trades(id),
  description_en TEXT,
  description_fr TEXT,
  common_tools TEXT[],
  common_materials TEXT[],
  common_calculations TEXT[],
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ... continua
```

---

## COMECE AGORA

1. Primeiro, liste as tabelas atuais do Supabase
2. Depois, escaneie os apps para entender uso
3. Crie o mapeamento
4. Gere o SQL

**Pergunta se tiver duvidas sobre qualquer decisao de nomenclatura.**
