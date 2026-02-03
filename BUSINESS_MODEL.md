# OnSite Club — Modelo de Negócio

> **Pay-per-Production**: Workers pagam centavos por sqft construído.
> Contractors usam grátis.

---

## 1. A Ideia Central

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│   "Quanto mais você constrói, mais você paga.               │
│    Mas o que você paga é irrisório."                        │
│                                                              │
│   Taxa: $0.005/sqft (meio centavo por pé quadrado)          │
│                                                              │
│   Casa de 2000 sqft = $10 total dividido entre workers      │
│   Worker que fez 3 de 7 phases = $4.29                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Por Que Esse Modelo?

### Para Contractors (GRÁTIS)

| Benefício | Descrição |
|-----------|-----------|
| **Zero barreira** | Não paga nada, adota imediatamente |
| **Visibilidade** | Monitora progresso de todas as casas em tempo real |
| **Documentação** | Fotos de cada phase, validadas por AI |
| **Menos risco** | Detecta problemas antes que virem retrabalho |

### Para Workers (PAY-PER-SQFT)

| Benefício | Descrição |
|-----------|-----------|
| **Justo** | Paga proporcional ao que produz |
| **Barato** | $4-10 por casa, menos que um café |
| **Portfólio** | Histórico de trabalho documentado |
| **Reputação** | Phases aprovadas = credibilidade |

### Para OnSite Club (RECEITA)

| Benefício | Descrição |
|-----------|-----------|
| **Volume** | Milhares de workers × milhares de casas |
| **Dados** | Cada foto alimenta Prumo AI |
| **Crescimento orgânico** | Contractors convidam workers |
| **Alinhamento** | Ganhamos quando eles ganham |

---

## 3. Como Funciona

### Fluxo Completo

```
┌──────────────────────────────────────────────────────────────┐
│  1. CONTRACTOR CRIA PROJETO                                  │
│                                                               │
│     Site: "Maple Heights Phase 2"                            │
│     Houses: 45 lotes                                         │
│     Cada casa: ~2000 sqft                                    │
│                                                               │
│     💰 Custo para contractor: $0                             │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  2. CONTRACTOR ATRIBUI WORKERS                               │
│                                                               │
│     Lot 42 (2000 sqft):                                      │
│       - João (Framing)                                       │
│       - Mike (Electrical)                                    │
│       - Carlos (Drywall)                                     │
│                                                               │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  3. WORKERS DOCUMENTAM PHASES                                │
│                                                               │
│     João abre Eagle Field app:                               │
│       - Escaneia QR code do Lot 42                           │
│       - Tira fotos da Phase 2 (Framing)                      │
│       - AI valida automaticamente                            │
│       - Phase aprovada ✓                                     │
│                                                               │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  4. SISTEMA CALCULA CONTRIBUIÇÃO                             │
│                                                               │
│     Lot 42 (2000 sqft) - 7 phases:                           │
│                                                               │
│     João:  Phase 1,2,3 = 3/7 = 857 sqft                      │
│     Mike:  Phase 4,5   = 2/7 = 571 sqft                      │
│     Carlos: Phase 6,7  = 2/7 = 571 sqft                      │
│                                                               │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  5. FIM DO MÊS - COBRANÇA                                    │
│                                                               │
│     João trabalhou em 15 casas no mês:                       │
│       Total: 12,500 sqft contribuído                         │
│       Taxa: $0.005/sqft                                      │
│       Fatura: $62.50                                         │
│                                                               │
│     💳 Stripe cobra automaticamente                          │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## 4. Matemática do Negócio

### Cenário: Contractor Médio

```
1 contractor = 50 casas/ano
Cada casa = 2000 sqft
Total sqft = 100,000 sqft/ano

Taxa = $0.005/sqft
Receita por contractor = $500/ano

Se 1000 contractors usam = $500,000/ano
Se 5000 contractors usam = $2,500,000/ano
```

### Cenário: Worker Médio

```
1 worker = 3-4 phases por semana
Cada phase = ~300 sqft (1 casa / 7 phases)
Por semana = ~1000 sqft
Por mês = ~4000 sqft

Taxa = $0.005/sqft
Custo mensal = $20

Salário médio worker = $4000-6000/mês
$20 = 0.3-0.5% do salário = IRRISÓRIO
```

### Break-even

```
Custo Supabase Pro = $25/mês = $300/ano
Custo Vercel Pro = $20/mês = $240/ano
Total infraestrutura = ~$600/ano

Break-even = 120,000 sqft/ano
           = 60 casas de 2000 sqft
           = 2 contractors pequenos
