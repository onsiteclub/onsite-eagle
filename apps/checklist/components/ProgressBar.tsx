interface Props {
  checked: number
  total: number
}

export default function ProgressBar({ checked, total }: Props) {
  const pct = total > 0 ? (checked / total) * 100 : 0
  const isComplete = checked === total && total > 0

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-[#888884]">{checked} of {total} checked</span>
        <span className={isComplete ? 'text-[#16A34A] font-medium' : 'text-[#888884]'}>
          {Math.round(pct)}%
        </span>
      </div>
      <div className="w-full bg-[#E5E5E3] rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${isComplete ? 'bg-[#16A34A]' : 'bg-brand-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
