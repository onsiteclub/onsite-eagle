'use client'

import { useEffect } from 'react'
import { StatusBar, Style } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'
import { App } from '@capacitor/app'
import { isNativePlatform, isAndroid } from '@/lib/native/platform'
import { getDatabase } from '@/lib/db/client'
import { startSyncEngine, stopSyncEngine } from '@/lib/sync/engine'

/**
 * Runs native-only bootstrap when the app is hosted by Capacitor.
 * Renders nothing.
 */
export default function NativeBridge() {
  useEffect(() => {
    if (!isNativePlatform()) return

    const setupStatusBar = async () => {
      try {
        if (isAndroid()) {
          await StatusBar.setBackgroundColor({ color: '#1A1A1A' })
        }
        await StatusBar.setStyle({ style: Style.Dark })
      } catch {
        // plugin not available — ignore
      }
    }

    const hideSplash = async () => {
      try {
        await SplashScreen.hide({ fadeOutDuration: 200 })
      } catch {
        // already hidden — ignore
      }
    }

    void setupStatusBar()

    // Pre-warm SQLite and start the background sync engine.
    getDatabase()
      .then(() => {
        startSyncEngine()
      })
      .catch((err) => {
        console.error('[NativeBridge] SQLite init failed:', err)
      })

    // Delay hiding splash slightly so the web layer has time to render.
    const splashTimer = setTimeout(hideSplash, 300)

    // Handle Android back button — default webview pops history; if
    // no history remains, ask the app to close gracefully.
    let backHandler: { remove: () => Promise<void> } | null = null
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back()
      } else {
        void App.exitApp()
      }
    }).then((handle) => {
      backHandler = handle
    })

    return () => {
      clearTimeout(splashTimer)
      void backHandler?.remove()
      stopSyncEngine()
    }
  }, [])

  return null
}
