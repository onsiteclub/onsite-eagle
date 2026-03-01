/**
 * @onsite/sharing — Access Grant operations (Supabase)
 *
 * Extracted from apps/timekeeper/src/lib/accessGrants.ts
 * All functions receive a SupabaseClientLike so any app can use them.
 *
 * Flow: Operator (worker) generates QR → Monitor (supervisor) scans → Immediate access
 *
 * Tables: core_pending_tokens, core_access_grants (both have RLS)
 */

import type {
  SupabaseClientLike,
  AccessGrant,
  PendingToken,
  CreateTokenResult,
  RedeemResult,
  JoinSiteResult,
  QRJoinSitePayload,
} from './types';
import { generateToken, TOKEN_EXPIRY_MINUTES } from './qr';

// ============================================
// OWNER FUNCTIONS (Worker / Operator)
// ============================================

/**
 * Create a pending token for QR code generation.
 * Token expires after 5 minutes.
 *
 * Called by: Operator app (worker shows QR on their phone)
 */
export async function createAccessToken(
  supabase: SupabaseClientLike,
  ownerName?: string,
): Promise<CreateTokenResult | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const token = generateToken();
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000);

  const { error } = await supabase
    .from('core_pending_tokens')
    .insert({
      owner_id: user.id,
      token,
      owner_name: ownerName ?? null,
      expires_at: expiresAt.toISOString(),
    });

  if (error) return null;

  return { token, expiresAt };
}

/**
 * Get all access grants where current user is the owner (worker).
 * Shows who has access to their data.
 */
export async function getMyGrants(
  supabase: SupabaseClientLike,
): Promise<AccessGrant[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('core_access_grants')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return [];
  return (data as AccessGrant[]) ?? [];
}

/**
 * Revoke an active access grant (owner removes viewer's access).
 */
export async function revokeGrant(
  supabase: SupabaseClientLike,
  grantId: string,
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('core_access_grants')
    .update({
      status: 'revoked',
      revoked_at: new Date().toISOString(),
    })
    .eq('id', grantId)
    .eq('owner_id', user.id);

  return !error;
}

// ============================================
// VIEWER FUNCTIONS (Supervisor / Monitor)
// ============================================

/**
 * Redeem a token from QR code to create an active grant.
 * Access is IMMEDIATE — no approval step.
 *
 * Called by: Monitor app (supervisor scans QR from worker's phone)
 *
 * Handles:
 * - Expired tokens
 * - Self-linking prevention
 * - Re-activation of previously revoked grants
 * - Duplicate grant detection
 */
export async function redeemToken(
  supabase: SupabaseClientLike,
  token: string,
): Promise<RedeemResult> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: 'You must be logged in' };
  }

  // Find the pending token
  const { data: pendingToken, error: fetchError } = await supabase
    .from('core_pending_tokens')
    .select('*')
    .eq('token', token)
    .single();

  if (fetchError || !pendingToken) {
    return { success: false, message: 'Invalid or expired token' };
  }

  const tokenData = pendingToken as PendingToken;

  // Check if expired
  if (new Date(tokenData.expires_at) < new Date()) {
    return { success: false, message: 'Token expired' };
  }

  // Check if trying to link to self
  if (tokenData.owner_id === user.id) {
    return { success: false, message: 'You cannot link to yourself' };
  }

  // Check if grant already exists
  const { data: existingGrant } = await supabase
    .from('core_access_grants')
    .select('id, status')
    .eq('owner_id', tokenData.owner_id)
    .eq('viewer_id', user.id)
    .single();

  if (existingGrant) {
    const grant = existingGrant as { id: string; status: string };
    if (grant.status === 'active') {
      return { success: false, message: 'You already have access to this worker' };
    }

    // Re-activate previously revoked grant
    const { error: updateError } = await supabase
      .from('core_access_grants')
      .update({
        token,
        status: 'active',
        accepted_at: new Date().toISOString(),
        revoked_at: null,
        label: tokenData.owner_name,
      })
      .eq('id', grant.id);

    if (updateError) {
      return { success: false, message: 'Failed to create link' };
    }
  } else {
    // Create new grant (IMMEDIATE ACCESS — no approval needed)
    const { error: insertError } = await supabase
      .from('core_access_grants')
      .insert({
        owner_id: tokenData.owner_id,
        viewer_id: user.id,
        token,
        status: 'active',
        accepted_at: new Date().toISOString(),
        label: tokenData.owner_name,
      });

    if (insertError) {
      return { success: false, message: 'Failed to create link' };
    }
  }

  // Delete the used token
  await supabase
    .from('core_pending_tokens')
    .delete()
    .eq('id', tokenData.id);

  return {
    success: true,
    message: 'Access granted!',
    ownerName: tokenData.owner_name ?? undefined,
    ownerId: tokenData.owner_id,
  };
}

