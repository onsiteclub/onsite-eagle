-- ===========================================
-- ONSITE AUTH HUB - Database Schema
-- ===========================================
-- Run this in your Supabase SQL Editor
-- https://supabase.com/dashboard/project/YOUR_PROJECT/sql

-- -------------------------------------------
-- SUBSCRIPTIONS TABLE
-- -------------------------------------------
-- Stores subscription status per app per user
-- Each user can have one subscription per app

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app TEXT NOT NULL,                              -- 'calculator', 'timekeeper', 'dashboard'
  stripe_customer_id TEXT,                        -- Stripe customer ID
  stripe_subscription_id TEXT,                    -- Stripe subscription ID
  stripe_price_id TEXT,                           -- Stripe price ID
  status TEXT NOT NULL DEFAULT 'inactive',        -- 'active', 'canceled', 'past_due', 'inactive', 'trialing'
  current_period_start TIMESTAMPTZ,               -- Subscription period start
  current_period_end TIMESTAMPTZ,                 -- Subscription period end
  cancel_at_period_end BOOLEAN DEFAULT FALSE,     -- Will cancel at period end?

  -- Customer information (from Stripe Checkout)
  customer_email TEXT,                            -- Customer email
  customer_name TEXT,                             -- Customer full name
  customer_phone TEXT,                            -- Customer phone number
  billing_address_line1 TEXT,                     -- Street address line 1
  billing_address_line2 TEXT,                     -- Street address line 2 (apt, suite, etc)
  billing_address_city TEXT,                      -- City
  billing_address_state TEXT,                     -- State/Province
  billing_address_postal_code TEXT,               -- ZIP/Postal code
  billing_address_country TEXT,                   -- Country code (CA, US, BR, etc)

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, app)                            -- One subscription per app per user
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON public.subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON public.subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

-- -------------------------------------------
-- ROW LEVEL SECURITY (RLS)
-- -------------------------------------------
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON public.subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert/update/delete (via webhooks)
-- No policy needed - service role bypasses RLS

-- -------------------------------------------
-- UPDATED_AT TRIGGER
-- -------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_subscriptions_updated
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- -------------------------------------------
-- APP PRODUCTS CONFIGURATION
-- -------------------------------------------
-- Optional: Store app-specific Stripe configuration
-- Useful if you want to manage products in DB instead of env vars

CREATE TABLE IF NOT EXISTS public.app_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app TEXT NOT NULL UNIQUE,                       -- 'calculator', 'timekeeper', 'dashboard'
  name TEXT NOT NULL,                             -- Display name
  description TEXT,                               -- Product description
  stripe_price_id TEXT NOT NULL,                  -- Stripe price ID for this app
  stripe_product_id TEXT,                         -- Stripe product ID
  features JSONB DEFAULT '[]',                    -- List of features
  is_active BOOLEAN DEFAULT TRUE,                 -- Is this product available?
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for updated_at
CREATE TRIGGER on_app_products_updated
  BEFORE UPDATE ON public.app_products
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- -------------------------------------------
-- SEED DATA (Optional - adjust price IDs)
-- -------------------------------------------
-- Uncomment and modify with your actual Stripe price IDs

-- INSERT INTO public.app_products (app, name, description, stripe_price_id, features) VALUES
-- ('calculator', 'OnSite Calculator Pro', 'Acesso completo à calculadora com recursos de voz', 'price_xxx', '["Reconhecimento de voz", "Cálculos avançados", "Histórico ilimitado"]'),
-- ('timekeeper', 'OnSite Timekeeper Pro', 'Controle de ponto e horas trabalhadas', 'price_yyy', '["Relatórios detalhados", "Exportação PDF", "Múltiplos projetos"]'),
-- ('dashboard', 'OnSite Dashboard Pro', 'Dashboard completo com analytics', 'price_zzz', '["Analytics avançados", "Relatórios customizados", "API access"]')
-- ON CONFLICT (app) DO UPDATE SET
--   stripe_price_id = EXCLUDED.stripe_price_id,
--   features = EXCLUDED.features;

-- -------------------------------------------
-- HELPER FUNCTION: Check subscription status
-- -------------------------------------------
-- Use this in your apps to check if user has active subscription

CREATE OR REPLACE FUNCTION public.has_active_subscription(p_user_id UUID, p_app TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = p_user_id
      AND app = p_app
      AND status IN ('active', 'trialing')
      AND (current_period_end IS NULL OR current_period_end > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.has_active_subscription TO authenticated;

-- -------------------------------------------
-- MIGRATION: Add customer fields to existing table
-- -------------------------------------------
-- Run this if the subscriptions table already exists
-- These commands are safe to run multiple times (IF NOT EXISTS)

DO $$
BEGIN
  -- Add customer_email if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'customer_email') THEN
    ALTER TABLE public.subscriptions ADD COLUMN customer_email TEXT;
  END IF;

  -- Add customer_name if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'customer_name') THEN
    ALTER TABLE public.subscriptions ADD COLUMN customer_name TEXT;
  END IF;

  -- Add customer_phone if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'customer_phone') THEN
    ALTER TABLE public.subscriptions ADD COLUMN customer_phone TEXT;
  END IF;

  -- Add billing address fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'billing_address_line1') THEN
    ALTER TABLE public.subscriptions ADD COLUMN billing_address_line1 TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'billing_address_line2') THEN
    ALTER TABLE public.subscriptions ADD COLUMN billing_address_line2 TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'billing_address_city') THEN
    ALTER TABLE public.subscriptions ADD COLUMN billing_address_city TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'billing_address_state') THEN
    ALTER TABLE public.subscriptions ADD COLUMN billing_address_state TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'billing_address_postal_code') THEN
    ALTER TABLE public.subscriptions ADD COLUMN billing_address_postal_code TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'billing_address_country') THEN
    ALTER TABLE public.subscriptions ADD COLUMN billing_address_country TEXT;
  END IF;
END $$;
