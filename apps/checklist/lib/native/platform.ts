import { Capacitor } from '@capacitor/core'

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform()
}

export function getPlatform(): 'web' | 'android' | 'ios' {
  return Capacitor.getPlatform() as 'web' | 'android' | 'ios'
}

export function isAndroid(): boolean {
  return getPlatform() === 'android'
}

export function isIOS(): boolean {
  return getPlatform() === 'ios'
}

/**
 * Convert a Capacitor file path to a URL the WebView can load.
 * On native, wraps file:// paths via Capacitor.convertFileSrc.
 * On web, returns the input unchanged.
 */
export function convertFileSrc(path: string): string {
  if (!path) return path
  if (path.startsWith('data:') || path.startsWith('http:') || path.startsWith('https:')) {
    return path
  }
  return Capacitor.convertFileSrc(path)
}
