# Schema: Shop (E-commerce)

> Tabelas do app Shop para venda de produtos.

---

## Visao Geral

O Shop e o **e-commerce** do OnSite Club. Vende:
- Roupas e acessorios para construcao
- Ferramentas
- Materiais

---

## Tabelas

### shp_products

Produtos.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `id` | uuid PK | ID |
| `sku` | varchar | SKU |
| `name` | text | Nome |
| `slug` | text | URL slug |
| `category_id` | uuid FK | Categoria |
| `target_trades` | text[] | Oficios alvo |
| `base_price` | numeric | Preco base |
| `has_variants` | bool | Tem variantes |
| `is_active` | bool | Ativo |
| `is_featured` | bool | Destaque |
| `total_sold` | int | Total vendido |

---

### shp_variants

Variantes de produtos (tamanho, cor).

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `id` | uuid PK | ID |
| `product_id` | uuid FK | Produto |
| `size` | varchar | Tamanho |
| `color` | varchar | Cor |
| `price` | numeric | Preco |
| `inventory_quantity` | int | Estoque |

---

### shp_categories

Categorias de produtos.

---

### shp_orders

Pedidos.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `id` | uuid PK | ID |
| `user_id` | uuid FK | Usuario |
| `order_number` | varchar | Numero |
| `status` | varchar | pending/paid/shipped/delivered |
| `total` | numeric | Total |
| `stripe_payment_intent_id` | text | Stripe |
| `shipping_address` | jsonb | Endereco |

---

### shp_order_items

Items do pedido.

---

### shp_carts

Carrinhos (abandonados ou ativos).

---

## RLS

- Products/Categories: public SELECT (active)
- Orders: own data only
- Carts: own data (authenticated)

---

## Integracao Stripe

- `stripe_session_id` — Checkout session
- `stripe_payment_intent_id` — Payment intent

---

*Ultima atualizacao: 2026-02-01*
