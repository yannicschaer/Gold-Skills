import { create } from 'zustand'
import type { User, Session } from '@supabase/supabase-js'
import type { Profile } from '@/types/database'
import { supabase } from '@/lib/supabase'

interface AuthState {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  role: Profile['role'] | null
  isAdmin: boolean
  canEditSkills: boolean
  initialize: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  fetchProfile: (userId: string) => Promise<void>
}

function deriveRoleFlags(role: Profile['role'] | null) {
  return {
    role,
    isAdmin: role === 'admin',
    canEditSkills: role === 'admin' || role === 'designer',
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  profile: null,
  loading: true,
  role: null,
  isAdmin: false,
  canEditSkills: false,

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    set({ session, user: session?.user ?? null, loading: false })

    if (session?.user) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
      if (data) {
        const profile = data as Profile
        set({ profile, ...deriveRoleFlags(profile.role) })
      }
    }

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null })
    })
  },

  signIn: async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, session: null, profile: null, ...deriveRoleFlags(null) })
  },

  fetchProfile: async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (data) {
      const profile = data as Profile
      set({ profile, ...deriveRoleFlags(profile.role) })
    }
  },
}))
