/**
 * @onsite/sharing — QR-based access grant system
 *
 * Shared across Operator, Monitor, Timekeeper, and any future app.
 *
 * Usage:
 *   import { createAccessToken, redeemToken } from '@onsite/sharing/grants';
 *   import { createLinkPayload, parseQRPayload } from '@onsite/sharing/qr';
 *   import type { AccessGrant, QRPayload } from '@onsite/sharing/types';
 *
 * Or import everything from root:
 *   import { createAccessToken, parseQRPayload, type AccessGrant } from '@onsite/sharing';
 */

// Types
export type {
  AccessGrant,
  PendingToken,
  QRApp,
  QRAction,
  QRLinkPayload,
  QRAssignPayload,
  QRJoinSitePayload,
  QRPayload,
  CreateTokenResult,
  RedeemResult,
  JoinSiteResult,
  SupabaseClientLike,
} from './types';

// QR encoding/decoding (pure functions, no deps)
export {
  generateToken,
  createLinkPayload,
  createAssignPayload,
  createJoinSitePayload,
  parseQRPayload,
  isLinkPayload,
  isAssignPayload,
  isJoinSitePayload,
  TOKEN_EXPIRY_MINUTES,
  TOKEN_LENGTH,
} from './qr';

// Grant operations (requires Supabase client)
export {
  createAccessToken,
  getMyGrants,
  revokeGrant,
  redeemToken,
  getGrantedAccess,
  unlinkWorker,
  updateGrantLabel,
  joinSite,
} from './grants';
