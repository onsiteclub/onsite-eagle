'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { FrmWarning, WarningCategory } from '../types/warning'
import { listWarningsForWorker, resolveWarning } from '../queries/warnings'

interface UseActiveWarningsOptions {
  supabase: SupabaseClient
  workerId?: string
  crewIds?: string[]
}

interface UseActiveWarningsResult {
  warnings: FrmWarning[]
  safetyWarnings: FrmWarning[]
  complianceWarnings: FrmWarning[]
  operationalWarnings: FrmWarning[]
  dismissWarning: (id: string) => Promise<void>
  loading: boolean
}

const CATEGORY_ORDER: Record<WarningCategory, number> = {
  safety: 0,
  compliance: 1,
  operational: 2,
}

function sortWarnings(warnings: FrmWarning[]): FrmWarning[] {
  return [...warnings].sort((a, b) => {
    const catDiff = CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category]
    if (catDiff !== 0) return catDiff
    // Within same category, newest first
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}

function filterByCategory(warnings: FrmWarning[], category: WarningCategory): FrmWarning[] {
  return warnings.filter((w) => w.category === category)
}

/**
 * React hook that subscribes to active warnings via Supabase realtime.
 *
 * On mount, fetches active warnings for the given worker/crews.
 * Subscribes to INSERT/UPDATE on frm_warnings for live updates.
 *
 * Safety warnings are non-dismissable. Operational warnings can be dismissed.
 */
export function useActiveWarnings(options: UseActiveWarningsOptions): UseActiveWarningsResult {
  const { supabase, workerId, crewIds = [] } = options
  const [warnings, setWarnings] = useState<FrmWarning[]>([])
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)

  // Fetch initial warnings
  useEffect(() => {
    mountedRef.current = true

    if (!workerId) {
      setWarnings([])
      setLoading(false)
      return
    }

    let cancelled = false

    async function fetchWarnings() {
      try {
        const data = await listWarningsForWorker(supabase, workerId!, crewIds)
        if (!cancelled && mountedRef.current) {
          setWarnings(sortWarnings(data))
        }
      } catch (err) {
        // Silently fail on fetch error — don't crash the app for warnings
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[useActiveWarnings] fetch error:', err)
        }
      } finally {
        if (!cancelled && mountedRef.current) {
          setLoading(false)
        }
      }
    }

    fetchWarnings()

    return () => {
      cancelled = true
    }
  }, [supabase, workerId, crewIds.join(',')])

  // Subscribe to realtime changes
  useEffect(() => {
    if (!workerId) return

    const channel = supabase
      .channel('frm-warnings-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'frm_warnings',
        },
        (payload) => {
          const newWarning = payload.new as FrmWarning
          // Check if this warning is relevant to the worker
          if (
            newWarning.status === 'active' &&
            (newWarning.target_type === 'all' ||
              (newWarning.target_type === 'worker' && newWarning.target_id === workerId) ||
              (newWarning.target_type === 'crew' && crewIds.includes(newWarning.target_id ?? '')))
          ) {
            setWarnings((prev) => sortWarnings([...prev, newWarning]))
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'frm_warnings',
        },
        (payload) => {
          const updated = payload.new as FrmWarning
          setWarnings((prev) => {
            // If resolved/expired, remove from list
            if (updated.status !== 'active') {
              return prev.filter((w) => w.id !== updated.id)
            }
            // Otherwise update in place
            const exists = prev.some((w) => w.id === updated.id)
            if (exists) {
              return sortWarnings(prev.map((w) => (w.id === updated.id ? updated : w)))
            }
            // New active warning we didn't have
            return sortWarnings([...prev, updated])
          })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, workerId, crewIds.join(',')])

  // Cleanup mounted ref
  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  const dismissWarning = useCallback(
    async (id: string) => {
      if (!workerId) return

      const warning = warnings.find((w) => w.id === id)
      if (!warning || !warning.dismissable) return

      try {
        await resolveWarning(supabase, id, workerId)
        // Optimistic update — remove immediately
        setWarnings((prev) => prev.filter((w) => w.id !== id))
      } catch (err) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[useActiveWarnings] dismiss error:', err)
        }
      }
    },
    [supabase, workerId, warnings],
  )

  return {
    warnings,
    safetyWarnings: filterByCategory(warnings, 'safety'),
    complianceWarnings: filterByCategory(warnings, 'compliance'),
    operationalWarnings: filterByCategory(warnings, 'operational'),
    dismissWarning,
    loading,
  }
}
