'use client'

import { formatMinutesToHours } from '@/lib/utils'
import type { DateRange } from '../TimekeeperDashboard'

interface ReportHeaderProps {
  userName: string
  dateRange: DateRange
  stats: {
    totalMinutos: number
    totalSessoes: number
    diasTrabalhados: number
    locaisUsados: string[]
    registrosEditados: number
  }
  hidden?: boolean
}

export function ReportHeader({ userName, dateRange, stats, hidden }: ReportHeaderProps) {
  const formatDateRange = () => {
    const options: Intl.DateTimeFormatOptions = { 
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    }
    return `${dateRange.start.toLocaleDateString('en-CA', options)} – ${dateRange.end.toLocaleDateString('en-CA', options)}`
  }

  // This component is hidden by default - it's used as a reference for PDF generation
  // Can also be shown as a print-friendly summary
  return (
    <div 
      id="report-summary"
      className={hidden ? 'sr-only' : 'bg-white rounded-xl border border-gray-200 p-8 print:border-0'}
    >
      {/* Logo/Brand */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">O</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">OnSite Timekeeper</h1>
            <p className="text-sm text-gray-500">Work Hours Report</p>
          </div>
        </div>
        <div className="text-right text-sm text-gray-500">
          <p>Generated: {new Date().toLocaleDateString('en-CA', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</p>
        </div>
      </div>

      {/* Worker Info */}
      <div className="border-b border-gray-200 pb-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">{userName}</h2>
        <p className="text-gray-500">{formatDateRange()}</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-8">
        <div>
          <p className="text-3xl font-bold text-gray-900">
            {formatMinutesToHours(stats.totalMinutos)}
          </p>
          <p className="text-sm text-gray-500">Total Hours</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-gray-900">{stats.diasTrabalhados}</p>
          <p className="text-sm text-gray-500">Days Worked</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-gray-900">{stats.totalSessoes}</p>
          <p className="text-sm text-gray-500">Sessions</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-gray-900">{stats.locaisUsados.length}</p>
          <p className="text-sm text-gray-500">Locations</p>
        </div>
      </div>

      {/* Locations */}
      {stats.locaisUsados.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Work Locations
          </h3>
          <div className="flex flex-wrap gap-2">
            {stats.locaisUsados.map((local) => (
              <span 
                key={local}
                className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700"
              >
                {local}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer for edited records */}
      {stats.registrosEditados > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-400">
            * This report contains {stats.registrosEditados} manually edited record(s). 
            Original geofence data is preserved in the system.
          </p>
        </div>
      )}
    </div>
  )
}
