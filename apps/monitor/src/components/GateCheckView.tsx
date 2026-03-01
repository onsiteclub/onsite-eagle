'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  CheckCircle2, XCircle, Circle, ChevronDown, ChevronUp,
  Play, Loader2, AlertTriangle, ShieldCheck, MinusCircle
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import {
  GATE_CHECK_TRANSITIONS,
  TRANSITION_LABELS,
  getLatestGateCheck,
  startGateCheck,
  updateGateCheckItem,
  completeGateCheck,
} from '@onsite/framing'
import type {
  FrmGateCheck, FrmGateCheckItem,
  GateCheckTransition, GateCheckResult, GateCheckStatus,
} from '@onsite/framing'

interface GateCheckViewProps {
  lotId: string
}

type GateCheckWithItems = FrmGateCheck & { items: FrmGateCheckItem[] }

const STATUS_DISPLAY: Record<GateCheckStatus | 'not_started', { color: string; bg: string; label: string }> = {
  not_started: { color: '#8E8E93', bg: '#F2F2F7', label: 'Not Started' },
  in_progress: { color: '#007AFF', bg: '#E8F0FE', label: 'In Progress' },
  passed: { color: '#34C759', bg: '#E8F5E9', label: 'Passed' },
  failed: { color: '#FF3B30', bg: '#FFE5E5', label: 'Failed' },
}

const RESULT_CONFIG: Record<GateCheckResult, { icon: typeof CheckCircle2; color: string; label: string }> = {
  pending: { icon: Circle, color: '#C7C7CC', label: 'Pending' },
  pass: { icon: CheckCircle2, color: '#34C759', label: 'Pass' },
  fail: { icon: XCircle, color: '#FF3B30', label: 'Fail' },
  na: { icon: MinusCircle, color: '#8E8E93', label: 'N/A' },
}

