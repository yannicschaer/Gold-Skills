import { create } from 'zustand'
import type { SkillLevel, SkillRating, SkillRatingHistory } from '@/types/database'
import type { SkillWithCategory, SanitySkillCategory } from '@/types/sanity'
import { supabase } from '@/lib/supabase'
import { sanityClient } from '@/lib/sanity'

interface SkillsState {
  categories: SanitySkillCategory[]
  skills: SkillWithCategory[]
  ratings: SkillRating[]
  memberRatings: SkillRating[]
  teamRatings: SkillRating[]
  skillHistory: SkillRatingHistory[]
  memberSkillHistory: SkillRatingHistory[]
  loading: boolean
  fetchSkillCatalog: () => Promise<void>
  fetchMyRatings: (userId: string) => Promise<void>
  fetchUserRatings: (userId: string) => Promise<void>
  fetchTeamRatings: () => Promise<void>
  fetchMySkillHistory: (userId: string, sinceDate?: string) => Promise<void>
  fetchUserSkillHistory: (userId: string, sinceDate?: string) => Promise<void>
  upsertRating: (
    userId: string,
    skillId: string,
    currentLevel: number,
    targetLevel: number,
  ) => Promise<void>
  confirmRating: (
    userId: string,
    skillId: string,
    confirmedLevel: number,
  ) => Promise<void>
  clearConfirmation: (userId: string, skillId: string) => Promise<void>
}

const CATEGORIES_QUERY = `*[_type == "skillCategory"] | order(order asc) { _id, title, "slug": slug.current, order, description }`
const SKILLS_QUERY = `*[_type == "skill"] | order(order asc) { _id, title, "slug": slug.current, category->{ _id, title, "slug": slug.current }, description, order }`

export const useSkillsStore = create<SkillsState>((set, get) => ({
  categories: [],
  skills: [],
  ratings: [],
  memberRatings: [],
  teamRatings: [],
  skillHistory: [],
  memberSkillHistory: [],
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

  fetchMySkillHistory: async (userId: string, sinceDate?: string) => {
    let query = supabase
      .from('skill_rating_history')
      .select('*')
      .eq('user_id', userId)
      .order('recorded_date', { ascending: true })

    if (sinceDate) {
      query = query.gte('recorded_date', sinceDate)
    }

    const { data, error } = await query
    if (error) {
      console.error('Fehler beim Laden der Skill-Historie:', error)
      return
    }
    if (data) set({ skillHistory: data as SkillRatingHistory[] })
  },

  fetchUserSkillHistory: async (userId: string, sinceDate?: string) => {
    // Manager-Sicht auf einen Direct Report (RLS lässt nur Manager + Admin durch).
    let query = supabase
      .from('skill_rating_history')
      .select('*')
      .eq('user_id', userId)
      .order('recorded_date', { ascending: true })

    if (sinceDate) {
      query = query.gte('recorded_date', sinceDate)
    }

    const { data, error } = await query
    if (error) {
      console.error('Fehler beim Laden der Member-Skill-Historie:', error)
      return
    }
    if (data) set({ memberSkillHistory: data as SkillRatingHistory[] })
  },

  upsertRating: async (userId, skillId, currentLevel, targetLevel) => {
    // Clamp values to valid range 0-5
    const clampedCurrent = Math.max(0, Math.min(5, Math.round(currentLevel)))
    const clampedTarget = Math.max(0, Math.min(5, Math.round(targetLevel)))

    // Optimistic update first so UI reacts instantly
    const { ratings } = get()
    const existingIdx = ratings.findIndex(
      (r) => r.user_id === userId && r.skill_id === skillId,
    )
    const existing = existingIdx >= 0 ? ratings[existingIdx] : null
    const updated = [...ratings]
    const newRating: SkillRating = {
      id: existing?.id ?? crypto.randomUUID(),
      user_id: userId,
      skill_id: skillId,
      current_level: clampedCurrent as SkillRating['current_level'],
      target_level: clampedTarget as SkillRating['target_level'],
      // Confirmation-Felder werden vom DB-Trigger gegen Self-Edits geschützt;
      // optimistisch behalten wir den letzten bekannten Wert bei.
      confirmation_status: existing?.confirmation_status ?? 'self_assessed',
      confirmed_level: existing?.confirmed_level ?? null,
      confirmed_by: existing?.confirmed_by ?? null,
      confirmed_at: existing?.confirmed_at ?? null,
      updated_at: new Date().toISOString(),
    }
    if (existingIdx >= 0) {
      updated[existingIdx] = newRating
    } else {
      updated.push(newRating)
    }
    set({ ratings: updated })

    // Persist to database (only self-fields — confirmation kommt via confirmRating)
    const payload: Record<string, unknown> = {
      user_id: userId,
      skill_id: skillId,
      current_level: clampedCurrent,
      target_level: clampedTarget,
    }
    const { error } = await supabase
      .from('skill_ratings')
      .upsert(payload as never, { onConflict: 'user_id,skill_id' })
    if (error) {
      // Rollback on failure
      set({ ratings })
      throw error
    }
  },

  confirmRating: async (userId, skillId, confirmedLevel) => {
    const clamped = Math.max(0, Math.min(5, Math.round(confirmedLevel))) as SkillLevel
    const { error, data } = await supabase
      .from('skill_ratings')
      .update({
        confirmation_status: 'confirmed',
        confirmed_level: clamped,
      } as never)
      .eq('user_id', userId)
      .eq('skill_id', skillId)
      .select()
      .single()
    if (error) throw error

    // Refresh local stores that contain this rating (own ratings or member ratings)
    const updateRow = (rows: SkillRating[]) =>
      rows.map((r) =>
        r.user_id === userId && r.skill_id === skillId
          ? (data as SkillRating)
          : r,
      )
    set({
      ratings: updateRow(get().ratings),
      memberRatings: updateRow(get().memberRatings),
      teamRatings: updateRow(get().teamRatings),
    })
  },

  clearConfirmation: async (userId, skillId) => {
    const { error, data } = await supabase
      .from('skill_ratings')
      .update({
        confirmation_status: 'self_assessed',
        confirmed_level: null,
        confirmed_by: null,
        confirmed_at: null,
      } as never)
      .eq('user_id', userId)
      .eq('skill_id', skillId)
      .select()
      .single()
    if (error) throw error

    const updateRow = (rows: SkillRating[]) =>
      rows.map((r) =>
        r.user_id === userId && r.skill_id === skillId
          ? (data as SkillRating)
          : r,
      )
    set({
      ratings: updateRow(get().ratings),
      memberRatings: updateRow(get().memberRatings),
      teamRatings: updateRow(get().teamRatings),
    })
  },
}))
