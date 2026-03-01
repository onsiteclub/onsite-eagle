export type WarningCategory = 'safety' | 'compliance' | 'operational'
export type WarningPriority = 'critical' | 'warning' | 'info'
export type WarningStatus = 'active' | 'resolved' | 'expired'
export type WarningTargetType = 'worker' | 'crew' | 'jobsite' | 'all'

export interface FrmWarning {
  id: string
  organization_id: string | null
  lot_id: string | null
  target_type: WarningTargetType
  target_id: string | null
  category: WarningCategory
  title: string
  description: string | null
  sent_by: string | null
  priority: WarningPriority
  persistent: boolean
  dismissable: boolean
  status: WarningStatus
  resolved_by: string | null
  resolved_at: string | null
  resolved_proof: string | null
  expires_at: string | null
  created_at: string
}
