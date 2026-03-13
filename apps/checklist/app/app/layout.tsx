import { createClient } from '@onsite/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  const { data: profile } = await supabase
    .from('core_profiles')
    .select('full_name, first_name')
    .eq('id', user.id)
    .single()

  const displayName = profile?.first_name || profile?.full_name || user.email || 'Worker'

  return (
    <div className="min-h-screen bg-[#F6F7F9]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#E5E7EB] px-4 py-3">
        <div className="max-w-[480px] mx-auto flex items-center justify-between">
          <Link href="/app" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">GC</span>
            </div>
            <span className="font-semibold text-[#101828] text-sm">Gate Check</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#667085]">{displayName}</span>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="text-xs text-[#667085] hover:text-[#101828] transition-colors"
              >
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-[480px] mx-auto px-4 py-4">
        {children}
      </main>
    </div>
  )
}
