'use client'

import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts'

interface ChartDataPoint {
  date: string
  hours: number
  label: string
}

interface HoursChartProps {
  data: ChartDataPoint[]
}

export function HoursChart({ data }: HoursChartProps) {
  const maxHours = Math.max(...data.map(d => d.hours), 8)
  
  // Color based on hours worked
  const getBarColor = (hours: number) => {
    if (hours === 0) return '#e5e7eb' // gray-200
    if (hours < 4) return '#fde68a' // amber-200
    if (hours < 8) return '#fbbf24' // amber-400
    return '#f59e0b' // amber-500 (brand)
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const hours = payload[0].value
      const wholeHours = Math.floor(hours)
      const minutes = Math.round((hours - wholeHours) * 60)
      
      return (
        <div className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg text-sm">
          <p className="font-medium">{payload[0].payload.label}</p>
          <p className="text-gray-300">
            {wholeHours}h {minutes}min
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
        >
          <CartesianGrid 
            strokeDasharray="3 3" 
            vertical={false} 
            stroke="#f3f4f6"
          />
          <XAxis 
            dataKey="label" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            interval={data.length > 14 ? Math.floor(data.length / 7) : 0}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            domain={[0, Math.ceil(maxHours)]}
            tickFormatter={(value) => `${value}h`}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
          <Bar 
            dataKey="hours" 
            radius={[4, 4, 0, 0]}
            maxBarSize={50}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.hours)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-gray-200" />
          <span>No work</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-amber-200" />
          <span>&lt; 4h</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-amber-400" />
          <span>4-8h</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-amber-500" />
          <span>8h+</span>
        </div>
      </div>
    </div>
  )
}
