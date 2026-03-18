import { useEffect, useCallback, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useSkillsStore } from '@/store/skills'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types/database'

export function MemberSkillsPage() {
  const { userId } = useParams<{ userId: string }>()
  const {
    categories,
    skills,
    memberRatings,
    loading,
    fetchSkillCatalog,
    fetchUserRatings,
  } = useSkillsStore()

  const [member, setMember] = useState<Profile | null>(null)

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

  const getRating = useCallback(
    (skillId: string) => memberRatings.find((r) => r.skill_id === skillId),
    [memberRatings],
  )

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
        <h1 className="text-2xl font-bold text-gray-900 mt-2">
          {member.full_name || member.email}
        </h1>
        <p className="text-sm text-gray-500">{member.email}</p>
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
                      Ist-Level
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32">
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
