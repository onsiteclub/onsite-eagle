'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Info, Shield, AlertTriangle, Trash2,
  Building2, FileText, Layers, Upload, ChevronRight
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Site } from '@onsite/shared'

type SettingsTab = 'info' | 'rules' | 'danger'

const tabs = [
  { id: 'info' as const, label: 'Information', icon: Info },
  { id: 'rules' as const, label: 'Rules', icon: Shield },
  { id: 'danger' as const, label: 'Danger Zone', icon: AlertTriangle },
]

export default function SiteSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const siteId = params.id as string
  const [site, setSite] = useState<Site | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<SettingsTab>('info')
  const [showEditModal, setShowEditModal] = useState(false)

  useEffect(() => {
    if (siteId) {
      loadSite()
    }
  }, [siteId])

  async function loadSite() {
    try {
      const { data, error } = await supabase
        .from('egl_sites')
        .select('*')
        .eq('id', siteId)
        .single()

      if (error) throw error
      setSite(data)
    } catch (error) {
      console.error('Error loading site:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#007AFF]" />
      </div>
    )
  }

  if (!site) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center">
        <p className="text-[#FF3B30] text-lg mb-4">Site not found</p>
        <button
          onClick={() => router.push('/')}
          className="text-[#007AFF] hover:text-[#0056B3]"
        >
          Back to Overview
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      {/* Header */}
      <header className="bg-white border-b border-[#D2D2D7]">
        <div className="px-6 py-4">
          <button
            onClick={() => router.push(`/site/${siteId}`)}
            className="flex items-center gap-2 text-[#007AFF] hover:text-[#0056B3] transition-colors mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to {site.name}</span>
          </button>
          <h1 className="text-2xl font-semibold text-[#1D1D1F]">Site Settings</h1>
          <p className="text-sm text-[#86868B]">{site.name}</p>
        </div>

        {/* Tabs */}
        <div className="px-6 flex gap-1 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? tab.id === 'danger'
                    ? 'border-[#FF3B30] text-[#FF3B30]'
                    : 'border-[#007AFF] text-[#007AFF]'
                  : 'border-transparent text-[#86868B] hover:text-[#1D1D1F]'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto p-6">
        {activeTab === 'info' && (
          <InfoTab site={site} onEdit={() => setShowEditModal(true)} onSiteUpdated={loadSite} />
        )}
        {activeTab === 'rules' && <RulesTab />}
        {activeTab === 'danger' && <DangerTab site={site} />}
      </main>

      {/* Edit Site Modal */}
      {showEditModal && (
        <EditSiteModal
          site={site}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false)
            loadSite()
          }}
        />
      )}
    </div>
  )
}

// Info Tab
function InfoTab({ site, onEdit, onSiteUpdated }: { site: Site; onEdit: () => void; onSiteUpdated: () => void }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={onEdit}
          className="text-sm text-[#007AFF] hover:text-[#0056B3] hover:underline"
        >
          Edit Information
        </button>
      </div>

      <div className="bg-white border border-[#D2D2D7] rounded-xl divide-y divide-[#E5E5EA]">
        <div className="p-4 flex justify-between">
          <span className="text-[#6E6E73]">Name</span>
          <span className="text-[#1D1D1F] font-medium">{site.name}</span>
        </div>
        <div className="p-4 flex justify-between">
          <span className="text-[#6E6E73]">Address</span>
          <span className="text-[#1D1D1F] font-medium">{site.address || '—'}</span>
        </div>
        <div className="p-4 flex justify-between">
          <span className="text-[#6E6E73]">City</span>
          <span className="text-[#1D1D1F] font-medium">{site.city || '—'}</span>
        </div>
        <div className="p-4 flex justify-between">
          <span className="text-[#6E6E73]">Total Lots</span>
          <span className="text-[#1D1D1F] font-medium">{site.total_lots || 0}</span>
        </div>
        <div className="p-4 flex justify-between">
          <span className="text-[#6E6E73]">Completed Lots</span>
          <span className="text-[#1D1D1F] font-medium">{site.completed_lots || 0}</span>
        </div>
        <div className="p-4 flex justify-between">
          <span className="text-[#6E6E73]">Start Date</span>
          <span className="text-[#1D1D1F] font-medium">
            {site.start_date ? new Date(site.start_date).toLocaleDateString('en-CA') : '—'}
          </span>
        </div>
        <div className="p-4 flex justify-between">
          <span className="text-[#6E6E73]">Expected End Date</span>
          <span className="text-[#1D1D1F] font-medium">
            {site.expected_end_date ? new Date(site.expected_end_date).toLocaleDateString('en-CA') : '—'}
          </span>
        </div>
      </div>
    </div>
  )
}

