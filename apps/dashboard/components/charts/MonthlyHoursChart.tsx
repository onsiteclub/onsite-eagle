'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface MonthlyData {
  month: string
  hours: number
}

export function MonthlyHoursChart({ data }: { data: MonthlyData[] }) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-[#667085] text-sm">
        No hours tracked yet.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis
          dataKey="month"
          tick={{ fill: '#667085', fontSize: 12 }}
          axisLine={{ stroke: '#E5E7EB' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#667085', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => `${v}h`}
        />
        <Tooltip
          formatter={(value) => [`${value}h`, 'Hours']}
          contentStyle={{
            borderRadius: '8px',
            border: '1px solid #E5E7EB',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
          }}
        />
        <Bar dataKey="hours" fill="#0F766E" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
