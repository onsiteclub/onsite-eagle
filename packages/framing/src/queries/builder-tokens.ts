import type { SupabaseClient } from '@supabase/supabase-js'
import type { FrmBuilderToken } from '../types/builder-token'

const TABLE = 'frm_builder_tokens'

/** Generate a secure random token (32 hex chars = 128 bits) */
function generateToken(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('')
}

export interface CreateBuilderTokenInput {
  jobsite_id: string
  builder_name: string
  builder_email?: string
  expires_at?: string | null
  organization_id?: string
}

/** Create a builder token for a jobsite */
export async function createBuilderToken(
  supabase: SupabaseClient,
  input: CreateBuilderTokenInput,
  createdBy: string,
) {
  const token = generateToken()

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      jobsite_id: input.jobsite_id,
      builder_name: input.builder_name,
      builder_email: input.builder_email ?? null,
      expires_at: input.expires_at ?? null,
      organization_id: input.organization_id ?? null,
      created_by: createdBy,
      token,
    })
    .select()
    .single()

  if (error) throw error
  return data as FrmBuilderToken
}

/** List all tokens for a jobsite */
export async function listBuilderTokens(
  supabase: SupabaseClient,
  jobsiteId: string,
) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('jobsite_id', jobsiteId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as FrmBuilderToken[]
}

/** Revoke (deactivate) a builder token */
export async function revokeBuilderToken(
  supabase: SupabaseClient,
  tokenId: string,
) {
  const { error } = await supabase
    .from(TABLE)
    .update({ is_active: false })
    .eq('id', tokenId)

  if (error) throw error
}

/** Delete a builder token permanently */
export async function deleteBuilderToken(
  supabase: SupabaseClient,
  tokenId: string,
) {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('id', tokenId)

  if (error) throw error
}
