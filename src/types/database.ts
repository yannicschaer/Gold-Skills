export type SkillLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10

export interface Profile {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'designer' | 'operations'
  is_active: boolean
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface SkillRating {
  id: string
  user_id: string
  skill_id: string
  current_level: SkillLevel
  target_level: SkillLevel
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
    }
  }
}
