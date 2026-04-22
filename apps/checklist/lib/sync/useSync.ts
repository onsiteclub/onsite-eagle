'use client'

import { useEffect, useState } from 'react'
import { getSyncState, subscribeSync, type SyncState } from './engine'

export function useSync(): SyncState {
  const [state, setState] = useState<SyncState>(() => getSyncState())

  useEffect(() => {
    return subscribeSync(setState)
  }, [])

  return state
}
