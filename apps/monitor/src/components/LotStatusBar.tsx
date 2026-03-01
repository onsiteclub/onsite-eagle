'use client'

import { useState, useEffect } from 'react'
import {
  CheckCircle2, XCircle, Circle, Lock, Loader2
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import {
  FRAMING_PHASES,
  GATE_CHECK_TRANSITIONS,
  TRANSITION_SHORT_LABELS,
  getLotPhaseFlowStatus,
} from '@onsite/framing'
import type { PhaseId, GateCheckTransition } from '@onsite/framing'

interface LotStatusBarProps {
  lotId: string
  currentPhase?: PhaseId
}

/**
 * Map transitions to the phase after which the gate sits.
 * The gate icon is rendered AFTER this phase's segment.
 */
const GATE_AFTER_PHASE: Record<GateCheckTransition, PhaseId> = {
  framing_to_roofing: 'walls_2',
  roofing_to_trades: 'roof',
  trades_to_backframe: 'roof', // gate before backframe, shown after roof
  backframe_to_final: 'backframe_backing',
}

const PHASE_STATUS_COLORS = {
  pending: '#E5E5EA',
  active: '#007AFF',
  done: '#34C759',
  blocked: '#FF3B30',
}

export default function LotStatusBar({ lotId, currentPhase }: LotStatusBarProps) {
  const [blockingByPhase, setBlockingByPhase] = useState<Record<string, number>>({})
  const [gateCheckStatus, setGateCheckStatus] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const result = await getLotPhaseFlowStatus(supabase, lotId)
        setBlockingByPhase(result.blockingByPhase)
        setGateCheckStatus(result.gateCheckStatus)
      } catch (err) {
        console.error('Failed to load phase flow status:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [lotId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-4 h-4 text-[#007AFF] animate-spin" />
      </div>
    )
  }

  // Determine phase status based on current phase position
  const currentIdx = currentPhase
    ? FRAMING_PHASES.findIndex(p => p.id === currentPhase)
    : -1

  function getPhaseStatus(phaseId: PhaseId, idx: number): 'pending' | 'active' | 'done' | 'blocked' {
    const hasBlocking = (blockingByPhase[phaseId] ?? 0) > 0
    if (hasBlocking) return 'blocked'
    if (currentIdx < 0) return 'pending'
    if (idx < currentIdx) return 'done'
    if (idx === currentIdx) return 'active'
    return 'pending'
  }

  // Build gate check lookup for quick access
  const gatesAfterPhase = new Map<PhaseId, { transition: GateCheckTransition; status: string }>()
  for (const t of GATE_CHECK_TRANSITIONS) {
    const afterPhase = GATE_AFTER_PHASE[t]
    // If multiple gates map to same phase (e.g. roofing_to_trades and trades_to_backframe both after 'roof'),
    // only keep the first one for display simplicity
    if (!gatesAfterPhase.has(afterPhase)) {
      gatesAfterPhase.set(afterPhase, {
        transition: t,
        status: gateCheckStatus[t] ?? 'not_started',
      })
    }
  }

  return (
    <div className="flex items-center gap-0 overflow-x-auto py-3 px-2">
      {FRAMING_PHASES.map((phase, idx) => {
        const status = getPhaseStatus(phase.id, idx)
        const color = PHASE_STATUS_COLORS[status]
        const blockingCount = blockingByPhase[phase.id] ?? 0
        const gate = gatesAfterPhase.get(phase.id)
        const isLast = idx === FRAMING_PHASES.length - 1

        return (
          <div key={phase.id} className="flex items-center">
            {/* Phase segment */}
            <div className="flex flex-col items-center relative group">
              {/* Phase bar */}
              <div
                className="h-2.5 rounded-full transition-colors relative"
                style={{
                  backgroundColor: color,
                  width: '60px',
                  minWidth: '60px',
                }}
              >
                {/* Blocking count badge */}
                {blockingCount > 0 && (
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 flex items-center gap-0.5 px-1.5 py-0.5 bg-[#FF3B30] text-white text-[10px] font-bold rounded-full leading-none">
                    <Lock className="w-2.5 h-2.5" />
                    {blockingCount}
                  </span>
                )}
              </div>

              {/* Phase label */}
              <span
                className="text-[10px] font-medium mt-1.5 text-center leading-tight max-w-[60px]"
                style={{
                  color: status === 'active' ? '#007AFF'
                    : status === 'done' ? '#34C759'
                    : status === 'blocked' ? '#FF3B30'
                    : '#C7C7CC',
                }}
              >
                {phase.name}
              </span>

              {/* Tooltip on hover */}
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 hidden group-hover:block bg-[#1D1D1F] text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap z-10">
                {phase.name} - {status}
                {blockingCount > 0 && ` (${blockingCount} blocking)`}
              </div>
            </div>

            {/* Connector + Gate check point (if applicable) */}
            {!isLast && (
              <div className="flex items-center">
                {gate ? (
                  // Gate check checkpoint
                  <div className="flex flex-col items-center mx-1 relative group">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors"
                      style={{
                        borderColor: gate.status === 'passed' ? '#34C759'
                          : gate.status === 'failed' ? '#FF3B30'
                          : gate.status === 'in_progress' ? '#007AFF'
                          : '#D2D2D7',
                        backgroundColor: gate.status === 'passed' ? '#E8F5E9'
                          : gate.status === 'failed' ? '#FFE5E5'
                          : gate.status === 'in_progress' ? '#E8F0FE'
                          : '#F9F9FB',
                      }}
                    >
                      {gate.status === 'passed' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#34C759]" />
                      ) : gate.status === 'failed' ? (
                        <XCircle className="w-3.5 h-3.5 text-[#FF3B30]" />
                      ) : (
                        <Circle className="w-3.5 h-3.5 text-[#C7C7CC]" />
                      )}
                    </div>
                    <span
                      className="text-[9px] font-bold mt-1"
                      style={{
                        color: gate.status === 'passed' ? '#34C759'
                          : gate.status === 'failed' ? '#FF3B30'
                          : '#C7C7CC',
                      }}
                    >
                      {TRANSITION_SHORT_LABELS[gate.transition]}
                    </span>

                    {/* Tooltip */}
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 hidden group-hover:block bg-[#1D1D1F] text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap z-10">
                      Gate: {gate.transition.replace(/_/g, ' ')} - {gate.status.replace('_', ' ')}
                    </div>
                  </div>
                ) : (
                  // Simple connector line
                  <div
                    className="h-0.5 mx-0.5"
                    style={{
                      width: '8px',
                      backgroundColor: '#E5E5EA',
                    }}
                  />
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
