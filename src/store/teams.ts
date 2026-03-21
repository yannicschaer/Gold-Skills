import { create } from 'zustand'
import type {
  Team,
  TeamMember,
  TeamSkillGroup,
  TeamSkill,
  TeamSkillRating,
  SkillLevel,
} from '@/types/database'
import { supabase } from '@/lib/supabase'

interface TeamsState {
  teams: Team[]
  teamMembers: TeamMember[]
  teamSkillGroups: TeamSkillGroup[]
  teamSkills: TeamSkill[]
  teamSkillRatings: TeamSkillRating[]
  userTeamIds: string[]
  loading: boolean

  // Teams
  fetchTeams: () => Promise<void>
  createTeam: (name: string, description?: string) => Promise<Team | null>
  updateTeam: (id: string, updates: { name?: string; description?: string }) => Promise<void>
  deleteTeam: (id: string) => Promise<void>

  // Members
  fetchTeamMembers: (teamId: string) => Promise<void>
  fetchUserTeams: (userId: string) => Promise<void>
  addTeamMember: (teamId: string, userId: string) => Promise<void>
  removeTeamMember: (teamId: string, userId: string) => Promise<void>

  // Skill Groups
  fetchSkillGroups: (teamId: string) => Promise<void>
  createSkillGroup: (teamId: string, name: string) => Promise<TeamSkillGroup | null>
  updateSkillGroup: (id: string, updates: { name?: string; description?: string }) => Promise<void>
  deleteSkillGroup: (id: string) => Promise<void>
  reorderSkillGroups: (teamId: string, orderedIds: string[]) => Promise<void>

  // Skills
  fetchSkills: (teamId: string) => Promise<void>
  createSkill: (groupId: string, teamId: string, name: string) => Promise<TeamSkill | null>
  updateSkill: (id: string, updates: { name?: string; description?: string }) => Promise<void>
  deleteSkill: (id: string) => Promise<void>
  reorderSkills: (groupId: string, orderedIds: string[]) => Promise<void>

  // Ratings
  fetchMyTeamRatings: (userId: string, teamId: string) => Promise<void>
  fetchTeamRatings: (teamId: string) => Promise<void>
  upsertTeamSkillRating: (
    userId: string,
    teamSkillId: string,
    currentLevel: number,
    targetLevel: number,
  ) => Promise<void>
}

