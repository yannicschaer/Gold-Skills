import { useEffect, useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { useSkillsStore } from '@/store/skills'
import { SkillStepper } from '@/components/SkillStepper'
import { SkillRadarChart } from '@/components/SkillRadarChart'
import type { SkillLevel } from '@/types/database'

export function MySkillsPage() {
  const { user } = useAuthStore()
  const {
    categories,
    skills,
    ratings,
    loading,
    fetchSkillCatalog,
    fetchMyRatings,
    upsertRating,
  } = useSkillsStore()

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetchSkillCatalog()
    if (user) fetchMyRatings(user.id)
  }, [user, fetchSkillCatalog, fetchMyRatings])

  const getRating = useCallback(
    (skillId: string) => ratings.find((r) => r.skill_id === skillId),
    [ratings],
  )

  const handleChange = async (
    skillId: string,
    field: 'current' | 'target',
    value: SkillLevel,
  ) => {
    if (!user) return
    const existing = getRating(skillId)
    const current = field === 'current' ? value : (existing?.current_level ?? 0)
    const target = field === 'target' ? value : (existing?.target_level ?? 0)
    try {
      await upsertRating(user.id, skillId, current, target)
    } catch (err) {
      console.error('Skill-Rating speichern fehlgeschlagen:', err)
    }
  }

  const toggleCategory = (categoryId: string) => {
    setCollapsed((prev) => ({ ...prev, [categoryId]: !prev[categoryId] }))
  }

  // Build radar data aggregated by category (average per category)
  const radarData = categories
    .filter((cat) => skills.some((s) => s.categorySlug === cat.slug))
    .map((cat) => {
      const catSkills = skills.filter((s) => s.categorySlug === cat.slug)
      let istSum = 0
      let sollSum = 0
      for (const s of catSkills) {
        const r = getRating(s._id)
        istSum += r?.current_level ?? 0
        sollSum += r?.target_level ?? 0
      }
      return {
        name: cat.title,
        ist: Math.round((istSum / catSkills.length) * 10) / 10,
        soll: Math.round((sollSum / catSkills.length) * 10) / 10,
      }
    })

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forest-950" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-[24px]">
      {/* Tabs */}
      <div className="flex items-center gap-[8px]">
        <span className="px-[14px] py-[6px] rounded-[8px] bg-forest-950 text-white font-body text-[14px] font-semibold">
          IST / SOLL
        </span>
        <Link
          to="/team"
          className="px-[14px] py-[6px] rounded-[8px] border border-sand-200 text-neutral-600 font-body text-[14px] font-semibold hover:bg-sand-50 transition-colors"
        >
          Team
        </Link>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-[32px]">
        {/* Left: Skills table */}
        <div className="lg:w-1/3 min-w-0 flex flex-col gap-[4px]">
          {categories.map((category) => {
            const categorySkills = skills.filter(
              (s) => s.categorySlug === category.slug,
            )
            if (categorySkills.length === 0) return null
            const isCollapsed = collapsed[category._id] ?? false

            return (
              <div key={category._id}>
                {/* Category header */}
                <button
                  type="button"
                  onClick={() => toggleCategory(category._id)}
                  className="flex items-center justify-between w-full px-[16px] py-[10px] rounded-[8px] bg-sand-100 hover:bg-sand-200 transition-colors"
                >
                  <span className="font-body text-[13px] font-semibold tracking-[0.5px] uppercase text-forest-950">
                    {category.title}
                  </span>
                  <div className="flex items-center gap-[8px]">
                    <span className="font-body text-[12px] text-neutral-500">
                      {categorySkills.length} Skills
                    </span>
                    <svg
                      className={`size-[16px] text-neutral-500 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Skills rows */}
                {!isCollapsed && (
                  <div className="flex flex-col">
                    {/* Column headers */}
                    <div className="flex items-center px-[16px] py-[6px]">
                      <span className="flex-1 font-body text-[11px] font-semibold uppercase tracking-[0.5px] text-neutral-400">
                        Skill
                      </span>
                      <span className="w-[100px] text-center font-body text-[11px] font-semibold uppercase tracking-[0.5px] text-neutral-400">
                        IST
                      </span>
                      <span className="w-[100px] text-center font-body text-[11px] font-semibold uppercase tracking-[0.5px] text-neutral-400">
                        SOLL
                      </span>
                    </div>

                    {categorySkills.map((skill) => {
                      const rating = getRating(skill._id)
                      const current = rating?.current_level ?? 0
                      const target = rating?.target_level ?? 0

                      return (
                        <div
                          key={skill._id}
                          className="flex items-center px-[16px] py-[8px] border-b border-sand-100 last:border-b-0 hover:bg-sand-50 transition-colors"
                        >
                          <span className="flex-1 font-body text-[14px] text-forest-950 truncate pr-[12px]">
                            {skill.title}
                          </span>
                          <div className="w-[100px] flex justify-center">
                            <SkillStepper
                              value={current}
                              onChange={(v) => handleChange(skill._id, 'current', v)}
                            />
                          </div>
                          <div className="w-[100px] flex justify-center">
                            <SkillStepper
                              value={target}
                              onChange={(v) => handleChange(skill._id, 'target', v)}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Right: Radar chart */}
        <div className="lg:w-2/3 shrink-0">
          <div className="lg:sticky lg:top-[32px]">
            <h2 className="font-heading text-[18px] font-medium text-forest-950 mb-[16px]">
              Skill-Radar
            </h2>
            <div className="bg-white rounded-[12px] border border-sand-200 p-[16px]">
              <div className="w-full mx-auto" style={{ height: 'min(60vh, 500px)' }}>
                <SkillRadarChart data={radarData} />
              </div>
              {/* Legend */}
              <div className="flex items-center justify-center gap-[24px] mt-[12px]">
                <div className="flex items-center gap-[6px]">
                  <div className="w-[16px] h-[3px] rounded-full bg-mint-500" />
                  <span className="font-body text-[12px] text-neutral-500">Ist</span>
                </div>
                <div className="flex items-center gap-[6px]">
                  <div className="w-[16px] h-[3px] rounded-full bg-mint-300 opacity-60" style={{ borderTop: '2px dashed' }} />
                  <span className="font-body text-[12px] text-neutral-500">Soll</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
