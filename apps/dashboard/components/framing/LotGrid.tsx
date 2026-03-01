'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Home } from 'lucide-react'
import { LotForm } from './LotForm'

interface LotSummary {
  id: string
  lot_number: string
  status: string
  current_phase: string | null
}

interface LotGridProps {
  jobsiteId: string
  initialLots: LotSummary[]
  statusBadgeColor: (status: string) => string
}

export function LotGrid({ jobsiteId, initialLots, statusBadgeColor }: LotGridProps) {
  const [showForm, setShowForm] = useState(false)
  const router = useRouter()

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-[#101828]">Lots ({initialLots.length})</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-3 py-2 bg-[#0F766E] text-white text-sm font-medium rounded-lg hover:bg-[#0d6d66] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Lots
        </button>
      </div>

      {showForm && (
        <LotForm
          jobsiteId={jobsiteId}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false)
            router.refresh()
          }}
        />
      )}

      {initialLots.length === 0 ? (
        <div className="text-center py-8">
          <Home className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-[#667085] text-sm">No lots yet. Add lots to this jobsite.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {initialLots.map(lot => (
            <div
              key={lot.id}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:border-teal-300 hover:shadow-sm transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-[#101828]">Lot {lot.lot_number}</span>
              </div>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusBadgeColor(lot.status)}`}>
                {lot.status.replace(/_/g, ' ')}
              </span>
              {lot.current_phase && (
                <p className="text-[10px] text-[#667085] mt-1.5 capitalize">
                  {lot.current_phase.replace(/_/g, ' ')}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
