'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Plus, Filter, AlertTriangle, ShieldAlert, Lock,
  ChevronDown, ChevronUp, Clock, Wrench, CheckCircle2,
  Image as ImageIcon, Loader2, RefreshCw
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import {
  listHouseItems,
  FRAMING_PHASES,
} from '@onsite/framing'
import type {
  FrmHouseItem, ItemType, ItemSeverity, ItemStatus, PhaseId,
} from '@onsite/framing'
import HouseItemForm from './HouseItemForm'
import HouseItemResolve from './HouseItemResolve'
import { formatDistanceToNow } from 'date-fns'

interface HouseItemsListProps {
  lotId: string
}

const TYPE_LABELS: Record<ItemType, string> = {
  deficiency: 'Deficiency',
  safety: 'Safety',
  damage: 'Damage',
  missing: 'Missing',
  rework: 'Rework',
  note: 'Note',
}

const TYPE_COLORS: Record<ItemType, { bg: string; text: string }> = {
  deficiency: { bg: '#FFF3E0', text: '#FF9500' },
  safety: { bg: '#FFE5E5', text: '#FF3B30' },
  damage: { bg: '#FFF0F0', text: '#D63030' },
  missing: { bg: '#E8F0FE', text: '#5856D6' },
  rework: { bg: '#FFF8E1', text: '#FF9500' },
  note: { bg: '#F2F2F7', text: '#8E8E93' },
}

const SEVERITY_COLORS: Record<ItemSeverity, string> = {
  low: '#8E8E93',
  medium: '#FF9500',
  high: '#FF3B30',
  critical: '#AF2E1B',
}

const STATUS_CONFIG: Record<ItemStatus, { icon: typeof Clock; color: string; bg: string; label: string }> = {
  open: { icon: Clock, color: '#FF9500', bg: '#FFF3E0', label: 'Open' },
  in_progress: { icon: Wrench, color: '#007AFF', bg: '#E8F0FE', label: 'In Progress' },
  resolved: { icon: CheckCircle2, color: '#34C759', bg: '#E8F5E9', label: 'Resolved' },
}

const PHASE_MAP = Object.fromEntries(FRAMING_PHASES.map(p => [p.id, p.name]))