```

---

## 5. Tiers de Preço

### Workers

| Volume Mensal | Taxa | Exemplo |
|---------------|------|---------|
| 0 - 5,000 sqft | $0.005/sqft | $25 max |
| 5,001 - 20,000 sqft | $0.004/sqft | $60-80 |
| 20,001+ sqft | $0.003/sqft | Volume discount |

### Contractors (Sempre Grátis... mas)

| Tier | Preço | Features |
|------|-------|----------|
| **Free** | $0 | Até 10 sites ativos, 100 houses |
| **Pro** | $49/mês | Ilimitado, relatórios avançados |
| **Enterprise** | Contato | API, white-label, suporte dedicado |

---

## 6. Implementação Técnica

### Tabelas Necessárias

```sql
-- 1. Square feet nas casas
ALTER TABLE egl_houses ADD COLUMN square_feet INTEGER;

-- 2. Atribuição de workers
CREATE TABLE egl_assignments (
  id UUID PRIMARY KEY,
  house_id UUID REFERENCES egl_houses(id),
  worker_id UUID REFERENCES core_profiles(id),
  assigned_by UUID REFERENCES core_profiles(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  removed_at TIMESTAMPTZ
);

-- 3. Usage tracking
CREATE TABLE bil_usage (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES core_profiles(id),
  period_start DATE,
  period_end DATE,
  sqft_total INTEGER DEFAULT 0,
  rate_per_sqft NUMERIC(10,5) DEFAULT 0.005,
  amount_due NUMERIC(10,2),
  status VARCHAR(20), -- pending, invoiced, paid
  stripe_invoice_id TEXT,
  paid_at TIMESTAMPTZ
);
```

### Cálculo de Contribuição

```sql
-- View: sqft por worker por mês
CREATE VIEW v_worker_sqft_monthly AS
SELECT
  p.uploaded_by as worker_id,
  DATE_TRUNC('month', p.created_at) as month,
  COUNT(DISTINCT h.id) as houses_worked,
  COUNT(DISTINCT (h.id, p.phase_id)) as phases_approved,
  SUM(h.square_feet::numeric / 7) as sqft_contributed
FROM egl_photos p
JOIN egl_houses h ON p.house_id = h.id
WHERE p.ai_validation_status = 'approved'
GROUP BY p.uploaded_by, DATE_TRUNC('month', p.created_at);
```

### Integração Stripe (Metered Billing)

```typescript
// Quando phase é aprovada
async function onPhaseApproved(photo: EglPhoto) {
  const house = await getHouse(photo.house_id);
  const sqftContribution = Math.ceil(house.square_feet / 7);

  // Reporta usage ao Stripe
  await stripe.subscriptionItems.createUsageRecord(
    worker.stripe_subscription_item_id,
    {
      quantity: sqftContribution,
      action: 'increment',
    }
  );
}

// Stripe cobra automaticamente no fim do período
```

---

## 7. Vantagem Competitiva

### Dados = Ouro

```
Cada foto aprovada:
  - Treina Prumo AI (visão computacional)
  - Mapeia padrões de construção por região
  - Identifica trades mais produtivos
  - Detecta problemas comuns por phase

Quanto mais workers usam → mais dados → melhor AI → mais valor
```

### Network Effects

```
Contractor usa grátis
     ↓
Convida seus workers
     ↓
Workers pagam (pouco)
     ↓
Workers recomendam a outros contractors
     ↓
Mais contractors
     ↓
Mais workers
     ↓
FLYWHEEL 🔄
```

---

## 8. Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Workers não querem pagar | Valor tão baixo que não vale reclamar |
| Contractors não veem valor | Mostrar fotos evitando retrabalho de $10k+ |
| Fraude (fotos falsas) | AI validation + spot checks |
| Churn de workers | Gamification, badges, histórico portátil |
| Competidores copiam | Dados acumulados + Prumo AI = moat |

---

## 9. Roadmap de Monetização

### Fase 1: Validação (Agora)
- [ ] Adicionar `square_feet` nas houses
- [ ] Criar `bil_usage` table
- [ ] Testar com 2-3 contractors amigos
- [ ] Validar que workers aceitam pagar

### Fase 2: Soft Launch (Q2 2026)
- [ ] Integrar Stripe metered billing
- [ ] Dashboard de usage para workers
- [ ] Primeiros 100 workers pagantes

### Fase 3: Scale (Q3-Q4 2026)
- [ ] Marketing para contractors (grátis!)
- [ ] App Store / Play Store
- [ ] Meta: 1000 workers pagantes

### Fase 4: Expand (2027)
- [ ] Prumo AI em produção
- [ ] Premium features para contractors
- [ ] Expansão para outras províncias

---

## 10. Resumo Executivo

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  OnSite Club monetiza construção por PRODUÇÃO, não por      │
│  assinatura fixa.                                           │
│                                                              │
│  Contractors: GRÁTIS (para maximizar adoção)                │
│  Workers: $0.005/sqft (para maximizar dados)                │
│                                                              │
│  Worker médio paga ~$20/mês                                 │
│  OnSite Club coleta milhões de fotos                        │
│  Prumo AI aprende com dados reais                           │
│                                                              │
│  Todos ganham. 🏗️                                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

*Documento criado em 2026-02-01*
*OnSite Club — "Wear what you do!"*
