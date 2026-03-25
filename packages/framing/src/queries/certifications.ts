import type { SupabaseClient } from '@supabase/supabase-js'
import type { FrmCertification, CertificationStatus } from '../types/safety'

const TABLE = 'frm_certifications'

/** List certifications for a worker */
export async function listCertifications(
  supabase: SupabaseClient,
  workerId: string,
  status?: CertificationStatus,
) {
  let query = supabase
    .from(TABLE)
    .select('*')
    .eq('worker_id', workerId)
    .order('expires_at', { ascending: true })

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) throw error
  return data as FrmCertification[]
}

/** List expiring certifications (within N days) for an organization */
export async function listExpiringCertifications(
  supabase: SupabaseClient,
  daysAhead: number = 15,
) {
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + daysAhead)

  const { data, error } = await supabase
    .from(TABLE)
    .select(`
      *,
      worker:core_profiles!worker_id(id, full_name, email)
    `)
    .eq('status', 'verified')
    .not('expires_at', 'is', null)
    .lt('expires_at', futureDate.toISOString())
    .order('expires_at', { ascending: true })

  if (error) throw error
  return data as (FrmCertification & { worker: { id: string; full_name: string; email: string } })[]
}

/** Create a certification */
export async function createCertification(
  supabase: SupabaseClient,
  input: {
    worker_id: string
    cert_type: string
    cert_number?: string
    issued_at?: string
    expires_at?: string
    document_url?: string
  },
  organizationId?: string,
) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      worker_id: input.worker_id,
      cert_type: input.cert_type,
      cert_number: input.cert_number ?? null,
      issued_at: input.issued_at ?? null,
      expires_at: input.expires_at ?? null,
      document_url: input.document_url ?? null,
      status: 'pending',
      organization_id: organizationId ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return data as FrmCertification
}

/** Verify a certification */
export async function verifyCertification(
  supabase: SupabaseClient,
  id: string,
  verifiedBy: string,
) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      status: 'verified',
      verified_by: verifiedBy,
      verified_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as FrmCertification
}

/** Revoke a certification */
export async function revokeCertification(
  supabase: SupabaseClient,
  id: string,
) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ status: 'revoked' })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as FrmCertification
}

/** Check if a worker has a valid (non-expired) cert of a given type */
export async function hasValidCert(
  supabase: SupabaseClient,
  workerId: string,
  certType: string,
): Promise<boolean> {
  const now = new Date().toISOString()

  const { count, error } = await supabase
    .from(TABLE)
    .select('*', { count: 'exact', head: true })
    .eq('worker_id', workerId)
    .eq('cert_type', certType)
    .eq('status', 'verified')
    .or(`expires_at.is.null,expires_at.gt.${now}`)

  if (error) throw error
  return (count ?? 0) > 0
}

/**
 * Process expiring certifications: auto-creates compliance warnings for
 * certs expiring within `daysAhead` days that don't already have an active warning.
 * Also marks already-expired certs as 'expired'.
 *
 * Designed to be called from a cron job, edge function, or API route.
 */
export async function processExpiringCertifications(
  supabase: SupabaseClient,
  systemUserId: string,
  daysAhead: number = 15,
) {
  const now = new Date()
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + daysAhead)

  // 1. Find certs expiring within daysAhead
  const { data: expiring, error: expErr } = await supabase
    .from(TABLE)
    .select('id, worker_id, cert_type, expires_at, status')
    .eq('status', 'verified')
    .not('expires_at', 'is', null)
    .lt('expires_at', futureDate.toISOString())

  if (expErr) throw expErr

  let warningsCreated = 0
  let certsExpired = 0

  for (const cert of expiring ?? []) {
    const expiresAt = new Date(cert.expires_at)
    const isExpired = expiresAt < now

    // Mark expired certs
    if (isExpired) {
      await supabase
        .from(TABLE)
        .update({ status: 'expired' })
        .eq('id', cert.id)
      certsExpired++
    }

    // Check if active warning already exists for this worker+cert_type
    const { count } = await supabase
      .from('frm_warnings')
      .select('id', { count: 'exact', head: true })
      .eq('target_type', 'worker')
      .eq('target_id', cert.worker_id)
      .eq('category', 'compliance')
      .eq('status', 'active')
      .ilike('title', `%${cert.cert_type}%`)

    if ((count ?? 0) === 0) {
      await supabase
        .from('frm_warnings')
        .insert({
          target_type: 'worker',
          target_id: cert.worker_id,
          category: 'compliance',
          title: `Certification ${isExpired ? 'EXPIRED' : 'expiring'}: ${cert.cert_type}`,
          description: `${cert.cert_type} ${isExpired ? 'expired on' : 'expires on'} ${expiresAt.toISOString().split('T')[0]}`,
          sent_by: systemUserId,
          priority: isExpired ? 'critical' : 'warning',
          persistent: true,
          dismissable: false,
          status: 'active',
        })
      warningsCreated++
    }
  }

  return { warningsCreated, certsExpired }
}

/** Common cert types in Canadian construction */
export const CERT_TYPES = [
  { code: 'WAH', label: 'Working at Heights' },
  { code: 'WHMIS', label: 'WHMIS 2015' },
  { code: 'FIRST_AID', label: 'First Aid / CPR' },
  { code: 'FALL_ARREST', label: 'Fall Arrest Training' },
  { code: 'CONFINED_SPACE', label: 'Confined Space Entry' },
  { code: 'SCAFFOLD', label: 'Scaffold Erector' },
  { code: 'FORKLIFT', label: 'Forklift Operator' },
  { code: 'CRANE', label: 'Crane Operator' },
  { code: 'PROPANE', label: 'Propane Handling' },
  { code: 'ASBESTOS', label: 'Asbestos Awareness' },
] as const
