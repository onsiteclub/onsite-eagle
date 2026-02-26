interface StatBoxProps {
  icon: React.ReactNode
  value: string
  label: string
  variant?: 'default' | 'card'
}

export function StatBox({ icon, value, label, variant = 'default' }: StatBoxProps) {
  const base = 'flex items-center gap-3 p-4 rounded-xl'
  const style = variant === 'card'
    ? `${base} bg-white border border-gray-200`
    : `${base} bg-gray-50`

  return (
    <div className={style}>
      <div className="shrink-0">{icon}</div>
      <div>
        <p className="text-lg font-bold text-[#101828] leading-tight">{value}</p>
        <p className="text-xs text-[#667085]">{label}</p>
      </div>
    </div>
  )
}
