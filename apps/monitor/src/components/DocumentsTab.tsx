'use client'

/**
 * DocumentsTab — Site-level document management with categories.
 *
 * Monitor is the ONLY app that can CREATE/DELETE documents.
 * Uses @onsite/media data layer for fetching, direct Supabase for writes.
 * Categories: contracts, plans, licenses, institutional, reports.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  FileText, Upload, Layers, Shield, Building2, ChevronRight,
  Loader2, X, Trash2, ExternalLink,
} from 'lucide-react'
import { fetchDocuments } from '@onsite/media'
import type { Document } from '@onsite/media'
import { supabase } from '@/lib/supabase'

interface DocumentsTabProps {
  siteId: string
  onBulkUpload: () => void
}

interface CategoryDef {
  id: string
  label: string
  description: string
  icon: React.ElementType
}

const CATEGORIES: CategoryDef[] = [
  { id: 'contracts', label: 'Contracts', description: 'Construction contracts, amendments, terms', icon: FileText },
  { id: 'plans', label: 'Plans & Blueprints', description: 'Architectural, structural, plumbing plans', icon: Layers },
  { id: 'licenses', label: 'Licenses & Permits', description: 'Building permits, environmental licenses', icon: Shield },
  { id: 'institutional', label: 'Institutional', description: 'Company documents, insurance, certificates', icon: Building2 },
  { id: 'reports', label: 'Reports', description: 'Progress reports, inspections, assessments', icon: FileText },
]

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function DocumentsTab({ siteId, onBulkUpload }: DocumentsTabProps) {
  const [docs, setDocs] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const loadDocs = useCallback(async () => {
    setLoading(true)
    const result = await fetchDocuments(supabase as never, { jobsite_id: siteId })
    setDocs(result.data || [])
    setLoading(false)
  }, [siteId])

  useEffect(() => {
    loadDocs()
  }, [loadDocs])

  const categoryCounts = CATEGORIES.map(cat => ({
    ...cat,
    count: docs.filter(d => {
      if (cat.id === 'plans') return d.category === 'plan' || d.category === 'blueprint' || d.category === 'plans'
      return d.category === cat.id
    }).length,
  }))

  const filteredDocs = selectedCategory
    ? docs.filter(d => {
        if (selectedCategory === 'plans') return d.category === 'plan' || d.category === 'blueprint' || d.category === 'plans'
        return d.category === selectedCategory
      })
    : docs

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`
      const filePath = `${siteId}/documents/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('frm-media')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('frm-media')
        .getPublicUrl(filePath)

      await supabase
        .from('frm_documents')
        .insert({
          jobsite_id: siteId,
          name: file.name,
          file_url: urlData.publicUrl,
          file_path: filePath,
          file_type: file.type || fileExt,
          file_size: file.size,
          category: selectedCategory || 'reports',
        })

      await loadDocs()
    } catch (err) {
      console.error('Upload error:', err)
    }
    setUploading(false)
    e.target.value = ''
  }

  const handleDelete = async (docId: string) => {
    try {
      await fetch(`/api/documents?id=${docId}`, { method: 'DELETE' })
      setDocs(prev => prev.filter(d => d.id !== docId))
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-[#007AFF]" />
      </div>
    )
  }

  // Category drill-down view
  if (selectedCategory) {
    const cat = CATEGORIES.find(c => c.id === selectedCategory)
    return (
      <div className="max-w-3xl space-y-4">
        <button
          onClick={() => setSelectedCategory(null)}
          className="text-sm text-[#007AFF] hover:underline flex items-center gap-1"
        >
          &larr; All Categories
        </button>

        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-[#1D1D1F] text-lg">{cat?.label}</h3>
          <div className="flex items-center gap-3">
            <label className="text-sm bg-[#007AFF] text-white px-4 py-2 rounded-lg hover:bg-[#0056B3] transition-colors flex items-center gap-2 cursor-pointer">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Upload
              <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
            </label>
          </div>
        </div>

        {filteredDocs.length === 0 ? (
          <div className="bg-white border border-[#D2D2D7] rounded-xl p-8 text-center">
            <FileText className="w-10 h-10 text-[#AEAEB2] mx-auto mb-3" />
            <p className="text-[#86868B]">No documents in this category yet.</p>
          </div>
        ) : (
          <div className="bg-white border border-[#D2D2D7] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#F5F5F7]">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-[#6E6E73]">Name</th>
                  <th className="text-left px-4 py-2.5 font-medium text-[#6E6E73] w-24">Type</th>
                  <th className="text-left px-4 py-2.5 font-medium text-[#6E6E73] w-24">Size</th>
                  <th className="text-left px-4 py-2.5 font-medium text-[#6E6E73] w-32">Date</th>
                  <th className="w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5EA]">
                {filteredDocs.map(doc => (
                  <tr key={doc.id} className="hover:bg-[#F5F5F7]/50">
                    <td className="px-4 py-2.5">
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#007AFF] hover:underline flex items-center gap-2"
                      >
                        <FileText className="w-4 h-4 shrink-0" />
                        <span className="truncate max-w-xs">{doc.name}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </td>
                    <td className="px-4 py-2.5 text-[#6E6E73] uppercase">{doc.file_type?.split('/').pop() || '-'}</td>
                    <td className="px-4 py-2.5 text-[#6E6E73]">{formatSize(doc.file_size)}</td>
                    <td className="px-4 py-2.5 text-[#6E6E73]">{formatDate(doc.created_at)}</td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-[#AEAEB2] hover:text-red-500"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  // Categories overview
  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex justify-end gap-4">
        <button
          onClick={onBulkUpload}
          className="text-sm bg-[#007AFF] text-white px-4 py-2 rounded-lg hover:bg-[#0056B3] transition-colors flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          Bulk Upload
        </button>
      </div>

      <div className="bg-white border border-[#D2D2D7] rounded-xl p-6">
        <h3 className="font-semibold text-[#1D1D1F] mb-2">Project Documents</h3>
        <p className="text-[#86868B] text-sm mb-6">
          {docs.length} documents across {categoryCounts.filter(c => c.count > 0).length} categories.
        </p>

        <div className="space-y-3">
          {categoryCounts.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className="w-full bg-[#F5F5F7] hover:bg-[#E5E5EA] rounded-xl p-4 flex items-center gap-4 transition-colors text-left"
            >
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                <category.icon className="w-6 h-6 text-[#007AFF]" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[#1D1D1F] font-medium">{category.label}</span>
                  <span className="text-[#86868B] text-sm">{category.count} files</span>
                </div>
                <p className="text-[#86868B] text-sm mt-0.5">{category.description}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-[#AEAEB2]" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
