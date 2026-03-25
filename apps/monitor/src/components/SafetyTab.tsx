'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import {
  ShieldAlert, AlertTriangle, Bell, Upload, CheckCircle2, Clock,
  ChevronDown, Users, Loader2, X, FileText, Camera
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import {
  listSafetyChecks,
  createSafetyCheck,
  resolveSafetyCheck,
  listWarnings,
  resolveWarning,
  listExpiringCertifications,
  verifyCertification,
  FRAMING_PHASES,
  CERT_TYPES,
} from '@onsite/framing'
import type {
  FrmSafetyCheck,
  FrmWarning,
  FrmCertification,
  PhaseId,
  WarningCategory,
} from '@onsite/framing'
import { formatDistanceToNow } from 'date-fns'
import WarningComposer from './WarningComposer'

interface SafetyTabProps {
  lotId: string
  jobsiteId: string
}

const PHASE_MAP = Object.fromEntries(FRAMING_PHASES.map(p => [p.id, p.name]))

const CERT_LABEL_MAP = Object.fromEntries(CERT_TYPES.map(c => [c.code, c.label]))

const WARNING_CATEGORY_COLORS: Record<WarningCategory, { bg: string; text: string; border: string }> = {
  safety: { bg: '#FFF5F5', text: '#FF3B30', border: '#FF3B30' },
  compliance: { bg: '#FFFBEB', text: '#B45309', border: '#FF9500' },
  operational: { bg: '#EFF6FF', text: '#1D4ED8', border: '#007AFF' },
}

const PRIORITY_BADGE: Record<string, { bg: string; text: string }> = {
  critical: { bg: '#FF3B30', text: '#FFFFFF' },
  warning: { bg: '#FF9500', text: '#FFFFFF' },
  info: { bg: '#007AFF', text: '#FFFFFF' },
}

