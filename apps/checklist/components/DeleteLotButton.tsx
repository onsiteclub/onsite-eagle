'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@onsite/supabase/client'
import { deleteLot } from '@onsite/framing'

interface Props {
  lotId: string
  lotNumber: string
}

export default function DeleteLotButton({ lotId, lotNumber }: Props) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      const supabase = createClient()
      await deleteLot(supabase, lotId)
      router.push('/app')
    } catch (err) {
      console.error('Delete failed:', err)
      alert('Failed to delete lot')
      setDeleting(false)
      setConfirming(false)
    }
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="w-full h-10 rounded-[14px] text-xs font-semibold text-[#DC2626] border border-dashed border-[#DC2626]/30 hover:bg-[rgba(220,38,38,0.06)] transition-colors"
      >
        Delete Lot
      </button>
    )
  }

  return (
    <div className="bg-[rgba(220,38,38,0.06)] border border-[#DC2626]/30 rounded-[14px] p-4">
      <p className="text-[13px] text-[#1A1A1A] mb-3">
        Delete <span className="font-bold">Lot {lotNumber}</span> and all its gate checks?
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => setConfirming(false)}
          className="flex-1 h-10 rounded-[14px] text-xs font-semibold border border-[#D1D0CE] text-[#888884] bg-white"
        >
          Cancel
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex-1 h-10 rounded-[14px] text-xs font-semibold bg-[#DC2626] text-white hover:bg-[#B91C1C] transition-colors disabled:opacity-50"
        >
          {deleting ? 'Deleting...' : 'Confirm Delete'}
        </button>
      </div>
    </div>
  )
}
