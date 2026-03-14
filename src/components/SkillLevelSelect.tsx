import type { SkillLevel } from '@/types/database'
import { useContentStore } from '@/store/content'

const DEFAULT_LEVELS: { value: SkillLevel; label: string }[] = [
  { value: 0, label: '0 - Keine Erfahrung' },
  { value: 1, label: '1 - Anfänger' },
  { value: 2, label: '2 - Grundlagen' },
  { value: 3, label: '3 - Fortgeschritten' },
  { value: 4, label: '4 - Solide Kenntnisse' },
  { value: 5, label: '5 - Kompetent' },
  { value: 6, label: '6 - Erfahren' },
  { value: 7, label: '7 - Fortgeschritten+' },
  { value: 8, label: '8 - Profi' },
  { value: 9, label: '9 - Experte' },
  { value: 10, label: '10 - Meister' },
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
