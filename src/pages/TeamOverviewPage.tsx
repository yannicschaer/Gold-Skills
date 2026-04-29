import { useEffect, useMemo, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useSkillsStore } from '@/store/skills'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types/database'
import { ExportButtons } from '@/components/ExportButtons'
import { exportTeamCsv, exportTeamPdf } from '@/lib/export'

export function TeamOverviewPage() {
  const {
    categories,
    skills,
    teamRatings,
    loading,
    fetchSkillCatalog,
    fetchTeamRatings,
  } = useSkillsStore()

  const [members, setMembers] = useState<Profile[]>([])

  useEffect(() => {
    fetchSkillCatalog()
    fetchTeamRatings()
    supabase
      .from('profiles')
      .select('*')
      .eq('is_active', true)
      .order('full_name')
      .then(({ data }) => {
        if (data) setMembers(data as Profile[])
      })
  }, [fetchSkillCatalog, fetchTeamRatings])

  const averages = useMemo(() => {
    const map = new Map<string, { currentSum: number; targetSum: number; count: number }>()
    for (const r of teamRatings) {
      const entry = map.get(r.skill_id) ?? { currentSum: 0, targetSum: 0, count: 0 }
      entry.currentSum += r.current_level
      entry.targetSum += r.target_level
      entry.count += 1
      map.set(r.skill_id, entry)
    }
    return map
  }, [teamRatings])

  const teamMembers = useMemo(
    () => members.map((m) => ({ id: m.id, name: m.full_name || m.email })),
    [members],
  )

  const handleExportCsv = useCallback(
    () => exportTeamCsv(teamMembers, categories, skills, teamRatings),
    [teamMembers, categories, skills, teamRatings],
  )

  const handleExportPdf = useCallback(
    () => exportTeamPdf(teamMembers, categories, skills, teamRatings),
    [teamMembers, categories, skills, teamRatings],
  )

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Team-Übersicht</h1>
        <ExportButtons onExportCsv={handleExportCsv} onExportPdf={handleExportPdf} />
      </div>

      {/* Team Members */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Team-Mitglieder</h2>
        <div className="flex flex-wrap gap-2">
          {members.map((m) => (
            <Link
              key={m.id}
              to={`/team/${m.id}`}
              className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium
                         bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-700"
            >
              {m.full_name || m.email}
              <span className="ml-2 text-xs text-gray-400">{m.role}</span>
            </Link>
          ))}
        </div>
      </div>

      {categories.map((category) => {
        const categorySkills = skills.filter(
          (s) => s.categorySlug === category.slug,
        )
        if (categorySkills.length === 0) return null

        return (
          <div key={category._id} className="mb-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">
              {category.title}
            </h2>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Skill
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32">
                      Ø Ist
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32">
                      Ø Soll
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32">
                      Ø Delta
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-24">
                      Antworten
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {categorySkills.map((skill) => {
                    const avg = averages.get(skill._id)
                    const avgCurrent = avg ? avg.currentSum / avg.count : 0
                    const avgTarget = avg ? avg.targetSum / avg.count : 0
                    const avgDelta = avgTarget - avgCurrent

                    return (
                      <tr key={skill._id}>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {skill.title}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-500 h-2 rounded-full"
                                style={{ width: `${(avgCurrent / 5) * 100}%` }}
                              />
                            </div>
                            <span className="w-8 text-right">{avgCurrent.toFixed(1)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-green-500 h-2 rounded-full"
                                style={{ width: `${(avgTarget / 5) * 100}%` }}
                              />
                            </div>
                            <span className="w-8 text-right">{avgTarget.toFixed(1)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              avgDelta > 0
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {avgDelta > 0 ? `+${avgDelta.toFixed(1)}` : avgDelta.toFixed(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 text-center">
                          {avg?.count ?? 0}
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
    </div>
  )
}
