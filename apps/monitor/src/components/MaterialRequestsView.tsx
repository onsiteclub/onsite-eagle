'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Plus, Package, Truck, Clock, CheckCircle2, XCircle,
  AlertTriangle, Filter, RefreshCw, MoreVertical
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type {
  MaterialRequest, MaterialRequestStatus, UrgencyLevel, House
} from '@onsite/shared'
import { getMaterialRequests, updateRequestStatus } from '@onsite/shared'
import CreateMaterialRequestModal from './CreateMaterialRequestModal'
import { formatDistanceToNow } from 'date-fns'

interface MaterialRequestsViewProps {
  siteId: string
  // Site-level props (optional when viewing at lot level)
  siteName?: string
  houses?: House[]
  // Lot-level props (when viewing from a specific lot)
  houseId?: string
  houseLotNumber?: string
}

const URGENCY_COLORS: Record<UrgencyLevel, string> = {
  critical: '#FF3B30',
  high: '#FF9500',
  medium: '#FFCC00',
  low: '#8E8E93'
}

const STATUS_COLORS: Record<MaterialRequestStatus, string> = {
  pending: '#FF9500',
  acknowledged: '#007AFF',
  in_transit: '#5856D6',
  delivered: '#34C759',
  cancelled: '#8E8E93'
}

const STATUS_ICONS: Record<MaterialRequestStatus, React.ElementType> = {
  pending: Clock,
  acknowledged: CheckCircle2,
  in_transit: Truck,
  delivered: CheckCircle2,
  cancelled: XCircle
}