// Rules Tab
function RulesTab() {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#D2D2D7] rounded-xl p-6">
        <h3 className="font-semibold text-[#1D1D1F] mb-4">Safety & Quality Rules</h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-[#E5E5EA]">
            <div>
              <p className="text-[#1D1D1F] font-medium">PPE Verification</p>
              <p className="text-[#86868B] text-sm">Require photo with PPE for check-in</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-[#007AFF] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#007AFF]"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-[#E5E5EA]">
            <div>
              <p className="text-[#1D1D1F] font-medium">AI Photo Validation</p>
              <p className="text-[#86868B] text-sm">Use AI to validate progress photos</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-[#007AFF] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#007AFF]"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-[#1D1D1F] font-medium">Geofencing</p>
              <p className="text-[#86868B] text-sm">Verify location on check-in</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-[#007AFF] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#007AFF]"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}

// Danger Tab
function DangerTab({ site }: { site: Site }) {
  const router = useRouter()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  const handleDeleteSite = async () => {
    if (confirmText !== site.name) return

    setDeleting(true)
    try {
      // First delete all related data
      const { data: houses } = await supabase
        .from('egl_houses')
        .select('id')
        .eq('site_id', site.id)

      if (houses && houses.length > 0) {
        const houseIds = houses.map(h => h.id)
        await supabase.from('egl_timeline').delete().in('house_id', houseIds)
        await supabase.from('egl_photos').delete().in('house_id', houseIds)
        await supabase.from('egl_issues').delete().in('house_id', houseIds)
        await supabase.from('egl_progress').delete().in('house_id', houseIds)
        await supabase.from('egl_houses').delete().eq('site_id', site.id)
      }

      // Delete scans
      await supabase.from('egl_scans').delete().eq('site_id', site.id)

      // Finally delete the site
      const { error } = await supabase
        .from('egl_sites')
        .delete()
        .eq('id', site.id)

      if (error) throw error

      router.push('/')
    } catch (error) {
      console.error('Error deleting site:', error)
      alert('Failed to delete site. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-[#FF3B30]/5 border border-[#FF3B30]/20 rounded-xl p-6">
        <h3 className="font-semibold text-[#FF3B30] mb-2">Danger Zone</h3>
        <p className="text-[#6E6E73] text-sm mb-6">
          Actions in this section are irreversible. Make sure before proceeding.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full bg-[#FF3B30]/10 border border-[#FF3B30]/30 rounded-xl p-4 flex items-center gap-3 hover:bg-[#FF3B30]/20 transition-colors"
          >
            <Trash2 className="w-5 h-5 text-[#FF3B30]" />
            <div className="text-left">
              <span className="text-[#FF3B30] font-medium block">Delete Site</span>
              <span className="text-[#FF3B30]/70 text-sm">This action cannot be undone</span>
            </div>
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="p-4 border-b border-[#E5E5EA]">
              <h2 className="text-lg font-semibold text-[#FF3B30]">Delete Site</h2>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-[#FF3B30]/10 border border-[#FF3B30]/30 rounded-lg p-3">
                <p className="text-sm text-[#FF3B30]">
                  This will permanently delete <strong>{site.name}</strong> and all its lots, photos, and data.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1D1D1F] mb-1">
                  Type "{site.name}" to confirm
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={site.name}
                  className="w-full px-3 py-2 border border-[#D2D2D7] rounded-lg focus:ring-2 focus:ring-[#FF3B30] focus:border-transparent"
                />
              </div>
            </div>
            <div className="p-4 border-t border-[#E5E5EA] flex gap-2">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setConfirmText('')
                }}
                className="flex-1 px-4 py-2.5 text-[#1D1D1F] bg-[#F5F5F7] hover:bg-[#E5E5EA] rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSite}
                disabled={confirmText !== site.name || deleting}
                className="flex-1 px-4 py-2.5 text-white bg-[#FF3B30] hover:bg-[#FF3B30]/90 disabled:bg-[#FF3B30]/50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
              >
                {deleting ? 'Deleting...' : 'Delete Site'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Edit Site Modal
function EditSiteModal({
  site,
  onClose,
  onSuccess,
}: {
  site: Site
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    name: site.name || '',
    address: site.address || '',
    city: site.city || '',
    start_date: site.start_date || '',
    expected_end_date: site.expected_end_date || '',
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      alert('Site name is required')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('egl_sites')
        .update({
          name: formData.name.trim(),
          address: formData.address.trim() || null,
          city: formData.city.trim() || null,
          start_date: formData.start_date || null,
          expected_end_date: formData.expected_end_date || null,
        })
        .eq('id', site.id)

      if (error) throw error
      onSuccess()
    } catch (error) {
      console.error('Error updating site:', error)
      alert('Failed to update site. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="p-4 border-b border-[#E5E5EA]">
          <h2 className="text-lg font-semibold text-[#1D1D1F]">Edit Site</h2>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1D1D1F] mb-1">
                Site Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-[#D2D2D7] rounded-lg focus:ring-2 focus:ring-[#007AFF] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1D1D1F] mb-1">
                Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-[#D2D2D7] rounded-lg focus:ring-2 focus:ring-[#007AFF] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1D1D1F] mb-1">
                City
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 border border-[#D2D2D7] rounded-lg focus:ring-2 focus:ring-[#007AFF] focus:border-transparent"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#1D1D1F] mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-3 py-2 border border-[#D2D2D7] rounded-lg focus:ring-2 focus:ring-[#007AFF] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1D1D1F] mb-1">
                  Expected End
                </label>
                <input
                  type="date"
                  value={formData.expected_end_date}
                  onChange={(e) => setFormData({ ...formData, expected_end_date: e.target.value })}
                  className="w-full px-3 py-2 border border-[#D2D2D7] rounded-lg focus:ring-2 focus:ring-[#007AFF] focus:border-transparent"
                />
              </div>
            </div>
          </div>
          <div className="p-4 border-t border-[#E5E5EA] flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-[#1D1D1F] bg-[#F5F5F7] hover:bg-[#E5E5EA] rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 text-white bg-[#007AFF] hover:bg-[#0056B3] disabled:bg-[#007AFF]/50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