export default function HouseItemsList({ lotId }: HouseItemsListProps) {
  const [items, setItems] = useState<FrmHouseItem[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState<ItemStatus | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<ItemType | 'all'>('all')
  const [severityFilter, setSeverityFilter] = useState<ItemSeverity | 'all'>('all')
  const [phaseFilter, setPhaseFilter] = useState<PhaseId | 'all'>('all')

  // Modals
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [resolveItem, setResolveItem] = useState<FrmHouseItem | null>(null)

  async function loadItems() {
    setLoading(true)
    try {
      const data = await listHouseItems(supabase, lotId)
      setItems(data)
    } catch (err) {
      console.error('Failed to load house items:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadItems()

    // Subscribe to realtime
    const channel = supabase
      .channel(`house_items_${lotId}`)
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

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false
      if (typeFilter !== 'all' && item.type !== typeFilter) return false
      if (severityFilter !== 'all' && item.severity !== severityFilter) return false
      if (phaseFilter !== 'all' && item.phase_id !== phaseFilter) return false
      return true
    })
  }, [items, statusFilter, typeFilter, severityFilter, phaseFilter])

  const stats = useMemo(() => {
    const open = items.filter(i => i.status === 'open').length
    const inProgress = items.filter(i => i.status === 'in_progress').length
    const blocking = items.filter(i => i.blocking && i.status !== 'resolved').length
    const safety = items.filter(i => i.type === 'safety' && i.status !== 'resolved').length
    return { open, inProgress, blocking, safety }
  }, [items])

  function toggleExpand(id: string) {
    setExpandedId(prev => prev === id ? null : id)
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
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-semibold text-[#1D1D1F]">House Items</h2>
            <p className="text-sm text-[#86868B]">
              {items.length} item{items.length !== 1 ? 's' : ''} reported
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadItems}
              className="p-2 rounded-lg hover:bg-[#F2F2F7] transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4 text-[#8E8E93]" />
            </button>
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#007AFF] text-white rounded-lg hover:bg-[#0056CC] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-2 bg-[#FFF3E0] rounded-lg">
            <Clock className="w-4 h-4 text-[#FF9500]" />
            <span className="text-sm font-medium text-[#FF9500]">{stats.open} Open</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-[#E8F0FE] rounded-lg">
            <Wrench className="w-4 h-4 text-[#007AFF]" />
            <span className="text-sm font-medium text-[#007AFF]">{stats.inProgress} In Progress</span>
          </div>
          {stats.blocking > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-[#FFE5E5] rounded-lg">
              <Lock className="w-3.5 h-3.5 text-[#FF3B30]" />
              <span className="text-sm font-medium text-[#FF3B30]">{stats.blocking} Blocking</span>
            </div>
          )}
          {stats.safety > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-[#FFE5E5] rounded-lg">
              <ShieldAlert className="w-4 h-4 text-[#FF3B30]" />
              <span className="text-sm font-medium text-[#FF3B30]">{stats.safety} Safety</span>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-[#E5E5EA] flex items-center gap-3 flex-wrap">
        <Filter className="w-4 h-4 text-[#86868B]" />

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as ItemStatus | 'all')}
          className="px-3 py-1.5 border border-[#D2D2D7] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF] bg-white"
        >
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>

        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value as ItemType | 'all')}
          className="px-3 py-1.5 border border-[#D2D2D7] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF] bg-white"
        >
          <option value="all">All Types</option>
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        <select
          value={severityFilter}
          onChange={e => setSeverityFilter(e.target.value as ItemSeverity | 'all')}
          className="px-3 py-1.5 border border-[#D2D2D7] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF] bg-white"
        >
          <option value="all">All Severity</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>

        <select
          value={phaseFilter}
          onChange={e => setPhaseFilter(e.target.value as PhaseId | 'all')}
          className="px-3 py-1.5 border border-[#D2D2D7] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF] bg-white"
        >
          <option value="all">All Phases</option>
          {FRAMING_PHASES.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Items List */}
      <div className="divide-y divide-[#E5E5EA]">
        {filteredItems.length === 0 ? (
          <div className="py-16 text-center">
            <div className="inline-flex p-4 bg-[#F2F2F7] rounded-full mb-3">
              <CheckCircle2 className="w-8 h-8 text-[#8E8E93]" />
            </div>
            <p className="text-[#8E8E93] text-sm">
              {items.length === 0 ? 'No items reported yet' : 'No items match filters'}
            </p>
          </div>
        ) : (
          filteredItems.map(item => {
            const isExpanded = expandedId === item.id
            const typeColor = TYPE_COLORS[item.type]
            const severityColor = SEVERITY_COLORS[item.severity]
            const statusCfg = STATUS_CONFIG[item.status]
            const StatusIcon = statusCfg.icon
            const isSafety = item.type === 'safety'

            return (
              <div
                key={item.id}
                className={`transition-colors ${
                  isSafety && item.status !== 'resolved'
                    ? 'border-l-4 border-l-[#FF3B30]'
                    : ''
                }`}
              >
                {/* Row */}
                <button
                  onClick={() => toggleExpand(item.id)}
                  className="w-full px-6 py-4 text-left hover:bg-[#FAFAFA] transition-colors flex items-center gap-4"
                >
                  {/* Photo thumbnail */}
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#F2F2F7] flex-shrink-0">
                    {item.photo_url ? (
                      <img
                        src={item.photo_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-5 h-5 text-[#C7C7CC]" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {/* Type badge */}
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ backgroundColor: typeColor.bg, color: typeColor.text }}
                      >
                        {TYPE_LABELS[item.type]}
                      </span>
                      {/* Severity dot */}
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: severityColor }}
                        title={item.severity}
                      />
                      <span className="text-xs text-[#8E8E93] capitalize">{item.severity}</span>
                      {/* Blocking */}
                      {item.blocking && item.status !== 'resolved' && (
                        <span className="flex items-center gap-0.5 text-xs text-[#FF3B30] font-medium">
                          <Lock className="w-3 h-3" />
                          Blocking
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-[#1D1D1F] truncate">{item.title}</p>
                    <div className="flex items-center gap-3 mt-1">
                      {item.phase_id && (
                        <span className="text-xs text-[#86868B]">
                          {PHASE_MAP[item.phase_id] ?? item.phase_id}
                        </span>
                      )}
                      <span className="text-xs text-[#C7C7CC]">
                        {formatDistanceToNow(new Date(item.reported_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}
                    >
                      <StatusIcon className="w-3 h-3" />
                      {statusCfg.label}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-[#C7C7CC]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#C7C7CC]" />
                    )}
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-6 pb-5 bg-[#FAFAFA]">
                    <div className="ml-16 space-y-3">
                      {/* Description */}
                      {item.description && (
                        <p className="text-sm text-[#3C3C43]">{item.description}</p>
                      )}

                      {/* Full photo */}
                      {item.photo_url && (
                        <img
                          src={item.photo_url}
                          alt="Issue photo"
                          className="max-w-sm rounded-lg border border-[#E5E5EA]"
                        />
                      )}

                      {/* Resolution info */}
                      {item.status === 'resolved' && (
                        <div className="p-3 bg-[#E8F5E9] rounded-lg">
                          <p className="text-xs font-medium text-[#34C759] mb-1">Resolved</p>
                          {item.resolution_note && (
                            <p className="text-sm text-[#1D1D1F] mb-2">{item.resolution_note}</p>
                          )}
                          {item.resolved_photo && (
                            <img
                              src={item.resolved_photo}
                              alt="Resolution photo"
                              className="max-w-xs rounded-lg border border-[#C8E6C9]"
                            />
                          )}
                          {item.resolved_at && (
                            <p className="text-xs text-[#8E8E93] mt-2">
                              Resolved {formatDistanceToNow(new Date(item.resolved_at), { addSuffix: true })}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Action buttons */}
                      {item.status !== 'resolved' && (
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setResolveItem(item)
                            }}
                            className="px-3 py-1.5 text-sm font-medium text-white bg-[#34C759] rounded-lg hover:bg-[#2DA84C] transition-colors"
                          >
                            Resolve
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Create Modal */}
      {showCreateForm && (
        <HouseItemForm
          lotId={lotId}
          onCreated={loadItems}
          onClose={() => setShowCreateForm(false)}
        />
      )}

      {/* Resolve Modal */}
      {resolveItem && (
        <HouseItemResolve
          item={resolveItem}
          onResolved={loadItems}
          onClose={() => setResolveItem(null)}
        />
      )}
    </div>
  )
}
