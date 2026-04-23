'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@onsite/supabase/client'
import AuthGuard from '@/components/AuthGuard'
import SyncBadge from '@/components/SyncBadge'

/**
 * Client-side layout for the authenticated /app section.
 *
 * Works in both deployment targets:
 *  - Web (Vercel SSR): `middleware.ts` blocks unauthenticated requests
 *    BEFORE this layout renders, so <AuthGuard> only briefly sees a
 *    valid session and hands off immediately.
 *  - Capacitor (static export): no middleware, so <AuthGuard> is the
 *    sole authentication gate.
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      {(user) => <AuthedLayout userId={user.id} userEmail={user.email ?? ''}>{children}</AuthedLayout>}
    </AuthGuard>
  )
}

function AuthedLayout({
  userId,
  userEmail,
  children,
}: {
  userId: string
  userEmail: string
  children: React.ReactNode
}) {
  const router = useRouter()
  const [displayName, setDisplayName] = useState<string>(userEmail || 'Worker')

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('core_profiles')
      .select('full_name, first_name')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (data) {
          setDisplayName(data.first_name || data.full_name || userEmail || 'Worker')
        }
      })
  }, [userId, userEmail])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/')
  }

  return (
    <div className="min-h-screen bg-[#F5F5F4]">
      <header className="sticky top-0 z-50 bg-[#1A1A1A] px-4 py-3">
        <div className="max-w-[480px] mx-auto flex items-center justify-between">
          <Link href="/app" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-[10px] bg-[#C58B1B] flex items-center justify-center">
              <span className="text-white font-bold text-sm">GC</span>
            </div>
            <span className="font-semibold text-white text-[15px]">Gate Check</span>
          </Link>
          <div className="flex items-center gap-3">
            <SyncBadge />
            <span className="text-xs text-[#B0AFA9]">{displayName}</span>
            <button
              onClick={handleSignOut}
              className="text-xs text-[#B0AFA9] hover:text-white transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[480px] mx-auto px-4 py-4">
        {children}
      </main>
    </div>
  )
}
