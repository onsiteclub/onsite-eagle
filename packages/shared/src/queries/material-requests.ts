/**
 * Material Requests - Shared Queries
 * Used by Monitor (create requests) and Operator (manage deliveries)
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { FrmMaterialRequest, MaterialRequestStatus, UrgencyLevel } from '@onsite/framing'

// ===========================================
// TYPES
// ===========================================

export interface MaterialRequestFilters {
  jobsiteId?: string
  jobsiteIds?: string[]  // For operator viewing multiple jobsites
  lotId?: string
  status?: MaterialRequestStatus | 'all'
  urgency?: UrgencyLevel | 'all'
  limit?: number
  // Legacy aliases
  siteId?: string
  siteIds?: string[]
  houseId?: string
}

export interface CreateMaterialRequestInput {
  lot_id: string
  phase_id: string
  jobsite_id?: string | null
  material_type?: string | null
  material_name?: string | null
  quantity?: number | null
  unit: string
  urgency_level: UrgencyLevel
  delivery_location?: string | null
  notes?: string | null
  requested_by: string
  requested_by_name?: string | null
}

export interface UpdateRequestStatusInput {
  status: MaterialRequestStatus
  delivered_by_id?: string | null
  delivered_by_name?: string | null
  delivery_notes?: string | null
}

// ===========================================
// URGENCY SCORING
// ===========================================

export const URGENCY_WEIGHTS = {
  explicit: 0.40,      // 40% - User-selected urgency
  phase_blocking: 0.25, // 25% - Is this blocking work?
  schedule: 0.20,       // 20% - Is the lot behind schedule?
  lot_priority: 0.15    // 15% - Lot priority score
}

export const URGENCY_BASE_SCORES: Record<UrgencyLevel, number> = {
  critical: 100,
  high: 75,
  medium: 50,
  low: 25
}

/**
 * Calculate urgency score (0-100) for a material request
 */
export function calculateUrgencyScore(
  urgencyLevel: UrgencyLevel,
  lot?: { status?: string; priority_score?: number } | null
): number {
  const factors = {
    explicit_urgency: URGENCY_BASE_SCORES[urgencyLevel] || 50,
    phase_blocking: 50, // Default - could be enhanced with phase data
    schedule_deviation: lot?.status === 'delayed' ? 80 :
                        lot?.status === 'on_hold' ? 60 : 30,
    lot_priority: lot?.priority_score || 50
  }

  return Math.round(
    factors.explicit_urgency * URGENCY_WEIGHTS.explicit +
    factors.phase_blocking * URGENCY_WEIGHTS.phase_blocking +
    factors.schedule_deviation * URGENCY_WEIGHTS.schedule +
    factors.lot_priority * URGENCY_WEIGHTS.lot_priority
  )
}

// ===========================================
// QUERIES
// ===========================================

/**
 * Get material requests with filters
 * Used by both Monitor (single lot/jobsite) and Operator (multiple jobsites queue)
 */
export async function getMaterialRequests(
  supabase: SupabaseClient,
  filters: MaterialRequestFilters = {}
): Promise<{ data: FrmMaterialRequest[] | null; error: Error | null }> {
  let query = supabase
    .from('frm_material_requests')
    .select(`
      *,
      lot:frm_lots(id, lot_number, address, status, priority_score),
      jobsite:frm_jobsites(id, name)
    `)
    .is('deleted_at', null)

  // Filter by single jobsite (support both new and legacy field names)
  const jobsiteId = filters.jobsiteId || filters.siteId
  if (jobsiteId) {
    query = query.eq('jobsite_id', jobsiteId)
  }

  // Filter by multiple jobsites (for operator)
  const jobsiteIds = filters.jobsiteIds || filters.siteIds
  if (jobsiteIds && jobsiteIds.length > 0) {
    query = query.in('jobsite_id', jobsiteIds)
  }

  // Filter by lot (support both new and legacy field names)
  const lotId = filters.lotId || filters.houseId
  if (lotId) {
    query = query.eq('lot_id', lotId)
  }

  // Filter by status
  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }

  // Filter by urgency
  if (filters.urgency && filters.urgency !== 'all') {
    query = query.eq('urgency_level', filters.urgency)
  }

  // Order by urgency (highest first), then by creation time
  query = query
    .order('urgency_score', { ascending: false })
    .order('created_at', { ascending: true })

  // Limit results
  if (filters.limit) {
    query = query.limit(filters.limit)
  }

  const { data, error } = await query

  return { data, error }
}

