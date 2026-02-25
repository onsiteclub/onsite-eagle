'use client'

/**
 * PaymentsTab — Work Completion Milestones tracker.
 *
 * Tracks phase completion → payment due → exported in spreadsheet.
 * The system NEVER stores monetary values — only tracks milestones.
 * Foreman fills in dollar amounts manually in the exported Excel.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Loader2, Download, CheckSquare, Square,
  Filter, ChevronDown, FileSpreadsheet, AlertTriangle,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface PaymentsTabProps {
  siteId: string
  siteName: string
}

type PaymentStatus = 'not_due' | 'due' | 'approved_for_payment' | 'exported'

interface PaymentRow {
  id: string
  schedule_phase_id: string
  lot_number: string
  house_id: string
  phase_name: string
  phase_order: number
  sqft_total: number | null
  worker_code: string | null
  worker_name: string | null
  completed_at: string | null
  payment_status: PaymentStatus
  payment_approved_at: string | null
  payment_exported_at: string | null
  payment_notes: string | null
  selected: boolean
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

export default function PaymentsTab({ siteId, siteName }: PaymentsTabProps) {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<PaymentRow[]>([])
  const [filter, setFilter] = useState<'all' | PaymentStatus>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [approving, setApproving] = useState(false)
  const [exporting, setExporting] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)

    // Fetch schedules for this site
    const { data: schedules } = await supabase
      .from('egl_schedules')
      .select('id, house_id, assigned_worker_name')
      .eq('site_id', siteId)

    if (!schedules?.length) {
      setRows([])
      setLoading(false)
      return
    }

    const scheduleIds = schedules.map((s: { id: string }) => s.id)
    const houseIds = schedules.map((s: { house_id: string }) => s.house_id)

    // Fetch houses
    const { data: houses } = await supabase
      .from('egl_houses')
      .select('id, lot_number, sqft_total')
      .in('id', houseIds)

    const houseMap = new Map(
      (houses || []).map((h: { id: string; lot_number: string; sqft_total: number | null }) => [h.id, h])
    )

    const scheduleMap = new Map(
      schedules.map((s: { id: string; house_id: string; assigned_worker_name: string | null }) => [s.id, s])
    )

    // Fetch schedule phases
    const { data: phases } = await supabase
      .from('egl_schedule_phases')
      .select(`
        id, schedule_id, phase_id, status,
        actual_end_date,
        payment_status, payment_approved_at,
        payment_exported_at, payment_notes
      `)
      .in('schedule_id', scheduleIds)

    // Fetch phase names
    const { data: phaseRefs } = await supabase
      .from('ref_eagle_phases')
      .select('id, name, order_index')
      .order('order_index', { ascending: true })

    const phaseNameMap = new Map(
      (phaseRefs || []).map((p: { id: string; name: string; order_index: number }) => [p.id, p])
    )

    // Fetch worker profiles for worker codes
    const workerNames = schedules
      .map((s: { assigned_worker_name: string | null }) => s.assigned_worker_name)
      .filter(Boolean) as string[]

    let workerCodeMap = new Map<string, string>()
    if (workerNames.length > 0) {
      const { data: workers } = await supabase
        .from('core_profiles')
        .select('full_name, worker_code')
        .in('full_name', workerNames)

      if (workers) {
        workerCodeMap = new Map(
          workers.map((w: { full_name: string; worker_code: string }) => [w.full_name, w.worker_code])
        )
      }
    }

    const result: PaymentRow[] = (phases || [])
      .map((p: {
        id: string; schedule_id: string; phase_id: string; status: string;
        actual_end_date: string | null;
        payment_status: string | null; payment_approved_at: string | null;
        payment_exported_at: string | null; payment_notes: string | null;
      }) => {
        const schedule = scheduleMap.get(p.schedule_id) as { house_id: string; assigned_worker_name: string | null } | undefined
        const house = schedule ? houseMap.get(schedule.house_id) as { lot_number: string; sqft_total: number | null } | undefined : undefined
        const phaseRef = phaseNameMap.get(p.phase_id) as { name: string; order_index: number } | undefined
        const workerName = schedule?.assigned_worker_name || null

        // Determine payment status
        let paymentStatus: PaymentStatus = (p.payment_status as PaymentStatus) || 'not_due'
        // Auto-mark as 'due' if phase is completed but payment_status is still not_due
        if (p.status === 'completed' && paymentStatus === 'not_due') {
          paymentStatus = 'due'
        }

        return {
          id: p.id,
          schedule_phase_id: p.id,
          lot_number: house?.lot_number || '?',
          house_id: schedule?.house_id || '',
          phase_name: phaseRef?.name || 'Unknown Phase',
          phase_order: phaseRef?.order_index || 0,
          sqft_total: house?.sqft_total || null,
          worker_code: workerName ? workerCodeMap.get(workerName) || null : null,
          worker_name: workerName,
          completed_at: p.actual_end_date,
          payment_status: paymentStatus,
          payment_approved_at: p.payment_approved_at,
          payment_exported_at: p.payment_exported_at,
          payment_notes: p.payment_notes,
          selected: false,
        }
      })
      .sort((a: PaymentRow, b: PaymentRow) => {
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
  const totalSqFtDue = rows
    .filter(r => r.payment_status === 'due' || r.payment_status === 'approved_for_payment')
    .reduce((sum, r) => sum + (r.sqft_total || 0), 0)

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
    if (dueRows.every(r => selectedIds.has(r.id))) {
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

    // Get rows to export (approved ones by default, or filtered view)
    const toExport = filteredRows.filter(
      r => r.payment_status === 'approved_for_payment' || selectedIds.has(r.id),
    )

    if (toExport.length === 0) {
      setExporting(false)
      return
    }

    // Generate CSV
    const headers = [
      'Lot', 'Phase', 'SqFt', 'Worker Code', 'Worker Name',
      'Completed', 'Approved', 'Value ($)', 'Notes',
    ]

    const csvRows = toExport.map(r => [
      r.lot_number,
      r.phase_name,
      r.sqft_total?.toLocaleString() || '',
      r.worker_code || '',
      r.worker_name || '',
      r.completed_at ? new Date(r.completed_at).toLocaleDateString() : '',
      r.payment_approved_at ? new Date(r.payment_approved_at).toLocaleDateString() : '',
      '', // Value - empty for foreman to fill
      r.payment_notes || '',
    ])

    const csvContent = [
      `Work Completion Sheet - ${siteName}`,
      `Exported: ${new Date().toLocaleDateString()}`,
      '',
      headers.join(','),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(',')),
      '',
      `Total SqFt: ${toExport.reduce((s, r) => s + (r.sqft_total || 0), 0).toLocaleString()}`,
      `Phases: ${toExport.length}`,
    ].join('\n')

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `work-completion-${siteName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)

    // Mark as exported
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
      <div className="text-center py-20">
        <AlertTriangle className="w-12 h-12 text-[#8E8E93] mx-auto mb-4" />
        <p className="text-lg font-semibold text-[#1D1D1F]">No payment milestones found</p>
        <p className="text-sm text-[#8E8E93] mt-1">
          Schedules with completed phases will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#1D1D1F]">Payment Milestones</h2>
          <p className="text-sm text-[#8E8E93]">
            {dueCount} due | {approvedCount} approved | {exportedCount} exported | {totalSqFtDue.toLocaleString()} sqft pending
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <button
              onClick={handleApprove}
              disabled={approving}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#34C759] text-white text-sm font-medium rounded-lg hover:bg-[#2DA44E] transition disabled:opacity-50"
            >
              {approving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckSquare className="w-4 h-4" />}
              Approve ({selectedIds.size})
            </button>
          )}
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#007AFF] text-white text-sm font-medium rounded-lg hover:bg-[#0056B3] transition disabled:opacity-50"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
            Export Sheet
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
                : 'bg-white text-[#3C3C43] border border-[#D2D2D7] hover:bg-[#F2F2F7]'
            }`}
          >
            {f === 'all' ? 'All' : STATUS_LABELS[f]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#D2D2D7] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[#F9F9FB] border-b border-[#D2D2D7]">
              <th className="w-10 px-3 py-3">
                <button onClick={toggleSelectAll}>
                  {filteredRows.filter(r => r.payment_status === 'due').every(r => selectedIds.has(r.id)) && dueCount > 0
                    ? <CheckSquare className="w-4 h-4 text-[#007AFF]" />
                    : <Square className="w-4 h-4 text-[#8E8E93]" />
                  }
                </button>
              </th>
              <th className="text-left text-xs font-semibold text-[#8E8E93] uppercase px-3 py-3">Lot</th>
              <th className="text-left text-xs font-semibold text-[#8E8E93] uppercase px-3 py-3">Phase</th>
              <th className="text-right text-xs font-semibold text-[#8E8E93] uppercase px-3 py-3">SqFt</th>
              <th className="text-left text-xs font-semibold text-[#8E8E93] uppercase px-3 py-3">Worker</th>
              <th className="text-left text-xs font-semibold text-[#8E8E93] uppercase px-3 py-3">Completed</th>
              <th className="text-center text-xs font-semibold text-[#8E8E93] uppercase px-3 py-3">Status</th>
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
                <td className="px-3 py-3">
                  {row.payment_status === 'due' && (
                    <button onClick={() => toggleSelect(row.id)}>
                      {selectedIds.has(row.id)
                        ? <CheckSquare className="w-4 h-4 text-[#007AFF]" />
                        : <Square className="w-4 h-4 text-[#8E8E93]" />
                      }
                    </button>
                  )}
                </td>
                <td className="px-3 py-3 text-sm font-semibold text-[#1D1D1F]">
                  {row.lot_number}
                </td>
                <td className="px-3 py-3 text-sm text-[#3C3C43]">{row.phase_name}</td>
                <td className="px-3 py-3 text-sm text-[#3C3C43] text-right tabular-nums">
                  {row.sqft_total?.toLocaleString() || '—'}
                </td>
                <td className="px-3 py-3">
                  <div className="text-sm text-[#3C3C43]">{row.worker_name || '—'}</div>
                  {row.worker_code && (
                    <div className="text-xs text-[#8E8E93]">{row.worker_code}</div>
                  )}
                </td>
                <td className="px-3 py-3 text-sm text-[#3C3C43]">
                  {row.completed_at ? new Date(row.completed_at).toLocaleDateString() : '—'}
                </td>
                <td className="px-3 py-3 text-center">
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
        </table>
      </div>
    </div>
  )
}
