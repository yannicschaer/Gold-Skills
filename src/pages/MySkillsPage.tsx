import { useEffect, useCallback, useState } from 'react'
import { useAuthStore } from '@/store/auth'
import { useSkillsStore } from '@/store/skills'
import { useTeamsStore } from '@/store/teams'
import { SkillStepper } from '@/components/SkillStepper'
import { SkillRadarChart } from '@/components/SkillRadarChart'
import { SkillTimeline } from '@/components/SkillTimeline'
import { ProgressBar } from '@/components/ProgressBar'
import { DeltaBadge } from '@/components/DeltaBadge'
import type { SkillLevel } from '@/types/database'
import type { SkillWithCategory } from '@/types/sanity'
import { getCutoffDate, type TimeRange } from '@/lib/dateUtils'
import { CaretUp, X } from '@phosphor-icons/react'

type Tab = 'skills' | 'timeline' | 'analyse'

function SkillDrawer({
  skill,
  onClose,
}: {
  skill: SkillWithCategory
  onClose: () => void
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

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
        <div className="flex-1 overflow-auto p-[24px] flex flex-col gap-[24px]">
          {/* Description */}
          {skill.description ? (
            <p className="font-body text-[14px] leading-[1.7] text-forest-950">
              {skill.description}
            </p>
          ) : (
            <p className="font-body text-[14px] text-neutral-400 italic">
              Keine Beschreibung vorhanden.
            </p>
          )}

          {/* Level Legend */}
          <div className="flex flex-col gap-[2px]">
            <span className="font-body text-[12px] font-semibold text-neutral-400 uppercase tracking-[0.5px] mb-[6px]">
              Skill-Level
            </span>
            {[
              { level: 0, label: 'Keine Erfahrung', sub: 'nie gehört', bg: 'bg-neutral-100', text: 'text-neutral-500' },
              { level: 1, label: 'Anfänger', sub: 'gelesen & gelernt', bg: 'bg-blue-50', text: 'text-blue-700' },
              { level: 2, label: 'Vertraut', sub: 'bereits angewendet', bg: 'bg-green-50', text: 'text-green-700' },
              { level: 3, label: 'Fortgeschritten', sub: 'mehrfach angewendet', bg: 'bg-yellow-50', text: 'text-yellow-700' },
              { level: 4, label: 'Experte', sub: 'Methoden erweitern, Profi', bg: 'bg-orange-50', text: 'text-orange-700' },
              { level: 5, label: 'Meister', sub: 'Vorbildfunktion, gibt Wissen weiter', bg: 'bg-red-50', text: 'text-red-700' },
            ].map(({ level, label, sub, bg, text }) => (
              <div key={level} className={`flex items-center gap-[12px] px-[12px] py-[8px] rounded-[4px] ${bg}`}>
                <span className={`font-body text-[13px] font-semibold ${text} w-[16px] shrink-0`}>{level}</span>
                <span className={`font-body text-[13px] font-medium ${text}`}>{label}</span>
                <span className="font-body text-[12px] text-neutral-400">— {sub}</span>
              </div>
            ))}
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
    skillHistory,
    loading,
    fetchSkillCatalog,
    fetchMyRatings,
    fetchMySkillHistory,
    upsertRating,
  } = useSkillsStore()

  const {
    teams,
    userTeamIds,
    teamSkillGroups,
    teamSkills,
    teamSkillRatings,
    fetchUserTeamData,
    upsertTeamSkillRating,
  } = useTeamsStore()

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [activeTab, setActiveTab] = useState<Tab>('skills')
  const [selectedSkill, setSelectedSkill] = useState<SkillWithCategory | null>(null)
  const [timelineRange, setTimelineRange] = useState<TimeRange>('6m')
  const [timelineFilter, setTimelineFilter] = useState<string>('all')

  useEffect(() => {
    fetchSkillCatalog()
    if (user) {
      fetchMyRatings(user.id)
      fetchUserTeamData(user.id)
    }
  }, [user, fetchSkillCatalog, fetchMyRatings, fetchUserTeamData])

  useEffect(() => {
    if (activeTab === 'timeline' && user) {
      fetchMySkillHistory(user.id, getCutoffDate(timelineRange))
    }
  }, [activeTab, user, timelineRange, fetchMySkillHistory])

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

  const handleTeamSkillChange = async (
    teamSkillId: string,
    field: 'current' | 'target',
    value: SkillLevel,
    prevCurrent: number,
    prevTarget: number,
  ) => {
    if (!user) return
    const current = field === 'current' ? value : prevCurrent
    const target = field === 'target' ? value : prevTarget
    try {
      await upsertTeamSkillRating(user.id, teamSkillId, current, target)
    } catch (err) {
      console.error('Team skill rating save failed:', err)
    }
  }

  const toggleCategory = (categoryId: string) => {
    setCollapsed((prev) => ({ ...prev, [categoryId]: !prev[categoryId] }))
  }

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
                    <div className="flex items-center gap-[16px] pl-[12px] pr-[12px] py-[4px] font-body text-[12px] text-neutral-500 border-b border-sand-200">
                      <span className="flex-1 min-w-0">Skill</span>
                      <span className="shrink-0 w-[88px]">Ist</span>
                      <span className="shrink-0 w-[120px]" />
                      <span className="shrink-0 w-[24px]" />
                      <span className="shrink-0 w-[88px]">Soll</span>
                      <span className="shrink-0 w-[120px]" />
                      <span className="shrink-0 w-[60px]">Delta</span>
                    </div>

                    {categorySkills.map((skill, idx) => {
                      const rating = getRating(skill._id)
                      const current = rating?.current_level ?? 0
                      const target = rating?.target_level ?? 0
                      const delta = current - target
                      const isLast = idx === categorySkills.length - 1

                      return (
                        <button
                          key={skill._id}
                          type="button"
                          onClick={() => setSelectedSkill(skill)}
                          className={`flex items-center gap-[16px] w-full pl-[12px] pr-[12px] py-[8px] text-left hover:bg-sand-50 transition-colors cursor-pointer ${
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

          {/* Team Skills */}
          {userTeamIds.length > 0 &&
            teams
              .filter((t) => userTeamIds.includes(t.id))
              .map((team) => {
                const teamGroups = teamSkillGroups
                  .filter((g) => g.team_id === team.id)
                  .sort((a, b) => a.sort_order - b.sort_order)
                if (teamGroups.length === 0) return null

                return (
                  <div key={team.id} className="mt-[24px]">
                    <div className="flex items-center gap-[12px] mb-[16px]">
                      <div className="h-[1px] flex-1 bg-sand-200" />
                      <span className="font-body text-[12px] font-semibold text-neutral-400 uppercase tracking-[0.5px]">
                        {team.name}
                      </span>
                      <div className="h-[1px] flex-1 bg-sand-200" />
                    </div>

                    {teamGroups.map((group) => {
                      const groupSkills = teamSkills
                        .filter((s) => s.group_id === group.id)
                        .sort((a, b) => a.sort_order - b.sort_order)
                      if (groupSkills.length === 0) return null
                      const isGroupCollapsed = collapsed[`team-${group.id}`] ?? false

                      return (
                        <div key={group.id} className="mb-[16px]">
                          <button
                            type="button"
                            onClick={() => toggleCategory(`team-${group.id}`)}
                            className={`flex items-center justify-between w-full p-[12px] bg-sand-100 border-l-[3px] border-mint-400 rounded-t-[4px] ${
                              isGroupCollapsed ? 'rounded-b-[4px]' : 'rounded-b-0'
                            }`}
                          >
                            <span className="font-body text-[14px] font-semibold leading-[1.5] uppercase text-forest-950">
                              {group.name}
                            </span>
                            <div className="flex items-center gap-[8px]">
                              <span className="font-body text-[14px] text-neutral-500">
                                {groupSkills.length} Skills
                              </span>
                              <CaretUp
                                size={16}
                                className={`text-neutral-500 transition-transform ${
                                  isGroupCollapsed ? 'rotate-180' : ''
                                }`}
                              />
                            </div>
                          </button>

                          {!isGroupCollapsed && (
                            <div className="bg-white rounded-b-[8px] border border-t-0 border-sand-200 overflow-hidden">
                              <div className="flex items-center gap-[16px] pl-[12px] pr-[12px] py-[4px] font-body text-[12px] text-neutral-500 border-b border-sand-200">
                                <span className="flex-1 min-w-0">Skill</span>
                                <span className="shrink-0 w-[88px]">Ist</span>
                                <span className="shrink-0 w-[120px]" />
                                <span className="shrink-0 w-[24px]" />
                                <span className="shrink-0 w-[88px]">Soll</span>
                                <span className="shrink-0 w-[120px]" />
                                <span className="shrink-0 w-[60px]">Delta</span>
                              </div>

                              {groupSkills.map((tSkill, idx) => {
                                const rating = teamSkillRatings.find(
                                  (r) => r.team_skill_id === tSkill.id,
                                )
                                const cur = rating?.current_level ?? 0
                                const tgt = rating?.target_level ?? 0
                                const delta = cur - tgt
                                const isLast = idx === groupSkills.length - 1

                                return (
                                  <div
                                    key={tSkill.id}
                                    className={`flex items-center gap-[16px] w-full pl-[12px] pr-[12px] py-[8px] hover:bg-sand-50 transition-colors ${
                                      isLast ? '' : 'border-b border-sand-200'
                                    }`}
                                  >
                                    <span className="flex-1 font-body text-[12px] leading-[1.5] text-forest-950 truncate min-w-0">
                                      {tSkill.name}
                                    </span>
                                    <div className="shrink-0 w-[88px]">
                                      <SkillStepper
                                        value={cur}
                                        onChange={(v) =>
                                          handleTeamSkillChange(tSkill.id, 'current', v, cur, tgt)
                                        }
                                      />
                                    </div>
                                    <ProgressBar value={cur} />
                                    <div className="shrink-0 w-[24px]" />
                                    <div className="shrink-0 w-[88px]">
                                      <SkillStepper
                                        value={tgt}
                                        onChange={(v) =>
                                          handleTeamSkillChange(tSkill.id, 'target', v, cur, tgt)
                                        }
                                      />
                                    </div>
                                    <ProgressBar value={tgt} />
                                    <div className="shrink-0 w-[60px]">
                                      <DeltaBadge value={delta} />
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
        <div className="mt-[24px]">
          <div className="bg-white rounded-[12px] border border-sand-200 p-[16px]">
            <SkillTimeline
              history={skillHistory}
              ratings={ratings}
              skills={skills}
              categories={categories}
              timeRange={timelineRange}
              selectedFilter={timelineFilter}
              onTimeRangeChange={setTimelineRange}
              onFilterChange={setTimelineFilter}
            />
          </div>
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
