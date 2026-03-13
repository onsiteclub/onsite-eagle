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
        <span className="text-[#667085]">{checked} of {total} checked</span>
        <span className={isComplete ? 'text-[#059669] font-medium' : 'text-[#667085]'}>
          {Math.round(pct)}%
        </span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${isComplete ? 'bg-[#059669]' : 'bg-brand-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
