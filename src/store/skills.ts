import { create } from 'zustand'
import type { SkillRating } from '@/types/database'
import type { SkillWithCategory, SanitySkillCategory } from '@/types/sanity'
import { supabase } from '@/lib/supabase'
import { sanityClient } from '@/lib/sanity'

interface SkillsState {
  categories: SanitySkillCategory[]
  skills: SkillWithCategory[]
  ratings: SkillRating[]
  memberRatings: SkillRating[]
  teamRatings: SkillRating[]
  loading: boolean
  fetchSkillCatalog: () => Promise<void>
  fetchMyRatings: (userId: string) => Promise<void>
  fetchUserRatings: (userId: string) => Promise<void>
  fetchTeamRatings: () => Promise<void>
  upsertRating: (
    userId: string,
    skillId: string,
    currentLevel: number,
    targetLevel: number,
  ) => Promise<void>
}

const CATEGORIES_QUERY = `*[_type == "skillCategory"] | order(order asc) { _id, title, "slug": slug.current, order, description }`
const SKILLS_QUERY = `*[_type == "skill"] | order(order asc) { _id, title, "slug": slug.current, category->{ _id, title, "slug": slug.current }, description, order }`

export const useSkillsStore = create<SkillsState>((set, get) => ({
  categories: [],
  skills: [],
  ratings: [],
  memberRatings: [],
  teamRatings: [],
  loading: false,

  fetchSkillCatalog: async () => {
    set({ loading: true })
    const [categories, rawSkills] = await Promise.all([
      sanityClient.fetch<SanitySkillCategory[]>(CATEGORIES_QUERY),
      sanityClient.fetch(SKILLS_QUERY),
    ])

    const skills: SkillWithCategory[] = (rawSkills as Array<Record<string, unknown>>).map(
      (s) => ({
        ...s,
        categoryTitle: (s.category as { title?: string })?.title ?? '',
        categorySlug: (s.category as { slug?: string })?.slug ?? '',
      }),
    ) as SkillWithCategory[]

    set({ categories, skills, loading: false })
  },

  fetchMyRatings: async (userId: string) => {
    const { data } = await supabase
      .from('skill_ratings')
      .select('*')
      .eq('user_id', userId)
    if (data) set({ ratings: data as SkillRating[] })
  },

  fetchUserRatings: async (userId: string) => {
    const { data } = await supabase
      .from('skill_ratings')
      .select('*')
      .eq('user_id', userId)
    if (data) set({ memberRatings: data as SkillRating[] })
  },

  fetchTeamRatings: async () => {
    const { data } = await supabase.from('skill_ratings').select('*')
    if (data) set({ teamRatings: data as SkillRating[] })
  },

  upsertRating: async (userId, skillId, currentLevel, targetLevel) => {
    // Optimistic update first so UI reacts instantly
    const { ratings } = get()
    const existingIdx = ratings.findIndex(
      (r) => r.user_id === userId && r.skill_id === skillId,
    )
    const updated = [...ratings]
    const newRating: SkillRating = {
      id: existingIdx >= 0 ? ratings[existingIdx].id : crypto.randomUUID(),
      user_id: userId,
      skill_id: skillId,
      current_level: currentLevel as SkillRating['current_level'],
      target_level: targetLevel as SkillRating['target_level'],
      updated_at: new Date().toISOString(),
    }
    if (existingIdx >= 0) {
      updated[existingIdx] = newRating
    } else {
      updated.push(newRating)
    }
    set({ ratings: updated })

    // Persist to database
    const { error } = await supabase.from('skill_ratings').upsert(
      {
        user_id: userId,
        skill_id: skillId,
        current_level: currentLevel,
        target_level: targetLevel,
      } as never,
      { onConflict: 'user_id,skill_id' },
    )
    if (error) {
      // Rollback on failure
      set({ ratings })
      throw error
    }
  },
}))
