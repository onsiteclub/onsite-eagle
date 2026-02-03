-- ============================================================================
-- Migration: Message Phase Tracking
-- ============================================================================
-- Author: Cerbero (Guardian of Supabase)
-- Date: 2026-02-02
-- Description: Track the phase at which each message was created
--              This enables visual timeline with phase-based backgrounds
-- ============================================================================

-- Add phase tracking column to messages
ALTER TABLE egl_messages
ADD COLUMN IF NOT EXISTS phase_at_creation int DEFAULT 1;

-- Comment
COMMENT ON COLUMN egl_messages.phase_at_creation IS 'The lot phase when this message was created (1-7). Used for visual timeline coloring.';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
