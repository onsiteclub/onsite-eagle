'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@onsite/supabase/client'
import {
  Home,
  LayoutGrid,
  BarChart3,
  CreditCard,
  Trophy,
  Award,
  Newspaper,
  Wallet,
  User,
  Settings,
  Smartphone,
  Shield,
  Lock,
  LogOut,
  HardHat,
  Users,
  PieChart,
  Megaphone,
  Network,
  FileText,
  LucideIcon,
  Building2,
  MapPin,
  ClipboardList,
} from 'lucide-react'

interface SidebarSection {
  title: string
  items: SidebarItem[]
  adminOnly?: boolean
}

interface SidebarItem {
  name: string
  href: string
  icon: LucideIcon
  external?: boolean
}

const sections: SidebarSection[] = [
  {
    title: 'Club',
    items: [
      { name: 'Hub', href: '/club', icon: Home },
      { name: 'My Apps', href: '/club/apps', icon: LayoutGrid },
      { name: 'My Stats', href: '/club/stats', icon: BarChart3 },
      { name: 'Digital Card', href: '/club/card', icon: CreditCard },
      { name: 'Badges', href: '/club/badges', icon: Trophy },
      { name: 'Rewards', href: '/club/rewards', icon: Award },
      { name: 'Wallet', href: '/club/wallet', icon: Wallet },
      { name: 'News', href: '/club/news', icon: Newspaper },
    ],
  },
  {
    title: 'Framing',
    items: [
      { name: 'Overview', href: '/app/framing', icon: HardHat },
      { name: 'Jobsites', href: '/app/framing/jobsites', icon: MapPin },
      { name: 'Crews', href: '/app/framing/crews', icon: Users },
      { name: 'Assignments', href: '/app/framing/assignments', icon: ClipboardList },
    ],
  },
  {
    title: 'Account',
    items: [
      { name: 'Profile', href: '/account/profile', icon: User },
      { name: 'Subscription', href: '/account/subscription', icon: Settings },
      { name: 'Devices', href: '/account/devices', icon: Smartphone },
      { name: 'Privacy', href: '/account/privacy', icon: Lock },
      { name: 'Security', href: '/account/security', icon: Shield },
    ],
  },
  {
    title: 'Admin',
    adminOnly: true,
    items: [
      { name: 'Users', href: '/admin/users', icon: Users },
      { name: 'Analytics', href: '/admin/analytics', icon: PieChart },
      { name: 'Campaigns', href: '/admin/campaigns', icon: Megaphone },
      { name: 'Architecture', href: '/admin/architecture', icon: Network },
    ],
  },
  {
    title: 'Legal',
    items: [
      { name: 'Terms', href: '/legal/terms', icon: FileText, external: true },
      { name: 'Privacy Policy', href: '/legal/privacy', icon: Lock, external: true },
    ],
  },
]

export function ClubSidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  function isActive(href: string) {
    if (href === '/club') return pathname === '/club'
    return pathname.startsWith(href)
  }

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0 shrink-0">
      {/* Logo */}
      <div className="p-5 border-b border-gray-100">
        <Link href="/club" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center">
            <HardHat className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900">OnSite Club</h1>
            <p className="text-xs text-gray-500">Member Hub</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-6 overflow-y-auto">
        {sections.map((section) => {
          if (section.adminOnly && !isAdmin) return null
          return (
            <div key={section.title}>
              <p className="px-4 mb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active = isActive(item.href)
                  const Icon = item.icon
                  if (item.external) {
                    return (
                      <a
                        key={item.name}
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
                      >
                        <Icon className="w-[18px] h-[18px]" />
                        <span>{item.name}</span>
                      </a>
                    )
                  }
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${
                        active
                          ? 'bg-brand-50 text-brand-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon className={`w-[18px] h-[18px] ${active ? 'text-brand-600' : 'text-gray-400'}`} />
                      <span>{item.name}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2.5 w-full rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-[18px] h-[18px]" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
