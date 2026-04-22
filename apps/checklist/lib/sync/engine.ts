import { getNetworkStatus, onNetworkChange } from '@/lib/native/network'
import { isSQLiteAvailable } from '@/lib/db/client'
import {
  markFailed,
  markSucceeded,
  peekNextBatch,
  pendingCount,
} from '@/lib/db/repositories/sync-queue'
import type { SyncQueueRow } from '@/lib/db/schema'
import { syncPhoto } from './handlers/photos'
import { syncGateCheck } from './handlers/gate-checks'
import { syncItem } from './handlers/items'
import { syncCompletion } from './handlers/completion'

const TICK_INTERVAL_MS = 30_000
const BATCH_SIZE = 10

export interface SyncState {
  running: boolean
  online: boolean
  pending: number
  lastError: string | null
  lastRunAt: number | null
}

type Listener = (state: SyncState) => void

let state: SyncState = {
  running: false,
  online: true,
  pending: 0,
  lastError: null,
  lastRunAt: null,
}

let listeners = new Set<Listener>()
let tickTimer: ReturnType<typeof setInterval> | null = null
let networkUnsubscribe: (() => void) | null = null
let started = false
let activeRun: Promise<void> | null = null

export function getSyncState(): SyncState {
  return state
}

export function subscribeSync(listener: Listener): () => void {
  listeners.add(listener)
  listener(state)
  return () => {
    listeners.delete(listener)
  }
}

function emit(next: Partial<SyncState>) {
  state = { ...state, ...next }
  for (const listener of listeners) {
    try {
      listener(state)
    } catch {
      // listener errors shouldn't break the engine
    }
  }
}

/**
 * Start the background sync engine. Idempotent.
 * Safe to call on web — simply no-ops if SQLite is unavailable.
 */
export function startSyncEngine(): void {
  if (started) return
  if (!isSQLiteAvailable()) return
  started = true

  void refreshPendingCount()

  void getNetworkStatus().then((status) => {
    emit({ online: status.connected })
    if (status.connected) {
      void processQueue()
    }
  })

  networkUnsubscribe = onNetworkChange((status) => {
    emit({ online: status.connected })
    if (status.connected) {
      void processQueue()
    }
  })

  tickTimer = setInterval(() => {
    void processQueue()
  }, TICK_INTERVAL_MS)
}

export function stopSyncEngine(): void {
  if (!started) return
  started = false
  if (tickTimer) {
    clearInterval(tickTimer)
    tickTimer = null
  }
  networkUnsubscribe?.()
  networkUnsubscribe = null
}

/**
 * Kick the engine manually. Useful after the user completes a gate
 * check — don't make them wait for the next 30s tick.
 */
export async function kickSync(): Promise<void> {
  await processQueue()
}

async function processQueue(): Promise<void> {
  if (!isSQLiteAvailable()) return
  if (activeRun) {
    await activeRun
    return
  }

  activeRun = runOnce().finally(() => {
    activeRun = null
  })

  await activeRun
}

async function runOnce(): Promise<void> {
  if (!state.online) {
    await refreshPendingCount()
    return
  }

  emit({ running: true, lastError: null })

  try {
    let iterations = 0
    while (iterations < 5) {
      const batch = await peekNextBatch(BATCH_SIZE)
      if (batch.length === 0) break

      const allFailed = await processBatch(batch)
      if (allFailed) break
      iterations++
    }
  } catch (err) {
    emit({ lastError: err instanceof Error ? err.message : String(err) })
  } finally {
    await refreshPendingCount()
    emit({ running: false, lastRunAt: Date.now() })
  }
}

/** Returns true when every job in the batch failed (nothing to retry now). */
async function processBatch(batch: SyncQueueRow[]): Promise<boolean> {
  let successes = 0

  for (const job of batch) {
    try {
      await runHandler(job)
      await markSucceeded(job.id)
      successes++
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      await markFailed(job.id, message)
    }
  }

  return successes === 0
}

async function runHandler(job: SyncQueueRow): Promise<void> {
  switch (job.entity_type) {
    case 'photo':
      await syncPhoto(job.entity_id)
      return
    case 'gate_check':
      await syncGateCheck(job.entity_id)
      return
    case 'gate_check_item':
      await syncItem(job.entity_id)
      return
    case 'completion':
      await syncCompletion(job.entity_id)
      return
    default:
      throw new Error(`Unknown entity type: ${job.entity_type}`)
  }
}

async function refreshPendingCount(): Promise<void> {
  try {
    const count = await pendingCount()
    emit({ pending: count })
  } catch {
    // db not ready yet — leave pending as-is
  }
}
