import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { SkillRating, SkillRatingHistory } from '@/types/database'
import type { SkillWithCategory, SanitySkillCategory } from '@/types/sanity'
import type { TimeRange } from '@/lib/dateUtils'

interface Props {
  history: SkillRatingHistory[]
  ratings: SkillRating[]
  skills: SkillWithCategory[]
  categories: SanitySkillCategory[]
  timeRange: TimeRange
  selectedFilter: string
  onTimeRangeChange: (range: TimeRange) => void
  onFilterChange: (filter: string) => void
}

const dateFormatter = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'short' })

function formatDate(isoDate: string): string {
  return dateFormatter.format(new Date(isoDate))
}

export function SkillTimeline({
  history,
  ratings,
  skills,
  categories,
  timeRange,
  selectedFilter,
  onTimeRangeChange,
  onFilterChange,
}: Props) {
  const chartData = useMemo(() => {
    if (history.length === 0) return []

    // Find unique dates in ascending order
    const dates = [...new Set(history.map((h) => h.recorded_date))].sort()

    if (selectedFilter === 'all') {
      // Average across all skills for each date
      return dates.map((date) => {
        const rows = history.filter((h) => h.recorded_date === date)
        const avgIst = rows.reduce((sum, r) => sum + r.current_level, 0) / rows.length
        const avgSoll = rows.reduce((sum, r) => sum + r.target_level, 0) / rows.length
        return { date: formatDate(date), ist: Math.round(avgIst * 10) / 10, soll: Math.round(avgSoll * 10) / 10 }
      })
    }

    if (selectedFilter.startsWith('cat:')) {
      const categorySlug = selectedFilter.slice(4)
      const categorySkillIds = new Set(
        skills.filter((s) => s.categorySlug === categorySlug).map((s) => s._id),
      )
      return dates.map((date) => {
        const rows = history.filter(
          (h) => h.recorded_date === date && categorySkillIds.has(h.skill_id),
        )
        if (rows.length === 0) return { date: formatDate(date), ist: 0, soll: 0 }
        const avgIst = rows.reduce((sum, r) => sum + r.current_level, 0) / rows.length
        const avgSoll = rows.reduce((sum, r) => sum + r.target_level, 0) / rows.length
        return { date: formatDate(date), ist: Math.round(avgIst * 10) / 10, soll: Math.round(avgSoll * 10) / 10 }
      })
    }

    if (selectedFilter.startsWith('skill:')) {
      const skillId = selectedFilter.slice(6)
      return history
        .filter((h) => h.skill_id === skillId)
        .map((h) => ({ date: formatDate(h.recorded_date), ist: h.current_level, soll: h.target_level }))
    }

    return []
  }, [history, skills, selectedFilter])

  // Current snapshot by category for the empty state
  const currentSnapshot = useMemo(() => {
    if (ratings.length === 0) return []
    return categories
      .filter((cat) => skills.some((s) => s.categorySlug === cat.slug))
      .map((cat) => {
        const catSkills = skills.filter((s) => s.categorySlug === cat.slug)
        const count = catSkills.length
        let istSum = 0
        let sollSum = 0
        for (const s of catSkills) {
          const r = ratings.find((r) => r.skill_id === s._id)
          istSum += r?.current_level ?? 0
          sollSum += r?.target_level ?? 0
        }
        return {
          name: cat.title,
          ist: Math.round((istSum / count) * 10) / 10,
          soll: Math.round((sollSum / count) * 10) / 10,
        }
      })
  }, [ratings, skills, categories])

  const xAxisInterval = chartData.length > 10 ? Math.floor(chartData.length / 8) : 0

  const isEmpty = chartData.length < 2

  return (
    <div className="flex flex-col gap-[16px]">
      {/* Filter row */}
      <div className="flex items-center justify-between gap-[12px] flex-wrap">
        <select
          value={selectedFilter}
          onChange={(e) => onFilterChange(e.target.value)}
          className="font-body text-[14px] text-forest-950 border border-sand-200 rounded-[6px] px-[10px] py-[6px] bg-white focus:outline-none focus:ring-1 focus:ring-mint-400"
        >
          <option value="all">Alle Kategorien</option>
          <optgroup label="Kategorien">
            {categories.map((cat) => (
              <option key={cat._id} value={`cat:${cat.slug}`}>
                {cat.title}
              </option>
            ))}
          </optgroup>
          <optgroup label="Einzelne Skills">
            {skills.map((skill) => (
              <option key={skill._id} value={`skill:${skill._id}`}>
                {skill.categoryTitle}: {skill.title}
              </option>
            ))}
          </optgroup>
        </select>

        <div className="flex items-center gap-[4px]">
          {(['3m', '6m', 'all'] as TimeRange[]).map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => onTimeRangeChange(range)}
              className={`font-body text-[13px] px-[10px] py-[5px] rounded-[6px] transition-colors ${
                timeRange === range
                  ? 'bg-forest-950 text-white'
                  : 'text-neutral-500 hover:text-forest-950 hover:bg-sand-100'
              }`}
            >
              {range === '3m' ? '3 Monate' : range === '6m' ? '6 Monate' : 'Alles'}
            </button>
          ))}
        </div>
      </div>

      {/* Chart or current snapshot */}
      {isEmpty ? (
        <div className="flex flex-col gap-[12px]">
          <span className="font-body text-[12px] text-neutral-400">Aktueller Stand — Verlauf erscheint nach mehreren Einträgen</span>
          {currentSnapshot.map((cat) => (
            <div key={cat.name} className="flex flex-col gap-[6px]">
              <div className="flex items-center justify-between">
                <span className="font-body text-[13px] font-medium text-forest-950">{cat.name}</span>
                <span className="font-body text-[12px] text-neutral-400">
                  {cat.ist.toFixed(1)} / {cat.soll.toFixed(1)}
                </span>
              </div>
              <div className="relative h-[6px] rounded-full bg-sand-100 overflow-hidden">
                {/* Soll bar */}
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-mint-200"
                  style={{ width: `${(cat.soll / 5) * 100}%` }}
                />
                {/* Ist bar */}
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-mint-500"
                  style={{ width: `${(cat.ist / 5) * 100}%` }}
                />
              </div>
            </div>
          ))}
          {currentSnapshot.length === 0 && (
            <div className="flex flex-col items-center justify-center h-[200px] rounded-[8px] border border-dashed border-sand-200 bg-neutral-50">
              <span className="font-body text-[13px] text-neutral-400 text-center max-w-[260px]">
                Setze zuerst deine Skills — dann erscheint hier dein aktueller Stand.
              </span>
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-[16px] mt-[4px]">
            <div className="flex items-center gap-[6px]">
              <div className="w-[12px] h-[6px] rounded-full bg-mint-500" />
              <span className="font-body text-[12px] text-neutral-500">Ist</span>
            </div>
            <div className="flex items-center gap-[6px]">
              <div className="w-[12px] h-[6px] rounded-full bg-mint-200" />
              <span className="font-body text-[12px] text-neutral-500">Soll</span>
            </div>
          </div>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData} margin={{ top: 8, right: 16, left: -20, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-sand-300)"
                strokeOpacity={0.5}
              />
              <XAxis
                dataKey="date"
                interval={xAxisInterval}
                tick={{ fill: 'var(--color-neutral-400)', fontSize: 11, fontFamily: 'var(--font-body)' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[0, 5]}
                ticks={[0, 1, 2, 3, 4, 5]}
                tick={{ fill: 'var(--color-neutral-400)', fontSize: 10, fontFamily: 'var(--font-body)' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 12,
                  border: '1px solid var(--color-sand-200)',
                  borderRadius: 8,
                  background: '#fff',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                }}
                formatter={(value, name) => [
                  typeof value === 'number' ? value.toFixed(1) : String(value ?? ''),
                  name === 'ist' ? 'Ist' : 'Soll',
                ]}
              />
              <Line
                type="monotone"
                dataKey="soll"
                stroke="var(--color-mint-300)"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="ist"
                stroke="var(--color-mint-500)"
                strokeWidth={2}
                dot={{ r: 3, fill: 'var(--color-forest-950)', stroke: 'var(--color-mint-500)', strokeWidth: 1.5 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="flex items-center justify-center gap-[24px]">
            <div className="flex items-center gap-[6px]">
              <div className="w-[16px] h-[2px] rounded-full bg-[var(--color-mint-500)]" />
              <span className="font-body text-[12px] text-neutral-500">Ist</span>
            </div>
            <div className="flex items-center gap-[6px]">
              <svg width="16" height="2" viewBox="0 0 16 2">
                <line
                  x1="0" y1="1" x2="16" y2="1"
                  stroke="var(--color-mint-300)"
                  strokeWidth="2"
                  strokeDasharray="4 3"
                />
              </svg>
              <span className="font-body text-[12px] text-neutral-500">Soll</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
