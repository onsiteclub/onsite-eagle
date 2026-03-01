'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Grid3X3, ChevronDown, Plus, X, Trash2, RefreshCw, MapPin,
} from 'lucide-react'
import { createClient } from '@onsite/supabase/client'
import {
  listLots,
  listAssignmentsByJobsite,
  createAssignment,
  deleteAssignment,
  reassignCrew,
} from '@onsite/framing'
import type {
  FrmJobsite,
  FrmLot,
  FrmCrew,
  FrmCrewWorker,
  FrmPhase,
  FrmPhaseAssignment,
  PhaseId,
} from '@onsite/framing'

// Short labels for phase column headers
const PHASE_SHORT: Record<PhaseId, string> = {
  capping: 'Cap',
  floor_1: 'F1',
  walls_1: 'W1',
  floor_2: 'F2',
  walls_2: 'W2',
  roof: 'Roof',
  backframe_basement: 'BB',
  backframe_strapping: 'BS',
  backframe_backing: 'BA',
}

// Deterministic color for crew badges
const CREW_COLORS = [
  'bg-blue-100 text-blue-800',
  'bg-green-100 text-green-800',
  'bg-purple-100 text-purple-800',
  'bg-orange-100 text-orange-800',
  'bg-cyan-100 text-cyan-800',
  'bg-pink-100 text-pink-800',
  'bg-yellow-100 text-yellow-800',
  'bg-indigo-100 text-indigo-800',
  'bg-rose-100 text-rose-800',
  'bg-teal-100 text-teal-800',
]

function crewColor(crewId: string, allCrewIds: string[]): string {
  const idx = allCrewIds.indexOf(crewId)
  return CREW_COLORS[idx % CREW_COLORS.length]
}

type AssignmentWithJoins = FrmPhaseAssignment & {
  lot: { id: string; lot_number: string; jobsite_id: string; status: string }
  crew: { id: string; name: string } | null
}

type CrewWithWorkers = FrmCrew & {
  workers: Array<FrmCrewWorker & {
    profile: { id: string; full_name: string | null; phone: string | null } | null
  }>
}

interface AssignmentMatrixProps {
  jobsites: FrmJobsite[]
  initialLots: FrmLot[]
  initialAssignments: AssignmentWithJoins[]
  crews: CrewWithWorkers[]
  phases: FrmPhase[]
}

