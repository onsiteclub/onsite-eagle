'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { MessageCircle, X } from 'lucide-react'
import AssistantChat from './AssistantChat'
import type { ProfileWithSubscription } from '@/lib/supabase/types'

interface AssistantWidgetProps {
  profile: ProfileWithSubscription
}

export default function AssistantWidget({ profile }: AssistantWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const pathname = usePathname()

  // Check if user can use assistant (trialing or active subscription)
  const canUseAssistant = ['trialing', 'active'].includes(profile.subscription_status || '')

  // Animation delay for entrance
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 500)
    return () => clearTimeout(timer)
  }, [])

  // Don't render if user doesn't have valid subscription
  if (!canUseAssistant) {
    return null
  }

  return (
    <>
      {/* Chat panel */}
      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <div
            className="fixed inset-0 bg-black/20 z-40 md:hidden"
            onClick={() => setIsOpen(false)}
          />

          {/* Chat window */}
          <div
            className={`fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden transition-all duration-300 ease-out
              ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
              bottom-24 right-4 w-[calc(100%-2rem)] max-w-sm h-[500px] max-h-[70vh]
              md:bottom-24 md:right-6 md:w-96`}
          >
            <AssistantChat
              currentPage={pathname}
              onClose={() => setIsOpen(false)}
            />
          </div>
        </>
      )}

      {/* Floating button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-lg transition-all duration-300 ease-out
          ${isOpen
            ? 'bg-gray-600 hover:bg-gray-700 rotate-0'
            : 'bg-brand-500 hover:bg-brand-600 hover:scale-110'
          }
          ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
        `}
        aria-label={isOpen ? 'Close assistant' : 'Open assistant'}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <MessageCircle className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Tooltip when closed */}
      {!isOpen && isVisible && (
        <div
          className={`fixed bottom-6 right-20 z-40 bg-gray-900 text-white text-sm px-3 py-1.5 rounded-lg shadow-lg
            transition-opacity duration-300 pointer-events-none
            hidden md:block
            ${isVisible ? 'opacity-100' : 'opacity-0'}
          `}
        >
          Need help?
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 w-2 h-2 bg-gray-900 rotate-45" />
        </div>
      )}
    </>
  )
}
