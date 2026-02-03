'use client'

import { useState, useEffect, useRef, useCallback, ChangeEvent } from 'react'
import {
  Send, Bot, User, HardHat, Settings2, Image as ImageIcon,
  X, Check, Loader2, Sparkles, RefreshCw, TrendingUp, AlertTriangle,
  Building2, CheckCircle2, Clock, Pause, Paperclip, FileText, Brain
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { CopilotSuggestions } from '@onsite/shared'

// Types
interface Message {
  id: string
  site_id: string
  house_id: string | null
  sender_type: 'worker' | 'supervisor' | 'ai' | 'system'
  sender_id: string | null
  sender_name: string
  sender_avatar_url: string | null
  content: string
  attachments: Array<{ type: string; url: string; thumbnail_url?: string; name?: string }>
  is_ai_response: boolean
  ai_question: string | null
  phase_at_creation: number
  created_at: string
}

interface SiteStats {
  total_lots: number
  completed: number
  in_progress: number
  delayed: number
  not_started: number
  on_hold: number
  avg_progress: number
}

interface ChatTimelineProps {
  siteId: string
  houseId?: string | null
  houseLotNumber?: string
  siteName: string
  currentUserName?: string
  currentUserId?: string
  currentPhase?: number
  onLotUpdate?: () => void // Callback when lot data changes (e.g., phase change)
}

// Phase background colors - professional, light tones
const PHASE_COLORS: Record<number, { bg: string; name: string; border: string }> = {
  1: { bg: '#FFF8E7', name: 'First Floor', border: '#FFE0B2' },
  2: { bg: '#FFFDE7', name: '1st Floor Walls', border: '#FFF59D' },
  3: { bg: '#F1F8E9', name: 'Second Floor', border: '#C5E1A5' },
  4: { bg: '#E3F2FD', name: '2nd Floor Walls', border: '#90CAF9' },
  5: { bg: '#EDE7F6', name: 'Roof', border: '#B39DDB' },
  6: { bg: '#FBE9E7', name: 'Stairs Landing', border: '#FFAB91' },
  7: { bg: '#ECEFF1', name: 'Backing Frame', border: '#B0BEC5' },
}

// Site-level neutral colors
const SITE_COLORS = {
  bg: '#FFFFFF',
  border: '#E5E5EA',
  name: '',
}

// Sender type config
const SENDER_CONFIG = {
  worker: {
    icon: HardHat,
    color: '#FF9500',
    bgColor: '#FF9500/10',
    label: 'Worker',
  },
  supervisor: {
    icon: User,
    color: '#007AFF',
    bgColor: '#007AFF/10',
    label: 'Supervisor',
  },
  ai: {
    icon: Bot,
    color: '#AF52DE',
    bgColor: '#AF52DE/10',
    label: 'AI',
  },
  system: {
    icon: Settings2,
    color: '#8E8E93',
    bgColor: '#8E8E93/10',
    label: 'System',
  },
}

export default function ChatTimeline({
  siteId,
  houseId,
  houseLotNumber,
  siteName,
  currentUserName = 'Supervisor',
  currentUserId,
  currentPhase = 1,
  onLotUpdate,
}: ChatTimelineProps) {
  // Use phase colors for lot-level, neutral for site-level
  const isLotLevel = !!houseId
  const phaseConfig = isLotLevel ? (PHASE_COLORS[currentPhase] || PHASE_COLORS[1]) : SITE_COLORS

  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [inputValue, setInputValue] = useState('')
  const [isAskingAI, setIsAskingAI] = useState(false)
  const [aiResponse, setAiResponse] = useState<{ question: string; answer: string } | null>(null)
  const [savingAiResponse, setSavingAiResponse] = useState(false)
  const [sending, setSending] = useState(false)
  const [siteStats, setSiteStats] = useState<SiteStats | null>(null)
  const [attachments, setAttachments] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // AI Document Analysis state (only for lot-level uploads)
  const [analyzingDocument, setAnalyzingDocument] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<CopilotSuggestions | null>(null)
  const [aiConfidence, setAiConfidence] = useState<number | null>(null)
  const [aiNotes, setAiNotes] = useState<string | null>(null)
  const [pendingAttachments, setPendingAttachments] = useState<Array<{ type: string; url: string; name: string }>>([])
  const [applyingAI, setApplyingAI] = useState(false)

  // Document viewer modal state
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerAttachment, setViewerAttachment] = useState<{ type: string; url: string; name?: string } | null>(null)

  // Open attachment in modal
  const openAttachmentViewer = (att: { type: string; url: string; name?: string }) => {
    setViewerAttachment(att)
    setViewerOpen(true)
  }

  // Close viewer modal
  const closeViewer = () => {
    setViewerOpen(false)
    setViewerAttachment(null)
  }

  // Message analysis state (AI reads messages and suggests actions)
  interface MessageAnalysis {
    should_respond: boolean
    response: string | null
    detected_updates: {
      phase_change: number | null
      progress_change: number | null
      status_change: string | null
    }
    detected_issues: Array<{ title: string; severity: string; description: string }>
    detected_events: Array<{ title: string; date: string | null; type: string }>
    confidence: number
    reasoning: string
  }
  const [messageAnalysis, setMessageAnalysis] = useState<MessageAnalysis | null>(null)
  const [analyzingMessage, setAnalyzingMessage] = useState(false)
  const [applyingMessageActions, setApplyingMessageActions] = useState(false)

  // Analyze message with AI (for lot-level messages)
  const analyzeMessage = async (message: string) => {
    if (!houseId || !message.trim()) return null

    try {
      const response = await fetch('/api/analyze-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          siteId,
          houseId,
          currentPhase,
        }),
      })

      if (!response.ok) return null

      const data = await response.json()
      if (data.success && data.analysis) {
        // Only show analysis if there's something meaningful
        const analysis = data.analysis as MessageAnalysis
        const hasContent =
          analysis.should_respond ||
          analysis.detected_updates?.phase_change ||
          analysis.detected_updates?.progress_change ||
          analysis.detected_updates?.status_change ||
          (analysis.detected_issues && analysis.detected_issues.length > 0) ||
          (analysis.detected_events && analysis.detected_events.length > 0)

        if (hasContent && analysis.confidence > 0.5) {
          return analysis
        }
      }
    } catch (error) {
      console.error('Message analysis error:', error)
    }
    return null
  }

  // Apply message analysis actions
  const applyMessageActions = async () => {
    if (!messageAnalysis || !houseId || applyingMessageActions) return

    setApplyingMessageActions(true)
    try {
      // 1. Post AI response if needed
      if (messageAnalysis.should_respond && messageAnalysis.response) {
        await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            site_id: siteId,
            house_id: houseId,
            sender_type: 'ai',
            sender_name: 'Eagle AI',
            content: messageAnalysis.response,
            attachments: [],
            is_ai_response: true,
            phase_at_creation: currentPhase,
          }),
        })
      }

      // 2. Apply lot updates to database
      const updates = messageAnalysis.detected_updates
      if (updates?.phase_change || updates?.progress_change || updates?.status_change) {
        const updatePayload: Record<string, unknown> = {}
        if (updates.phase_change) updatePayload.current_phase = updates.phase_change
        if (updates.progress_change) updatePayload.progress_percentage = updates.progress_change
        if (updates.status_change) updatePayload.status = updates.status_change

        // Actually update the lot in the database
        const lotUpdateResponse = await fetch(`/api/lots/${houseId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatePayload),
        })

        if (lotUpdateResponse.ok) {
          // Log the update as a system message (use NEW phase if phase changed)
          const newPhase = updates.phase_change || currentPhase
          await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              site_id: siteId,
              house_id: houseId,
              sender_type: 'system',
              sender_name: 'Eagle AI',
              content: `📊 Updated lot: ${Object.entries(updatePayload).map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`).join(', ')}`,
              attachments: [],
              is_ai_response: true,
              phase_at_creation: newPhase,
            }),
          })

          // Notify parent to refresh lot data (for background color change)
          onLotUpdate?.()
        } else {
          console.error('Failed to update lot:', await lotUpdateResponse.text())
        }
      }

      // 3. Log detected issues
      for (const issue of messageAnalysis.detected_issues || []) {
        await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            site_id: siteId,
            house_id: houseId,
            sender_type: 'ai',
            sender_name: 'Eagle AI',
            content: `⚠️ **Issue Detected**: ${issue.title} (${issue.severity})\n${issue.description}`,
            attachments: [],
            is_ai_response: true,
            phase_at_creation: currentPhase,
          }),
        })
      }

      // 4. Create detected events in calendar AND log in chat
      for (const event of messageAnalysis.detected_events || []) {
        // Save event to egl_external_events table (calendar)
        const eventResponse = await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            site_id: siteId,
            house_id: houseId,
            event_type: (event as { event_type?: string }).event_type || event.type || 'other',
            title: event.title,
            description: `Detected from chat message`,
            event_date: event.date,
            source: 'ai_chat_analysis',
          }),
        })

        const savedToCalendar = eventResponse.ok

        // Log in chat timeline
        await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            site_id: siteId,
            house_id: houseId,
            sender_type: 'ai',
            sender_name: 'Eagle AI',
            content: `📅 **Event ${savedToCalendar ? 'Added to Calendar' : 'Noted'}**: ${event.title} - ${event.date} (${event.type})`,
            attachments: [],
            is_ai_response: true,
            phase_at_creation: currentPhase,
          }),
        })
      }

      setMessageAnalysis(null)
      fetchMessages()
    } catch (error) {
      console.error('Error applying message actions:', error)
    } finally {
      setApplyingMessageActions(false)
    }
  }

  // Dismiss message analysis
  const dismissMessageAnalysis = () => {
    setMessageAnalysis(null)
  }

  // Fetch site stats (for site-level chat)
  const fetchSiteStats = useCallback(async () => {
    if (houseId) return // Only fetch for site-level chat

    try {
      const { data: houses, error } = await supabase
        .from('egl_houses')
        .select('status, progress_percentage')
        .eq('site_id', siteId)

      if (error) throw error

      const stats: SiteStats = {
        total_lots: houses?.length || 0,
        completed: houses?.filter(h => h.status === 'completed').length || 0,
        in_progress: houses?.filter(h => h.status === 'in_progress').length || 0,
        delayed: houses?.filter(h => h.status === 'delayed').length || 0,
        not_started: houses?.filter(h => h.status === 'not_started').length || 0,
        on_hold: houses?.filter(h => h.status === 'on_hold').length || 0,
        avg_progress: houses?.length
          ? Math.round(houses.reduce((sum, h) => sum + (h.progress_percentage || 0), 0) / houses.length)
          : 0,
      }

      setSiteStats(stats)
    } catch (error) {
      console.error('Error fetching site stats:', error)
    }
  }, [siteId, houseId])

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Fetch messages via API
  const fetchMessages = useCallback(async () => {
    try {
      const params = new URLSearchParams({ siteId })
      if (houseId) params.append('houseId', houseId)

      const response = await fetch(`/api/messages?${params}`)
      if (!response.ok) throw new Error('Failed to fetch messages')

      const data = await response.json()
      setMessages(data || [])
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setLoading(false)
    }
  }, [siteId, houseId])

  // Initial fetch
  useEffect(() => {
    fetchMessages()
    fetchSiteStats()
  }, [fetchMessages, fetchSiteStats])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`chat-${siteId}-${houseId || 'site'}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'egl_messages',
          filter: houseId
            ? `house_id=eq.${houseId}`
            : `site_id=eq.${siteId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message
          // Only add if matches our filter (site-level or specific house)
          if (houseId && newMessage.house_id === houseId) {
            setMessages((prev) => [...prev, newMessage])
          } else if (!houseId && !newMessage.house_id) {
            setMessages((prev) => [...prev, newMessage])
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [siteId, houseId])

  // Scroll when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Handle file selection
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      setAttachments(prev => [...prev, ...files].slice(0, 5)) // Max 5 files
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Remove attachment
  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  // Upload attachments via API (uses service role to bypass RLS)
  const uploadAttachments = async (): Promise<Array<{ type: string; url: string; name: string }>> => {
    if (attachments.length === 0) return []

    const uploadedFiles: Array<{ type: string; url: string; name: string }> = []

    for (const file of attachments) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('siteId', siteId)
      if (houseId) formData.append('houseId', houseId)
      formData.append('bucket', 'egl-media')

      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error('Upload error:', errorData.error)
          continue
        }

        const data = await response.json()
        uploadedFiles.push({
          type: data.type,
          url: data.url,
          name: data.name,
        })
      } catch (error) {
        console.error('Upload error:', error)
      }
    }

    return uploadedFiles
  }

  // Analyze document with AI (lot-level only, isolated to this lot)
  const analyzeWithAI = async (file: File, uploadedUrl: string) => {
    if (!houseId) return null // Only analyze for lot-level uploads

    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          resolve(result.split(',')[1]) // Remove data URL prefix
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const isImage = file.type.startsWith('image/')
      const type = isImage ? 'photo' : 'document'

      const response = await fetch('/api/ai-copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          content: base64,
          context: {
            siteId,      // Scoped to this site
            houseId,     // Scoped to THIS lot only
          },
        }),
      })

      if (!response.ok) return null

      const data = await response.json()
      if (data.success) {
        return {
          suggestions: data.suggestions,
          confidence: data.confidence,
          notes: data.ai_notes,
        }
      }
    } catch (error) {
      console.error('AI analysis error:', error)
    }
    return null
  }

  // Apply AI suggestions to this lot (isolated - only updates this lot)
  const applyAISuggestions = async () => {
    if (!aiSuggestions || !houseId || applyingAI) return

    setApplyingAI(true)
    try {
      // 1. Apply lot updates (progress, phase, status) - ONLY to this lot
      if (aiSuggestions.lot_updates) {
        const updates = aiSuggestions.lot_updates

        // Update the lot in the database
        const lotUpdateResponse = await fetch(`/api/lots/${houseId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        })

        if (lotUpdateResponse.ok) {
          // Log the update as a system message (use NEW phase if changed)
          const newPhase = (updates.current_phase as number) || currentPhase
          await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              site_id: siteId,
              house_id: houseId, // ISOLATED: only this lot
              sender_type: 'system',
              sender_name: 'Eagle AI',
              content: `📊 AI updated lot: ${Object.entries(updates).map(([k, v]) => `${k}: ${v}`).join(', ')}`,
              attachments: [],
              is_ai_response: true,
              phase_at_creation: newPhase,
            }),
          })

          // Notify parent to refresh lot data (for background color change)
          onLotUpdate?.()
        } else {
          console.error('Failed to update lot:', await lotUpdateResponse.text())
        }
      }

      // 2. Create issues detected - ONLY for this lot
      if (aiSuggestions.issues && aiSuggestions.issues.length > 0) {
        for (const issue of aiSuggestions.issues) {
          await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              site_id: siteId,
              house_id: houseId, // ISOLATED: only this lot
              sender_type: 'ai',
              sender_name: 'Eagle AI',
              content: `⚠️ Issue detected: **${issue.title}** (${issue.severity})\n${issue.description}`,
              attachments: [],
              is_ai_response: true,
              phase_at_creation: currentPhase,
            }),
          })
        }
      }

      // 3. Create timeline entry with the analysis - ONLY for this lot
      if (aiSuggestions.timeline) {
        await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            site_id: siteId,
            house_id: houseId, // ISOLATED: only this lot
            sender_type: 'ai',
            sender_name: 'Eagle AI',
            content: `🔍 **${aiSuggestions.timeline.title}**\n\n${aiSuggestions.timeline.description}`,
            attachments: pendingAttachments,
            is_ai_response: true,
            phase_at_creation: currentPhase,
          }),
        })
      }

      // Clear AI state
      setAiSuggestions(null)
      setAiConfidence(null)
      setAiNotes(null)
      setPendingAttachments([])
      fetchMessages()
    } catch (error) {
      console.error('Error applying AI suggestions:', error)
    } finally {
      setApplyingAI(false)
    }
  }

  // Dismiss AI suggestions and just save the upload
  const dismissAISuggestions = async () => {
    // Save message with just the attachment, no AI analysis
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        site_id: siteId,
        house_id: houseId || null,
        sender_type: 'supervisor',
        sender_id: currentUserId,
        sender_name: currentUserName,
        content: '📎 Attachment',
        attachments: pendingAttachments,
        is_ai_response: false,
        phase_at_creation: currentPhase,
      }),
    })

    setAiSuggestions(null)
    setAiConfidence(null)
    setAiNotes(null)
    setPendingAttachments([])
    fetchMessages()
  }

  // Send regular message via API
  const handleSendMessage = async () => {
    if ((!inputValue.trim() && attachments.length === 0) || sending) return

    setSending(true)
    setUploading(attachments.length > 0)

    try {
      // Upload attachments first
      const uploadedAttachments = await uploadAttachments()

      // If lot-level and has image/document, analyze with AI
      if (houseId && attachments.length > 0) {
        setAnalyzingDocument(true)
        const analysisResults = await analyzeWithAI(attachments[0], uploadedAttachments[0]?.url || '')
        setAnalyzingDocument(false)

        if (analysisResults) {
          // Store analysis results and attachments for user review
          setAiSuggestions(analysisResults.suggestions)
          setAiConfidence(analysisResults.confidence)
          setAiNotes(analysisResults.notes)
          setPendingAttachments(uploadedAttachments)
          setAttachments([])
          setInputValue('')
          setSending(false)
          setUploading(false)
          return // Wait for user to confirm/dismiss AI suggestions
        }
      }

      // No AI analysis or site-level - just send normally
      const messageText = inputValue.trim()
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site_id: siteId,
          house_id: houseId || null,
          sender_type: 'supervisor',
          sender_id: currentUserId,
          sender_name: currentUserName,
          content: messageText,
          attachments: uploadedAttachments,
          is_ai_response: false,
          phase_at_creation: currentPhase,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send message')
      }

      setInputValue('')
      setAttachments([])
      inputRef.current?.focus()
      fetchMessages()

      // Analyze text message with AI (lot-level only, text messages only)
      if (houseId && messageText && uploadedAttachments.length === 0) {
        setAnalyzingMessage(true)
        try {
          const analysis = await analyzeMessage(messageText)
          if (analysis) {
            setMessageAnalysis(analysis)
          }
        } finally {
          setAnalyzingMessage(false)
        }
      }
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
      setUploading(false)
    }
  }

  // Ask AI
  const handleAskAI = async () => {
    if (!inputValue.trim() || isAskingAI) return

    const question = inputValue.trim()
    setIsAskingAI(true)
    setInputValue('')

    try {
      const response = await fetch('/api/chat-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          siteId,
          houseId,
        }),
      })

      if (!response.ok) throw new Error('AI request failed')

      const data = await response.json()
      setAiResponse({ question, answer: data.answer })
    } catch (error) {
      console.error('Error asking AI:', error)
      setAiResponse({
        question,
        answer: 'Sorry, I was unable to process your question. Please try again.',
      })
    } finally {
      setIsAskingAI(false)
    }
  }

  // Save AI response to timeline via API
  const handleSaveAiResponse = async () => {
    if (!aiResponse || savingAiResponse) return

    setSavingAiResponse(true)
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site_id: siteId,
          house_id: houseId || null,
          sender_type: 'ai',
          sender_name: 'Eagle AI',
          content: aiResponse.answer,
          attachments: [],
          is_ai_response: true,
          ai_question: aiResponse.question,
          phase_at_creation: currentPhase,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save AI response')
      }

      setAiResponse(null)
      // Refresh messages
      fetchMessages()
    } catch (error) {
      console.error('Error saving AI response:', error)
    } finally {
      setSavingAiResponse(false)
    }
  }

  // Discard AI response
  const handleDiscardAiResponse = () => {
    setAiResponse(null)
  }

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Format date - always numeric, never "Today"/"Yesterday"
  const formatMessageDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })
  }

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = new Date(message.created_at).toDateString()
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(message)
    return groups
  }, {} as Record<string, Message[]>)

  // Helper to get phase config for a message
  const getMessagePhaseConfig = (message: Message) => {
    const phase = message.phase_at_creation || 1
    return PHASE_COLORS[phase] || PHASE_COLORS[1]
  }

  // Format date divider - always numeric format YYYY-MM-DD (weekday)
  const formatDateDivider = (dateStr: string) => {
    const date = new Date(dateStr)
    const weekday = date.toLocaleDateString('en-CA', { weekday: 'short' })
    const dateFormatted = date.toLocaleDateString('en-CA') // YYYY-MM-DD
    return `${dateFormatted} (${weekday})`
  }

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] border border-[#D2D2D7] rounded-2xl overflow-hidden bg-white">
      {/* Header with Phase Indicator */}
      <div className="px-4 py-3 border-b bg-white/80 backdrop-blur-sm" style={{ borderColor: phaseConfig.border }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-[#1D1D1F]">
                {isLotLevel ? `Lot ${houseLotNumber}` : siteName}
              </h3>
              {isLotLevel && (
                <span
                  className="text-xs font-medium px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: phaseConfig.border, color: '#1D1D1F' }}
                >
                  Phase {currentPhase}: {phaseConfig.name}
                </span>
              )}
            </div>
            <p className="text-xs text-[#86868B] mt-0.5">
              {messages.length} messages
            </p>
          </div>
          <button
            onClick={() => { fetchMessages(); fetchSiteStats(); }}
            className="p-2 rounded-lg hover:bg-white/80 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4 text-[#86868B]" />
          </button>
        </div>

        {/* Site-level aggregated stats */}
        {!isLotLevel && siteStats && (
          <div className="mt-3 pt-3 border-t border-[#E5E5EA]">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-[#007AFF]" />
              <span className="text-xs font-medium text-[#1D1D1F]">
                Site Progress: {siteStats.avg_progress}%
              </span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              <div className="flex items-center gap-1.5 text-xs">
                <Building2 className="w-3 h-3 text-[#86868B]" />
                <span className="text-[#6E6E73]">{siteStats.total_lots} Total</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <CheckCircle2 className="w-3 h-3 text-[#34C759]" />
                <span className="text-[#34C759]">{siteStats.completed} Done</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <Clock className="w-3 h-3 text-[#007AFF]" />
                <span className="text-[#007AFF]">{siteStats.in_progress} Active</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <AlertTriangle className="w-3 h-3 text-[#FF3B30]" />
                <span className="text-[#FF3B30]">{siteStats.delayed} Delayed</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <Pause className="w-3 h-3 text-[#FF9500]" />
                <span className="text-[#FF9500]">{siteStats.on_hold} Hold</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AI Document Analysis Panel - Shows when AI has suggestions from upload */}
      {(analyzingDocument || aiSuggestions) && (
        <div className="px-4 py-3 border-b border-[#D2D2D7] bg-gradient-to-r from-[#667EEA]/10 to-[#764BA2]/10">
          {analyzingDocument ? (
            <div className="flex items-center gap-3">
              <div className="animate-spin">
                <Brain className="w-5 h-5 text-[#667EEA]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#1D1D1F]">AI analyzing document...</p>
                <p className="text-xs text-[#86868B]">Extracting data for Lot {houseLotNumber}</p>
              </div>
            </div>
          ) : aiSuggestions && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-[#667EEA]" />
                  <span className="text-sm font-medium text-[#1D1D1F]">AI Analysis Ready</span>
                  {aiConfidence && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#34C759]/20 text-[#34C759]">
                      {Math.round(aiConfidence * 100)}% confidence
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={dismissAISuggestions}
                    className="text-xs text-[#86868B] hover:text-[#1D1D1F] px-2 py-1"
                  >
                    Skip
                  </button>
                  <button
                    onClick={applyAISuggestions}
                    disabled={applyingAI}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-[#667EEA] text-white rounded-lg hover:bg-[#5a6fd6] disabled:opacity-50"
                  >
                    {applyingAI ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Check className="w-3 h-3" />
                    )}
                    Apply to Lot {houseLotNumber}
                  </button>
                </div>
              </div>

              {/* AI Notes */}
              {aiNotes && (
                <p className="text-xs text-[#86868B] bg-white/50 rounded px-2 py-1">{aiNotes}</p>
              )}

              {/* Suggestions Preview */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {aiSuggestions.timeline && (
                  <div className="bg-white/70 rounded-lg p-2">
                    <span className="text-[#86868B]">Timeline:</span>
                    <p className="font-medium text-[#1D1D1F] truncate">{aiSuggestions.timeline.title}</p>
                  </div>
                )}
                {aiSuggestions.lot_updates && (
                  <div className="bg-white/70 rounded-lg p-2">
                    <span className="text-[#86868B]">Updates:</span>
                    <p className="font-medium text-[#1D1D1F]">
                      {aiSuggestions.lot_updates.progress_percentage !== undefined && `${aiSuggestions.lot_updates.progress_percentage}% `}
                      {aiSuggestions.lot_updates.current_phase && `Phase ${aiSuggestions.lot_updates.current_phase}`}
                    </p>
                  </div>
                )}
                {aiSuggestions.issues && aiSuggestions.issues.length > 0 && (
                  <div className="bg-[#FF3B30]/10 rounded-lg p-2 col-span-2">
                    <span className="text-[#FF3B30]">⚠️ {aiSuggestions.issues.length} issue(s) detected</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI Message Analysis Panel - Shows when AI detected actions from a text message */}
      {(analyzingMessage || messageAnalysis) && (
        <div className="px-4 py-3 border-b border-[#D2D2D7] bg-gradient-to-r from-[#34C759]/10 to-[#30D158]/10">
          {analyzingMessage ? (
            <div className="flex items-center gap-3">
              <div className="animate-spin">
                <Brain className="w-5 h-5 text-[#34C759]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#1D1D1F]">AI analyzing message...</p>
                <p className="text-xs text-[#86868B]">Looking for updates, issues, or events</p>
              </div>
            </div>
          ) : messageAnalysis && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-[#34C759]" />
                  <span className="text-sm font-medium text-[#1D1D1F]">AI Detected Actions</span>
                  {messageAnalysis.confidence && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#34C759]/20 text-[#34C759]">
                      {Math.round(messageAnalysis.confidence * 100)}% confidence
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={dismissMessageAnalysis}
                    className="text-xs text-[#86868B] hover:text-[#1D1D1F] px-2 py-1"
                  >
                    Dismiss
                  </button>
                  <button
                    onClick={applyMessageActions}
                    disabled={applyingMessageActions}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-[#34C759] text-white rounded-lg hover:bg-[#30B350] disabled:opacity-50"
                  >
                    {applyingMessageActions ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Check className="w-3 h-3" />
                    )}
                    Apply Actions
                  </button>
                </div>
              </div>

              {/* AI Reasoning */}
              {messageAnalysis.reasoning && (
                <p className="text-xs text-[#86868B] bg-white/50 rounded px-2 py-1">
                  💡 {messageAnalysis.reasoning}
                </p>
              )}

              {/* Analysis Details */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* AI Response */}
                {messageAnalysis.should_respond && messageAnalysis.response && (
                  <div className="bg-white/70 rounded-lg p-2 col-span-2">
                    <span className="text-[#AF52DE]">🤖 AI Response:</span>
                    <p className="font-medium text-[#1D1D1F] mt-1">{messageAnalysis.response}</p>
                  </div>
                )}

                {/* Detected Updates */}
                {(messageAnalysis.detected_updates?.phase_change ||
                  messageAnalysis.detected_updates?.progress_change ||
                  messageAnalysis.detected_updates?.status_change) && (
                  <div className="bg-white/70 rounded-lg p-2">
                    <span className="text-[#007AFF]">📊 Updates:</span>
                    <div className="font-medium text-[#1D1D1F] mt-1 space-y-0.5">
                      {messageAnalysis.detected_updates.phase_change && (
                        <p>Phase → {messageAnalysis.detected_updates.phase_change}</p>
                      )}
                      {messageAnalysis.detected_updates.progress_change && (
                        <p>Progress → {messageAnalysis.detected_updates.progress_change}%</p>
                      )}
                      {messageAnalysis.detected_updates.status_change && (
                        <p>Status → {messageAnalysis.detected_updates.status_change}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Detected Issues */}
                {messageAnalysis.detected_issues && messageAnalysis.detected_issues.length > 0 && (
                  <div className="bg-[#FF3B30]/10 rounded-lg p-2">
                    <span className="text-[#FF3B30]">⚠️ {messageAnalysis.detected_issues.length} Issue(s):</span>
                    <div className="mt-1 space-y-1">
                      {messageAnalysis.detected_issues.map((issue, idx) => (
                        <p key={idx} className="font-medium text-[#1D1D1F]">
                          • {issue.title} ({issue.severity})
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Detected Events */}
                {messageAnalysis.detected_events && messageAnalysis.detected_events.length > 0 && (
                  <div className="bg-[#FF9500]/10 rounded-lg p-2">
                    <span className="text-[#FF9500]">📅 {messageAnalysis.detected_events.length} Event(s):</span>
                    <div className="mt-1 space-y-1">
                      {messageAnalysis.detected_events.map((event, idx) => (
                        <p key={idx} className="font-medium text-[#1D1D1F]">
                          • {event.title} {event.date ? `(${event.date})` : ''}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Messages Area - Timeline Layout */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 text-[#007AFF] animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ backgroundColor: 'white', border: `2px solid ${phaseConfig.border}` }}
            >
              <Bot className="w-8 h-8 text-[#86868B]" />
            </div>
            <p className="text-[#1D1D1F] font-medium">No messages yet</p>
            <p className="text-[#86868B] text-sm mt-1">
              Start the conversation or ask AI a question
            </p>
            {isLotLevel && (
              <p className="text-xs mt-3 px-3 py-1.5 rounded-full" style={{ backgroundColor: phaseConfig.border }}>
                Phase {currentPhase}: {phaseConfig.name}
              </p>
            )}
          </div>
        ) : (
          <div className="relative max-w-4xl mx-auto">
            {Object.entries(groupedMessages).map(([date, dayMessages]) => {
              // Track phase changes within the day
              let lastPhase: number | null = null

              return (
                <div key={date}>
                  {/* Date Divider - Centered */}
                  <div className="relative flex justify-center my-6">
                    <span
                      className="px-4 py-1.5 text-sm font-medium text-[#1D1D1F] relative z-10 rounded-full shadow-sm bg-white border-2 border-[#D2D2D7]"
                    >
                      {formatDateDivider(date)}
                    </span>
                  </div>

                  {/* Messages for this day */}
                  <div className="space-y-0">
                    {dayMessages.map((message, msgIdx) => {
                      const config = SENDER_CONFIG[message.sender_type]
                      const Icon = config.icon
                      // Workers on left, Supervisor/AI/System on right
                      const isLeft = message.sender_type === 'worker'
                      const msgPhaseConfig = getMessagePhaseConfig(message)
                      const messagePhase = message.phase_at_creation || 1
                      const phaseChanged = lastPhase !== null && lastPhase !== messagePhase
                      lastPhase = messagePhase

                      return (
                        <div key={message.id}>
                          {/* Phase Change Divider */}
                          {phaseChanged && isLotLevel && (
                            <div className="relative flex justify-center my-4 py-2">
                              <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-current to-transparent" style={{ color: msgPhaseConfig.border }} />
                              <span
                                className="relative z-10 px-4 py-1 text-xs font-semibold rounded-full shadow-sm"
                                style={{ backgroundColor: msgPhaseConfig.bg, color: '#1D1D1F', border: `2px solid ${msgPhaseConfig.border}` }}
                              >
                                🔄 Phase {messagePhase}: {msgPhaseConfig.name}
                              </span>
                            </div>
                          )}

                          {/* Message with phase background */}
                          <div
                            className="relative py-3 px-2 transition-colors"
                            style={{ backgroundColor: isLotLevel ? msgPhaseConfig.bg : 'transparent' }}
                          >
                            {/* Central Timeline Line segment */}
                            <div
                              className="absolute left-1/2 top-0 bottom-0 w-1 -translate-x-1/2"
                              style={{ backgroundColor: msgPhaseConfig.border }}
                            />

                            <div className={`relative flex items-start ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}>
                              {/* Message Card */}
                              <div className={`w-5/12 ${isLeft ? 'pr-6 text-right' : 'pl-6 text-left'}`}>
                                <div
                                  className="bg-white border border-[#D2D2D7] rounded-xl p-4 hover:border-[#007AFF] hover:shadow-md transition-all"
                                  style={{ borderLeftColor: isLeft ? config.color : undefined, borderLeftWidth: isLeft ? '3px' : undefined, borderRightColor: !isLeft ? config.color : undefined, borderRightWidth: !isLeft ? '3px' : undefined }}
                                >
                            <div className={`flex items-start gap-3 ${isLeft ? 'flex-row-reverse' : ''}`}>
                              {/* Avatar */}
                              <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: `${config.color}15` }}
                              >
                                <Icon className="w-5 h-5" style={{ color: config.color }} />
                              </div>

                              <div className={`flex-1 ${isLeft ? 'text-right' : 'text-left'}`}>
                                {/* Sender Name */}
                                <div className={`flex items-center gap-2 mb-1 ${isLeft ? 'flex-row-reverse' : ''}`}>
                                  <span className="text-xs font-semibold" style={{ color: config.color }}>
                                    {message.sender_name}
                                  </span>
                                  <span className="text-xs text-[#AEAEB2]">
                                    {config.label}
                                  </span>
                                </div>

                                {/* Content */}
                                <p className="text-sm text-[#1D1D1F] whitespace-pre-wrap">{message.content}</p>

                                {/* AI Question Context */}
                                {message.is_ai_response && message.ai_question && (
                                  <p className="text-xs mt-2 text-[#86868B] italic">
                                    Q: "{message.ai_question}"
                                  </p>
                                )}

                                {/* Attachments */}
                                {message.attachments && message.attachments.length > 0 && (
                                  <div className={`flex gap-2 mt-2 flex-wrap ${isLeft ? 'justify-end' : 'justify-start'}`}>
                                    {message.attachments.map((att, idx) => (
                                      <button
                                        key={idx}
                                        onClick={() => openAttachmentViewer(att)}
                                        className="rounded-lg bg-[#F5F5F7] overflow-hidden cursor-pointer hover:ring-2 hover:ring-[#007AFF] transition-all"
                                      >
                                        {att.type === 'photo' ? (
                                          <img
                                            src={att.thumbnail_url || att.url}
                                            alt={att.name || ''}
                                            className="w-16 h-16 object-cover hover:opacity-80 transition-opacity"
                                          />
                                        ) : (
                                          <div className="flex items-center gap-2 px-3 py-2 text-xs text-[#007AFF] hover:bg-[#E5E5EA] transition-colors">
                                            <FileText className="w-4 h-4" />
                                            <span className="truncate max-w-[100px]">{att.name || 'File'}</span>
                                          </div>
                                        )}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                              {/* Center Time + Dot */}
                              <div className="absolute left-1/2 -translate-x-1/2 top-1 z-10 flex flex-col items-center">
                                {/* Time label above dot */}
                                <span
                                  className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white shadow-sm border mb-1"
                                  style={{ color: config.color, borderColor: config.color }}
                                >
                                  {formatMessageDate(message.created_at)}
                                </span>
                                {/* Dot */}
                                <div
                                  className="w-3 h-3 rounded-full border-2 border-white shadow-sm"
                                  style={{ backgroundColor: config.color }}
                                />
                              </div>

                              {/* Connector Line */}
                              <div
                                className={`absolute top-8 w-[calc(8.33%-8px)] h-0.5 ${
                                  isLeft ? 'right-1/2 mr-2' : 'left-1/2 ml-2'
                                }`}
                                style={{ backgroundColor: `${config.color}40` }}
                              />

                              {/* Empty space on opposite side */}
                              <div className="w-5/12" />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {/* End of timeline marker */}
            <div className="relative flex justify-center mt-8">
              <div className="w-3 h-3 rounded-full bg-[#D2D2D7] relative z-10" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* AI Response Preview (before saving) */}
      {aiResponse && (
        <div className="px-4 py-3 border-t border-[#E5E5EA] bg-[#AF52DE]/5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[#AF52DE]/20 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-[#AF52DE]" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-[#AF52DE] font-medium mb-1">AI Response (Preview)</p>
              <p className="text-sm text-[#1D1D1F] whitespace-pre-wrap">{aiResponse.answer}</p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleDiscardAiResponse}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-[#6E6E73] hover:bg-[#F5F5F7] rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                  Discard
                </button>
                <button
                  onClick={handleSaveAiResponse}
                  disabled={savingAiResponse}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-[#AF52DE] hover:bg-[#9A3FCA] rounded-lg transition-colors disabled:opacity-50"
                >
                  {savingAiResponse ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Save to Timeline
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attachment Preview */}
      {attachments.length > 0 && (
        <div className="px-4 py-2 border-t border-[#E5E5EA] bg-[#F5F5F7]">
          <div className="flex items-center gap-2 flex-wrap">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-white border border-[#D2D2D7] rounded-lg px-2 py-1"
              >
                {file.type.startsWith('image/') ? (
                  <ImageIcon className="w-4 h-4 text-[#007AFF]" />
                ) : (
                  <FileText className="w-4 h-4 text-[#FF9500]" />
                )}
                <span className="text-xs text-[#1D1D1F] truncate max-w-[100px]">{file.name}</span>
                <button
                  onClick={() => removeAttachment(index)}
                  className="p-0.5 hover:bg-[#F5F5F7] rounded"
                >
                  <X className="w-3 h-3 text-[#86868B]" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="px-4 py-3 border-t border-[#E5E5EA] bg-[#F5F5F7]">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* AI Asking Indicator */}
        {isAskingAI && (
          <div className="flex items-center gap-2 text-[#AF52DE] text-sm mb-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>AI is thinking...</span>
          </div>
        )}

        {/* Uploading Indicator */}
        {uploading && (
          <div className="flex items-center gap-2 text-[#007AFF] text-sm mb-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Uploading attachments...</span>
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* Text Input with Paperclip */}
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="w-full bg-white border border-[#D2D2D7] rounded-xl px-4 py-3 pl-12 pr-4 text-[#1D1D1F] placeholder-[#86868B] focus:outline-none focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF] resize-none text-sm"
              style={{ minHeight: '44px', maxHeight: '120px' }}
            />
            {/* Paperclip icon inside input */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-[#F5F5F7] transition-colors"
              title="Attach files"
            >
              <Paperclip className="w-5 h-5 text-[#86868B]" />
            </button>
          </div>

          {/* Ask AI Button */}
          <button
            onClick={handleAskAI}
            disabled={!inputValue.trim() || isAskingAI}
            className="p-3 rounded-xl bg-[#AF52DE] text-white hover:bg-[#9A3FCA] transition-colors disabled:opacity-40 disabled:hover:bg-[#AF52DE]"
            title="Ask AI (only you see the question)"
          >
            <Sparkles className="w-5 h-5" />
          </button>

          {/* Send Button */}
          <button
            onClick={handleSendMessage}
            disabled={(!inputValue.trim() && attachments.length === 0) || sending}
            className="p-3 rounded-xl bg-[#007AFF] text-white hover:bg-[#0056B3] transition-colors disabled:opacity-40 disabled:hover:bg-[#007AFF]"
          >
            {sending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Helper Text */}
        <p className="text-xs text-[#AEAEB2] mt-2">
          <span className="text-[#007AFF]">↵ Enter</span> to send •{' '}
          <span className="text-[#AF52DE]">✨ AI</span> questions are private until you save •{' '}
          <span className="text-[#86868B]">📎</span> attach files
          {!isLotLevel && <span className="ml-1">• Site-wide updates for supervisors</span>}
        </p>
      </div>

      {/* Document/Image Viewer Modal */}
      {viewerOpen && viewerAttachment && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={closeViewer}
        >
          <div
            className="relative max-w-5xl max-h-[90vh] w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={closeViewer}
              className="absolute -top-12 right-0 text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            {/* File name */}
            {viewerAttachment.name && (
              <div className="absolute -top-12 left-0 text-white/80 text-sm truncate max-w-[70%]">
                {viewerAttachment.name}
              </div>
            )}

            {/* Content */}
            <div className="bg-white rounded-xl overflow-hidden shadow-2xl">
              {viewerAttachment.type === 'photo' ? (
                <img
                  src={viewerAttachment.url}
                  alt={viewerAttachment.name || 'Image'}
                  className="max-w-full max-h-[80vh] object-contain mx-auto"
                />
              ) : viewerAttachment.url.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={viewerAttachment.url}
                  className="w-full h-[80vh]"
                  title={viewerAttachment.name || 'Document'}
                />
              ) : (
                <div className="p-8 text-center">
                  <FileText className="w-16 h-16 text-[#86868B] mx-auto mb-4" />
                  <p className="text-lg font-medium text-[#1D1D1F] mb-2">
                    {viewerAttachment.name || 'Document'}
                  </p>
                  <p className="text-sm text-[#86868B] mb-4">
                    Preview not available for this file type
                  </p>
                  <a
                    href={viewerAttachment.url}
                    download
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#007AFF] text-white rounded-lg hover:bg-[#0056B3] transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    Download File
                  </a>
                </div>
              )}
            </div>

            {/* Download button for images and PDFs */}
            {(viewerAttachment.type === 'photo' || viewerAttachment.url.toLowerCase().endsWith('.pdf')) && (
              <div className="absolute -bottom-12 right-0 flex gap-2">
                <a
                  href={viewerAttachment.url}
                  download
                  className="text-white/80 hover:text-white text-sm flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Download
                </a>
                <a
                  href={viewerAttachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/80 hover:text-white text-sm flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  Open in new tab ↗
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
