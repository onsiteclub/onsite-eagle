'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, CreditCard, ExternalLink } from 'lucide-react'

interface SubscriptionManagerProps {
  hasPaymentMethod: boolean
  subscriptionStatus: string
  stripeCustomerId: string | null
}

export function SubscriptionManager({
  hasPaymentMethod,
  subscriptionStatus,
  stripeCustomerId,
}: SubscriptionManagerProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleManageSubscription() {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao acessar portal')
      }

      // Redirect to Stripe Customer Portal
      window.location.href = data.url
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  async function handleAddPaymentMethod() {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar checkout')
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  async function handleCancelSubscription() {
    if (!confirm('Tem certeza que deseja cancelar sua assinatura? Você terá 100% de reembolso no primeiro ano.')) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/stripe/cancel', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao cancelar')
      }

      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Payment Method Status */}
      <div className="flex items-center justify-between py-4 border-b border-gray-100">
        <div>
          <p className="font-medium text-gray-900">Método de Pagamento</p>
          <p className="text-sm text-gray-500">
            {hasPaymentMethod ? 'Cartão cadastrado' : 'Nenhum cartão cadastrado'}
          </p>
        </div>
        
        {hasPaymentMethod ? (
          <button
            onClick={handleManageSubscription}
            disabled={loading}
            className="flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 font-medium disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
            Gerenciar
          </button>
        ) : (
          <button
            onClick={handleAddPaymentMethod}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
            Adicionar Cartão
          </button>
        )}
      </div>

      {/* Cancel Subscription */}
      {(subscriptionStatus === 'active' || subscriptionStatus === 'trialing') && (
        <div className="pt-2">
          <button
            onClick={handleCancelSubscription}
            disabled={loading}
            className="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
          >
            Cancelar Assinatura
          </button>
          <p className="text-xs text-gray-500 mt-1">
            Reembolso total no primeiro ano
          </p>
        </div>
      )}

      {/* Reactivate */}
      {subscriptionStatus === 'canceled' && (
        <div className="pt-2">
          <button
            onClick={handleAddPaymentMethod}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Reativar Assinatura
          </button>
        </div>
      )}
    </div>
  )
}
