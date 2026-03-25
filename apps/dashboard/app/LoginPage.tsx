'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@onsite/supabase/client'
import { AuthProvider, useAuth } from '@onsite/auth'
import { AuthFlow } from '@onsite/auth-ui/web'
import type { SignupProfile } from '@onsite/auth-ui/web'

export default function LoginPage() {
  const [supabase] = useState(() => createClient())

  return (
    <AuthProvider supabase={supabase} emailRedirectTo={`${window.location.origin}/auth/callback`}>
      <AuthFlowWrapper supabase={supabase} />
    </AuthProvider>
  )
}

function AuthFlowWrapper({ supabase }: { supabase: ReturnType<typeof createClient> }) {
  const { user, loading, signIn, signUp } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Read redirect destination from URL (set by middleware when protecting routes)
  const redirectTo = searchParams.get('redirect') || '/club'

  // Redirect if already authenticated
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
      showSignup={true}
      showForgotPassword={true}
      legal={{ termsUrl: '/legal/terms', privacyUrl: '/legal/privacy' }}
      user={user}
      authLoading={loading}
      onSignIn={async (email, password) => {
        await signIn({ email, password })
      }}
      onSignUp={async (email, password, profile: SignupProfile) => {
        await signUp({
          email,
          password,
          name: profile.name,
          role: 'worker',
          firstName: profile.firstName,
          lastName: profile.lastName,
          dateOfBirth: profile.dateOfBirth,
          trade: profile.trade,
          gender: profile.gender,
        })
        return { needsConfirmation: true }
      }}
      onForgotPassword={async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(
          email,
          { redirectTo: `${window.location.origin}/reset-password` }
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
