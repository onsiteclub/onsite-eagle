'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TRANSITION_LABELS, type ChecklistTransition } from '@/lib/templates'

const TRANSITIONS: { value: ChecklistTransition; label: string }[] = [
  { value: 'framing_to_roofing', label: 'Framing Check-List' },
  { value: 'roofing_to_trades', label: 'Trusses Check-List' },
  { value: 'backframe_to_final', label: 'Backing Check-List' },
]

export default function SelfServiceLanding() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [jobsite, setJobsite] = useState('')
  const [lotNumber, setLotNumber] = useState('')
  const [transition, setTransition] = useState<ChecklistTransition>('framing_to_roofing')
  const [error, setError] = useState('')

  function handleStart() {
    if (!name.trim() || !jobsite.trim() || !lotNumber.trim()) {
      setError('Please fill in all required fields.')
      return
    }

    // Store info in sessionStorage for the checklist page
    sessionStorage.setItem('selfCheck', JSON.stringify({
      name: name.trim(),
      company: company.trim(),
      jobsite: jobsite.trim(),
      lotNumber: lotNumber.trim(),
      transition,
      startedAt: new Date().toISOString(),
    }))

    router.push(`/self/check/${transition}`)
  }

  return (
    <div className="min-h-screen bg-[#F6F7F9] flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-[480px]">
        {/* Header */}
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/onsite-club-logo.png"
            alt="OnSite Club"
            className="h-14 mx-auto mb-4"
          />
          <h1 className="text-xl font-bold text-[#101828]">Self Check-List</h1>
          <p className="text-sm text-[#667085] mt-1">
            Fill out a gate check for any house — no account needed.
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-[14px] border border-[#E5E7EB] p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-[#101828] mb-1">
              Your Name <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Smith"
              className="w-full h-11 px-3 rounded-[10px] border border-[#E5E7EB] text-[#101828] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0F766E] text-base"
            />
          </div>

          {/* Company */}
          <div>
            <label className="block text-sm font-medium text-[#101828] mb-1">
              Company <span className="text-[#9CA3AF] text-xs">(optional)</span>
            </label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="ABC Framing Ltd."
              className="w-full h-11 px-3 rounded-[10px] border border-[#E5E7EB] text-[#101828] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0F766E] text-base"
            />
          </div>

          {/* Jobsite */}
          <div>
            <label className="block text-sm font-medium text-[#101828] mb-1">
              Jobsite / Address <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="text"
              value={jobsite}
              onChange={(e) => setJobsite(e.target.value)}
              placeholder="Maple Ridge Phase 2"
              className="w-full h-11 px-3 rounded-[10px] border border-[#E5E7EB] text-[#101828] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0F766E] text-base"
            />
          </div>

          {/* Lot Number */}
          <div>
            <label className="block text-sm font-medium text-[#101828] mb-1">
              Lot Number <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="text"
              value={lotNumber}
              onChange={(e) => setLotNumber(e.target.value)}
              placeholder="Lot 23"
              className="w-full h-11 px-3 rounded-[10px] border border-[#E5E7EB] text-[#101828] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0F766E] text-base"
            />
          </div>

          {/* Checklist Type */}
          <div>
            <label className="block text-sm font-medium text-[#101828] mb-1">
              Checklist Type <span className="text-[#DC2626]">*</span>
            </label>
            <select
              value={transition}
              onChange={(e) => setTransition(e.target.value as ChecklistTransition)}
              className="w-full h-11 px-3 rounded-[10px] border border-[#E5E7EB] text-[#101828] bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E] text-base"
            >
              {TRANSITIONS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-[#DC2626]">{error}</p>
          )}

          {/* Start Button */}
          <button
            onClick={handleStart}
            className="w-full h-12 bg-[#0F766E] text-white font-semibold rounded-[10px] hover:bg-[#0d6b63] transition-colors text-base"
          >
            Start Checklist
          </button>
        </div>

        <p className="text-center text-xs text-[#9CA3AF] mt-6">
          OnSite Club — Built for the trades
        </p>
      </div>
    </div>
  )
}
