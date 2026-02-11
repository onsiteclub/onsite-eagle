/**
 * Material Requests - Shared Queries
 * Used by Monitor (create requests) and Operator (manage deliveries)
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { MaterialRequest, MaterialRequestStatus, UrgencyLevel, House } from '../types/database'

// ===========================================
// TYPES
// ===========================================

export interface MaterialRequestFilters {
  siteId?: string
  siteIds?: string[]  // For operator viewing multiple sites
  houseId?: string
  status?: MaterialRequestStatus | 'all'
  urgency?: UrgencyLevel | 'all'
  limit?: number
}

export interface CreateMaterialRequestInput {
  site_id: string
  house_id?: string | null
  material_type: string
  material_name: string
  quantity: number
  unit: string
  urgency_level: UrgencyLevel
  delivery_location?: string | null
  notes?: string | null
  requested_by_id?: string | null
  requested_by_name: string
  requested_by_role?: string
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
  house?: { status?: string; priority_score?: number } | null
): number {
  const factors = {
    explicit_urgency: URGENCY_BASE_SCORES[urgencyLevel] || 50,
    phase_blocking: 50, // Default - could be enhanced with phase data
    schedule_deviation: house?.status === 'delayed' ? 80 :
                        house?.status === 'on_hold' ? 60 : 30,
    lot_priority: house?.priority_score || 50
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
 * Used by both Monitor (single lot/site) and Operator (multiple sites queue)
 */
export async function getMaterialRequests(
  supabase: SupabaseClient,
  filters: MaterialRequestFilters = {}
): Promise<{ data: MaterialRequest[] | null; error: Error | null }> {
  let query = supabase
    .from('egl_material_requests')
    .select(`
      *,
      house:egl_houses(id, lot_number, address, status, priority_score),
      site:egl_sites(id, name)
    `)
    .is('deleted_at', null)

  // Filter by single site
  if (filters.siteId) {
    query = query.eq('site_id', filters.siteId)
  }

  // Filter by multiple sites (for operator)
  if (filters.siteIds && filters.siteIds.length > 0) {
    query = query.in('site_id', filters.siteIds)
  }

  // Filter by house
  if (filters.houseId) {
    query = query.eq('house_id', filters.houseId)
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
 * Returns pending/acknowledged/in_transit requests for assigned sites
 */
export async function getOperatorQueue(
  supabase: SupabaseClient,
  operatorId: string
): Promise<{ data: MaterialRequest[] | null; error: Error | null }> {
  // First get operator's assigned sites
  const { data: assignments, error: assignError } = await supabase
    .from('egl_operator_assignments')
    .select('site_id')
    .eq('operator_id', operatorId)
    .eq('is_active', true)

  if (assignError) {
    return { data: null, error: assignError }
  }

  if (!assignments || assignments.length === 0) {
    return { data: [], error: null }
  }

  const siteIds = assignments.map(a => a.site_id)

  // Get active requests for those sites
  return getMaterialRequests(supabase, {
    siteIds,
    status: 'all' // We'll filter in the UI for active statuses
  })
}

/**
 * Get queue stats for operator dashboard
 */
export async function getOperatorQueueStats(
  supabase: SupabaseClient,
  siteIds: string[]
): Promise<{
  pending: number
  acknowledged: number
  in_transit: number
  delivered_today: number
  critical: number
}> {
  const today = new Date().toISOString().split('T')[0]

  const { data } = await supabase
    .from('egl_material_requests')
    .select('status, urgency_level, delivered_at')
    .in('site_id', siteIds)
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
    if (req.status === 'pending') stats.pending++
    if (req.status === 'acknowledged') stats.acknowledged++
    if (req.status === 'in_transit') stats.in_transit++
    if (req.status === 'delivered' && req.delivered_at?.startsWith(today)) {
      stats.delivered_today++
    }
    if (req.urgency_level === 'critical' && req.status === 'pending') {
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
  house?: { status?: string; priority_score?: number } | null
): Promise<{ data: MaterialRequest | null; error: Error | null }> {
  const urgencyScore = calculateUrgencyScore(input.urgency_level, house)

  const { data, error } = await supabase
    .from('egl_material_requests')
    .insert({
      ...input,
      urgency_score: urgencyScore,
      urgency_factors: {
        explicit_urgency: URGENCY_BASE_SCORES[input.urgency_level],
        phase_blocking: 50,
        schedule_deviation: house?.status === 'delayed' ? 80 : 30,
        lot_priority: house?.priority_score || 50
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
    .from('egl_material_requests')
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
    .from('egl_material_requests')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', requestId)

  return { error }
}
