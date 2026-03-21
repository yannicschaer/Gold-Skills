export function ProgressBar({ value, max = 5 }: { value: number; max?: number }) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div className="flex items-center gap-[8px] w-[120px]">
      <div className="relative w-[80px] h-[6px] rounded-[3px] bg-sand-200">
        <div
          className="absolute top-0 left-0 h-[6px] rounded-[3px] bg-mint-400 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-body text-[12px] text-forest-950 tabular-nums">
        {value.toFixed(1)}
      </span>
    </div>
  )
}
