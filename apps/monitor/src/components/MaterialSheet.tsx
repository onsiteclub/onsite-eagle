'use client'

/**
 * Material Sheet — Material lifecycle tracking.
 * Based on the "Steel Posts" tab of the Avalon CONTROL.xlsx
 */

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Download, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface MaterialSheetProps {
  siteId: string
  siteName: string
}

interface MaterialRow {
  id: string
  lot_number: string
  material_type: string
  material_subtype: string | null
  quantity: number
  unit: string
  status: string
  ordered_at: string | null
  delivered_at: string | null
  installed_at: string | null
  welded_at: string | null
  verified_at: string | null
}

const STATUS_PIPELINE = ['needed', 'ordered', 'delivered', 'installed', 'welded', 'verified'] as const
const STATUS_COLORS: Record<string, string> = {
  needed: '#8E8E93',
  ordered: '#FF9500',
  delivered: '#007AFF',
  installed: '#34C759',
  welded: '#AF52DE',
  verified: '#30D158',
}

export default function MaterialSheet({ siteId, siteName }: MaterialSheetProps) {
  const [loading, setLoading] = useState(true)
  const [materials, setMaterials] = useState<MaterialRow[]>([])

  const loadData = useCallback(async () => {
    setLoading(true)

    const { data: items } = await supabase
      .from('egl_material_tracking')
      .select('id, house_id, material_type, material_subtype, quantity, unit, status, ordered_at, delivered_at, installed_at, welded_at, verified_at')
      .eq('site_id', siteId)
      .order('created_at', { ascending: false })

    if (!items?.length) {
      setMaterials([])
      setLoading(false)
      return
    }

    const houseIds = [...new Set(items.map(i => i.house_id))]
    const { data: houses } = await supabase
      .from('egl_houses')
      .select('id, lot_number')
      .in('id', houseIds)

    const houseMap = new Map((houses || []).map(h => [h.id, h.lot_number]))

    setMaterials(items.map(i => ({
      ...i,
      lot_number: houseMap.get(i.house_id) || '?',
    })))
    setLoading(false)
  }, [siteId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleExport = () => {
    if (materials.length === 0) return
    const headers = ['Lot', 'Material', 'Subtype', 'Qty', 'Unit', 'Status', 'Ordered', 'Delivered', 'Installed', 'Welded', 'Verified']
    const csvRows = materials.map(m => [
      m.lot_number, m.material_type, m.material_subtype || '',
      m.quantity, m.unit, m.status,
      m.ordered_at ? new Date(m.ordered_at).toLocaleDateString() : '',
      m.delivered_at ? new Date(m.delivered_at).toLocaleDateString() : '',
      m.installed_at ? new Date(m.installed_at).toLocaleDateString() : '',
      m.welded_at ? new Date(m.welded_at).toLocaleDateString() : '',
      m.verified_at ? new Date(m.verified_at).toLocaleDateString() : '',
    ])

    const csv = [
      `Material Sheet - ${siteName}`,
      `Exported: ${new Date().toLocaleDateString()}`,
      '',
      headers.join(','),
      ...csvRows.map(r => r.map(c => `"${c}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `material-sheet-${siteName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }) : ''

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#007AFF]" />
      </div>
    )
  }

  if (materials.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-xl border border-[#D2D2D7]">
        <AlertTriangle className="w-12 h-12 text-[#86868B] mx-auto mb-4" />
        <p className="text-lg font-semibold text-[#1D1D1F]">No materials tracked</p>
        <p className="text-sm text-[#86868B] mt-1">
          Add material tracking items to see the pipeline here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#86868B]">
          {materials.length} items |{' '}
          {STATUS_PIPELINE.map(s => `${materials.filter(m => m.status === s).length} ${s}`).join(' | ')}
        </p>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#007AFF] text-white text-sm font-medium rounded-lg hover:bg-[#0056B3] transition"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      <div className="bg-white rounded-xl border border-[#D2D2D7] overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="bg-[#F5F5F7] border-b border-[#D2D2D7]">
              <th className="text-left text-xs font-semibold text-[#86868B] uppercase px-3 py-3">Lot</th>
              <th className="text-left text-xs font-semibold text-[#86868B] uppercase px-3 py-3">Material</th>
              <th className="text-right text-xs font-semibold text-[#86868B] uppercase px-3 py-3">Qty</th>
              <th className="text-center text-xs font-semibold text-[#86868B] uppercase px-3 py-3">Status</th>
              <th className="text-center text-xs font-semibold text-[#86868B] uppercase px-2 py-3">Ordered</th>
              <th className="text-center text-xs font-semibold text-[#86868B] uppercase px-2 py-3">Delivered</th>
              <th className="text-center text-xs font-semibold text-[#86868B] uppercase px-2 py-3">Installed</th>
              <th className="text-center text-xs font-semibold text-[#86868B] uppercase px-2 py-3">Welded</th>
              <th className="text-center text-xs font-semibold text-[#86868B] uppercase px-2 py-3">Verified</th>
            </tr>
          </thead>
          <tbody>
            {materials.map(m => (
              <tr key={m.id} className="border-b border-[#E5E5EA] hover:bg-[#F9F9FB]">
                <td className="px-3 py-2.5 text-sm font-semibold text-[#1D1D1F]">{m.lot_number}</td>
                <td className="px-3 py-2.5">
                  <div className="text-sm text-[#6E6E73]">{m.material_type}</div>
                  {m.material_subtype && (
                    <div className="text-xs text-[#86868B]">{m.material_subtype}</div>
                  )}
                </td>
                <td className="px-3 py-2.5 text-sm text-[#6E6E73] text-right tabular-nums">
                  {m.quantity} {m.unit}
                </td>
                <td className="px-3 py-2.5 text-center">
                  <span
                    className="inline-block px-2.5 py-1 text-xs font-medium rounded-full"
                    style={{
                      color: STATUS_COLORS[m.status] || '#86868B',
                      backgroundColor: `${STATUS_COLORS[m.status] || '#86868B'}15`,
                    }}
                  >
                    {m.status}
                  </span>
                </td>
                <td className="px-2 py-2.5 text-xs text-[#86868B] text-center">{formatDate(m.ordered_at)}</td>
                <td className="px-2 py-2.5 text-xs text-[#86868B] text-center">{formatDate(m.delivered_at)}</td>
                <td className="px-2 py-2.5 text-xs text-[#86868B] text-center">{formatDate(m.installed_at)}</td>
                <td className="px-2 py-2.5 text-xs text-[#86868B] text-center">{formatDate(m.welded_at)}</td>
                <td className="px-2 py-2.5 text-xs text-[#86868B] text-center">{formatDate(m.verified_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
