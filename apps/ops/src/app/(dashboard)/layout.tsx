import { NavTabs } from '@/components/shared/nav-tabs'
import { Topbar } from '@/components/shared/topbar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      <Topbar />
      <NavTabs />
      <main className="max-w-[880px] mx-auto px-7 pb-16">{children}</main>
    </div>
  )
}
