import { MainHead } from '@/components/shell/main-head'
import { Sidebar } from '@/components/shell/sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="shell">
      <Sidebar />
      <main className="main">
        <MainHead />
        <div className="view">{children}</div>
      </main>
    </div>
  )
}
