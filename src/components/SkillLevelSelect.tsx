import type { SkillLevel } from '@/types/database'
import { useContentStore } from '@/store/content'

const DEFAULT_LEVELS: { value: SkillLevel; label: string }[] = [
  { value: 0, label: '0 - Keine Kenntnisse' },
  { value: 1, label: '1 - Grundlagen' },
  { value: 2, label: '2 - Fortgeschritten' },
  { value: 3, label: '3 - Kompetent' },
  { value: 4, label: '4 - Experte' },
  { value: 5, label: '5 - Meister' },
]

interface Props {
  value: SkillLevel
  onChange: (level: SkillLevel) => void
  disabled?: boolean
}

export function SkillLevelSelect({ value, onChange, disabled }: Props) {
  const { appSettings } = useContentStore()

  const levels = appSettings?.skillLevels
    ? appSettings.skillLevels.map((sl) => ({
        value: sl.value as SkillLevel,
        label: `${sl.value} - ${sl.label}`,
      }))
    : DEFAULT_LEVELS

  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value) as SkillLevel)}
      disabled={disabled}
      className="block w-full rounded-md border-gray-300 shadow-sm text-sm
                 focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50"
    >
      {levels.map((level) => (
        <option key={level.value} value={level.value}>
          {level.label}
        </option>
      ))}
    </select>
  )
}
