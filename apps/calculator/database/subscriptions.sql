-- database/subscriptions.sql
-- Schema para tabela de assinaturas do OnSite Calculator
-- Execute este script no SQL Editor do Supabase

-- Tabela de assinaturas
CREATE TABLE subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app TEXT NOT NULL DEFAULT 'calculator',
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'canceled', 'past_due', 'inactive', 'trialing')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,

  -- Constraint: um usuario so pode ter uma subscription por app
  UNIQUE(user_id, app)
);

-- Indices
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status) WHERE status = 'active';
CREATE INDEX idx_subscriptions_app ON subscriptions(app);

-- RLS: Row Level Security
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Politica: Usuarios podem ver suas proprias subscriptions
CREATE POLICY "Users can view own subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Politica: Apenas service role pode inserir/atualizar (via webhook do Stripe)
-- INSERT e UPDATE sao feitos pelo backend/webhook, nao pelo cliente
CREATE POLICY "Service role can manage subscriptions" ON subscriptions
  FOR ALL USING (auth.role() = 'service_role');

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- QUERIES UTEIS
-- ============================================

-- Ver todas as subscriptions ativas
-- SELECT * FROM subscriptions WHERE status = 'active';

-- Ver subscriptions de um usuario
-- SELECT * FROM subscriptions WHERE user_id = 'UUID_DO_USUARIO';

-- Verificar se usuario tem acesso ao calculator
-- SELECT * FROM subscriptions
-- WHERE user_id = 'UUID_DO_USUARIO'
-- AND app IN ('calculator', 'calculator-pro', 'onsite-calculator')
-- AND status IN ('active', 'trialing')
-- AND (current_period_end IS NULL OR current_period_end > NOW());
