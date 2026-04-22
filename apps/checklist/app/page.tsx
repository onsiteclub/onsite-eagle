'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@onsite/supabase/client'
import LoginPage from './LoginPage'

export default function RootPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      if (data.session) {
        setAuthenticated(true)
        const params = new URLSearchParams(window.location.search)
        const redirect = params.get('redirect') || '/app'
        router.replace(redirect)
      } else {
        setLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F4] flex items-center justify-center">
        <div className="text-[15px] text-[#888884]">Loading...</div>
      </div>
    )
  }

  if (authenticated) {
    return null
  }

  return <LoginPage />
}
