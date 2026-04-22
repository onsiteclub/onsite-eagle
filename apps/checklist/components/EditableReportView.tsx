'use client'

import { useState, useCallback } from 'react'
import PhotoLightbox from './PhotoLightbox'
import PhotoCaptureLocal from './PhotoCaptureLocal'
import { createClient } from '@onsite/supabase/client'
import { updateSharedReport } from '@/lib/client/reports'

interface ReportItem {
  id: string
  item_code: string
  item_label: string
  sort_order: number
  is_blocking: boolean
  result: 'pass' | 'fail' | 'na'
  notes: string | null
  photo_urls: string[]
}

interface HistoryEntry {
  name: string
  at: string
  changes: Array<{
    item_code: string
    item_label: string
    field: string
    from: string
    to: string
  }>
}

interface Report {
  token: string
  reference: string
  inspector_name: string
  inspector_company: string | null
  jobsite: string
  lot_number: string
  transition: string
  transition_label: string
  passed: boolean
  total_items: number
  pass_count: number
  fail_count: number
  na_count: number
  total_photos: number
  completed_at: string
  updated_at: string
  updated_by: string | null
  edit_history: HistoryEntry[]
  items: ReportItem[]
}

interface EditableReportViewProps {
  report: Report
}

export default function EditableReportView({ report: initialReport }: EditableReportViewProps) {
  const [report, setReport] = useState(initialReport)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editorName, setEditorName] = useState('')
  const [showNamePrompt, setShowNamePrompt] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [editState, setEditState] = useState<Record<string, {
    result: 'pass' | 'fail' | 'na'
    notes: string
    newPhotos: string[]
    showNotes: boolean
  }>>({})
  const [lightbox, setLightbox] = useState<{ photos: string[]; index: number } | null>(null)
  const [copied, setCopied] = useState(false)

  const startEditing = useCallback(() => {
    const state: typeof editState = {}
    report.items.forEach((item) => {
      state[item.id] = {
        result: item.result,
        notes: item.notes || '',
        newPhotos: [],
        showNotes: !!item.notes,
      }
    })
    setEditState(state)
    setEditing(true)
  }, [report.items])

  const cancelEditing = () => {
    setEditing(false)
    setEditState({})
  }

  const handleSave = async () => {
    if (!editorName.trim()) {
      setShowNamePrompt(true)
      return
    }

    setSaving(true)
    try {
      const changedItems = report.items
        .filter((item) => {
          const edit = editState[item.id]
          if (!edit) return false
          return (
            edit.result !== item.result ||
            edit.notes !== (item.notes || '') ||
            edit.newPhotos.length > 0
          )
        })
        .map((item) => ({
          id: item.id,
          result: editState[item.id].result,
          notes: editState[item.id].notes || null,
          newPhotos: editState[item.id].newPhotos,
        }))

      if (changedItems.length === 0) {
        setEditing(false)
        return
      }

      await updateSharedReport(report.token, editorName.trim(), changedItems)

      const supabase = createClient()
      const { data: refreshedReport } = await supabase
        .from('frm_shared_reports')
        .select('*')
        .eq('token', report.token)
        .single()
      const { data: refreshedItems } = await supabase
        .from('frm_shared_report_items')
        .select('*')
        .eq('report_id', refreshedReport?.id)
        .order('sort_order', { ascending: true })
      if (refreshedReport) {
        setReport({ ...refreshedReport, items: refreshedItems ?? [] } as Report)
      }

      setEditing(false)
      setEditState({})
      setShowNamePrompt(false)
    } catch (err) {
      console.error('Save error:', err)
      alert('Failed to save changes. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const copyLink = async () => {
    const url = `${window.location.origin}/report?token=${report.token}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const passCount = report.items.filter((i) => i.result === 'pass').length
  const failCount = report.items.filter((i) => i.result === 'fail').length
  const naCount = report.items.filter((i) => i.result === 'na').length
  const totalPhotos = report.items.reduce((sum, i) => sum + i.photo_urls.length, 0)
  const history: HistoryEntry[] = Array.isArray(report.edit_history) ? report.edit_history : []

  return (
    <div className="min-h-screen bg-[#F5F5F4] flex flex-col items-center">
      {/* Dark Header */}
      <div className="w-full bg-[#1A1A1A] px-4 py-3 mb-6">
        <div className="max-w-[520px] mx-auto flex items-center gap-2">
          <div className="w-8 h-8 rounded-[10px] bg-[#C58B1B] flex items-center justify-center">
            <span className="text-white font-bold text-sm">GC</span>
          </div>
          <span className="font-semibold text-white text-[15px]">Gate Check</span>
        </div>
      </div>

      <div className="w-full max-w-[520px] px-4">
        {/* Report Header */}
        <div className="text-center mb-6">
          <p className="text-sm font-mono font-semibold text-[#C58B1B] mb-1">{report.reference}</p>
          <h1 className="text-4xl font-bold text-[#1A1A1A] mb-1">
            LOT: #{report.lot_number}
          </h1>
          <h2 className="text-xl font-semibold text-[#1A1A1A] mb-0.5">
            {report.inspector_name}
          </h2>
          <h2 className="text-lg text-[#888884] mb-0.5">
            {new Date(report.completed_at).toLocaleString('en-CA', {
              year: 'numeric', month: 'short', day: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </h2>
          <h3 className="text-sm text-[#B0AFA9]">
            {report.jobsite}
            {report.inspector_company ? ` \u2014 ${report.inspector_company}` : ''}
          </h3>
        </div>

        {/* Result Banner */}
        <div className={`
          rounded-[14px] p-5 text-center mb-4
          ${report.passed ? 'bg-[#D1FAE5] border border-[#16A34A]/30' : 'bg-[rgba(220,38,38,0.12)] border border-[#DC2626]/30'}
        `}>
          <div className="flex items-center justify-center gap-3">
            <span className={`text-3xl ${report.passed ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
              {report.passed ? '\u2713' : '\u2717'}
            </span>
            <span className={`text-2xl font-bold ${report.passed ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
              {report.passed ? 'PASSED' : 'FAILED'}
            </span>
          </div>
          <p className="text-[13px] text-[#1A1A1A] mt-1">{report.transition_label}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="text-center p-3 bg-[#D1FAE5] rounded-[14px]">
            <div className="text-lg font-bold text-[#16A34A]">{passCount}</div>
            <div className="text-xs text-[#888884]">Pass</div>
          </div>
          <div className="text-center p-3 bg-[rgba(220,38,38,0.12)] rounded-[14px]">
            <div className="text-lg font-bold text-[#DC2626]">{failCount}</div>
            <div className="text-xs text-[#888884]">Fail</div>
          </div>
          <div className="text-center p-3 bg-[#E5E5E3] rounded-[14px]">
            <div className="text-lg font-bold text-[#888884]">{naCount}</div>
            <div className="text-xs text-[#888884]">N/A</div>
          </div>
          <div className="text-center p-3 bg-[#FFF3D6] rounded-[14px]">
            <div className="text-lg font-bold text-[#C58B1B]">{totalPhotos}</div>
            <div className="text-xs text-[#888884]">Photos</div>
          </div>
        </div>

        {/* Edit History */}
        {history.length > 0 && (
          <div className="bg-white rounded-[14px] border border-[#D1D0CE] mb-4 overflow-hidden">
            <button
              onClick={() => setShowHistory((v) => !v)}
              className="w-full flex items-center justify-between px-5 py-3 text-xs font-semibold text-[#888884] hover:bg-[#F5F5F4] transition-colors"
            >
              <span>Edit History ({history.length} {history.length === 1 ? 'update' : 'updates'})</span>
              <span className="text-[#B0AFA9]">{showHistory ? '\u25B2' : '\u25BC'}</span>
            </button>
            {showHistory && (
              <div className="px-5 pb-4 space-y-4 border-t border-[#E5E5E3]">
                {[...history].reverse().map((entry, hi) => (
                  <div key={hi} className="pt-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-[#1A1A1A]">{entry.name}</span>
                      <span className="text-[10px] text-[#B0AFA9]">
                        {new Date(entry.at).toLocaleString('en-CA', {
                          month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {entry.changes.map((c, ci) => (
                        <div key={ci} className="text-[11px] text-[#888884] flex items-start gap-1.5">
                          <span className="text-[#B0AFA9] flex-shrink-0">&bull;</span>
                          <span>
                            {c.field === 'result' ? (
                              <>
                                <span className="font-mono text-[#1A1A1A]">{c.item_code}</span>
                                {' '}
                                <span className={resultColorClass(c.from)}>{c.from.toUpperCase()}</span>
                                {' \u2192 '}
                                <span className={resultColorClass(c.to)}>{c.to.toUpperCase()}</span>
                              </>
                            ) : c.field === 'notes' ? (
                              <>
                                <span className="font-mono text-[#1A1A1A]">{c.item_code}</span>
                                {' note: "'}
                                <span className="italic">{c.to || '(cleared)'}</span>
                                {'"'}
                              </>
                            ) : (
                              <>
                                <span className="font-mono text-[#1A1A1A]">{c.item_code}</span>
                                {' '}{c.to}
                              </>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Edit / Save controls */}
        <div className="flex gap-2 mb-4">
          {!editing ? (
            <button
              onClick={startEditing}
              className="flex-1 h-[52px] rounded-[14px] text-[15px] font-semibold border border-[#D1D0CE] text-[#888884] bg-white hover:bg-[#F5F5F4] transition-colors"
            >
              Edit Checklist
            </button>
          ) : (
            <>
              <button
                onClick={cancelEditing}
                className="flex-1 h-[52px] rounded-[14px] text-[15px] font-semibold border border-[#D1D0CE] text-[#888884] bg-white hover:bg-[#F5F5F4] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className={`flex-1 h-[52px] rounded-[14px] text-[15px] font-semibold transition-colors ${
                  saving ? 'bg-[#F5F5F4] text-[#B0AFA9]' : 'bg-[#C58B1B] text-white hover:bg-[#A67516]'
                }`}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          )}
        </div>

        {/* Name prompt modal */}
        {showNamePrompt && (
          <div className="fixed inset-0 z-40 bg-[rgba(26,26,26,0.6)] flex items-center justify-center px-4">
            <div className="bg-white rounded-[14px] p-6 w-full max-w-[360px]">
              <h3 className="text-[15px] font-bold text-[#1A1A1A] mb-3">Your name</h3>
              <p className="text-xs text-[#888884] mb-3">
                Enter your name to track who made this update.
              </p>
              <input
                type="text"
                value={editorName}
                onChange={(e) => setEditorName(e.target.value)}
                placeholder="e.g. John Smith"
                className="w-full h-[52px] border border-[#D1D0CE] rounded-[14px] px-3 text-[15px] text-[#1A1A1A] placeholder:text-[#B0AFA9] mb-4 focus:border-[#C58B1B] focus:outline-none"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowNamePrompt(false)}
                  className="flex-1 h-[52px] rounded-[14px] text-[15px] font-semibold border border-[#D1D0CE] text-[#888884] bg-white"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (editorName.trim()) {
                      setShowNamePrompt(false)
                      handleSave()
                    }
                  }}
                  disabled={!editorName.trim()}
                  className={`flex-1 h-[52px] rounded-[14px] text-[15px] font-semibold ${
                    editorName.trim() ? 'bg-[#C58B1B] text-white' : 'bg-[#F5F5F4] text-[#B0AFA9]'
                  }`}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Checklist Items */}
        <div className="space-y-3 mb-6">
          {report.items.map((item, index) => {
            const edit = editing ? editState[item.id] : null
            const result = edit?.result ?? item.result
            const notes = edit?.notes ?? item.notes ?? ''
            const showNotesToggle = editing && !edit?.showNotes && !notes

            return (
              <div
                key={item.id}
                className={`bg-white rounded-[14px] border transition-colors ${
                  result === 'pass' ? 'border-[#16A34A]/30' :
                  result === 'fail' ? 'border-[#DC2626]/30' :
                  'border-[#B0AFA9]/30'
                }`}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium bg-[#C58B1B] text-white flex-shrink-0 mt-0.5">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[15px] text-[#1A1A1A] leading-snug">{item.item_label}</p>
                        {item.is_blocking && (
                          <span className="text-[10px] font-semibold text-[#DC2626] bg-[rgba(220,38,38,0.12)] px-1.5 py-0.5 rounded flex-shrink-0">
                            BLOCKING
                          </span>
                        )}
                      </div>

                      {/* Result badge (view mode) or buttons (edit mode) */}
                      {!editing ? (
                        <span className={`inline-block mt-2 text-xs font-semibold px-2 py-1 rounded ${
                          result === 'pass' ? 'bg-[#D1FAE5] text-[#16A34A]' :
                          result === 'fail' ? 'bg-[rgba(220,38,38,0.12)] text-[#DC2626]' :
                          'bg-[#E5E5E3] text-[#888884]'
                        }`}>
                          {result === 'pass' ? 'PASS' : result === 'fail' ? 'FAIL' : 'N/A'}
                        </span>
                      ) : (
                        <div className="flex gap-2 mt-2">
                          {(['pass', 'fail', 'na'] as const).map((r) => (
                            <button
                              key={r}
                              onClick={() => setEditState((prev) => ({
                                ...prev,
                                [item.id]: { ...prev[item.id], result: r },
                              }))}
                              className={`flex-1 h-[52px] rounded-[14px] text-xs font-semibold border transition-all ${
                                result === r
                                  ? r === 'pass' ? 'bg-[#D1FAE5] border-[#16A34A] text-[#16A34A]'
                                    : r === 'fail' ? 'bg-[rgba(220,38,38,0.12)] border-[#DC2626] text-[#DC2626]'
                                    : 'bg-[#E5E5E3] border-[#B0AFA9] text-[#888884]'
                                  : 'bg-[#F5F5F4] border-[#D1D0CE] text-[#888884]'
                              }`}
                            >
                              {r === 'pass' ? '\u2713 Pass' : r === 'fail' ? '\u2717 Fail' : 'N/A'}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* + Add Note button (mobile-friendly, full width) */}
                  {showNotesToggle && (
                    <button
                      onClick={() => setEditState((prev) => ({
                        ...prev,
                        [item.id]: { ...prev[item.id], showNotes: true },
                      }))}
                      className="mt-2 ml-9 w-[calc(100%-2.25rem)] h-9 rounded-[14px] text-xs font-semibold text-[#C58B1B] border border-dashed border-[#C58B1B]/40 hover:bg-[#C58B1B]/5 transition-colors"
                    >
                      + Add Note
                    </button>
                  )}
                </div>

                {/* Photos + Notes section */}
                {(item.photo_urls.length > 0 || notes || (editing && (edit?.showNotes || notes))) && (
                  <div className="px-4 pb-4 ml-9 space-y-3 border-t border-[#E5E5E3] pt-3">
                    {/* Existing photos */}
                    {item.photo_urls.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {item.photo_urls.map((url, pi) => (
                          <button
                            key={pi}
                            onClick={() => setLightbox({ photos: item.photo_urls, index: pi })}
                            className="w-16 h-16 rounded-[10px] overflow-hidden border border-[#D1D0CE] hover:border-[#C58B1B] transition-colors flex-shrink-0"
                          >
                            <img src={url} alt={`Photo ${pi + 1}`} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* New photo upload (edit mode) */}
                    {editing && (
                      <PhotoCaptureLocal
                        itemCode={item.item_code}
                        photos={edit?.newPhotos || []}
                        maxPhotos={5}
                        onPhotosChanged={(p) => setEditState((prev) => ({
                          ...prev,
                          [item.id]: { ...prev[item.id], newPhotos: p },
                        }))}
                      />
                    )}

                    {/* Notes — editable for ALL results, not just fail */}
                    {editing ? (
                      <textarea
                        value={notes}
                        onChange={(e) => setEditState((prev) => ({
                          ...prev,
                          [item.id]: { ...prev[item.id], notes: e.target.value },
                        }))}
                        placeholder="Add a note..."
                        rows={2}
                        className="w-full text-[15px] text-[#1A1A1A] placeholder:text-[#B0AFA9] border border-[#D1D0CE] rounded-[14px] px-3 py-2 resize-none focus:border-[#C58B1B] focus:outline-none"
                      />
                    ) : notes ? (
                      <p className="text-xs text-[#888884] italic">{notes}</p>
                    ) : null}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Actions */}
        <div className="space-y-3 mb-8">
          <button
            onClick={copyLink}
            className="w-full h-[52px] rounded-[14px] font-semibold text-[15px] bg-[#C58B1B] text-white hover:bg-[#A67516] transition-colors"
          >
            {copied ? '\u2713 Link Copied!' : 'Copy Link'}
          </button>

          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: `${report.transition_label} — ${report.lot_number}`,
                  text: `Gate check ${report.passed ? 'PASSED' : 'FAILED'}: ${report.reference}`,
                  url: `${window.location.origin}/report?token=${report.token}`,
                })
              } else {
                copyLink()
              }
            }}
            className="w-full h-[52px] rounded-[14px] font-semibold text-[15px] border border-[#D1D0CE] text-[#888884] bg-white hover:bg-[#F5F5F4] transition-colors"
          >
            Share Report
          </button>
        </div>

        <p className="text-center text-xs text-[#B0AFA9] pb-6">
          OnSite Club &mdash; Built for the trades
        </p>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <PhotoLightbox
          photos={lightbox.photos}
          initialIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  )
}

function resultColorClass(result: string): string {
  if (result === 'pass') return 'text-[#16A34A] font-semibold'
  if (result === 'fail') return 'text-[#DC2626] font-semibold'
  return 'text-[#888884] font-semibold'
}
