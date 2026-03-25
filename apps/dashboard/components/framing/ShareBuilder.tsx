'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@onsite/supabase/client'
import { listBuilderTokens, createBuilderToken, revokeBuilderToken } from '@onsite/framing'
import type { FrmJobsite, FrmBuilderToken } from '@onsite/framing'
import { Copy, Link, X, Shield, Clock, Check, Plus, Trash2 } from 'lucide-react'

interface Props {
  jobsite: FrmJobsite
  onClose: () => void
}

function computeExpiry(option: 'never' | '30d' | '90d'): string | null {
  if (option === 'never') return null
  const days = option === '30d' ? 30 : 90
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
}

const formatDate = (d: string) =>
  new Intl.DateTimeFormat('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(d))

const timeAgo = (d: string) => {
  const diff = Date.now() - new Date(d).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}

export function ShareBuilder({ jobsite, onClose }: Props) {
  const [tokens, setTokens] = useState<FrmBuilderToken[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [expiration, setExpiration] = useState<'never' | '30d' | '90d'>('never')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const supabase = createClient()

  async function loadTokens() {
    try {
      const data = await listBuilderTokens(supabase, jobsite.id)
      setTokens(data)
    } catch (err) {
      console.error('Failed to load builder tokens:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTokens()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleCreate() {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      await createBuilderToken(
        supabase,
        {
          jobsite_id: jobsite.id,
          builder_name: newName.trim(),
          builder_email: newEmail.trim() || undefined,
          expires_at: computeExpiry(expiration),
          organization_id: jobsite.organization_id ?? undefined,
        },
        user.id,
      )

      await loadTokens()
      setNewName('')
      setNewEmail('')
      setExpiration('never')
      setShowCreate(false)
    } catch (err) {
      console.error('Failed to create builder token:', err)
    } finally {
      setCreating(false)
    }
  }

  async function handleRevoke(tokenId: string) {
    try {
      await revokeBuilderToken(supabase, tokenId)
      await loadTokens()
    } catch (err) {
      console.error('Failed to revoke builder token:', err)
    }
  }

  function handleCopy(token: FrmBuilderToken) {
    const monitorUrl = process.env.NEXT_PUBLIC_MONITOR_URL || 'http://localhost:3000'
    const link = `${monitorUrl}/builder/${token.token}`
    navigator.clipboard.writeText(link)
    setCopiedId(token.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const activeTokens = tokens.filter(t => t.is_active)
  const revokedTokens = tokens.filter(t => !t.is_active)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />

      {/* Content */}
      <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Link className="w-5 h-5 text-[#0F766E]" />
            <h2 className="text-lg font-semibold text-[#101828]">Share with Builder</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-[#667085]" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Description */}
          <p className="text-sm text-[#667085]">
            Share a read-only view of this jobsite with the builder company.
          </p>

          {/* Loading */}
          {loading && (
            <div className="text-center py-8 text-sm text-[#667085]">Loading...</div>
          )}

          {/* Existing tokens */}
          {!loading && tokens.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-[#101828]">Existing Links</h3>

              {/* Active tokens */}
              {activeTokens.map(token => (
                <div
                  key={token.id}
                  className="border border-gray-200 rounded-xl p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                        <Shield className="w-3 h-3" />
                        Active
                      </span>
                      <span className="text-sm font-medium text-[#101828]">
                        {token.builder_name}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-[#667085]">
                    {token.last_accessed_at ? (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Last accessed: {timeAgo(token.last_accessed_at)}
                        {token.access_count > 0 && ` \u00b7 ${token.access_count}\u00d7`}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Never accessed
                      </span>
                    )}
                    {token.expires_at && (
                      <span>Expires: {formatDate(token.expires_at)}</span>
                    )}
                  </div>

                  {token.builder_email && (
                    <div className="text-xs text-[#667085]">{token.builder_email}</div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleCopy(token)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#0F766E] text-white rounded-lg hover:bg-[#0d6d66] transition-colors"
                    >
                      {copiedId === token.id ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy Link
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleRevoke(token.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Revoke
                    </button>
                  </div>
                </div>
              ))}

              {/* Revoked tokens */}
              {revokedTokens.map(token => (
                <div
                  key={token.id}
                  className="border border-gray-200 rounded-xl p-4 space-y-1 opacity-60"
                >
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                      Revoked
                    </span>
                    <span className="text-sm font-medium text-[#101828]">
                      {token.builder_name}
                    </span>
                  </div>
                  <div className="text-xs text-[#667085]">
                    Created {formatDate(token.created_at)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && tokens.length === 0 && !showCreate && (
            <div className="text-center py-6 text-sm text-[#667085]">
              No builder links yet. Create one to share access.
            </div>
          )}

          {/* Create new button */}
          {!showCreate && (
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#0F766E] bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create New Link
            </button>
          )}

          {/* Create form */}
          {showCreate && (
            <div className="border border-gray-200 rounded-xl p-4 space-y-4">
              <h3 className="text-sm font-medium text-[#101828]">Create New Link</h3>

              <div>
                <label className="block text-sm font-medium text-[#101828] mb-1">
                  Builder Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Caivan Dev Team"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#101828] mb-1">
                  Email <span className="text-xs text-[#667085] font-normal">(optional)</span>
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="builder@company.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#101828] mb-1">Expires</label>
                <select
                  value={expiration}
                  onChange={e => setExpiration(e.target.value as 'never' | '30d' | '90d')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
                >
                  <option value="never">Never</option>
                  <option value="30d">30 days</option>
                  <option value="90d">90 days</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreate(false)
                    setNewName('')
                    setNewEmail('')
                    setExpiration('never')
                  }}
                  className="px-4 py-2 text-sm font-medium text-[#667085] hover:text-[#101828] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating || !newName.trim()}
                  className="px-4 py-2.5 bg-[#0F766E] text-white text-sm font-medium rounded-lg hover:bg-[#0d6d66] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {creating ? 'Creating...' : 'Create Link'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
