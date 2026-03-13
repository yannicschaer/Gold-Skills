import { useEffect, useMemo } from 'react'
import { useSkillsStore } from '@/store/skills'

export function TeamOverviewPage() {
  const {
    categories,
    skills,
    teamRatings,
    loading,
    fetchSkillCatalog,
    fetchTeamRatings,
  } = useSkillsStore()

  useEffect(() => {
    fetchSkillCatalog()
    fetchTeamRatings()
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

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Team-Übersicht</h1>
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
