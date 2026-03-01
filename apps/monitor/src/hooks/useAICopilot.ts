'use client'

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type {
  CopilotInputType,
  CopilotContext,
  CopilotResponse,
  CopilotSuggestions,
  CopilotState,
  UseCopilotReturn,
  TimelineSuggestion,
  LotUpdateSuggestion,
  IssueSuggestion,
} from '@onsite/shared'

interface UseAICopilotOptions {
  siteId: string
  houseId?: string
  onTimelineSaved?: (entry: TimelineSuggestion) => void
  onLotUpdated?: (updates: LotUpdateSuggestion) => void
  onIssueSaved?: (issue: IssueSuggestion) => void
}

export function useAICopilot(options: UseAICopilotOptions): UseCopilotReturn {
  const { siteId, houseId, onTimelineSaved, onLotUpdated, onIssueSaved } = options

  const [suggestions, setSuggestions] = useState<CopilotSuggestions | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confidence, setConfidence] = useState<number | null>(null)
  const [aiNotes, setAiNotes] = useState<string | null>(null)

  // Convert file to base64
  const fileToBase64 = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  // Main analyze function
  const analyze = useCallback(async (input: File | string, type: CopilotInputType) => {
    setLoading(true)
    setError(null)
    setSuggestions(null)
    setConfidence(null)
    setAiNotes(null)

    try {
      let content: string

      if (input instanceof File) {
        content = await fileToBase64(input)
      } else {
        content = input
      }

      const context: CopilotContext = {
        siteId,
        houseId,
      }

      const response = await fetch('/api/ai-copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, content, context }),
      })

      const data: CopilotResponse = await response.json()

      if (!data.success) {
        throw new Error((data as { error?: string }).error || 'AI analysis failed')
      }

      setSuggestions(data.suggestions)
      setConfidence(data.confidence)
      setAiNotes(data.ai_notes)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }, [siteId, houseId])

  // Apply a specific suggestion category
  const applySuggestion = useCallback(async (
    category: keyof CopilotSuggestions,
    customValue?: unknown
  ) => {
    if (!suggestions) return

    try {
      switch (category) {
        case 'timeline': {
          const timeline = (customValue as TimelineSuggestion) || suggestions.timeline
          if (!timeline || !houseId) return

          const { error: insertError } = await supabase
            .from('frm_timeline_events')
            .insert({
              lot_id: houseId,
              event_type: timeline.event_type,
              title: timeline.title,
              description: timeline.description,
              source: 'ai_copilot',
            })

          if (insertError) throw insertError
          onTimelineSaved?.(timeline)

          // Remove from suggestions
          setSuggestions(prev => prev ? { ...prev, timeline: undefined } : null)
          break
        }

        case 'lot_updates': {
          const updates = (customValue as LotUpdateSuggestion) || suggestions.lot_updates
          if (!updates || !houseId) return

          const { error: updateError } = await supabase
            .from('frm_lots')
            .update({
              ...(updates.status && { status: updates.status }),
              ...(updates.current_phase && { current_phase: updates.current_phase }),
              ...(updates.progress_percentage !== undefined && { progress_percentage: updates.progress_percentage }),
              ...(updates.priority_score !== undefined && { priority_score: updates.priority_score }),
              ...(updates.target_date && { target_date: updates.target_date }),
              ...(updates.closing_date && { closing_date: updates.closing_date }),
              ...(updates.buyer_name && { buyer_name: updates.buyer_name }),
              ...(updates.schedule_notes && { schedule_notes: updates.schedule_notes }),
              ...(updates.is_sold !== undefined && { is_sold: updates.is_sold }),
              updated_at: new Date().toISOString(),
            })
            .eq('id', houseId)

          if (updateError) throw updateError
          onLotUpdated?.(updates)

          // Remove from suggestions
          setSuggestions(prev => prev ? { ...prev, lot_updates: undefined } : null)
          break
        }

        case 'issues': {
          const issues = (customValue as IssueSuggestion[]) || suggestions.issues
          if (!issues || issues.length === 0 || !houseId) return

          for (const issue of issues) {
            const { error: insertError } = await supabase
              .from('frm_house_items')
              .insert({
                lot_id: houseId,
                title: issue.title,
                description: issue.description,
                severity: issue.severity,
                status: 'open',
              })

            if (insertError) throw insertError
            onIssueSaved?.(issue)
          }

          // Remove from suggestions
          setSuggestions(prev => prev ? { ...prev, issues: undefined } : null)
          break
        }

        case 'form_fields': {
          // Form fields are handled by the parent component
          // Just remove from suggestions
          setSuggestions(prev => prev ? { ...prev, form_fields: undefined } : null)
          break
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply suggestion')
    }
  }, [suggestions, houseId, onTimelineSaved, onLotUpdated, onIssueSaved])

  // Apply all suggestions
  const applyAll = useCallback(async () => {
    if (!suggestions) return

    const categories = Object.keys(suggestions) as (keyof CopilotSuggestions)[]

    for (const category of categories) {
      if (suggestions[category]) {
        await applySuggestion(category)
      }
    }
  }, [suggestions, applySuggestion])

  // Dismiss all suggestions
  const dismiss = useCallback(() => {
    setSuggestions(null)
    setConfidence(null)
    setAiNotes(null)
    setError(null)
  }, [])

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    suggestions,
    loading,
    error,
    confidence,
    aiNotes,
    analyze,
    applySuggestion,
    applyAll,
    dismiss,
    clearError,
  }
}

export default useAICopilot
