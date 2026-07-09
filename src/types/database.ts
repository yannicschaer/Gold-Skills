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
export type CycleType = 'trimester' | 'annual'
export type GoalStatus =
  | 'planned'
  | 'in_progress'
  | 'achieved'
  | 'partially_achieved'
  | 'missed'
export type AgreementStatus = 'draft' | 'agreed'
export type CheckinConfidence = 'on_track' | 'at_risk'

export interface DevelopmentCycle {
  id: string
  name: string
  start_date: string  // "YYYY-MM-DD"
  end_date: string
  status: CycleStatus
  cycle_type: CycleType
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
  annual_goal_id: string | null
  created_at: string
  updated_at: string
}

export interface AnnualGoal {
  id: string
  user_id: string
  cycle_id: string
  title: string
  success_criteria: string
  due_date: string  // "YYYY-MM-DD"
  skill_id: string | null
  team_skill_id: string | null
  agreement_status: AgreementStatus
  agreed_by: string | null
  agreed_at: string | null
  status: GoalStatus
  achievement_text: string | null
  manager_assessment_text: string | null
  conclusion_text: string | null
  approved_by: string | null
  approved_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface GoalCheckin {
  id: string
  goal_id: string
  author_id: string
  note: string
  confidence: CheckinConfidence
  next_step: string | null
  created_at: string
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
      annual_goals: {
        Row: AnnualGoal
        Insert: Omit<
          AnnualGoal,
          'id' | 'agreed_by' | 'agreed_at' | 'approved_by' | 'approved_at' | 'created_by' | 'created_at' | 'updated_at'
        >
        Update: Partial<Omit<AnnualGoal, 'id' | 'user_id' | 'cycle_id' | 'created_at'>>
      }
      goal_checkins: {
        Row: GoalCheckin
        Insert: Omit<GoalCheckin, 'id' | 'created_at'>
        Update: never
      }
    }
  }
}