export default function MaterialRequestsView({
  siteId,
  siteName,
  houses,
  houseId,
  houseLotNumber
}: MaterialRequestsViewProps) {
  const [requests, setRequests] = useState<MaterialRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [statusFilter, setStatusFilter] = useState<MaterialRequestStatus | 'all'>('all')
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyLevel | 'all'>('all')
  const [lotFilter, setLotFilter] = useState<string>('all')

  // Determine if we're in lot-level view
  const isLotLevel = !!houseId
  const displayName = isLotLevel ? `Lot ${houseLotNumber}` : siteName

  useEffect(() => {
    loadRequests()

    // Subscribe to realtime updates
    const channelName = isLotLevel
      ? `material_requests_${siteId}_${houseId}`
      : `material_requests_${siteId}`

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'egl_material_requests',
        filter: isLotLevel ? `house_id=eq.${houseId}` : `site_id=eq.${siteId}`
      }, () => {
        loadRequests()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [siteId, houseId, isLotLevel])

  async function loadRequests() {
    try {
      const { data, error } = await getMaterialRequests(supabase, {
        siteId,
        houseId: isLotLevel ? houseId : undefined
      })

      if (error) {
        console.error('Error loading requests:', error)
        return
      }

      // Transform data to include lot_number at top level
      const transformedData = (data || []).map(req => ({
        ...req,
        lot_number: (req as any).house?.lot_number || null,
        site_name: displayName
      }))

      setRequests(transformedData)
    } catch (err) {
      console.error('Error loading requests:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      if (statusFilter !== 'all' && req.status !== statusFilter) return false
      if (urgencyFilter !== 'all' && req.urgency_level !== urgencyFilter) return false
      if (lotFilter !== 'all' && req.house_id !== lotFilter) return false
      return true
    })
  }, [requests, statusFilter, urgencyFilter, lotFilter])

  const stats = useMemo(() => {
    const pending = requests.filter(r => r.status === 'pending').length
    const inTransit = requests.filter(r => r.status === 'in_transit').length
    const deliveredToday = requests.filter(r => {
      if (r.status !== 'delivered' || !r.delivered_at) return false
      const deliveredDate = new Date(r.delivered_at).toDateString()
      return deliveredDate === new Date().toDateString()
    }).length
    const critical = requests.filter(r => r.urgency_level === 'critical' && r.status === 'pending').length
    return { pending, inTransit, deliveredToday, critical }
  }, [requests])

  async function handleStatusChange(requestId: string, newStatus: MaterialRequestStatus) {
    const { error } = await updateRequestStatus(supabase, requestId, {
      status: newStatus
    })

    if (error) {
      console.error('Error updating status:', error)
    }
  }

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <div className="p-6 border-b border-[#E5E5EA]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-semibold text-[#1D1D1F]">Material Requests</h2>
            <p className="text-sm text-[#86868B]">
              {isLotLevel
                ? `Request materials for Lot ${houseLotNumber}`
                : `Manage material deliveries for ${siteName}`}
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#007AFF] text-white rounded-lg hover:bg-[#0056CC] transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Request
          </button>
        </div>

        {/* Stats */}
        <div className="flex gap-4">
          <div className="flex items-center gap-2 px-3 py-2 bg-[#FFF3E0] rounded-lg">
            <Clock className="w-4 h-4 text-[#FF9500]" />
            <span className="text-sm font-medium text-[#FF9500]">{stats.pending} Pending</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-[#E8F0FE] rounded-lg">
            <Truck className="w-4 h-4 text-[#5856D6]" />
            <span className="text-sm font-medium text-[#5856D6]">{stats.inTransit} In Transit</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-[#E8F5E9] rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-[#34C759]" />
            <span className="text-sm font-medium text-[#34C759]">{stats.deliveredToday} Delivered Today</span>
          </div>
          {stats.critical > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-[#FFE5E5] rounded-lg">
              <AlertTriangle className="w-4 h-4 text-[#FF3B30]" />
              <span className="text-sm font-medium text-[#FF3B30]">{stats.critical} Critical</span>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-[#E5E5EA] flex items-center gap-4">
        <Filter className="w-4 h-4 text-[#86868B]" />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as MaterialRequestStatus | 'all')}
          className="px-3 py-1.5 border border-[#D2D2D7] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="in_transit">In Transit</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <select
          value={urgencyFilter}
          onChange={(e) => setUrgencyFilter(e.target.value as UrgencyLevel | 'all')}
          className="px-3 py-1.5 border border-[#D2D2D7] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
        >
          <option value="all">All Urgency</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        {/* Only show lot filter when viewing at site level */}
        {!isLotLevel && houses && (
          <select
            value={lotFilter}
            onChange={(e) => setLotFilter(e.target.value)}
            className="px-3 py-1.5 border border-[#D2D2D7] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
          >
            <option value="all">All Lots</option>
            <option value="site-wide">Site-wide</option>
            {houses.map(house => (
              <option key={house.id} value={house.id}>Lot {house.lot_number}</option>
            ))}
          </select>
        )}

        <button
          onClick={loadRequests}
          className="ml-auto flex items-center gap-1 px-3 py-1.5 text-sm text-[#007AFF] hover:bg-[#F5F5F7] rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Request List */}
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-[#007AFF] border-t-transparent rounded-full" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-[#D2D2D7] mx-auto mb-4" />
            <p className="text-[#86868B]">No material requests found</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 text-[#007AFF] hover:underline"
            >
              Create your first request
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRequests.map(request => (
              <MaterialRequestCard
                key={request.id}
                request={request}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateMaterialRequestModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          siteId={siteId}
          houses={houses}
          preselectedHouseId={houseId}
          preselectedLotNumber={houseLotNumber}
          onSuccess={() => {
            setShowCreateModal(false)
            loadRequests()
          }}
        />
      )}
    </div>
  )
}

// Request Card Component
interface MaterialRequestCardProps {
  request: MaterialRequest
  onStatusChange: (id: string, status: MaterialRequestStatus) => void
}

function MaterialRequestCard({ request, onStatusChange }: MaterialRequestCardProps) {
  const [showActions, setShowActions] = useState(false)
  const StatusIcon = STATUS_ICONS[request.status]

  const timeAgo = formatDistanceToNow(new Date(request.created_at), { addSuffix: true })

  return (
    <div className="flex items-stretch bg-white border border-[#E5E5EA] rounded-xl overflow-hidden hover:shadow-sm transition-shadow">
      {/* Urgency indicator bar */}
      <div
        className="w-1.5"
        style={{ backgroundColor: URGENCY_COLORS[request.urgency_level] }}
      />

      <div className="flex-1 p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Material info */}
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-[#1D1D1F]">{request.material_name}</span>
              <span className="px-2 py-0.5 text-xs font-medium bg-[#F5F5F7] rounded-full text-[#86868B]">
                {request.quantity} {request.unit}
              </span>
            </div>

            {/* Location */}
            <div className="flex items-center gap-4 text-sm text-[#86868B]">
              {request.lot_number ? (
                <span>Lot {request.lot_number}</span>
              ) : (
                <span>Site-wide</span>
              )}
              {request.delivery_location && (
                <span>• {request.delivery_location}</span>
              )}
            </div>

            {/* Requester & time */}
            <div className="flex items-center gap-2 mt-2 text-xs text-[#86868B]">
              <span>Requested by {request.requested_by_name}</span>
              <span>•</span>
              <span>{timeAgo}</span>
              <span>•</span>
              <span
                className="px-1.5 py-0.5 rounded text-xs font-medium"
                style={{
                  backgroundColor: `${URGENCY_COLORS[request.urgency_level]}20`,
                  color: URGENCY_COLORS[request.urgency_level]
                }}
              >
                {request.urgency_level.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Status & Actions */}
          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium"
              style={{
                backgroundColor: `${STATUS_COLORS[request.status]}15`,
                color: STATUS_COLORS[request.status]
              }}
            >
              <StatusIcon className="w-3.5 h-3.5" />
              <span className="capitalize">{request.status.replace('_', ' ')}</span>
            </div>

            {/* Actions dropdown */}
            {request.status !== 'delivered' && request.status !== 'cancelled' && (
              <div className="relative">
                <button
                  onClick={() => setShowActions(!showActions)}
                  className="p-1 hover:bg-[#F5F5F7] rounded-lg transition-colors"
                >
                  <MoreVertical className="w-5 h-5 text-[#86868B]" />
                </button>

                {showActions && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowActions(false)}
                    />
                    <div className="absolute right-0 top-full mt-1 bg-white border border-[#E5E5EA] rounded-lg shadow-lg z-20 py-1 min-w-[160px]">
                      {request.status === 'pending' && (
                        <>
                          <button
                            onClick={() => {
                              onStatusChange(request.id, 'acknowledged')
                              setShowActions(false)
                            }}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-[#F5F5F7] transition-colors"
                          >
                            Acknowledge
                          </button>
                          <button
                            onClick={() => {
                              onStatusChange(request.id, 'cancelled')
                              setShowActions(false)
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-[#FF3B30] hover:bg-[#FFE5E5] transition-colors"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      {request.status === 'acknowledged' && (
                        <button
                          onClick={() => {
                            onStatusChange(request.id, 'in_transit')
                            setShowActions(false)
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-[#F5F5F7] transition-colors"
                        >
                          Mark In Transit
                        </button>
                      )}
                      {request.status === 'in_transit' && (
                        <button
                          onClick={() => {
                            onStatusChange(request.id, 'delivered')
                            setShowActions(false)
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-[#F5F5F7] transition-colors"
                        >
                          Mark Delivered
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
