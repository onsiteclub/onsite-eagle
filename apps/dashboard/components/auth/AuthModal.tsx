'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@onsite/supabase/client'
import { X, Eye, EyeOff, Loader2, HardHat } from 'lucide-react'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  mode: 'login' | 'signup'
  onModeChange: (mode: 'login' | 'signup') => void
}

export function AuthModal({ isOpen, onClose, mode, onModeChange }: AuthModalProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nome, setNome] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  if (!isOpen) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        })
        if (error) throw error
      } else {
        // Signup
        if (password.length < 8) {
          throw new Error('Password must be at least 8 characters')
        }

        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: {
              nome: nome.trim(),
            },
          },
        })
        if (error) throw error

        // Update profile with trial
        if (data.user) {
          const trialEndsAt = new Date()
          trialEndsAt.setDate(trialEndsAt.getDate() + 180)

          await supabase
            .from('profiles')
            .update({
              nome: nome.trim(),
              email: email.trim().toLowerCase(),
              subscription_status: 'trialing',
              trial_ends_at: trialEndsAt.toISOString(),
            })
            .eq('id', data.user.id)
        }
      }

      router.push('/account')
      router.refresh()
      onClose()
    } catch (err: any) {
      console.error('Auth error:', err)
      if (err.message?.includes('Invalid login')) {
        setError('Invalid email or password')
      } else if (err.message?.includes('already registered')) {
        setError('This email is already registered. Try signing in.')
      } else {
        setError(err.message || 'An error occurred')
      }
    } finally {
      setLoading(false)
    }
  }

  function switchMode() {
    setError(null)
    onModeChange(mode === 'login' ? 'signup' : 'login')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 text-gray-400 hover:text-gray-600 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="bg-gradient-to-r from-brand-500 to-brand-600 px-8 py-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/20 mb-4">
            <HardHat className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white">
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-brand-100 mt-1">
            {mode === 'login' ? 'Sign in to your account' : 'Start your 6-month free trial'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                placeholder="John Doe"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              placeholder="you@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                placeholder={mode === 'signup' ? 'Min 8 characters' : '••••••••'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {mode === 'login' ? 'Signing in...' : 'Creating account...'}
              </>
            ) : (
              mode === 'login' ? 'Sign In' : 'Create Free Account'
            )}
          </button>

          <p className="text-center text-sm text-gray-600">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={switchMode}
              className="text-brand-600 hover:text-brand-700 font-semibold"
            >
              {mode === 'login' ? 'Sign up free' : 'Sign in'}
            </button>
          </p>
        </form>
      </div>
    </div>
  )
}
