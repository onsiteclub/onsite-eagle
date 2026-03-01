'use client'

import { useState, useCallback, useRef } from 'react'
import { Upload, X, Check, AlertCircle, FileText, Loader2, Link2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { parseFilename, getConfidenceLabel, formatDocumentType } from '@onsite/shared'
import type { House, BulkUploadItem } from '@onsite/shared'

interface Props {
  siteId: string
  houses: House[]
  onClose: () => void
  onComplete: () => void
}

export default function BulkDocumentUpload({ siteId, houses, onClose, onComplete }: Props) {
  const [items, setItems] = useState<BulkUploadItem[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 })
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Create a map of lot numbers to house IDs for quick lookup
  const lotNumberMap = new Map<string, string>()
  houses.forEach(h => {
    lotNumberMap.set(h.lot_number, h.id)
    // Also add without leading zeros
    lotNumberMap.set(h.lot_number.replace(/^0+/, ''), h.id)
  })

  const handleFiles = useCallback((files: FileList | File[]) => {
    const newItems: BulkUploadItem[] = Array.from(files).map(file => {
      const parsed = parseFilename(file.name)
      return {
        file,
        filename: file.name,
        parsed,
        status: 'pending' as const,
        editedLotNumber: parsed.lotNumbers[0] || undefined
      }
    })
    setItems(prev => [...prev, ...newItems])
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files)
    }
  }, [handleFiles])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
  }, [])

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  const updateLotNumber = (index: number, lotNumber: string) => {
    setItems(prev => prev.map((item, i) =>
      i === index ? { ...item, editedLotNumber: lotNumber } : item
    ))
  }

  const handleUpload = async () => {
    if (items.length === 0) return

    setUploading(true)
    setUploadProgress({ current: 0, total: items.length })

    // Try to get current user (optional - monitor app may not have auth)
    const { data: { user } } = await supabase.auth.getUser()

    // Get profile name if user is authenticated
    let profileName = 'Monitor User'
    if (user?.id) {
      const { data: profile } = await supabase
        .from('core_profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()
      profileName = profile?.full_name || 'Monitor User'
    }

    // Create batch record
    const batchData: Record<string, unknown> = {
      jobsite_id: siteId,
      status: 'processing',
      total_files: items.length,
      uploaded_by_name: profileName
    }

    // Only add uploaded_by if we have a valid user ID
    if (user?.id) {
      batchData.uploaded_by = user.id
    }

    const { data: batch, error: batchError } = await supabase
      .from('frm_document_batches')
      .insert(batchData)
      .select()
      .single()

    if (batchError) {
      console.error('Error creating batch:', batchError)
      alert(`Error creating batch: ${batchError.message}`)
      setUploading(false)
      return
    }

    let linkedCount = 0
    let unlinkedCount = 0

    // Upload each file
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      setUploadProgress({ current: i + 1, total: items.length })

      try {
        // Update item status
        setItems(prev => prev.map((it, idx) =>
          idx === i ? { ...it, status: 'uploading' } : it
        ))

        // Upload to storage
        const fileExt = item.file.name.split('.').pop()
        const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`
        const filePath = `${siteId}/documents/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('frm-media')
          .upload(filePath, item.file)

        if (uploadError) throw uploadError

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('frm-media')
          .getPublicUrl(filePath)

        // Create document record - build object dynamically to avoid undefined values
        const docData: Record<string, unknown> = {
          jobsite_id: siteId,
          name: item.file.name,
          file_url: urlData.publicUrl,
          file_path: filePath,
          file_type: item.file.type || fileExt,
          file_size: item.file.size,
          category: 'blueprint',
          parsed_lot_number: item.editedLotNumber || item.parsed.lotNumbers[0] || null,
          parsing_confidence: item.parsed.confidence,
          batch_id: batch.id
        }

        if (user?.id) {
          docData.uploaded_by = user.id
        }

        const { data: doc, error: docError } = await supabase
          .from('frm_documents')
          .insert(docData)
          .select()
          .single()

        if (docError) throw docError

        // Try to auto-link if we have a lot number
        const lotNum = item.editedLotNumber || item.parsed.lotNumbers[0]
        let linked = false

        if (lotNum) {
          const houseId = lotNumberMap.get(lotNum) || lotNumberMap.get(lotNum.replace(/^0+/, ''))

          if (houseId) {
            const linkData: Record<string, unknown> = {
              document_id: doc.id,
              lot_id: houseId,
              link_type: 'auto_parsed'
            }

            if (user?.id) {
              linkData.created_by = user.id
            }

            const { error: linkError } = await supabase
              .from('frm_document_links')
              .insert(linkData)

            if (!linkError) {
              linked = true
              linkedCount++
            }
          }
        }

        if (!linked) {
          unlinkedCount++
        }

        // Update item status
        setItems(prev => prev.map((it, idx) =>
          idx === i ? {
            ...it,
            status: linked ? 'linked' : 'unlinked',
            documentId: doc.id
          } : it
        ))

      } catch (error) {
        console.error('Error uploading file:', item.filename, error)
        setItems(prev => prev.map((it, idx) =>
          idx === i ? { ...it, status: 'error', error: String(error) } : it
        ))
      }
    }

    // Update batch with final counts
    await supabase
      .from('frm_document_batches')
      .update({
        status: 'completed',
        processed_files: items.length,
        linked_files: linkedCount,
        unlinked_files: unlinkedCount,
        completed_at: new Date().toISOString()
      })
      .eq('id', batch.id)

    setUploading(false)
  }

  const linkedCount = items.filter(i => i.status === 'linked').length
  const unlinkedCount = items.filter(i => i.status === 'unlinked').length
  const pendingCount = items.filter(i => i.status === 'pending').length
  const allDone = items.length > 0 && items.every(i => i.status !== 'pending' && i.status !== 'uploading')

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="p-4 border-b border-[#E5E5EA] flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-[#1D1D1F]">Bulk Document Upload</h2>
            <p className="text-sm text-[#86868B]">
              Upload multiple documents and auto-link them to lots by filename
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#F5F5F7] rounded-lg transition-colors">
            <X className="w-5 h-5 text-[#86868B]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
              dragActive
                ? 'border-[#007AFF] bg-[#007AFF]/5'
                : 'border-[#D2D2D7] hover:border-[#007AFF]'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.dwg"
              multiple
              className="hidden"
              onChange={e => e.target.files && handleFiles(e.target.files)}
            />
            <Upload className={`w-10 h-10 mx-auto mb-3 ${dragActive ? 'text-[#007AFF]' : 'text-[#86868B]'}`} />
            <p className="text-[#1D1D1F] font-medium">Drop files here or click to upload</p>
            <p className="text-[#86868B] text-sm mt-1">
              PDF, PNG, JPG, DWG - Filenames like &quot;LOT_23_floor_plan.pdf&quot; will auto-link
            </p>
          </div>

          {/* Files Preview */}
          {items.length > 0 && (
            <div className="border border-[#D2D2D7] rounded-xl overflow-hidden">
              <div className="bg-[#F5F5F7] px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-medium text-[#1D1D1F]">
                  {items.length} files selected
                </span>
                <div className="flex items-center gap-4 text-sm">
                  {linkedCount > 0 && (
                    <span className="text-green-600 flex items-center gap-1">
                      <Check className="w-4 h-4" /> {linkedCount} linked
                    </span>
                  )}
                  {unlinkedCount > 0 && (
                    <span className="text-yellow-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" /> {unlinkedCount} unlinked
                    </span>
                  )}
                  {pendingCount > 0 && (
                    <span className="text-[#86868B]">{pendingCount} pending</span>
                  )}
                </div>
              </div>

              <div className="max-h-80 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#F5F5F7] sticky top-0">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium text-[#6E6E73]">Filename</th>
                      <th className="text-left px-4 py-2 font-medium text-[#6E6E73] w-24">Lot #</th>
                      <th className="text-left px-4 py-2 font-medium text-[#6E6E73] w-28">Type</th>
                      <th className="text-left px-4 py-2 font-medium text-[#6E6E73] w-24">Confidence</th>
                      <th className="text-center px-4 py-2 font-medium text-[#6E6E73] w-20">Status</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E5EA]">
                    {items.map((item, index) => {
                      const confidence = getConfidenceLabel(item.parsed.confidence)
                      return (
                        <tr key={index} className="hover:bg-[#F5F5F7]/50">
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-[#86868B] shrink-0" />
                              <span className="truncate max-w-xs" title={item.filename}>
                                {item.filename}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={item.editedLotNumber || ''}
                              onChange={e => updateLotNumber(index, e.target.value)}
                              placeholder="-"
                              disabled={item.status !== 'pending'}
                              className="w-16 px-2 py-1 border border-[#D2D2D7] rounded text-center text-sm disabled:bg-[#F5F5F7] disabled:text-[#86868B]"
                            />
                          </td>
                          <td className="px-4 py-2 text-[#6E6E73]">
                            {formatDocumentType(item.parsed.documentType)}
                          </td>
                          <td className="px-4 py-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              confidence.color === 'green' ? 'bg-green-100 text-green-700' :
                              confidence.color === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {confidence.label}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-center">
                            {item.status === 'pending' && (
                              <span className="text-[#86868B]">-</span>
                            )}
                            {item.status === 'uploading' && (
                              <Loader2 className="w-4 h-4 animate-spin text-[#007AFF] mx-auto" />
                            )}
                            {item.status === 'linked' && (
                              <div className="flex items-center justify-center gap-1 text-green-600">
                                <Link2 className="w-4 h-4" />
                              </div>
                            )}
                            {item.status === 'unlinked' && (
                              <AlertCircle className="w-4 h-4 text-yellow-500 mx-auto" />
                            )}
                            {item.status === 'error' && (
                              <X className="w-4 h-4 text-red-500 mx-auto" />
                            )}
                          </td>
                          <td className="px-2 py-2">
                            {item.status === 'pending' && (
                              <button
                                onClick={() => removeItem(index)}
                                className="p-1 hover:bg-[#F5F5F7] rounded"
                              >
                                <X className="w-4 h-4 text-[#86868B]" />
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {uploading && (
            <div className="bg-[#F5F5F7] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[#1D1D1F]">Uploading...</span>
                <span className="text-sm text-[#86868B]">
                  {uploadProgress.current} / {uploadProgress.total}
                </span>
              </div>
              <div className="h-2 bg-[#D2D2D7] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#007AFF] transition-all duration-300"
                  style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E5E5EA] flex items-center justify-between shrink-0">
          <p className="text-sm text-[#86868B]">
            {houses.length} lots available for linking
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-[#6E6E73] hover:text-[#1D1D1F] transition-colors"
            >
              {allDone ? 'Close' : 'Cancel'}
            </button>
            {allDone ? (
              <button
                onClick={() => { onComplete(); onClose() }}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
              >
                Done
              </button>
            ) : (
              <button
                onClick={handleUpload}
                disabled={items.length === 0 || uploading}
                className="px-4 py-2 text-sm font-medium text-white bg-[#007AFF] hover:bg-[#0056B3] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload & Link
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
