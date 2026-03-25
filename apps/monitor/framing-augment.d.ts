/**
 * Module augmentation for @onsite/framing types.
 *
 * Adds computed/joined fields that monitor queries return
 * but are not part of the canonical DB schema.
 */
import '@onsite/framing'

declare module '@onsite/framing' {
  interface FrmMaterialRequest {
    // Joined/computed fields used in monitor app queries
    lot_number?: string | null
  }
}
