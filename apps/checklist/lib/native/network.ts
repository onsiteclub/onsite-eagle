import { Network } from '@capacitor/network'
import { isNativePlatform } from './platform'

export interface NetworkStatus {
  connected: boolean
  connectionType: 'wifi' | 'cellular' | 'none' | 'unknown'
}

export async function getNetworkStatus(): Promise<NetworkStatus> {
  if (isNativePlatform()) {
    const status = await Network.getStatus()
    return {
      connected: status.connected,
      connectionType: status.connectionType as NetworkStatus['connectionType'],
    }
  }

  if (typeof navigator === 'undefined') {
    return { connected: true, connectionType: 'unknown' }
  }

  return {
    connected: navigator.onLine,
    connectionType: 'unknown',
  }
}

export function onNetworkChange(callback: (status: NetworkStatus) => void): () => void {
  if (isNativePlatform()) {
    let subscription: { remove: () => Promise<void> } | null = null
    Network.addListener('networkStatusChange', (status) => {
      callback({
        connected: status.connected,
        connectionType: status.connectionType as NetworkStatus['connectionType'],
      })
    }).then((handle) => {
      subscription = handle
    })

    return () => {
      subscription?.remove()
    }
  }

  if (typeof window === 'undefined') {
    return () => {}
  }

  const online = () => callback({ connected: true, connectionType: 'unknown' })
  const offline = () => callback({ connected: false, connectionType: 'none' })
  window.addEventListener('online', online)
  window.addEventListener('offline', offline)
  return () => {
    window.removeEventListener('online', online)
    window.removeEventListener('offline', offline)
  }
}
