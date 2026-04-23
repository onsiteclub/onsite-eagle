'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function NavItemLink({
  href,
  label,
  badge,
}: {
  href: string
  label: string
  badge?: number | null
}) {
  const pathname = usePathname()
  const active = pathname === href || pathname.startsWith(href + '/')

  return (
    <Link href={href} className={['nav-item', active ? 'active' : ''].join(' ')}>
      {label}
      {badge !== undefined && badge !== null && badge > 0 && (
        <span className="nav-badge">{badge}</span>
      )}
    </Link>
  )
}
