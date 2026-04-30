export type SkillLevel = 0 | 1 | 2 | 3 | 4 | 5

export interface Profile {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'designer' | 'operations'
  is_active: boolean
  avatar_url: string | null
  manager_id: string | null
  created_at: string
  updated_at: string
}

export type ConfirmationStatus = 'self_assessed' | 'confirmed'

export interface SkillRating {
  id: string
  user_id: string
  skill_id: string
  current_level: SkillLevel
  target_level: SkillLevel
  confirmation_status: ConfirmationStatus
  confirmed_level: SkillLevel | null
  confirmed_by: string | null
  confirmed_at: string | null
  updated_at: string
}

export interface SkillRatingHistory {
  id: string
  user_id: string
  skill_id: string
  current_level: SkillLevel
  target_level: SkillLevel
  recorded_date: string  // "YYYY-MM-DD"
  recorded_at: string
}

export interface Team {
  id: string
  name: string
  description: string
  sort_order: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export type CycleStatus = 'upcoming' | 'active' | 'closed'
export type GoalStatus =
  | 'planned'
  | 'in_progress'
  | 'achieved'
  | 'partially_achieved'
  | 'missed'

export interface DevelopmentCycle {
  id: string
  name: string
  start_date: string  // "YYYY-MM-DD"
  end_date: string
  status: CycleStatus
  created_at: string
  updated_at: string
}

export interface DevelopmentGoal {
  id: string
  user_id: string
  cycle_id: string
  skill_id: string | null
  team_skill_id: string | null
  target_level: SkillLevel
  current_state_text: string | null
  learning_plan_text: string | null
  achievement_text: string | null
  status: GoalStatus
  approved_by: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
}

export interface TeamMember {
  id: string
  team_id: string
  user_id: string
  created_at: string
}

export interface TeamSkillGroup {
  id: string
  team_id: string
  name: string
  description: string
  sort_order: number
  created_at: string
  updated_at: string
}

export interface TeamSkill {
  id: string
  group_id: string
  team_id: string
  name: string
  description: string
  sort_order: number
  created_at: string
  updated_at: string
}

export interface TeamSkillRating {
  id: string
  user_id: string
  team_skill_id: string
  current_level: SkillLevel
  target_level: SkillLevel
  confirmation_status: ConfirmationStatus
  confirmed_level: SkillLevel | null
  confirmed_by: string | null
  confirmed_at: string | null
  updated_at: string
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at' | 'is_active'>
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>
      }
      skill_ratings: {
        Row: SkillRating
        Insert: Omit<SkillRating, 'id' | 'updated_at'>
        Update: Partial<Omit<SkillRating, 'id' | 'user_id'>>
      }
      teams: {
        Row: Team
        Insert: Omit<Team, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Team, 'id' | 'created_at'>>
      }
      team_members: {
        Row: TeamMember
        Insert: Omit<TeamMember, 'id' | 'created_at'>
        Update: never
      }
      team_skill_groups: {
        Row: TeamSkillGroup
        Insert: Omit<TeamSkillGroup, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<TeamSkillGroup, 'id' | 'created_at'>>
      }
      team_skills: {
        Row: TeamSkill
        Insert: Omit<TeamSkill, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<TeamSkill, 'id' | 'created_at'>>
      }
      team_skill_ratings: {
        Row: TeamSkillRating
        Insert: Omit<TeamSkillRating, 'id' | 'updated_at'>
        Update: Partial<Omit<TeamSkillRating, 'id' | 'user_id'>>
      }
      skill_rating_history: {
        Row: SkillRatingHistory
        Insert: never
        Update: never
      }
    }
  }
}
