-- database/retention_cleanup.sql
-- Cleanup functions for data retention compliance
-- Calculations: 90 days | Voice logs: 30 days | Error logs: 30 days
-- Schedule via pg_cron or call manually from Supabase Dashboard

-- ============================================
-- CLEANUP: calculations older than 90 days
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_old_calculations()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM calculations
  WHERE created_at < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % calculations older than 90 days', deleted_count;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- CLEANUP: voice_logs older than 30 days
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_old_voice_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM voice_logs
  WHERE created_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % voice_logs older than 30 days', deleted_count;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- CLEANUP: app_logs (errors) older than 30 days
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_old_app_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM app_logs
  WHERE created_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % app_logs older than 30 days', deleted_count;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- MASTER: run all cleanup functions
-- ============================================
CREATE OR REPLACE FUNCTION run_retention_cleanup()
RETURNS TABLE(table_name TEXT, deleted_rows INTEGER) AS $$
BEGIN
  table_name := 'calculations';
  deleted_rows := cleanup_old_calculations();
  RETURN NEXT;

  table_name := 'voice_logs';
  deleted_rows := cleanup_old_voice_logs();
  RETURN NEXT;

  table_name := 'app_logs';
  deleted_rows := cleanup_old_app_logs();
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- USAGE (run manually or schedule with pg_cron):
-- SELECT * FROM run_retention_cleanup();
--
-- To schedule daily at 3:00 AM UTC (requires pg_cron extension):
-- SELECT cron.schedule('retention-cleanup', '0 3 * * *', 'SELECT run_retention_cleanup()');
-- ============================================
