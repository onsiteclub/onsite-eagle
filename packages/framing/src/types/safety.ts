import type { PhaseId } from './phase'

export type SafetyCheckStatus = 'open' | 'resolved'
export type CertificationStatus = 'pending' | 'verified' | 'expired' | 'revoked'

export interface FrmSafetyCheck {
  id: string
  organization_id: string | null
  lot_id: string
  phase_id: PhaseId | null
  type: string
  status: SafetyCheckStatus
  blocking: boolean // default true
  reported_by: string
  photo_url: string // NOT NULL
  description: string | null
  resolved_by: string | null
  resolved_at: string | null
  resolved_photo: string | null
  created_at: string
}

export interface FrmCertification {
  id: string
  organization_id: string | null
  worker_id: string
  cert_type: string
  cert_number: string | null
  issued_at: string | null
  expires_at: string | null
  document_url: string | null
  verified_by: string | null
  verified_at: string | null
  status: CertificationStatus
  created_at: string
}
