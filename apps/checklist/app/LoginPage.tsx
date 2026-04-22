'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@onsite/supabase/client'
import { AuthProvider, useAuth } from '@onsite/auth'
import { AuthFlow } from '@onsite/auth-ui/web'

export default function LoginPage() {
  const [supabase] = useState(() => createClient())

  return (
    <AuthProvider supabase={supabase} emailRedirectTo={typeof window !== 'undefined' ? `${window.location.origin}/` : undefined}>
      <Suspense fallback={<div className="min-h-screen bg-[#F5F5F4] flex items-center justify-center"><div className="text-[#888884]">Loading...</div></div>}>
        <AuthFlowWrapper supabase={supabase} />
      </Suspense>
    </AuthProvider>
  )
}

function AuthFlowWrapper({ supabase }: { supabase: ReturnType<typeof createClient> }) {
  const { user, loading, signIn } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const redirectTo = searchParams.get('redirect') || '/app'

  useEffect(() => {
    if (user && !loading) {
      router.push(redirectTo)
    }
  }, [user, loading, router, redirectTo])

  return (
    <AuthFlow
      appName="Club"
      logo={
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/onsite-club-logo.png"
          alt="OnSite Club"
          className="h-14"
        />
      }
      showSignup={false}
      showForgotPassword={true}
      user={user}
      authLoading={loading}
      onSignIn={async (email, password) => {
        await signIn({ email, password })
      }}
      onForgotPassword={async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(
          email,
          { redirectTo: `${window.location.origin}/` }
        )
        if (error) throw new Error(error.message)
      }}
      onSuccess={() => {
        router.push(redirectTo)
        router.refresh()
      }}
    />
  )
}
