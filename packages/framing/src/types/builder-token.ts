export interface FrmBuilderToken {
  id: string
  organization_id: string | null
  jobsite_id: string
  token: string
  builder_name: string
  builder_email: string | null
  expires_at: string | null
  is_active: boolean
  created_by: string | null
  last_accessed_at: string | null
  access_count: number
  created_at: string
}
