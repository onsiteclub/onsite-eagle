/**
 * @onsite/sharing — Shared types for QR-based access grant system
 *
 * Used across Timekeeper, Operator, Monitor, and any future app
 * that needs worker↔manager or worker↔supervisor linking.
 */

// ============================================
// DATABASE TYPES
// ============================================

export interface AccessGrant {
  id: string;
  owner_id: string;
  viewer_id: string;
  token: string;
  status: 'active' | 'revoked';
  label: string | null;
  created_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
}

export interface PendingToken {
  id: string;
  owner_id: string;
  token: string;
  owner_name: string | null;
  expires_at: string;
  created_at: string;
}

// ============================================
// QR PAYLOAD TYPES
// ============================================

/** Apps that can generate QR codes */
export type QRApp = 'onsite-timekeeper' | 'onsite-operator' | 'onsite-monitor' | 'onsite-eagle';

/** Actions encoded in QR */
export type QRAction = 'link' | 'assign' | 'inspect' | 'join_site';

export interface QRLinkPayload {
  app: QRApp;
  action: 'link';
  token: string;
  ownerName?: string;
}

export interface QRAssignPayload {
  app: QRApp;
  action: 'assign';
  lotId: string;
  jobsiteId: string;
  lotNumber: string;
  assignedBy: string;
  assignedAt: string;
  expectedStartDate?: string;
  expectedEndDate?: string;
  planUrls?: string[];
}

export interface QRJoinSitePayload {
  app: QRApp;
  action: 'join_site';
  jobsiteId: string;
  jobsiteName: string;
  role: 'operator' | 'worker' | 'crew_lead';
  invitedBy: string;
  invitedByName: string;
}

export type QRPayload = QRLinkPayload | QRAssignPayload | QRJoinSitePayload;

// ============================================
// FUNCTION RESULT TYPES
// ============================================

export interface CreateTokenResult {
  token: string;
  expiresAt: Date;
}

export interface RedeemResult {
  success: boolean;
  message: string;
  ownerName?: string;
  ownerId?: string;
}

export interface JoinSiteResult {
  success: boolean;
  message: string;
  jobsiteId?: string;
  jobsiteName?: string;
  assignmentId?: string;
}

// ============================================
// SUPABASE CLIENT TYPE (minimal interface)
// ============================================

/**
 * Minimal Supabase client interface.
 * We only depend on what we actually use, so any SupabaseClient works.
 */
export interface SupabaseClientLike {
  auth: {
    getUser: () => Promise<{ data: { user: { id: string } | null } }>;
  };
  from: (table: string) => {
    insert: (data: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
    select: (columns: string) => {
      eq: (...args: unknown[]) => any;
      order: (...args: unknown[]) => any;
    };
    update: (data: Record<string, unknown>) => {
      eq: (...args: unknown[]) => any;
    };
    delete: () => {
      eq: (...args: unknown[]) => any;
    };
  };
}
