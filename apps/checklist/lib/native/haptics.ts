import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import { isNativePlatform } from './platform'

/**
 * Lightweight wrappers around Capacitor haptics. All functions no-op
 * on web (and ignore errors on older devices).
 */

export async function hapticTap(): Promise<void> {
  if (!isNativePlatform()) return
  try {
    await Haptics.impact({ style: ImpactStyle.Light })
  } catch {
    // plugin unavailable or device lacks haptic engine — ignore
  }
}

export async function hapticSelect(): Promise<void> {
  if (!isNativePlatform()) return
  try {
    await Haptics.selectionStart()
    await Haptics.selectionChanged()
    await Haptics.selectionEnd()
  } catch {
    // ignore
  }
}

export async function hapticSuccess(): Promise<void> {
  if (!isNativePlatform()) return
  try {
    await Haptics.notification({ type: NotificationType.Success })
  } catch {
    // ignore
  }
}

export async function hapticWarning(): Promise<void> {
  if (!isNativePlatform()) return
  try {
    await Haptics.notification({ type: NotificationType.Warning })
  } catch {
    // ignore
  }
}

export async function hapticError(): Promise<void> {
  if (!isNativePlatform()) return
  try {
    await Haptics.notification({ type: NotificationType.Error })
  } catch {
    // ignore
  }
}
