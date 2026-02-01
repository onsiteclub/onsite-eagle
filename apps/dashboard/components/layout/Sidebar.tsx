'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@onsite/supabase/client'
import { User, Settings, FileText, Shield, CreditCard, Lock, LogOut, HardHat, Home, LucideIcon } from 'lucide-react'

type MenuItem = { type: 'divider' } | { type: 'link'; name: string; href: string; icon: LucideIcon; external?: boolean }

const menuItems: MenuItem[] = [
  { type: 'link', name: 'Home', href: '/account', icon: Home },
  { type: 'link', name: 'My Profile', href: '/account/profile', icon: User },
  { type: 'link', name: 'Settings', href: '/account/settings', icon: Settings },
  { type: 'divider' },
  { type: 'link', name: 'Terms of Use', href: '/terms', icon: FileText, external: true },
  { type: 'link', name: 'Privacy Policy', href: '/privacy', icon: Lock, external: true },
  { type: 'link', name: 'Cancellation', href: '/cancellation', icon: CreditCard, external: true },
  { type: 'link', name: 'Data Security', href: '/security', icon: Shield, external: true },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0">
      <div className="p-5 border-b border-gray-100">
        <Link href="/account" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center">
            <HardHat className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900">OnSite Club</h1>
            <p className="text-xs text-gray-500">Member Area</p>
          </div>
        </Link>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item, index) => {
          if (item.type === 'divider') {
            return <div key={index} className="my-4 border-t border-gray-100" />
          }
          const isActive = pathname === item.href
          const Icon = item.icon
          if (item.external) {
            return (
              <a key={item.name} href={item.href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-gray-600 hover:bg-gray-50 hover:text-gray-900">
                <Icon className="w-5 h-5 text-gray-400" />
                <span className="font-medium">{item.name}</span>
              </a>
            )
          }
          return (
            <Link key={item.name} href={item.href} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
              <Icon className={`w-5 h-5 ${isActive ? 'text-brand-600' : 'text-gray-400'}`} />
              <span className="font-medium">{item.name}</span>
            </Link>
          )
        })}
      </nav>
      <div className="p-4 border-t border-gray-100">
        <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors">
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </aside>
  )
}