import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  FrmWarning,
  WarningCategory,
  WarningPriority,
  WarningStatus,
  WarningTargetType,
} from '../types/warning'

const TABLE = 'frm_warnings'

/** List active warnings, optionally filtered */
export async function listWarnings(
  supabase: SupabaseClient,
  filters?: {
    status?: WarningStatus
    category?: WarningCategory
    target_type?: WarningTargetType
    target_id?: string
    lot_id?: string
  },
) {
  let query = supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false })

  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.category) query = query.eq('category', filters.category)
  if (filters?.target_type) query = query.eq('target_type', filters.target_type)
  if (filters?.target_id) query = query.eq('target_id', filters.target_id)
  if (filters?.lot_id) query = query.eq('lot_id', filters.lot_id)

  const { data, error } = await query
  if (error) throw error
  return data as FrmWarning[]
}

/** List active warnings visible to a specific worker */
export async function listWarningsForWorker(
  supabase: SupabaseClient,
  workerId: string,
  crewIds: string[],
) {
  // Worker sees: targeted to them, to their crews, to 'all', or to jobsite
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('status', 'active')
    .or(
      `target_type.eq.all,` +
      `and(target_type.eq.worker,target_id.eq.${workerId}),` +
      (crewIds.length > 0
        ? `and(target_type.eq.crew,target_id.in.(${crewIds.join(',')}))`
        : 'target_type.eq.__impossible__')
    )
    .order('priority', { ascending: true }) // critical first
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as FrmWarning[]
}

/** Create a warning */
export async function createWarning(
  supabase: SupabaseClient,
  input: {
    lot_id?: string
    target_type: WarningTargetType
    target_id?: string
    category: WarningCategory
    title: string
    description?: string
    priority: WarningPriority
    expires_at?: string
  },
  sentBy: string,
  organizationId?: string,
) {
  // Derive persistent/dismissable from category
  const persistent = input.category !== 'operational'
  const dismissable = input.category === 'operational'

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      lot_id: input.lot_id ?? null,
      target_type: input.target_type,
      target_id: input.target_id ?? null,
      category: input.category,
      title: input.title,
      description: input.description ?? null,
      sent_by: sentBy,
      priority: input.priority,
      persistent,
      dismissable,
      status: 'active',
      expires_at: input.expires_at ?? null,
      organization_id: organizationId ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return data as FrmWarning
}

/** Resolve a warning */
export async function resolveWarning(
  supabase: SupabaseClient,
  id: string,
  resolvedBy: string,
  resolvedProof?: string,
) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      status: 'resolved',
      resolved_by: resolvedBy,
      resolved_at: new Date().toISOString(),
      resolved_proof: resolvedProof ?? null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as FrmWarning
}

/** Expire old warnings (utility) */
export async function expireOldWarnings(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ status: 'expired' })
    .eq('status', 'active')
    .lt('expires_at', new Date().toISOString())
    .not('expires_at', 'is', null)
    .select()

  if (error) throw error
  return data as FrmWarning[]
}