export default function GateCheckView({ lotId }: GateCheckViewProps) {
  const [checks, setChecks] = useState<Record<GateCheckTransition, GateCheckWithItems | null>>({
    framing_to_roofing: null,
    roofing_to_trades: null,
    trades_to_backframe: null,
    backframe_to_final: null,
  })
  const [loading, setLoading] = useState(true)
  const [expandedTransition, setExpandedTransition] = useState<GateCheckTransition | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null) // transition or item id

  const loadChecks = useCallback(async () => {
    setLoading(true)
    try {
      const results = await Promise.all(
        GATE_CHECK_TRANSITIONS.map(t => getLatestGateCheck(supabase, lotId, t))
      )
      const checksMap: typeof checks = {
        framing_to_roofing: results[0],
        roofing_to_trades: results[1],
        trades_to_backframe: results[2],
        backframe_to_final: results[3],
      }
      setChecks(checksMap)
    } catch (err) {
      console.error('Failed to load gate checks:', err)
    } finally {
      setLoading(false)
    }
  }, [lotId])

  useEffect(() => {
    loadChecks()
  }, [loadChecks])

  async function handleStart(transition: GateCheckTransition) {
    setActionLoading(transition)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      await startGateCheck(supabase, lotId, transition, user.id)
      await loadChecks()
      setExpandedTransition(transition)
    } catch (err) {
      console.error('Failed to start gate check:', err)
    } finally {
      setActionLoading(null)
    }
  }

  async function handleItemResult(itemId: string, result: GateCheckResult) {
    setActionLoading(itemId)
    try {
      await updateGateCheckItem(supabase, itemId, result)
      await loadChecks()
    } catch (err) {
      console.error('Failed to update item:', err)
    } finally {
      setActionLoading(null)
    }
  }

  async function handleComplete(transition: GateCheckTransition) {
    const gc = checks[transition]
    if (!gc) return

    setActionLoading(`complete_${transition}`)
    try {
      await completeGateCheck(supabase, gc.id)
      await loadChecks()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to complete gate check'
      alert(msg)
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-[#007AFF] animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <div className="p-6 border-b border-[#E5E5EA]">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="w-5 h-5 text-[#007AFF]" />
          <h2 className="text-2xl font-semibold text-[#1D1D1F]">Gate Checks</h2>
        </div>
        <p className="text-sm text-[#86868B]">
          Phase transition inspections for this lot
        </p>
      </div>

      {/* Transitions */}
      <div className="divide-y divide-[#E5E5EA]">
        {GATE_CHECK_TRANSITIONS.map(transition => {
          const gc = checks[transition]
          const isExpanded = expandedTransition === transition
          const statusKey = gc ? gc.status : 'not_started'
          const display = STATUS_DISPLAY[statusKey as keyof typeof STATUS_DISPLAY]

          // Count results
          const passCount = gc?.items.filter(i => i.result === 'pass').length ?? 0
          const failCount = gc?.items.filter(i => i.result === 'fail').length ?? 0
          const pendingCount = gc?.items.filter(i => i.result === 'pending').length ?? 0
          const naCount = gc?.items.filter(i => i.result === 'na').length ?? 0
          const totalItems = gc?.items.length ?? 0

          const allChecked = gc ? gc.items.every(i => i.result !== 'pending') : false

          return (
            <div key={transition}>
              {/* Transition card */}
              <button
                onClick={() => setExpandedTransition(isExpanded ? null : transition)}
                className="w-full px-6 py-4 text-left hover:bg-[#FAFAFA] transition-colors flex items-center gap-4"
              >
                {/* Status indicator */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: display.bg }}
                >
                  {statusKey === 'passed' ? (
                    <CheckCircle2 className="w-5 h-5" style={{ color: display.color }} />
                  ) : statusKey === 'failed' ? (
                    <XCircle className="w-5 h-5" style={{ color: display.color }} />
                  ) : statusKey === 'in_progress' ? (
                    <Play className="w-5 h-5" style={{ color: display.color }} />
                  ) : (
                    <Circle className="w-5 h-5" style={{ color: display.color }} />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#1D1D1F]">
                    {TRANSITION_LABELS[transition]}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span
                      className="text-xs font-medium"
                      style={{ color: display.color }}
                    >
                      {display.label}
                    </span>
                    {gc && totalItems > 0 && (
                      <span className="text-xs text-[#8E8E93]">
                        {passCount + naCount}/{totalItems} checked
                      </span>
                    )}
                  </div>

                  {/* Progress bar */}
                  {gc && totalItems > 0 && (
                    <div className="flex gap-0.5 mt-2 h-1.5 rounded-full overflow-hidden bg-[#F2F2F7]">
                      {passCount > 0 && (
                        <div
                          className="h-full rounded-full"
                          style={{
                            backgroundColor: '#34C759',
                            width: `${(passCount / totalItems) * 100}%`,
                          }}
                        />
                      )}
                      {naCount > 0 && (
                        <div
                          className="h-full rounded-full"
                          style={{
                            backgroundColor: '#8E8E93',
                            width: `${(naCount / totalItems) * 100}%`,
                          }}
                        />
                      )}
                      {failCount > 0 && (
                        <div
                          className="h-full rounded-full"
                          style={{
                            backgroundColor: '#FF3B30',
                            width: `${(failCount / totalItems) * 100}%`,
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* Result summary badges */}
                {gc && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {passCount > 0 && (
                      <span className="flex items-center gap-0.5 text-xs text-[#34C759]">
                        <CheckCircle2 className="w-3 h-3" />
                        {passCount}
                      </span>
                    )}
                    {failCount > 0 && (
                      <span className="flex items-center gap-0.5 text-xs text-[#FF3B30]">
                        <XCircle className="w-3 h-3" />
                        {failCount}
                      </span>
                    )}
                    {pendingCount > 0 && (
                      <span className="flex items-center gap-0.5 text-xs text-[#C7C7CC]">
                        <Circle className="w-3 h-3" />
                        {pendingCount}
                      </span>
                    )}
                  </div>
                )}

                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-[#C7C7CC] flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[#C7C7CC] flex-shrink-0" />
                )}
              </button>

              {/* Expanded items */}
              {isExpanded && (
                <div className="px-6 pb-5 bg-[#FAFAFA]">
                  {!gc ? (
                    // Not started — show Start button
                    <div className="ml-14 py-4">
                      <p className="text-sm text-[#8E8E93] mb-3">
                        This gate check has not been started. Start it to create the checklist.
                      </p>
                      <button
                        onClick={() => handleStart(transition)}
                        disabled={actionLoading === transition}
                        className="flex items-center gap-2 px-4 py-2 bg-[#007AFF] text-white text-sm font-medium rounded-lg hover:bg-[#0056CC] transition-colors disabled:opacity-50"
                      >
                        {actionLoading === transition ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Starting...
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4" />
                            Start Gate Check
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    // Show checklist
                    <div className="ml-14 space-y-2">
                      {gc.items.map(item => {
                        const resultCfg = RESULT_CONFIG[item.result]
                        const ResultIcon = resultCfg.icon
                        const isItemLoading = actionLoading === item.id
                        const isEditable = gc.status === 'in_progress'

                        return (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 px-3 py-2.5 bg-white rounded-lg border border-[#E5E5EA]"
                          >
                            {/* Result icon */}
                            <ResultIcon
                              className="w-5 h-5 flex-shrink-0"
                              style={{ color: resultCfg.color }}
                            />

                            {/* Label */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-[#1D1D1F]">
                                <span className="font-mono text-xs text-[#8E8E93] mr-2">{item.item_code}</span>
                                {item.item_label}
                              </p>
                              {item.notes && (
                                <p className="text-xs text-[#8E8E93] mt-0.5">{item.notes}</p>
                              )}
                            </div>

                            {/* Action buttons (inline toggle) */}
                            {isEditable && (
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {isItemLoading ? (
                                  <Loader2 className="w-4 h-4 text-[#007AFF] animate-spin" />
                                ) : (
                                  <>
                                    <button
                                      onClick={() => handleItemResult(item.id, 'pass')}
                                      className={`p-1.5 rounded-md transition-colors ${
                                        item.result === 'pass'
                                          ? 'bg-[#E8F5E9]'
                                          : 'hover:bg-[#F2F2F7]'
                                      }`}
                                      title="Pass"
                                    >
                                      <CheckCircle2
                                        className="w-4 h-4"
                                        style={{ color: item.result === 'pass' ? '#34C759' : '#C7C7CC' }}
                                      />
                                    </button>
                                    <button
                                      onClick={() => handleItemResult(item.id, 'fail')}
                                      className={`p-1.5 rounded-md transition-colors ${
                                        item.result === 'fail'
                                          ? 'bg-[#FFE5E5]'
                                          : 'hover:bg-[#F2F2F7]'
                                      }`}
                                      title="Fail"
                                    >
                                      <XCircle
                                        className="w-4 h-4"
                                        style={{ color: item.result === 'fail' ? '#FF3B30' : '#C7C7CC' }}
                                      />
                                    </button>
                                    <button
                                      onClick={() => handleItemResult(item.id, 'na')}
                                      className={`p-1.5 rounded-md transition-colors ${
                                        item.result === 'na'
                                          ? 'bg-[#F2F2F7]'
                                          : 'hover:bg-[#F2F2F7]'
                                      }`}
                                      title="N/A"
                                    >
                                      <MinusCircle
                                        className="w-4 h-4"
                                        style={{ color: item.result === 'na' ? '#8E8E93' : '#C7C7CC' }}
                                      />
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}

                      {/* Complete button */}
                      {gc.status === 'in_progress' && (
                        <div className="pt-3">
                          <button
                            onClick={() => handleComplete(transition)}
                            disabled={!allChecked || actionLoading === `complete_${transition}`}
                            className="flex items-center gap-2 px-4 py-2 bg-[#34C759] text-white text-sm font-medium rounded-lg hover:bg-[#2DA84C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {actionLoading === `complete_${transition}` ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Completing...
                              </>
                            ) : (
                              <>
                                <ShieldCheck className="w-4 h-4" />
                                Complete Gate Check
                              </>
                            )}
                          </button>
                          {!allChecked && (
                            <p className="text-xs text-[#8E8E93] mt-1.5 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              All items must be checked before completing
                            </p>
                          )}
                        </div>
                      )}

                      {/* Completed info */}
                      {(gc.status === 'passed' || gc.status === 'failed') && gc.completed_at && (
                        <div
                          className="flex items-center gap-2 p-3 rounded-lg mt-2"
                          style={{ backgroundColor: STATUS_DISPLAY[gc.status].bg }}
                        >
                          {gc.status === 'passed' ? (
                            <CheckCircle2 className="w-4 h-4 text-[#34C759]" />
                          ) : (
                            <XCircle className="w-4 h-4 text-[#FF3B30]" />
                          )}
                          <span
                            className="text-sm font-medium"
                            style={{ color: STATUS_DISPLAY[gc.status].color }}
                          >
                            {gc.status === 'passed' ? 'Gate check passed' : 'Gate check failed'} &mdash;{' '}
                            {new Date(gc.completed_at).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
