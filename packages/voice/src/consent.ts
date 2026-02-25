/**
 * @onsite/voice/consent — Voice consent management
 *
 * Checks and records user consent for microphone usage and voice training.
 * Works with both authenticated (Supabase) and anonymous (localStorage) users.
 *
 * Usage:
 *   import { hasConsent, setConsent, canCollectVoice } from '@onsite/voice/consent'
 *
 *   // Check if user consented to voice training
 *   const canTrain = await canCollectVoice(userId, supabase)
 *
 *   // Record consent
 *   await setConsent(userId, 'voice_training', true, supabase)
 *
 *   // Anonymous users (no Supabase)
 *   const local = getLocalConsentStatus('microphone_usage')
 */

import type { ConsentType, SupabaseClient } from './types';

const LOCAL_CONSENT_KEY = 'onsite_consent_';

// ---------------------------------------------------------------------------
// Local storage (anonymous users)
// ---------------------------------------------------------------------------

/** Get consent from localStorage (returns null if never asked) */
export function getLocalConsentStatus(consentType: ConsentType): boolean | null {
  try {
    const value = localStorage.getItem(LOCAL_CONSENT_KEY + consentType);
    if (value === null) return null;
    return value === 'true';
  } catch {
    return null;
  }
}

/** Save consent to localStorage */
export function setLocalConsent(consentType: ConsentType, granted: boolean): void {
  try {
    localStorage.setItem(LOCAL_CONSENT_KEY + consentType, String(granted));
  } catch {
    // Ignore localStorage errors (SSR, private browsing, etc.)
  }
}

// ---------------------------------------------------------------------------
// Supabase (authenticated users)
// ---------------------------------------------------------------------------

/** Check if user has active consent for a specific type */
export async function hasConsent(
  userId: string,
  consentType: ConsentType,
  supabase: SupabaseClient,
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('core_consents')
      .select('granted')
      .eq('user_id', userId)
      .eq('consent_type', consentType)
      .eq('granted', true)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.warn('[Voice/Consent] Error checking consent:', error.message);
      return false;
    }

    return data && data.length > 0;
  } catch (err) {
    console.error('[Voice/Consent] Exception checking consent:', err);
    return false;
  }
}

/**
 * Get consent status: true (granted), false (declined), null (never asked)
 */
export async function getConsentStatus(
  userId: string,
  consentType: ConsentType,
  supabase: SupabaseClient,
): Promise<boolean | null> {
  try {
    const { data, error } = await supabase
      .from('core_consents')
      .select('granted')
      .eq('user_id', userId)
      .eq('consent_type', consentType)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.warn('[Voice/Consent] Error checking consent status:', error.message);
      return null;
    }

    if (!data || data.length === 0) return null;
    return data[0].granted;
  } catch (err) {
    console.error('[Voice/Consent] Exception checking consent status:', err);
    return null;
  }
}

/** Convenience: check if user consented to voice_training */
export async function canCollectVoice(
  userId: string,
  supabase: SupabaseClient,
): Promise<boolean> {
  return hasConsent(userId, 'voice_training', supabase);
}

/** Record or update consent */
export async function setConsent(
  userId: string,
  consentType: ConsentType,
  granted: boolean,
  supabase: SupabaseClient,
  options?: {
    documentVersion?: string;
    ipAddress?: string;
    userAgent?: string;
    appVersion?: string;
    appName?: string;
    collectionMethod?: string;
  },
): Promise<boolean> {
  try {
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('core_consents')
      .upsert(
        {
          user_id: userId,
          consent_type: consentType,
          granted,
          granted_at: granted ? now : null,
          revoked_at: granted ? null : now,
          document_version: options?.documentVersion,
          ip_address: options?.ipAddress,
          user_agent: options?.userAgent,
          app_version: options?.appVersion,
          app_name: options?.appName,
          collection_method: options?.collectionMethod,
        },
        { onConflict: 'user_id,consent_type' },
      );

    if (error) {
      console.error('[Voice/Consent] Error setting consent:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[Voice/Consent] Exception setting consent:', err);
    return false;
  }
}
