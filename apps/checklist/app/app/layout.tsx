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
    <div className="min-h-screen bg-[#F5F5F4]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#1A1A1A] px-4 py-3">
        <div className="max-w-[480px] mx-auto flex items-center justify-between">
          <Link href="/app" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-[10px] bg-[#C58B1B] flex items-center justify-center">
              <span className="text-white font-bold text-sm">GC</span>
            </div>
            <span className="font-semibold text-white text-[15px]">Gate Check</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#B0AFA9]">{displayName}</span>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="text-xs text-[#B0AFA9] hover:text-white transition-colors"
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