export default function AssignmentMatrix({
  jobsites,
  initialLots,
  initialAssignments,
  crews,
  phases,
}: AssignmentMatrixProps) {
  const router = useRouter()
  const [selectedJobsite, setSelectedJobsite] = useState(jobsites[0]?.id ?? '')
  const [lots, setLots] = useState(initialLots)
  const [assignments, setAssignments] = useState(initialAssignments)
  const [loading, setLoading] = useState(false)
  const [activeCell, setActiveCell] = useState<{ lotId: string; phaseId: PhaseId } | null>(null)
  const [savingCell, setSavingCell] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const crewIds = crews.map(c => c.id)

  // Build a lookup: lotId+phaseId -> assignment
  const assignmentMap = new Map<string, AssignmentWithJoins>()
  for (const a of assignments) {
    assignmentMap.set(`${a.lot_id}:${a.phase_id}`, a)
  }

  // Fetch lots and assignments when jobsite changes
  const fetchJobsiteData = useCallback(async (jobsiteId: string) => {
    setLoading(true)
    try {
      const supabase = createClient()
      const [newLots, newAssignments] = await Promise.all([
        listLots(supabase, jobsiteId),
        listAssignmentsByJobsite(supabase, jobsiteId),
      ])
      setLots(newLots)
      setAssignments(newAssignments)
    } catch {
      // Silently handle; user can retry
    } finally {
      setLoading(false)
    }
  }, [])

  function handleJobsiteChange(jobsiteId: string) {
    setSelectedJobsite(jobsiteId)
    setActiveCell(null)
    fetchJobsiteData(jobsiteId)
  }

  async function handleAssign(lotId: string, phaseId: PhaseId, crewId: string) {
    const cellKey = `${lotId}:${phaseId}`
    setSavingCell(cellKey)
    setActiveCell(null)
    try {
      const supabase = createClient()
      await createAssignment(supabase, { lot_id: lotId, phase_id: phaseId, crew_id: crewId })
      await fetchJobsiteData(selectedJobsite)
      router.refresh()
    } finally {
      setSavingCell(null)
    }
  }

  async function handleReassign(assignmentId: string, newCrewId: string, lotId: string, phaseId: PhaseId) {
    const cellKey = `${lotId}:${phaseId}`
    setSavingCell(cellKey)
    setActiveCell(null)
    try {
      const supabase = createClient()
      await reassignCrew(supabase, assignmentId, newCrewId)
      await fetchJobsiteData(selectedJobsite)
      router.refresh()
    } finally {
      setSavingCell(null)
    }
  }

  async function handleRemove(assignmentId: string, lotId: string, phaseId: PhaseId) {
    if (!confirm('Remove this assignment?')) return
    const cellKey = `${lotId}:${phaseId}`
    setSavingCell(cellKey)
    setActiveCell(null)
    try {
      const supabase = createClient()
      await deleteAssignment(supabase, assignmentId)
      await fetchJobsiteData(selectedJobsite)
      router.refresh()
    } finally {
      setSavingCell(null)
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setActiveCell(null)
      }
    }
    if (activeCell) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [activeCell])

  if (jobsites.length === 0) {
    return (
      <>
        <div>
          <h1 className="text-2xl font-bold text-[#101828]">Assignments</h1>
          <p className="text-[#667085] mt-1">Assign crews to phases on each lot</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="text-center py-12">
            <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-[#101828] mb-1">No jobsites yet</h3>
            <p className="text-[#667085] text-sm">Create a jobsite first, then come back to assign crews.</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#101828]">Assignments</h1>
          <p className="text-[#667085] mt-1">Assign crews to phases on each lot</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Jobsite selector */}
          <div className="relative">
            <select
              value={selectedJobsite}
              onChange={e => handleJobsiteChange(e.target.value)}
              className="appearance-none border border-gray-300 rounded-lg pl-3 pr-8 py-2 text-sm font-medium text-[#101828] bg-white focus:ring-2 focus:ring-[#0F766E] focus:border-[#0F766E] outline-none"
            >
              {jobsites.map(j => (
                <option key={j.id} value={j.id}>
                  {j.name} — {j.city}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#667085] pointer-events-none" />
          </div>

          <button
            onClick={() => fetchJobsiteData(selectedJobsite)}
            disabled={loading}
            className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-[#667085] transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Matrix */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-6 h-6 text-[#667085] animate-spin" />
            <span className="ml-2 text-sm text-[#667085]">Loading...</span>
          </div>
        ) : lots.length === 0 ? (
          <div className="text-center py-16">
            <Grid3X3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-[#101828] mb-1">No lots in this jobsite</h3>
            <p className="text-[#667085] text-sm">Add lots to the jobsite to start assigning crews.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 font-semibold text-[#101828] sticky left-0 bg-gray-50 z-10 min-w-[100px]">
                    Lot
                  </th>
                  {phases.map(phase => (
                    <th
                      key={phase.id}
                      className="text-center px-2 py-3 font-semibold text-[#101828] min-w-[80px]"
                      title={phase.name}
                    >
                      {PHASE_SHORT[phase.id]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lots.map(lot => (
                  <tr key={lot.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-2.5 font-medium text-[#101828] sticky left-0 bg-white z-10">
                      <span className="text-sm">{lot.lot_number}</span>
                      {lot.model && (
                        <span className="ml-1.5 text-xs text-[#667085]">{lot.model}</span>
                      )}
                    </td>
                    {phases.map(phase => {
                      const cellKey = `${lot.id}:${phase.id}`
                      const assignment = assignmentMap.get(cellKey)
                      const isSaving = savingCell === cellKey
                      const isActive =
                        activeCell?.lotId === lot.id &&
                        activeCell?.phaseId === phase.id

                      return (
                        <td key={phase.id} className="px-1 py-1.5 text-center relative">
                          {isSaving ? (
                            <div className="flex items-center justify-center">
                              <RefreshCw className="w-3.5 h-3.5 text-[#667085] animate-spin" />
                            </div>
                          ) : assignment ? (
                            /* Assigned cell: show crew badge */
                            <div className="relative group">
                              <button
                                onClick={() =>
                                  setActiveCell(isActive ? null : { lotId: lot.id, phaseId: phase.id })
                                }
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium truncate max-w-[90px] transition-colors ${crewColor(assignment.crew_id, crewIds)}`}
                                title={assignment.crew?.name ?? 'Unknown'}
                              >
                                {assignment.crew?.name ?? '?'}
                              </button>

                              {/* Dropdown for assigned cell */}
                              {isActive && (
                                <div
                                  ref={dropdownRef}
                                  className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-30 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[160px]"
                                >
                                  <p className="px-3 py-1.5 text-xs text-[#667085] font-medium border-b border-gray-100">
                                    Reassign or remove
                                  </p>
                                  {crews.map(c => (
                                    <button
                                      key={c.id}
                                      onClick={() => {
                                        if (c.id === assignment.crew_id) return
                                        handleReassign(assignment.id, c.id, lot.id, phase.id)
                                      }}
                                      disabled={c.id === assignment.crew_id}
                                      className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors ${
                                        c.id === assignment.crew_id
                                          ? 'text-[#0F766E] font-medium bg-[#0F766E]/5'
                                          : 'text-[#101828]'
                                      }`}
                                    >
                                      {c.name}
                                      {c.id === assignment.crew_id && ' (current)'}
                                    </button>
                                  ))}
                                  <div className="border-t border-gray-100 mt-1 pt-1">
                                    <button
                                      onClick={() => handleRemove(assignment.id, lot.id, phase.id)}
                                      className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1.5"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            /* Empty cell: show "+" button */
                            <div className="relative">
                              <button
                                onClick={() =>
                                  setActiveCell(isActive ? null : { lotId: lot.id, phaseId: phase.id })
                                }
                                className="w-7 h-7 rounded-md border border-dashed border-gray-300 flex items-center justify-center mx-auto hover:border-[#0F766E] hover:text-[#0F766E] text-gray-300 transition-colors"
                                title="Assign crew"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>

                              {/* Dropdown for empty cell */}
                              {isActive && (
                                <div
                                  ref={dropdownRef}
                                  className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-30 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[160px]"
                                >
                                  <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-100">
                                    <p className="text-xs text-[#667085] font-medium">Pick a crew</p>
                                    <button
                                      onClick={() => setActiveCell(null)}
                                      className="p-0.5 rounded hover:bg-gray-100 text-[#667085]"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                  {crews.length === 0 ? (
                                    <p className="px-3 py-2 text-xs text-[#667085]">
                                      No crews available. Create a crew first.
                                    </p>
                                  ) : (
                                    crews.map(c => (
                                      <button
                                        key={c.id}
                                        onClick={() => handleAssign(lot.id, phase.id, c.id)}
                                        className="w-full text-left px-3 py-1.5 text-sm text-[#101828] hover:bg-gray-50 transition-colors"
                                      >
                                        {c.name}
                                      </button>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Legend */}
      {lots.length > 0 && crews.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-[#667085] mb-2">Crew Legend</p>
          <div className="flex flex-wrap gap-2">
            {crews.map(c => (
              <span
                key={c.id}
                className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${crewColor(c.id, crewIds)}`}
              >
                {c.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
