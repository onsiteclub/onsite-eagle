'use client'

import { useState } from 'react'
import {
  Sparkles,
  X,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  AlertTriangle,
  FileText,
  TrendingUp,
  Edit2,
} from 'lucide-react'
import type {
  CopilotSuggestions,
  TimelineSuggestion,
  LotUpdateSuggestion,
  IssueSuggestion,
  FormFieldSuggestion,
} from '@onsite/shared'

interface AISuggestionPanelProps {
  suggestions: CopilotSuggestions | null
  confidence: number | null
  aiNotes: string | null
  loading: boolean
  error: string | null
  onApplySuggestion: (category: keyof CopilotSuggestions, value?: unknown) => Promise<void>
  onApplyAll: () => Promise<void>
  onDismiss: () => void
  onFormFieldsApply?: (fields: FormFieldSuggestion) => void
}

// Severity colors
const SEVERITY_COLORS = {
  low: { bg: '#E8F5E9', text: '#2E7D32', border: '#A5D6A7' },
  medium: { bg: '#FFF3E0', text: '#E65100', border: '#FFCC80' },
  high: { bg: '#FFEBEE', text: '#C62828', border: '#EF9A9A' },
  critical: { bg: '#F3E5F5', text: '#6A1B9A', border: '#CE93D8' },
}

