# OnSite Intelligence

> Central de conhecimento e documentacao do ecossistema OnSite Club.

Este diretorio contem toda a memoria institucional do projeto: visao estrategica, decisoes arquiteturais, padroes de desenvolvimento, e documentacao de referencia.

---

## Indice

### [Identity](./identity/)
- [Cerbero](./identity/cerbero.md) — O guardiao do Supabase, suas tres cabecas, e regras fundamentais

### [Vision](./vision/)
- [Hourglass Architecture](./vision/hourglass.md) — Arquitetura Ampulheta (Coleta → Centralizacao → Inteligencia)
- [Prumo AI](./vision/prumo-ai.md) — Visao da IA proprietaria para 2027+
- [Kepler Robotics](./vision/kepler-robotics.md) — Estrategia de robotica com Kepler K2

### [Schema](./schema/)
- [Core Tables](./schema/core.md) — Tabelas de identidade (profiles, devices, consents)
- [Timekeeper](./schema/timekeeper.md) — Tabelas tmk_* (entries, geofences, projects)
- [Calculator](./schema/calculator.md) — Tabelas ccl_* (calculations, templates)
- [Eagle](./schema/eagle.md) — Tabelas egl_* (sites, houses, phases, photos)
- [Shop](./schema/shop.md) — Tabelas shp_* (products, orders, carts)
- [Billing](./schema/billing.md) — Tabelas bil_* (subscriptions, payments)
- [Observability](./schema/observability.md) — Tabelas log_*, agg_*, int_*

### [Decisions](./decisions/)
ADRs (Architecture Decision Records) documentando decisoes importantes:
- [001 - Monorepo](./decisions/001-monorepo.md) — Consolidacao em Turborepo
- [002 - Naming Convention](./decisions/002-naming-convention.md) — Nova nomenclatura de tabelas (DIRECTIVE 2026-02-01)
- [003 - MCP Setup](./decisions/003-mcp-setup.md) — Configuracao do MCP (Supabase + Memory)

---

## Getting Started (Para Novos Devs)

### 1. Entenda o Contexto do Negocio

**OnSite Club** e um ecossistema de apps para a industria de construcao canadense.
Motto: *"Wear what you do!"* — construido por um carpinteiro que conhece o oficio.

**Visao central:** Coletar dados reais diarios de trabalhadores de construcao para treinar uma IA proprietaria chamada **"Prumo"** ate 2027.

Leia primeiro:
1. [Hourglass Architecture](./vision/hourglass.md) — entenda o modelo de dados
2. [Prumo AI](./vision/prumo-ai.md) — entenda o objetivo final

### 2. Conheca os Apps

| App | Proposito | Dados Coletados |
|-----|-----------|-----------------|
| **Timekeeper Mobile** | GPS geofencing, auto clock-in/out | Horas, localizacoes, padroes de movimento |
| **Timekeeper Web** | Entrada manual, relatorios, QR scan | Entradas manuais, estruturas de equipe |
| **Calculator** | Calculadora por voz para campo | Padroes de voz, tipos de calculo, formulas por oficio |
| **Eagle** | Monitoramento de obras | Fotos, progresso, issues, timeline |
| **Shop** | E-commerce para produtos | Padroes de compra, demanda por oficio |
| **Analytics** | Dashboard de saude do negocio | Leitura de agg_*, int_*, v_* views |

### 3. Entenda a Arquitetura de Banco

Todos os apps compartilham o **mesmo projeto Supabase**:
- Mesmo Auth
- Mesmo banco PostgreSQL
- Mesmas politicas RLS
- Project ID: `bjkhofdrzpczgnwxoauk`

**Nomenclatura de tabelas (DIRECTIVE 2026-02-01):**

| Prefixo | Significado | Exemplo |
|---------|-------------|---------|
| `tmk_` | Timekeeper (1 dono) | `tmk_entries`, `tmk_geofences` |
| `ccl_` | Calculator (1 dono) | `ccl_calculations`, `ccl_templates` |
| `egl_` | Eagle (1 dono) | `egl_sites`, `egl_houses` |
| `shp_` | Shop (1 dono) | `shp_products`, `shp_orders` |
| `core_` | Compartilhado (+1 donos) | `core_profiles`, `core_devices` |
| `ref_` | Reference data (lookup) | `ref_trades`, `ref_provinces` |
| `bil_` | Billing | `bil_subscriptions`, `bil_payments` |
| `log_` | Logs/Observability | `log_errors`, `log_events` |
| `agg_` | Aggregations | `agg_platform_daily`, `agg_user_daily` |
| `int_` | Intelligence/ML | `int_behavior_patterns`, `int_voice_patterns` |

### 4. Configure seu Ambiente

```bash
# Clone o monorepo
git clone https://github.com/onsite-club/onsite-eagle.git
cd onsite-eagle

# Instale dependencias
npm install

# Rode um app especifico
npm run dev:timekeeper    # Timekeeper Mobile
npm run dev:timekeeper-web # Timekeeper Web
npm run dev:calculator     # Calculator
npm run dev:analytics      # Analytics Dashboard
```

### 5. MCP (Model Context Protocol)

O projeto usa MCP para integrar Claude com:
- **Supabase MCP** — acesso direto ao banco de dados
- **Memory MCP** — memoria persistente entre sessoes

Configuracao em `.mcp.json` na raiz do projeto.

### 6. Regras de Ouro

Leia [Cerbero](./identity/cerbero.md) para entender as regras fundamentais:
- NO duct-tape fixes
- NO silent fails
- NO mixing concerns
- Migrations = source of truth
- RLS = always enabled

---

## Estrutura do Monorepo

```
onsite-eagle/
├── apps/
│   ├── timekeeper/        # React Native (Expo) - Mobile
│   ├── timekeeper-web/    # Next.js - Web dashboard
│   ├── calculator/        # React Native - Voice calculator
│   ├── field/             # Expo - Field inspector
│   ├── monitor/           # Next.js - Site monitoring
│   ├── analytics/         # Next.js - Business intelligence
│   ├── auth-app/          # Auth Hub
│   └── dashboard/         # Admin dashboard
├── packages/
│   ├── ui/                # Shared UI components
│   ├── supabase/          # Shared Supabase client & types
│   └── config/            # Shared configs (ESLint, TypeScript)
├── intelligence/          # <-- Voce esta aqui
│   ├── README.md
│   ├── identity/
│   ├── vision/
│   ├── schema/
│   └── decisions/
├── supabase/
│   └── migrations/        # SQL migrations (source of truth)
├── CLAUDE.md              # Contexto automatico para Claude
├── .mcp.json              # Configuracao MCP
└── package.json           # Turborepo config
```

---

## Links Uteis

- **Supabase Dashboard**: https://supabase.com/dashboard/project/bjkhofdrzpczgnwxoauk
- **Vercel (Analytics)**: (configurar)
- **Stripe Dashboard**: (configurar)

---

## Contato

Duvidas? Fale com o fundador (Cris) ou abra uma issue no repo.

---

*Ultima atualizacao: 2026-02-01*
