/** Framing Operations roles (merged from spec) */
export type FrmRole = 'owner' | 'admin' | 'supervisor' | 'crew_lead' | 'worker' | 'operator' | 'builder'

/** Role display labels */
export const FRM_ROLE_LABELS: Record<FrmRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  supervisor: 'Supervisor',
  crew_lead: 'Crew Lead',
  worker: 'Worker',
  operator: 'Operator',
  builder: 'Builder',
}

/** Role permissions (from spec section 4.5) */
export const FRM_ROLE_PERMISSIONS: Record<FrmRole, string[]> = {
  owner: ['*'],
  admin: ['*'],
  supervisor: [
    'jobsite.manage', 'lot.manage', 'crew.manage', 'assignment.manage',
    'house_item.create', 'house_item.resolve', 'house_item.view_all',
    'gate_check.perform', 'gate_check.view',
    'safety.create', 'safety.resolve',
    'warning.send', 'warning.resolve',
    'payment.approve', 'payment.view',
    'material.authorize', 'material.view',
    'report.view', 'report.create',
  ],
  crew_lead: [
    'lot.view', 'crew.view_own',
    'house_item.create', 'house_item.resolve_own', 'house_item.view_own',
    'material.request', 'material.view_own',
    'equipment.request',
    'photo.upload',
  ],
  worker: [
    'lot.view_assigned',
    'house_item.view_own',
    'photo.upload',
    'warning.view_own', 'warning.resolve_own',
    'certification.upload',
  ],
  operator: [
    'material.deliver', 'material.view_assigned',
    'equipment.accept', 'equipment.complete', 'equipment.view_assigned',
    'jobsite.view_assigned',
  ],
  builder: [
    'jobsite.view', 'lot.view',
    'house_item.view_safety',
    'gate_check.view',
    'report.view',
  ],
}

/** Check if a role has a specific permission */
export function hasPermission(role: FrmRole, permission: string): boolean {
  const perms = FRM_ROLE_PERMISSIONS[role]
  return perms.includes('*') || perms.includes(permission)
}

/** Storage bucket name for framing media */
export const FRM_MEDIA_BUCKET = 'frm-media'

/** Supabase table names */
export const FRM_TABLES = {
  phases: 'frm_phases',
  jobsites: 'frm_jobsites',
  lots: 'frm_lots',
  crews: 'frm_crews',
  crew_workers: 'frm_crew_workers',
  phase_assignments: 'frm_phase_assignments',
  gate_checks: 'frm_gate_checks',
  gate_check_items: 'frm_gate_check_items',
  gate_check_templates: 'frm_gate_check_templates',
  house_items: 'frm_house_items',
  phase_payments: 'frm_phase_payments',
  material_requests: 'frm_material_requests',
  equipment_requests: 'frm_equipment_requests',
  warnings: 'frm_warnings',
  certifications: 'frm_certifications',
  safety_checks: 'frm_safety_checks',
  trade_pauses: 'frm_trade_pauses',
  third_party_entries: 'frm_third_party_entries',
  return_visits: 'frm_return_visits',
  photos: 'frm_photos',
  timeline: 'frm_timeline',
  progress: 'frm_progress',
  documents: 'frm_documents',
  document_batches: 'frm_document_batches',
  document_links: 'frm_document_links',
  messages: 'frm_messages',
  schedules: 'frm_schedules',
  schedule_phases: 'frm_schedule_phases',
  external_events: 'frm_external_events',
  scans: 'frm_scans',
  site_workers: 'frm_site_workers',
  operator_assignments: 'frm_operator_assignments',
  ai_reports: 'frm_ai_reports',
  assignments: 'frm_assignments',
  material_tracking: 'frm_material_tracking',
} as const