export function AISuggestionPanel({
  suggestions,
  confidence,
  aiNotes,
  loading,
  error,
  onApplySuggestion,
  onApplyAll,
  onDismiss,
  onFormFieldsApply,
}: AISuggestionPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['timeline', 'lot_updates', 'issues', 'form_fields']))
  const [editingTimeline, setEditingTimeline] = useState(false)
  const [editedTimeline, setEditedTimeline] = useState<TimelineSuggestion | null>(null)

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-[#667EEA] to-[#764BA2] rounded-xl p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="animate-spin">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <p className="font-medium">AI is analyzing...</p>
            <p className="text-sm opacity-80">This may take a few seconds</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-800 font-medium">Analysis Failed</p>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
          <button onClick={onDismiss} className="text-red-400 hover:text-red-600">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    )
  }

  if (!suggestions) return null

  const hasAnySuggestion = suggestions.timeline || suggestions.lot_updates || suggestions.issues?.length || suggestions.form_fields

  if (!hasAnySuggestion) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-gray-400" />
          <p className="text-gray-600">No suggestions available</p>
          <button onClick={onDismiss} className="ml-auto text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    )
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  const confidenceColor = confidence
    ? confidence >= 0.8 ? '#34C759'
    : confidence >= 0.6 ? '#FF9500'
    : '#FF3B30'
    : '#8E8E93'

  return (
    <div className="bg-white border border-[#D2D2D7] rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#667EEA] to-[#764BA2] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white">
          <Sparkles className="w-5 h-5" />
          <span className="font-medium">AI Suggestions</span>
          {confidence !== null && (
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${confidenceColor}30`, color: confidenceColor }}
            >
              {Math.round(confidence * 100)}% confidence
            </span>
          )}
        </div>
        <button onClick={onDismiss} className="text-white/80 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* AI Notes */}
      {aiNotes && (
        <div className="px-4 py-2 bg-[#F5F5F7] border-b border-[#D2D2D7]">
          <p className="text-xs text-[#86868B]">{aiNotes}</p>
        </div>
      )}

      {/* Suggestions */}
      <div className="divide-y divide-[#E5E5EA]">
        {/* Timeline Entry */}
        {suggestions.timeline && (
          <SuggestionSection
            title="Timeline Entry"
            icon={<Clock className="w-4 h-4" />}
            expanded={expandedSections.has('timeline')}
            onToggle={() => toggleSection('timeline')}
            onApply={() => onApplySuggestion('timeline', editingTimeline ? editedTimeline : undefined)}
          >
            {editingTimeline ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={editedTimeline?.title || suggestions.timeline.title}
                  onChange={e => setEditedTimeline(prev => ({ ...prev || suggestions.timeline!, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-[#D2D2D7] rounded-lg text-sm"
                  placeholder="Title"
                />
                <textarea
                  value={editedTimeline?.description || suggestions.timeline.description}
                  onChange={e => setEditedTimeline(prev => ({ ...prev || suggestions.timeline!, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-[#D2D2D7] rounded-lg text-sm resize-none"
                  rows={2}
                  placeholder="Description"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { setEditingTimeline(false); setEditedTimeline(null) }}
                    className="text-xs text-[#86868B] hover:text-[#1D1D1F]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-[#1D1D1F]">{suggestions.timeline.title}</p>
                  <button
                    onClick={() => setEditingTimeline(true)}
                    className="text-[#86868B] hover:text-[#007AFF]"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-[#86868B]">{suggestions.timeline.description}</p>
                <span className="inline-block text-xs px-2 py-0.5 bg-[#E5E5EA] rounded text-[#636366]">
                  {suggestions.timeline.event_type}
                </span>
              </div>
            )}
          </SuggestionSection>
        )}

        {/* Lot Updates */}
        {suggestions.lot_updates && Object.keys(suggestions.lot_updates).length > 0 && (
          <SuggestionSection
            title="Lot Updates"
            icon={<TrendingUp className="w-4 h-4" />}
            expanded={expandedSections.has('lot_updates')}
            onToggle={() => toggleSection('lot_updates')}
            onApply={() => onApplySuggestion('lot_updates')}
          >
            <div className="space-y-2">
              {Object.entries(suggestions.lot_updates).map(([key, value]) => (
                value !== undefined && (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <span className="text-[#86868B] capitalize">{key.replace(/_/g, ' ')}</span>
                    <span className="text-[#1D1D1F] font-medium">
                      {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                      {key === 'progress_percentage' && '%'}
                    </span>
                  </div>
                )
              ))}
            </div>
          </SuggestionSection>
        )}

        {/* Issues */}
        {suggestions.issues && suggestions.issues.length > 0 && (
          <SuggestionSection
            title={`Issues (${suggestions.issues.length})`}
            icon={<AlertTriangle className="w-4 h-4" />}
            expanded={expandedSections.has('issues')}
            onToggle={() => toggleSection('issues')}
            onApply={() => onApplySuggestion('issues')}
          >
            <div className="space-y-2">
              {suggestions.issues.map((issue, idx) => {
                const colors = SEVERITY_COLORS[issue.severity] || SEVERITY_COLORS.low
                return (
                  <div
                    key={idx}
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: colors.bg, borderLeft: `3px solid ${colors.border}` }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs px-1.5 py-0.5 rounded font-medium uppercase"
                        style={{ color: colors.text }}
                      >
                        {issue.severity}
                      </span>
                      <span className="text-sm font-medium" style={{ color: colors.text }}>
                        {issue.title}
                      </span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: colors.text, opacity: 0.8 }}>
                      {issue.description}
                    </p>
                  </div>
                )
              })}
            </div>
          </SuggestionSection>
        )}

        {/* Form Fields */}
        {suggestions.form_fields && Object.keys(suggestions.form_fields).length > 0 && (
          <SuggestionSection
            title="Form Fields"
            icon={<FileText className="w-4 h-4" />}
            expanded={expandedSections.has('form_fields')}
            onToggle={() => toggleSection('form_fields')}
            onApply={() => {
              onFormFieldsApply?.(suggestions.form_fields!)
              onApplySuggestion('form_fields')
            }}
          >
            <div className="space-y-2">
              {Object.entries(suggestions.form_fields).map(([key, value]) => (
                value !== undefined && value !== null && (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <span className="text-[#86868B] capitalize">{key.replace(/_/g, ' ')}</span>
                    <span className="text-[#1D1D1F] font-medium">
                      {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                    </span>
                  </div>
                )
              ))}
            </div>
          </SuggestionSection>
        )}
      </div>

      {/* Footer Actions */}
      <div className="px-4 py-3 bg-[#F5F5F7] flex items-center justify-between gap-3">
        <button
          onClick={onDismiss}
          className="text-sm text-[#86868B] hover:text-[#1D1D1F]"
        >
          Dismiss All
        </button>
        <button
          onClick={onApplyAll}
          className="flex items-center gap-2 px-4 py-2 bg-[#007AFF] text-white rounded-lg text-sm font-medium hover:bg-[#0056B3] transition-colors"
        >
          <Check className="w-4 h-4" />
          Apply All
        </button>
      </div>
    </div>
  )
}

// Sub-component for each suggestion section
function SuggestionSection({
  title,
  icon,
  expanded,
  onToggle,
  onApply,
  children,
}: {
  title: string
  icon: React.ReactNode
  expanded: boolean
  onToggle: () => void
  onApply: () => void
  children: React.ReactNode
}) {
  return (
    <div className="px-4 py-3">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2 text-[#1D1D1F]">
          <span className="text-[#007AFF]">{icon}</span>
          <span className="font-medium text-sm">{title}</span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-[#86868B]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[#86868B]" />
        )}
      </button>

      {expanded && (
        <div className="mt-3 pl-6">
          {children}
          <button
            onClick={(e) => { e.stopPropagation(); onApply() }}
            className="mt-3 flex items-center gap-1.5 text-xs text-[#007AFF] hover:text-[#0056B3] font-medium"
          >
            <Check className="w-3.5 h-3.5" />
            Apply
          </button>
        </div>
      )}
    </div>
  )
}

export default AISuggestionPanel
