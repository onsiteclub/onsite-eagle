'use client'

/**
 * Payment Sheet — Lot x Phase matrix with rates and values.
 *
 * Enhanced version with:
 * - egl_phase_rates for auto-calculated values
 * - egl_phase_assignments for per-phase worker (not house-level)
 * - Full spreadsheet view with sorting, filtering, export
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Loader2, Download, CheckSquare, Square,
  AlertTriangle,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface PaymentSheetProps {
  siteId: string
  siteName: string
}

type PaymentStatus = 'not_due' | 'due' | 'approved_for_payment' | 'exported'

interface PaymentRow {
  id: string
  lot_number: string
  house_id: string
  phase_name: string
  phase_order: number
  sqft_total: number | null
  sqft_basement: number | null
  rate_per_sqft: number | null
  rate_per_sqft_basement: number | null
  calculated_value: number | null
  worker_code: string | null
  worker_name: string | null
  completed_at: string | null
  payment_status: PaymentStatus
  payment_approved_at: string | null
  payment_exported_at: string | null
  payment_notes: string | null
}

const STATUS_LABELS: Record<PaymentStatus, string> = {
  not_due: 'Not Due',
  due: 'Due',
  approved_for_payment: 'Approved',
  exported: 'Exported',
}

const STATUS_COLORS: Record<PaymentStatus, string> = {
  not_due: '#8E8E93',
  due: '#FF9500',
  approved_for_payment: '#34C759',
  exported: '#007AFF',
}

export default function PaymentSheet({ siteId, siteName }: PaymentSheetProps) {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<PaymentRow[]>([])
  const [filter, setFilter] = useState<'all' | PaymentStatus>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [approving, setApproving] = useState(false)
  const [exporting, setExporting] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)

    const { data: schedules } = await supabase
      .from('egl_schedules')
      .select('id, house_id, assigned_worker_name')
      .eq('site_id', siteId)

    if (!schedules?.length) {
      setRows([])
      setLoading(false)
      return
    }

    const scheduleIds = schedules.map(s => s.id)
    const houseIds = schedules.map(s => s.house_id)

    const [housesRes, phasesRes, phaseRefsRes, ratesRes, assignmentsRes] = await Promise.all([
      supabase
        .from('egl_houses')
        .select('id, lot_number, sqft_total, sqft_main_floors, sqft_basement')
        .in('id', houseIds),
      supabase
        .from('egl_schedule_phases')
        .select(`
          id, schedule_id, phase_id, status,
          actual_end_date,
          payment_status, payment_approved_at,
          payment_exported_at, payment_notes
        `)
        .in('schedule_id', scheduleIds),
      supabase
        .from('ref_eagle_phases')
        .select('id, name, order_index')
        .order('order_index', { ascending: true }),
      supabase
        .from('egl_phase_rates')
        .select('phase_id, rate_per_sqft, rate_per_sqft_basement')
        .eq('site_id', siteId)
        .is('effective_to', null),
      supabase
        .from('egl_phase_assignments')
        .select('house_id, phase_id, worker_id')
        .in('house_id', houseIds),
    ])

    const houseMap = new Map(
      (housesRes.data || []).map(h => [h.id, h])
    )
    const scheduleMap = new Map(
      schedules.map(s => [s.id, s])
    )
    const phaseNameMap = new Map(
      (phaseRefsRes.data || []).map(p => [p.id, p])
    )
    const rateMap = new Map(
      (ratesRes.data || []).map(r => [r.phase_id, r])
    )
    const assignmentMap = new Map(
      (assignmentsRes.data || []).map(a => [`${a.house_id}:${a.phase_id}`, a.worker_id])
    )

    const workerIds = [...new Set(
      (assignmentsRes.data || []).map(a => a.worker_id)
    )]
    const workerNames = schedules
      .map(s => s.assigned_worker_name)
      .filter(Boolean) as string[]

    let workerProfileMap = new Map<string, { full_name: string; worker_code: string | null }>()
    if (workerIds.length > 0 || workerNames.length > 0) {
      const { data: profiles } = await supabase
        .from('core_profiles')
        .select('id, full_name, worker_code')

      if (profiles) {
        for (const p of profiles) {
          workerProfileMap.set(p.id, { full_name: p.full_name, worker_code: p.worker_code })
          if (p.full_name) {
            workerProfileMap.set(p.full_name, { full_name: p.full_name, worker_code: p.worker_code })
          }
        }
      }
    }

    const result: PaymentRow[] = (phasesRes.data || []).map(p => {
      const schedule = scheduleMap.get(p.schedule_id)
      const house = schedule ? houseMap.get(schedule.house_id) : undefined
      const phaseRef = phaseNameMap.get(p.phase_id)
      const rate = rateMap.get(p.phase_id)

      const assignmentKey = schedule ? `${schedule.house_id}:${p.phase_id}` : ''
      const assignedWorkerId = assignmentMap.get(assignmentKey)
      let workerName: string | null = null
      let workerCode: string | null = null

      if (assignedWorkerId) {
        const profile = workerProfileMap.get(assignedWorkerId)
        workerName = profile?.full_name || null
        workerCode = profile?.worker_code || null
      } else if (schedule?.assigned_worker_name) {
        workerName = schedule.assigned_worker_name
        const profile = workerProfileMap.get(schedule.assigned_worker_name)
        workerCode = profile?.worker_code || null
      }

      let calculatedValue: number | null = null
      if (rate && house) {
        const mainSqft = (house.sqft_total || 0) - (house.sqft_basement || 0)
        const bsmtSqft = house.sqft_basement || 0
        const mainValue = mainSqft * rate.rate_per_sqft
        const bsmtValue = bsmtSqft * (rate.rate_per_sqft_basement || rate.rate_per_sqft)
        calculatedValue = mainValue + bsmtValue
      }

      let paymentStatus: PaymentStatus = (p.payment_status as PaymentStatus) || 'not_due'
      if (p.status === 'completed' && paymentStatus === 'not_due') {
        paymentStatus = 'due'
      }

      return {
        id: p.id,
        lot_number: house?.lot_number || '?',
        house_id: schedule?.house_id || '',
        phase_name: phaseRef?.name || 'Unknown',
        phase_order: phaseRef?.order_index || 0,
        sqft_total: house?.sqft_total || null,
        sqft_basement: house?.sqft_basement || null,
        rate_per_sqft: rate?.rate_per_sqft || null,
        rate_per_sqft_basement: rate?.rate_per_sqft_basement || null,
        calculated_value: calculatedValue,
        worker_code: workerCode,
        worker_name: workerName,
        completed_at: p.actual_end_date,
        payment_status: paymentStatus,
        payment_approved_at: p.payment_approved_at,
        payment_exported_at: p.payment_exported_at,
        payment_notes: p.payment_notes,
      }
    }).sort((a, b) => {
      const lotCmp = a.lot_number.localeCompare(b.lot_number, undefined, { numeric: true })
      if (lotCmp !== 0) return lotCmp
      return a.phase_order - b.phase_order
    })

    setRows(result)
    setLoading(false)
  }, [siteId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredRows = useMemo(() => {
    if (filter === 'all') return rows
    return rows.filter(r => r.payment_status === filter)
  }, [rows, filter])

  const dueCount = rows.filter(r => r.payment_status === 'due').length
  const approvedCount = rows.filter(r => r.payment_status === 'approved_for_payment').length
  const exportedCount = rows.filter(r => r.payment_status === 'exported').length
  const totalValue = rows.reduce((sum, r) => sum + (r.calculated_value || 0), 0)
  const dueValue = rows
    .filter(r => r.payment_status === 'due' || r.payment_status === 'approved_for_payment')
    .reduce((sum, r) => sum + (r.calculated_value || 0), 0)

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    const dueRows = filteredRows.filter(r => r.payment_status === 'due')
    if (dueRows.every(r => selectedIds.has(r.id)) && dueRows.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(dueRows.map(r => r.id)))
    }
  }

  const handleApprove = async () => {
    if (selectedIds.size === 0) return
    setApproving(true)
    const ids = Array.from(selectedIds)
    await supabase
      .from('egl_schedule_phases')
      .update({
        payment_status: 'approved_for_payment',
        payment_approved_at: new Date().toISOString(),
      })
      .in('id', ids)
    setSelectedIds(new Set())
    await loadData()
    setApproving(false)
  }

  const handleExport = async () => {
    setExporting(true)
    const toExport = selectedIds.size > 0
      ? filteredRows.filter(r => selectedIds.has(r.id))
      : filteredRows.filter(r => r.payment_status === 'approved_for_payment')

    if (toExport.length === 0) {
      setExporting(false)
      return
    }

    const headers = [
      'Lot', 'Phase', 'SqFt', 'Rate/SqFt', 'Value ($)',
      'Worker Code', 'Worker Name', 'Completed', 'Approved', 'Notes',
    ]

    const csvRows = toExport.map(r => [
      r.lot_number,
      r.phase_name,
      r.sqft_total?.toLocaleString() || '',
      r.rate_per_sqft ? `$${r.rate_per_sqft.toFixed(2)}` : '',
      r.calculated_value ? `$${r.calculated_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '',
      r.worker_code || '',
      r.worker_name || '',
      r.completed_at ? new Date(r.completed_at).toLocaleDateString() : '',
      r.payment_approved_at ? new Date(r.payment_approved_at).toLocaleDateString() : '',
      r.payment_notes || '',
    ])

    const totalSqFt = toExport.reduce((s, r) => s + (r.sqft_total || 0), 0)
    const totalVal = toExport.reduce((s, r) => s + (r.calculated_value || 0), 0)

    const csvContent = [
      `Work Completion Sheet - ${siteName}`,
      `Exported: ${new Date().toLocaleDateString()}`,
      '',
      headers.join(','),
      ...csvRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
      '',
      `"Total SqFt","${totalSqFt.toLocaleString()}"`,
      `"Total Value","$${totalVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}"`,
      `"Phases","${toExport.length}"`,
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `payment-sheet-${siteName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)

    const exportIds = toExport.map(r => r.id)
    await supabase
      .from('egl_schedule_phases')
      .update({
        payment_status: 'exported',
        payment_exported_at: new Date().toISOString(),
      })
      .in('id', exportIds)

    await loadData()
    setExporting(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#007AFF]" />
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-xl border border-[#D2D2D7]">
        <AlertTriangle className="w-12 h-12 text-[#86868B] mx-auto mb-4" />
        <p className="text-lg font-semibold text-[#1D1D1F]">No payment data</p>
        <p className="text-sm text-[#86868B] mt-1">
          Create schedules with phases to see payment milestones.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats + Actions */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#86868B]">
          {dueCount} due | {approvedCount} approved | {exportedCount} exported
          {totalValue > 0 && ` | Total: $${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          {dueValue > 0 && ` | Pending: $${dueValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
        </p>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <button
              onClick={handleApprove}
              disabled={approving}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#34C759] text-white text-sm font-medium rounded-lg hover:bg-[#2DB84D] transition disabled:opacity-50"
            >
              {approving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckSquare className="w-4 h-4" />}
              Approve ({selectedIds.size})
            </button>
          )}
          <button
            onClick={handleExport}
            disabled={exporting || rows.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#007AFF] text-white text-sm font-medium rounded-lg hover:bg-[#0056B3] transition disabled:opacity-50"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {(['all', 'not_due', 'due', 'approved_for_payment', 'exported'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
              filter === f
                ? 'bg-[#007AFF] text-white'
                : 'bg-white text-[#1D1D1F] border border-[#D2D2D7] hover:bg-[#F5F5F7]'
            }`}
          >
            {f === 'all' ? 'All' : STATUS_LABELS[f]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#D2D2D7] overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="bg-[#F5F5F7] border-b border-[#D2D2D7]">
              <th className="w-10 px-3 py-3">
                <button onClick={toggleSelectAll}>
                  {filteredRows.filter(r => r.payment_status === 'due').length > 0 &&
                   filteredRows.filter(r => r.payment_status === 'due').every(r => selectedIds.has(r.id))
                    ? <CheckSquare className="w-4 h-4 text-[#007AFF]" />
                    : <Square className="w-4 h-4 text-[#86868B]" />
                  }
                </button>
              </th>
              <th className="text-left text-xs font-semibold text-[#86868B] uppercase px-3 py-3">Lot</th>
              <th className="text-left text-xs font-semibold text-[#86868B] uppercase px-3 py-3">Phase</th>
              <th className="text-right text-xs font-semibold text-[#86868B] uppercase px-3 py-3">SqFt</th>
              <th className="text-right text-xs font-semibold text-[#86868B] uppercase px-3 py-3">Rate</th>
              <th className="text-right text-xs font-semibold text-[#86868B] uppercase px-3 py-3">Value</th>
              <th className="text-left text-xs font-semibold text-[#86868B] uppercase px-3 py-3">Worker</th>
              <th className="text-left text-xs font-semibold text-[#86868B] uppercase px-3 py-3">Completed</th>
              <th className="text-center text-xs font-semibold text-[#86868B] uppercase px-3 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map(row => (
              <tr
                key={row.id}
                className={`border-b border-[#E5E5EA] hover:bg-[#F9F9FB] transition ${
                  selectedIds.has(row.id) ? 'bg-[#007AFF]/5' : ''
                }`}
              >
                <td className="px-3 py-2.5">
                  {row.payment_status === 'due' && (
                    <button onClick={() => toggleSelect(row.id)}>
                      {selectedIds.has(row.id)
                        ? <CheckSquare className="w-4 h-4 text-[#007AFF]" />
                        : <Square className="w-4 h-4 text-[#86868B]" />
                      }
                    </button>
                  )}
                </td>
                <td className="px-3 py-2.5 text-sm font-semibold text-[#1D1D1F]">{row.lot_number}</td>
                <td className="px-3 py-2.5 text-sm text-[#6E6E73]">{row.phase_name}</td>
                <td className="px-3 py-2.5 text-sm text-[#6E6E73] text-right tabular-nums">
                  {row.sqft_total?.toLocaleString() || '—'}
                </td>
                <td className="px-3 py-2.5 text-sm text-[#6E6E73] text-right tabular-nums">
                  {row.rate_per_sqft ? `$${row.rate_per_sqft.toFixed(2)}` : '—'}
                </td>
                <td className="px-3 py-2.5 text-sm font-medium text-[#1D1D1F] text-right tabular-nums">
                  {row.calculated_value
                    ? `$${row.calculated_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : '—'
                  }
                </td>
                <td className="px-3 py-2.5">
                  <div className="text-sm text-[#6E6E73]">{row.worker_name || '—'}</div>
                  {row.worker_code && (
                    <div className="text-xs text-[#86868B]">{row.worker_code}</div>
                  )}
                </td>
                <td className="px-3 py-2.5 text-sm text-[#6E6E73]">
                  {row.completed_at ? new Date(row.completed_at).toLocaleDateString() : '—'}
                </td>
                <td className="px-3 py-2.5 text-center">
                  <span
                    className="inline-block px-2.5 py-1 text-xs font-medium rounded-full"
                    style={{
                      color: STATUS_COLORS[row.payment_status],
                      backgroundColor: `${STATUS_COLORS[row.payment_status]}15`,
                    }}
                  >
                    {STATUS_LABELS[row.payment_status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-[#F5F5F7] border-t border-[#D2D2D7]">
              <td className="px-3 py-3" colSpan={3}>
                <span className="text-sm font-semibold text-[#1D1D1F]">{filteredRows.length} phases</span>
              </td>
              <td className="px-3 py-3 text-right text-sm font-semibold text-[#1D1D1F] tabular-nums">
                {filteredRows.reduce((s, r) => s + (r.sqft_total || 0), 0).toLocaleString()}
              </td>
              <td className="px-3 py-3" />
              <td className="px-3 py-3 text-right text-sm font-semibold text-[#1D1D1F] tabular-nums">
                ${filteredRows.reduce((s, r) => s + (r.calculated_value || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td className="px-3 py-3" colSpan={3} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
