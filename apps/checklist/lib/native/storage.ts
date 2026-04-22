import { Preferences } from '@capacitor/preferences'
import { isNativePlatform } from './platform'

/**
 * Cross-platform key/value store.
 * - Native: uses Capacitor Preferences (SharedPreferences / UserDefaults)
 * - Web: falls back to localStorage
 *
 * Use this for small data that must survive an app restart but
 * doesn't need a full database — auth tokens, user prefs, etc.
 */

export async function setItem(key: string, value: string): Promise<void> {
  if (isNativePlatform()) {
    await Preferences.set({ key, value })
    return
  }
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(key, value)
  }
}

export async function getItem(key: string): Promise<string | null> {
  if (isNativePlatform()) {
    const { value } = await Preferences.get({ key })
    return value
  }
  if (typeof window !== 'undefined') {
    return window.localStorage.getItem(key)
  }
  return null
}

export async function removeItem(key: string): Promise<void> {
  if (isNativePlatform()) {
    await Preferences.remove({ key })
    return
  }
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(key)
  }
}

export async function setJSON<T>(key: string, value: T): Promise<void> {
  await setItem(key, JSON.stringify(value))
}

export async function getJSON<T>(key: string): Promise<T | null> {
  const value = await getItem(key)
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}
