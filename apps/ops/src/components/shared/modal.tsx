'use client'

import { useEffect, type ReactNode } from 'react'

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  maxWidth = 440,
  bodyClassName,
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  footer?: ReactNode
  maxWidth?: number
  bodyClassName?: string
}) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <div
      className={[
        'fixed inset-0 z-[100] grid place-items-center p-5 transition-opacity duration-200',
        open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
      ].join(' ')}
      style={{ background: 'rgba(10,10,10,0.4)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={[
          'bg-paper border-2 border-ink shadow-hard-lg w-full transition-transform duration-200',
          open ? 'translate-y-0' : 'translate-y-2',
        ].join(' ')}
        style={{ maxWidth }}
      >
        {title && (
          <div className="px-6 pt-4.5 pb-3.5 border-b border-line flex justify-between items-baseline" style={{ paddingTop: '18px' }}>
            <div className="font-black text-[16px] uppercase tracking-[-0.01em]">{title}</div>
            <button
              type="button"
              onClick={onClose}
              className="bg-transparent border-0 cursor-pointer text-[18px] text-ink-3 leading-none hover:text-ink"
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>
        )}
        <div className={bodyClassName ?? 'px-6 py-5'}>{children}</div>
        {footer && (
          <div className="px-6 py-3.5 border-t border-line flex gap-2 justify-end bg-paper-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
