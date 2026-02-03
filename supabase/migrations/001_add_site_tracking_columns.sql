-- ============================================================================
-- Migration: Add Site Tracking Columns
-- ============================================================================
-- Author: Cerbero (Guardian of Supabase)
-- Date: 2026-02-01
-- Description: Add missing columns to egl_sites for project tracking
--              and fix egl_houses status constraint to include 'on_hold'
-- ============================================================================
--
-- CHECKLIST BEFORE APPLYING:
-- [x] 1. Li o schema atual da tabela afetada
-- [x] 2. Verifiquei se tem FKs apontando (egl_houses, egl_scans - não afeta)
-- [x] 3. Verifiquei views dependentes (VIEW sites auto-atualiza)
-- [x] 4. Código já usa essas colunas (apps/monitor/src/app/site/new/page.tsx)
-- [x] 5. RLS não precisa atualizar (só ADD COLUMN)
-- [x] 6. Indexes não necessários para estas colunas
-- [x] 7. Documentar no CLAUDE.md após aplicar
--
-- ============================================================================

-- =============================================================
-- PART 1: Add missing columns to egl_sites
-- =============================================================

-- Total number of lots in the site
ALTER TABLE egl_sites
ADD COLUMN IF NOT EXISTS total_lots INTEGER DEFAULT 0;

-- Number of completed lots (for progress tracking)
ALTER TABLE egl_sites
ADD COLUMN IF NOT EXISTS completed_lots INTEGER DEFAULT 0;

-- Project start date
ALTER TABLE egl_sites
ADD COLUMN IF NOT EXISTS start_date DATE;

-- Expected completion date
ALTER TABLE egl_sites
ADD COLUMN IF NOT EXISTS expected_end_date DATE;

-- =============================================================
-- PART 2: Fix egl_houses status constraint to include 'on_hold'
-- =============================================================

-- Drop old constraint
ALTER TABLE egl_houses
DROP CONSTRAINT IF EXISTS egl_houses_status_check;

-- Add new constraint with 'on_hold' status
ALTER TABLE egl_houses
ADD CONSTRAINT egl_houses_status_check
CHECK (status IN ('not_started', 'in_progress', 'delayed', 'completed', 'on_hold'));

-- =============================================================
-- COMMENTS (Documentation)
-- =============================================================

COMMENT ON COLUMN egl_sites.total_lots IS 'Total number of lots/houses planned for this site';
COMMENT ON COLUMN egl_sites.completed_lots IS 'Number of lots marked as completed';
COMMENT ON COLUMN egl_sites.start_date IS 'Project start date';
COMMENT ON COLUMN egl_sites.expected_end_date IS 'Expected project completion date';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
