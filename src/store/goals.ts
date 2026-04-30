import { create } from 'zustand'
import type { DevelopmentGoal, GoalStatus, SkillLevel } from '@/types/database'
import { supabase } from '@/lib/supabase'

export interface GoalInsert {
  user_id: string
  cycle_id: string
  skill_id?: string | null
  team_skill_id?: string | null
  target_level: SkillLevel
  current_state_text?: string | null
  learning_plan_text?: string | null
}

export interface GoalUpdate {
  target_level?: SkillLevel
  current_state_text?: string | null
  learning_plan_text?: string | null
  achievement_text?: string | null
  status?: GoalStatus
}

interface GoalsState {
  myGoals: DevelopmentGoal[]
  reviewGoals: DevelopmentGoal[]
  loading: boolean

  // User-Sicht: eigene Goals im aktiven/upcoming Cycle
  fetchMyGoals: (userId: string, cycleId?: string) => Promise<void>
  createGoal: (input: GoalInsert) => Promise<DevelopmentGoal | null>
  updateGoal: (id: string, updates: GoalUpdate) => Promise<void>
  deleteGoal: (id: string) => Promise<void>

  // Manager-Sicht: Goals der Direct Reports im Cycle
  fetchReviewGoals: (cycleId: string, directReportIds: string[]) => Promise<void>
  approveGoal: (
    goalId: string,
    approverId: string,
    status?: Extract<GoalStatus, 'achieved' | 'partially_achieved' | 'missed'>,
  ) => Promise<void>
}

export const useGoalsStore = create<GoalsState>((set, get) => ({
  myGoals: [],
  reviewGoals: [],
  loading: false,

  fetchMyGoals: async (userId, cycleId) => {
    set({ loading: true })
    let query = supabase
      .from('development_goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
    if (cycleId) query = query.eq('cycle_id', cycleId)
    const { data, error } = await query
    if (error) console.error('Fetch my goals failed:', error)
    if (data) set({ myGoals: data as DevelopmentGoal[] })
    set({ loading: false })
  },

  createGoal: async (input) => {
    const payload: Record<string, unknown> = {
      user_id: input.user_id,
      cycle_id: input.cycle_id,
      target_level: input.target_level,
      current_state_text: input.current_state_text ?? null,
      learning_plan_text: input.learning_plan_text ?? null,
      status: 'planned',
    }
    if (input.skill_id) payload.skill_id = input.skill_id
    if (input.team_skill_id) payload.team_skill_id = input.team_skill_id

    const { data, error } = await supabase
      .from('development_goals')
      .insert(payload as never)
      .select()
      .single()
    if (error) {
      console.error('Create goal failed:', error)
      return null
    }
    const created = data as DevelopmentGoal
    set((state) => ({ myGoals: [...state.myGoals, created] }))
    return created
  },

  updateGoal: async (id, updates) => {
    const { error } = await supabase
      .from('development_goals')
      .update(updates as never)
      .eq('id', id)
    if (error) {
      console.error('Update goal failed:', error)
      return
    }
    // Optimistisch im Store mergen
    set((state) => ({
      myGoals: state.myGoals.map((g) => (g.id === id ? { ...g, ...updates } : g)),
      reviewGoals: state.reviewGoals.map((g) => (g.id === id ? { ...g, ...updates } : g)),
    }))
  },

  deleteGoal: async (id) => {
    const { error } = await supabase.from('development_goals').delete().eq('id', id)
    if (error) {
      console.error('Delete goal failed:', error)
      return
    }
    set((state) => ({
      myGoals: state.myGoals.filter((g) => g.id !== id),
    }))
  },

  fetchReviewGoals: async (cycleId, directReportIds) => {
    if (directReportIds.length === 0) {
      set({ reviewGoals: [] })
      return
    }
    set({ loading: true })
    const { data, error } = await supabase
      .from('development_goals')
      .select('*')
      .eq('cycle_id', cycleId)
      .in('user_id', directReportIds)
      .order('user_id')
    if (error) console.error('Fetch review goals failed:', error)
    if (data) set({ reviewGoals: data as DevelopmentGoal[] })
    set({ loading: false })
  },

  approveGoal: async (goalId, approverId, status = 'achieved') => {
    const { error } = await supabase
      .from('development_goals')
      .update({
        status,
        approved_by: approverId,
        approved_at: new Date().toISOString(),
      } as never)
      .eq('id', goalId)
    if (error) {
      console.error('Approve goal failed:', error)
      return
    }
    // Optimistisch
    set((state) => ({
      reviewGoals: state.reviewGoals.map((g) =>
        g.id === goalId
          ? { ...g, status, approved_by: approverId, approved_at: new Date().toISOString() }
          : g,
      ),
    }))
    // Nach Approval frisch laden, weil Trigger noch skill_ratings updated
    const goal = get().reviewGoals.find((g) => g.id === goalId)
    if (goal) {
      await get().fetchReviewGoals(goal.cycle_id, [goal.user_id])
    }
  },
}))
