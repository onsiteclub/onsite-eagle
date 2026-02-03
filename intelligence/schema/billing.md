# Schema: Billing (Cobranca)

> Tabelas de cobranca e assinaturas (Stripe).

---

## Visao Geral

O sistema de billing e **centralizado** para todos os apps. Usa Stripe para:
- Assinaturas mensais
- Pagamentos unicos
- Checkout codes

---

## Tabelas

### bil_products

Produtos/planos disponiveis.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `id` | uuid PK | ID |
| `app_name` | text | App relacionado |
| `name` | text | Nome do plano |
| `stripe_product_id` | text | ID no Stripe |
| `stripe_price_id` | text | Price ID |
| `price_amount` | int | Preco em centavos |
| `billing_interval` | varchar | month/year |
| `features` | jsonb | Features incluidas |
| `is_active` | bool | Ativo |

---

### bil_subscriptions

Assinaturas ativas.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `id` | uuid PK | ID |
| `user_id` | uuid FK | Usuario |
| `app_name` | text | App |
| `plan_id` | uuid FK | Plano |
| `stripe_subscription_id` | text | ID Stripe |
| `status` | varchar | active/cancelled/past_due |
| `current_period_start` | timestamptz | Inicio periodo |
| `current_period_end` | timestamptz | Fim periodo |
| `cancel_at_period_end` | bool | Cancelar no fim |

---

### bil_payments

Historico de pagamentos.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `id` | uuid PK | ID |
| `user_id` | uuid FK | Usuario |
| `app_name` | text | App |
| `stripe_invoice_id` | text | Invoice |
| `amount` | int | Valor (centavos) |
| `status` | varchar | succeeded/failed |
| `paid_at` | timestamptz | Quando pagou |

---

### bil_checkout_codes

Codigos para checkout (magic links).

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `code` | text PK | Codigo unico |
| `user_id` | uuid FK | Usuario |
| `email` | text | Email |
| `expires_at` | timestamptz | Expiracao |
| `used` | bool | Ja usado |

---

## RLS

- bil_products: public SELECT (active)
- bil_subscriptions: own data SELECT
- bil_payments: own data SELECT
- bil_checkout_codes: own SELECT/UPDATE

---

## Views

### v_mrr

MRR/ARR por app.

```sql
SELECT
  app_name,
  SUM(price_amount) as mrr,
  SUM(price_amount) * 12 as arr
FROM bil_subscriptions
JOIN bil_products ON plan_id = bil_products.id
WHERE status = 'active'
GROUP BY app_name
```

---

*Ultima atualizacao: 2026-02-01*
