'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@onsite/supabase/client'
import type { User } from '@supabase/supabase-js'
import { preflightTemplates } from '@/lib/data/templates'

interface AuthGuardProps {
  children: (user: User) => React.ReactNode
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    const redirectToLogin = async () => {
      await supabase.auth.signOut().catch(() => {})
      if (!cancelled) router.replace(`/?redirect=${encodeURIComponent(pathname ?? '/app')}`)
    }

    supabase.auth.getUser().then(({ data, error }) => {
      if (cancelled) return
      if (error || !data.user) {
        void redirectToLogin()
        return
      }
      setUser(data.user)
      setLoading(false)
      void preflightTemplates()
    }).catch(() => {
      if (!cancelled) void redirectToLogin()
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        router.replace('/')
      } else {
        setUser(session.user)
      }
    })

    return () => {
      cancelled = true
      subscription.subscription.unsubscribe()
    }
  }, [router, pathname])

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#F5F5F4] flex items-center justify-center">
        <div className="text-[15px] text-[#888884]">Loading...</div>
      </div>
    )
  }

  return <>{children(user)}</>
}
