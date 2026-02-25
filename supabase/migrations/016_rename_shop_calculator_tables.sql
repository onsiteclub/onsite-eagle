-- =====================================================================
-- Migration 016: Rename Shop + Calculator Tables (Group 2 — Medium Risk)
--
-- DIRECTIVE 2026-02-01: Canonical naming convention
-- Strategy: RENAME table → CREATE VIEW with old name for backward-compat
--
-- Tables affected:
--   app_shop_products          → shp_products
--   app_shop_product_variants  → shp_variants
--   app_shop_categories        → shp_categories
--   app_shop_orders            → shp_orders
--   app_shop_order_items       → shp_order_items
--   app_shop_carts             → shp_carts
--   app_calculator_calculations → ccl_calculations
--   app_calculator_templates   → ccl_templates
--
-- Risk: MEDIUM — Shop tables have FKs between themselves (orders→products).
-- Calculator has FK from calculations→templates and calculations→voice_logs.
-- All FKs are OUTGOING from these tables, not incoming from other schemas.
-- =====================================================================

BEGIN;

-- ─── Shop ─────────────────────────────────────────────────────────

-- 1. Categories first (referenced by products)
ALTER TABLE app_shop_categories RENAME TO shp_categories;
CREATE OR REPLACE VIEW app_shop_categories AS SELECT * FROM shp_categories;

-- 2. Products (references categories)
ALTER TABLE app_shop_products RENAME TO shp_products;
CREATE OR REPLACE VIEW app_shop_products AS SELECT * FROM shp_products;

-- 3. Variants (references products)
ALTER TABLE app_shop_product_variants RENAME TO shp_variants;
CREATE OR REPLACE VIEW app_shop_product_variants AS SELECT * FROM shp_variants;

-- 4. Orders
ALTER TABLE app_shop_orders RENAME TO shp_orders;
CREATE OR REPLACE VIEW app_shop_orders AS SELECT * FROM shp_orders;

-- 5. Order items (references orders + products)
ALTER TABLE app_shop_order_items RENAME TO shp_order_items;
CREATE OR REPLACE VIEW app_shop_order_items AS SELECT * FROM shp_order_items;

-- 6. Carts
ALTER TABLE app_shop_carts RENAME TO shp_carts;
CREATE OR REPLACE VIEW app_shop_carts AS SELECT * FROM shp_carts;

-- ─── Calculator ───────────────────────────────────────────────────

-- Templates first (referenced by calculations)
ALTER TABLE app_calculator_templates RENAME TO ccl_templates;
CREATE OR REPLACE VIEW app_calculator_templates AS SELECT * FROM ccl_templates;

-- Calculations (references templates)
ALTER TABLE app_calculator_calculations RENAME TO ccl_calculations;
CREATE OR REPLACE VIEW app_calculator_calculations AS SELECT * FROM ccl_calculations;

COMMIT;

-- Post-migration verification:
-- SELECT count(*) FROM shp_products;
-- SELECT count(*) FROM app_shop_products;  -- should work via view
-- SELECT count(*) FROM ccl_calculations;
-- SELECT count(*) FROM app_calculator_calculations;  -- should work via view
