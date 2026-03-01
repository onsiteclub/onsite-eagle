'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, User, Bell, Info, Users, QrCode, Copy, Check, Building2,
  Plus, MapPin, Calendar, Hash, Loader2
} from 'lucide-react'
import { QRCode } from '@onsite/ui/web'
import { supabase } from '@/lib/supabase'

type SettingsTab = 'profile' | 'notifications' | 'about' | 'link-workers' | 'new-jobsite'

export default function SettingsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')
  const [linkCopied, setLinkCopied] = useState(false)

  const workerLink = useMemo(() => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    return `${baseUrl}/connect/worker`
  }, [])

  const tabs = [
    { id: 'profile' as const, label: 'Profile', icon: User },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'link-workers' as const, label: 'Link Workers', icon: Users },
    { id: 'new-jobsite' as const, label: 'New Jobsite', icon: Plus },
    { id: 'about' as const, label: 'About', icon: Info },
  ]

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      {/* Header */}
      <header className="bg-white border-b border-[#D2D2D7] px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/')}
            className="p-2 rounded-lg hover:bg-[#F5F5F7] transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[#1D1D1F]" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-[#1D1D1F]">Settings</h1>
            <p className="text-sm text-[#86868B]">Manage your preferences</p>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-white rounded-xl p-1.5 border border-[#D2D2D7] overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors flex-shrink-0 ${
                activeTab === tab.id
                  ? 'bg-[#007AFF] text-white'
                  : 'text-[#6E6E73] hover:bg-[#F5F5F7] hover:text-[#1D1D1F]'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl border border-[#D2D2D7] p-6">
          {activeTab === 'profile' && <ProfileContent />}
          {activeTab === 'notifications' && <NotificationsContent />}
          {activeTab === 'about' && <AboutContent />}
          {activeTab === 'link-workers' && (
            <LinkWorkersContent
              workerLink={workerLink}
              linkCopied={linkCopied}
              onCopy={() => {
                navigator.clipboard.writeText(workerLink)
                setLinkCopied(true)
                setTimeout(() => setLinkCopied(false), 2000)
              }}
            />
          )}
          {activeTab === 'new-jobsite' && <NewJobsiteContent router={router} />}
        </div>
      </div>
    </div>
  )
}

function ProfileContent() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 bg-[#007AFF] rounded-full flex items-center justify-center text-white text-3xl font-semibold">
          C
        </div>
        <div>
          <h3 className="text-xl font-semibold text-[#1D1D1F]">Cris</h3>
          <p className="text-[#86868B]">Supervisor</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between py-3 border-b border-[#E5E5EA]">
          <span className="text-[#6E6E73]">Email</span>
          <span className="text-[#1D1D1F]">cris@onsite.com</span>
        </div>
        <div className="flex items-center justify-between py-3 border-b border-[#E5E5EA]">
          <span className="text-[#6E6E73]">Role</span>
          <span className="text-[#1D1D1F]">Supervisor</span>
        </div>
        <div className="flex items-center justify-between py-3">
          <span className="text-[#6E6E73]">Member since</span>
          <span className="text-[#1D1D1F]">January 2024</span>
        </div>
      </div>

      <button className="w-full bg-[#007AFF] hover:bg-[#0056B3] text-white font-semibold py-3 px-6 rounded-lg transition-colors">
        Edit Profile
      </button>
    </div>
  )
}

function NotificationsContent() {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-[#1D1D1F] mb-4">Notification Settings</h3>

      <div className="flex items-center justify-between py-3 border-b border-[#E5E5EA]">
        <div>
          <p className="text-[#1D1D1F] font-medium">Push Notifications</p>
          <p className="text-[#86868B] text-sm">Receive alerts on your device</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" className="sr-only peer" defaultChecked />
          <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-[#007AFF] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#007AFF]"></div>
        </label>
      </div>

      <div className="flex items-center justify-between py-3 border-b border-[#E5E5EA]">
        <div>
          <p className="text-[#1D1D1F] font-medium">Email Notifications</p>
          <p className="text-[#86868B] text-sm">Receive daily summary by email</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" className="sr-only peer" />
          <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-[#007AFF] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#007AFF]"></div>
        </label>
      </div>

      <div className="flex items-center justify-between py-3">
        <div>
          <p className="text-[#1D1D1F] font-medium">Delay Alerts</p>
          <p className="text-[#86868B] text-sm">Get notified when lots are delayed</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" className="sr-only peer" defaultChecked />
          <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-[#007AFF] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#007AFF]"></div>
        </label>
      </div>
    </div>
  )
}

function AboutContent() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-20 h-20 bg-[#007AFF] rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Building2 className="w-10 h-10 text-white" />
        </div>
        <h3 className="text-2xl font-semibold text-[#1D1D1F]">OnSite Eagle</h3>
        <p className="text-[#86868B] mt-1">Construction Monitor</p>
        <p className="text-[#007AFF] mt-2">Version 1.0.0</p>
      </div>

      <div className="pt-4 border-t border-[#E5E5EA]">
        <h4 className="font-semibold text-[#1D1D1F] mb-3">About</h4>
        <p className="text-[#6E6E73] text-sm leading-relaxed">
          OnSite Eagle is a complete construction monitoring platform designed to help supervisors
          track progress, manage lots, and coordinate with workers in real time. Built with
          AI photo validation and intuitive dashboards.
        </p>
      </div>

      <div className="pt-4 border-t border-[#E5E5EA]">
        <h4 className="font-semibold text-[#1D1D1F] mb-3">Support</h4>
        <div className="space-y-2">
          <button className="w-full text-left py-2 text-[#007AFF] hover:underline">
            Documentation
          </button>
          <button className="w-full text-left py-2 text-[#007AFF] hover:underline">
            Contact Support
          </button>
          <button className="w-full text-left py-2 text-[#007AFF] hover:underline">
            Privacy Policy
          </button>
        </div>
      </div>
    </div>
  )
}

function LinkWorkersContent({
  workerLink,
  linkCopied,
  onCopy
}: {
  workerLink: string
  linkCopied: boolean
  onCopy: () => void
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-[#007AFF]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Users className="w-8 h-8 text-[#007AFF]" />
        </div>
        <h3 className="text-xl font-semibold text-[#1D1D1F]">Link Workers</h3>
        <p className="text-[#6E6E73] text-sm mt-2">
          Workers can scan this QR code with their phone to connect and send updates to this dashboard.
        </p>
      </div>

      {/* QR Code */}
      <div className="bg-[#F5F5F7] rounded-xl p-8 flex items-center justify-center">
        <QRCode value={workerLink} size={200} level="H" />
      </div>

      {/* Link */}
      <div className="bg-[#F5F5F7] rounded-lg p-3 flex items-center gap-2">
        <QrCode className="w-5 h-5 text-[#86868B] flex-shrink-0" />
        <span className="text-[#1D1D1F] text-sm truncate flex-1">{workerLink}</span>
        <button
          onClick={onCopy}
          className="text-[#007AFF] hover:text-[#0056B3] transition-colors flex-shrink-0"
        >
          {linkCopied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
        </button>
      </div>

      <p className="text-[#86868B] text-xs text-center">
        Each worker will receive a unique identifier when connecting.
      </p>
    </div>
  )
}

function NewJobsiteContent({ router }: { router: ReturnType<typeof useRouter> }) {
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    total_lots: '',
    start_date: '',
    expected_end_date: ''
  })
  const [autoCreateLots, setAutoCreateLots] = useState(true)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!formData.name.trim()) {
      alert('Please enter a site name')
      return
    }

    const totalLots = formData.total_lots ? parseInt(formData.total_lots) : 0

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('frm_jobsites')
        .insert({
          name: formData.name.trim(),
          address: formData.address.trim() || null,
          city: formData.city.trim() || null,
          total_lots: autoCreateLots ? 0 : totalLots,
          completed_lots: 0,
          start_date: formData.start_date || null,
          expected_end_date: formData.expected_end_date || null
        })
        .select()
        .single()

      if (error) throw error

      // Auto-create lots if enabled and total_lots is specified
      if (autoCreateLots && totalLots > 0) {
        setProgress({ current: 0, total: totalLots })

        const lotsToCreate = []
        for (let i = 1; i <= totalLots; i++) {
          lotsToCreate.push({
            jobsite_id: data.id,
            lot_number: String(i),
            status: 'pending',
            current_phase: 1,
            progress_percentage: 0,
            is_issued: false,
          })
        }

        // Batch insert in chunks of 50
        const chunkSize = 50
        let created = 0

        for (let i = 0; i < lotsToCreate.length; i += chunkSize) {
          const chunk = lotsToCreate.slice(i, i + chunkSize)

          const { data: insertedData, error: insertError } = await supabase
            .from('frm_lots')
            .insert(chunk)
            .select()

          if (insertError) throw new Error(`Failed to create lots: ${insertError.message}`)

          const insertedCount = insertedData?.length ?? 0
          if (insertedCount === 0) throw new Error('Failed to create lots. Please check permissions.')

          created += insertedCount
          setProgress({ current: created, total: totalLots })
        }

        // Update total_lots count with actual created count
        await supabase
          .from('frm_jobsites')
          .update({ total_lots: created })
          .eq('id', data.id)
      }

      router.push(`/site/${data.id}`)
    } catch (error: any) {
      console.error('Error creating site:', error)

      if (error?.code === '42501') {
        alert('Permission denied. You need to be logged in to create a site.')
      } else if (error?.message) {
        alert(`Error: ${error.message}`)
      } else {
        alert('Failed to create site. Please try again.')
      }
    } finally {
      setLoading(false)
      setProgress(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-[#007AFF]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Building2 className="w-8 h-8 text-[#007AFF]" />
        </div>
        <h3 className="text-xl font-semibold text-[#1D1D1F]">New Jobsite</h3>
        <p className="text-[#6E6E73] text-sm mt-2">Add a new construction site to track</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Site Name */}
        <div>
          <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
            Site Name *
          </label>
          <div className="relative">
            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#86868B]" />
            <input
              type="text"
              required
              placeholder="e.g., Maple Heights Phase 2"
              className="w-full bg-[#F5F5F7] border border-[#D2D2D7] rounded-xl pl-12 pr-4 py-3 text-[#1D1D1F] placeholder-[#86868B] focus:outline-none focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
            Address
          </label>
          <div className="relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#86868B]" />
            <input
              type="text"
              placeholder="e.g., 123 Construction Ave"
              className="w-full bg-[#F5F5F7] border border-[#D2D2D7] rounded-xl pl-12 pr-4 py-3 text-[#1D1D1F] placeholder-[#86868B] focus:outline-none focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>
        </div>

        {/* City */}
        <div>
          <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
            City
          </label>
          <input
            type="text"
            placeholder="e.g., Toronto, ON"
            className="w-full bg-[#F5F5F7] border border-[#D2D2D7] rounded-xl px-4 py-3 text-[#1D1D1F] placeholder-[#86868B] focus:outline-none focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          />
        </div>

        {/* Total Lots */}
        <div>
          <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
            Number of Lots
          </label>
          <div className="relative">
            <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#86868B]" />
            <input
              type="number"
              min="0"
              max="500"
              placeholder="e.g., 24"
              className="w-full bg-[#F5F5F7] border border-[#D2D2D7] rounded-xl pl-12 pr-4 py-3 text-[#1D1D1F] placeholder-[#86868B] focus:outline-none focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]"
              value={formData.total_lots}
              onChange={(e) => setFormData({ ...formData, total_lots: e.target.value })}
            />
          </div>

          {/* Auto-create checkbox */}
          {formData.total_lots && parseInt(formData.total_lots) > 0 && (
            <label className="flex items-center gap-3 mt-3 p-3 bg-[#F5F5F7] rounded-lg cursor-pointer hover:bg-[#E5E5EA] transition-colors">
              <input
                type="checkbox"
                checked={autoCreateLots}
                onChange={(e) => setAutoCreateLots(e.target.checked)}
                className="w-5 h-5 rounded border-[#D2D2D7] text-[#007AFF] focus:ring-[#007AFF] cursor-pointer"
              />
              <div>
                <p className="text-sm font-medium text-[#1D1D1F]">
                  Auto-create {formData.total_lots} lots
                </p>
                <p className="text-xs text-[#86868B]">
                  Lots will be numbered 1 to {formData.total_lots}
                </p>
              </div>
            </label>
          )}
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
              Start Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#86868B]" />
              <input
                type="date"
                className="w-full bg-[#F5F5F7] border border-[#D2D2D7] rounded-xl pl-12 pr-4 py-3 text-[#1D1D1F] focus:outline-none focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
              Expected End
            </label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#86868B]" />
              <input
                type="date"
                className="w-full bg-[#F5F5F7] border border-[#D2D2D7] rounded-xl pl-12 pr-4 py-3 text-[#1D1D1F] focus:outline-none focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]"
                value={formData.expected_end_date}
                onChange={(e) => setFormData({ ...formData, expected_end_date: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Progress indicator */}
        {progress && (
          <div className="bg-[#007AFF]/10 border border-[#007AFF]/20 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#007AFF] font-medium">Creating lots...</span>
              <span className="text-sm text-[#007AFF]">{progress.current}/{progress.total}</span>
            </div>
            <div className="h-2 bg-[#007AFF]/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#007AFF] rounded-full transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#007AFF] hover:bg-[#0056B3] disabled:bg-[#AEAEB2] disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{progress ? 'Creating Lots...' : 'Creating Site...'}</span>
            </>
          ) : (
            <span>
              {autoCreateLots && formData.total_lots && parseInt(formData.total_lots) > 0
                ? `Create Jobsite with ${formData.total_lots} Lots`
                : 'Create Jobsite'
              }
            </span>
          )}
        </button>
      </form>
    </div>
  )
}
