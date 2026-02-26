'use client'

import { useState, useMemo } from 'react'
import {
  Clock, MapPin, Calendar, Download, FileSpreadsheet,
  FileText, ChevronDown, Edit3, Check, X, Share2,
  BarChart3, Filter
} from 'lucide-react'
import { StatCard } from '@/components/ui/StatCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { HoursChart } from './components/HoursChart'
import { DateRangePicker } from './components/DateRangePicker'
import { EditableCell } from './components/EditableCell'
import { ReportHeader } from './components/ReportHeader'
import { formatMinutesToHours } from '@/lib/utils'
import type { TimekeeperEntry, TimekeeperGeofence, ProfileWithSubscription } from '@/lib/supabase/types'

interface TimekeeperDashboardProps {
  profile: ProfileWithSubscription
  entries: TimekeeperEntry[]
  geofences: TimekeeperGeofence[]
}

export type DateRange = {
  start: Date
  end: Date
  label?: string
}

export default function TimekeeperDashboard({
  profile,
  entries: initialEntries,
  geofences
}: TimekeeperDashboardProps) {
  const [entries, setEntries] = useState(initialEntries)
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - 7)
    return { start, end, label: 'Last 7 days' }
  })
  const [showChart, setShowChart] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  // Filter entries by selected date range
  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      const entryAt = new Date(e.entry_at)
      return entryAt >= dateRange.start && entryAt <= dateRange.end
    })
  }, [entries, dateRange])

  // Calculate statistics
  const stats = useMemo(() => {
    let totalMinutos = 0
    const completedEntries = filteredEntries.filter(e => e.exit_at)
    const daysWorked = new Set<string>()
    const locationsUsed = new Set<string>()
    let editedEntries = 0

    completedEntries.forEach(entry => {
      const entryAt = new Date(entry.entry_at)
      const exitAt = new Date(entry.exit_at!).getTime()
      totalMinutos += Math.round((exitAt - entryAt.getTime()) / 60000)
      daysWorked.add(entryAt.toDateString())
      if (entry.location_name) locationsUsed.add(entry.location_name)
      if (entry.manually_edited) editedEntries++
    })

    return {
      totalMinutos,
      totalSessoes: filteredEntries.length,
      diasTrabalhados: daysWorked.size,
      locaisUsados: Array.from(locationsUsed),
      registrosEditados: editedEntries
    }
  }, [filteredEntries])

  // Chart data (hours per day)
  const chartData = useMemo(() => {
    const dayMap = new Map<string, number>()

    // Initialize all days in range with 0
    const current = new Date(dateRange.start)
    while (current <= dateRange.end) {
      const key = current.toISOString().split('T')[0]
      dayMap.set(key, 0)
      current.setDate(current.getDate() + 1)
    }

    // Sum hours by day
    filteredEntries.forEach(entry => {
      if (!entry.exit_at) return
      const entryAt = new Date(entry.entry_at)
      const exitAt = new Date(entry.exit_at)
      const key = entryAt.toISOString().split('T')[0]
      const minutos = Math.round((exitAt.getTime() - entryAt.getTime()) / 60000)
      dayMap.set(key, (dayMap.get(key) || 0) + minutos / 60)
    })

    return Array.from(dayMap.entries())
      .map(([date, hours]) => ({
        date,
        hours: Math.round(hours * 100) / 100,
        label: new Date(date + 'T12:00:00').toLocaleDateString('en-CA', {
          weekday: 'short',
          day: 'numeric'
        })
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [filteredEntries, dateRange])

  // Update entry
  const handleUpdateEntry = async (
    id: string,
    field: 'entry_at' | 'exit_at',
    value: string
  ) => {
    try {
      const response = await fetch('/api/timekeeper/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, field, value })
      })

      if (!response.ok) throw new Error('Failed to update')

      const updated = await response.json()

      setEntries(prev =>
        prev.map(e => e.id === id ? { ...e, ...updated } : e)
      )
      setEditingId(null)
    } catch (error) {
      console.error('Error updating entry:', error)
      alert('Error updating entry')
    }
  }

  // Export Excel
  const handleExportExcel = async () => {
    setIsExporting(true)
    try {
      const response = await fetch('/api/timekeeper/export/excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entries: filteredEntries,
          profile,
          dateRange: {
            start: dateRange.start.toISOString(),
            end: dateRange.end.toISOString()
          },
          stats
        })
      })

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `timekeeper-${dateRange.start.toISOString().split('T')[0]}-${dateRange.end.toISOString().split('T')[0]}.xlsx`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export error:', error)
      alert('Error exporting Excel')
    } finally {
      setIsExporting(false)
    }
  }

  // Export PDF
  const handleExportPDF = async () => {
    setIsExporting(true)
    try {
      const response = await fetch('/api/timekeeper/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entries: filteredEntries,
          profile,
          dateRange: {
            start: dateRange.start.toISOString(),
            end: dateRange.end.toISOString()
          },
          stats
        })
      })

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `timekeeper-${dateRange.start.toISOString().split('T')[0]}-${dateRange.end.toISOString().split('T')[0]}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export error:', error)
      alert('Error exporting PDF')
    } finally {
      setIsExporting(false)
    }
  }

  const userName = profile.first_name && profile.last_name
    ? `${profile.first_name} ${profile.last_name}`
    : profile.full_name || profile.email

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Timekeeper</h1>
          <p className="text-gray-500 mt-1">
            Track your work hours and generate reports
          </p>
        </div>

        {/* Export buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowChart(!showChart)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
              showChart
                ? 'bg-brand-50 border-brand-200 text-brand-700'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline text-sm">Chart</span>
          </button>

          <div className="h-6 w-px bg-gray-200" />

          <button
            onClick={handleExportExcel}
            disabled={isExporting || filteredEntries.length === 0}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline text-sm">Excel</span>
          </button>

          <button
            onClick={handleExportPDF}
            disabled={isExporting || filteredEntries.length === 0}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline text-sm">PDF</span>
          </button>

          <button
            disabled
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed"
            title="Coming soon"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline text-sm">Video</span>
          </button>
        </div>
      </div>

      {/* Date Range Picker */}
      <DateRangePicker
        dateRange={dateRange}
        onChange={setDateRange}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          icon={Clock}
          title="Total Hours"
          value={formatMinutesToHours(stats.totalMinutos)}
          color="amber"
        />
        <StatCard
          icon={Calendar}
          title="Days Worked"
          value={stats.diasTrabalhados}
          color="blue"
        />
        <StatCard
          icon={MapPin}
          title="Locations"
          value={stats.locaisUsados.length}
          color="green"
        />
        <StatCard
          icon={Edit3}
          title="Sessions"
          value={stats.totalSessoes}
          subtitle={stats.registrosEditados > 0 ? `${stats.registrosEditados} edited` : undefined}
          color="purple"
        />
      </div>

      {/* Chart */}
      {showChart && chartData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Hours by Day</h2>
          <HoursChart data={chartData} />
        </div>
      )}

      {/* Records Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Records
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({filteredEntries.length})
            </span>
          </h2>
        </div>

        {filteredEntries.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Clock In
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Clock Out
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredEntries.map((entry) => {
                    const entryAt = new Date(entry.entry_at)
                    const exitAt = entry.exit_at ? new Date(entry.exit_at) : null
                    const duration = exitAt
                      ? Math.round((exitAt.getTime() - entryAt.getTime()) / 60000)
                      : null
                    const isEdited = entry.manually_edited
                    const isEditing = editingId === entry.id

                    return (
                      <tr
                        key={entry.id}
                        className={`hover:bg-gray-50 transition-colors ${
                          isEdited ? 'bg-amber-50/50' : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <span className="font-medium text-gray-900">
                            {entry.location_name || 'Unknown'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {entryAt.toLocaleDateString('en-CA', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>
                        <td className="py-3 px-4">
                          <EditableCell
                            value={entryAt}
                            type="time"
                            isEditing={isEditing}
                            isEdited={isEdited && !!entry.original_entry_at}
                            onSave={(value) => handleUpdateEntry(entry.id, 'entry_at', value)}
                            onCancel={() => setEditingId(null)}
                          />
                        </td>
                        <td className="py-3 px-4">
                          {exitAt ? (
                            <EditableCell
                              value={exitAt}
                              type="time"
                              isEditing={isEditing}
                              isEdited={isEdited && !!entry.original_exit_at}
                              onSave={(value) => handleUpdateEntry(entry.id, 'exit_at', value)}
                              onCancel={() => setEditingId(null)}
                            />
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              In progress
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {duration ? (
                            <span className="font-semibold text-gray-900">
                              {formatMinutesToHours(duration)}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {!isEditing && exitAt && (
                            <button
                              onClick={() => setEditingId(entry.id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                              title="Edit"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            {stats.registrosEditados > 0 && (
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <div className="w-3 h-3 rounded bg-amber-100 border border-amber-200" />
                  <span>Manually edited records</span>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="p-8">
            <EmptyState
              icon={Clock}
              title="No records found"
              description="No records found for the selected period. Try adjusting the date range."
            />
          </div>
        )}
      </div>

      {/* Report Summary (for PDF/sharing) */}
      <ReportHeader
        userName={userName}
        dateRange={dateRange}
        stats={stats}
        hidden
      />
    </div>
  )
}
