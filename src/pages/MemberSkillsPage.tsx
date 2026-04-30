import { useEffect, useCallback, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { useSkillsStore } from '@/store/skills'
import { supabase } from '@/lib/supabase'
import type { Profile, SkillLevel } from '@/types/database'
import { ExportButtons } from '@/components/ExportButtons'
import { SkillStepper } from '@/components/SkillStepper'
import { SkillTimeline } from '@/components/SkillTimeline'
import { exportPersonCsv, exportPersonPdf } from '@/lib/export'
import { getCutoffDate, type TimeRange } from '@/lib/dateUtils'
import {
  addToCounts,
  emptyCounts,
  getConfirmationState,
  type ConfirmationState,
} from '@/lib/confirmation'

type FilterMode = 'all' | 'open'
type Tab = 'skills' | 'history'

const STATE_LABEL: Record<ConfirmationState, string> = {
  open: 'Offen',
  drift: 'Drift',
  confirmed: 'Bestätigt',
}

const STATE_DOT: Record<ConfirmationState, string> = {
  open: 'bg-gray-300',
  drift: 'bg-orange-400',
  confirmed: 'bg-green-500',
}

export function MemberSkillsPage() {
  const { userId } = useParams<{ userId: string }>()
  const { user, isAdmin } = useAuthStore()
  const {
    categories,
    skills,
    memberRatings,
    memberSkillHistory,
    loading,
    fetchSkillCatalog,
    fetchUserRatings,
    fetchUserSkillHistory,
    confirmRating,
    clearConfirmation,
  } = useSkillsStore()

  const [member, setMember] = useState<Profile | null>(null)
  const [filter, setFilter] = useState<FilterMode>('all')
  const [tab, setTab] = useState<Tab>('skills')
  const [timeRange, setTimeRange] = useState<TimeRange>('6m')
  const [historyFilter, setHistoryFilter] = useState<string>('all')

  useEffect(() => {
    setMember(null)
    fetchSkillCatalog()
    if (userId) {
      fetchUserRatings(userId)
      supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
        .then(({ data }) => {
          if (data) setMember(data as Profile)
        })
    }
  }, [userId, fetchSkillCatalog, fetchUserRatings])

  useEffect(() => {
    if (tab === 'history' && userId) {
      fetchUserSkillHistory(userId, getCutoffDate(timeRange))
    }
  }, [tab, userId, timeRange, fetchUserSkillHistory])

  const getRating = useCallback(
    (skillId: string) => memberRatings.find((r) => r.skill_id === skillId),
    [memberRatings],
  )

  const canConfirm = !!member && !!user && (isAdmin || member.manager_id === user.id)

  const totals = useMemo(() => {
    const counts = emptyCounts()
    for (const skill of skills) {
      addToCounts(counts, getConfirmationState(getRating(skill._id)))
    }
    return counts
  }, [skills, getRating])

  const handleConfirm = async (skillId: string, level: SkillLevel) => {
    if (!userId) return
    try {
      await confirmRating(userId, skillId, level)
    } catch (err) {
      console.error('Confirmation failed:', err)
    }
  }

  const handleClear = async (skillId: string) => {
    if (!userId) return
    try {
      await clearConfirmation(userId, skillId)
    } catch (err) {
      console.error('Clear confirmation failed:', err)
    }
  }

  if (loading || !member) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          to="/team"
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          &larr; Zurück zur Team-Übersicht
        </Link>
        <div className="flex items-center justify-between mt-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {member.full_name || member.email}
            </h1>
            <p className="text-sm text-gray-500">{member.email}</p>
          </div>
          <ExportButtons
            onExportCsv={() => exportPersonCsv(member.full_name || member.email, categories, skills, memberRatings)}
            onExportPdf={() => exportPersonPdf(member.full_name || member.email, categories, skills, memberRatings)}
          />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 flex items-center gap-1 border-b border-gray-200">
        {([
          { id: 'skills', label: 'Skills' },
          { id: 'history', label: 'Verlauf' },
        ] as const).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`relative px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? 'text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
            {tab === t.id && (
              <span className="absolute inset-x-2 -bottom-px h-[2px] bg-gray-900" />
            )}
          </button>
        ))}
      </div>

      {tab === 'history' ? (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <SkillTimeline
            history={memberSkillHistory}
            ratings={memberRatings}
            skills={skills}
            categories={categories}
            timeRange={timeRange}
            selectedFilter={historyFilter}
            onTimeRangeChange={setTimeRange}
            onFilterChange={setHistoryFilter}
          />
        </div>
      ) : (
        <>
      {/* Status-Übersicht + Filter */}
      {canConfirm && (
        <div className="mb-6 flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3">
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-2">
              <span className={`inline-block size-[10px] rounded-full ${STATE_DOT.open}`} />
              <span className="text-gray-700">
                {totals.open} <span className="text-gray-500">offen</span>
              </span>
            </span>
            <span className="flex items-center gap-2">
              <span className={`inline-block size-[10px] rounded-full ${STATE_DOT.drift}`} />
              <span className="text-gray-700">
                {totals.drift} <span className="text-gray-500">drift</span>
              </span>
            </span>
            <span className="flex items-center gap-2">
              <span className={`inline-block size-[10px] rounded-full ${STATE_DOT.confirmed}`} />
              <span className="text-gray-700">
                {totals.confirmed} <span className="text-gray-500">bestätigt</span>
              </span>
            </span>
          </div>
          <div className="flex items-center gap-1 rounded-md bg-gray-100 p-1">
            {(['all', 'open'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setFilter(m)}
                className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                  filter === m
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {m === 'all' ? 'Alle' : 'Nur offen + drift'}
              </button>
            ))}
          </div>
        </div>
      )}

      {categories.map((category) => {
        const categorySkills = skills.filter(
          (s) => s.categorySlug === category.slug,
        )
        if (categorySkills.length === 0) return null

        // Per-Kategorie-Status-Counts (alle Skills, ungefiltert)
        const catCounts = emptyCounts()
        for (const s of categorySkills) {
          addToCounts(catCounts, getConfirmationState(getRating(s._id)))
        }

        // Anzeige-Skills nach Filter
        const visibleSkills =
          filter === 'open'
            ? categorySkills.filter((s) => {
                const state = getConfirmationState(getRating(s._id))
                return state !== 'confirmed'
              })
            : categorySkills

        if (visibleSkills.length === 0) return null

        return (
          <div key={category._id} className="mb-8">
            <div className="mb-3 flex items-baseline justify-between border-b pb-2">
              <h2 className="text-lg font-semibold text-gray-800">{category.title}</h2>
              {canConfirm && (
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  {catCounts.open > 0 && (
                    <span className="flex items-center gap-1">
                      <span className={`inline-block size-[8px] rounded-full ${STATE_DOT.open}`} />
                      {catCounts.open} offen
                    </span>
                  )}
                  {catCounts.drift > 0 && (
                    <span className="flex items-center gap-1">
                      <span className={`inline-block size-[8px] rounded-full ${STATE_DOT.drift}`} />
                      {catCounts.drift} drift
                    </span>
                  )}
                  {catCounts.confirmed > 0 && (
                    <span className="flex items-center gap-1">
                      <span className={`inline-block size-[8px] rounded-full ${STATE_DOT.confirmed}`} />
                      {catCounts.confirmed} bestätigt
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Skill
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32">
                      Ist-Level
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32">
                      Soll-Level
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-24">
                      Delta
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-48">
                      Bestätigt
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {visibleSkills.map((skill) => {
                    const rating = getRating(skill._id)
                    const current = rating?.current_level ?? 0
                    const target = rating?.target_level ?? 0
                    const delta = target - current
                    const isConfirmed =
                      rating?.confirmation_status === 'confirmed' &&
                      rating?.confirmed_level !== null
                    const confirmedValue =
                      (rating?.confirmed_level ?? current) as SkillLevel
                    const state = getConfirmationState(rating)

                    return (
                      <tr key={skill._id}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-block size-[10px] shrink-0 rounded-full ${STATE_DOT[state]}`}
                              title={STATE_LABEL[state]}
                            />
                            <div className="text-sm font-medium text-gray-900">
                              {skill.title}
                            </div>
                          </div>
                          {skill.description && (
                            <div className="ml-[18px] text-xs text-gray-500">
                              {skill.description}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-500 h-2 rounded-full"
                                style={{ width: `${(current / 5) * 100}%` }}
                              />
                            </div>
                            <span className="w-6 text-right">{current}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-green-500 h-2 rounded-full"
                                style={{ width: `${(target / 5) * 100}%` }}
                              />
                            </div>
                            <span className="w-6 text-right">{target}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              delta > 0
                                ? 'bg-yellow-100 text-yellow-800'
                                : delta === 0
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {delta > 0 ? `+${delta}` : delta}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {canConfirm ? (
                            <div className="flex items-center gap-2">
                              <SkillStepper
                                value={confirmedValue}
                                onChange={(v) => handleConfirm(skill._id, v)}
                              />
                              {isConfirmed && (
                                <button
                                  type="button"
                                  onClick={() => handleClear(skill._id)}
                                  className="text-xs text-gray-500 hover:text-gray-800 underline"
                                  title="Bestätigung zurücksetzen"
                                >
                                  Reset
                                </button>
                              )}
                            </div>
                          ) : isConfirmed ? (
                            <span className="text-sm text-gray-700">
                              {rating?.confirmed_level}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 italic">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
        </>
      )}
    </div>
  )
}
