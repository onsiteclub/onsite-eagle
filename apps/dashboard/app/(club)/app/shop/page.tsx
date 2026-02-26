import { createClient } from '@onsite/supabase/server'
import { redirect } from 'next/navigation'
import { ShoppingBag, Package, CreditCard, Star } from 'lucide-react'
import { StatBox } from '@/components/ui/StatBox'

export const metadata = { title: 'Shop | OnSite Club' }

export default async function ShopAppPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const [{ data: orders }, { count: totalOrders }] = await Promise.all([
    supabase
      .from('shp_orders')
      .select('id, order_number, status, total, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('shp_orders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),
  ])

  const totalSpent = orders?.reduce((sum, o) => sum + (Number(o.total) || 0), 0) ?? 0

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#101828]">Shop</h1>
        <p className="text-[#667085] mt-1">Equipment & gear orders</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatBox variant="card" icon={<Package className="w-5 h-5 text-orange-500" />} value={(totalOrders ?? 0).toString()} label="Total orders" />
        <StatBox variant="card" icon={<CreditCard className="w-5 h-5 text-green-500" />} value={`$${totalSpent.toFixed(2)}`} label="Total spent" />
        <StatBox variant="card" icon={<Star className="w-5 h-5 text-amber-500" />} value="—" label="Tier discount" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="font-semibold text-[#101828] mb-4">Recent Orders</h2>
        {!orders || orders.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingBag className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-[#667085] text-sm">No orders yet. Visit the Shop to browse construction gear.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {orders.map(order => (
              <div key={order.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-[#101828]">Order #{order.order_number}</p>
                  <p className="text-xs text-[#667085]">
                    {new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(order.created_at))}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    order.status === 'delivered' ? 'bg-green-50 text-green-700' :
                    order.status === 'shipped' ? 'bg-blue-50 text-blue-700' :
                    order.status === 'cancelled' ? 'bg-red-50 text-red-700' :
                    'bg-gray-50 text-gray-600'
                  }`}>
                    {order.status}
                  </span>
                  <span className="text-sm font-semibold text-[#101828]">${Number(order.total).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
