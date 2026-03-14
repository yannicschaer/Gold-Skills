import type { SkillLevel } from '@/types/database'

interface Props {
  value: SkillLevel
  onChange: (level: SkillLevel) => void
  disabled?: boolean
}

export function SkillStepper({ value, onChange, disabled }: Props) {
  const decrement = () => {
    if (value > 0) onChange((value - 1) as SkillLevel)
  }
  const increment = () => {
    if (value < 5) onChange((value + 1) as SkillLevel)
  }

  return (
    <div className="flex items-center gap-[2px]">
      <button
        type="button"
        onClick={decrement}
        disabled={disabled || value <= 0}
        className="flex items-center justify-center size-[28px] rounded-[6px] border border-sand-200 bg-white
                   font-body text-[14px] text-forest-950
                   hover:bg-sand-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        −
      </button>
      <span className="flex items-center justify-center w-[32px] font-body text-[14px] font-semibold text-forest-950 tabular-nums">
        {value}
      </span>
      <button
        type="button"
        onClick={increment}
        disabled={disabled || value >= 5}
        className="flex items-center justify-center size-[28px] rounded-[6px] border border-sand-200 bg-white
                   font-body text-[14px] text-forest-950
                   hover:bg-sand-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        +
      </button>
    </div>
  )
}
