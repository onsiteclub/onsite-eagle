'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import { Smartphone, Loader2 } from 'lucide-react'

interface DeviceManagerProps {
  deviceId: string | null
  deviceModel: string | null
  devicePlatform: 'ios' | 'android' | 'web' | null
  deviceRegisteredAt: string | null
}

export function DeviceManager({
  deviceId,
  deviceModel,
  devicePlatform,
  deviceRegisteredAt,
}: DeviceManagerProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleUnlink() {
    if (!confirm('Tem certeza que deseja desvincular este dispositivo? Você precisará fazer login novamente no app mobile.')) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/device/unlink', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao desvincular')
      }

      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const platformIcons: Record<string, string> = {
    ios: '🍎',
    android: '🤖',
    web: '💻',
  }

  if (!deviceId) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <Smartphone className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-gray-600 font-medium">Nenhum dispositivo vinculado</p>
        <p className="text-sm text-gray-500 mt-1">
          Faça login no app mobile para vincular
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between py-4 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-2xl">
            {platformIcons[devicePlatform || 'web']}
          </div>
          <div>
            <p className="font-medium text-gray-900">
              {deviceModel || 'Dispositivo'}
            </p>
            <p className="text-sm text-gray-500">
              {devicePlatform === 'ios' && 'iPhone'}
              {devicePlatform === 'android' && 'Android'}
              {devicePlatform === 'web' && 'Web'}
            </p>
            {deviceRegisteredAt && (
              <p className="text-xs text-gray-400 mt-1">
                Vinculado em {formatDate(deviceRegisteredAt)}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={handleUnlink}
          disabled={loading}
          className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Desvincular
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          ℹ️ Você pode vincular apenas 1 dispositivo por conta. 
          Desvincule para trocar de celular.
        </p>
      </div>
    </div>
  )
}
