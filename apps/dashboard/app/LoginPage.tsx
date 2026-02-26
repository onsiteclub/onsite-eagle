'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@onsite/supabase/client'
import { AuthProvider, useAuth } from '@onsite/auth'
import { Eye, EyeOff, Loader2, HardHat, CheckCircle } from 'lucide-react'

export default function LoginPage() {
  const [supabase] = useState(() => createClient())

  return (
    <AuthProvider supabase={supabase}>
      <AuthForm />
    </AuthProvider>
  )
}

function AuthForm() {
  const { user, loading: authLoading, signIn, signUp } = useAuth()
  const router = useRouter()

  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Redirect if already authenticated
  useEffect(() => {
    if (user && !authLoading) {
      router.push('/club')
    }
  }, [user, authLoading, router])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setSubmitting(true)

    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email')
      setSubmitting(false)
      return
    }

    try {
      await signIn({ email: cleanEmail, password })
      router.push('/club')
      router.refresh()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign in failed'
      if (msg.includes('Invalid login')) {
        setError('Invalid email or password')
      } else {
        setError(msg)
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setSubmitting(true)

    const cleanEmail = email.trim().toLowerCase()
    const trimmedName = name.trim()

    if (!trimmedName) {
      setError('Please enter your name')
      setSubmitting(false)
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      setSubmitting(false)
      return
    }

    try {
      await signUp({ email: cleanEmail, password, name: trimmedName, role: 'worker' })

      // Small delay for Supabase trigger to create profile
      await new Promise(resolve => setTimeout(resolve, 500))

      // Auto-login after signup
      await signIn({ email: cleanEmail, password })
      router.push('/club')
      router.refresh()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign up failed'
      if (msg.includes('already registered')) {
        setError('This email is already registered. Please sign in.')
        setMode('login')
      } else {
        setError(msg)
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      setError('Enter your email first, then click forgot password')
      return
    }
    setError(null)
    setSubmitting(true)

    try {
      const supabase = createClient()
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo: `${window.location.origin}/reset-password` }
      )
      if (resetError) throw resetError
      setSuccess('Password reset email sent! Check your inbox.')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email')
    } finally {
      setSubmitting(false)
    }
  }

  // Show loading while checking auth state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F6F7F9] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    )
  }

  // Already authenticated — redirecting
  if (user) return null

  return (
    <div className="min-h-screen bg-[#F6F7F9] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8 border border-gray-200">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-brand-500 mb-4">
            <HardHat className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#101828]">OnSite Club</h1>
          <p className="text-[#667085] text-sm mt-1">
            {mode === 'login' ? 'Sign in to your account' : 'Create your account'}
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm mb-4 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            {success}
          </div>
        )}

        {/* Login Form */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent text-[#101828]"
              placeholder="Email"
              autoFocus
              autoComplete="email"
            />

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent text-[#101828]"
                placeholder="Password"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#667085] hover:text-[#101828]"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              {submitting ? 'Signing in...' : 'Sign In'}
            </button>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={submitting}
                className="text-brand-600 hover:underline"
              >
                Forgot password?
              </button>
              <button
                type="button"
                onClick={() => { setMode('signup'); setError(null); setSuccess(null) }}
                className="text-brand-600 hover:underline"
              >
                Create account
              </button>
            </div>
          </form>
        )}

        {/* Signup Form */}
        {mode === 'signup' && (
          <form onSubmit={handleSignup} className="space-y-4">
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent text-[#101828]"
              placeholder="Full name"
              autoFocus
              autoComplete="name"
            />

            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent text-[#101828]"
              placeholder="Email"
              autoComplete="email"
            />

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent text-[#101828]"
                placeholder="Password (min 8 characters)"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#667085] hover:text-[#101828]"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <p className="text-xs text-[#667085] text-center">
              By signing up, you agree to our{' '}
              <a href="/legal/terms" className="text-brand-600 hover:underline">Terms</a> and{' '}
              <a href="/legal/privacy" className="text-brand-600 hover:underline">Privacy Policy</a>.
            </p>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              {submitting ? 'Creating account...' : 'Create Account'}
            </button>

            <button
              type="button"
              onClick={() => { setMode('login'); setError(null); setSuccess(null) }}
              className="w-full text-brand-600 hover:underline text-sm py-1"
            >
              Already have an account? Sign in
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