/**
 * Get operator's delivery queue
 * Returns pending/acknowledged/in_transit requests for assigned jobsites
 */
export async function getOperatorQueue(
  supabase: SupabaseClient,
  operatorId: string
): Promise<{ data: FrmMaterialRequest[] | null; error: Error | null }> {
  // First get operator's assigned jobsites
  const { data: assignments, error: assignError } = await supabase
    .from('frm_operator_assignments')
    .select('jobsite_id')
    .eq('operator_id', operatorId)
    .eq('is_active', true)

  if (assignError) {
    return { data: null, error: assignError }
  }

  if (!assignments || assignments.length === 0) {
    return { data: [], error: null }
  }

  const jobsiteIds = assignments.map(a => a.jobsite_id)

  // Get active requests for those jobsites
  return getMaterialRequests(supabase, {
    jobsiteIds,
    status: 'all' // We'll filter in the UI for active statuses
  })
}

/**
 * Get queue stats for operator dashboard
 */
export async function getOperatorQueueStats(
  supabase: SupabaseClient,
  jobsiteIds: string[]
): Promise<{
  pending: number
  acknowledged: number
  in_transit: number
  delivered_today: number
  critical: number
}> {
  const today = new Date().toISOString().split('T')[0]

  const { data } = await supabase
    .from('frm_material_requests')
    .select('status, urgency_level, delivered_at')
    .in('jobsite_id', jobsiteIds)
    .is('deleted_at', null)

  const stats = {
    pending: 0,
    acknowledged: 0,
    in_transit: 0,
    delivered_today: 0,
    critical: 0
  }

  if (!data) return stats

  for (const req of data) {
    if (req.status === 'requested') stats.pending++
    if (req.status === 'acknowledged') stats.acknowledged++
    if (req.status === 'in_transit') stats.in_transit++
    if (req.status === 'delivered' && req.delivered_at?.startsWith(today)) {
      stats.delivered_today++
    }
    if (req.urgency_level === 'critical' && req.status === 'requested') {
      stats.critical++
    }
  }

  return stats
}

// ===========================================
// MUTATIONS
// ===========================================

/**
 * Create a new material request
 */
export async function createMaterialRequest(
  supabase: SupabaseClient,
  input: CreateMaterialRequestInput,
  lot?: { status?: string; priority_score?: number } | null
): Promise<{ data: FrmMaterialRequest | null; error: Error | null }> {
  const urgencyScore = calculateUrgencyScore(input.urgency_level, lot)

  const { data, error } = await supabase
    .from('frm_material_requests')
    .insert({
      ...input,
      urgency_score: urgencyScore,
      urgency_factors: {
        explicit_urgency: URGENCY_BASE_SCORES[input.urgency_level],
        phase_blocking: 50,
        schedule_deviation: lot?.status === 'delayed' ? 80 : 30,
        lot_priority: lot?.priority_score || 50
      }
    })
    .select()
    .single()

  return { data, error }
}

/**
 * Update request status (for operator workflow)
 */
export async function updateRequestStatus(
  supabase: SupabaseClient,
  requestId: string,
  input: UpdateRequestStatusInput
): Promise<{ error: Error | null }> {
  const updateData: Record<string, unknown> = {
    status: input.status,
    updated_at: new Date().toISOString()
  }

  // Set timestamps based on status
  switch (input.status) {
    case 'acknowledged':
      updateData.acknowledged_at = new Date().toISOString()
      break
    case 'in_transit':
      updateData.in_transit_at = new Date().toISOString()
      break
    case 'delivered':
      updateData.delivered_at = new Date().toISOString()
      updateData.delivered_by_id = input.delivered_by_id
      updateData.delivered_by_name = input.delivered_by_name
      updateData.delivery_notes = input.delivery_notes
      break
    case 'cancelled':
      updateData.cancelled_at = new Date().toISOString()
      break
  }

  const { error } = await supabase
    .from('frm_material_requests')
    .update(updateData)
    .eq('id', requestId)

  return { error }
}

/**
 * Soft delete a material request
 */
export async function deleteRequest(
  supabase: SupabaseClient,
  requestId: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('frm_material_requests')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', requestId)

  return { error }
}
