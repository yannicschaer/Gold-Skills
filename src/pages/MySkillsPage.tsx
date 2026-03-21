import { useEffect, useCallback, useState } from 'react'
import { useAuthStore } from '@/store/auth'
import { useSkillsStore } from '@/store/skills'
import { SkillStepper } from '@/components/SkillStepper'
import { SkillRadarChart } from '@/components/SkillRadarChart'
import type { SkillLevel } from '@/types/database'
import type { SkillWithCategory } from '@/types/sanity'
import { CaretUp, X } from '@phosphor-icons/react'

type Tab = 'skills' | 'timeline' | 'analyse'

function ProgressBar({ value, max = 5 }: { value: number; max?: number }) {
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

function DeltaBadge({ value }: { value: number }) {
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

function SkillDrawer({
  skill,
  onClose,
}: {
  skill: SkillWithCategory
  onClose: () => void
}) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-30"
        onClick={onClose}
      />
      {/* Drawer */}
      <div className="fixed top-[64px] right-0 bottom-0 z-40 w-[min(805px,60vw)] bg-white border-l border-sand-200 shadow-[-4px_0px_24px_0px_rgba(0,0,0,0.12)] flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center gap-[16px] p-[24px] border-b border-sand-200">
          <button
            type="button"
            onClick={onClose}
            className="font-body text-[20px] text-forest-950 hover:text-neutral-500 transition-colors"
          >
            <X size={20} weight="bold" />
          </button>
          <h2 className="flex-1 font-heading text-[20px] font-medium leading-[1.4] text-forest-950">
            {skill.title}
          </h2>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-[24px]">
          <div className="flex flex-col items-center justify-center h-[400px] rounded-[8px] border border-dashed border-sand-200 bg-neutral-50">
            <span className="font-body text-[14px] text-neutral-500">
              Content Area
            </span>
          </div>
        </div>
      </div>
    </>
  )
}

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
  const [activeTab, setActiveTab] = useState<Tab>('skills')
  const [selectedSkill, setSelectedSkill] = useState<SkillWithCategory | null>(null)

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

  const drawerOpen = selectedSkill !== null

  // Build radar data aggregated by category
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

  const tabs: { id: Tab; label: string }[] = [
    { id: 'skills', label: 'Skills setzen' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'analyse', label: 'Analyse' },
  ]

  return (
    <div className="flex flex-col">
      {/* Tab Navigation */}
      <div className="flex items-center gap-[18px] border-b border-sand-200">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className="relative flex flex-col items-start pt-[8px] px-[4px]"
            >
              <span
                className={`pb-[12px] font-body text-[14px] leading-[1.5] whitespace-nowrap ${
                  isActive
                    ? 'font-semibold text-forest-950'
                    : 'font-normal text-neutral-500 hover:text-forest-950'
                } transition-colors`}
              >
                {tab.label}
              </span>
              <div
                className={`h-[2px] w-full rounded-t-full bg-mint-400 transition-opacity ${
                  isActive ? 'opacity-100' : 'opacity-0'
                }`}
              />
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'skills' && (
        <div className="flex flex-col mt-[24px]">
          {categories.map((category) => {
            const categorySkills = skills.filter(
              (s) => s.categorySlug === category.slug,
            )
            if (categorySkills.length === 0) return null
            const isCollapsed = collapsed[category._id] ?? false

            return (
              <div key={category._id} className="mb-[16px]">
                {/* Category header */}
                <button
                  type="button"
                  onClick={() => toggleCategory(category._id)}
                  className={`flex items-center justify-between w-full p-[12px] bg-sand-100 border-l-[3px] border-mint-400 rounded-t-[4px] ${
                    isCollapsed ? 'rounded-b-[4px]' : 'rounded-b-0'
                  }`}
                >
                  <span className="font-body text-[14px] font-semibold leading-[1.5] uppercase text-forest-950">
                    {category.title}
                  </span>
                  <div className="flex items-center gap-[8px]">
                    <span className="font-body text-[14px] text-neutral-500">
                      {categorySkills.length} Skills
                    </span>
                    <CaretUp
                      size={16}
                      className={`text-neutral-500 transition-transform ${
                        isCollapsed ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </button>

                {/* Skills rows */}
                {!isCollapsed && (
                  <div className="bg-white rounded-b-[8px] border border-t-0 border-sand-200 overflow-hidden">
                    {/* Column headers */}
                    {!drawerOpen && (
                      <div className="flex items-center gap-[16px] pl-[12px] pr-[12px] py-[4px] font-body text-[12px] text-neutral-500 border-b border-sand-200">
                        <span className="flex-1 min-w-0">Skill</span>
                        <span className="shrink-0 w-[88px]">Ist</span>
                        <span className="shrink-0 w-[120px]" />
                        <span className="shrink-0 w-[24px]" />
                        <span className="shrink-0 w-[88px]">Soll</span>
                        <span className="shrink-0 w-[120px]" />
                        <span className="shrink-0 w-[60px]">Delta</span>
                      </div>
                    )}
                    {/* Column header compact */}
                    {drawerOpen && (
                      <div className="flex items-center pl-[12px] pr-[12px] py-[4px] font-body text-[12px] text-neutral-500 border-b border-sand-200">
                        <span>Skill</span>
                      </div>
                    )}

                    {categorySkills.map((skill, idx) => {
                      const rating = getRating(skill._id)
                      const current = rating?.current_level ?? 0
                      const target = rating?.target_level ?? 0
                      const delta = current - target
                      const isLast = idx === categorySkills.length - 1
                      const isSelected = selectedSkill?._id === skill._id

                      if (drawerOpen) {
                        // Compact row: just skill name
                        return (
                          <button
                            key={skill._id}
                            type="button"
                            onClick={() => setSelectedSkill(skill)}
                            className={`flex items-center w-full pl-[12px] pr-[12px] py-[8px] text-left transition-colors ${
                              isLast ? '' : 'border-b border-sand-200'
                            } ${
                              isSelected
                                ? 'bg-sand-50'
                                : 'hover:bg-sand-50'
                            }`}
                          >
                            <span className="font-body text-[12px] leading-[1.5] text-forest-950 truncate">
                              {skill.title}
                            </span>
                          </button>
                        )
                      }

                      // Full row with stepper, progress, delta
                      return (
                        <button
                          key={skill._id}
                          type="button"
                          onClick={() => setSelectedSkill(skill)}
                          className={`flex items-center gap-[16px] w-full pl-[12px] pr-[12px] py-[8px] text-left hover:bg-sand-50 transition-colors ${
                            isLast ? '' : 'border-b border-sand-200'
                          }`}
                        >
                          <span className="flex-1 font-body text-[12px] leading-[1.5] text-forest-950 truncate min-w-0">
                            {skill.title}
                          </span>
                          <div className="shrink-0 w-[88px]" onClick={(e) => e.stopPropagation()}>
                            <SkillStepper
                              value={current}
                              onChange={(v) => handleChange(skill._id, 'current', v)}
                            />
                          </div>
                          <ProgressBar value={current} />
                          <div className="shrink-0 w-[24px]" />
                          <div className="shrink-0 w-[88px]" onClick={(e) => e.stopPropagation()}>
                            <SkillStepper
                              value={target}
                              onChange={(v) => handleChange(skill._id, 'target', v)}
                            />
                          </div>
                          <ProgressBar value={target} />
                          <div className="shrink-0 w-[60px]">
                            <DeltaBadge value={delta} />
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {activeTab === 'analyse' && (
        <div className="mt-[24px]">
          <div className="bg-white rounded-[12px] border border-sand-200 p-[16px]">
            <div className="w-full mx-auto" style={{ height: 'min(60vh, 500px)' }}>
              <SkillRadarChart data={radarData} />
            </div>
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
      )}

      {activeTab === 'timeline' && (
        <div className="flex items-center justify-center py-[64px] text-neutral-400 font-body text-[14px]">
          Timeline — kommt bald
        </div>
      )}

      {/* Skill Drawer */}
      {selectedSkill && (
        <SkillDrawer
          skill={selectedSkill}
          onClose={() => setSelectedSkill(null)}
        />
      )}
    </div>
  )
}
