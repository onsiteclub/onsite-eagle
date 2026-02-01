'use client'

import { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import type { DateRange } from '../TimekeeperDashboard'

interface DateRangePickerProps {
  dateRange: DateRange
  onChange: (range: DateRange) => void
}

const presets = [
  { label: 'Today', days: 0 },
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 14 days', days: 14 },
  { label: 'Last 30 days', days: 30 },
  { label: 'This week', special: 'thisWeek' },
  { label: 'Last week', special: 'lastWeek' },
  { label: 'This month', special: 'thisMonth' },
  { label: 'Last month', special: 'lastMonth' },
]

export function DateRangePicker({ dateRange, onChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showCustom, setShowCustom] = useState(false)
  const [tempStart, setTempStart] = useState('')
  const [tempEnd, setTempEnd] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setShowCustom(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handlePreset = (preset: typeof presets[0]) => {
    const end = new Date()
    end.setHours(23, 59, 59, 999)
    const start = new Date()
    start.setHours(0, 0, 0, 0)

    if (preset.special === 'thisWeek') {
      const day = start.getDay()
      start.setDate(start.getDate() - day)
    } else if (preset.special === 'lastWeek') {
      const day = start.getDay()
      start.setDate(start.getDate() - day - 7)
      end.setDate(end.getDate() - end.getDay() - 1)
    } else if (preset.special === 'thisMonth') {
      start.setDate(1)
    } else if (preset.special === 'lastMonth') {
      start.setMonth(start.getMonth() - 1, 1)
      end.setDate(0) // Last day of previous month
    } else if (preset.days === 0) {
      // Today - start and end are already set
    } else if (preset.days) {
      start.setDate(start.getDate() - preset.days)
    }

    onChange({ start, end, label: preset.label })
    setIsOpen(false)
  }

  const handleCustomApply = () => {
    if (tempStart && tempEnd) {
      const start = new Date(tempStart + 'T00:00:00')
      const end = new Date(tempEnd + 'T23:59:59')
      
      if (start > end) {
        alert('Start date must be before end date')
        return
      }

      onChange({ 
        start, 
        end, 
        label: `${start.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}`
      })
      setIsOpen(false)
      setShowCustom(false)
    }
  }

  const formatDisplayDate = () => {
    if (dateRange.label) return dateRange.label
    
    const options: Intl.DateTimeFormatOptions = { 
      month: 'short', 
      day: 'numeric',
      year: dateRange.start.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    }
    
    return `${dateRange.start.toLocaleDateString('en-CA', options)} - ${dateRange.end.toLocaleDateString('en-CA', options)}`
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2.5 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-colors shadow-sm"
      >
        <Calendar className="w-4 h-4 text-gray-500" />
        <span className="font-medium text-gray-900">{formatDisplayDate()}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden">
          {!showCustom ? (
            <>
              {/* Presets */}
              <div className="p-2">
                {presets.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => handlePreset(preset)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      dateRange.label === preset.label
                        ? 'bg-brand-50 text-brand-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Custom option */}
              <div className="border-t border-gray-100 p-2">
                <button
                  onClick={() => {
                    setTempStart(dateRange.start.toISOString().split('T')[0])
                    setTempEnd(dateRange.end.toISOString().split('T')[0])
                    setShowCustom(true)
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 font-medium"
                >
                  Custom range...
                </button>
              </div>
            </>
          ) : (
            /* Custom date picker */
            <div className="p-4 space-y-4">
              <button
                onClick={() => setShowCustom(false)}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to presets
              </button>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Start date
                  </label>
                  <input
                    type="date"
                    value={tempStart}
                    onChange={(e) => setTempStart(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    End date
                  </label>
                  <input
                    type="date"
                    value={tempEnd}
                    onChange={(e) => setTempEnd(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                </div>
              </div>

              <button
                onClick={handleCustomApply}
                disabled={!tempStart || !tempEnd}
                className="w-full py-2 bg-brand-500 text-white rounded-lg font-medium text-sm hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Apply
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
