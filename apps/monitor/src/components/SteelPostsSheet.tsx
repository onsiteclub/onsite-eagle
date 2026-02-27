'use client'

/**
 * Steel Posts Sheet — Material pipeline tracker.
 * Mirrors Avalon CONTROL "Steel Posts" tab exactly.
 * Columns: LOT | QTY | POST TYPE | LENGTH IN. | ORDERED | DELIVERED | INSTALLED | WELDED
 */

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Download, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface SteelPostsSheetProps {
  siteId: string
  siteName: string
}

interface SteelPostRow {
  id: string
  lot_number: string
  quantity: number
  post_type: string
  length_inches: number | null
  ordered_at: string | null
  delivered_at: string | null
  installed_at: string | null
  welded_at: string | null
}

const PIPELINE_STAGES = ['ordered', 'delivered', 'installed', 'welded'] as const
const STAGE_COLORS: Record<string, string> = {
  ordered: '#FF9500',
  delivered: '#007AFF',
  installed: '#34C759',
  welded: '#AF52DE',
}

export default function SteelPostsSheet({ siteId, siteName }: SteelPostsSheetProps) {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<SteelPostRow[]>([])

  const loadData = useCallback(async () => {
    setLoading(true)

    // Get all houses for this site
    const { data: houses } = await supabase
      .from('egl_houses')
      .select('id, lot_number')
      .eq('site_id', siteId)
      .order('lot_number')

    if (!houses?.length) {
      setRows([])
      setLoading(false)
      return
    }

    const houseMap = new Map(houses.map(h => [h.id, h.lot_number]))

    // Get material tracking records — filter by site_id directly (table has site_id column)
    const { data: materials } = await supabase
      .from('egl_material_tracking')
      .select('id, house_id, material_type, quantity, length_inches, ordered_at, delivered_at, installed_at, welded_at')
      .eq('site_id', siteId)
      .order('house_id')

    if (!materials?.length) {
      setRows([])
      setLoading(false)
      return
    }

    const steelRows: SteelPostRow[] = materials.map(m => ({
      id: m.id,
      lot_number: houseMap.get(m.house_id) || '',
      quantity: m.quantity || 0,
      post_type: m.material_type || '',
      length_inches: m.length_inches || null,
      ordered_at: m.ordered_at,
      delivered_at: m.delivered_at,
      installed_at: m.installed_at,
      welded_at: m.welded_at,
    }))

    setRows(steelRows)
    setLoading(false)
  }, [siteId])

  useEffect(() => { loadData() }, [loadData])

  // Stats
  const totalQty = rows.reduce((s, r) => s + r.quantity, 0)
  const orderedCount = rows.filter(r => r.ordered_at).length
  const deliveredCount = rows.filter(r => r.delivered_at).length
  const installedCount = rows.filter(r => r.installed_at).length
  const weldedCount = rows.filter(r => r.welded_at).length

  const fmtDate = (d: string | null) => {
    if (!d) return ''
    return new Date(d).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
  }

  const handleExport = () => {
    if (!rows.length) return
    const headers = ['LOT', 'QTY', 'POST TYPE', 'LENGTH IN.', 'ORDERED', 'DELIVERED', 'INSTALLED', 'WELDED']
    const csvRows = rows.map(r => [
      r.lot_number, r.quantity, r.post_type, r.length_inches || '',
      fmtDate(r.ordered_at), fmtDate(r.delivered_at), fmtDate(r.installed_at), fmtDate(r.welded_at),
    ])
    const csv = [
      `Steel Posts - ${siteName}`,
      `${rows.length} entries, ${totalQty} total posts`,
      '',
      headers.join(','),
      ...csvRows.map(r => r.map(c => `"${c}"`).join(',')),
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `steel-posts-${siteName.replace(/\s+/g, '-').toLowerCase()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#007AFF]" />
      </div>
    )
  }

  if (!rows.length) {
    return (
      <div className="text-center py-20 bg-white rounded-xl border border-[#D2D2D7]">
        <AlertTriangle className="w-12 h-12 text-[#86868B] mx-auto mb-4" />
        <p className="text-lg font-semibold text-[#1D1D1F]">No steel posts tracked</p>
        <p className="text-sm text-[#86868B] mt-1">Material tracking records will appear here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-sm font-semibold text-[#1D1D1F]">{rows.length} entries</span>
          <span className="text-xs text-[#86868B]">{totalQty} posts total</span>
          <span className="text-xs font-medium text-[#FF9500]">{orderedCount} ordered</span>
          <span className="text-xs font-medium text-[#007AFF]">{deliveredCount} delivered</span>
          <span className="text-xs font-medium text-[#34C759]">{installedCount} installed</span>
          <span className="text-xs font-medium text-[#AF52DE]">{weldedCount} welded</span>
        </div>
        <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 bg-[#007AFF] text-white text-sm font-medium rounded-lg hover:bg-[#0056B3] transition">
          <Download className="w-4 h-4" />Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#D2D2D7] overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-[#F5F5F7] border-b border-[#D2D2D7]">
              <th className="text-left text-xs font-semibold text-[#86868B] uppercase px-3 py-3 sticky left-0 bg-[#F5F5F7] z-10 min-w-[60px]">Lot</th>
              <th className="text-right text-xs font-semibold text-[#86868B] uppercase px-3 py-3 min-w-[50px]">Qty</th>
              <th className="text-left text-xs font-semibold text-[#86868B] uppercase px-3 py-3 min-w-[120px]">Post Type</th>
              <th className="text-right text-xs font-semibold text-[#86868B] uppercase px-3 py-3 min-w-[80px]">Length&quot;</th>
              {PIPELINE_STAGES.map(stage => (
                <th key={stage} className="text-center text-xs font-semibold uppercase px-3 py-3 min-w-[90px]" style={{ color: STAGE_COLORS[stage] }}>
                  {stage}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-b border-[#E5E5EA] hover:bg-[#F9F9FB]">
                <td className="px-3 py-2.5 text-sm font-mono font-semibold text-[#1D1D1F] sticky left-0 bg-white z-10">{r.lot_number}</td>
                <td className="px-3 py-2.5 text-sm text-right tabular-nums text-[#1D1D1F]">{r.quantity}</td>
                <td className="px-3 py-2.5 text-sm text-[#6E6E73]">{r.post_type || '—'}</td>
                <td className="px-3 py-2.5 text-sm text-right tabular-nums text-[#6E6E73]">{r.length_inches || '—'}</td>
                {PIPELINE_STAGES.map(stage => {
                  const dateKey = `${stage}_at` as keyof SteelPostRow
                  const dateVal = r[dateKey] as string | null
                  return (
                    <td key={stage} className="px-3 py-2.5 text-center">
                      {dateVal ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <CheckCircle2 className="w-4 h-4" style={{ color: STAGE_COLORS[stage] }} />
                          <span className="text-[10px] tabular-nums text-[#86868B]">{fmtDate(dateVal)}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-[#E5E5EA]">-</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-[#F5F5F7] border-t border-[#D2D2D7]">
              <td className="px-3 py-3 text-sm font-semibold text-[#1D1D1F] sticky left-0 bg-[#F5F5F7] z-10">{rows.length}</td>
              <td className="px-3 py-3 text-sm text-right font-bold tabular-nums text-[#1D1D1F]">{totalQty}</td>
              <td colSpan={2} className="px-3 py-3" />
              {PIPELINE_STAGES.map(stage => {
                const counts = { ordered: orderedCount, delivered: deliveredCount, installed: installedCount, welded: weldedCount }
                return (
                  <td key={stage} className="px-3 py-3 text-center text-sm font-bold tabular-nums" style={{ color: STAGE_COLORS[stage] }}>
                    {counts[stage]}
                  </td>
                )
              })}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
