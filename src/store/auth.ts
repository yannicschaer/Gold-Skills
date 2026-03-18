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
  signInWithGoogle: () => Promise<void>
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

async function ensureProfile(user: User) {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (data) return data as Profile

  // Create profile for new OAuth users
  const { data: newProfile } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      email: user.email ?? '',
      full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? '',
      role: 'designer',
      avatar_url: user.user_metadata?.avatar_url ?? null,
    } as never)
    .select()
    .single()

  return newProfile as Profile | null
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
    set({ session, user: session?.user ?? null })

    if (session?.user) {
      const profile = await ensureProfile(session.user)
      if (profile) {
        set({ profile, ...deriveRoleFlags(profile.role) })
      }
    }
    // Only set loading false AFTER profile is loaded to prevent premature redirects in RoleRoute
    set({ loading: false })

    supabase.auth.onAuthStateChange(async (_event, session) => {
      set({ session, user: session?.user ?? null })
      if (session?.user) {
        const profile = await ensureProfile(session.user)
        if (profile) {
          set({ profile, ...deriveRoleFlags(profile.role) })
        }
      } else {
        set({ profile: null, ...deriveRoleFlags(null) })
      }
    })
  },

  signIn: async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  },

  signInWithGoogle: async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
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
