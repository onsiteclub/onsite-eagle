'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Plus, Building2 } from 'lucide-react'
import Link from 'next/link'
import type { FrmJobsite } from '@onsite/framing'
import { JobsiteForm } from './JobsiteForm'

interface JobsitesListProps {
  initialJobsites: FrmJobsite[]
}

export function JobsitesList({ initialJobsites }: JobsitesListProps) {
  const [showForm, setShowForm] = useState(false)
  const router = useRouter()

  const formatDate = (date: string | null) => {
    if (!date) return '--'
    return new Intl.DateTimeFormat('en-CA', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(date))
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#101828]">Jobsites</h1>
          <p className="text-[#667085] mt-1">Manage your construction sites</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#0F766E] text-white text-sm font-medium rounded-lg hover:bg-[#0d6d66] transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Jobsite
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <JobsiteForm
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false)
            router.refresh()
          }}
        />
      )}

      {/* Table */}
      {initialJobsites.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-[#667085] text-sm mb-3">No jobsites created yet.</p>
          <button
            onClick={() => setShowForm(true)}
            className="text-sm font-medium text-teal-600 hover:text-teal-700"
          >
            Create your first jobsite
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-[#667085] uppercase tracking-wider px-6 py-3">
                  Jobsite
                </th>
                <th className="text-left text-xs font-medium text-[#667085] uppercase tracking-wider px-6 py-3">
                  Builder
                </th>
                <th className="text-left text-xs font-medium text-[#667085] uppercase tracking-wider px-6 py-3">
                  City
                </th>
                <th className="text-center text-xs font-medium text-[#667085] uppercase tracking-wider px-6 py-3">
                  Lots
                </th>
                <th className="text-center text-xs font-medium text-[#667085] uppercase tracking-wider px-6 py-3">
                  Status
                </th>
                <th className="text-left text-xs font-medium text-[#667085] uppercase tracking-wider px-6 py-3">
                  Start Date
                </th>
                <th className="text-left text-xs font-medium text-[#667085] uppercase tracking-wider px-6 py-3">
                  Expected End
                </th>
              </tr>
            </thead>
            <tbody>
              {initialJobsites.map(jobsite => (
                <tr
                  key={jobsite.id}
                  className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <Link
                      href={`/app/framing/jobsites/${jobsite.id}`}
                      className="flex items-center gap-3 group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                        <MapPin className="w-4 h-4 text-teal-600" />
                      </div>
                      <span className="text-sm font-medium text-[#101828] group-hover:text-teal-600 transition-colors">
                        {jobsite.name}
                      </span>
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-[#667085]">{jobsite.builder_name}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-[#667085]">{jobsite.city}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-sm font-medium text-[#101828]">
                      {jobsite.completed_lots}/{jobsite.total_lots}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      jobsite.status === 'active' ? 'bg-green-50 text-green-700' :
                      jobsite.status === 'completed' ? 'bg-blue-50 text-blue-700' :
                      jobsite.status === 'on_hold' ? 'bg-amber-50 text-amber-700' :
                      'bg-gray-50 text-gray-600'
                    }`}>
                      {jobsite.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-[#667085]">{formatDate(jobsite.start_date)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-[#667085]">{formatDate(jobsite.expected_end_date)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
