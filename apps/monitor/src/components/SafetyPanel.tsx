'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  ShieldAlert, Lock, AlertTriangle, CheckCircle2, Clock,
  Loader2, ChevronDown, ChevronUp, Image as ImageIcon
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { listHouseItems, FRAMING_PHASES } from '@onsite/framing'
import type { FrmHouseItem } from '@onsite/framing'
import { formatDistanceToNow } from 'date-fns'

interface SafetyPanelProps {
  lotId: string
}

const SEVERITY_COLORS: Record<string, string> = {
  low: '#8E8E93',
  medium: '#FF9500',
  high: '#FF3B30',
  critical: '#AF2E1B',
}

const PHASE_MAP = Object.fromEntries(FRAMING_PHASES.map(p => [p.id, p.name]))

export default function SafetyPanel({ lotId }: SafetyPanelProps) {
  const [safetyItems, setSafetyItems] = useState<FrmHouseItem[]>([])
  const [blockingItems, setBlockingItems] = useState<FrmHouseItem[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  async function loadItems() {
    setLoading(true)
    try {
      const [safety, blocking] = await Promise.all([
        listHouseItems(supabase, lotId, { type: 'safety' }),
        listHouseItems(supabase, lotId, { blocking: true }),
      ])
      setSafetyItems(safety)
      // Blocking items that are NOT safety (to avoid duplicates)
      setBlockingItems(blocking.filter(b => b.type !== 'safety'))
    } catch (err) {
      console.error('Failed to load safety items:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadItems()

    const channel = supabase
      .channel(`safety_${lotId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'frm_house_items',
        filter: `lot_id=eq.${lotId}`,
      }, () => {
        loadItems()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [lotId])

  const unresolvedSafety = useMemo(
    () => safetyItems.filter(i => i.status !== 'resolved'),
    [safetyItems],
  )
  const resolvedSafety = useMemo(
    () => safetyItems.filter(i => i.status === 'resolved'),
    [safetyItems],
  )
  const unresolvedBlocking = useMemo(
    () => blockingItems.filter(i => i.status !== 'resolved'),
    [blockingItems],
  )

  const totalUnresolved = unresolvedSafety.length + unresolvedBlocking.length

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-[#FF3B30] animate-spin" />
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[#E5E5EA] overflow-hidden">
      {/* Header */}
      <div
        className="px-5 py-4 flex items-center justify-between"
        style={{
          backgroundColor: totalUnresolved > 0 ? '#FFF5F5' : '#F0FFF5',
          borderBottom: '1px solid #E5E5EA',
        }}
      >
        <div className="flex items-center gap-2">
          <ShieldAlert
            className="w-5 h-5"
            style={{ color: totalUnresolved > 0 ? '#FF3B30' : '#34C759' }}
          />
          <h3 className="text-base font-semibold text-[#1D1D1F]">Safety & Blocking</h3>
        </div>
        {totalUnresolved > 0 ? (
          <span className="flex items-center gap-1 px-2.5 py-1 bg-[#FF3B30] text-white text-xs font-bold rounded-full">
            {totalUnresolved}
          </span>
        ) : (
          <span className="flex items-center gap-1 px-2.5 py-1 bg-[#34C759] text-white text-xs font-bold rounded-full">
            <CheckCircle2 className="w-3 h-3" />
            Clear
          </span>
        )}
      </div>

      {/* Unresolved safety items */}
      {unresolvedSafety.length > 0 && (
        <div>
          <div className="px-5 py-2 bg-[#FFF0F0]">
            <span className="text-xs font-semibold text-[#FF3B30] uppercase tracking-wide">
              Safety Issues ({unresolvedSafety.length})
            </span>
          </div>
          <div className="divide-y divide-[#F2E5E5]">
            {unresolvedSafety.map(item => {
              const isExpanded = expandedId === item.id
              return (
                <div key={item.id} className="bg-[#FFFAFA]">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="w-full px-5 py-3 text-left flex items-center gap-3 hover:bg-[#FFF0F0] transition-colors"
                  >
                    {/* Thumbnail */}
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#FFE5E5] flex-shrink-0 border border-[#FFD0D0]">
                      {item.photo_url ? (
                        <img src={item.photo_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-4 h-4 text-[#FF9999]" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: SEVERITY_COLORS[item.severity] }}
                        />
                        <span className="text-xs text-[#FF3B30] font-medium capitalize">{item.severity}</span>
                        {item.blocking && (
                          <Lock className="w-3 h-3 text-[#FF3B30]" />
                        )}
                      </div>
                      <p className="text-sm font-medium text-[#1D1D1F] truncate">{item.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {item.phase_id && (
                          <span className="text-xs text-[#8E8E93]">{PHASE_MAP[item.phase_id] ?? item.phase_id}</span>
                        )}
                        <span className="text-xs text-[#C7C7CC]">
                          {formatDistanceToNow(new Date(item.reported_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>

                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[#FFF3E0] text-[#FF9500]">
                      <Clock className="w-3 h-3" />
                      {item.status === 'in_progress' ? 'In Progress' : 'Open'}
                    </span>

                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-[#C7C7CC] flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#C7C7CC] flex-shrink-0" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-3 pl-[4.5rem]">
                      {item.description && (
                        <p className="text-sm text-[#3C3C43] mb-2">{item.description}</p>
                      )}
                      {item.photo_url && (
                        <img
                          src={item.photo_url}
                          alt="Safety issue"
                          className="max-w-xs rounded-lg border border-[#FFD0D0]"
                        />
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Unresolved blocking (non-safety) items */}
      {unresolvedBlocking.length > 0 && (
        <div>
          <div className="px-5 py-2 bg-[#FFF8F0]">
            <span className="text-xs font-semibold text-[#FF9500] uppercase tracking-wide">
              Other Blocking Items ({unresolvedBlocking.length})
            </span>
          </div>
          <div className="divide-y divide-[#F2EDEA]">
            {unresolvedBlocking.map(item => (
              <div key={item.id} className="px-5 py-3 flex items-center gap-3 bg-[#FFFCFA]">
                <Lock className="w-4 h-4 text-[#FF9500] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1D1D1F] truncate">{item.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-[#8E8E93] capitalize">{item.type}</span>
                    {item.phase_id && (
                      <span className="text-xs text-[#C7C7CC]">{PHASE_MAP[item.phase_id] ?? item.phase_id}</span>
                    )}
                  </div>
                </div>
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: SEVERITY_COLORS[item.severity] }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resolved safety items (dimmed) */}
      {resolvedSafety.length > 0 && (
        <div>
          <div className="px-5 py-2 bg-[#F9F9FB]">
            <span className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wide">
              Resolved Safety ({resolvedSafety.length})
            </span>
          </div>
          <div className="divide-y divide-[#F2F2F7]">
            {resolvedSafety.map(item => (
              <div key={item.id} className="px-5 py-2.5 flex items-center gap-3 opacity-60">
                <CheckCircle2 className="w-4 h-4 text-[#34C759] flex-shrink-0" />
                <p className="text-sm text-[#8E8E93] truncate flex-1 line-through">{item.title}</p>
                {item.resolved_at && (
                  <span className="text-xs text-[#C7C7CC]">
                    {formatDistanceToNow(new Date(item.resolved_at), { addSuffix: true })}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All clear message */}
      {totalUnresolved === 0 && safetyItems.length === 0 && blockingItems.length === 0 && (
        <div className="px-5 py-8 text-center">
          <CheckCircle2 className="w-8 h-8 text-[#34C759] mx-auto mb-2" />
          <p className="text-sm text-[#8E8E93]">No safety or blocking items</p>
        </div>
      )}
    </div>
  )
}
