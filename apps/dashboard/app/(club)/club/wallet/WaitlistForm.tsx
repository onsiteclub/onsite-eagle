'use client'

import { useState } from 'react'
import { createClient } from '@onsite/supabase/client'

interface WaitlistFormProps {
  userId: string
  defaultName: string
  defaultEmail: string
}

export function WaitlistForm({ userId, defaultName, defaultEmail }: WaitlistFormProps) {
  const [name, setName] = useState(defaultName)
  const [email, setEmail] = useState(defaultEmail)
  const [trade, setTrade] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    const supabase = createClient()
    const { error } = await supabase.from('crd_waitlist').insert({
      user_id: userId,
      full_name: name,
      email,
      trade,
    })

    if (error) {
      setStatus('error')
      setErrorMsg(error.code === '23505' ? 'You are already on the waitlist.' : 'Something went wrong. Please try again.')
    } else {
      setStatus('success')
    }
  }

  if (status === 'success') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
        <p className="text-green-800 font-medium">You're on the waitlist!</p>
        <p className="text-green-600 text-sm mt-1">We'll notify you when the OnSite Card launches.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-[#344054] mb-1 block">Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-[#344054] mb-1 block">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-[#344054] mb-1 block">Trade (optional)</label>
        <input
          type="text"
          value={trade}
          onChange={e => setTrade(e.target.value)}
          placeholder="e.g. Carpenter, Electrician"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
      </div>

      {status === 'error' && (
        <p className="text-red-600 text-sm">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === 'loading' ? 'Joining...' : 'Join the Waitlist'}
      </button>
    </form>
  )
}
