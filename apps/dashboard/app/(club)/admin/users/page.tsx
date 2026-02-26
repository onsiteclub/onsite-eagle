import { createClient } from '@onsite/supabase/server'
import { redirect } from 'next/navigation'
import { Users, UserCheck, UserPlus, UserX } from 'lucide-react'
import { StatBox } from '@/components/ui/StatBox'

export const metadata = { title: 'Users | Admin | OnSite Club' }

export default async function AdminUsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  // Verify admin
  const { data: admin } = await supabase
    .from('core_admin_users')
    .select('role')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!admin) redirect('/club')

  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString()

  const [{ count: totalUsers }, { count: activeUsers }, { count: newThisWeek }, { data: recentUsers }] = await Promise.all([
    supabase.from('core_profiles').select('*', { count: 'exact', head: true }),
    supabase.from('core_profiles').select('*', { count: 'exact', head: true }).gte('last_active_at', monthAgo),
    supabase.from('core_profiles').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
    supabase
      .from('core_profiles')
      .select('id, full_name, first_name, email, created_at, last_active_at, province')
      .order('created_at', { ascending: false })
      .limit(25),
  ])

  const inactive = (totalUsers ?? 0) - (activeUsers ?? 0)

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#101828]">User Management</h1>
        <p className="text-[#667085] mt-1">Overview of all registered users</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatBox variant="card" icon={<Users className="w-5 h-5 text-blue-500" />} value={(totalUsers ?? 0).toString()} label="Total users" />
        <StatBox variant="card" icon={<UserCheck className="w-5 h-5 text-green-500" />} value={(activeUsers ?? 0).toString()} label="Active (30d)" />
        <StatBox variant="card" icon={<UserPlus className="w-5 h-5 text-amber-500" />} value={(newThisWeek ?? 0).toString()} label="New this week" />
        <StatBox variant="card" icon={<UserX className="w-5 h-5 text-red-500" />} value={inactive.toString()} label="Inactive" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="font-semibold text-[#101828] mb-4">Recent Users</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-2 font-medium text-[#667085]">Name</th>
                <th className="text-left py-3 px-2 font-medium text-[#667085]">Email</th>
                <th className="text-left py-3 px-2 font-medium text-[#667085]">Province</th>
                <th className="text-left py-3 px-2 font-medium text-[#667085]">Joined</th>
                <th className="text-left py-3 px-2 font-medium text-[#667085]">Last Active</th>
              </tr>
            </thead>
            <tbody>
              {recentUsers?.map(u => (
                <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-2 text-[#101828] font-medium">{u.first_name || u.full_name || '—'}</td>
                  <td className="py-3 px-2 text-[#667085]">{u.email}</td>
                  <td className="py-3 px-2 text-[#667085]">{u.province || '—'}</td>
                  <td className="py-3 px-2 text-[#667085]">
                    {new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric' }).format(new Date(u.created_at))}
                  </td>
                  <td className="py-3 px-2 text-[#667085]">
                    {u.last_active_at
                      ? new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric' }).format(new Date(u.last_active_at))
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
