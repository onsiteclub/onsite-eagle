'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function NavTabLink({
  href,
  label,
  count,
}: {
  href: string
  label: string
  count?: number
}) {
  const pathname = usePathname()
  const active = pathname === href || pathname.startsWith(href + '/')

  return (
    <Link
      href={href}
      className={[
        'px-4 py-2.5 font-sans font-bold text-[12px] uppercase tracking-[0.05em] border-b-2 transition-colors',
        active
          ? 'text-ink border-yellow'
          : 'text-ink-3 hover:text-ink-2 border-transparent',
      ].join(' ')}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span
          className={[
            'font-mono text-[10px] ml-1',
            active ? 'text-yellow font-bold' : 'text-ink-3',
          ].join(' ')}
        >
          {count}
        </span>
      )}
    </Link>
  )
}