export default function SafetyTab({ lotId, jobsiteId }: SafetyTabProps) {
  // --- State ---
  const [openChecks, setOpenChecks] = useState<FrmSafetyCheck[]>([])
  const [resolvedChecks, setResolvedChecks] = useState<FrmSafetyCheck[]>([])
  const [activeWarnings, setActiveWarnings] = useState<FrmWarning[]>([])
  const [resolvedWarnings, setResolvedWarnings] = useState<FrmWarning[]>([])
  const [expiringCerts, setExpiringCerts] = useState<(FrmCertification & { worker: { id: string; full_name: string; email: string } })[]>([])
  const [loading, setLoading] = useState(true)

  // Resolve form
  const [resolvingCheckId, setResolvingCheckId] = useState<string | null>(null)
  const [resolvePhoto, setResolvePhoto] = useState<File | null>(null)
  const [resolvePhotoPreview, setResolvePhotoPreview] = useState<string | null>(null)
  const [resolveNote, setResolveNote] = useState('')
  const [resolvingSubmit, setResolvingSubmit] = useState(false)
  const resolveFileRef = useRef<HTMLInputElement>(null)

  // New safety check form
  const [showNewCheck, setShowNewCheck] = useState(false)
  const [newType, setNewType] = useState('')
  const [newPhase, setNewPhase] = useState<PhaseId | ''>('')
  const [newDescription, setNewDescription] = useState('')
  const [newPhoto, setNewPhoto] = useState<File | null>(null)
  const [newPhotoPreview, setNewPhotoPreview] = useState<string | null>(null)
  const [newSubmitting, setNewSubmitting] = useState(false)
  const [newError, setNewError] = useState<string | null>(null)
  const newFileRef = useRef<HTMLInputElement>(null)

  // Warning composer
  const [showWarningComposer, setShowWarningComposer] = useState(false)

  // Collapsed sections
  const [showHistory, setShowHistory] = useState(false)

  // Verifying cert
  const [verifyingCertId, setVerifyingCertId] = useState<string | null>(null)

  // Warning resolve
  const [resolvingWarningId, setResolvingWarningId] = useState<string | null>(null)

  // Error
  const [error, setError] = useState<string | null>(null)

  // --- Data Loading ---
  async function loadAll() {
    setLoading(true)
    try {
      const [open, resolved, warnings, resolvedW, certs] = await Promise.all([
        listSafetyChecks(supabase, lotId, 'open'),
        listSafetyChecks(supabase, lotId, 'resolved'),
        listWarnings(supabase, { lot_id: lotId, status: 'active' }),
        listWarnings(supabase, { lot_id: lotId, status: 'resolved' }),
        listExpiringCertifications(supabase, 30),
      ])
      setOpenChecks(open)
      setResolvedChecks(resolved)
      setActiveWarnings(warnings)
      setResolvedWarnings(resolvedW)
      setExpiringCerts(certs)
    } catch (err) {
      console.error('SafetyTab load error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()

    // Realtime subscriptions
    const safetyChannel = supabase
      .channel(`safety_tab_checks_${lotId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'frm_safety_checks',
        filter: `lot_id=eq.${lotId}`,
      }, () => {
        loadAll()
      })
      .subscribe()

    const warningsChannel = supabase
      .channel(`safety_tab_warnings_${lotId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'frm_warnings',
        filter: `lot_id=eq.${lotId}`,
      }, () => {
        loadAll()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(safetyChannel)
      supabase.removeChannel(warningsChannel)
    }
  }, [lotId])

  // --- Handlers ---

  async function handleResolveCheck() {
    if (!resolvingCheckId || !resolvePhoto) return
    setResolvingSubmit(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Upload resolve photo
      const ext = resolvePhoto.name.split('.').pop() || 'jpg'
      const path = `safety/${lotId}/${Date.now()}_resolve_${Math.random().toString(36).slice(2)}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('frm-media')
        .upload(path, resolvePhoto)
      if (uploadErr) throw uploadErr

      const { data: { publicUrl } } = supabase.storage
        .from('frm-media')
        .getPublicUrl(path)

      await resolveSafetyCheck(supabase, resolvingCheckId, user.id, publicUrl)

      // Reset form
      setResolvingCheckId(null)
      setResolvePhoto(null)
      setResolvePhotoPreview(null)
      setResolveNote('')
      loadAll()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to resolve')
    } finally {
      setResolvingSubmit(false)
    }
  }

  async function handleCreateCheck(e: React.FormEvent) {
    e.preventDefault()
    setNewError(null)

    if (!newType.trim()) {
      setNewError('Type is required')
      return
    }
    if (!newPhoto) {
      setNewError('Photo is required for safety checks')
      return
    }

    setNewSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Upload photo
      const ext = newPhoto.name.split('.').pop() || 'jpg'
      const path = `safety/${lotId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('frm-media')
        .upload(path, newPhoto)
      if (uploadErr) throw uploadErr

      const { data: { publicUrl } } = supabase.storage
        .from('frm-media')
        .getPublicUrl(path)

      await createSafetyCheck(
        supabase,
        {
          lot_id: lotId,
          phase_id: newPhase ? (newPhase as PhaseId) : undefined,
          type: newType.trim(),
          description: newDescription.trim() || undefined,
          photo_url: publicUrl,
        },
        user.id,
      )

      // Reset form
      setShowNewCheck(false)
      setNewType('')
      setNewPhase('')
      setNewDescription('')
      setNewPhoto(null)
      setNewPhotoPreview(null)
      loadAll()
    } catch (err: unknown) {
      setNewError(err instanceof Error ? err.message : 'Failed to create safety check')
    } finally {
      setNewSubmitting(false)
    }
  }

  async function handleResolveWarning(warningId: string) {
    setResolvingWarningId(warningId)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      await resolveWarning(supabase, warningId, user.id)
      loadAll()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to resolve warning')
    } finally {
      setResolvingWarningId(null)
    }
  }

  async function handleVerifyCert(certId: string) {
    setVerifyingCertId(certId)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      await verifyCertification(supabase, certId, user.id)
      loadAll()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to verify certification')
    } finally {
      setVerifyingCertId(null)
    }
  }

  function handleNewPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setNewPhoto(file)
    const reader = new FileReader()
    reader.onload = () => setNewPhotoPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  function handleResolvePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setResolvePhoto(file)
    const reader = new FileReader()
    reader.onload = () => setResolvePhotoPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  function getCertStatusBadge(cert: FrmCertification & { worker: { id: string; full_name: string; email: string } }) {
    if (!cert.expires_at) return { color: '#34C759', label: 'Valid' }
    const now = new Date()
    const expires = new Date(cert.expires_at)
    if (expires < now) return { color: '#FF3B30', label: 'Expired' }
    const daysLeft = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (daysLeft <= 7) return { color: '#FF3B30', label: `${daysLeft}d left` }
    if (daysLeft <= 30) return { color: '#FF9500', label: `${daysLeft}d left` }
    return { color: '#34C759', label: 'Valid' }
  }

  // --- Render ---

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-[#FF3B30] animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Global error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-[#FFE5E5] rounded-lg">
          <AlertTriangle className="w-4 h-4 text-[#FF3B30] flex-shrink-0" />
          <span className="text-sm text-[#FF3B30]">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4 text-[#FF3B30]" />
          </button>
        </div>
      )}

      {/* =============== SECTION 1: Active Safety Checks =============== */}
      <div className="rounded-xl border border-[#E5E5EA] overflow-hidden bg-white">
        <div className="px-5 py-4 flex items-center justify-between border-b border-[#E5E5EA]" style={{ backgroundColor: openChecks.length > 0 ? '#FFF5F5' : '#F0FFF5' }}>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5" style={{ color: openChecks.length > 0 ? '#FF3B30' : '#34C759' }} />
            <h3 className="text-base font-semibold text-[#1D1D1F]">Active Safety Checks</h3>
          </div>
          {openChecks.length > 0 ? (
            <span className="px-2.5 py-1 bg-[#FF3B30] text-white text-xs font-bold rounded-full">
              {openChecks.length}
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2.5 py-1 bg-[#34C759] text-white text-xs font-bold rounded-full">
              <CheckCircle2 className="w-3 h-3" />
              Clear
            </span>
          )}
        </div>

        {openChecks.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <CheckCircle2 className="w-8 h-8 text-[#34C759] mx-auto mb-2" />
            <p className="text-sm text-[#8E8E93]">No open safety checks</p>
          </div>
        ) : (
          <div className="divide-y divide-[#F2E5E5]">
            {openChecks.map(check => {
              const isResolving = resolvingCheckId === check.id
              return (
                <div key={check.id} className="bg-white" style={{ borderLeft: '4px solid #FF3B30' }}>
                  <div className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      {/* Thumbnail */}
                      <div className="w-14 h-14 rounded-lg overflow-hidden bg-[#FFE5E5] flex-shrink-0 border border-[#FFD0D0]">
                        {check.photo_url ? (
                          <img src={check.photo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Camera className="w-5 h-5 text-[#FF9999]" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-[#1D1D1F]">{check.type}</span>
                          <span className="px-2 py-0.5 bg-[#FF3B30] text-white text-[10px] font-bold rounded-full uppercase">
                            Blocking
                          </span>
                        </div>
                        {check.phase_id && (
                          <span className="text-xs text-[#8E8E93]">{PHASE_MAP[check.phase_id] ?? check.phase_id}</span>
                        )}
                        {check.description && (
                          <p className="text-sm text-[#3C3C43] mt-1">{check.description}</p>
                        )}
                        <div className="flex items-center gap-1 mt-1.5">
                          <Clock className="w-3 h-3 text-[#C7C7CC]" />
                          <span className="text-xs text-[#C7C7CC]">
                            {formatDistanceToNow(new Date(check.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>

                      {!isResolving && (
                        <button
                          onClick={() => setResolvingCheckId(check.id)}
                          className="px-3 py-1.5 text-xs font-medium text-[#34C759] border border-[#34C759] rounded-lg hover:bg-[#F0FFF5] transition-colors flex-shrink-0"
                        >
                          Resolve
                        </button>
                      )}
                    </div>

                    {/* Inline resolve form */}
                    {isResolving && (
                      <div className="mt-4 p-4 bg-[#F2F2F7] rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-[#1D1D1F]">Resolve Safety Check</span>
                          <button onClick={() => { setResolvingCheckId(null); setResolvePhoto(null); setResolvePhotoPreview(null); setResolveNote('') }}>
                            <X className="w-4 h-4 text-[#8E8E93]" />
                          </button>
                        </div>

                        {/* Photo upload */}
                        <div>
                          <label className="block text-xs font-medium text-[#1D1D1F] mb-1">
                            Photo proof <span className="text-[#FF3B30]">*</span>
                          </label>
                          <input
                            ref={resolveFileRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleResolvePhotoChange}
                            className="hidden"
                          />
                          {resolvePhotoPreview ? (
                            <div className="relative">
                              <img src={resolvePhotoPreview} alt="Preview" className="w-full h-32 object-cover rounded-lg border border-[#D2D2D7]" />
                              <button
                                type="button"
                                onClick={() => { setResolvePhoto(null); setResolvePhotoPreview(null); if (resolveFileRef.current) resolveFileRef.current.value = '' }}
                                className="absolute top-1.5 right-1.5 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => resolveFileRef.current?.click()}
                              className="w-full py-5 border-2 border-dashed border-[#D2D2D7] rounded-lg flex flex-col items-center gap-1.5 hover:border-[#34C759] hover:bg-[#F0FFF5] transition-colors"
                            >
                              <Upload className="w-5 h-5 text-[#8E8E93]" />
                              <span className="text-xs text-[#8E8E93]">Upload resolution photo</span>
                            </button>
                          )}
                        </div>

                        {/* Note */}
                        <textarea
                          value={resolveNote}
                          onChange={e => setResolveNote(e.target.value)}
                          placeholder="Resolution note (optional)..."
                          rows={2}
                          className="w-full px-3 py-2 border border-[#D2D2D7] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#34C759] resize-none bg-white"
                        />

                        <div className="flex gap-2">
                          <button
                            onClick={() => { setResolvingCheckId(null); setResolvePhoto(null); setResolvePhotoPreview(null); setResolveNote('') }}
                            className="flex-1 py-2 text-sm font-medium text-[#1D1D1F] bg-white border border-[#D2D2D7] rounded-lg hover:bg-[#F9F9FB] transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleResolveCheck}
                            disabled={resolvingSubmit || !resolvePhoto}
                            className="flex-1 py-2 text-sm font-medium text-white bg-[#34C759] rounded-lg hover:bg-[#2DA44E] transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                          >
                            {resolvingSubmit ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            {resolvingSubmit ? 'Resolving...' : 'Confirm'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* =============== SECTION 2: Report Safety Issue =============== */}
      <div className="rounded-xl border border-[#E5E5EA] overflow-hidden bg-white">
        <button
          onClick={() => setShowNewCheck(!showNewCheck)}
          className="w-full px-5 py-4 flex items-center justify-between hover:bg-[#F9F9FB] transition-colors"
        >
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#FF3B30]" />
            <h3 className="text-base font-semibold text-[#1D1D1F]">Report Safety Issue</h3>
          </div>
          <ChevronDown className={`w-5 h-5 text-[#8E8E93] transition-transform ${showNewCheck ? 'rotate-180' : ''}`} />
        </button>

        {showNewCheck && (
          <form onSubmit={handleCreateCheck} className="px-5 pb-5 space-y-4 border-t border-[#E5E5EA]">
            <div className="pt-4">
              {/* Safety callout */}
              <div className="flex items-center gap-2 p-3 bg-[#FFE5E5] rounded-lg mb-4">
                <ShieldAlert className="w-4 h-4 text-[#FF3B30] flex-shrink-0" />
                <span className="text-sm text-[#FF3B30] font-medium">
                  Safety checks are automatically blocking and require photo proof to resolve.
                </span>
              </div>

              {/* Type */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-[#1D1D1F] mb-1.5">Type <span className="text-[#FF3B30]">*</span></label>
                <input
                  type="text"
                  value={newType}
                  onChange={e => setNewType(e.target.value)}
                  placeholder="e.g. Fall hazard, Exposed nails, Missing guardrail"
                  className="w-full px-3 py-2 border border-[#D2D2D7] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF3B30]"
                />
              </div>

              {/* Phase */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-[#1D1D1F] mb-1.5">Phase</label>
                <select
                  value={newPhase}
                  onChange={e => setNewPhase(e.target.value as PhaseId | '')}
                  className="w-full px-3 py-2 border border-[#D2D2D7] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF3B30] bg-white"
                >
                  <option value="">No phase selected</option>
                  {FRAMING_PHASES.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Photo */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-[#1D1D1F] mb-1.5">
                  Photo <span className="text-[#FF3B30]">*</span>
                </label>
                <input
                  ref={newFileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleNewPhotoChange}
                  className="hidden"
                />
                {newPhotoPreview ? (
                  <div className="relative">
                    <img src={newPhotoPreview} alt="Preview" className="w-full h-48 object-cover rounded-lg border border-[#D2D2D7]" />
                    <button
                      type="button"
                      onClick={() => { setNewPhoto(null); setNewPhotoPreview(null); if (newFileRef.current) newFileRef.current.value = '' }}
                      className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full text-white hover:bg-black/70"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => newFileRef.current?.click()}
                    className="w-full py-8 border-2 border-dashed border-[#D2D2D7] rounded-lg flex flex-col items-center gap-2 hover:border-[#FF3B30] hover:bg-[#FFF5F5] transition-colors"
                  >
                    <div className="p-3 bg-[#FFE5E5] rounded-full">
                      <Camera className="w-6 h-6 text-[#FF3B30]" />
                    </div>
                    <span className="text-sm text-[#8E8E93]">Click to capture or upload photo</span>
                  </button>
                )}
              </div>

              {/* Description */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-[#1D1D1F] mb-1.5">Description</label>
                <textarea
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  placeholder="Describe the safety issue..."
                  rows={3}
                  className="w-full px-3 py-2 border border-[#D2D2D7] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF3B30] resize-none"
                />
              </div>

              {/* Error */}
              {newError && (
                <div className="flex items-center gap-2 p-3 bg-[#FFE5E5] rounded-lg mb-4">
                  <AlertTriangle className="w-4 h-4 text-[#FF3B30] flex-shrink-0" />
                  <span className="text-sm text-[#FF3B30]">{newError}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowNewCheck(false); setNewType(''); setNewPhase(''); setNewDescription(''); setNewPhoto(null); setNewPhotoPreview(null); setNewError(null) }}
                  className="flex-1 py-2.5 text-sm font-medium text-[#1D1D1F] bg-[#F2F2F7] rounded-lg hover:bg-[#E5E5EA] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={newSubmitting}
                  className="flex-1 py-2.5 text-sm font-medium text-white bg-[#FF3B30] rounded-lg hover:bg-[#D63028] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {newSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Reporting...
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-4 h-4" />
                      Report Safety Issue
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* =============== SECTION 3: Active Warnings =============== */}
      <div className="rounded-xl border border-[#E5E5EA] overflow-hidden bg-white">
        <div className="px-5 py-4 flex items-center justify-between border-b border-[#E5E5EA]">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#FF9500]" />
            <h3 className="text-base font-semibold text-[#1D1D1F]">Active Warnings</h3>
          </div>
          {activeWarnings.length > 0 && (
            <span className="px-2.5 py-1 bg-[#FF9500] text-white text-xs font-bold rounded-full">
              {activeWarnings.length}
            </span>
          )}
        </div>

        {activeWarnings.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <CheckCircle2 className="w-8 h-8 text-[#34C759] mx-auto mb-2" />
            <p className="text-sm text-[#8E8E93]">No active warnings</p>
          </div>
        ) : (
          <div className="divide-y divide-[#E5E5EA]">
            {activeWarnings.map(warning => {
              const catColors = WARNING_CATEGORY_COLORS[warning.category]
              const priBadge = PRIORITY_BADGE[warning.priority]
              const isResolvingThis = resolvingWarningId === warning.id

              return (
                <div
                  key={warning.id}
                  className="px-5 py-4"
                  style={{ borderLeft: `4px solid ${catColors.border}`, backgroundColor: catColors.bg }}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-[#1D1D1F]">{warning.title}</span>
                        <span
                          className="px-2 py-0.5 text-[10px] font-bold rounded-full uppercase"
                          style={{ backgroundColor: priBadge.bg, color: priBadge.text }}
                        >
                          {warning.priority}
                        </span>
                        <span
                          className="px-2 py-0.5 text-[10px] font-medium rounded-full capitalize"
                          style={{ backgroundColor: `${catColors.border}20`, color: catColors.text }}
                        >
                          {warning.category}
                        </span>
                      </div>
                      {warning.description && (
                        <p className="text-sm text-[#3C3C43] mb-1.5">{warning.description}</p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-[#8E8E93]">
                        <span className="flex items-center gap-1 capitalize">
                          <Users className="w-3 h-3" />
                          {warning.target_type}
                          {warning.target_id && `: ${warning.target_id.slice(0, 8)}`}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(warning.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleResolveWarning(warning.id)}
                      disabled={isResolvingThis}
                      className="px-3 py-1.5 text-xs font-medium text-[#34C759] border border-[#34C759] rounded-lg hover:bg-[#F0FFF5] transition-colors flex-shrink-0 disabled:opacity-50 flex items-center gap-1"
                    >
                      {isResolvingThis ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                      Resolve
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* =============== SECTION 4: Send Warning =============== */}
      <div className="rounded-xl border border-[#E5E5EA] overflow-hidden bg-white">
        <button
          onClick={() => setShowWarningComposer(true)}
          className="w-full px-5 py-4 flex items-center justify-between hover:bg-[#F9F9FB] transition-colors"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-[#FF9500]" />
            <h3 className="text-base font-semibold text-[#1D1D1F]">Send Warning</h3>
          </div>
          <span className="px-3 py-1 text-xs font-medium text-[#007AFF] bg-[#EFF6FF] rounded-full">
            Compose
          </span>
        </button>
      </div>

      {showWarningComposer && (
        <WarningComposer
          lotId={lotId}
          jobsiteId={jobsiteId}
          onClose={() => setShowWarningComposer(false)}
          onCreated={() => { setShowWarningComposer(false); loadAll() }}
        />
      )}

      {/* =============== SECTION 5: Certifications =============== */}
      <div className="rounded-xl border border-[#E5E5EA] overflow-hidden bg-white">
        <div className="px-5 py-4 flex items-center justify-between border-b border-[#E5E5EA]">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#007AFF]" />
            <h3 className="text-base font-semibold text-[#1D1D1F]">Certifications</h3>
          </div>
          {expiringCerts.length > 0 && (
            <span className="px-2.5 py-1 bg-[#FF9500] text-white text-xs font-bold rounded-full">
              {expiringCerts.length} expiring
            </span>
          )}
        </div>

        {expiringCerts.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <CheckCircle2 className="w-8 h-8 text-[#34C759] mx-auto mb-2" />
            <p className="text-sm text-[#8E8E93]">No certifications expiring within 30 days</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F2F2F7] text-left">
                  <th className="px-5 py-2.5 text-xs font-semibold text-[#8E8E93] uppercase tracking-wide">Worker</th>
                  <th className="px-5 py-2.5 text-xs font-semibold text-[#8E8E93] uppercase tracking-wide">Certification</th>
                  <th className="px-5 py-2.5 text-xs font-semibold text-[#8E8E93] uppercase tracking-wide">Expires</th>
                  <th className="px-5 py-2.5 text-xs font-semibold text-[#8E8E93] uppercase tracking-wide">Status</th>
                  <th className="px-5 py-2.5 text-xs font-semibold text-[#8E8E93] uppercase tracking-wide"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5EA]">
                {expiringCerts.map(cert => {
                  const badge = getCertStatusBadge(cert)
                  const isVerifying = verifyingCertId === cert.id
                  return (
                    <tr key={cert.id} className="hover:bg-[#F9F9FB]">
                      <td className="px-5 py-3">
                        <span className="text-sm font-medium text-[#1D1D1F]">{cert.worker.full_name}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-sm text-[#3C3C43]">{CERT_LABEL_MAP[cert.cert_type] ?? cert.cert_type}</span>
                      </td>
                      <td className="px-5 py-3">
                        {cert.expires_at ? (
                          <span className="text-sm text-[#3C3C43]">
                            {new Date(cert.expires_at).toLocaleDateString('en-CA')}
                          </span>
                        ) : (
                          <span className="text-sm text-[#8E8E93]">No expiry</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ backgroundColor: `${badge.color}20`, color: badge.color }}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => handleVerifyCert(cert.id)}
                          disabled={isVerifying}
                          className="px-3 py-1.5 text-xs font-medium text-[#007AFF] border border-[#007AFF] rounded-lg hover:bg-[#EFF6FF] transition-colors disabled:opacity-50 flex items-center gap-1"
                        >
                          {isVerifying ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                          Verify
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =============== SECTION 6: Resolved History =============== */}
      {(resolvedChecks.length > 0 || resolvedWarnings.length > 0) && (
        <div className="rounded-xl border border-[#E5E5EA] overflow-hidden bg-white">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-[#F9F9FB] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#8E8E93]" />
              <h3 className="text-base font-medium text-[#8E8E93]">
                Resolved History ({resolvedChecks.length + resolvedWarnings.length})
              </h3>
            </div>
            <ChevronDown className={`w-5 h-5 text-[#C7C7CC] transition-transform ${showHistory ? 'rotate-180' : ''}`} />
          </button>

          {showHistory && (
            <div className="border-t border-[#E5E5EA]">
              {/* Resolved safety checks */}
              {resolvedChecks.length > 0 && (
                <div>
                  <div className="px-5 py-2 bg-[#F9F9FB]">
                    <span className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wide">
                      Safety Checks ({resolvedChecks.length})
                    </span>
                  </div>
                  <div className="divide-y divide-[#F2F2F7]">
                    {resolvedChecks.map(check => (
                      <div key={check.id} className="px-5 py-2.5 flex items-center gap-3 opacity-60">
                        <CheckCircle2 className="w-4 h-4 text-[#34C759] flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[#8E8E93] truncate line-through">{check.type}</p>
                          {check.description && (
                            <p className="text-xs text-[#C7C7CC] truncate line-through">{check.description}</p>
                          )}
                        </div>
                        {check.resolved_at && (
                          <span className="text-xs text-[#C7C7CC] flex-shrink-0">
                            {formatDistanceToNow(new Date(check.resolved_at), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Resolved warnings */}
              {resolvedWarnings.length > 0 && (
                <div>
                  <div className="px-5 py-2 bg-[#F9F9FB]">
                    <span className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wide">
                      Warnings ({resolvedWarnings.length})
                    </span>
                  </div>
                  <div className="divide-y divide-[#F2F2F7]">
                    {resolvedWarnings.map(warning => (
                      <div key={warning.id} className="px-5 py-2.5 flex items-center gap-3 opacity-60">
                        <CheckCircle2 className="w-4 h-4 text-[#34C759] flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[#8E8E93] truncate line-through">{warning.title}</p>
                          <span className="text-xs text-[#C7C7CC] capitalize">{warning.category}</span>
                        </div>
                        {warning.resolved_at && (
                          <span className="text-xs text-[#C7C7CC] flex-shrink-0">
                            {formatDistanceToNow(new Date(warning.resolved_at), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
