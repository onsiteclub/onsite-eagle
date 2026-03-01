// ==========================================
// Multi-Tenancy Types
// ==========================================

export interface Organization {
  id: string
  name: string
  slug: string
  logo_url: string | null
  owner_id: string | null
  billing_plan: BillingPlan
  billing_email: string | null
  stripe_customer_id: string | null
  pricing_tier_id: string | null
  settings: OrganizationSettings
  status: OrganizationStatus
  created_at: string
  updated_at: string
}

export type BillingPlan = 'pilot' | 'starter' | 'professional' | 'enterprise'
export type OrganizationStatus = 'active' | 'suspended' | 'cancelled'

export interface OrganizationSettings {
  timezone?: string
  default_phase_template?: string
  require_photo_gps?: boolean
  require_photo_signature?: boolean
  notifications?: {
    email?: boolean
    push?: boolean
    slack_webhook?: string
  }
}

// ==========================================
// Organization Membership
// ==========================================

export interface OrgMembership {
  id: string
  organization_id: string
  profile_id: string
  role: OrgRole
  status: MembershipStatus
  invited_by: string | null
  invited_at: string | null
  joined_at: string
  created_at: string
  updated_at: string
}

export type OrgRole = 'owner' | 'admin' | 'supervisor' | 'crew_lead' | 'worker' | 'operator' | 'builder'
export type MembershipStatus = 'active' | 'invited' | 'suspended'

// ==========================================
// Pricing
// ==========================================

export interface PricingTier {
  id: string
  name: string
  description: string | null
  rate_main_floors: number  // $/sqft
  rate_roof: number
  rate_basement: number
  currency: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// ==========================================
// Views / Computed Types
// ==========================================

export interface MyOrganization {
  id: string
  name: string
  slug: string
  logo_url: string | null
  billing_plan: BillingPlan
  org_status: OrganizationStatus
  role: OrgRole
  membership_status: MembershipStatus
  joined_at: string
  created_at: string
}

export interface OrgMember {
  organization_id: string
  profile_id: string
  role: OrgRole
  status: MembershipStatus
  joined_at: string
  email: string
  full_name: string | null
  avatar_url: string | null
}

// ==========================================
// Permission Helpers
// ==========================================

export const ORG_ROLE_PERMISSIONS: Record<OrgRole, string[]> = {
  owner: ['*'], // All permissions
  admin: [
    'org.view', 'org.edit', 'org.invite', 'org.remove_member',
    'site.create', 'site.edit', 'site.delete', 'site.view',
    'house.create', 'house.edit', 'house.delete', 'house.view',
    'photo.view', 'photo.validate', 'photo.delete',
    'report.view', 'report.create', 'report.export',
    'member.view', 'member.edit',
  ],
  supervisor: [
    'org.view',
    'site.view', 'site.edit',
    'house.view', 'house.edit',
    'photo.view', 'photo.validate',
    'report.view', 'report.create',
    'member.view',
  ],
  crew_lead: [
    'org.view',
    'site.view',
    'house.view',
    'photo.view', 'photo.upload',
    'material.request',
  ],
  worker: [
    'org.view',
    'site.view',
    'house.view',
    'photo.view', 'photo.upload',
  ],
  operator: [
    'org.view',
    'site.view',
    'material.deliver', 'material.view',
  ],
  builder: [
    'org.view',
    'site.view',
    'house.view',
    'report.view',
  ],
}

export function hasPermission(role: OrgRole, permission: string): boolean {
  const permissions = ORG_ROLE_PERMISSIONS[role]
  return permissions.includes('*') || permissions.includes(permission)
}

export function isOrgAdmin(role: OrgRole): boolean {
  return role === 'owner' || role === 'admin'
}

export function canManageMembers(role: OrgRole): boolean {
  return hasPermission(role, 'org.invite')
}

// ==========================================
// Organization Context (for useOrganization hook)
// ==========================================

export interface OrganizationContext {
  currentOrg: MyOrganization | null
  organizations: MyOrganization[]
  isLoading: boolean
  error: Error | null
  switchOrganization: (orgId: string) => void
  refetch: () => Promise<void>
}
