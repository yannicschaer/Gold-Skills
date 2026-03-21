export function DeltaBadge({ value }: { value: number }) {
  const isPositive = value > 0
  const isNegative = value < 0
  return (
    <div
      className={`inline-flex items-center justify-center px-[10px] py-[4px] rounded-full text-[12px] font-semibold font-body tabular-nums ${
        isNegative
          ? 'bg-coral-50 text-coral-600'
          : 'bg-mint-50 text-mint-700'
      }`}
    >
      {isPositive ? '+' : ''}{value.toFixed(1)}
    </div>
  )
}
