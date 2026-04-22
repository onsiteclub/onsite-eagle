import type { ReactNode } from 'react'

export function HelperVoice({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={[
        'mt-3.5 px-3.5 py-3 bg-paper-2 border border-line text-[13px] text-ink-2 leading-[1.5]',
        className,
      ].join(' ')}
      style={{ borderLeft: '3px solid #FFCD11' }}
    >
      {children}
    </div>
  )
}
