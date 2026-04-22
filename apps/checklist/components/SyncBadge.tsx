'use client'

import { useSync } from '@/lib/sync/useSync'
import { isNativePlatform } from '@/lib/native/platform'

/**
 * Header indicator showing sync queue state.
 * Renders nothing on web (no local queue to sync).
 */
export default function SyncBadge() {
  const { running, online, pending, lastError } = useSync()

  if (!isNativePlatform()) return null
  if (pending === 0 && !lastError) return null

  if (!online) {
    return (
      <span className="text-[10px] font-medium text-[#C58B1B] bg-[rgba(197,139,27,0.15)] rounded-full px-2 py-0.5">
        Offline · {pending} pending
      </span>
    )
  }

  if (lastError) {
    return (
      <span
        className="text-[10px] font-medium text-[#DC2626] bg-[rgba(220,38,38,0.12)] rounded-full px-2 py-0.5"
        title={lastError}
      >
        Sync error · {pending} pending
      </span>
    )
  }

  if (running) {
    return (
      <span className="text-[10px] font-medium text-[#C58B1B] bg-[rgba(197,139,27,0.15)] rounded-full px-2 py-0.5">
        Syncing {pending}…
      </span>
    )
  }

  return (
    <span className="text-[10px] font-medium text-[#888884] bg-[#E5E5E3] rounded-full px-2 py-0.5">
      {pending} pending
    </span>
  )
}
