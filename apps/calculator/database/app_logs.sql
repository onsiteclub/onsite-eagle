-- database/app_logs.sql
-- Schema para tabela de logs do OnSite Calculator
-- Execute este script no SQL Editor do Supabase

-- Tabela principal de logs
CREATE TABLE app_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id),
  level TEXT NOT NULL CHECK (level IN ('info', 'warn', 'error')),
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  message TEXT,
  context JSONB DEFAULT '{}',
  device_info JSONB DEFAULT '{}',
  ip TEXT,
  duration_ms INTEGER,
  success BOOLEAN
);

-- Indices para consultas eficientes
CREATE INDEX idx_app_logs_user_id ON app_logs(user_id);
CREATE INDEX idx_app_logs_created_at ON app_logs(created_at DESC);
CREATE INDEX idx_app_logs_level ON app_logs(level) WHERE level = 'error';
CREATE INDEX idx_app_logs_module ON app_logs(module);

-- RLS: Usuarios so veem seus proprios logs
ALTER TABLE app_logs ENABLE ROW LEVEL SECURITY;

-- Politica: Qualquer um pode inserir logs (inclusive anonimos e serverless)
CREATE POLICY "Anyone can insert logs" ON app_logs
  FOR INSERT WITH CHECK (true);

-- Politica: Usuarios autenticados podem ler seus proprios logs
CREATE POLICY "Users can read own logs" ON app_logs
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- FUNCAO DE LIMPEZA (Retencao de 30 dias)
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM app_logs
  WHERE created_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- QUERIES UTEIS PARA DASHBOARD
-- ============================================

-- Erros por modulo (ultimas 24h)
-- SELECT module, action, COUNT(*) as count
-- FROM app_logs
-- WHERE level = 'error' AND created_at > NOW() - INTERVAL '24 hours'
-- GROUP BY module, action
-- ORDER BY count DESC;

-- Taxa de sucesso Voice API (por hora)
-- SELECT
--   DATE_TRUNC('hour', created_at) as hour,
--   COUNT(*) FILTER (WHERE success = true) as success,
--   COUNT(*) FILTER (WHERE success = false) as failure,
--   AVG(duration_ms) as avg_duration_ms
-- FROM app_logs
-- WHERE module = 'Voice' AND action = 'api_interpret'
-- GROUP BY hour
-- ORDER BY hour DESC
-- LIMIT 24;

-- Usuarios com mais erros (ultimos 7 dias)
-- SELECT user_id, COUNT(*) as error_count
-- FROM app_logs
-- WHERE level = 'error' AND created_at > NOW() - INTERVAL '7 days'
-- GROUP BY user_id
-- ORDER BY error_count DESC
-- LIMIT 10;

-- Logs recentes de um usuario
-- SELECT * FROM app_logs
-- WHERE user_id = 'UUID_DO_USUARIO'
-- ORDER BY created_at DESC
-- LIMIT 50;
