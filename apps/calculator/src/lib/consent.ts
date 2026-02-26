// src/lib/consent.ts
// Consent management via localStorage + Supabase sync

import { supabase, isSupabaseEnabled } from './supabase';

export type ConsentType =
  | 'microphone_usage'  // Required for using voice feature (App Store compliance)
  | 'voice_training'    // Optional: allow recordings to improve service
  | 'data_analytics'
  | 'marketing'
  | 'terms_of_service'
  | 'privacy_policy';

// Types that are synced to Supabase (must match core_consents table constraint)
const SYNCABLE_TYPES: ConsentType[] = ['voice_training', 'data_analytics', 'marketing', 'terms_of_service', 'privacy_policy'];

// Local storage key for consent
const LOCAL_CONSENT_KEY = 'onsite_consent_';

/**
 * Get consent status from local storage
 */
export function getLocalConsentStatus(consentType: ConsentType): boolean | null {
  try {
    const value = localStorage.getItem(LOCAL_CONSENT_KEY + consentType);
    if (value === null) return null;
    return value === 'true';
  } catch {
    return null;
  }
}

/**
 * Set consent in local storage
 */
export function setLocalConsent(consentType: ConsentType, granted: boolean): void {
  try {
    localStorage.setItem(LOCAL_CONSENT_KEY + consentType, String(granted));
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Sync consent to Supabase (fire-and-forget, best-effort)
 * Only syncs if user is logged in and Supabase is available
 */
export async function syncConsentToServer(consentType: ConsentType, granted: boolean): Promise<void> {
  // microphone_usage is local-only (not in consents table constraint)
  if (!SYNCABLE_TYPES.includes(consentType)) return;
  if (!isSupabaseEnabled() || !supabase) return;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('core_consents').upsert({
      user_id: user.id,
      consent_type: consentType,
      granted,
      granted_at: granted ? new Date().toISOString() : null,
      revoked_at: granted ? null : new Date().toISOString(),
      app_version: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : undefined,
    }, { onConflict: 'user_id,consent_type' });
  } catch {
    // Best-effort: don't block UI on sync failure
  }
}
