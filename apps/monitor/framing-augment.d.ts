/**
 * Module augmentation for @onsite/framing FrmLot interface.
 *
 * The monitor app was built against an older schema that had properties like
 * progress_percentage, is_issued, schedule_notes, etc. on the House (FrmLot) type.
 * These properties no longer exist on the canonical FrmLot type after the
 * egl_* -> frm_* migration.
 *
 * This augmentation adds them as optional properties so the existing monitor code
 * compiles without errors. This is TEMPORARY — the monitor app will be rewritten
 * in Sprint 2 to use the new schema properly.
 */
import '@onsite/framing'

declare module '@onsite/framing' {
  interface FrmLot {
    // Legacy properties used by monitor app (not in DB, will be removed in Sprint 2)
    progress_percentage?: number
    is_issued?: boolean
    issued_at?: string | null
    issued_to_worker_id?: string | null
    issued_to_worker_name?: string | null
    schedule_notes?: string | null
  }

  interface FrmMaterialRequest {
    // Joined/computed fields used in monitor app queries
    lot_number?: string | null
  }
}
