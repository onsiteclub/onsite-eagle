// src/lib/device.ts
// Phase 5 — anonymous device identifier. Generated once per install and stored
// in Capacitor Preferences (native) or localStorage (web). Used by the privacy
// delete endpoint to find rows linked to a device that has no associated user.
//
// The ID is a plain UUID v4 — no personal information embedded. Rotating it
// (e.g. via "Delete my data") loses the link to past rows, which is fine
// because those rows are being deleted at the same time.

import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const DEVICE_ID_KEY = 'device_id';

// Cache so we don't hit storage on every call.
let cached: string | null = null;

/**
 * Returns the device's anonymous ID, creating it on first call.
 * Always a valid UUID v4; never empty.
 */
export async function getOrCreateDeviceId(): Promise<string> {
  if (cached) return cached;

  try {
    if (Capacitor.isNativePlatform()) {
      const { value } = await Preferences.get({ key: DEVICE_ID_KEY });
      if (value) return (cached = value);
    } else {
      const value = localStorage.getItem(DEVICE_ID_KEY);
      if (value) return (cached = value);
    }
  } catch {
    // Storage unavailable (incognito / private browsing) — fall through and mint a fresh id.
  }

  const id = crypto.randomUUID();
  cached = id;

  try {
    if (Capacitor.isNativePlatform()) {
      await Preferences.set({ key: DEVICE_ID_KEY, value: id });
    } else {
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
  } catch {
    // Can't persist — caller still gets a valid id for this session.
  }

  return id;
}

/**
 * Clears the stored device ID. Call after a successful deletion so the next
 * request mints a fresh UUID and we don't hit a foreign-key chain of deleted rows.
 */
export async function rotateDeviceId(): Promise<void> {
  cached = null;
  try {
    if (Capacitor.isNativePlatform()) {
      await Preferences.remove({ key: DEVICE_ID_KEY });
    } else {
      localStorage.removeItem(DEVICE_ID_KEY);
    }
  } catch {
    // Ignore.
  }
}
