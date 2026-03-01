'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users, Plus, Phone, Mail, Shield, ChevronDown, ChevronUp,
  Trash2, Edit, User, Briefcase,
} from 'lucide-react'
import { createClient } from '@onsite/supabase/client'
import { deactivateCrew, removeWorkerFromCrew } from '@onsite/framing'
import type { FrmCrew, FrmCrewWorker } from '@onsite/framing'
import CrewForm from './CrewForm'

type CrewWithWorkers = FrmCrew & {
  workers: Array<FrmCrewWorker & {
    profile: { id: string; full_name: string | null; phone: string | null } | null
  }>
}

interface CrewsListProps {
  initialCrews: CrewWithWorkers[]
}

const SPECIALTY_COLORS: Record<string, string> = {
  framing: 'bg-blue-50 text-blue-700',
  roofing: 'bg-orange-50 text-orange-700',
  siding: 'bg-green-50 text-green-700',
  backing: 'bg-purple-50 text-purple-700',
  strapping: 'bg-yellow-50 text-yellow-700',
  basement: 'bg-indigo-50 text-indigo-700',
  capping: 'bg-cyan-50 text-cyan-700',
}

function getSpecialtyColor(specialty: string): string {
  return SPECIALTY_COLORS[specialty.toLowerCase()] ?? 'bg-gray-50 text-gray-700'
}

function wsibStatus(expiresStr: string | null): { label: string; color: string } {
  if (!expiresStr) return { label: 'No WSIB', color: 'text-gray-400' }
  const expires = new Date(expiresStr)
  const now = new Date()
  const daysUntil = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (daysUntil < 0) return { label: 'Expired', color: 'text-red-600' }
  if (daysUntil < 30) return { label: `Expires in ${daysUntil}d`, color: 'text-amber-600' }
  return { label: 'Valid', color: 'text-green-600' }
}

export default function CrewsList({ initialCrews }: CrewsListProps) {
  const router = useRouter()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingCrew, setEditingCrew] = useState<CrewWithWorkers | null>(null)
  const [removingWorker, setRemovingWorker] = useState<string | null>(null)

  const crews = initialCrews

  async function handleDeactivate(crewId: string) {
    if (!confirm('Deactivate this crew? Workers will be unlinked.')) return
    const supabase = createClient()
    await deactivateCrew(supabase, crewId)
    router.refresh()
  }

  async function handleRemoveWorker(workerId: string) {
    if (!confirm('Remove this worker from the crew?')) return
    setRemovingWorker(workerId)
    try {
      const supabase = createClient()
      await removeWorkerFromCrew(supabase, workerId)
      router.refresh()
    } finally {
      setRemovingWorker(null)
    }
  }

  function handleEdit(crew: CrewWithWorkers) {
    setEditingCrew(crew)
    setShowForm(true)
  }

  function handleFormClose() {
    setShowForm(false)
    setEditingCrew(null)
  }

  function handleFormSaved() {
    setShowForm(false)
    setEditingCrew(null)
    router.refresh()
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#101828]">Crews</h1>
          <p className="text-[#667085] mt-1">Manage framing crews and their workers</p>
        </div>
        <button
          onClick={() => { setEditingCrew(null); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-[#0F766E] text-white rounded-lg hover:bg-[#0D6B63] transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          New Crew
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <CrewForm
          crew={editingCrew}
          onClose={handleFormClose}
          onSaved={handleFormSaved}
        />
      )}

      {/* Crews List */}
      {crews.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-[#101828] mb-1">No crews yet</h3>
            <p className="text-[#667085] text-sm mb-4">Create your first crew to start assigning workers to phases.</p>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-[#0F766E] text-white rounded-lg hover:bg-[#0D6B63] transition-colors text-sm font-medium"
            >
              Create Crew
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {crews.map(crew => {
            const isExpanded = expandedId === crew.id
            const activeWorkers = crew.workers.filter(w => !w.left_at)
            const wsib = wsibStatus(crew.wsib_expires)

            return (
              <div key={crew.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                {/* Crew Header */}
                <div
                  className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : crew.id)}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[#0F766E]/10 flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5 text-[#0F766E]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-[#101828] truncate">{crew.name}</h3>
                        <span className="text-xs text-[#667085] shrink-0">
                          {activeWorkers.length} worker{activeWorkers.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {crew.specialty.map(s => (
                          <span
                            key={s}
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${getSpecialtyColor(s)}`}
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    {crew.phone && (
                      <span className="hidden sm:flex items-center gap-1 text-xs text-[#667085]">
                        <Phone className="w-3.5 h-3.5" />
                        {crew.phone}
                      </span>
                    )}
                    <span className={`flex items-center gap-1 text-xs font-medium ${wsib.color}`}>
                      <Shield className="w-3.5 h-3.5" />
                      {wsib.label}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(crew) }}
                        className="p-1.5 rounded-md hover:bg-gray-100 text-[#667085] hover:text-[#101828] transition-colors"
                        title="Edit crew"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeactivate(crew.id) }}
                        className="p-1.5 rounded-md hover:bg-red-50 text-[#667085] hover:text-red-600 transition-colors"
                        title="Deactivate crew"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-[#667085]" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-[#667085]" />
                    )}
                  </div>
                </div>

                {/* Expanded Workers */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-5 pb-4">
                    {/* Crew contact details */}
                    <div className="flex items-center gap-4 py-3 text-xs text-[#667085] border-b border-gray-50">
                      {crew.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" />
                          {crew.phone}
                        </span>
                      )}
                      {crew.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5" />
                          {crew.email}
                        </span>
                      )}
                      {crew.wsib_number && (
                        <span className="flex items-center gap-1">
                          <Shield className="w-3.5 h-3.5" />
                          WSIB: {crew.wsib_number}
                        </span>
                      )}
                    </div>

                    {/* Workers list */}
                    {activeWorkers.length === 0 ? (
                      <p className="text-sm text-[#667085] py-4 text-center">No workers in this crew.</p>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {activeWorkers.map(worker => (
                          <div key={worker.id} className="flex items-center justify-between py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                <User className="w-4 h-4 text-gray-400" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-[#101828]">
                                  {worker.profile?.full_name ?? 'Unknown Worker'}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs text-[#667085] capitalize">{worker.role}</span>
                                  <span className="text-xs text-gray-300">|</span>
                                  <span className="flex items-center gap-1 text-xs text-[#667085]">
                                    <Briefcase className="w-3 h-3" />
                                    {worker.employment_type}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemoveWorker(worker.id)}
                              disabled={removingWorker === worker.id}
                              className="text-xs text-[#667085] hover:text-red-600 transition-colors disabled:opacity-50"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
