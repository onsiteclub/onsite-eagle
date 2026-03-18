'use client'

import { useState, useCallback } from 'react'
import PhotoLightbox from './PhotoLightbox'
import PhotoCaptureLocal from './PhotoCaptureLocal'

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

      const res = await fetch(`/api/reports/${report.token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updatedBy: editorName.trim(), items: changedItems }),
      })

      if (!res.ok) throw new Error('Save failed')

      const refreshRes = await fetch(`/api/reports/${report.token}`)
      if (refreshRes.ok) {
        const updated = await refreshRes.json()
        setReport(updated)
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
    const url = `${window.location.origin}/report/${report.token}`
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
    <div className="min-h-screen bg-[#F6F7F9] flex flex-col items-center px-4 py-6">
      <div className="w-full max-w-[520px]">
        {/* Reference + Last Updated */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono text-[#667085]">{report.reference}</span>
          {report.updated_by && (
            <span className="text-xs text-[#9CA3AF]">
              Updated by {report.updated_by}
            </span>
          )}
        </div>
        {report.updated_at && (
          <p className="text-[10px] text-[#9CA3AF] mb-4 text-right">
            {new Date(report.updated_at).toLocaleString('en-CA', {
              year: 'numeric', month: 'short', day: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </p>
        )}

        {/* Result Banner */}
        <div className={`
          rounded-[14px] p-6 text-center mb-6
          ${report.passed ? 'bg-[#ECFDF5] border border-[#059669]/30' : 'bg-[#FEF2F2] border border-[#DC2626]/30'}
        `}>
          <div className={`text-4xl mb-2 ${report.passed ? 'text-[#059669]' : 'text-[#DC2626]'}`}>
            {report.passed ? '\u2713' : '\u2717'}
          </div>
          <h1 className={`text-2xl font-bold ${report.passed ? 'text-[#059669]' : 'text-[#DC2626]'}`}>
            {report.passed ? 'PASSED' : 'FAILED'}
          </h1>
          <p className="text-sm font-medium text-[#101828] mt-2">{report.transition_label}</p>
          <p className="text-xs text-[#667085] mt-1">
            {report.jobsite} &mdash; {report.lot_number}
          </p>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-[14px] border border-[#E5E7EB] p-5 mb-4">
          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="text-center p-3 bg-[#ECFDF5] rounded-[10px]">
              <div className="text-lg font-bold text-[#059669]">{passCount}</div>
              <div className="text-xs text-[#667085]">Pass</div>
            </div>
            <div className="text-center p-3 bg-[#FEF2F2] rounded-[10px]">
              <div className="text-lg font-bold text-[#DC2626]">{failCount}</div>
              <div className="text-xs text-[#667085]">Fail</div>
            </div>
            <div className="text-center p-3 bg-[#F3F4F6] rounded-[10px]">
              <div className="text-lg font-bold text-[#6B7280]">{naCount}</div>
              <div className="text-xs text-[#667085]">N/A</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-[10px]">
              <div className="text-lg font-bold text-blue-700">{totalPhotos}</div>
              <div className="text-xs text-[#667085]">Photos</div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#F3F4F6] text-xs text-[#667085] space-y-1">
            <p>Inspector: <span className="text-[#101828]">{report.inspector_name}</span></p>
            {report.inspector_company && (
              <p>Company: <span className="text-[#101828]">{report.inspector_company}</span></p>
            )}
            <p>Date: <span className="text-[#101828]">
              {new Date(report.completed_at).toLocaleString('en-CA', {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </span></p>
          </div>
        </div>

        {/* Edit History */}
        {history.length > 0 && (
          <div className="bg-white rounded-[14px] border border-[#E5E7EB] mb-4 overflow-hidden">
            <button
              onClick={() => setShowHistory((v) => !v)}
              className="w-full flex items-center justify-between px-5 py-3 text-xs font-semibold text-[#667085] hover:bg-[#F6F7F9] transition-colors"
            >
              <span>Edit History ({history.length} {history.length === 1 ? 'update' : 'updates'})</span>
              <span className="text-[#9CA3AF]">{showHistory ? '\u25B2' : '\u25BC'}</span>
            </button>
            {showHistory && (
              <div className="px-5 pb-4 space-y-4 border-t border-[#F3F4F6]">
                {[...history].reverse().map((entry, hi) => (
                  <div key={hi} className="pt-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-[#101828]">{entry.name}</span>
                      <span className="text-[10px] text-[#9CA3AF]">
                        {new Date(entry.at).toLocaleString('en-CA', {
                          month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {entry.changes.map((c, ci) => (
                        <div key={ci} className="text-[11px] text-[#667085] flex items-start gap-1.5">
                          <span className="text-[#9CA3AF] flex-shrink-0">&bull;</span>
                          <span>
                            {c.field === 'result' ? (
                              <>
                                <span className="font-mono text-[#101828]">{c.item_code}</span>
                                {' '}
                                <span className={resultColorClass(c.from)}>{c.from.toUpperCase()}</span>
                                {' \u2192 '}
                                <span className={resultColorClass(c.to)}>{c.to.toUpperCase()}</span>
                              </>
                            ) : c.field === 'notes' ? (
                              <>
                                <span className="font-mono text-[#101828]">{c.item_code}</span>
                                {' note: "'}
                                <span className="italic">{c.to || '(cleared)'}</span>
                                {'"'}
                              </>
                            ) : (
                              <>
                                <span className="font-mono text-[#101828]">{c.item_code}</span>
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
              className="flex-1 h-10 rounded-[10px] text-sm font-semibold border border-[#0F766E] text-[#0F766E] hover:bg-[#0F766E]/5 transition-colors"
            >
              Edit Checklist
            </button>
          ) : (
            <>
              <button
                onClick={cancelEditing}
                className="flex-1 h-10 rounded-[10px] text-sm font-semibold border border-[#E5E7EB] text-[#667085] hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className={`flex-1 h-10 rounded-[10px] text-sm font-semibold transition-colors ${
                  saving ? 'bg-gray-200 text-gray-400' : 'bg-[#0F766E] text-white hover:bg-[#0d6b63]'
                }`}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          )}
        </div>

        {/* Name prompt modal */}
        {showNamePrompt && (
          <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center px-4">
            <div className="bg-white rounded-[14px] p-6 w-full max-w-[360px]">
              <h3 className="text-sm font-bold text-[#101828] mb-3">Your name</h3>
              <p className="text-xs text-[#667085] mb-3">
                Enter your name to track who made this update.
              </p>
              <input
                type="text"
                value={editorName}
                onChange={(e) => setEditorName(e.target.value)}
                placeholder="e.g. John Smith"
                className="w-full h-10 border border-[#E5E7EB] rounded-[10px] px-3 text-sm text-[#101828] placeholder:text-[#9CA3AF] mb-4"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowNamePrompt(false)}
                  className="flex-1 h-10 rounded-[10px] text-sm font-semibold border border-[#E5E7EB] text-[#667085]"
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
                  className={`flex-1 h-10 rounded-[10px] text-sm font-semibold ${
                    editorName.trim() ? 'bg-[#0F766E] text-white' : 'bg-gray-200 text-gray-400'
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
                  result === 'pass' ? 'border-[#059669]/30' :
                  result === 'fail' ? 'border-[#DC2626]/30' :
                  'border-[#9CA3AF]/30'
                }`}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium bg-[#0F766E] text-white flex-shrink-0 mt-0.5">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-[#101828] leading-snug">{item.item_label}</p>
                        {item.is_blocking && (
                          <span className="text-[10px] font-semibold text-[#DC2626] bg-red-50 px-1.5 py-0.5 rounded flex-shrink-0">
                            BLOCKING
                          </span>
                        )}
                      </div>

                      {/* Result badge (view mode) or buttons (edit mode) */}
                      {!editing ? (
                        <span className={`inline-block mt-2 text-xs font-semibold px-2 py-1 rounded ${
                          result === 'pass' ? 'bg-[#ECFDF5] text-[#059669]' :
                          result === 'fail' ? 'bg-[#FEF2F2] text-[#DC2626]' :
                          'bg-[#F3F4F6] text-[#6B7280]'
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
                              className={`flex-1 h-9 rounded-[10px] text-xs font-semibold border transition-all ${
                                result === r
                                  ? r === 'pass' ? 'bg-[#ECFDF5] border-[#059669] text-[#059669]'
                                    : r === 'fail' ? 'bg-[#FEF2F2] border-[#DC2626] text-[#DC2626]'
                                    : 'bg-[#F3F4F6] border-[#9CA3AF] text-[#6B7280]'
                                  : 'bg-gray-50 border-gray-200 text-[#667085]'
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
                      className="mt-2 ml-9 w-[calc(100%-2.25rem)] h-9 rounded-[10px] text-xs font-semibold text-[#0F766E] border border-dashed border-[#0F766E]/40 hover:bg-[#0F766E]/5 transition-colors"
                    >
                      + Add Note
                    </button>
                  )}
                </div>

                {/* Photos + Notes section */}
                {(item.photo_urls.length > 0 || notes || (editing && (edit?.showNotes || notes))) && (
                  <div className="px-4 pb-4 ml-9 space-y-3 border-t border-[#F3F4F6] pt-3">
                    {/* Existing photos */}
                    {item.photo_urls.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {item.photo_urls.map((url, pi) => (
                          <button
                            key={pi}
                            onClick={() => setLightbox({ photos: item.photo_urls, index: pi })}
                            className="w-16 h-16 rounded-lg overflow-hidden border border-[#E5E7EB] hover:border-[#0F766E] transition-colors flex-shrink-0"
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
                        className="w-full text-sm text-[#101828] placeholder:text-[#9CA3AF] border border-[#E5E7EB] rounded-[10px] px-3 py-2 resize-none"
                      />
                    ) : notes ? (
                      <p className="text-xs text-[#667085] italic">{notes}</p>
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
            className="w-full h-12 rounded-[10px] font-semibold text-base bg-[#0F766E] text-white hover:bg-[#0d6b63] transition-colors"
          >
            {copied ? 'Link Copied!' : 'Copy Link'}
          </button>

          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: `${report.transition_label} — ${report.lot_number}`,
                  text: `Gate check ${report.passed ? 'PASSED' : 'FAILED'}: ${report.reference}`,
                  url: `${window.location.origin}/report/${report.token}`,
                })
              } else {
                copyLink()
              }
            }}
            className="w-full h-12 rounded-[10px] font-semibold text-base border border-[#0F766E] text-[#0F766E] hover:bg-[#0F766E]/5 transition-colors"
          >
            Share Report
          </button>
        </div>

        <p className="text-center text-xs text-[#9CA3AF]">
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
  if (result === 'pass') return 'text-[#059669] font-semibold'
  if (result === 'fail') return 'text-[#DC2626] font-semibold'
  return 'text-[#6B7280] font-semibold'
}
