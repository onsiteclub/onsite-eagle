'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@onsite/supabase/client'
import type { FrmJobsite, FrmLot } from '@onsite/framing'
import { LOT_STATUS_CONFIG } from '@onsite/framing'

interface Props {
  jobsites: FrmJobsite[]
}

export default function LotSearchClient({ jobsites }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [selectedJobsite, setSelectedJobsite] = useState(jobsites[0]?.id ?? '')
  const [lots, setLots] = useState<FrmLot[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!selectedJobsite) return
    setLoading(true)
    supabase
      .from('frm_lots')
      .select('*')
      .eq('jobsite_id', selectedJobsite)
      .order('lot_number', { ascending: true })
      .then(({ data }) => {
        setLots((data as FrmLot[]) ?? [])
        setLoading(false)
      })
  }, [selectedJobsite, supabase])

  const filtered = lots.filter(lot =>
    lot.lot_number.toLowerCase().includes(search.toLowerCase()) ||
    (lot.address ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-[#101828]">Select Lot</h1>
        <p className="text-sm text-[#667085] mt-1">Choose a lot to start a gate check</p>
      </div>

      {/* Jobsite Selector */}
      {jobsites.length > 1 && (
        <select
          value={selectedJobsite}
          onChange={(e) => setSelectedJobsite(e.target.value)}
          className="w-full h-11 px-3 rounded-[10px] border border-[#E5E7EB] bg-white text-[#101828] text-sm"
        >
          {jobsites.map(js => (
            <option key={js.id} value={js.id}>{js.name} — {js.city}</option>
          ))}
        </select>
      )}

      {/* Search */}
      <input
        type="text"
        placeholder="Search by lot number or address..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full h-11 px-3 rounded-[10px] border border-[#E5E7EB] bg-white text-[#101828] text-sm placeholder:text-[#9CA3AF]"
      />

      {/* Results */}
      {loading ? (
        <div className="py-8 text-center text-[#667085] text-sm">Loading lots...</div>
      ) : filtered.length === 0 ? (
        <div className="py-8 text-center text-[#667085] text-sm">No lots found</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(lot => {
            const statusCfg = LOT_STATUS_CONFIG[lot.status]
            return (
              <button
                key={lot.id}
                onClick={() => router.push(`/app/lot/${lot.id}`)}
                className="w-full text-left bg-white rounded-[14px] border border-[#E5E7EB] p-4 hover:border-brand-500 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-[#101828]">Lot {lot.lot_number}</span>
                    {lot.address && (
                      <span className="text-xs text-[#667085] ml-2">{lot.address}</span>
                    )}
                  </div>
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: statusCfg.color + '20', color: statusCfg.color }}
                  >
                    {statusCfg.label}
                  </span>
                </div>
                {lot.current_phase && (
                  <p className="text-xs text-[#667085] mt-1">
                    Phase: {lot.current_phase.replace(/_/g, ' ')}
                  </p>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
