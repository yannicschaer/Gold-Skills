import { useEffect, useCallback } from 'react'
import { useAuthStore } from '@/store/auth'
import { useSkillsStore } from '@/store/skills'
import { SkillLevelSelect } from '@/components/SkillLevelSelect'
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
    await upsertRating(user.id, skillId, current, target)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Meine Skills</h1>
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-48">
                      Ist-Level
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-48">
                      Soll-Level
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-24">
                      Delta
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {categorySkills.map((skill) => {
                    const rating = getRating(skill._id)
                    const current = rating?.current_level ?? 0
                    const target = rating?.target_level ?? 0
                    const delta = target - current

                    return (
                      <tr key={skill._id}>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {skill.title}
                          </div>
                          {skill.description && (
                            <div className="text-xs text-gray-500">
                              {skill.description}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <SkillLevelSelect
                            value={current}
                            onChange={(v) => handleChange(skill._id, 'current', v)}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <SkillLevelSelect
                            value={target}
                            onChange={(v) => handleChange(skill._id, 'target', v)}
                          />
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