export const useTeamsStore = create<TeamsState>((set, get) => ({
  teams: [],
  teamMembers: [],
  teamSkillGroups: [],
  teamSkills: [],
  teamSkillRatings: [],
  userTeamIds: [],
  loading: false,

  // ── Teams ──────────────────────────────────────────────

  fetchTeams: async () => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .order('sort_order')
    if (!error && data) set({ teams: data as Team[] })
    set({ loading: false })
  },

  createTeam: async (name, description = '') => {
    const maxOrder = Math.max(0, ...get().teams.map((t) => t.sort_order))
    const { data, error } = await supabase
      .from('teams')
      .insert({ name, description, sort_order: maxOrder + 1, created_by: null } as never)
      .select()
      .single()
    if (error || !data) return null
    await get().fetchTeams()
    return data as Team
  },

  updateTeam: async (id, updates) => {
    await supabase.from('teams').update(updates as never).eq('id', id)
    await get().fetchTeams()
  },

  deleteTeam: async (id) => {
    await supabase.from('teams').delete().eq('id', id)
    await get().fetchTeams()
  },

  // ── Members ────────────────────────────────────────────

  fetchTeamMembers: async (teamId) => {
    const { data } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', teamId)
    if (data) set({ teamMembers: data as TeamMember[] })
  },

  fetchUserTeams: async (userId) => {
    const { data } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', userId)
    if (data) set({ userTeamIds: (data as { team_id: string }[]).map((d) => d.team_id) })
  },

  addTeamMember: async (teamId, userId) => {
    await supabase
      .from('team_members')
      .insert({ team_id: teamId, user_id: userId } as never)
    await get().fetchTeamMembers(teamId)
  },

  removeTeamMember: async (teamId, userId) => {
    await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId)
    await get().fetchTeamMembers(teamId)
  },

  // ── Skill Groups ───────────────────────────────────────

  fetchSkillGroups: async (teamId) => {
    const { data } = await supabase
      .from('team_skill_groups')
      .select('*')
      .eq('team_id', teamId)
      .order('sort_order')
    if (data) set({ teamSkillGroups: data as TeamSkillGroup[] })
  },

  createSkillGroup: async (teamId, name) => {
    const maxOrder = Math.max(
      0,
      ...get().teamSkillGroups.filter((g) => g.team_id === teamId).map((g) => g.sort_order),
    )
    const { data, error } = await supabase
      .from('team_skill_groups')
      .insert({ team_id: teamId, name, sort_order: maxOrder + 1 } as never)
      .select()
      .single()
    if (error || !data) return null
    await get().fetchSkillGroups(teamId)
    return data as TeamSkillGroup
  },

  updateSkillGroup: async (id, updates) => {
    const group = get().teamSkillGroups.find((g) => g.id === id)
    await supabase.from('team_skill_groups').update(updates as never).eq('id', id)
    if (group) await get().fetchSkillGroups(group.team_id)
  },

  deleteSkillGroup: async (id) => {
    const group = get().teamSkillGroups.find((g) => g.id === id)
    await supabase.from('team_skill_groups').delete().eq('id', id)
    if (group) await get().fetchSkillGroups(group.team_id)
  },

  reorderSkillGroups: async (teamId, orderedIds) => {
    // Optimistic update
    const prev = get().teamSkillGroups
    set({
      teamSkillGroups: prev
        .map((g) => {
          const idx = orderedIds.indexOf(g.id)
          return idx >= 0 ? { ...g, sort_order: idx } : g
        })
        .sort((a, b) => a.sort_order - b.sort_order),
    })

    // Persist
    const updates = orderedIds.map((id, idx) =>
      supabase.from('team_skill_groups').update({ sort_order: idx } as never).eq('id', id),
    )
    const results = await Promise.all(updates)
    if (results.some((r) => r.error)) {
      set({ teamSkillGroups: prev })
      await get().fetchSkillGroups(teamId)
    }
  },

  // ── Skills ─────────────────────────────────────────────

  fetchSkills: async (teamId) => {
    const { data } = await supabase
      .from('team_skills')
      .select('*')
      .eq('team_id', teamId)
      .order('sort_order')
    if (data) set({ teamSkills: data as TeamSkill[] })
  },

  createSkill: async (groupId, teamId, name) => {
    const maxOrder = Math.max(
      0,
      ...get().teamSkills.filter((s) => s.group_id === groupId).map((s) => s.sort_order),
    )
    const { data, error } = await supabase
      .from('team_skills')
      .insert({ group_id: groupId, team_id: teamId, name, sort_order: maxOrder + 1 } as never)
      .select()
      .single()
    if (error || !data) return null
    await get().fetchSkills(teamId)
    return data as TeamSkill
  },

  updateSkill: async (id, updates) => {
    const skill = get().teamSkills.find((s) => s.id === id)
    await supabase.from('team_skills').update(updates as never).eq('id', id)
    if (skill) await get().fetchSkills(skill.team_id)
  },

  deleteSkill: async (id) => {
    const skill = get().teamSkills.find((s) => s.id === id)
    await supabase.from('team_skills').delete().eq('id', id)
    if (skill) await get().fetchSkills(skill.team_id)
  },

  reorderSkills: async (groupId, orderedIds) => {
    const prev = get().teamSkills
    set({
      teamSkills: prev
        .map((s) => {
          const idx = orderedIds.indexOf(s.id)
          return idx >= 0 ? { ...s, sort_order: idx } : s
        })
        .sort((a, b) => a.sort_order - b.sort_order),
    })

    const skill = prev.find((s) => s.group_id === groupId)
    const updates = orderedIds.map((id, idx) =>
      supabase.from('team_skills').update({ sort_order: idx } as never).eq('id', id),
    )
    const results = await Promise.all(updates)
    if (results.some((r) => r.error) && skill) {
      set({ teamSkills: prev })
      await get().fetchSkills(skill.team_id)
    }
  },

  // ── Ratings ────────────────────────────────────────────

  fetchMyTeamRatings: async (userId, teamId) => {
    const { data } = await supabase
      .from('team_skill_ratings')
      .select('*, team_skills!inner(team_id)')
      .eq('user_id', userId)
      .eq('team_skills.team_id', teamId)
    if (data) {
      set({
        teamSkillRatings: (data as (TeamSkillRating & { team_skills: unknown })[]).map(
          ({ team_skills: _ts, ...rest }) => rest as TeamSkillRating,
        ),
      })
    }
  },

  fetchTeamRatings: async (teamId) => {
    const { data } = await supabase
      .from('team_skill_ratings')
      .select('*, team_skills!inner(team_id)')
      .eq('team_skills.team_id', teamId)
    if (data) {
      set({
        teamSkillRatings: (data as (TeamSkillRating & { team_skills: unknown })[]).map(
          ({ team_skills: _ts, ...rest }) => rest as TeamSkillRating,
        ),
      })
    }
  },

  upsertTeamSkillRating: async (userId, teamSkillId, currentLevel, targetLevel) => {
    const clamp = (v: number) => Math.max(0, Math.min(5, Math.round(v))) as SkillLevel
    const current = clamp(currentLevel)
    const target = clamp(targetLevel)

    // Optimistic update
    const prev = get().teamSkillRatings
    const existing = prev.find(
      (r) => r.user_id === userId && r.team_skill_id === teamSkillId,
    )

    if (existing) {
      set({
        teamSkillRatings: prev.map((r) =>
          r.id === existing.id
            ? { ...r, current_level: current, target_level: target }
            : r,
        ),
      })
    } else {
      set({
        teamSkillRatings: [
          ...prev,
          {
            id: crypto.randomUUID(),
            user_id: userId,
            team_skill_id: teamSkillId,
            current_level: current,
            target_level: target,
            updated_at: new Date().toISOString(),
          },
        ],
      })
    }

    // Persist
    const { error } = await supabase.from('team_skill_ratings').upsert(
      {
        user_id: userId,
        team_skill_id: teamSkillId,
        current_level: current,
        target_level: target,
      } as never,
      { onConflict: 'user_id,team_skill_id' },
    )

    if (error) {
      console.error('Team skill rating save failed:', error)
      set({ teamSkillRatings: prev })
    }
  },
}))
