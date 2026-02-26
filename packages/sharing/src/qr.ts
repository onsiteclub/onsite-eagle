/**
 * @onsite/sharing — QR Code payload encoding/decoding
 *
 * Pure functions, no side effects, no deps.
 */

import type { QRPayload, QRLinkPayload, QRAssignPayload, QRJoinSitePayload, QRApp } from './types';

// ============================================
// CONSTANTS
// ============================================

export const TOKEN_EXPIRY_MINUTES = 5;
export const TOKEN_LENGTH = 16;

/** Alphabet without confusing chars (O/0, I/l/1) */
const TOKEN_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

// ============================================
// TOKEN GENERATION
// ============================================

/** Generate a random alphanumeric token for QR codes */
export function generateToken(length: number = TOKEN_LENGTH): string {
  let token = '';
  for (let i = 0; i < length; i++) {
    token += TOKEN_CHARS.charAt(Math.floor(Math.random() * TOKEN_CHARS.length));
  }
  return token;
}

// ============================================
// QR PAYLOAD ENCODING
// ============================================

/** Create a QR payload string for a link action */
export function createLinkPayload(
  token: string,
  app: QRApp = 'onsite-timekeeper',
  ownerName?: string,
): string {
  const payload: QRLinkPayload = {
    app,
    action: 'link',
    token,
    ownerName,
  };
  return JSON.stringify(payload);
}

/** Create a QR payload string for a house assignment action */
export function createAssignPayload(
  data: Omit<QRAssignPayload, 'app' | 'action'>,
  app: QRApp = 'onsite-eagle',
): string {
  const payload: QRAssignPayload = {
    app,
    action: 'assign',
    ...data,
  };
  return JSON.stringify(payload);
}

// ============================================
// QR PAYLOAD DECODING
// ============================================

/** Valid app prefixes that we recognize */
const VALID_APPS: QRApp[] = ['onsite-timekeeper', 'onsite-operator', 'onsite-monitor', 'onsite-eagle'];

/** Parse a QR code data string into a typed payload, or null if invalid */
export function parseQRPayload(data: string): QRPayload | null {
  try {
    const parsed = JSON.parse(data);

    if (!parsed || typeof parsed !== 'object') return null;
    if (!VALID_APPS.includes(parsed.app)) return null;

    if (parsed.action === 'link' && typeof parsed.token === 'string') {
      return parsed as QRLinkPayload;
    }

    if (parsed.action === 'assign' && typeof parsed.houseId === 'string') {
      return parsed as QRAssignPayload;
    }

    if (parsed.action === 'join_site' && typeof parsed.siteId === 'string') {
      return parsed as QRJoinSitePayload;
    }

    return null;
  } catch {
    return null;
  }
}

/** Type guard for link payloads */
export function isLinkPayload(payload: QRPayload): payload is QRLinkPayload {
  return payload.action === 'link';
}

/** Type guard for assign payloads */
export function isAssignPayload(payload: QRPayload): payload is QRAssignPayload {
  return payload.action === 'assign';
}

/** Create a QR payload string for a join_site action */
export function createJoinSitePayload(
  data: Omit<QRJoinSitePayload, 'app' | 'action'>,
  app: QRApp = 'onsite-monitor',
): string {
  const payload: QRJoinSitePayload = {
    app,
    action: 'join_site',
    ...data,
  };
  return JSON.stringify(payload);
}

/** Type guard for join_site payloads */
export function isJoinSitePayload(payload: QRPayload): payload is QRJoinSitePayload {
  return payload.action === 'join_site';
}
