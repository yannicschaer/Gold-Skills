import { create } from 'zustand'
import type {
  AnnualGoal,
  CheckinConfidence,
  DevelopmentGoal,
  GoalCheckin,
  GoalStatus,
} from '@/types/database'
import { supabase } from '@/lib/supabase'

export interface AnnualGoalInsert {
  user_id: string
  cycle_id: string
  title: string
  success_criteria: string
  due_date: string
  skill_id?: string | null
  team_skill_id?: string | null
}

export interface AnnualGoalUpdate {
  title?: string
  success_criteria?: string
  due_date?: string
  skill_id?: string | null
  team_skill_id?: string | null
  status?: GoalStatus
  achievement_text?: string | null
  manager_assessment_text?: string | null
  conclusion_text?: string | null
  agreement_status?: 'draft' | 'agreed'
  approved_by?: string
}

interface AnnualGoalsState {
  myGoals: AnnualGoal[]
  teamGoals: AnnualGoal[]
  checkinsByGoal: Record<string, GoalCheckin[]>
  linkedQuarterGoals: Record<string, DevelopmentGoal[]>
  loading: boolean

  // User-Sicht
  fetchMyGoals: (userId: string, cycleId: string) => Promise<void>
  createGoal: (input: AnnualGoalInsert) => Promise<AnnualGoal | null>
  updateGoal: (id: string, updates: AnnualGoalUpdate) => Promise<string | null>
  deleteGoal: (id: string) => Promise<void>

  // Check-ins
  fetchCheckins: (goalIds: string[]) => Promise<void>
  addCheckin: (input: {
    goal_id: string
    author_id: string
    note: string
    confidence: CheckinConfidence
    next_step?: string | null
  }) => Promise<boolean>

  // Verknüpfte Quartals-Goals (Brücke zu 011)
  fetchLinkedQuarterGoals: (annualGoalIds: string[]) => Promise<void>

  // Manager-Sicht
  fetchTeamGoals: (cycleId: string, directReportIds: string[]) => Promise<void>
  agreeGoal: (goalId: string) => Promise<string | null>
  renegotiateGoal: (goalId: string) => Promise<string | null>
  approveGoal: (
    goalId: string,
    approverId: string,
    finalStatus: Extract<GoalStatus, 'achieved' | 'partially_achieved' | 'missed'>,
    managerAssessment: string | null,
    conclusion: string | null,
  ) => Promise<string | null>
}

export const useAnnualGoalsStore = create<AnnualGoalsState>((set, get) => ({
  myGoals: [],
  teamGoals: [],
  checkinsByGoal: {},
  linkedQuarterGoals: {},
  loading: false,

  fetchMyGoals: async (userId, cycleId) => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('annual_goals')
      .select('*')
      .eq('user_id', userId)
      .eq('cycle_id', cycleId)
      .order('created_at', { ascending: true })
    if (error) console.error('Fetch my annual goals failed:', error)
    if (data) set({ myGoals: data as AnnualGoal[] })
    set({ loading: false })
  },

  createGoal: async (input) => {
    const { data, error } = await supabase
      .from('annual_goals')
      .insert(input as never)
      .select()
      .single()
    if (error) {
      console.error('Create annual goal failed:', error)
      return null
    }
    const goal = data as AnnualGoal
    set({ myGoals: [...get().myGoals, goal] })
    return goal
  },

  updateGoal: async (id, updates) => {
    const { data, error } = await supabase
      .from('annual_goals')
      .update(updates as never)
      .eq('id', id)
      .select()
      .single()
    if (error) {
      console.error('Update annual goal failed:', error)
      return error.message
    }
    const updated = data as AnnualGoal
    set({
      myGoals: get().myGoals.map((g) => (g.id === id ? updated : g)),
      teamGoals: get().teamGoals.map((g) => (g.id === id ? updated : g)),
    })
    return null
  },

  deleteGoal: async (id) => {
    const { error } = await supabase.from('annual_goals').delete().eq('id', id)
    if (error) {
      console.error('Delete annual goal failed:', error)
      return
    }
    set({ myGoals: get().myGoals.filter((g) => g.id !== id) })
  },

  fetchCheckins: async (goalIds) => {
    if (goalIds.length === 0) return
    const { data, error } = await supabase
      .from('goal_checkins')
      .select('*')
      .in('goal_id', goalIds)
      .order('created_at', { ascending: false })
    if (error) {
      console.error('Fetch checkins failed:', error)
      return
    }
    const byGoal: Record<string, GoalCheckin[]> = {}
    for (const id of goalIds) byGoal[id] = []
    for (const c of (data ?? []) as GoalCheckin[]) {
      ;(byGoal[c.goal_id] ??= []).push(c)
    }
    set({ checkinsByGoal: { ...get().checkinsByGoal, ...byGoal } })
  },

  addCheckin: async (input) => {
    const { data, error } = await supabase
      .from('goal_checkins')
      .insert({ ...input, next_step: input.next_step ?? null } as never)
      .select()
      .single()
    if (error) {
      console.error('Add checkin failed:', error)
      return false
    }
    const checkin = data as GoalCheckin
    const existing = get().checkinsByGoal[input.goal_id] ?? []
    set({
      checkinsByGoal: {
        ...get().checkinsByGoal,
        [input.goal_id]: [checkin, ...existing],
      },
    })
    return true
  },

  fetchLinkedQuarterGoals: async (annualGoalIds) => {
    if (annualGoalIds.length === 0) return
    const { data, error } = await supabase
      .from('development_goals')
      .select('*')
      .in('annual_goal_id', annualGoalIds)
      .order('created_at', { ascending: true })
    if (error) {
      console.error('Fetch linked quarter goals failed:', error)
      return
    }
    const byAnnual: Record<string, DevelopmentGoal[]> = {}
    for (const id of annualGoalIds) byAnnual[id] = []
    for (const g of (data ?? []) as DevelopmentGoal[]) {
      if (g.annual_goal_id) (byAnnual[g.annual_goal_id] ??= []).push(g)
    }
    set({ linkedQuarterGoals: { ...get().linkedQuarterGoals, ...byAnnual } })
  },

  fetchTeamGoals: async (cycleId, directReportIds) => {
    if (directReportIds.length === 0) {
      set({ teamGoals: [] })
      return
    }
    set({ loading: true })
    const { data, error } = await supabase
      .from('annual_goals')
      .select('*')
      .eq('cycle_id', cycleId)
      .in('user_id', directReportIds)
      .order('created_at', { ascending: true })
    if (error) console.error('Fetch team annual goals failed:', error)
    if (data) set({ teamGoals: data as AnnualGoal[] })
    set({ loading: false })
  },

  agreeGoal: async (goalId) => {
    // agreed_by/agreed_at setzt der DB-Guard serverseitig
    return get().updateGoal(goalId, { agreement_status: 'agreed' })
  },

  renegotiateGoal: async (goalId) => {
    // Guard räumt agreed_by/agreed_at/approved_by/approved_at ab
    return get().updateGoal(goalId, { agreement_status: 'draft' })
  },

  approveGoal: async (goalId, approverId, finalStatus, managerAssessment, conclusion) => {
    return get().updateGoal(goalId, {
      status: finalStatus,
      manager_assessment_text: managerAssessment,
      conclusion_text: conclusion,
      approved_by: approverId,
    })
  },
}))