/**
 * Get all access grants where current user is the viewer (supervisor).
 * Returns only active grants.
 */
export async function getGrantedAccess(
  supabase: SupabaseClientLike,
): Promise<AccessGrant[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('core_access_grants')
    .select('*')
    .eq('viewer_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) return [];
  return (data as AccessGrant[]) ?? [];
}

/**
 * Unlink a worker (viewer removes their own access to an owner's records).
 */
export async function unlinkWorker(
  supabase: SupabaseClientLike,
  grantId: string,
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('core_access_grants')
    .update({
      status: 'revoked',
      revoked_at: new Date().toISOString(),
    })
    .eq('id', grantId)
    .eq('viewer_id', user.id);

  return !error;
}

// ============================================
// SITE JOINING (QR-based site assignment)
// ============================================

/**
 * Join a site as operator/worker after scanning a QR code.
 * Does NOT use pending_tokens/access_grants — the supervisor is
 * physically present showing the QR, so the payload contains jobsiteId directly.
 * RLS ensures operator_id = auth.uid().
 *
 * Called by: Any Expo app after scanning a join_site QR from Monitor.
 */
export async function joinSite(
  supabase: SupabaseClientLike,
  payload: Pick<QRJoinSitePayload, 'jobsiteId' | 'jobsiteName' | 'role'>,
): Promise<JoinSiteResult> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: 'Voce precisa estar logado' };
  }

  const { jobsiteId, jobsiteName, role } = payload;

  if (role === 'operator') {
    // Check if already assigned to this jobsite
    const { data: existing } = await supabase
      .from('frm_operator_assignments')
      .select('id, is_active')
      .eq('operator_id', user.id)
      .eq('jobsite_id', jobsiteId)
      .maybeSingle();

    if (existing) {
      const row = existing as { id: string; is_active: boolean };
      if (row.is_active) {
        return {
          success: false,
          message: `Voce ja esta atribuido a "${jobsiteName}"`,
          jobsiteId,
          jobsiteName,
        };
      }

      // Re-activate previously deactivated assignment
      const { error } = await supabase
        .from('frm_operator_assignments')
        .update({
          is_active: true,
          is_available: true,
          available_since: new Date().toISOString(),
        })
        .eq('id', row.id);

      if (error) return { success: false, message: 'Falha ao reativar atribuicao' };

      return {
        success: true,
        message: `Reconectado a "${jobsiteName}"!`,
        jobsiteId,
        jobsiteName,
        assignmentId: row.id,
      };
    }

    // Create new assignment
    const { error } = await supabase
      .from('frm_operator_assignments')
      .insert({
        operator_id: user.id,
        jobsite_id: jobsiteId,
        is_active: true,
        is_available: true,
        available_since: new Date().toISOString(),
      });

    if (error) {
      return { success: false, message: `Falha ao atribuir: ${error.message}` };
    }

    return {
      success: true,
      message: `Conectado a "${jobsiteName}"!`,
      jobsiteId,
      jobsiteName,
    };
  }

  // For worker/crew_lead roles — create frm_jobsite_workers record
  if (role === 'worker' || role === 'crew_lead') {
    const { data: profile } = await supabase
      .from('core_profiles')
      .select('full_name, first_name')
      .eq('id', user.id)
      .maybeSingle();

    const workerName = (profile as any)?.full_name || (profile as any)?.first_name || 'Worker';

    const { error } = await supabase
      .from('frm_jobsite_workers')
      .insert({
        jobsite_id: jobsiteId,
        worker_id: user.id,
        worker_name: workerName,
        is_active: true,
      });

    if (error) {
      if ((error as any).code === '23505') {
        return { success: false, message: 'Voce ja faz parte deste site' };
      }
      return { success: false, message: `Falha ao juntar: ${error.message}` };
    }

    return {
      success: true,
      message: `Adicionado a "${jobsiteName}" como ${role}!`,
      jobsiteId,
      jobsiteName,
    };
  }

  return { success: false, message: `Role "${role}" nao suportada` };
}

/**
 * Update the display label for a linked worker.
 */
export async function updateGrantLabel(
  supabase: SupabaseClientLike,
  ownerId: string,
  label: string,
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('core_access_grants')
    .update({ label })
    .eq('owner_id', ownerId)
    .eq('viewer_id', user.id)
    .eq('status', 'active');

  return !error;
}
