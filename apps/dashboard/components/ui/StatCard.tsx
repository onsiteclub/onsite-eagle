import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  icon?: LucideIcon
  subtitle?: string
  description?: string
  color?: 'blue' | 'green' | 'purple' | 'yellow' | 'red' | 'amber'
}

export function StatCard({ title, value, icon: Icon, subtitle, description, color = 'blue' }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-600',
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500">{title}</p>
        {Icon && (
          <div className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {(subtitle || description) && (
        <p className="text-xs text-gray-400 mt-1">{subtitle || description}</p>
      )}
    </div>
  )
}
